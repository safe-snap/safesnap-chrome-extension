// SafeSnap - Popup Script

import i18n from '../i18n/en.js';

console.log('SafeSnap popup loaded');

// Initialize UI text with i18n strings
function initializeUIText() {
  // Header
  document.querySelector('.header h1').textContent = i18n.appName;
  document.querySelector('.header img').alt = i18n.appLogoAlt;

  // Tab labels
  document.querySelector('[data-tab="protect"]').innerHTML =
    `<span style="font-size: 16px; margin-right: 4px;">${i18n.emojiShield}</span>${i18n.tabProtect}`;
  document.querySelector('[data-tab="settings"]').innerHTML =
    `<span style="font-size: 16px; margin-right: 4px;">${i18n.emojiSettings}</span>${i18n.tabSettings}`;
  document.querySelector('[data-tab="about"]').innerHTML =
    `<span style="font-size: 16px; margin-right: 4px;">${i18n.emojiInfo}</span>${i18n.tabAbout}`;

  // Protect tab
  document.querySelector('#protect-tab h3').textContent = i18n.headingSelectPii;
  document.querySelector('#toggleProtectBtn').innerHTML =
    `<span style="font-size: 16px; margin-right: 6px;">${i18n.emojiLock}</span>${i18n.btnProtectPii}`;
  document.querySelector('#screenshotBtn').innerHTML =
    `<span style="font-size: 16px; margin-right: 6px;">${i18n.emojiCamera}</span>${i18n.btnTakeScreenshot}`;
  document.querySelector('#clipboardBtn').innerHTML =
    `<span style="font-size: 16px; margin-right: 6px;">${i18n.emojiClipboard}</span>${i18n.btnCopyToClipboard}`;

  // PII type labels
  const piiLabels = {
    properNouns: i18n.piiTypeProperNouns,
    money: i18n.piiTypeMoney,
    quantities: i18n.piiTypeQuantities,
    emails: i18n.piiTypeEmails,
    phones: i18n.piiTypePhones,
    addresses: i18n.piiTypeAddresses,
    dates: i18n.piiTypeDates,
    urls: i18n.piiTypeUrls,
    ips: i18n.piiTypeIps,
  };

  Object.entries(piiLabels).forEach(([id, label]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.nextElementSibling.textContent = label;
    }
  });

  // Settings tab
  document.querySelector('#settings-tab h3').textContent = i18n.headingSettings;

  // Highlight toggle label
  document.querySelector('#highlightToggleLabel').textContent = i18n.labelHighlightDetections;

  // Banner position label
  const bannerPosLabel = document.querySelector('#settings-tab > div:nth-child(2) > label');
  if (bannerPosLabel) bannerPosLabel.textContent = i18n.labelBannerPosition;

  // Redaction mode label and options (now using radio buttons)
  const redactionLabel = document.querySelector('#settings-tab > div:nth-child(3) > label');
  if (redactionLabel) redactionLabel.textContent = i18n.labelRedactionMode;

  // Update radio button labels
  const radioLabels = document.querySelectorAll('.radio-label');
  if (radioLabels[0]) {
    radioLabels[0].querySelector('span').textContent = i18n.redactionModeRandom;
  }
  if (radioLabels[1]) {
    radioLabels[1].querySelector('span').textContent = i18n.redactionModeBlackout;
  }

  document.querySelector('#openSettingsBtn').innerHTML =
    `<span style="font-size: 16px; margin-right: 6px;">${i18n.emojiWrench}</span>${i18n.btnAdvancedSettings}`;

  // Banner position options
  const bannerSelect = document.getElementById('bannerPosition');
  bannerSelect.options[0].textContent = i18n.positionTopLeft;
  bannerSelect.options[1].textContent = i18n.positionTopRight;
  bannerSelect.options[2].textContent = i18n.positionBottomLeft;
  bannerSelect.options[3].textContent = i18n.positionBottomRight;
  bannerSelect.options[4].textContent = i18n.positionTopBar;
  bannerSelect.options[5].textContent = i18n.positionBottomBar;

  // About tab
  document.querySelector('#about-tab h3').textContent = i18n.headingAboutSafesnap;
  const aboutP = document.querySelector('#about-tab p');
  // eslint-disable-next-line no-undef
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
  aboutP.innerHTML = `<strong>${i18n.aboutVersion}</strong> ${version}<br /><br />${i18n.aboutDescription}`;
}

// Initialize UI text first
initializeUIText();

// Initialize highlight button to default state
updateHighlightButton(false);

// Initialize popup on load
initializePopup();
loadSettings();
loadPIITypePreferences();

async function initializePopup() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we can inject content scripts on this page
    if (
      !tab ||
      !tab.url ||
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:')
    ) {
      updateStatus(i18n.errorCannotRunOnThisPage, 'error');
      return;
    }

    // Try to connect to content script with retry logic
    let response = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !response) {
      try {
        response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
        break; // Success!
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          // Wait a bit before retrying (content script might still be loading)
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          // Final attempt failed
          throw error;
        }
      }
    }

    if (response && response.success) {
      // Update button state if already protected
      if (response.isPIIProtected) {
        updateToggleButton(true);
      } else {
        updateToggleButton(false);
      }

      // Update highlight toggle state if highlights are showing
      if (response.isHighlightModeEnabled) {
        updateHighlightButton(true);
      } else {
        updateHighlightButton(false);
      }
    }
  } catch (error) {
    console.log('Could not connect to content script:', error);
  }
}

// Tab switching
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    // Update active tab button
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    // Update active tab content
    document
      .querySelectorAll('.tab-content')
      .forEach((content) => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// Toggle Protect/Restore button
document.getElementById('toggleProtectBtn').addEventListener('click', async () => {
  const btn = document.getElementById('toggleProtectBtn');
  const isProtected = btn.textContent.includes(i18n.btnRestoreOriginal);

  if (isProtected) {
    // Restore original
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'RESTORE_ORIGINAL',
      });

      if (response.success) {
        updateToggleButton(false);

        // Re-query status to sync highlight button state
        try {
          const statusResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
          if (statusResponse && statusResponse.success) {
            updateHighlightButton(statusResponse.isHighlightModeEnabled);
          }
        } catch (error) {
          console.log('Could not sync highlight button state:', error);
        }
      } else {
        throw new Error(response.error || i18n.errorRestoreFailed);
      }
    } catch (error) {
      console.error('Error restoring:', error);
      updateStatus(`${i18n.errorPrefix} ${error.message}`, 'error');
    }
  } else {
    // Protect PII
    const enabledTypes = getEnabledPIITypes();

    if (enabledTypes.length === 0) {
      alert(i18n.alertSelectAtLeastOnePiiType);
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'PROTECT_PII',
        enabledTypes,
      });

      if (response.success) {
        updateToggleButton(true);

        // Re-query status to sync highlight button state
        // (protectPII may disable/re-enable highlights)
        try {
          const statusResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
          if (statusResponse && statusResponse.success) {
            updateHighlightButton(statusResponse.isHighlightModeEnabled);
          }
        } catch (error) {
          console.log('Could not sync highlight button state:', error);
        }
      } else {
        throw new Error(response.error || i18n.errorProtectionFailed);
      }
    } catch (error) {
      console.error('Error protecting PII:', error);
      updateStatus(`${i18n.errorPrefix} ${error.message}`, 'error');
    }
  }
});

// Take screenshot button
document.getElementById('screenshotBtn').addEventListener('click', async () => {
  try {
    // Get current tab info for hostname
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const hostname = url.hostname.replace(/^www\./, ''); // Remove www. prefix
    const sanitizedHostname = hostname.replace(/[^a-z0-9.-]/gi, '_'); // Sanitize for filename

    const response = await chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' });

    if (response.success) {
      // Use chrome.downloads API for proper file download
      const timestamp = Date.now();
      const filename = `safesnap-${sanitizedHostname}-${timestamp}.png`;

      try {
        await chrome.downloads.download({
          url: response.dataUrl,
          filename: filename,
          saveAs: true, // Prompt user to choose location
        });

        // Download initiated successfully - no need to show status
        // The file save dialog provides sufficient feedback
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        updateStatus(`${i18n.errorDownloadFailed} ${downloadError.message}`, 'error');
      }
    } else {
      throw new Error(response.error || i18n.errorScreenshotFailed);
    }
  } catch (error) {
    console.error('Error taking screenshot:', error);
    updateStatus(`${i18n.errorPrefix} ${error.message}`, 'error');
  }
});

// Copy to clipboard button
document.getElementById('clipboardBtn').addEventListener('click', async () => {
  const btn = document.getElementById('clipboardBtn');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' });

    if (response.success) {
      // Convert data URL to blob and copy
      const blob = await (await fetch(response.dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

      // Show success feedback on button
      btn.innerHTML = `<span style="font-size: 16px; margin-right: 6px;">${i18n.emojiCheckmark}</span>${i18n.btnCopied}`;
      btn.style.background = '#10b981'; // Green

      // Reset after 2 seconds
      setTimeout(() => {
        btn.innerHTML = `<span style="font-size: 16px; margin-right: 6px;">${i18n.emojiClipboard}</span>${i18n.btnCopyToClipboard}`;
        btn.style.background = '';
      }, 2000);
    } else {
      throw new Error(response.error || i18n.errorScreenshotFailed);
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    updateStatus(`${i18n.errorPrefix} ${error.message}`, 'error');
  }
});

// Highlight detections toggle
document.getElementById('highlightToggleContainer').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[SafeSnap Popup] Sending toggleHighlightMode message');
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleHighlightMode',
    });

    console.log('[SafeSnap Popup] Toggle response:', response);
    if (response && response.enabled !== undefined) {
      console.log('[SafeSnap Popup] Updating toggle to:', response.enabled);
      updateHighlightToggle(response.enabled);

      // Update status badge - need to know if PII is protected
      chrome.tabs
        .sendMessage(tab.id, { type: 'GET_STATUS' })
        .then((_statusResponse) => {
          // Status updated, no badge needed
        })
        .catch(() => {});
    } else {
      console.error('[SafeSnap Popup] Invalid response:', response);
    }
  } catch (error) {
    console.error('Error toggling highlight mode:', error);
    updateStatus(`${i18n.errorPrefix} Could not toggle highlight mode`, 'error');
  }
});

// Open settings button
document.getElementById('openSettingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Auto-save settings on change
document.getElementById('bannerPosition').addEventListener('change', async (e) => {
  await saveSetting('bannerPosition', e.target.value);
});

// Redaction mode radio buttons
document.querySelectorAll('input[name="redactionMode"]').forEach((radio) => {
  radio.addEventListener('change', async (e) => {
    await saveSetting('redactionMode', e.target.value);
  });
});

// Add change listeners to all PII type checkboxes
document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    savePIITypePreferences();
  });
});

// Helper function to save a single setting
async function saveSetting(key, value) {
  try {
    const result = await chrome.storage.sync.get(['safesnap_settings']);
    const settings = result.safesnap_settings || {};
    settings[key] = value;

    await chrome.storage.sync.set({ safesnap_settings: settings });

    // Notify content script to reload settings
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'RELOAD_SETTINGS' }).catch(() => {
        // Ignore errors if content script not loaded
      });
    }
  } catch (error) {
    console.error('Error saving setting:', error);
  }
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['safesnap_settings']);
    const settings = result.safesnap_settings || {};

    // Set banner position
    if (settings.bannerPosition) {
      document.getElementById('bannerPosition').value = settings.bannerPosition;
    }

    // Set redaction mode (radio buttons)
    if (settings.redactionMode) {
      const radioButton = document.querySelector(
        `input[name="redactionMode"][value="${settings.redactionMode}"]`
      );
      if (radioButton) {
        radioButton.checked = true;
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Load PII type preferences from storage
async function loadPIITypePreferences() {
  try {
    const result = await chrome.storage.sync.get(['safesnap_pii_types']);
    const piiTypes = result.safesnap_pii_types;

    if (piiTypes) {
      // Update checkboxes based on saved preferences
      for (const [type, config] of Object.entries(piiTypes)) {
        const checkbox = document.getElementById(type);
        if (checkbox) {
          checkbox.checked = config.enabled;
        }
      }
    }
  } catch (error) {
    console.error('Error loading PII type preferences:', error);
  }
}

// Save PII type preferences when checkboxes change
async function savePIITypePreferences() {
  try {
    const result = await chrome.storage.sync.get(['safesnap_pii_types']);
    let piiTypes = result.safesnap_pii_types || {};

    // If no saved types, initialize with defaults
    if (Object.keys(piiTypes).length === 0) {
      piiTypes = {
        properNouns: {
          label: i18n.piiTypeProperNouns,
          description: i18n.piiTypeProperNounsDesc,
          enabled: true,
        },
        money: { label: i18n.piiTypeMoney, description: i18n.piiTypeMoneyDesc, enabled: true },
        quantities: {
          label: i18n.piiTypeQuantities,
          description: i18n.piiTypeQuantitiesDesc,
          enabled: true,
        },
        emails: { label: i18n.piiTypeEmails, description: i18n.piiTypeEmailsDesc, enabled: false },
        phones: { label: i18n.piiTypePhones, description: i18n.piiTypePhonesDesc, enabled: false },
        addresses: {
          label: i18n.piiTypeAddresses,
          description: i18n.piiTypeAddressesDesc,
          enabled: false,
        },
        dates: { label: i18n.piiTypeDates, description: i18n.piiTypeDatesDesc, enabled: false },
        urls: { label: i18n.piiTypeUrls, description: i18n.piiTypeUrlsDesc, enabled: false },
        ips: { label: i18n.piiTypeIps, description: i18n.piiTypeIpsDesc, enabled: false },
      };
    }

    // Update enabled status from checkboxes
    const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const type = checkbox.id;
      if (piiTypes[type]) {
        piiTypes[type].enabled = checkbox.checked;
      } else {
        // Create entry if it doesn't exist
        piiTypes[type] = {
          label: checkbox.parentElement.textContent.trim(),
          description: '',
          enabled: checkbox.checked,
        };
      }
    });

    await chrome.storage.sync.set({ safesnap_pii_types: piiTypes });

    // Notify content script that PII types changed (so highlights can update)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'PII_TYPES_CHANGED' }).catch(() => {
        // Ignore errors if content script not loaded
        console.log('[SafeSnap Popup] Could not notify content script of PII type change');
      });
    }
  } catch (error) {
    console.error('Error saving PII type preferences:', error);
  }
}

/**
 * Get enabled PII types from checkboxes
 */
function getEnabledPIITypes() {
  const types = [];
  const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      types.push(checkbox.id);
    }
  });
  return types;
}

/**
 * Update status display - shows banner on page for notifications
 */
async function updateStatus(message, type = 'ready') {
  // For critical errors that prevent operation, update environment text
  if (type === 'error' && message.includes('Cannot run')) {
    const envEl = document.getElementById('environment');
    envEl.textContent = message;
    envEl.style.color = '#dc2626'; // Red
    return;
  }

  // For all other messages, show banner on the page
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_BANNER',
        message: message,
      });
    }
  } catch (error) {
    // If we can't show banner (e.g., on restricted pages), silently ignore
    console.log('Could not show banner:', error);
  }
}

/**
 * Update toggle button state
 */
function updateToggleButton(isProtected) {
  const btn = document.getElementById('toggleProtectBtn');
  if (isProtected) {
    btn.innerHTML = `<span style="font-size: 16px; margin-right: 6px;">${i18n.emojiUnlock}</span>${i18n.btnRestoreOriginal}`;
    btn.className = 'btn btn-secondary';
  } else {
    btn.innerHTML = `<span style="font-size: 16px; margin-right: 6px;">${i18n.emojiLock}</span>${i18n.btnProtectPii}`;
    btn.className = 'btn btn-primary';
  }
}

/**
 * Update highlight toggle state
 */
function updateHighlightToggle(isEnabled) {
  const toggle = document.getElementById('highlightToggle');
  const label = document.getElementById('highlightToggleLabel');
  const container = document.getElementById('highlightToggleContainer');

  if (isEnabled) {
    toggle.classList.add('active');
    label.textContent = i18n.btnRemoveHighlights;
    container.style.borderColor = '#10b981';
    container.style.background = '#d1fae5';
  } else {
    toggle.classList.remove('active');
    label.textContent = i18n.btnHighlightDetections;
    container.style.borderColor = '#e5e7eb';
    container.style.background = '#f9fafb';
  }
}

// Backwards compatibility alias
function updateHighlightButton(isEnabled) {
  updateHighlightToggle(isEnabled);
}

// Initialize on load
initializePopup();
