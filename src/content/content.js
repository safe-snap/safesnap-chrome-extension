// SafeSnap - Content Script
// Runs on web pages to detect and protect PII

import { PIIDetector } from '../detection/pii-detector.js';
import { Replacer } from '../replacement/replacer.js';
import { ConsistencyMapper } from '../replacement/consistency-mapper.js';
import { APP_CONFIG } from '../../config/app-config.js';
import i18n from '../i18n/en.js';
import {
  enableHighlightMode,
  disableHighlightMode,
  enableDebugMode,
  disableDebugMode,
  isHighlightEnabled,
  initializeHighlightMode,
  refreshHighlightsWithSettings,
} from './modules/highlight-mode.js';
import { loadSettings, getSetting, detectEnvironment } from './modules/settings.js';
import {
  showProtectedModeIndicator,
  hideNotificationPanel,
  refreshAllPanelPositions,
} from './modules/notification-panel.js';

// Prevent multiple initializations
if (window.safesnapInitialized) {
  console.log('SafeSnap already initialized, skipping duplicate load');
  throw new Error('SafeSnap already loaded'); // Stop execution
}
window.safesnapInitialized = true;

console.log('SafeSnap content script loaded');
// Initialize modules
let detector = null;
let replacer = null;
let consistencyMapper = null;
let originalContent = new Map(); // Store original text nodes
let isPIIProtected = false;
let currentEnvironment = null;

// Initialize on load
(async () => {
  // Load user settings
  await loadSettings();

  detector = new PIIDetector();
  await detector.initialize();
  replacer = new Replacer();
  consistencyMapper = new ConsistencyMapper();

  // Detect environment and show banner if applicable
  currentEnvironment = detectEnvironment();
  if (currentEnvironment) {
    showEnvironmentBanner(currentEnvironment);
  }

  console.log('SafeSnap initialized', { environment: currentEnvironment });

  // Wait for DOM to be ready before enabling highlights
  const enableHighlightsIfNeeded = async () => {
    const shouldEnableHighlights = await initializeHighlightMode();
    if (shouldEnableHighlights) {
      console.log('[SafeSnap] DOM ready, restoring highlights');
      enableHighlightMode(detector, getOriginalTextForNode);
    }
  };

  // Check DOM state and enable highlights when ready
  if (document.readyState === 'loading') {
    // DOM not yet loaded, wait for DOMContentLoaded
    console.log('[SafeSnap] Waiting for DOM to load before enabling highlights');
    document.addEventListener('DOMContentLoaded', enableHighlightsIfNeeded);
  } else {
    // DOM already loaded, enable highlights immediately if needed
    await enableHighlightsIfNeeded();
  }
})();

/**
 * Helper function to get the original text content of a node before PII protection
 * @param {Node} node - The text node to get original content for
 * @returns {string|null} Original text content or null if not found
 */
function getOriginalTextForNode(node) {
  if (!isPIIProtected) {
    // If PII is not protected, return null (no original to show)
    return null;
  }
  return originalContent.get(node) || null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  // Handle action-based messages (from popup highlight button)
  if (message.action === 'toggleHighlightMode') {
    const isEnabled = isHighlightEnabled();
    const newState = !isEnabled;
    console.log('[SafeSnap Content] Highlight mode toggled to:', newState);

    // Save state to storage for persistence
    chrome.storage.local.set({ highlightModeEnabled: newState });

    if (newState) {
      console.log('[SafeSnap Content] Enabling highlight mode');
      enableHighlightMode(detector, getOriginalTextForNode);
    } else {
      console.log('[SafeSnap Content] Disabling highlight mode');
      disableHighlightMode();
    }
    console.log('[SafeSnap Content] Sending response:', { enabled: newState });
    sendResponse({ enabled: newState });
    return false;
  }

  // Handle type-based messages
  switch (message.type) {
    case 'PROTECT_PII':
      protectPII(message.enabledTypes)
        .then(() => {
          sendResponse({ success: true, message: 'PII protection applied' });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicates async response

    case 'RESTORE_ORIGINAL':
      restoreOriginal();
      sendResponse({ success: true, message: 'Original content restored' });
      break;

    case 'GET_STATUS':
      sendResponse({
        success: true,
        isPIIProtected,
        isHighlightModeEnabled: isHighlightEnabled(),
        environment: currentEnvironment,
      });
      break;

    case 'RELOAD_SETTINGS':
      loadSettings()
        .then(async () => {
          // Refresh positions of all active notification panels
          await refreshAllPanelPositions();

          sendResponse({ success: true, message: 'Settings reloaded and panels updated' });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicates async response

    case 'SHOW_BANNER':
      showStatusBanner(message.message);
      sendResponse({ success: true });
      break;

    case 'PII_TYPES_CHANGED':
      // User changed PII type checkboxes - refresh highlights if enabled
      console.log('[SafeSnap] PII types changed, refreshing highlights');
      refreshHighlightsWithSettings()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('[SafeSnap] Error refreshing highlights:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicates async response

    case 'toggleDebugMode':
      if (message.enabled) {
        enableDebugMode();
      } else {
        disableDebugMode();
      }
      sendResponse({ success: true });
      break;

    default:
      if (message.type) {
        console.warn('Unknown message type:', message.type);
        sendResponse({ error: 'Unknown message type' });
      }
  }
});

/**
 * Get banner position styles based on setting
 */

/**
 * Show environment banner with fade-on-mouse behavior
 */
function showEnvironmentBanner(environment) {
  const banner = document.createElement('div');
  banner.id = 'safesnap-env-banner';

  const backgroundColor = APP_CONFIG.defaults.environmentColors[environment] || '#EF4444';
  const environmentText = APP_CONFIG.defaults.environmentText[environment] || environment;

  banner.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${backgroundColor};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    opacity: 1;
    transition: opacity 0.3s ease;
    pointer-events: none;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>${environmentText}</span>
    </div>
  `;

  document.body.appendChild(banner);

  // Fade on mouse proximity
  document.addEventListener('mousemove', (e) => {
    const rect = banner.getBoundingClientRect();

    // Calculate distance from cursor to nearest edge of the banner
    const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
    const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
    const distance = Math.sqrt(dx * dx + dy * dy);

    const fadeDistance = getSetting('fadeDistance');
    const invisibleRadius = 20; // Fully invisible within 20px from edge

    if (distance < invisibleRadius) {
      banner.style.opacity = 0;
    } else if (distance < fadeDistance) {
      // Fade from 0 to 1 between invisibleRadius and fadeDistance
      const opacity = (distance - invisibleRadius) / (fadeDistance - invisibleRadius);
      banner.style.opacity = opacity;
    } else {
      banner.style.opacity = 1;
    }
  });
}

/**
 * Show ephemeral status banner (for popup messages)
 */
function showStatusBanner(message) {
  // Remove any existing status banner
  const existingBanner = document.getElementById('safesnap-status-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  const banner = document.createElement('div');
  banner.id = 'safesnap-status-banner';

  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: slideInTop 0.3s ease-out;
    pointer-events: none;
  `;

  banner.textContent = message;
  document.body.appendChild(banner);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    banner.style.animation = 'slideOutTop 0.3s ease-out';
    setTimeout(() => banner.remove(), 300);
  }, 3000);
}

/**
 * Protect PII on the page - Real implementation
 */
async function protectPII(enabledTypes) {
  console.log('Protecting PII with types:', enabledTypes);

  if (isPIIProtected) {
    // Silently ignore - the toggle button already indicates the state
    console.log('PII is already protected, ignoring duplicate request');
    return;
  }

  if (!detector || !replacer) {
    throw new Error('SafeSnap modules not initialized');
  }

  // Apply user settings to replacer
  replacer.setMagnitudeVariance(getSetting('magnitudeVariance'));
  replacer.setRedactionMode(getSetting('redactionMode'));

  // Reset multipliers so all money/quantities use the same factor
  replacer.resetMultipliers();

  // Clear previous mappings
  consistencyMapper.clear();
  originalContent.clear();

  try {
    // Show loading indicator
    showProtectionBanner('detecting');

    // Detect PII in DOM
    console.time('PII Detection');
    const entities = detector.detectInDOM(document.body, enabledTypes);
    console.timeEnd('PII Detection');

    console.log(`Detected ${entities.length} PII entities`, detector.getStats(entities));

    // Auto-link related entities
    consistencyMapper.autoLinkRelated(entities);

    // Phase 1: Generate all replacements and build consistency map
    console.time('Generate Replacements');
    const replacementMap = new Map(); // Map of type+original -> replacement

    for (const entity of entities) {
      const { original, type } = entity;
      const key = `${type}:${original}`;

      // Skip if we already have a replacement for this
      if (replacementMap.has(key)) {
        continue;
      }

      // Get or generate replacement
      let replacement;
      if (consistencyMapper.has(type, original)) {
        replacement = consistencyMapper.get(type, original);
      } else {
        // Generate new replacement
        switch (type) {
          case 'properNoun':
            replacement = replacer.replaceProperNoun(original, entity.context);
            break;
          case 'email':
            replacement = replacer.replaceEmail(original);
            break;
          case 'phone':
            replacement = replacer.replacePhone(original);
            break;
          case 'money':
            replacement = replacer.replaceMoney(original);
            break;
          case 'quantity':
            replacement = replacer.replaceQuantity(original);
            break;
          case 'url':
            replacement = replacer.replaceURL(original);
            break;
          case 'address':
            replacement = replacer.replaceAddress(original);
            break;
          case 'date':
            replacement = replacer.replaceDate(original);
            break;
          case 'ssn':
            replacement = replacer.replaceSSN(original);
            break;
          case 'creditCard':
            replacement = replacer.replaceCreditCard(original);
            break;
          case 'ipAddress':
            replacement = replacer.replaceIPAddress(original);
            break;
          default:
            replacement = original;
        }

        // Store in consistency map
        consistencyMapper.set(type, original, replacement);

        // Propagate to related entities
        consistencyMapper.propagateToRelated(type, original, replacement);
      }

      replacementMap.set(key, replacement);
    }
    console.timeEnd('Generate Replacements');

    // Phase 2: Apply all replacements across the entire DOM using a comprehensive pass
    console.time('Apply Replacements');
    let replacementCount = 0;

    // Walk through ALL text nodes in the document
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        // Skip script, style, and other non-visible elements
        const skipTags = ['script', 'style', 'noscript', 'iframe', 'object', 'embed'];
        if (skipTags.includes(parent.tagName.toLowerCase())) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      // Store original content before any modification
      if (!originalContent.has(currentNode)) {
        originalContent.set(currentNode, currentNode.textContent);
      }

      let nodeText = currentNode.textContent;
      let modified = false;

      // Apply all replacements to this text node
      for (const [key, replacement] of replacementMap) {
        // Extract original value from the key (format: "type:original")
        const original = key.substring(key.indexOf(':') + 1);

        // Use global replace to catch ALL occurrences in this node
        // Escape special regex characters in the original text
        const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedOriginal, 'g');

        if (regex.test(nodeText)) {
          nodeText = nodeText.replace(regex, replacement);
          modified = true;
          replacementCount++;
        }
      }

      if (modified) {
        currentNode.textContent = nodeText;
      }
    }

    console.timeEnd('Apply Replacements');
    console.log(`Applied replacements to ${replacementCount} occurrences`);

    // Protect form inputs
    protectFormInputs(enabledTypes);

    isPIIProtected = true;

    // Show temporary success banner
    showProtectionBanner('active', {
      entityCount: entities.length,
      types: enabledTypes,
      environment: currentEnvironment,
    });

    // Show persistent watermark
    showPersistentWatermark();

    // Refresh highlights if they're currently showing
    if (isHighlightEnabled()) {
      setTimeout(() => {
        disableHighlightMode();
        enableHighlightMode(detector, getOriginalTextForNode);
      }, 100); // Small delay to let DOM settle
    }

    // Check dictionary usage - show banner with download button
    if (detector.checkDictionaryUsage()) {
      setTimeout(() => {
        showDictionaryDownloadBanner();
      }, 6000); // Show after the success banner disappears
    }
  } catch (error) {
    console.error('PII protection failed:', error);
    showProtectionBanner('error', { error: error.message });
    throw error;
  }
}

/**
 * Protect form inputs
 */
function protectFormInputs(enabledTypes) {
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], textarea, select'
  );

  inputs.forEach((input) => {
    if (input.value && input.value.trim()) {
      const original = input.value;
      const entities = detector.detectInText(original, enabledTypes);

      if (entities.length > 0) {
        // Store original
        if (!originalContent.has(input)) {
          originalContent.set(input, original);
        }

        // Apply replacements
        let newValue = original;
        for (const entity of entities.reverse()) {
          // Reverse to maintain indices
          let replacement;
          if (consistencyMapper.has(entity.type, entity.original)) {
            replacement = consistencyMapper.get(entity.type, entity.original);
          } else {
            // Generate replacement using replacer methods
            replacement = entity.original; // Fallback
          }

          newValue =
            newValue.substring(0, entity.start) + replacement + newValue.substring(entity.end);
        }

        input.value = newValue;
      }
    }
  });
}

/**
 * Show protection banner
 */
function showProtectionBanner(state, data = {}) {
  // Remove existing banner
  const existing = document.getElementById('safesnap-protection-banner');
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement('div');
  banner.id = 'safesnap-protection-banner';

  let backgroundColor, icon, message;

  switch (state) {
    case 'detecting':
      backgroundColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      icon = '🔍';
      message = 'Detecting PII...';
      break;
    case 'active':
      backgroundColor = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      icon = '🔒';
      message = `PII Protected - ${data.entityCount} entities replaced`;
      break;
    case 'error':
      backgroundColor = 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
      icon = '⚠️';
      message = `${i18n.errorPrefix} ${data.error}`;
      break;
    case 'info':
      backgroundColor = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      icon = 'ℹ️';
      message = data.message || 'Information';
      break;
    default:
      backgroundColor = '#333';
      icon = 'ℹ️';
      message = 'SafeSnap';
  }

  // Ephemeral banners always use top-center position
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${backgroundColor};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: slideInTop 0.3s ease-out;
    max-width: 350px;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">${icon}</span>
      <div>
        <div>${message}</div>
        ${data.types ? `<small style="opacity: 0.8; font-weight: 400; margin-top: 4px; display: block;">Types: ${data.types.join(', ')}</small>` : ''}
        ${data.environment ? `<small style="opacity: 0.8; font-weight: 400;">${i18n.environmentLabel} ${data.environment}</small>` : ''}
      </div>
    </div>
  `;

  // Add animation for top slide-in
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInTop {
      from {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    @keyframes slideOutTop {
      from {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      to {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
    }
  `;

  if (!document.getElementById('safesnap-animations')) {
    style.id = 'safesnap-animations';
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // Auto-hide after delay (except for detecting state)
  if (state !== 'detecting') {
    setTimeout(() => {
      banner.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
    }, 5000);
  }
}

/**
 * Show dictionary download banner with button
 */
function showDictionaryDownloadBanner() {
  // Remove existing banner
  const existing = document.getElementById('safesnap-protection-banner');
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement('div');
  banner.id = 'safesnap-protection-banner';

  // Ephemeral banners always use top-center position
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: slideInTop 0.3s ease-out;
    max-width: 400px;
    pointer-events: auto;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">💡</span>
      <div style="flex: 1;">
        <div>Tip: Download the full dictionary for improved accuracy</div>
        <small style="opacity: 0.9; font-weight: 400; display: block; margin-top: 4px;">
          More accurate proper noun detection with 80K+ words
        </small>
      </div>
      <button id="safesnap-download-dict-btn" style="
        background: white;
        color: #2563eb;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        white-space: nowrap;
      ">
        Download
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  // Add button click handler
  const downloadBtn = document.getElementById('safesnap-download-dict-btn');
  downloadBtn.addEventListener('mouseenter', () => {
    downloadBtn.style.transform = 'scale(1.05)';
    downloadBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  });
  downloadBtn.addEventListener('mouseleave', () => {
    downloadBtn.style.transform = 'scale(1)';
    downloadBtn.style.boxShadow = 'none';
  });
  downloadBtn.addEventListener('click', async () => {
    downloadBtn.textContent = 'Downloading...';
    downloadBtn.disabled = true;
    downloadBtn.style.cursor = 'wait';

    try {
      const success = await detector.dictionary.downloadFullDictionary();
      if (success) {
        banner.style.animation = 'slideOutTop 0.3s ease-out';
        setTimeout(() => {
          banner.remove();
          showProtectionBanner('active', {
            message: 'Dictionary downloaded successfully!',
          });
        }, 300);
      } else {
        downloadBtn.textContent = 'Error';
        downloadBtn.style.background = '#ef4444';
        downloadBtn.style.color = 'white';
        setTimeout(() => {
          banner.style.animation = 'slideOutTop 0.3s ease-out';
          setTimeout(() => banner.remove(), 300);
        }, 2000);
      }
    } catch (error) {
      console.error('Dictionary download failed:', error);
      downloadBtn.textContent = 'Error';
      downloadBtn.style.background = '#ef4444';
      downloadBtn.style.color = 'white';
      setTimeout(() => {
        banner.style.animation = 'slideOutTop 0.3s ease-out';
        setTimeout(() => banner.remove(), 300);
      }, 2000);
    }
  });

  // Auto-hide after longer delay (15 seconds to give time to read and click)
  setTimeout(() => {
    if (banner.parentNode) {
      banner.style.animation = 'slideOutTop 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
    }
  }, 15000);
}

/**
 * Show persistent watermark (now using unified notification panel)
 */
function showPersistentWatermark() {
  // Show the protected mode indicator using unified notification panel
  showProtectedModeIndicator();
}

/**
 * Remove persistent watermark
 */
function removePersistentWatermark() {
  hideNotificationPanel('protected-mode');
}

/**
 * Restore original content
 */
function restoreOriginal() {
  console.log('Restoring original content');

  if (!isPIIProtected) {
    showProtectionBanner('info', { message: 'No PII protection is currently active.' });
    return;
  }

  // Restore all modified text nodes
  for (const [node, originalText] of originalContent.entries()) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = originalText;
    } else if (
      node.tagName === 'INPUT' ||
      node.tagName === 'TEXTAREA' ||
      node.tagName === 'SELECT'
    ) {
      node.value = originalText;
    }
  }

  // Clear storage
  originalContent.clear();
  consistencyMapper.clear();

  // Remove protection banner
  const banner = document.getElementById('safesnap-protection-banner');
  if (banner) {
    banner.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => banner.remove(), 300);
  }

  // Remove persistent watermark
  removePersistentWatermark();

  isPIIProtected = false;

  // Refresh highlights if they're currently showing
  if (isHighlightEnabled()) {
    setTimeout(() => {
      disableHighlightMode();
      enableHighlightMode(detector, getOriginalTextForNode);
    }, 100); // Small delay to let DOM settle
  }

  console.log('✅ Original content restored');
}

/**
 * Enable highlight mode - show visual highlighting of all detection candidates
 */
