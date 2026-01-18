/**
 * UI Components Module
 * Handles banners, notifications, and visual indicators
 */

import i18n from '../../i18n/en.js';
import { showProtectedModeIndicator, hideNotificationPanel } from './notification-panel.js';

/**
 * Show ephemeral status banner (for popup messages)
 */
export function showStatusBanner(message) {
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
 * Show protection banner
 */
export function showProtectionBanner(state, data = {}) {
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
  ensureAnimationStyles();

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
 * Show persistent watermark (protected mode indicator)
 */
export function showPersistentWatermark() {
  showProtectedModeIndicator();
}

/**
 * Remove persistent watermark
 */
export function removePersistentWatermark() {
  hideNotificationPanel('protected-mode');
}

/**
 * Ensure animation styles are present
 * @private
 */
function ensureAnimationStyles() {
  if (!document.getElementById('safesnap-animations')) {
    const style = document.createElement('style');
    style.id = 'safesnap-animations';
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
      @keyframes slideOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
