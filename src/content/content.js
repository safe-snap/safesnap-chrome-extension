// SafeSnap - Content Script
// Runs on web pages to detect and protect PII

import { PIIDetector } from '../detection/pii-detector.js';
import { Replacer } from '../replacement/replacer.js';
import { ConsistencyMapper } from '../replacement/consistency-mapper.js';
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
import { loadSettings, getSetting } from './modules/settings.js';
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

// Initialize on load
(async () => {
  // Load user settings
  await loadSettings();

  detector = new PIIDetector();
  await detector.initialize();
  replacer = new Replacer();
  consistencyMapper = new ConsistencyMapper();

  console.log('SafeSnap initialized');

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

    console.log(`[SafeSnap] Detected ${entities.length} PII entities`, detector.getStats(entities));

    // DEBUG: Log all detected entities with their positions and nodes
    console.log(
      '[SafeSnap Debug] ⚠️ ALL DETECTED ENTITIES AFTER detectInDOM:',
      entities.map((e) => ({
        type: e.type,
        original: e.original,
        start: e.start,
        end: e.end,
        nodeText: e.nodeText ? e.nodeText.substring(0, 50) : 'N/A',
        spansMultipleNodes: e.spansMultipleNodes || false,
      }))
    );

    // DEBUG: Check specifically for date-related entities
    const dateRelatedText = entities.filter(
      (e) => e.nodeText && e.nodeText.includes('Jan 17, 2026')
    );
    if (dateRelatedText.length > 0) {
      console.error('[SafeSnap Debug] 🐛 FOUND ENTITIES IN "Jan 17, 2026" TEXT:', dateRelatedText);
    }

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
          case 'location':
            replacement = replacer.replaceLocation(original);
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

    // Phase 2: Apply replacements ONLY to detected positions (not all occurrences)
    console.time('Apply Replacements');
    let replacementCount = 0;

    // DEBUG: Log all replacements
    if (replacementMap.size > 0) {
      console.log(
        '[SafeSnap Debug] Replacement map:',
        Array.from(replacementMap.entries()).map(([key, val]) => ({
          key,
          original: key.substring(key.indexOf(':') + 1),
          replacement: val,
        }))
      );
    }

    // Group entities by their text node for efficient processing
    // IMPORTANT: Skip entities that span multiple nodes - they will be handled separately
    const entitiesByNode = new Map();
    const crossNodeEntities = []; // Entities that span multiple nodes

    for (const entity of entities) {
      if (!entity.node) {
        console.warn('[SafeSnap] Entity without node reference:', entity);
        continue;
      }

      // Check if entity spans beyond its node (cross-node entity)
      if (entity.spansMultipleNodes || entity.end > entity.nodeText.length) {
        console.log('[SafeSnap Debug] Skipping cross-node entity:', {
          original: entity.original,
          type: entity.type,
          nodeTextLength: entity.nodeText.length,
          entityEnd: entity.end,
        });
        crossNodeEntities.push(entity);
        continue; // Skip for now - cross-node replacements are complex
      }

      if (!entitiesByNode.has(entity.node)) {
        entitiesByNode.set(entity.node, []);
      }
      entitiesByNode.get(entity.node).push(entity);
    }

    // Handle cross-node entities by finding their parent container and doing a global replace
    if (crossNodeEntities.length > 0) {
      console.log(
        '[SafeSnap] Processing cross-node entities:',
        crossNodeEntities.map((e) => `${e.type}:${e.original}`)
      );

      for (const entity of crossNodeEntities) {
        const { original, type } = entity;
        const key = `${type}:${original}`;
        const replacement = replacementMap.get(key);

        if (!replacement) {
          console.warn('[SafeSnap] No replacement found for cross-node entity:', key);
          continue;
        }

        // Find the nearest parent element that contains this text
        // Start with the entity's first node and walk up
        let container = entity.node;
        while (container && container.parentElement) {
          // Check if parent contains the full text
          const parentText = container.parentElement.textContent || '';
          if (parentText.includes(original)) {
            container = container.parentElement;
            break;
          }
          container = container.parentElement;
        }

        if (!container) {
          console.warn('[SafeSnap] Could not find container for cross-node entity:', original);
          continue;
        }

        // Use TreeWalker to find and replace in all text nodes within container
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            // Skip script, style, and already processed nodes
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tagName = parent.tagName?.toUpperCase();
            if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        });

        // Collect all text nodes
        const textNodes = [];
        let currentNode;
        while ((currentNode = walker.nextNode())) {
          textNodes.push(currentNode);
        }

        // Try to find and replace the entity text across nodes
        // Simple approach: look for the pattern in concatenated text and replace node by node
        const fullText = textNodes.map((n) => n.textContent).join(' ');
        const index = fullText.indexOf(original);

        if (index !== -1) {
          // Found it - now figure out which nodes contain it
          let charCount = 0;
          let startNodeIndex = -1;
          let endNodeIndex = -1;
          let startOffset = 0;
          let endOffset = 0;

          for (let i = 0; i < textNodes.length; i++) {
            const nodeText = textNodes[i].textContent;
            const nodeLength = nodeText.length;

            if (charCount <= index && index < charCount + nodeLength) {
              startNodeIndex = i;
              startOffset = index - charCount;
            }

            if (
              charCount < index + original.length &&
              index + original.length <= charCount + nodeLength
            ) {
              endNodeIndex = i;
              endOffset = index + original.length - charCount;
              break;
            }

            charCount += nodeLength + 1; // +1 for space separator
          }

          if (startNodeIndex !== -1 && endNodeIndex !== -1) {
            // Case 1: Entity is within a single node
            if (startNodeIndex === endNodeIndex) {
              const node = textNodes[startNodeIndex];
              const text = node.textContent;
              node.textContent =
                text.substring(0, startOffset) + replacement + text.substring(endOffset);
              replacementCount++;
              console.log('[SafeSnap Debug] Replaced cross-node entity (single node):', {
                original,
                replacement,
                node: node.parentElement?.tagName,
              });
            }
            // Case 2: Entity spans multiple nodes - more complex
            else {
              console.log('[SafeSnap Debug] Cross-node entity spans multiple text nodes:', {
                original,
                startNode: startNodeIndex,
                endNode: endNodeIndex,
                nodeCount: endNodeIndex - startNodeIndex + 1,
              });
              // For now, skip multi-text-node entities (complex to handle correctly)
              // These are rare in practice (would require word split across elements)
            }
          }
        }
      }
    }

    // Process each node that has detected entities
    for (const [node, nodeEntities] of entitiesByNode.entries()) {
      // Store original content before any modification
      if (!originalContent.has(node)) {
        originalContent.set(node, node.textContent);
      }

      // DEBUG: Log which entities we're processing for this node
      console.log('[SafeSnap Debug] Processing node:', {
        nodeText: node.textContent.substring(0, 100),
        entityCount: nodeEntities.length,
        entities: nodeEntities.map((e) => ({
          type: e.type,
          original: e.original,
          start: e.start,
          end: e.end,
        })),
      });

      // Sort entities by position (descending) to replace from end to beginning
      // This prevents position shifts from affecting subsequent replacements
      const sorted = nodeEntities.sort((a, b) => b.start - a.start);

      let nodeText = node.textContent;
      const nodeTextBefore = nodeText;

      // Apply replacements in reverse order (end to beginning)
      for (const entity of sorted) {
        const { original, type, start, end } = entity;
        const key = `${type}:${original}`;
        const replacement = replacementMap.get(key);

        if (!replacement) {
          console.warn('[SafeSnap] No replacement found for:', key);
          continue;
        }

        // Safety check: ensure positions are within node bounds
        if (start < 0 || end > nodeText.length || start >= end) {
          console.warn('[SafeSnap] Invalid position for entity:', {
            original,
            start,
            end,
            nodeTextLength: nodeText.length,
            node: node.parentElement?.tagName || 'unknown',
          });
          continue;
        }

        // Extract the text at the exact position to verify it matches
        const actualText = nodeText.substring(start, end);

        if (actualText !== original) {
          console.warn('[SafeSnap] Text mismatch at position:', {
            expected: original,
            actual: actualText,
            position: `${start}-${end}`,
            node: node.parentElement?.tagName || 'unknown',
          });
          continue;
        }

        // Replace only this specific occurrence at this position
        nodeText = nodeText.substring(0, start) + replacement + nodeText.substring(end);
        replacementCount++;

        // DEBUG: Log each replacement
        console.log('[SafeSnap Debug] Text replacement:', {
          node: node.parentElement?.tagName || 'unknown',
          before: nodeTextBefore,
          after: nodeText,
          position: `${start}-${end}`,
          original: original,
          replacement: replacement,
        });
      }

      // Update the node's text content if any replacements were made
      if (nodeText !== nodeTextBefore) {
        node.textContent = nodeText;
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
