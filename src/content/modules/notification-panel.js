/**
 * Unified Notification Panel Module
 * Provides a single, reusable UI component for displaying notifications, legends, and status indicators
 * Automatically fades when mouse approaches (no close button needed)
 */

import i18n from '../../i18n/en.js';

// Active panels registry
const activePanels = new Map();

/**
 * Get position styles based on banner position setting
 */
function getPositionStyles(position) {
  switch (position) {
    case 'top-left':
      return 'top: 20px; left: 20px;';
    case 'top-right':
      return 'top: 20px; right: 20px;';
    case 'bottom-left':
      return 'bottom: 20px; left: 20px;';
    case 'bottom-right':
      return 'bottom: 20px; right: 20px;';
    case 'top-bar':
      return 'top: 0; left: 50%; transform: translateX(-50%);';
    case 'bottom-bar':
      return 'bottom: 0; left: 50%; transform: translateX(-50%);';
    default:
      return 'top: 20px; right: 20px;'; // Default to top-right
  }
}

/**
 * Get banner position from settings
 */
async function getBannerPosition() {
  try {
    const result = await chrome.storage.sync.get(['safesnap_settings']);
    const settings = result.safesnap_settings || {};
    return settings.bannerPosition || 'top-right';
  } catch (error) {
    console.error('[SafeSnap] Error getting banner position:', error);
    return 'top-right';
  }
}

/**
 * Get fade distance from settings
 */
async function getFadeDistance() {
  try {
    const result = await chrome.storage.sync.get(['safesnap_settings']);
    const settings = result.safesnap_settings || {};
    return settings.fadeDistance || 150;
  } catch (error) {
    console.error('[SafeSnap] Error getting fade distance:', error);
    return 150;
  }
}

/**
 * Create or update a notification panel
 * @param {Object} options - Panel configuration
 * @param {string} options.id - Unique identifier for this panel
 * @param {string} options.type - Panel type: 'legend', 'status', 'info'
 * @param {string} options.content - HTML content to display
 * @param {string} [options.position] - Position override (or uses user's banner position setting)
 * @param {boolean} [options.persistent] - If true, panel stays until manually removed
 * @param {number} [options.autoHideMs] - Auto-hide after this many milliseconds (for non-persistent panels)
 * @param {Object} [options.style] - Additional CSS styles as object
 * @returns {HTMLElement} The panel element
 */
export async function showNotificationPanel(options) {
  const {
    id,
    type = 'info',
    content,
    position: positionOverride,
    persistent = false,
    autoHideMs = 0,
    style = {},
  } = options;

  // Remove existing panel with same ID
  hideNotificationPanel(id);

  // Get position from settings or use override
  const bannerPosition = positionOverride || (await getBannerPosition());
  const positionStyles = getPositionStyles(bannerPosition);
  const fadeDistance = await getFadeDistance();

  // Create panel element
  const panel = document.createElement('div');
  panel.id = `safesnap-notification-${id}`;
  panel.className = 'safesnap-notification-panel';
  panel.dataset.type = type;

  // Base styles
  const baseStyles = {
    position: 'fixed',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: '1000000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    pointerEvents: 'auto',
    opacity: '1',
    transition: 'opacity 0.3s ease',
    ...style,
  };

  // Apply position styles
  panel.style.cssText = Object.entries(baseStyles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');

  // Add position from settings
  const positionParts = positionStyles.split(';').filter((p) => p.trim());
  positionParts.forEach((part) => {
    const [prop, value] = part.split(':').map((s) => s.trim());
    if (prop && value) {
      panel.style[prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = value;
    }
  });

  // Set content
  panel.innerHTML = content;

  // Add to DOM
  document.body.appendChild(panel);

  // Setup fade-on-proximity behavior
  const fadeHandler = (e) => {
    const rect = panel.getBoundingClientRect();

    // Calculate distance from cursor to nearest edge of panel
    const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
    const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
    const distance = Math.sqrt(dx * dx + dy * dy);

    const invisibleRadius = 20; // Fully invisible within 20px from edge

    if (distance < invisibleRadius) {
      panel.style.opacity = '0';
      panel.style.pointerEvents = 'none'; // Disable interactions when faded
    } else if (distance < fadeDistance) {
      // Fade from 0 to 1 between invisibleRadius and fadeDistance
      const opacity = (distance - invisibleRadius) / (fadeDistance - invisibleRadius);
      panel.style.opacity = opacity;
      panel.style.pointerEvents = 'auto';
    } else {
      panel.style.opacity = '1';
      panel.style.pointerEvents = 'auto';
    }
  };

  // Store handler for cleanup
  panel._fadeHandler = fadeHandler;
  document.addEventListener('mousemove', fadeHandler);

  // Store panel reference
  activePanels.set(id, panel);

  // Setup auto-hide if specified
  if (!persistent && autoHideMs > 0) {
    setTimeout(() => {
      hideNotificationPanel(id);
    }, autoHideMs);
  }

  return panel;
}

/**
 * Hide and remove a notification panel
 * @param {string} id - Panel ID to remove
 */
export function hideNotificationPanel(id) {
  const panel = activePanels.get(id);

  if (panel) {
    // Remove event listener
    if (panel._fadeHandler) {
      document.removeEventListener('mousemove', panel._fadeHandler);
    }

    // Animate out
    panel.style.animation = 'safesnap-fade-out 0.3s ease-out';
    setTimeout(() => {
      if (panel.parentNode) {
        panel.remove();
      }
    }, 300);

    activePanels.delete(id);
  }
}

/**
 * Hide all notification panels
 */
export function hideAllNotificationPanels() {
  for (const id of activePanels.keys()) {
    hideNotificationPanel(id);
  }
}

/**
 * Refresh positions of all active panels (called when banner position setting changes)
 */
export async function refreshAllPanelPositions() {
  const bannerPosition = await getBannerPosition();
  const positionStyles = getPositionStyles(bannerPosition);

  console.log('[SafeSnap] Refreshing panel positions to:', bannerPosition);

  for (const [id, panel] of activePanels.entries()) {
    // Clear existing position styles
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.left = '';
    panel.style.transform = '';

    // Apply new position
    const positionParts = positionStyles.split(';').filter((p) => p.trim());
    positionParts.forEach((part) => {
      const [prop, value] = part.split(':').map((s) => s.trim());
      if (prop && value) {
        panel.style[prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = value;
      }
    });

    console.log('[SafeSnap] Updated panel position:', id, positionStyles);
  }
}

/**
 * Show the highlight legend (used when highlight mode is enabled)
 */
export async function showHighlightLegend() {
  const content = `
    <div style="font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
      👁️ ${i18n.highlightLegendTitle}
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; background: rgba(59, 130, 246, 0.4); border: 2px solid #3b82f6; border-radius: 3px;"></div>
        <span><strong>Blue:</strong> Pattern Match (Email, Phone, etc.)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; background: rgba(16, 185, 129, 0.4); border: 2px solid #10b981; border-radius: 3px;"></div>
        <span><strong>Green:</strong> ${i18n.highlightLegendGreen}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; background: rgba(245, 158, 11, 0.4); border: 2px solid #f59e0b; border-radius: 3px;"></div>
        <span><strong>Orange:</strong> ${i18n.highlightLegendOrange}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; background: rgba(239, 68, 68, 0.4); border: 2px solid #ef4444; border-radius: 3px;"></div>
        <span><strong>Red:</strong> ${i18n.highlightLegendRed}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 16px; height: 16px; background: rgba(156, 163, 175, 0.4); border: 2px solid #9ca3af; border-radius: 3px;"></div>
        <span><strong>Gray:</strong> ${i18n.highlightLegendGray}</span>
      </div>
    </div>
    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">
      ${i18n.highlightLegendHoverHint}
    </div>
  `;

  return showNotificationPanel({
    id: 'highlight-legend',
    type: 'legend',
    content,
    persistent: true,
  });
}

/**
 * Show the protected mode watermark (used when content is protected)
 */
export async function showProtectedModeIndicator() {
  const content = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">${i18n.emojiLock}</span>
      <span style="font-weight: 700;">${i18n.watermarkProtectedMode}</span>
    </div>
  `;

  return showNotificationPanel({
    id: 'protected-mode',
    type: 'status',
    content,
    persistent: true,
    style: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      padding: '12px 20px',
      border: 'none',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    },
  });
}

/**
 * Add CSS animations if not already present
 */
function injectAnimations() {
  if (document.getElementById('safesnap-notification-animations')) {
    return; // Already injected
  }

  const style = document.createElement('style');
  style.id = 'safesnap-notification-animations';
  style.textContent = `
    @keyframes safesnap-fade-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
  `;
  document.head.appendChild(style);
}

// Inject animations on module load
if (typeof document !== 'undefined') {
  injectAnimations();
}
