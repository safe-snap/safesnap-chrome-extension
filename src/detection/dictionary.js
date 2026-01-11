/**
 * Dictionary Module
 *
 * Manages word dictionary for distinguishing proper nouns from common words.
 * Uses a two-tier approach: core dictionary (bundled) and full dictionary (optional download).
 */

import { APP_CONFIG } from '../../config/app-config.js';
import { enDictionary } from '../dictionaries/en.js';

export class Dictionary {
  constructor() {
    this.coreDictionary = new Set();
    this.fullDictionary = new Set();
    this.isCoreDictionaryLoaded = false;
    this.isFullDictionaryLoaded = false;
    this.usageCount = 0;
  }

  /**
   * Initialize the dictionary (load core dictionary)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isCoreDictionaryLoaded) {
      await this.loadCoreDictionary();
    }
  }

  /**
   * Load the core dictionary (20K most common words)
   * @returns {Promise<void>}
   */
  async loadCoreDictionary() {
    try {
      // In a real implementation, this would load from a bundled JSON file
      // For now, we'll use a minimal set of common words
      const coreWords = this._getMinimalCoreWords();
      this.coreDictionary = new Set(coreWords.map((w) => w.toLowerCase()));
      this.isCoreDictionaryLoaded = true;

      console.log(
        `[SafeSnap Dictionary] Core dictionary loaded: ${this.coreDictionary.size} words`
      );
    } catch (error) {
      console.error('[SafeSnap Dictionary] Failed to load core dictionary:', error);
      // Fallback to minimal set
      this.coreDictionary = new Set(this._getMinimalCoreWords().map((w) => w.toLowerCase()));
      this.isCoreDictionaryLoaded = true;
    }
  }

  /**
   * Load the full dictionary (80K words) from storage or remote
   * @returns {Promise<void>}
   */
  async loadFullDictionary() {
    if (this.isFullDictionaryLoaded) return;

    try {
      // Check if full dictionary is cached in storage
      const cached = await this._getFromStorage('fullDictionary');

      if (cached) {
        this.fullDictionary = new Set(cached);
        this.isFullDictionaryLoaded = true;
        console.log(
          `[SafeSnap Dictionary] Full dictionary loaded from cache: ${this.fullDictionary.size} words`
        );
      } else {
        // Would download from remote in production
        console.log(
          '[SafeSnap Dictionary] Full dictionary not cached. Use downloadFullDictionary() to fetch.'
        );
      }
    } catch (error) {
      console.error('[SafeSnap Dictionary] Failed to load full dictionary:', error);
    }
  }

  /**
   * Download the full dictionary from remote source
   * @returns {Promise<boolean>} Success status
   */
  async downloadFullDictionary() {
    try {
      console.log('[SafeSnap Dictionary] Downloading full dictionary...');

      // In production, this would fetch from a CDN or extension assets
      // For now, we'll simulate with the core dictionary + extras
      const fullWords = [...this.coreDictionary, ...this._getExtendedWords()];

      this.fullDictionary = new Set(fullWords.map((w) => w.toLowerCase()));
      this.isFullDictionaryLoaded = true;

      // Cache in storage
      await this._saveToStorage('fullDictionary', Array.from(this.fullDictionary));

      console.log(
        `[SafeSnap Dictionary] Full dictionary downloaded: ${this.fullDictionary.size} words`
      );
      return true;
    } catch (error) {
      console.error('[SafeSnap Dictionary] Failed to download full dictionary:', error);
      return false;
    }
  }

  /**
   * Check if a word is in the dictionary
   * @param {string} word - Word to check
   * @returns {boolean} True if word is in dictionary
   */
  isCommonWord(word) {
    const normalized = word.toLowerCase().trim();

    // Check full dictionary first if loaded
    if (this.isFullDictionaryLoaded && this.fullDictionary.has(normalized)) {
      return true;
    }

    // Fall back to core dictionary
    return this.coreDictionary.has(normalized);
  }

  /**
   * Check if entire phrase consists of common words
   * @param {string} phrase - Phrase to check
   * @returns {boolean} True if all words are common
   */
  isCommonPhrase(phrase) {
    if (!phrase || phrase.trim() === '') return true; // Empty phrase is considered common
    const words = phrase.trim().split(/\s+/);
    return words.every((word) => this.isCommonWord(word));
  }

  /**
   * Increment usage counter and check if full dictionary should be suggested
   * @returns {boolean} True if user should be prompted to download full dictionary
   */
  incrementUsage() {
    this.usageCount++;

    // Suggest download after N uses (defined in config)
    const threshold = APP_CONFIG.dictionary?.suggestDownloadAfter || 5;
    return !this.isFullDictionaryLoaded && this.usageCount >= threshold;
  }

  /**
   * Get current usage count
   * @returns {number} Usage count
   */
  getUsageCount() {
    return this.usageCount;
  }

  /**
   * Clear the full dictionary from memory and storage
   * @returns {Promise<void>}
   */
  async clearFullDictionary() {
    this.fullDictionary.clear();
    this.isFullDictionaryLoaded = false;
    await this._removeFromStorage('fullDictionary');
    console.log('[SafeSnap Dictionary] Full dictionary cleared');
  }

  /**
   * Get dictionary statistics
   * @returns {Object} Dictionary stats
   */
  getStats() {
    return {
      coreDictionarySize: this.coreDictionary.size,
      fullDictionarySize: this.fullDictionary.size,
      isCoreDictionaryLoaded: this.isCoreDictionaryLoaded,
      isFullDictionaryLoaded: this.isFullDictionaryLoaded,
      usageCount: this.usageCount,
    };
  }

  /**
   * Get minimal core words for fallback
   * @private
   * @returns {Array<string>} Array of common words
   */
  _getMinimalCoreWords() {
    // Load common words from centralized dictionary and remove duplicates
    return [...new Set(enDictionary.commonWords)];
  }

  /**
   * Get extended words for full dictionary simulation
   * @private
   * @returns {Array<string>} Array of additional words
   */
  _getExtendedWords() {
    // Additional words for "full" dictionary (would be much larger in production)
    return [
      'abbreviate',
      'ability',
      'able',
      'aboard',
      'abolish',
      'abortion',
      'abroad',
      'absence',
      'absolute',
      'absorb',
      'abstract',
      'absurd',
      'abundant',
      'abuse',
      'academic',
      'academy',
      'accelerate',
      'accent',
      'accept',
      'access',
      'accident',
      'accommodate',
      'accompany',
      'accomplish',
      'accord',
      'accordance',
      'accordingly',
      'achievement',
      'acknowledge',
      'acquire',
      'acquisition',
      'across',
      'action',
      'active',
      'activist',
      'activity',
      'actor',
      'actress',
      'adapt',
      'addition',
      'additional',
      'adequate',
      'adjust',
      'adjustment',
      'administration',
      'administrator',
      'admire',
      'admission',
      'admit',
      'adolescent',
      'adopt',
      'adoption',
      'adult',
      'advance',
      'advanced',
      'advantage',
      'adventure',
      'adverse',
      'advertise',
      'advertisement',
      'advice',
      'advise',
      'adviser',
      'advocate',
      'affair',
      'affect',
      'afford',
      'afraid',
      'african',
      'afternoon',
      'agency',
      'agenda',
      'agent',
      'aggressive',
      'aging',
      'ago',
      'agree',
      'agreement',
      'agricultural',
      'agriculture',
      'ahead',
      'aid',
      'aide',
      'aids',
      'aim',
      'air',
      'aircraft',
      'airline',
      'airport',
      'album',
      'alcohol',
      'alert',
      'alien',
      'align',
      'alike',
      'alive',
      'all',
      'alliance',
      'allow',
      'ally',
      'almost',
      'alone',
      'along',
      'alongside',
      'already',
      'also',
      'alter',
      'alternative',
      'although',
      'altogether',
    ];
  }

  /**
   * Get data from Chrome storage
   * @private
   * @param {string} key - Storage key
   * @returns {Promise<any>} Stored data
   */
  async _getFromStorage(key) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || null);
        });
      });
    }
    // Fallback for testing
    return null;
  }

  /**
   * Save data to Chrome storage
   * @private
   * @param {string} key - Storage key
   * @param {any} value - Data to store
   * @returns {Promise<void>}
   */
  async _saveToStorage(key, value) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
  }

  /**
   * Remove data from Chrome storage
   * @private
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async _removeFromStorage(key) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], resolve);
      });
    }
  }
}
