/**
 * SafeSnap - Centralized Application Configuration
 *
 * This file contains all centralized configuration for the SafeSnap extension.
 * It serves as the single source of truth for app name, version, defaults, and constants.
 */

export const APP_CONFIG = {
  // Application Identity
  name: 'SafeSnap',
  version: '1.0.0',

  // Feature Flags
  features: {
    enableSmartDictionaryDownload: true,
    enableCustomRegex: true,
    enableFormInputProtection: true,
    enableBannerCustomization: true,
    enableExportImportSettings: false, // Phase 3
  },

  // Default Settings
  defaults: {
    // PII Types
    enabledPIITypes: ['properNouns', 'money', 'quantities'],
    allPIITypes: [
      'properNouns',
      'money',
      'quantities',
      'emails',
      'phones',
      'addresses',
      'dates',
      'urls',
      'ips',
      'creditCards',
      'customRegex',
    ],

    // Banner Settings
    bannerPosition: 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-bar' | 'bottom-bar'
    bannerOpacity: 100, // 0-100
    bannerSize: 'medium', // 'compact' | 'medium' | 'large' | 'bar'
    fadeDistance: 100, // pixels, 50-150
    fadeOpacity: 20, // target opacity when faded (%)
    fadeScale: 50, // target scale when faded (%)

    // Environment Colors
    environmentColors: {
      PROD: '#EF4444', // red
      DEV: '#3B82F6', // blue
      STAGING: '#F59E0B', // orange
      LOCAL: '#10B981', // green
    },

    // Environment Text (customizable)
    environmentText: {
      PROD: '⚠️ PRODUCTION',
      DEV: '🔧 DEVELOPMENT',
      STAGING: '🚀 STAGING',
      LOCAL: '🏠 LOCAL',
    },

    // Replacement Settings
    magnitudeVariance: 30, // ±30% for money and quantities
    dateVarianceMonths: 2, // ±2 months for dates
    redactionMode: 'random', // 'random' = replace with fake data | 'blackout' = black bars like legal docs

    // Dictionary Settings
    usageCountForDictionaryPrompt: 5, // Show download prompt after N uses
    dictionaryPromptShown: false,
    fullDictionaryDownloaded: false,

    // Performance
    progressIndicatorThreshold: 500, // ms - show progress if processing takes longer

    // UI
    showToastNotifications: true,
    toastDuration: 3000, // ms
  },

  // Environment Detection Patterns
  environmentPatterns: {
    PROD: /\.(prod|production)($|\/|:)/i,
    DEV: /\.(dev|development)($|\/|:)/i,
    STAGING: /\.(staging|stg|stage)($|\/|:)/i,
    LOCAL: /\.(local|loc)($|\/|:|localhost|127\.0\.0\.1|192\.168\.|10\.0\.)/i,
  },

  // PII Pattern Regex (basic patterns - extended in pattern-matcher.js)
  piiPatterns: {
    email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    phone: /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
    money: /[$€£¥]\s?\d{1,3}(,\d{3})*(\.\d{2})?\b/g,
    url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    ipv4: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  },

  // Dictionary Configuration
  dictionary: {
    coreSize: 20000,
    fullSize: 80000,
    coreFile: 'assets/dictionaries/core-20k.json',
    fullFile: 'assets/dictionaries/full-80k.json',
    downloadURL: null, // Future: CDN URL for dictionary download
  },

  // Proper Noun Detection Configuration
  properNounDetection: {
    // Minimum score required to protect a proper noun (0-1 scale)
    minimumScore: 0.8,

    // Signal weights for scoring system
    weights: {
      capitalizationPattern: 0.3, // Has capital letters (baseline)
      unknownInDictionary: 0.3, // Majority of words not in common dictionary
      hasHonorificOrSuffix: 0.4, // Mr/Mrs/Dr/Prof OR Inc/Corp/LLC/Ltd
      multiWord: 0.2, // 2+ words (e.g., "John Doe")
      notSentenceStart: 0.1, // Not at beginning of sentence
      nearOtherPII: 0.2, // Within window of email/phone
    },

    // Window size (in characters) to check for nearby PII context
    // Adjust based on language - languages with longer words may need larger window
    nearbyPIIWindowSize: 50,

    // Enable debug mode highlighting (can be toggled in settings)
    debugMode: false,
  },

  // Replacement Pools Sizes
  pools: {
    personNames: 100,
    companyNames: 100,
    streetNames: 50,
    cities: 50,
    domains: 50,
  },

  // HTML Elements to Skip (labels, headings, etc.)
  skipElements: ['LABEL', 'TH', 'DT', 'BUTTON', 'A'],

  // HTML Attributes that indicate labels
  skipAttributes: ['role', 'aria-label', 'aria-labelledby', 'for'],

  // Form Input Types to Protect
  formInputTypes: [
    'text',
    'textarea',
    'email',
    'tel',
    'url',
    'search',
    'number',
    'date',
    'time',
    'datetime-local',
    'month',
    'week',
    'select',
  ],

  // Storage Keys
  storageKeys: {
    settings: 'safesnap_settings',
    usageCount: 'safesnap_usage_count',
    consistencyMap: 'safesnap_consistency_map',
    customPatterns: 'safesnap_custom_patterns',
    customEnvironments: 'safesnap_custom_environments',
    dictionaryCache: 'safesnap_dictionary_cache',
  },

  // Message Types (for chrome.runtime.sendMessage)
  messageTypes: {
    PROTECT_PII: 'protect_pii',
    RESTORE_ORIGINAL: 'restore_original',
    TAKE_SCREENSHOT: 'take_screenshot',
    COPY_TO_CLIPBOARD: 'copy_to_clipboard',
    UPDATE_BANNER: 'update_banner',
    GET_ENVIRONMENT: 'get_environment',
    GET_STATUS: 'get_status',
    LOAD_DICTIONARY: 'load_dictionary',
    DOWNLOAD_DICTIONARY: 'download_dictionary',
  },

  // Status Values
  status: {
    READY: 'ready',
    LOADING: 'loading',
    PROTECTED: 'protected',
    ERROR: 'error',
    PROCESSING: 'processing',
  },

  // Error Messages
  errors: {
    DETECTION_FAILED: 'PII detection failed',
    REPLACEMENT_FAILED: 'PII replacement failed',
    SCREENSHOT_FAILED: 'Screenshot capture failed',
    DICTIONARY_LOAD_FAILED: 'Dictionary load failed',
    PATTERN_INVALID: 'Invalid regex pattern',
    STORAGE_ERROR: 'Storage operation failed',
  },

  // Success Messages
  messages: {
    PII_PROTECTED: 'PII protected successfully',
    ORIGINAL_RESTORED: 'Original content restored',
    SCREENSHOT_CAPTURED: 'Screenshot captured',
    COPIED_TO_CLIPBOARD: 'Copied to clipboard',
    SETTINGS_SAVED: 'Settings saved',
    DICTIONARY_DOWNLOADED: 'Dictionary downloaded successfully',
  },
};

// Freeze the config to prevent accidental modifications
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.defaults);
Object.freeze(APP_CONFIG.features);
Object.freeze(APP_CONFIG.environmentPatterns);
Object.freeze(APP_CONFIG.piiPatterns);
Object.freeze(APP_CONFIG.dictionary);
Object.freeze(APP_CONFIG.pools);
Object.freeze(APP_CONFIG.storageKeys);
Object.freeze(APP_CONFIG.messageTypes);
Object.freeze(APP_CONFIG.status);
Object.freeze(APP_CONFIG.errors);
Object.freeze(APP_CONFIG.messages);

export default APP_CONFIG;
