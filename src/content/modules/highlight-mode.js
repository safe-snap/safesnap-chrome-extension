/**
 * Highlight Mode Module
 * Handles visual highlighting of PII detection candidates for debugging/transparency
 */

import { showHighlightLegend, hideNotificationPanel } from './notification-panel.js';

// State
let highlightCandidates = [];
let isHighlightModeEnabled = false;
let currentDetector = null; // Store detector reference for re-detection
let scrollThrottleTimeout = null; // Throttle timer for scroll refresh
let getOriginalValueFn = null; // Function to get original values when PII is protected
let resizeObserver = null; // ResizeObserver for layout changes
let mutationObserver = null; // MutationObserver for DOM changes
let isRendering = false; // Flag to prevent observer from triggering during our own renders
let currentVisibleTooltip = null; // Track currently visible tooltip for single-tooltip UX

/**
 * Initialize highlight mode - always starts disabled, user must enable manually
 * Note: Highlights do not persist across page loads - user must enable on each page
 */
export async function initializeHighlightMode() {
  // Always start with highlights disabled - user must enable manually on each page
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
 * @param {Object} detector - The PII detector instance
 * @param {Function} getOriginalValue - Optional function to get original value for a text node (when PII is protected)
 */
export async function enableHighlightMode(detector, getOriginalValue = null) {
  console.log('👁️ Enabling highlight mode');

  // Remove any existing overlays
  disableHighlightMode();

  // Store the function to get original values
  getOriginalValueFn = getOriginalValue;

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

  // NOTE: Do not persist to storage - highlights should not carry over to new pages
  // User must manually enable highlights on each page

  // Render highlights
  renderHighlights();

  // Show unified notification panel with legend
  showHighlightLegend();

  // Create a throttled refresh function to reuse across all events
  const throttledRefresh = (eventName) => {
    // Throttle: only re-render at most once per 100ms
    if (scrollThrottleTimeout) return;

    scrollThrottleTimeout = setTimeout(() => {
      if (isHighlightModeEnabled && highlightCandidates.length > 0) {
        console.log(`[SafeSnap] ${eventName} detected - re-rendering highlights`);
        renderHighlights();
      }
      scrollThrottleTimeout = null;
    }, 100);
  };

  // 1. Refresh highlights on scroll (already implemented, now using shared throttle)
  console.log('[SafeSnap] Adding scroll listener to refresh highlights');
  const scrollHandler = () => throttledRefresh('Scroll');
  window._safesnapScrollHandler = scrollHandler;
  window.addEventListener('scroll', scrollHandler, { passive: true });

  // 2. Refresh highlights on window resize (viewport changes, text reflow)
  console.log('[SafeSnap] Adding resize listener to refresh highlights');
  const resizeHandler = () => throttledRefresh('Resize');
  window._safesnapResizeHandler = resizeHandler;
  window.addEventListener('resize', resizeHandler, { passive: true });

  // 3. Refresh highlights on orientation change (mobile rotation)
  console.log('[SafeSnap] Adding orientation change listener to refresh highlights');
  const orientationHandler = () => throttledRefresh('Orientation change');
  window._safesnapOrientationHandler = orientationHandler;
  window.addEventListener('orientationchange', orientationHandler, { passive: true });

  // 4. Refresh highlights on font loading (web fonts changing text dimensions)
  if (document.fonts) {
    console.log('[SafeSnap] Adding font load listener to refresh highlights');
    const fontLoadHandler = () => throttledRefresh('Font loaded');
    window._safesnapFontLoadHandler = fontLoadHandler;
    document.fonts.addEventListener('loadingdone', fontLoadHandler);
  }

  // 5. Watch for DOM mutations that might move text (collapsible sections, tabs, modals, etc.)
  console.log('[SafeSnap] Setting up MutationObserver for DOM changes');
  mutationObserver = new MutationObserver((mutations) => {
    // Skip if we're currently rendering (to avoid infinite loops)
    if (isRendering) {
      console.log('[SafeSnap] Ignoring mutations - currently rendering');
      return;
    }

    // Ignore mutations from our own highlight elements
    const hasLayoutChange = mutations.some((mutation) => {
      // Skip if mutation is on our highlight overlay or its children
      const target = mutation.target;

      // Debug: Log what's causing mutations
      if (
        target.id === 'safesnap-highlight-overlay' ||
        target.closest?.('#safesnap-highlight-overlay') ||
        target.classList?.contains('safesnap-highlight') ||
        target.classList?.contains('safesnap-highlight-tooltip')
      ) {
        console.log('[SafeSnap] Ignoring mutation on highlight element:', {
          targetId: target.id,
          targetClass: target.className,
          mutationType: mutation.type,
          attributeName: mutation.attributeName,
        });
        return false;
      }

      // Only refresh if mutations affect layout (not just attributes/classes)
      const isLayoutChange =
        mutation.type === 'childList' ||
        (mutation.type === 'attributes' &&
          (mutation.attributeName === 'style' ||
            mutation.attributeName === 'class' ||
            mutation.attributeName === 'hidden'));

      if (isLayoutChange) {
        console.log('[SafeSnap] Layout change detected:', {
          targetTag: target.tagName,
          targetId: target.id,
          targetClass: target.className,
          mutationType: mutation.type,
          attributeName: mutation.attributeName,
        });
      }

      return isLayoutChange;
    });

    if (hasLayoutChange) {
      throttledRefresh('DOM mutation');
    }
  });

  // Observe the entire document for changes
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden'],
  });

  // 6. Watch for element resize (CSS transitions, animations, dynamic content)
  if (window.ResizeObserver) {
    console.log('[SafeSnap] Setting up ResizeObserver for element size changes');
    resizeObserver = new ResizeObserver(() => {
      throttledRefresh('Element resize');
    });

    // Observe body for any size changes
    resizeObserver.observe(document.body);
  }
}

/**
 * Render or re-render all highlights
 */
function renderHighlights() {
  console.log('[SafeSnap] renderHighlights() called - candidates:', highlightCandidates.length);

  // Set flag to prevent mutation observer from triggering
  isRendering = true;

  // Remove existing overlay if present
  const existingOverlay = document.getElementById('safesnap-highlight-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  if (highlightCandidates.length === 0) {
    isRendering = false;
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

  // Clear flag after rendering is complete
  // Use setTimeout to ensure DOM has settled
  setTimeout(() => {
    isRendering = false;
  }, 0);
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

    // Shared tooltip state for all boxes
    let tooltip = null;
    let hideTimer = null;

    const showTooltip = (event) => {
      if (!tooltip) return;

      // Hide any other visible tooltip first
      if (currentVisibleTooltip && currentVisibleTooltip !== tooltip) {
        currentVisibleTooltip.style.opacity = '0';
      }

      // Cancel any pending hide
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      // Reposition tooltip based on the HOVERED element (not just first box)
      // This prevents tooltips from appearing over wrong highlights
      const hoveredElement = event.currentTarget;

      // Only reposition if hovering a highlight box, not the tooltip itself
      if (hoveredElement && hoveredElement.classList.contains('safesnap-highlight')) {
        const rect = hoveredElement.getBoundingClientRect();
        const tooltipLeft = rect.left + window.scrollX + rect.width / 2;
        const tooltipTop = rect.top + window.scrollY - 8; // 8px gap above highlight

        tooltip.style.left = `${tooltipLeft}px`;
        tooltip.style.top = `${tooltipTop}px`;
      }

      tooltip.style.opacity = '1';
      tooltip.style.pointerEvents = 'auto';
      currentVisibleTooltip = tooltip;
    };

    const hideTooltip = () => {
      if (!tooltip) return;
      // Delay hiding by 500ms so users can read the tooltip
      hideTimer = setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.pointerEvents = 'none';
        if (currentVisibleTooltip === tooltip) {
          currentVisibleTooltip = null;
        }
        hideTimer = null;
      }, 500);
    };

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
        tooltip = document.createElement('div');
        tooltip.className = 'safesnap-highlight-tooltip';

        // Calculate tooltip position (above the highlight, centered horizontally)
        // Use same coordinate system as highlights: absolute positioning with scroll-adjusted coords
        const tooltipLeft = absoluteLeft + rect.width / 2;
        const tooltipTop = absoluteTop - 8; // 8px gap above highlight

        tooltip.style.cssText = `
          position: absolute;
          left: ${tooltipLeft}px;
          top: ${tooltipTop}px;
          transform: translate(-50%, -100%);
          background: #1f2937;
          color: white;
          padding: 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 1000001;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Build tooltip content based on type
        let tooltipContent;

        // Try to get the original value if PII is protected
        let displayValue = candidate.original;
        let showingOriginal = false;

        if (getOriginalValueFn && candidate.node) {
          const nodeOriginal = getOriginalValueFn(candidate.node);
          if (nodeOriginal && nodeOriginal !== candidate.node.textContent) {
            // The node has been modified (PII protected)
            // Extract the original value that corresponds to this candidate
            const start = candidate.start || 0;
            const end = candidate.end || candidate.original.length;
            const originalValue = nodeOriginal.substring(start, Math.min(end, nodeOriginal.length));

            if (originalValue && originalValue.trim()) {
              displayValue = originalValue;
              showingOriginal = true;
            }
          }
        }

        if (patternTypes.includes(type)) {
          // For pattern-based matches, show type and value
          const valueLabel = showingOriginal ? 'Original' : 'Value';
          tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 6px; color: ${borderColor};">${label} ${valueLabel}: "${displayValue}"</div>
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

          const valueLabel = showingOriginal ? 'Original' : 'Detected';
          tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 6px; color: ${borderColor};">${label} ${valueLabel}: "${displayValue}"</div>
            <div style="margin-bottom: 6px;">${statusText}</div>
            <div style="font-size: 11px; opacity: 0.9;">${breakdownText}</div>
          `;
        }

        tooltip.innerHTML = tooltipContent;

        // Append tooltip to overlay (not highlight) for proper positioning
        // But we'll still track it with the highlight's hover events
        container.appendChild(tooltip);

        // Also handle tooltip hover to keep it visible
        tooltip.addEventListener('mouseenter', showTooltip);
        tooltip.addEventListener('mouseleave', hideTooltip);
      }

      // Add hover handlers to ALL highlight boxes (not just first one)
      highlight.addEventListener('mouseenter', showTooltip);
      highlight.addEventListener('mouseleave', hideTooltip);

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

  // Remove scroll listener
  if (window._safesnapScrollHandler) {
    console.log('[SafeSnap] Removing scroll listener');
    window.removeEventListener('scroll', window._safesnapScrollHandler);
    window._safesnapScrollHandler = null;
  }

  // Remove resize listener
  if (window._safesnapResizeHandler) {
    console.log('[SafeSnap] Removing resize listener');
    window.removeEventListener('resize', window._safesnapResizeHandler);
    window._safesnapResizeHandler = null;
  }

  // Remove orientation change listener
  if (window._safesnapOrientationHandler) {
    console.log('[SafeSnap] Removing orientation change listener');
    window.removeEventListener('orientationchange', window._safesnapOrientationHandler);
    window._safesnapOrientationHandler = null;
  }

  // Remove font load listener
  if (window._safesnapFontLoadHandler && document.fonts) {
    console.log('[SafeSnap] Removing font load listener');
    document.fonts.removeEventListener('loadingdone', window._safesnapFontLoadHandler);
    window._safesnapFontLoadHandler = null;
  }

  // Disconnect MutationObserver
  if (mutationObserver) {
    console.log('[SafeSnap] Disconnecting MutationObserver');
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  // Disconnect ResizeObserver
  if (resizeObserver) {
    console.log('[SafeSnap] Disconnecting ResizeObserver');
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // Clear any pending throttle timeout
  if (scrollThrottleTimeout) {
    clearTimeout(scrollThrottleTimeout);
    scrollThrottleTimeout = null;
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
  getOriginalValueFn = null;

  // Update state
  isHighlightModeEnabled = false;
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
