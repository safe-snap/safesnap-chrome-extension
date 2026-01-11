/**
 * Settings Module
 * Handles loading and retrieving user settings
 */

import { APP_CONFIG } from '../../../config/app-config.js';

let userSettings = {};

/**
 * Load user settings from storage
 */
export async function loadSettings() {
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

/**
 * Detect environment from URL
 */
export function detectEnvironment() {
  const url = window.location.href;

  // Use patterns from config
  for (const [env, pattern] of Object.entries(APP_CONFIG.environmentPatterns)) {
    if (pattern.test(url)) {
      return env;
    }
  }

  // Return null if no pattern matches (will show as "Not detected")
  return null;
}
