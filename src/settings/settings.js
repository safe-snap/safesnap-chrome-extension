// SafeSnap - Settings Page Script

import i18n from '../i18n/en.js';

const STORAGE_KEYS = {
  PII_TYPES: 'safesnap_pii_types',
  ENV_PATTERNS: 'safesnap_env_patterns',
  BANNER_CONFIG: 'safesnap_banner_config',
  SETTINGS: 'safesnap_settings', // For redaction mode, magnitude variance, etc.
  CUSTOM_PATTERNS: 'safesnap_custom_patterns',
  MAGNITUDE_VARIANCE: 'safesnap_magnitude_variance',
};

const DEFAULT_PII_TYPES = {
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

const DEFAULT_ENV_PATTERNS = {
  PRODUCTION: '\\.(prod|production)($|\\/|:)',
  DEVELOPMENT: '\\.(dev|development)($|\\/|:)',
  STAGING: '\\.(staging|stg|stage)($|\\/|:)',
  LOCAL: '(localhost|127\\.0\\.0\\.1|192\\.168\\.|10\\.0\\.)',
};

const DEFAULT_BANNER_CONFIG = {
  position: 'top-right',
  opacity: 100,
  fadeDistance: 100,
};

// Initialize settings page
document.addEventListener('DOMContentLoaded', async () => {
  console.log('SafeSnap settings page loaded');

  // Initialize UI text with i18n strings
  initializeUIText();

  await loadSettings();
  setupEventListeners();
  updateDictionaryStats();
  calculateStorageUsed();
});

/**
 * Initialize UI text with i18n strings
 */
function initializeUIText() {
  try {
    // Page title (in <title> and <h1>)
    document.title = i18n.settingsPageTitle;
    document.querySelector('h1').textContent = i18n.settingsPageTitle;
    document.querySelector('.subtitle').textContent = i18n.settingsPageSubtitle;

    // Section headings - get all h2 elements in order
    const sections = document.querySelectorAll('.section h2');
    sections[0].textContent = i18n.settingsDefaultPiiTypes; // Default PII Types
    sections[1].textContent = i18n.settingsEnvironmentPatterns; // Environment Patterns
    sections[2].textContent = i18n.settingsBannerCustomization; // Banner Customization
    sections[3].textContent = i18n.settingsCustomRegexPatterns; // Custom Regex Patterns
    sections[4].textContent = i18n.settingsDictionaryManagement; // Dictionary Management
    sections[5].textContent = i18n.settingsMagnitudeVariance; // Magnitude Variance
    sections[6].textContent = i18n.settingsRedactionMode; // Redaction Mode
    sections[7].textContent = i18n.settingsExportImport; // Export/Import
    sections[8].textContent = i18n.settingsAbout; // About

    // Section descriptions (p tags inside sections)
    const descriptions = document.querySelectorAll('.section > p[style*="color: #6b7280"]');
    descriptions[0].textContent = i18n.settingsDefaultPiiTypesDesc;
    descriptions[1].textContent = i18n.settingsEnvironmentPatternsDesc;
    descriptions[2].textContent = i18n.settingsCustomRegexDesc;
    descriptions[3].textContent = i18n.settingsMagnitudeVarianceDesc;
    descriptions[4].textContent = i18n.settingsRedactionModeDesc;
    descriptions[5].textContent = i18n.settingsExportImportDesc;

    // Info box (Dictionary Management section)
    const infoBox = document.querySelector('.info-box');
    if (infoBox) infoBox.textContent = i18n.settingsDictionaryInfoDesc;

    // Form labels - Environment Patterns section
    const patternLabels = document.querySelectorAll('.section:nth-child(3) .form-group label');
    patternLabels[0].textContent = i18n.settingsPatternProduction;
    patternLabels[1].textContent = i18n.settingsPatternDevelopment;
    patternLabels[2].textContent = i18n.settingsPatternStaging;
    patternLabels[3].textContent = i18n.settingsPatternLocal;

    // Placeholders for environment pattern inputs
    document.getElementById('pattern-production').placeholder = i18n.placeholderPatternProduction;
    document.getElementById('pattern-development').placeholder = i18n.placeholderPatternDevelopment;
    document.getElementById('pattern-staging').placeholder = i18n.placeholderPatternStaging;
    document.getElementById('pattern-local').placeholder = i18n.placeholderPatternLocal;

    // Banner Customization labels
    const bannerLabels = document.querySelectorAll('.section:nth-child(4) .form-group label');
    bannerLabels[0].textContent = i18n.labelBannerPosition;
    bannerLabels[1].textContent = i18n.settingsBannerOpacity;
    bannerLabels[2].textContent = i18n.settingsFadeDistance;

    // Banner position select options
    const bannerSelect = document.getElementById('banner-position');
    bannerSelect.options[0].textContent = i18n.positionTopRight;
    bannerSelect.options[1].textContent = i18n.positionTopLeft;
    bannerSelect.options[2].textContent = i18n.positionBottomRight;
    bannerSelect.options[3].textContent = i18n.positionBottomLeft;

    // Custom Regex Patterns labels
    const regexLabels = document.querySelectorAll('.section:nth-child(5) .form-group label');
    regexLabels[0].textContent = i18n.settingsCustomPatternName;
    regexLabels[1].textContent = i18n.settingsCustomPatternRegex;

    // Custom Regex Patterns placeholders
    const customNameInput = document.querySelector('.section:nth-child(5) input[type="text"]');
    const customRegexTextarea = document.querySelector('.section:nth-child(5) textarea');
    if (customNameInput) customNameInput.placeholder = i18n.placeholderCustomPatternName;
    if (customRegexTextarea) customRegexTextarea.placeholder = i18n.placeholderCustomPatternRegex;

    // Magnitude Variance label
    const magnitudeLabel = document.querySelector('.section:nth-child(7) .form-group label');
    if (magnitudeLabel) magnitudeLabel.textContent = i18n.settingsVariancePercentage;

    // Redaction Mode label and select options
    const redactionLabel = document.querySelector('.section:nth-child(8) .form-group label');
    if (redactionLabel) redactionLabel.textContent = i18n.settingsRedactionMode;
    const redactionSelect = document.getElementById('redaction-mode');
    if (redactionSelect) {
      redactionSelect.options[0].textContent = i18n.redactionModeRandom;
      redactionSelect.options[1].textContent = i18n.redactionModeBlackout;
    }

    // About section text
    const aboutSection = document.querySelectorAll('.section:nth-child(10) p strong');
    aboutSection[0].textContent = i18n.aboutVersion + ':';
    aboutSection[1].textContent = i18n.settingsDetectionEngine;
    aboutSection[2].textContent = i18n.settingsStorageUsed;
    document.getElementById('detection-engine').textContent = i18n.settingsDetectionEngineFree;
    document.getElementById('storage-used').textContent = i18n.settingsStorageCalculating;

    // Buttons
    document.getElementById('select-all').textContent = i18n.btnSelectAll;
    document.getElementById('select-none').textContent = i18n.btnSelectNone;
    document.getElementById('reset-patterns').textContent = i18n.btnResetToDefaults;
    document.querySelector('.section:nth-child(5) .btn-primary').textContent = i18n.btnAddPattern;
    document.getElementById('download-dictionary').textContent = i18n.btnDownloadFullDictionary;
    document.getElementById('clear-dictionary').textContent = i18n.btnClearDictionaryCache;
    document.getElementById('export-settings').textContent = i18n.btnExportSettings;
    document.getElementById('import-settings').textContent = i18n.btnImportSettings;

    // Toast
    document.getElementById('toast').textContent = i18n.toastSettingsSaved;
  } catch (error) {
    console.error('[SafeSnap Settings] Error in initializeUIText:', error);
  }
}

/**
 * Load all settings from storage
 */
async function loadSettings() {
  console.log('[SafeSnap Settings] loadSettings called');

  // Load PII types
  const savedTypes = await getFromStorage(STORAGE_KEYS.PII_TYPES);
  console.log('[SafeSnap Settings] Saved PII types from storage:', savedTypes);
  const piiTypes = savedTypes || DEFAULT_PII_TYPES;
  console.log('[SafeSnap Settings] Final PII types to render:', piiTypes);
  renderPIITypes(piiTypes);

  // Load environment patterns
  const savedPatterns = await getFromStorage(STORAGE_KEYS.ENV_PATTERNS);
  const envPatterns = savedPatterns || DEFAULT_ENV_PATTERNS;
  document.getElementById('pattern-production').value = envPatterns.PRODUCTION;
  document.getElementById('pattern-development').value = envPatterns.DEVELOPMENT;
  document.getElementById('pattern-staging').value = envPatterns.STAGING;
  document.getElementById('pattern-local').value = envPatterns.LOCAL;

  // Load banner config
  const savedBanner = await getFromStorage(STORAGE_KEYS.BANNER_CONFIG);
  const bannerConfig = savedBanner || DEFAULT_BANNER_CONFIG;
  document.getElementById('banner-position').value = bannerConfig.position;
  document.getElementById('banner-opacity').value = bannerConfig.opacity;
  document.getElementById('opacity-value').textContent = bannerConfig.opacity + '%';
  document.getElementById('fade-distance').value = bannerConfig.fadeDistance;
  document.getElementById('fade-value').textContent = bannerConfig.fadeDistance + 'px';

  // Load general settings (redaction mode, etc.)
  const result = await chrome.storage.sync.get(['safesnap_settings']);
  const settings = result.safesnap_settings || {};

  // Load redaction mode
  const redactionMode = settings.redactionMode || 'random';
  document.getElementById('redaction-mode').value = redactionMode;
}

/**
 * Render PII type checkboxes
 */
function renderPIITypes(piiTypes) {
  console.log('[SafeSnap Settings] renderPIITypes called with:', piiTypes);
  const container = document.getElementById('pii-types');
  console.log('[SafeSnap Settings] Container element:', container);

  if (!container) {
    console.error('[SafeSnap Settings] pii-types container not found!');
    return;
  }

  container.innerHTML = '';

  for (const [type, config] of Object.entries(piiTypes)) {
    const item = document.createElement('div');
    item.className = 'checkbox-item';

    item.innerHTML = `
      <input type="checkbox" id="pii-${type}" ${config.enabled ? 'checked' : ''}>
      <div>
        <label for="pii-${type}">${config.label}</label>
        <div class="description">${config.description}</div>
      </div>
    `;

    container.appendChild(item);

    // Add event listener
    const checkbox = item.querySelector('input');
    checkbox.addEventListener('change', async () => {
      piiTypes[type].enabled = checkbox.checked;
      await saveToStorage(STORAGE_KEYS.PII_TYPES, piiTypes);
      showToast(i18n.toastPiiTypesUpdated);

      // Notify all tabs that PII types changed (so highlights can update)
      notifyPIITypesChanged();
    });

    // Make the whole item clickable
    item.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.click();
      }
    });
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Select All / None buttons
  document.getElementById('select-all').addEventListener('click', () => {
    document.querySelectorAll('#pii-types input[type="checkbox"]').forEach((cb) => {
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
    });
  });

  document.getElementById('select-none').addEventListener('click', () => {
    document.querySelectorAll('#pii-types input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));
    });
  });

  // Environment pattern inputs
  ['production', 'development', 'staging', 'local'].forEach((env) => {
    const input = document.getElementById(`pattern-${env}`);
    input.addEventListener('blur', async () => {
      const patterns = {
        PRODUCTION: document.getElementById('pattern-production').value,
        DEVELOPMENT: document.getElementById('pattern-development').value,
        STAGING: document.getElementById('pattern-staging').value,
        LOCAL: document.getElementById('pattern-local').value,
      };
      await saveToStorage(STORAGE_KEYS.ENV_PATTERNS, patterns);
      showToast(i18n.toastEnvironmentPatternsUpdated);
    });
  });

  // Reset patterns button
  document.getElementById('reset-patterns').addEventListener('click', async () => {
    document.getElementById('pattern-production').value = DEFAULT_ENV_PATTERNS.PRODUCTION;
    document.getElementById('pattern-development').value = DEFAULT_ENV_PATTERNS.DEVELOPMENT;
    document.getElementById('pattern-staging').value = DEFAULT_ENV_PATTERNS.STAGING;
    document.getElementById('pattern-local').value = DEFAULT_ENV_PATTERNS.LOCAL;
    await saveToStorage(STORAGE_KEYS.ENV_PATTERNS, DEFAULT_ENV_PATTERNS);
    showToast(i18n.toastPatternsReset);
  });

  // Banner position
  document.getElementById('banner-position').addEventListener('change', async (e) => {
    const config = (await getFromStorage(STORAGE_KEYS.BANNER_CONFIG)) || DEFAULT_BANNER_CONFIG;
    config.position = e.target.value;
    await saveToStorage(STORAGE_KEYS.BANNER_CONFIG, config);
    showToast(i18n.toastBannerPositionUpdated);
  });

  // Banner opacity slider
  document.getElementById('banner-opacity').addEventListener('input', (e) => {
    document.getElementById('opacity-value').textContent = e.target.value + '%';
  });

  document.getElementById('banner-opacity').addEventListener('change', async (e) => {
    const config = (await getFromStorage(STORAGE_KEYS.BANNER_CONFIG)) || DEFAULT_BANNER_CONFIG;
    config.opacity = parseInt(e.target.value);
    await saveToStorage(STORAGE_KEYS.BANNER_CONFIG, config);
    showToast(i18n.toastBannerOpacityUpdated);
  });

  // Fade distance slider
  document.getElementById('fade-distance').addEventListener('input', (e) => {
    document.getElementById('fade-value').textContent = e.target.value + 'px';
  });

  document.getElementById('fade-distance').addEventListener('change', async (e) => {
    const config = (await getFromStorage(STORAGE_KEYS.BANNER_CONFIG)) || DEFAULT_BANNER_CONFIG;
    config.fadeDistance = parseInt(e.target.value);
    await saveToStorage(STORAGE_KEYS.BANNER_CONFIG, config);
    showToast(i18n.toastFadeDistanceUpdated);
  });

  // Redaction mode selector
  document.getElementById('redaction-mode').addEventListener('change', async (e) => {
    const result = await chrome.storage.sync.get(['safesnap_settings']);
    const settings = result.safesnap_settings || {};
    settings.redactionMode = e.target.value;
    await chrome.storage.sync.set({ safesnap_settings: settings });
    showToast(i18n.toastRedactionModeUpdated);
  });

  // Debug mode toggle
  // Dictionary management
  document.getElementById('download-dictionary').addEventListener('click', async () => {
    const btn = document.getElementById('download-dictionary');
    btn.disabled = true;
    btn.textContent = i18n.btnDownloading;

    try {
      // Import and use dictionary directly
      const { Dictionary } = await import('../detection/dictionary.js');
      const dictionary = new Dictionary();
      await dictionary.initialize();

      const success = await dictionary.downloadFullDictionary();

      if (success) {
        showToast(i18n.toastDictionaryDownloaded);
        updateDictionaryStats();
      } else {
        alert(i18n.errorDictionaryDownloadFailed);
      }
    } catch (error) {
      alert(`${i18n.errorDictionaryDownloadFailed}: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = i18n.btnDownloadFullDictionary;
    }
  });

  document.getElementById('clear-dictionary').addEventListener('click', async () => {
    if (confirm(i18n.confirmClearDictionary)) {
      try {
        // Import and use dictionary directly
        const { Dictionary } = await import('../detection/dictionary.js');
        const dictionary = new Dictionary();
        await dictionary.initialize();

        await dictionary.clearFullDictionary();
        showToast(i18n.toastDictionaryCacheCleared);
        updateDictionaryStats();
      } catch (error) {
        alert(`${i18n.errorDictionaryClearFailed} ${error.message}`);
      }
    }
  });

  // Export/Import settings
  document.getElementById('export-settings').addEventListener('click', exportSettings);
  document.getElementById('import-settings').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importSettings);
}

/**
 * Update dictionary statistics
 */
async function updateDictionaryStats() {
  const container = document.getElementById('dictionary-stats');

  // Request stats from background script
  chrome.runtime.sendMessage({ type: 'GET_DICTIONARY_STATS' }, (response) => {
    if (response && response.stats) {
      const stats = response.stats;
      container.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${stats.coreDictionarySize.toLocaleString()}</div>
          <div class="stat-label">${i18n.statsCoreWords}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.fullDictionarySize.toLocaleString()}</div>
          <div class="stat-label">${i18n.statsFullDictionary}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.usageCount}</div>
          <div class="stat-label">${i18n.statsTimesUsed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.isFullDictionaryLoaded ? i18n.statsYes : i18n.statsNo}</div>
          <div class="stat-label">${i18n.statsFullDownloaded}</div>
        </div>
      `;
    } else {
      container.innerHTML = '<p style="color: #6b7280;">Unable to load dictionary stats</p>';
    }
  });
}

/**
 * Calculate storage used
 */
async function calculateStorageUsed() {
  chrome.storage.local.getBytesInUse(null, (bytes) => {
    const kb = (bytes / 1024).toFixed(2);
    document.getElementById('storage-used').textContent = `${kb} KB`;
  });
}

/**
 * Export settings to JSON file
 */
async function exportSettings() {
  const settings = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    piiTypes: await getFromStorage(STORAGE_KEYS.PII_TYPES),
    envPatterns: await getFromStorage(STORAGE_KEYS.ENV_PATTERNS),
    bannerConfig: await getFromStorage(STORAGE_KEYS.BANNER_CONFIG),
  };

  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `safesnap-settings-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(i18n.toastSettingsExported);
}

/**
 * Import settings from JSON file
 */
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const settings = JSON.parse(text);

    // Validate settings
    if (!settings.version) {
      throw new Error(i18n.errorInvalidSettingsFile);
    }

    // Import each setting
    if (settings.piiTypes) {
      await saveToStorage(STORAGE_KEYS.PII_TYPES, settings.piiTypes);
    }
    if (settings.envPatterns) {
      await saveToStorage(STORAGE_KEYS.ENV_PATTERNS, settings.envPatterns);
    }
    if (settings.bannerConfig) {
      await saveToStorage(STORAGE_KEYS.BANNER_CONFIG, settings.bannerConfig);
    }

    // Reload page to reflect changes
    showToast(i18n.toastSettingsImported);
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    alert(`${i18n.errorImportSettingsFailed} ${error.message}`);
  }

  // Reset file input
  event.target.value = '';
}

/**
 * Show toast notification
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

/**
 * Get data from Chrome storage (using sync for PII types, local for others)
 */
function getFromStorage(key) {
  return new Promise((resolve) => {
    // Use sync storage for PII types to match popup behavior
    const storageArea = key === STORAGE_KEYS.PII_TYPES ? chrome.storage.sync : chrome.storage.local;
    storageArea.get([key], (result) => {
      resolve(result[key] || null);
    });
  });
}

/**
 * Save data to Chrome storage (using sync for PII types, local for others)
 */
function saveToStorage(key, value) {
  return new Promise((resolve) => {
    // Use sync storage for PII types to match popup behavior
    const storageArea = key === STORAGE_KEYS.PII_TYPES ? chrome.storage.sync : chrome.storage.local;
    storageArea.set({ [key]: value }, resolve);
  });
}

/**
 * Notify all tabs that PII types have changed
 */
function notifyPIITypesChanged() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { type: 'PII_TYPES_CHANGED' }).catch(() => {
        // Ignore errors for tabs without content script
      });
    });
  });
}
