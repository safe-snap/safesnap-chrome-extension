// SafeSnap - Content Script
// Runs on web pages to detect and protect PII

import { PIIDetector } from '../detection/pii-detector.js';
import { Replacer } from '../replacement/replacer.js';
import { ConsistencyMapper } from '../replacement/consistency-mapper.js';
import {
  protectPII as protectPIICore,
  restoreOriginal as restoreOriginalCore,
  getOriginalTextForNode,
  getProtectionStatus,
} from './modules/pii-protection.js';
import { showStatusMessage } from './modules/notification-panel.js';
import {
  enableHighlightMode,
  disableHighlightMode,
  enableDebugMode,
  disableDebugMode,
  isHighlightEnabled,
  initializeHighlightMode,
  refreshHighlightsWithSettings,
} from './modules/highlight-mode.js';
import { loadSettings, getSetting } from './modules/settings.js';
import { refreshAllPanelPositions } from './modules/notification-panel.js';

// Prevent multiple initializations
if (window.safesnapInitialized) {
  console.log('[SafeSnap Debug] SafeSnap already initialized, skipping duplicate load'); // Initialization check
  throw new Error('SafeSnap already loaded'); // Stop execution
}
window.safesnapInitialized = true;

console.log('[SafeSnap Debug] Content script loaded: SafeSnap initialization attempt starting.');
console.log(`[SafeSnap Debug] DOM ready state on script load: ${document.readyState}`);
// Initialize modules
let detector = null;
let replacer = null;
let consistencyMapper = null;

// Initialize on load
(async () => {
  // Load user settings
  await loadSettings();

  try {
    detector = new PIIDetector();
    console.log('[SafeSnap Debug] PIIDetector created successfully');
  } catch (error) {
    console.error('[SafeSnap Error] PIIDetector initialization failed:', error);
  }
  try {
    await detector.initialize();
    console.log('[SafeSnap Debug] PIIDetector initialized successfully');
  } catch (error) {
    console.error('[SafeSnap Error] PIIDetector initialization failed during async setup:', error);
  }
  try {
    replacer = new Replacer();
    console.log('[SafeSnap Debug] Replacer module created successfully');
  } catch (error) {
    console.error('[SafeSnap Error] Replacer module creation failed:', error);
  }
  consistencyMapper = new ConsistencyMapper();

  console.log('[SafeSnap Debug] SafeSnap fully initialized: All modules loaded successfully.');
  console.log('[SafeSnap Debug] Modules initialized: detector, replacer, consistencyMapper');

  // Wait for DOM to be ready before enabling highlights
  const enableHighlightsIfNeeded = async () => {
    const shouldEnableHighlights = await initializeHighlightMode();
    if (shouldEnableHighlights) {
      console.log('[SafeSnap Debug] DOM is ready; attempting to enable highlights.');
      enableHighlightMode(detector, getOriginalTextForNode);
    }
  };

  // Check DOM state and enable highlights when ready
  if (document.readyState === 'loading') {
    // DOM not yet loaded, wait for DOMContentLoaded
    console.log(
      '[SafeSnap Debug] DOM is still loading; attaching DOMContentLoaded listener for deferred initialization.'
    );
    document.addEventListener('DOMContentLoaded', enableHighlightsIfNeeded);
  } else {
    // DOM already loaded, enable highlights immediately if needed
    await enableHighlightsIfNeeded();
  }
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  // Handle action-based messages (from popup highlight button)
  if (message.action === 'toggleHighlightMode') {
    const isEnabled = isHighlightEnabled();
    const newState = !isEnabled;
    console.log('[SafeSnap Content] Highlight mode toggled to:', newState);

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
        isPIIProtected: getProtectionStatus(),
        isHighlightModeEnabled: isHighlightEnabled(),
      });
      break;

    case 'RELOAD_SETTINGS':
      loadSettings()
        .then(async () => {
          // Update detector's threshold from newly loaded settings
          if (detector) {
            const threshold = getSetting('properNounThreshold');
            if (threshold !== undefined) {
              detector.setProperNounThreshold(threshold);
            }
          }

          // Refresh positions of all active notification panels
          await refreshAllPanelPositions();

          // If highlight mode is active, refresh highlights with new settings
          // This ensures changes to threshold, etc. are immediately visible
          if (isHighlightEnabled()) {
            console.log('[SafeSnap] Settings changed, refreshing highlights');
            await refreshHighlightsWithSettings();
          }

          sendResponse({ success: true, message: 'Settings reloaded and panels updated' });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicates async response

    case 'SHOW_BANNER':
      showStatusMessage('info', { message: message.message });
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
        console.warn('[SafeSnap Warning] Received unknown message type:', message.type);
        sendResponse({ error: 'Unknown message type' });
      }
  }
});

/**
 * Protect PII on the page - Wrapper for core protection logic
 */
async function protectPII(enabledTypes) {
  console.log('Protecting PII with types:', enabledTypes);

  if (getProtectionStatus()) {
    console.log('PII is already protected, ignoring duplicate request');
    return;
  }

  if (!detector || !replacer) {
    throw new Error('SafeSnap modules not initialized');
  }

  // Apply user settings to replacer
  replacer.setMagnitudeVariance(getSetting('magnitudeVariance'));
  replacer.setRedactionMode(getSetting('redactionMode'));

  try {
    // Call core protection logic
    const entities = await protectPIICore(enabledTypes, detector, replacer, consistencyMapper);

    // Highlights are automatically preserved after PII protection
    // The refreshHighlightsWithSettings() function now checks if PII is protected
    // and skips re-detection to maintain original highlight colors

    return entities;
  } catch (error) {
    console.error('PII protection failed:', error);
    throw error;
  }
}

/**
 * Restore original content - Wrapper for core restoration logic
 */
function restoreOriginal() {
  restoreOriginalCore();

  // Clear consistency mapper
  consistencyMapper.clear();

  // Refresh highlights if they're currently showing
  if (isHighlightEnabled()) {
    setTimeout(() => {
      disableHighlightMode();
      enableHighlightMode(detector, getOriginalTextForNode);
    }, 100);
  }
}
