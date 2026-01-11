/**
 * Replacer Module
 *
 * Generates realistic replacement values for detected PII entities.
 * Preserves format, applies magnitude variance, and uses pool-based replacements.
 */

import { NamePool } from './name-pool.js';
import { CompanyPool } from './company-pool.js';
import { PatternMatcher } from '../detection/pattern-matcher.js';
import { APP_CONFIG } from '../../config/app-config.js';

export class Replacer {
  constructor() {
    this.namePool = new NamePool();
    this.companyPool = new CompanyPool();
    this.patternMatcher = new PatternMatcher();
    this.magnitudeVariance = APP_CONFIG.defaults?.magnitudeVariance || 30; // default
    this.redactionMode = APP_CONFIG.defaults?.redactionMode || 'random'; // 'random' or 'blackout'
    this.moneyMultiplier = null; // Will be set once per protection session
    this.quantityMultiplier = null; // Will be set once per protection session
  }

  /**
   * Set redaction mode (random data or blackout bars)
   * @param {string} mode - 'random' or 'blackout'
   */
  setRedactionMode(mode) {
    this.redactionMode = mode;
  }

  /**
   * Generate blackout bar for text (like legal document redaction)
   * @param {string} text - Original text to blackout
   * @returns {string} Black block characters matching length
   */
  generateBlackout(text) {
    // Use Unicode Full Block character (█) to create blackout effect
    // Preserve word boundaries and rough shape for visual consistency
    const words = text.split(/(\s+)/);
    return words
      .map((word) => {
        if (/\s+/.test(word)) {
          return word; // Preserve whitespace
        }
        // Create black bar matching word length
        return '█'.repeat(Math.ceil(word.length * 0.9)); // Slightly shorter for visual appeal
      })
      .join('');
  }

  /**
   * Set magnitude variance for money and quantity replacements
   * @param {number} variance - Variance percentage (0-100)
   */
  setMagnitudeVariance(variance) {
    this.magnitudeVariance = variance;
  }

  /**
   * Reset multipliers for a new protection session
   * This ensures all money/quantities use the same multiplier
   */
  resetMultipliers() {
    const variance = this.magnitudeVariance / 100;
    // Generate one multiplier for all money values
    this.moneyMultiplier = 1 + (Math.random() * 2 - 1) * variance;
    // Generate one multiplier for all quantity values
    this.quantityMultiplier = 1 + (Math.random() * 2 - 1) * variance;
  }

  /**
   * Replace a proper noun (person or company name)
   * @param {string} name - Original name
   * @param {string} context - Context hint ('person', 'company', or 'auto')
   * @returns {string} Replacement name
   */
  replaceProperNoun(name, context = 'auto') {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(name);
    }

    // Auto-detect if person or company based on patterns
    if (context === 'auto') {
      // Check if it looks like a company (contains Inc, Corp, LLC, etc.)
      if (/\b(Inc|Corp|LLC|Ltd|Limited|Company|Co\.|Corporation)\b/i.test(name)) {
        context = 'company';
      } else {
        context = 'person';
      }
    }

    if (context === 'company') {
      return this.companyPool.getRandomCompany();
    } else {
      // Check if full name or just first/last
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return this.namePool.getRandomFullName();
      } else {
        // Single name - could be first or last
        return this.namePool.getRandomFirstName();
      }
    }
  }

  /**
   * Replace a monetary amount with variance
   * @param {string} original - Original money string (e.g., "$1,234.56")
   * @returns {string} Replacement with same format
   */
  replaceMoney(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    const match = this.patternMatcher.matchMoney(original);
    if (!match) return original;

    const { numericValue, currency, hasCommas, hasSymbol, symbolPosition, decimalPlaces } = match;

    // Use the same multiplier for all money values on the page
    // If not set, initialize it (shouldn't happen if resetMultipliers was called)
    if (this.moneyMultiplier === null) {
      const variance = this.magnitudeVariance / 100;
      this.moneyMultiplier = 1 + (Math.random() * 2 - 1) * variance;
    }

    let newValue = numericValue * this.moneyMultiplier;

    // Use decimal places from match
    newValue = parseFloat(newValue.toFixed(decimalPlaces));

    // Format with commas if original had them
    let formatted = newValue.toFixed(decimalPlaces);
    if (hasCommas) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    // Add currency symbol
    if (hasSymbol) {
      if (symbolPosition === 'before') {
        return currency + formatted;
      } else {
        return formatted + currency;
      }
    }

    return formatted;
  }

  /**
   * Replace a quantity with variance
   * @param {string} original - Original quantity string (e.g., "150 kg")
   * @returns {string} Replacement with same format
   */
  replaceQuantity(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    const match = this.patternMatcher.matchQuantity(original);
    if (!match) return original;

    const { numericValue, unit, hasCommas, decimalPlaces } = match;

    // Use the same multiplier for all quantity values on the page
    // If not set, initialize it (shouldn't happen if resetMultipliers was called)
    if (this.quantityMultiplier === null) {
      const variance = this.magnitudeVariance / 100;
      this.quantityMultiplier = 1 + (Math.random() * 2 - 1) * variance;
    }

    let newValue = numericValue * this.quantityMultiplier;

    // Use decimal places from match
    newValue = parseFloat(newValue.toFixed(decimalPlaces));

    // Format with commas if original had them
    let formatted = newValue.toFixed(decimalPlaces);
    if (hasCommas) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    return formatted + (unit ? ' ' + unit : '');
  }

  /**
   * Replace an email address
   * @param {string} original - Original email
   * @returns {string} Random replacement email or blackout
   */
  replaceEmail(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    const firstName = this.namePool.getRandomFirstName().toLowerCase();
    const lastName = this.namePool.getRandomSurname().toLowerCase();
    const domain = this.companyPool.getRandomDomain();

    // Vary the format
    const formats = [
      `${firstName}.${lastName}@${domain}`,
      `${firstName}${lastName}@${domain}`,
      `${firstName.charAt(0)}${lastName}@${domain}`,
      `${firstName}@${domain}`,
    ];

    return formats[Math.floor(Math.random() * formats.length)];
  }

  /**
   * Replace a phone number preserving format
   * @param {string} original - Original phone number
   * @returns {string} Random replacement with same format
   */
  replacePhone(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    const match = this.patternMatcher.matchPhone(original);
    if (!match) return original;

    // Generate random 10-digit number (avoiding invalid area codes)
    const areaCode = Math.floor(Math.random() * 800) + 200; // 200-999
    const exchange = Math.floor(Math.random() * 800) + 200; // 200-999
    const lineNumber = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    // Detect format and replicate
    if (/\+1[-\s]/.test(original)) {
      // International format with country code
      const separator = original.match(/\+1([-\s])/)?.[1] || '-';
      if (/\(\d{3}\)/.test(original)) {
        return `+1${separator}(${areaCode}) ${exchange}-${lineNumber}`;
      } else if (/\d{3}-\d{3}-\d{4}/.test(original)) {
        return `+1${separator}${areaCode}-${exchange}-${lineNumber}`;
      } else {
        return `+1${separator}${areaCode}${exchange}${lineNumber}`;
      }
    } else if (/\+1/.test(original)) {
      return `+1${areaCode}${exchange}${lineNumber}`;
    } else if (/\(\d{3}\)\s*\d{3}-\d{4}/.test(original)) {
      return `(${areaCode}) ${exchange}-${lineNumber}`;
    } else if (/\d{3}-\d{3}-\d{4}/.test(original)) {
      return `${areaCode}-${exchange}-${lineNumber}`;
    } else if (/\d{3}\.\d{3}\.\d{4}/.test(original)) {
      return `${areaCode}.${exchange}.${lineNumber}`;
    } else if (/\d{3}\s+\d{3}\s+\d{4}/.test(original)) {
      return `${areaCode} ${exchange} ${lineNumber}`;
    } else {
      return `${areaCode}${exchange}${lineNumber}`;
    }
  }

  /**
   * Replace a URL with random domain
   * @param {string} original - Original URL
   * @returns {string} Replacement URL with random domain
   */
  replaceURL(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    try {
      const url = new URL(original);
      const newDomain = this.companyPool.getRandomDomain();
      url.hostname = newDomain;
      return url.toString();
    } catch (e) {
      // If URL parsing fails, try simple domain replacement
      const domain = this.companyPool.getRandomDomain();
      return original.replace(/([a-z0-9-]+\.)+[a-z]{2,}/i, domain);
    }
  }

  /**
   * Replace a street address
   * @param {string} original - Original address
   * @returns {string} Random replacement address
   */
  replaceAddress(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const streetNames = [
      'Main',
      'Oak',
      'Pine',
      'Maple',
      'Cedar',
      'Elm',
      'Washington',
      'Lake',
      'Hill',
      'Park',
      'Spring',
      'Forest',
      'River',
      'Church',
      'Market',
      'Center',
      'First',
      'Second',
      'Third',
      'Fourth',
    ];
    const streetTypes = ['St', 'Ave', 'Rd', 'Blvd', 'Dr', 'Ln', 'Ct', 'Way'];

    const street = streetNames[Math.floor(Math.random() * streetNames.length)];
    const type = streetTypes[Math.floor(Math.random() * streetTypes.length)];

    return `${streetNumber} ${street} ${type}`;
  }

  /**
   * Replace a date with randomization within ±2 months
   * @param {string} original - Original date string
   * @returns {string} Replacement date in same format
   */
  replaceDate(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    const match = this.patternMatcher.matchDate(original);
    if (!match) return original;

    // Parse the date
    let date;
    try {
      date = new Date(original);
      if (isNaN(date.getTime())) {
        // Try common formats manually
        const parts = original.match(/\d+/g);
        if (parts && parts.length >= 3) {
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    } catch (e) {
      return original;
    }

    // Randomize ±2 months (60 days)
    const daysOffset = Math.floor(Math.random() * 120) - 60;
    date.setDate(date.getDate() + daysOffset);

    // Month name arrays for textual formats
    const shortMonths = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const longMonths = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Detect format and replicate
    if (/\d{4}-\d{2}-\d{2}/.test(original)) {
      // ISO format: YYYY-MM-DD
      return date.toISOString().split('T')[0];
    } else if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(original)) {
      // US format with slashes: M/D/YYYY or MM/DD/YYYY
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();

      // Check if original used zero-padding by extracting month and day parts
      const dateParts = original.split('/');
      const hasZeroPaddedMonth =
        dateParts[0] && dateParts[0].length === 2 && dateParts[0].startsWith('0');
      const hasZeroPaddedDay =
        dateParts[1] && dateParts[1].length === 2 && dateParts[1].startsWith('0');

      // Format month and day, preserving padding style
      const monthStr =
        hasZeroPaddedMonth || dateParts[0]?.length === 2
          ? month.toString().padStart(2, '0')
          : month.toString();
      const dayStr =
        hasZeroPaddedDay || dateParts[1]?.length === 2
          ? day.toString().padStart(2, '0')
          : day.toString();

      return `${monthStr}/${dayStr}/${year}`;
    } else if (/\d{1,2}-\d{1,2}-\d{4}/.test(original)) {
      // Dashed format: M-D-YYYY or MM-DD-YYYY
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();

      // Check if original used zero-padding by extracting month and day parts
      const dateParts = original.split('-');
      const hasZeroPaddedMonth =
        dateParts[0] && dateParts[0].length === 2 && dateParts[0].startsWith('0');
      const hasZeroPaddedDay =
        dateParts[1] && dateParts[1].length === 2 && dateParts[1].startsWith('0');

      // Format month and day, preserving padding style
      const monthStr =
        hasZeroPaddedMonth || dateParts[0]?.length === 2
          ? month.toString().padStart(2, '0')
          : month.toString();
      const dayStr =
        hasZeroPaddedDay || dateParts[1]?.length === 2
          ? day.toString().padStart(2, '0')
          : day.toString();

      return `${monthStr}-${dayStr}-${year}`;
    } else if (/^[A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4}$/.test(original)) {
      // Textual format: "Dec 9, 2025" or "December 9, 2025"
      const year = date.getFullYear();
      const day = date.getDate();
      const monthIndex = date.getMonth();

      // Determine if original used short or long month name
      const usesShortMonth = /^[A-Z][a-z]{2}\.?\s/.test(original);
      const monthName = usesShortMonth ? shortMonths[monthIndex] : longMonths[monthIndex];

      // Preserve comma format if present
      const hasComma = original.includes(',');
      return hasComma ? `${monthName} ${day}, ${year}` : `${monthName} ${day} ${year}`;
    } else {
      // Default to ISO
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Replace SSN with random 9-digit number
   * @param {string} original - Original SSN
   * @returns {string} Random SSN in same format
   */
  replaceSSN(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    // Generate random SSN (avoiding invalid ranges)
    const area = Math.floor(Math.random() * 899) + 100; // 100-998 (avoid 666, 900-999)
    const group = Math.floor(Math.random() * 99) + 1; // 01-99
    const serial = Math.floor(Math.random() * 9999) + 1; // 0001-9999

    const formatted = `${area}-${group.toString().padStart(2, '0')}-${serial.toString().padStart(4, '0')}`;

    // Preserve format
    if (original.includes('-')) {
      return formatted;
    } else if (original.includes(' ')) {
      return formatted.replace(/-/g, ' ');
    } else {
      return formatted.replace(/-/g, '');
    }
  }

  /**
   * Replace credit card number
   * @param {string} original - Original credit card number
   * @returns {string} Random credit card in same format
   */
  replaceCreditCard(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    // Generate random 16-digit number
    let digits = '';
    for (let i = 0; i < 16; i++) {
      digits += Math.floor(Math.random() * 10);
    }

    // Preserve format
    if (/\d{4}-\d{4}-\d{4}-\d{4}/.test(original)) {
      return digits.match(/.{1,4}/g).join('-');
    } else if (/\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/.test(original)) {
      return digits.match(/.{1,4}/g).join(' ');
    } else {
      return digits;
    }
  }

  /**
   * Replace IP address
   * @param {string} original - Original IP address
   * @returns {string} Random IP address
   */
  replaceIPAddress(original) {
    // Check if blackout mode
    if (this.redactionMode === 'blackout') {
      return this.generateBlackout(original);
    }

    // Generate random private IP address (192.168.x.x)
    const octet3 = Math.floor(Math.random() * 256);
    const octet4 = Math.floor(Math.random() * 256);

    if (original.includes(':')) {
      // IPv6 - just randomize last segment
      const segments = original.split(':');
      const randomHex = Math.floor(Math.random() * 65536)
        .toString(16)
        .padStart(4, '0');
      segments[segments.length - 1] = randomHex;
      return segments.join(':');
    } else {
      // IPv4
      return `192.168.${octet3}.${octet4}`;
    }
  }

  /**
   * Apply replacements to text using consistency mapping
   * @param {string} text - Original text
   * @param {Array} piiEntities - Array of detected PII entities
   * @param {Map} consistencyMap - Map for consistent replacements
   * @returns {string} Text with replacements applied
   */
  applyReplacements(text, piiEntities, consistencyMap) {
    // Sort entities by position (reverse order to maintain indices)
    const sortedEntities = [...piiEntities].sort((a, b) => b.start - a.start);

    let result = text;

    for (const entity of sortedEntities) {
      const { original, type, start, end } = entity;

      // Check consistency map first
      let replacement;
      const mapKey = `${type}:${original.toLowerCase()}`;

      if (consistencyMap.has(mapKey)) {
        replacement = consistencyMap.get(mapKey);
      } else {
        // Generate new replacement based on type
        switch (type) {
          case 'properNoun':
            replacement = this.replaceProperNoun(original);
            break;
          case 'email':
            replacement = this.replaceEmail(original);
            break;
          case 'phone':
            replacement = this.replacePhone(original);
            break;
          case 'money':
            replacement = this.replaceMoney(original);
            break;
          case 'quantity':
            replacement = this.replaceQuantity(original);
            break;
          case 'url':
            replacement = this.replaceURL(original);
            break;
          case 'address':
            replacement = this.replaceAddress(original);
            break;
          case 'date':
            replacement = this.replaceDate(original);
            break;
          case 'ssn':
            replacement = this.replaceSSN(original);
            break;
          case 'creditCard':
            replacement = this.replaceCreditCard(original);
            break;
          case 'ipAddress':
            replacement = this.replaceIPAddress(original);
            break;
          default:
            replacement = original;
        }

        // Store in consistency map
        consistencyMap.set(mapKey, replacement);
      }

      // Apply replacement
      result = result.substring(0, start) + replacement + result.substring(end);
    }

    return result;
  }
}
