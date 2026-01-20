/**
 * SafeSnap - Pattern Matcher
 * Detects PII using regex patterns with enhanced library integrations
 */

import cardValidator from 'card-validator';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { enDictionary } from '../dictionaries/en.js';

export class PatternMatcher {
  constructor() {
    // Load location gazetteer for location detection
    this.locationGazetteer = new Set(enDictionary.worldLocations.map((loc) => loc.toLowerCase()));

    // Regex patterns for various PII types
    this.patterns = {
      email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,

      // Phone patterns - US and international formats
      phone: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

      // Money patterns - multiple currencies and formats
      // Enhanced to handle cross-node detection where spaces may be inserted between DOM nodes
      // Examples: "$1,199.99", "$ 1,199 . 99" (cross-node), "€100", "100 USD"
      money:
        /[$€£¥₹]\s*\d{1,3}(?:\s*,\s*\d{3})*(?:\s*\.\s*\d{2,})?|\d{1,3}(?:\s*,\s*\d{3})*(?:\s*\.\s*\d{2,})?\s*(?:USD|EUR|GBP|JPY|INR)/gi,

      // URLs - http, https, www
      url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)|www\.[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/gi,

      // IP addresses - IPv4 and IPv6
      ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      ipv6: /\b(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b/gi,

      // Credit card numbers - major card formats
      creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

      // Dates - multiple formats
      // Matches: MM/DD/YYYY, YYYY-MM-DD, "Dec 10, 2024", "Dec. 9" (with or without year), "December", "January" (standalone months), standalone years (1900-2099)
      date: /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(?:\.?\s+\d{1,2}(?:,?\s+\d{4})?)?|(?:19|20)\d{2})\b/gi,

      // US Street addresses
      address:
        /\b\d{1,5}\s+(?:[A-Z][a-z]+\s*){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Place|Pl)\b/gi,

      // Social Security Numbers (US)
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

      // Quantities with units OR standalone numbers with quantity context
      // Matches: "5 items", "3.5 kg", "total: 7", "count: 3", etc.
      // Negative lookbehind (?<!\.) prevents matching decimal portions like ".99" from "$1,199.99"
      quantity:
        /(?:(?:\btotal\b|\bcount\b|\border\b|\bitem\b|\bquantity\b|\bamount\b|\bnumber\b)[:\s]+)?(?<!\.)\b\d{1,3}(,\d{3})*(\.\d+)?(?:\s*(items|units|pieces|qty|count|kg|lbs|oz|g|ml|l|meters|feet|inches|cm|mm))?\b/gi,

      // Locations - multi-word geographic locations with keywords
      // Matches: "Bay Area", "Silicon Valley", "Pacific Ocean", "Rocky Mountains", etc.
      // Pattern captures 0-3 capitalized words followed by a location keyword
      location:
        /\b(?:[A-Z][a-z]+\s+){0,3}(?:Bay|Valley|Area|Region|Islands?|Coast|Peninsula|County|Province|District|Metropolitan|Metro|Territory|Highlands?|Plains?|Mountains?|Hills?|Ocean|Sea|River|Lake|Gulf|Desert|Forest|Falls|Canyon|Peak|Reef|Strait|Channel|Basin|Plateau|Ridge|Grove|Creek|Range)\b/g,
    };
  }

  /**
   * Match all enabled PII types in text
   * @param {string} text - Text to search
   * @param {string[]} enabledTypes - Array of enabled PII type names
   * @returns {Array} Array of matches with position and type
   */
  matchAll(text, enabledTypes = []) {
    const matches = [];

    for (const type of enabledTypes) {
      const typeMatches = this.matchType(text, type);
      matches.push(...typeMatches);
    }

    // Sort by position
    return matches.sort((a, b) => a.index - b.index);
  }

  /**
   * Match a specific PII type
   * @param {string} text - Text to search
   * @param {string} type - PII type (email, phone, money, etc.)
   * @returns {Array} Array of matches
   */
  matchType(text, type) {
    const pattern = this.getPattern(type);
    if (!pattern) {
      console.warn(`No pattern found for type: ${type}`);
      return [];
    }

    const matches = [];
    let match;

    // Reset regex lastIndex
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        value: match[0],
        index: match.index,
        type: type,
        length: match[0].length,
      });
    }

    return matches;
  }

  /**
   * Get pattern for a PII type
   * @param {string} type - PII type name
   * @returns {RegExp|null} Regular expression pattern
   */
  getPattern(type) {
    // Map common type names to pattern keys
    const typeMap = {
      emails: 'email',
      phones: 'phone',
      money: 'money',
      urls: 'url',
      ips: 'ipv4', // Default to IPv4
      creditCards: 'creditCard',
      dates: 'date',
      addresses: 'address',
      quantities: 'quantity',
      locations: 'location',
      ssn: 'ssn',
    };

    const patternKey = typeMap[type] || type;
    return this.patterns[patternKey] || null;
  }

  /**
   * Add custom regex pattern
   * @param {string} name - Pattern name
   * @param {RegExp} pattern - Regular expression
   */
  addCustomPattern(name, pattern) {
    this.patterns[name] = pattern;
  }

  /**
   * Test if text matches a pattern
   * @param {string} text - Text to test
   * @param {string} type - PII type
   * @returns {boolean} True if matches
   */
  test(text, type) {
    const pattern = this.getPattern(type);
    if (!pattern) return false;

    pattern.lastIndex = 0;
    return pattern.test(text);
  }

  /**
   * Validate a custom regex pattern
   * @param {string} patternString - Regex pattern as string
   * @returns {Object} { valid: boolean, error?: string, pattern?: RegExp }
   */
  validatePattern(patternString) {
    try {
      const pattern = new RegExp(patternString, 'g');
      return { valid: true, pattern };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Extract metadata from a match (e.g., currency from money)
   * @param {Object} match - Match object
   * @returns {Object} Metadata
   */
  extractMetadata(match) {
    const metadata = {
      originalValue: match.value,
      type: match.type,
    };

    switch (match.type) {
      case 'money': {
        // Extract currency symbol
        const currencyMatch = match.value.match(/[$€£¥₹]|USD|EUR|GBP|JPY|INR/i);
        if (currencyMatch) {
          metadata.currency = currencyMatch[0];
        }
        // Extract numeric value
        const numericMatch = match.value.match(/\d{1,3}(,\d{3})*(\.\d+)?/);
        if (numericMatch) {
          metadata.numericValue = parseFloat(numericMatch[0].replace(/,/g, ''));
        }
        break;
      }

      case 'quantity': {
        // Extract unit
        const unitMatch = match.value.match(
          /items|units|pieces|kg|lbs|oz|g|ml|l|meters|feet|inches|cm|mm/i
        );
        if (unitMatch) {
          metadata.unit = unitMatch[0];
        }
        // Extract numeric value
        const qtyMatch = match.value.match(/\d{1,3}(,\d{3})*(\.\d+)?/);
        if (qtyMatch) {
          metadata.numericValue = parseFloat(qtyMatch[0].replace(/,/g, ''));
        }
        break;
      }

      case 'phone':
        // Detect if international
        metadata.isInternational = match.value.startsWith('+');
        break;

      case 'email': {
        // Extract domain
        const emailParts = match.value.split('@');
        if (emailParts.length === 2) {
          metadata.domain = emailParts[1];
        }
        break;
      }
    }

    return metadata;
  }

  // Convenience methods for PIIDetector

  /**
   * Find all emails in text
   * @param {string} text - Text to search
   * @returns {Array} Array of email matches with {value, start, end}
   */
  findEmails(text) {
    const matches = this.matchType(text, 'email');
    return matches.map((m) => ({ value: m.value, start: m.index, end: m.index + m.length }));
  }

  /**
   * Find all phone numbers in text (using libphonenumber-js for validation)
   * @param {string} text - Text to search
   * @returns {Array} Array of phone matches with {value, start, end, metadata}
   */
  findPhones(text) {
    const regexMatches = this.matchType(text, 'phone');
    const validMatches = [];

    for (const match of regexMatches) {
      // Use libphonenumber-js to validate and extract metadata
      try {
        const cleanNumber = match.value.replace(/\s+/g, ' ').trim();

        // Try to parse with country detection
        if (isValidPhoneNumber(cleanNumber)) {
          const phoneNumber = parsePhoneNumber(cleanNumber);
          validMatches.push({
            value: match.value,
            start: match.index,
            end: match.index + match.length,
            metadata: {
              country: phoneNumber.country,
              countryCallingCode: phoneNumber.countryCallingCode,
              nationalNumber: phoneNumber.nationalNumber,
              isValid: true,
              type: phoneNumber.getType(), // 'MOBILE', 'FIXED_LINE', etc.
            },
          });
        } else {
          // Keep match but mark as potentially invalid
          validMatches.push({
            value: match.value,
            start: match.index,
            end: match.index + match.length,
            metadata: {
              isValid: false,
            },
          });
        }
      } catch (error) {
        // If parsing fails, include the match anyway (might be valid but in unsupported format)
        validMatches.push({
          value: match.value,
          start: match.index,
          end: match.index + match.length,
          metadata: {
            isValid: false,
            parseError: error.message,
          },
        });
      }
    }

    return validMatches;
  }

  /**
   * Find all money amounts in text
   * @param {string} text - Text to search
   * @returns {Array} Array of money matches with {value, start, end, ...metadata}
   */
  findMoney(text) {
    const matches = this.matchType(text, 'money');
    return matches.map((m) => {
      const metadata = this._extractMoneyMetadata(m.value);
      return { value: m.value, start: m.index, end: m.index + m.length, ...metadata };
    });
  }

  /**
   * Extract detailed money metadata
   * @private
   */
  _extractMoneyMetadata(value) {
    const currencyMatch = value.match(/[$€£¥₹]/);
    const currencyCodeMatch = value.match(/USD|EUR|GBP|JPY|INR/i);
    const numericMatch = value.match(/\d{1,3}(,\d{3})*(\.\d+)?/);

    const hasSymbol = !!(currencyMatch || currencyCodeMatch);
    const currency = currencyMatch
      ? currencyMatch[0]
      : currencyCodeMatch
        ? currencyCodeMatch[0]
        : '$';
    const symbolPosition = currencyMatch
      ? value.indexOf(currencyMatch[0]) < value.search(/\d/)
        ? 'before'
        : 'after'
      : 'before';
    const hasCommas = /,/.test(value);
    const numericValue = numericMatch ? parseFloat(numericMatch[0].replace(/,/g, '')) : 0;

    // Extract decimal places from original value
    const decimalMatch = numericMatch && numericMatch[0].match(/\.(\d+)/);
    const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;

    return {
      numericValue,
      currency,
      hasCommas,
      hasSymbol,
      symbolPosition,
      decimalPlaces,
    };
  }

  /**
   * Find all quantities in text
   * @param {string} text - Text to search
   * @returns {Array} Array of quantity matches with {value, start, end, ...metadata}
   */
  findQuantities(text) {
    const matches = this.matchType(text, 'quantity');
    return matches.map((m) => {
      const metadata = this._extractQuantityMetadata(m.value);
      return { value: m.value, start: m.index, end: m.index + m.length, ...metadata };
    });
  }

  /**
   * Extract detailed quantity metadata
   * @private
   */
  _extractQuantityMetadata(value) {
    const unitMatch = value.match(/items|units|pieces|kg|lbs|oz|g|ml|l|meters|feet|inches|cm|mm/i);
    const numericMatch = value.match(/\d{1,3}(,\d{3})*(\.\d+)?/);
    const hasCommas = /,/.test(value);
    const unit = unitMatch ? unitMatch[0] : '';
    const numericValue = numericMatch ? parseFloat(numericMatch[0].replace(/,/g, '')) : 0;

    // Extract decimal places from original value
    const decimalMatch = numericMatch && numericMatch[0].match(/\.(\d+)/);
    const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;

    return {
      numericValue,
      unit,
      hasCommas,
      decimalPlaces,
    };
  }

  /**
   * Find all URLs in text
   * @param {string} text - Text to search
   * @returns {Array} Array of URL matches with {value, start, end}
   */
  findURLs(text) {
    const matches = this.matchType(text, 'url');
    return matches.map((m) => ({ value: m.value, start: m.index, end: m.index + m.length }));
  }

  /**
   * Find all IP addresses in text
   * @param {string} text - Text to search
   * @returns {Array} Array of IP matches with {value, start, end}
   */
  findIPAddresses(text) {
    const ipv4Matches = this.matchType(text, 'ipv4');
    const ipv6Matches = this.matchType(text, 'ipv6');
    const allMatches = [...ipv4Matches, ...ipv6Matches];
    return allMatches.map((m) => ({ value: m.value, start: m.index, end: m.index + m.length }));
  }

  /**
   * Find all SSNs in text
   * @param {string} text - Text to search
   * @returns {Array} Array of SSN matches with {value, start, end}
   */
  findSSNs(text) {
    const matches = this.matchType(text, 'ssn');
    return matches.map((m) => ({ value: m.value, start: m.index, end: m.index + m.length }));
  }

  /**
   * Find all credit card numbers in text (using card-validator for Luhn validation)
   * @param {string} text - Text to search
   * @returns {Array} Array of credit card matches with {value, start, end, metadata}
   */
  findCreditCards(text) {
    const regexMatches = this.matchType(text, 'creditCard');
    const validMatches = [];

    for (const match of regexMatches) {
      // Use card-validator to validate with Luhn algorithm
      const cleanNumber = match.value.replace(/[\s-]/g, ''); // Remove spaces and dashes
      const validation = cardValidator.number(cleanNumber);

      // Only include if it passes Luhn validation
      if (validation.isValid) {
        validMatches.push({
          value: match.value,
          start: match.index,
          end: match.index + match.length,
          metadata: {
            cardType: validation.card ? validation.card.type : 'unknown', // 'visa', 'mastercard', 'amex', etc.
            isValid: true,
            lengths: validation.card ? validation.card.lengths : [],
            code: validation.card ? validation.card.code : null,
          },
        });
      }
      // Skip matches that fail Luhn validation (false positives like order numbers)
    }

    return validMatches;
  }

  /**
   * Find all dates in text
   * @param {string} text - Text to search
   * @returns {Array} Array of date matches with {value, start, end}
   */
  findDates(text) {
    const matches = this.matchType(text, 'date');
    return matches.map((m) => ({ value: m.value, start: m.index, end: m.index + m.length }));
  }

  /**
   * Find all addresses in text
   * @param {string} text - Text to search
   * @returns {Array} Array of address matches with {value, start, end}
   */
  findAddresses(text) {
    const matches = this.matchType(text, 'address');
    return matches.map((m) => ({ value: m.value, start: m.index, end: m.index + m.length }));
  }

  /**
   * Find all locations in text (hybrid approach: pattern + gazetteer)
   * Detects multi-word locations via pattern and single-word locations via gazetteer
   * @param {string} text - Text to search
   * @returns {Array} Array of location matches with {value, start, end, matchType}
   */
  findLocations(text) {
    const locations = [];
    const seenPositions = new Set();

    // Step 1: Pattern-based detection for multi-word locations
    // Matches: "Bay Area", "Silicon Valley", "Pacific Ocean", etc.
    const patternMatches = this.matchType(text, 'location');
    for (const match of patternMatches) {
      // Mark this position range as seen
      for (let i = match.index; i < match.index + match.length; i++) {
        seenPositions.add(i);
      }

      locations.push({
        value: match.value,
        start: match.index,
        end: match.index + match.length,
        matchType: 'pattern',
      });
    }

    // Step 2: Gazetteer-based detection for known locations
    // First try multi-word phrases, then individual words
    // This catches: "Paris", "Tokyo", "California", "United States", "New York", etc.
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    let match;
    while ((match = capitalizedPattern.exec(text)) !== null) {
      const candidate = match[0];
      const start = match.index;
      const end = start + candidate.length;

      // Skip if already matched by pattern
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (seenPositions.has(i)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      // First, try the full phrase (e.g., "New York", "United States")
      if (this.locationGazetteer.has(candidate.toLowerCase())) {
        // Mark this position range as seen
        for (let i = start; i < end; i++) {
          seenPositions.add(i);
        }

        locations.push({
          value: candidate,
          start,
          end,
          matchType: 'gazetteer',
        });
      } else if (candidate.includes(' ')) {
        // If multi-word phrase not found, check individual words
        // This handles cases like "In California" where "In California" isn't in gazetteer
        // but "California" is
        const words = candidate.split(/\s+/);
        let wordStart = start;
        for (const word of words) {
          const wordEnd = wordStart + word.length;

          // Check if this individual word is in the gazetteer
          if (this.locationGazetteer.has(word.toLowerCase())) {
            // Check if this position is already seen
            let wordOverlaps = false;
            for (let i = wordStart; i < wordEnd; i++) {
              if (seenPositions.has(i)) {
                wordOverlaps = true;
                break;
              }
            }

            if (!wordOverlaps) {
              // Mark this word's position as seen
              for (let i = wordStart; i < wordEnd; i++) {
                seenPositions.add(i);
              }

              locations.push({
                value: word,
                start: wordStart,
                end: wordEnd,
                matchType: 'gazetteer',
              });
            }
          }

          // Move to next word (word length + 1 for space)
          wordStart = wordEnd + 1;
        }
      }
    }

    // Sort by position
    return locations.sort((a, b) => a.start - b.start);
  }

  /**
   * Match money value and extract metadata
   * @param {string} text - Text to match
   * @returns {Object|null} Match with metadata or null
   */
  matchMoney(text) {
    const matches = this.findMoney(text);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Match quantity value and extract metadata
   * @param {string} text - Text to match
   * @returns {Object|null} Match with metadata or null
   */
  matchQuantity(text) {
    const matches = this.findQuantities(text);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Match phone number and extract metadata
   * @param {string} text - Text to match
   * @returns {Object|null} Match with metadata or null
   */
  matchPhone(text) {
    const matches = this.findPhones(text);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Match date and extract metadata
   * @param {string} text - Text to match
   * @returns {Object|null} Match with metadata or null
   */
  matchDate(text) {
    const matches = this.findDates(text);
    return matches.length > 0 ? matches[0] : null;
  }
}

export default PatternMatcher;
