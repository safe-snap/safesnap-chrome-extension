/**
 * Dictionary Module
 *
 * Manages word dictionary for distinguishing proper nouns from common words.
 * Contains a curated list of common English words to improve detection accuracy.
 */

import { enDictionary } from '../dictionaries/en.js';

export class Dictionary {
  constructor() {
    this.dictionary = new Set();
    this.isLoaded = false;
  }

  /**
   * Initialize the dictionary
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.isLoaded) {
      await this.loadDictionary();
    }
  }

  /**
   * Load the dictionary
   * @returns {Promise<void>}
   */
  async loadDictionary() {
    try {
      const words = this._getCommonWords();
      this.dictionary = new Set(words.map((w) => w.toLowerCase()));
      this.isLoaded = true;

      console.log(`[SafeSnap Dictionary] Dictionary loaded: ${this.dictionary.size} words`);
    } catch (error) {
      console.error('[SafeSnap Dictionary] Failed to load dictionary:', error);
      // Fallback to minimal set
      this.dictionary = new Set(this._getCommonWords().map((w) => w.toLowerCase()));
      this.isLoaded = true;
    }
  }

  /**
   * Check if a word is in the dictionary
   * @param {string} word - Word to check
   * @returns {boolean} True if word is in dictionary
   */
  isCommonWord(word) {
    const normalized = word.toLowerCase().trim();
    return this.dictionary.has(normalized);
  }

  /**
   * Check if entire phrase consists of common words
   * @param {string} phrase - Phrase to check
   * @returns {boolean} True if all words are common
   */
  isCommonPhrase(phrase) {
    if (!phrase || phrase.trim() === '') return true;
    const words = phrase.trim().split(/\s+/);
    return words.every((word) => this.isCommonWord(word));
  }

  /**
   * Get dictionary statistics
   * @returns {Object} Dictionary stats
   */
  getStats() {
    return {
      dictionarySize: this.dictionary.size,
      isLoaded: this.isLoaded,
    };
  }

  /**
   * Get common words from centralized dictionary
   * @private
   * @returns {Array<string>} Array of common words
   */
  _getCommonWords() {
    // Load common words from centralized dictionary and remove duplicates
    return [...new Set(enDictionary.commonWords)];
  }
}
