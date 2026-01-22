/**
 * Settings Module
 * Handles loading and retrieving user settings
 */

import { APP_CONFIG } from '../../../config/app-config.js';

let userSettings = {};

/**
 * Check if running in Chrome extension context
 */
function isExtensionContext() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
}

/**
 * Load user settings from storage
 */
export async function loadSettings() {
  // Skip storage access if not in extension context (e.g., E2E tests)
  if (!isExtensionContext()) {
    userSettings = {};
    return;
  }
  try {
    const result = await chrome.storage.sync.get([APP_CONFIG.storageKeys.settings]);
    userSettings = result[APP_CONFIG.storageKeys.settings] || {};
    console.log('Loaded user settings:', userSettings);
  } catch (error) {
    console.error('Error loading settings:', error);
    userSettings = {};
  }
}

/**
 * Get setting value with fallback to default
 */
export function getSetting(key) {
  return userSettings[key] !== undefined ? userSettings[key] : APP_CONFIG.defaults[key];
}

/**
 * Set a setting value programmatically (useful for E2E tests)
 */
export function setSetting(key, value) {
  userSettings[key] = value;
}

/**
 * Get banner position styles based on position setting
 */
export function getBannerPositionStyles(position) {
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
      return 'top: 0; left: 0; right: 0; max-width: 100%; border-radius: 0;';
    case 'bottom-bar':
      return 'bottom: 0; left: 0; right: 0; max-width: 100%; border-radius: 0;';
    default:
      return 'top: 20px; right: 20px;';
  }
}
