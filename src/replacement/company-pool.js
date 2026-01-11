/**
 * SafeSnap - Company Pool
 * Provides random company names for PII replacement
 */

import { enDictionary } from '../dictionaries/en.js';

export class CompanyPool {
  constructor() {
    // Load company data from centralized dictionary
    this.prefixes = enDictionary.companyPrefixes;
    this.types = enDictionary.companyTypes;
    this.suffixes = enDictionary.companySuffixes;
    this.singleWord = enDictionary.companySingleWord;

    // Alias for consistency with tests
    this.companyTypes = this.types;

    // TLDs for domain generation
    this.tlds = ['.com', '.net', '.org', '.io', '.co'];
  }

  /**
   * Get a random company name
   * @param {string} [style] - 'full', 'short', 'domain', or null for random
   * @returns {string} Company name
   */
  getRandomCompany(style = null) {
    // Default to 'full' if no style specified
    if (!style) {
      return this.getFullCompanyName();
    }

    switch (style) {
      case 'full':
        return this.getFullCompanyName();
      case 'short':
        return this.getShortCompanyName();
      case 'domain':
        return this.getDomainName();
      default:
        return this.getFullCompanyName();
    }
  }

  /**
   * Get a full company name with suffix
   * @returns {string} e.g., "Acme Tech Solutions, Inc"
   */
  getFullCompanyName() {
    const parts = [];

    // Always include prefix for full company names to ensure minimum length
    parts.push(this.getRandomPrefix());
    parts.push(this.getRandomType());

    const suffix = this.getRandomSuffix();
    const name = parts.join(' ');

    // 70% chance of adding suffix
    if (Math.random() > 0.3) {
      return `${name}, ${suffix}`;
    }

    return name;
  }

  /**
   * Get a short company name without suffix
   * @returns {string} e.g., "Acme Tech"
   */
  getShortCompanyName() {
    const useSingleWord = Math.random() > 0.6;

    if (useSingleWord) {
      return this.singleWord[Math.floor(Math.random() * this.singleWord.length)];
    }

    const parts = [this.getRandomPrefix(), this.getRandomType()];
    return parts.join(' ');
  }

  /**
   * Get a domain-style name
   * @returns {string} e.g., "acme-tech.com"
   */
  getDomainName() {
    const useSingleWord = Math.random() > 0.5;
    const tld = this.tlds[Math.floor(Math.random() * this.tlds.length)];

    if (useSingleWord) {
      const word = this.singleWord[Math.floor(Math.random() * this.singleWord.length)];
      return `${word.toLowerCase()}${tld}`;
    }

    const prefix = this.getRandomPrefix().toLowerCase();
    const type = this.getRandomType().toLowerCase();
    const separator = Math.random() > 0.5 ? '-' : '';

    return `${prefix}${separator}${type}${tld}`;
  }

  /**
   * Alias for getDomainName (for consistency)
   * @returns {string} Domain name
   */
  getRandomDomain() {
    return this.getDomainName();
  }

  /**
   * Get random prefix
   * @returns {string} Company prefix
   */
  getRandomPrefix() {
    return this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
  }

  /**
   * Get random type
   * @returns {string} Company type
   */
  getRandomType() {
    return this.types[Math.floor(Math.random() * this.types.length)];
  }

  /**
   * Get random suffix
   * @returns {string} Company suffix
   */
  getRandomSuffix() {
    return this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
  }

  /**
   * Get multiple random company names
   * @param {number} count - Number of names to generate
   * @param {string} [style] - Company name style
   * @returns {string[]} Array of company names
   */
  getRandomCompanies(count, style = null) {
    const companies = new Set();
    while (companies.size < count) {
      companies.add(this.getRandomCompany(style));
    }
    return Array.from(companies);
  }

  /**
   * Get a related domain name for a company
   * @param {string} companyName - Original company name
   * @returns {string} Domain name
   */
  getRelatedDomain(companyName) {
    // Extract main word from company name
    const words = companyName
      .replace(/,?\s*(Inc|LLC|Corp|Ltd|Co|LP|LLP|PC|PLLC|PLC)\.?$/i, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (words.length === 0) {
      return this.getDomainName();
    }

    const mainWord = words[0].toLowerCase();
    const tld = this.tlds[Math.floor(Math.random() * this.tlds.length)];

    return `${mainWord}${tld}`;
  }

  /**
   * Check if a word might be a company name
   * @param {string} word - Word to check
   * @returns {boolean} True if likely a company name
   */
  isLikelyCompany(word) {
    // Check for common company suffixes
    if (/\b(Inc|LLC|Corp|Ltd|Co|LP|LLP|PC|PLLC|PLC)\.?$/i.test(word)) {
      return true;
    }

    // Check if it's in our pools
    const inPrefix = this.prefixes.some((p) => word.includes(p));
    const inType = this.types.some((t) => word.includes(t));
    const inSingle = this.singleWord.some((s) => word.includes(s));

    return inPrefix || inType || inSingle;
  }
}

export default CompanyPool;
