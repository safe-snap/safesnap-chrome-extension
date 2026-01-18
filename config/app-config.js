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
      'locations',
      'customRegex',
    ],

    // Banner Settings
    bannerPosition: 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-bar' | 'bottom-bar'
    bannerOpacity: 100, // 0-100
    bannerSize: 'medium', // 'compact' | 'medium' | 'large' | 'bar'
    fadeDistance: 100, // pixels, 50-150
    fadeOpacity: 20, // target opacity when faded (%)
    fadeScale: 50, // target scale when faded (%)

    // Replacement Settings
    magnitudeVariance: 100, // ±100% for money and quantities (2x variance: value can range from 0 to 2x original)
    dateVarianceMonths: 2, // ±2 months for dates
    redactionMode: 'random', // 'random' = replace with fake data | 'blackout' = black bars like legal docs

    // Performance
    progressIndicatorThreshold: 500, // ms - show progress if processing takes longer

    // UI
    showToastNotifications: true,
    toastDuration: 3000, // ms
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

  // Proper Noun Detection Configuration
  properNounDetection: {
    // Minimum score required to protect a proper noun (0-1 scale)
    // Lowered from 0.8 to 0.75 to catch more single-word brands while
    // maintaining precision with department filtering
    minimumScore: 0.75,

    // Signal weights for scoring system
    weights: {
      capitalizationPattern: 0.3, // Has capital letters (baseline)
      unknownInDictionary: 0.35, // Majority of words not in common dictionary (increased from 0.3)
      hasHonorificOrSuffix: 0.45, // Mr/Mrs/Dr/Prof OR Inc/Corp/LLC/Ltd (increased from 0.4)
      multiWord: 0.2, // 2+ words (e.g., "John Doe")
      notSentenceStart: 0.15, // Not at beginning of sentence (increased from 0.1)
      nearOtherPII: 0.25, // Within window of email/phone (increased from 0.2)
      matchesEmailDomain: 0.3, // Matches company name from nearby email domain
      insideLink: 0.25, // Text is inside an <a> tag (author bylines, profile links, company links)
      knownLocation: 0.5, // Matches known location in gazetteer (New York, Delaware, Paris, etc.)
      appearsInPageLinks: 0.3, // Word appears in link text anywhere on page (positive signal)
      appearsInHeaderFooter: -0.5, // Word appears in header/footer elements (negative signal - likely UI/nav text)
      nonNounPOS: -0.5, // Adjective filtering using curated lists (nationality + common adjectives)
    },

    // Window size (in characters) to check for nearby PII context
    // User can configure this in Advanced Settings
    nearbyPIIWindowSize: {
      default: 50,
      min: 10,
      max: 100,
    },

    // Enable debug mode highlighting (can be toggled in settings)
    debugMode: false,

    // Type priority system for conflict resolution
    // When multiple PII types overlap (e.g., "17" in "Jan 17, 2026"),
    // higher priority types win. Displayed in Settings (read-only).
    typePriorities: {
      // Structured data (highest priority - most precise)
      date: 90,
      email: 85,
      phone: 80,
      ssn: 80,
      creditCard: 80,

      // Numeric data (medium-high priority)
      money: 70,
      quantity: 60,

      // Text data (medium priority)
      address: 50,
      url: 40,

      // Geographic/fuzzy (low priority)
      location: 30,

      // Proper nouns (lowest priority - most ambiguous)
      properNoun: 10,
    },
  },

  // Replacement Pools Sizes
  pools: {
    personNames: 100,
    companyNames: 100,
    streetNames: 50,
    cities: 50,
    domains: 50,
  },

  // HTML Elements to Skip (structural elements that typically contain UI text, not user data)
  // Used by both detectInDOM (replacement) and detectWithDebugInfo (highlighting)
  // Note: 'A' (links) are NOT skipped - author names and profile links are legitimate PII
  skipElements: {
    // Always skip these tags (contain structural/UI text, not user data)
    common: ['LABEL', 'TH', 'DT', 'BUTTON'],

    // Skip during replacement (detectInDOM) - includes formatting and semantic elements
    replacement: [
      'H1', // Skip H1 (usually page title/site branding)
      // H2-H6 NOT skipped - article subheadings often contain author names and other PII
      'STRONG',
      'B',
      'EM',
      'I', // Formatting
      'NAV',
      'HEADER',
      'FOOTER',
      'ASIDE',
      'TITLE', // Structural
    ],

    // Skip during highlighting (detectWithDebugInfo) - only truly structural elements
    debug: [
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
      'IFRAME',
      'SVG', // Non-text content
    ],
  },

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

    dictionaryCache: 'safesnap_dictionary_cache',
  },

  // Message Types (for chrome.runtime.sendMessage)
  messageTypes: {
    PROTECT_PII: 'protect_pii',
    RESTORE_ORIGINAL: 'restore_original',
    TAKE_SCREENSHOT: 'take_screenshot',
    COPY_TO_CLIPBOARD: 'copy_to_clipboard',
    UPDATE_BANNER: 'update_banner',

    GET_STATUS: 'get_status',
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
  },
};

// Freeze the config to prevent accidental modifications
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.defaults);
Object.freeze(APP_CONFIG.features);

Object.freeze(APP_CONFIG.piiPatterns);
Object.freeze(APP_CONFIG.pools);
Object.freeze(APP_CONFIG.storageKeys);
Object.freeze(APP_CONFIG.messageTypes);
Object.freeze(APP_CONFIG.status);
Object.freeze(APP_CONFIG.errors);
Object.freeze(APP_CONFIG.messages);

export default APP_CONFIG;
