/**
 * Highlight Mode Module
 * Handles visual highlighting of PII detection candidates for debugging/transparency
 */

import { showHighlightLegend, hideNotificationPanel } from './notification-panel.js';

// State
let highlightCandidates = [];
let highlightRefreshInterval = null;
let isHighlightModeEnabled = false;
let currentDetector = null; // Store detector reference for re-detection

/**
 * Initialize highlight mode - check for persisted state and restore if needed
 */
export async function initializeHighlightMode() {
  const highlightState = await chrome.storage.local.get(['highlightModeEnabled']);
  if (highlightState.highlightModeEnabled === true) {
    console.log('[SafeSnap] Restoring highlight mode from storage');
    return true; // Signal that highlights should be enabled
  }
  return false;
}

/**
 * Get current highlight mode state
 */
export function isHighlightEnabled() {
  return isHighlightModeEnabled;
}

/**
 * Get enabled PII types from storage
 */
async function getEnabledPIITypes() {
  try {
    const result = await chrome.storage.sync.get(['safesnap_pii_types']);
    const piiTypes = result.safesnap_pii_types || {};

    // If no saved types, return all types as default
    if (Object.keys(piiTypes).length === 0) {
      return [
        'properNouns',
        'emails',
        'phones',
        'money',
        'quantities',
        'addresses',
        'dates',
        'urls',
        'ips',
        'creditCards',
      ];
    }

    // Return only enabled types
    const enabledTypes = [];
    for (const [type, config] of Object.entries(piiTypes)) {
      if (config.enabled) {
        enabledTypes.push(type);
      }
    }

    return enabledTypes;
  } catch (error) {
    console.error('[SafeSnap] Error getting enabled PII types:', error);
    // Return default types on error
    return [
      'properNouns',
      'emails',
      'phones',
      'money',
      'quantities',
      'addresses',
      'dates',
      'urls',
      'ips',
      'creditCards',
    ];
  }
}

/**
 * Enable highlight mode - show visual highlighting of all detection candidates
 */
export async function enableHighlightMode(detector) {
  console.log('👁️ Enabling highlight mode');

  // Remove any existing overlays
  disableHighlightMode();

  // Get enabled PII types from storage
  const enabledTypes = await getEnabledPIITypes();
  console.log('[SafeSnap] Highlighting enabled PII types:', enabledTypes);

  // Get all candidates from the detector (including those below threshold)
  const candidates = detector.detectWithDebugInfo(document.body, enabledTypes);

  if (candidates.length === 0) {
    console.log('No candidates found for highlighting');
    return;
  }

  console.log(`Found ${candidates.length} candidates for highlighting`);

  // Log first few candidates for debugging
  candidates.slice(0, 5).forEach((c) => {
    console.log(
      `Candidate: "${c.original}" - Score: ${c.confidence.toFixed(2)} - Breakdown:`,
      c.scoreBreakdown
    );
  });

  // Store candidates and detector for re-rendering
  highlightCandidates = candidates;
  currentDetector = detector;

  // Update state BEFORE rendering
  isHighlightModeEnabled = true;

  // Save state to storage for persistence
  chrome.storage.local.set({ highlightModeEnabled: true });

  // Render highlights
  renderHighlights();

  // Show unified notification panel with legend
  showHighlightLegend();

  // Refresh highlights every 1 second to keep them aligned during scrolling
  console.log('[SafeSnap] Starting highlight refresh interval (1 second)');
  highlightRefreshInterval = setInterval(() => {
    console.log(
      '[SafeSnap] Refresh tick - isEnabled:',
      isHighlightModeEnabled,
      'candidates:',
      highlightCandidates.length
    );
    if (isHighlightModeEnabled && highlightCandidates.length > 0) {
      console.log('[SafeSnap] Re-rendering highlights');
      renderHighlights();
    }
  }, 1000);
}

/**
 * Render or re-render all highlights
 */
function renderHighlights() {
  console.log('[SafeSnap] renderHighlights() called - candidates:', highlightCandidates.length);

  // Remove existing overlay if present
  const existingOverlay = document.getElementById('safesnap-highlight-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  if (highlightCandidates.length === 0) {
    return;
  }

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'safesnap-highlight-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
  `;

  // Add each candidate as a highlight
  highlightCandidates.forEach((candidate) => {
    const highlight = createHighlight(candidate);
    if (highlight) {
      overlay.appendChild(highlight);
    }
  });

  document.body.appendChild(overlay);
}

/**
 * Create a visual highlight for a detection candidate
 * Returns a document fragment containing one or more highlight boxes
 */
function createHighlight(candidate) {
  try {
    const { node, start, end, confidence, scoreBreakdown, threshold } = candidate;

    // Get the bounding rect of the text
    const range = document.createRange();
    const textNode = node;

    // Ensure the range is valid
    if (start >= textNode.textContent.length || end > textNode.textContent.length) {
      return null;
    }

    // Check if the parent element is visible
    const parentElement = textNode.parentElement;
    if (parentElement) {
      const computedStyle = window.getComputedStyle(parentElement);
      if (
        computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden' ||
        parseFloat(computedStyle.opacity) === 0
      ) {
        return null; // Skip hidden elements
      }
    }

    range.setStart(textNode, start);
    range.setEnd(textNode, end);

    // Use getClientRects() to handle multi-line text
    const rects = range.getClientRects();

    if (rects.length === 0) {
      return null; // Skip invisible elements
    }

    // Determine color and label based on type and score
    let backgroundColor, borderColor, label;
    const type = candidate.type || 'properNoun';

    // Pattern-based types (email, phone, etc.) are always protected
    const patternTypes = [
      'email',
      'phone',
      'money',
      'quantity',
      'address',
      'url',
      'creditCard',
      'date',
      'ip',
    ];
    if (patternTypes.includes(type)) {
      backgroundColor = 'rgba(59, 130, 246, 0.2)'; // Blue for pattern matches
      borderColor = '#3b82f6';
      label = type.charAt(0).toUpperCase() + type.slice(1);
    } else if (confidence >= 0.8) {
      backgroundColor = 'rgba(16, 185, 129, 0.2)'; // Green
      borderColor = '#10b981';
      label = 'Protected';
    } else if (confidence >= 0.6) {
      backgroundColor = 'rgba(245, 158, 11, 0.2)'; // Orange
      borderColor = '#f59e0b';
      label = 'Close';
    } else if (confidence >= 0.4) {
      backgroundColor = 'rgba(239, 68, 68, 0.2)'; // Red
      borderColor = '#ef4444';
      label = 'Low';
    } else {
      backgroundColor = 'rgba(156, 163, 175, 0.2)'; // Gray
      borderColor = '#9ca3af';
      label = 'Rejected';
    }

    // Create a container for all highlight boxes (for multi-line text)
    const container = document.createDocumentFragment();

    // Create a highlight box for each line
    Array.from(rects).forEach((rect, index) => {
      if (rect.width === 0 || rect.height === 0) return;

      // Calculate absolute position
      const absoluteLeft = rect.left + window.scrollX;
      const absoluteTop = rect.top + window.scrollY;

      // Skip highlights with invalid coordinates (e.g., hidden/transformed elements)
      // Valid range: -1000 to 50000 pixels (covers most reasonable page sizes)
      if (
        absoluteLeft < -1000 ||
        absoluteLeft > 50000 ||
        absoluteTop < -1000 ||
        absoluteTop > 50000 ||
        !isFinite(absoluteLeft) ||
        !isFinite(absoluteTop)
      ) {
        console.warn('[SafeSnap] Skipping highlight with invalid coordinates:', {
          text: candidate.original,
          left: absoluteLeft,
          top: absoluteTop,
          rectLeft: rect.left,
          rectTop: rect.top,
        });
        return;
      }

      const highlight = document.createElement('div');
      highlight.className = 'safesnap-highlight';
      highlight.style.cssText = `
        position: absolute;
        left: ${absoluteLeft}px;
        top: ${absoluteTop}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: ${backgroundColor};
        border: 2px solid ${borderColor};
        border-radius: 3px;
        pointer-events: auto;
        cursor: help;
        transition: all 0.2s;
      `;

      // Only add tooltip to the first box (to avoid duplicates)
      if (index === 0) {
        // Create tooltip with score breakdown
        const tooltip = document.createElement('div');
        tooltip.className = 'safesnap-highlight-tooltip';
        tooltip.style.cssText = `
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          margin-bottom: 8px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 1000000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Build tooltip content based on type
        let tooltipContent;
        if (patternTypes.includes(type)) {
          // For pattern-based matches, show type and value
          tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 6px; color: ${borderColor};">${label}: "${candidate.original}"</div>
            <div style="margin-bottom: 6px;">Type: ${label}</div>
            <div style="font-size: 11px; opacity: 0.9;">Pattern Match (Always Protected)</div>
          `;
        } else {
          // For proper nouns, show detailed scoring breakdown
          const breakdownText = Object.entries(scoreBreakdown)
            .filter(([key]) => !key.endsWith('_detail'))
            .map(([key, value]) => {
              const detail = scoreBreakdown[`${key}_detail`];
              const displayKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase());
              return `${displayKey}: ${typeof value === 'number' ? value.toFixed(1) : value}${detail ? ` (${detail})` : ''}`;
            })
            .join('<br>');

          // Determine protection status
          const isProtected = confidence >= threshold;
          const statusText = isProtected
            ? `Score: ${confidence.toFixed(2)} (Protected)`
            : `Score: ${confidence.toFixed(2)} (Needs ${threshold} to protect)`;

          tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 6px; color: ${borderColor};">${label}: "${candidate.original}"</div>
            <div style="margin-bottom: 6px;">${statusText}</div>
            <div style="font-size: 11px; opacity: 0.9;">${breakdownText}</div>
          `;
        }

        tooltip.innerHTML = tooltipContent;

        highlight.appendChild(tooltip);

        // Show/hide tooltip on hover
        highlight.addEventListener('mouseenter', () => {
          tooltip.style.opacity = '1';
        });

        highlight.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
        });
      }

      container.appendChild(highlight);
    });

    return container;
  } catch (error) {
    console.error('Error creating highlight:', error);
    return null;
  }
}

// addHighlightLegend() function removed - now using unified notification panel

/**
 * Disable highlight mode - remove all highlights
 */
export function disableHighlightMode() {
  console.log('👁️ Disabling highlight mode');

  // Clear refresh interval
  if (highlightRefreshInterval) {
    console.log('[SafeSnap] Clearing highlight refresh interval');
    clearInterval(highlightRefreshInterval);
    highlightRefreshInterval = null;
  } else {
    console.log('[SafeSnap] No interval to clear');
  }

  const overlay = document.getElementById('safesnap-highlight-overlay');
  if (overlay) {
    overlay.remove();
  }

  // Hide unified notification panel
  hideNotificationPanel('highlight-legend');

  // Clear stored candidates and detector
  highlightCandidates = [];
  currentDetector = null;

  // Update state
  isHighlightModeEnabled = false;

  // Save state to storage
  chrome.storage.local.set({ highlightModeEnabled: false });
}

/**
 * Refresh highlights with current enabled PII types
 * Called when user changes PII type selections
 */
export async function refreshHighlightsWithSettings() {
  console.log('[SafeSnap] Refreshing highlights with updated settings');

  if (!isHighlightModeEnabled || !currentDetector) {
    console.log('[SafeSnap] Highlights not enabled or no detector available');
    return;
  }

  // Re-detect with current enabled types
  const enabledTypes = await getEnabledPIITypes();
  console.log('[SafeSnap] Re-detecting with enabled types:', enabledTypes);

  const candidates = currentDetector.detectWithDebugInfo(document.body, enabledTypes);
  console.log(`[SafeSnap] Found ${candidates.length} candidates after settings update`);

  // Update stored candidates
  highlightCandidates = candidates;

  // Re-render highlights
  renderHighlights();
}

// Backwards compatibility aliases
export function enableDebugMode(detector) {
  enableHighlightMode(detector);
}

export function disableDebugMode() {
  disableHighlightMode();
}
