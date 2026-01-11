// SafeSnap - English Language Strings (Default)
// This file contains all user-facing text for easy translation

export const en = {
  // Extension name
  appName: 'SafeSnap',
  appLogoAlt: 'SafeSnap Logo',

  // Tabs
  tabProtect: 'Protect',
  tabSettings: 'Settings',
  tabAbout: 'About',

  // Popup - PII Type Labels
  piiTypeProperNouns: 'Proper Nouns',
  piiTypeProperNounsDesc: 'Names and companies',
  piiTypeMoney: 'Money',
  piiTypeMoneyDesc: 'Currency amounts like $1,234.56',
  piiTypeQuantities: 'Quantities',
  piiTypeQuantitiesDesc: 'Numeric quantities with units like 150 kg',
  piiTypeEmails: 'Emails',
  piiTypeEmailsDesc: 'Email addresses like john@example.com',
  piiTypePhones: 'Phones',
  piiTypePhonesDesc: 'Phone numbers in various formats',
  piiTypeAddresses: 'Addresses',
  piiTypeAddressesDesc: 'Physical addresses with street numbers',
  piiTypeDates: 'Dates',
  piiTypeDatesDesc: 'Various date formats',
  piiTypeUrls: 'URLs',
  piiTypeUrlsDesc: 'Web addresses like https://example.com',
  piiTypeIps: 'IPs',
  piiTypeIpsDesc: 'IPv4 and IPv6 addresses',

  // Popup - Buttons
  btnProtectPii: 'Protect PII',
  btnRestoreOriginal: 'Restore Original',
  btnTakeScreenshot: 'Take Screenshot',
  btnCopyToClipboard: 'Copy to Clipboard',
  btnCopied: 'Copied!',
  btnAdvancedSettings: 'Advanced Settings',
  btnHighlightDetections: 'Highlight Detections',
  btnRemoveHighlights: 'Remove Highlights',

  // Popup - Headings
  headingSelectPii: 'Select PII to Protect:',
  headingSettings: 'Settings',
  headingAboutSafesnap: 'About SafeSnap',

  // Popup - Settings Labels
  labelBannerPosition: 'Banner Position',
  labelFadeDistance: 'Fade Distance (px)',
  labelMagnitudeVariance: 'Magnitude Variance (%)',
  labelRedactionMode: 'Redaction Mode',

  // Popup - Banner Position Options
  positionTopLeft: 'Top Left',
  positionTopRight: 'Top Right',
  positionBottomLeft: 'Bottom Left',
  positionBottomRight: 'Bottom Right',
  positionTopBar: 'Top Bar',
  positionBottomBar: 'Bottom Bar',

  // Redaction Mode Options
  redactionModeRandom: 'Random Data',
  redactionModeRandomDesc: 'Replace with realistic fake data (e.g., John → Jane)',
  redactionModeBlackout: 'Blackout',
  redactionModeBlackoutDesc: 'Cover with black bars like legal documents',

  // Popup - Environment Status
  environmentLabel: 'Environment:',
  environmentNotDetected: 'Not detected',
  environmentDetecting: 'Detecting...',
  environmentProduction: 'PRODUCTION',
  environmentDevelopment: 'DEVELOPMENT',
  environmentStaging: 'STAGING',
  environmentLocal: 'LOCAL',

  // Popup - About Info
  aboutVersion: 'Version:',
  aboutDescription:
    'SafeSnap helps you take screenshots while protecting personally identifiable information (PII).',

  // Popup - Units
  unitPixels: 'pixels',
  unitPercent: '%',
  unitPlusMinus: '±',

  // Settings Page - Headings
  settingsPageTitle: 'SafeSnap Settings',
  settingsPageSubtitle: 'Configure your PII protection preferences',
  settingsDefaultPiiTypes: 'Default PII Types to Protect',
  settingsEnvironmentPatterns: 'Environment Detection Patterns',
  settingsBannerCustomization: 'Banner Customization',
  settingsCustomRegexPatterns: 'Custom Regex Patterns',
  settingsDictionaryManagement: 'Dictionary Management',
  settingsMagnitudeVariance: 'Magnitude Variance',
  settingsRedactionMode: 'Redaction Mode',
  settingsExportImport: 'Export / Import Settings',
  settingsAbout: 'About SafeSnap',

  // Settings Page - Descriptions
  settingsDefaultPiiTypesDesc:
    'Select which types of PII to protect by default when you click "Protect PII".',
  settingsEnvironmentPatternsDesc: 'Customize URL patterns for environment detection.',
  settingsCustomRegexDesc: 'Add custom regex patterns to detect proprietary PII formats.',
  settingsMagnitudeVarianceDesc: 'Control how much money and quantity values vary (±percentage).',
  settingsRedactionModeDesc: 'Choose between replacing PII with random data or black bars.',
  settingsExportImportDesc: 'Backup your settings or transfer them to another browser.',
  settingsDictionaryInfoDesc:
    'The full dictionary (80,000 words) improves proper noun detection accuracy. Download recommended after 5 uses.',

  // Settings Page - Labels
  settingsPatternProduction: 'Production Pattern',
  settingsPatternDevelopment: 'Development Pattern',
  settingsPatternStaging: 'Staging Pattern',
  settingsPatternLocal: 'Local Pattern',
  settingsBannerOpacity: 'Banner Opacity (%)',
  settingsFadeDistance: 'Fade Distance (pixels)',
  settingsCustomPatternName: 'Custom Pattern Name',
  settingsCustomPatternRegex: 'Regex Pattern',
  settingsVariancePercentage: 'Variance Percentage (%)',
  settingsDetectionEngine: 'Detection Engine:',
  settingsDetectionEngineFree: 'Dictionary-based',
  settingsStorageUsed: 'Storage Used:',
  settingsStorageCalculating: 'Calculating...',

  // Settings Page - Buttons
  btnSelectAll: 'Select All',
  btnSelectNone: 'Select None',
  btnResetToDefaults: 'Reset to Defaults',
  btnAddPattern: 'Add Pattern',
  btnDownloadFullDictionary: 'Download Full Dictionary',
  btnClearDictionaryCache: 'Clear Dictionary Cache',
  btnExportSettings: 'Export Settings',
  btnImportSettings: 'Import Settings',

  // Settings Page - Dictionary Stats
  statsCoreWords: 'Core Words',
  statsFullDictionary: 'Full Dictionary',
  statsTimesUsed: 'Times Used',
  statsFullDownloaded: 'Full Downloaded',
  statsYes: 'Yes',
  statsNo: 'No',

  // Settings Page - Placeholders
  placeholderCustomPatternName: 'e.g., Employee ID',
  placeholderCustomPatternRegex: 'e.g., EMP-\\d{6}',

  // Settings Page - Toasts
  toastPiiTypesUpdated: 'PII types updated!',
  toastEnvironmentPatternsUpdated: 'Environment patterns updated!',
  toastPatternsReset: 'Patterns reset to defaults!',
  toastBannerPositionUpdated: 'Banner position updated!',
  toastBannerOpacityUpdated: 'Banner opacity updated!',
  toastFadeDistanceUpdated: 'Fade distance updated!',
  toastRedactionModeUpdated: 'Redaction mode updated!',
  toastDictionaryDownloaded: 'Dictionary downloaded successfully!',
  toastDictionaryCacheCleared: 'Dictionary cache cleared!',
  toastSettingsExported: 'Settings exported!',
  toastSettingsImported: 'Settings imported! Reloading...',
  toastSettingsSaved: 'Settings saved!',

  // Alerts & Errors
  alertSelectAtLeastOnePiiType: 'Please select at least one PII type to protect.',
  errorCannotRunOnThisPage: 'Cannot run on this page',
  errorRestoreFailed: 'Restore failed',
  errorProtectionFailed: 'Protection failed',
  errorScreenshotFailed: 'Screenshot failed',
  errorDownloadFailed: 'Download failed:',
  errorDictionaryDownloadFailed: 'Failed to download dictionary',
  errorDictionaryClearFailed: 'Failed to clear dictionary:',
  errorInvalidSettingsFile: 'Invalid settings file',
  errorImportSettingsFailed: 'Failed to import settings:',
  errorPrefix: 'Error:',

  // Button states
  btnDownloading: 'Downloading...',

  // Confirmation dialogs
  confirmClearDictionary: 'Are you sure you want to clear the dictionary cache?',

  // Watermark
  watermarkProtectedMode: 'PROTECTED MODE',

  // Highlight Mode Legend
  highlightLegendTitle: 'What SafeSnap Detects',
  highlightLegendGreen: 'Will be protected',
  highlightLegendOrange: 'Close but not protected',
  highlightLegendRed: 'Unlikely to be protected',
  highlightLegendGray: 'Not a name',
  highlightLegendHoverHint: 'Hover over highlights to see why',
  highlightLegendClose: 'Close',

  // Emojis (if needed to be centralized)
  emojiShield: '🛡️',
  emojiSettings: '⚙️',
  emojiInfo: 'ℹ️',
  emojiLock: '🔒',
  emojiUnlock: '🔓',
  emojiCamera: '📸',
  emojiClipboard: '📋',
  emojiCheckmark: '✓',
  emojiWrench: '🔧',
  emojiDownload: '📥',
  emojiUpload: '📤',
};

// Default export for convenience
export default en;
