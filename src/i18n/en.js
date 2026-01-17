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
  piiTypeLocations: 'Locations',
  piiTypeLocationsDesc: 'Geographic locations like Bay Area, Paris, California',

  // Popup - Buttons
  btnProtectPii: 'Protect PII',
  btnRestoreOriginal: 'Restore Original',
  btnTakeScreenshot: 'Take Screenshot',
  btnCopyToClipboard: 'Copy to Clipboard',
  btnCopied: 'Copied!',
  btnAdvancedSettings: 'Advanced Settings',
  btnHighlightDetections: 'Highlight Detections',
  btnRemoveHighlights: 'Remove Highlights',
  labelHighlightDetections: 'Highlight Detections',

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
  redactionModeBlackout: 'Blackout (███)',
  redactionModeBlackoutDesc: 'Cover with black bars like legal documents',

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
  settingsBannerCustomization: 'Banner Customization',
  settingsCustomRegexPatterns: 'Custom Regex Patterns',
  settingsMagnitudeVariance: 'Magnitude Variance',
  settingsRedactionMode: 'Redaction Mode',
  settingsExportImport: 'Export / Import Settings',
  settingsAbout: 'About SafeSnap',

  // Settings Page - Descriptions
  settingsDefaultPiiTypesDesc:
    'Select which types of PII to protect by default when you click "Protect PII".',
  settingsCustomRegexDesc: 'Add custom regex patterns to detect proprietary PII formats.',
  settingsMagnitudeVarianceDesc:
    'Randomize money and quantity values to make them realistic but unrecognizable. Higher values create larger changes.',
  settingsRedactionModeDesc: 'Choose between replacing PII with random data or black bars.',
  settingsExportImportDesc: 'Backup your settings or transfer them to another browser.',

  // Settings Page - Labels
  settingsBannerOpacity: 'Banner Opacity (%)',
  settingsFadeDistance: 'Fade Distance (pixels)',
  settingsCustomPatternName: 'Custom Pattern Name',
  settingsCustomPatternRegex: 'Regex Pattern',
  settingsVariancePercentage: 'Variance Percentage (%)',
  settingsDetectionEngine: 'Detection Engine:',
  settingsDetectionEngineFree: 'Dictionary-based',
  settingsStorageUsed: 'Storage Used:',
  settingsStorageCalculating: 'Calculating...',
  settingsModeLabel: 'Mode',

  // Settings Page - Buttons
  btnSelectAll: 'Select All',
  btnSelectNone: 'Select None',
  btnResetToDefaults: 'Reset to Defaults',
  btnAddPattern: 'Add Pattern',
  btnExportSettings: '📥 Export Settings',
  btnImportSettings: '📤 Import Settings',

  // Settings Page - Placeholders
  placeholderCustomPatternName: 'e.g., Employee ID',
  placeholderCustomPatternRegex: 'e.g., EMP-\\d{6}',

  // Settings Page - Toasts
  toastPiiTypesUpdated: 'PII types updated!',
  toastBannerPositionUpdated: 'Banner position updated!',
  toastBannerOpacityUpdated: 'Banner opacity updated!',
  toastFadeDistanceUpdated: 'Fade distance updated!',
  toastRedactionModeUpdated: 'Redaction mode updated!',
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
  errorInvalidSettingsFile: 'Invalid settings file',
  errorImportSettingsFailed: 'Failed to import settings:',
  errorPrefix: 'Error:',

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
