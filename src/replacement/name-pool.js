/**
 * SafeSnap - Name Pool
 * Provides random person names for PII replacement
 * Based on US Census and SSA public domain data
 */

import { enDictionary } from '../dictionaries/en.js';

export class NamePool {
  constructor() {
    // Load names from centralized dictionary
    this.firstNames = enDictionary.firstNames;
    this.lastNames = enDictionary.lastNames;
  }

  /**
   * Get a random full name
   * @param {string} [gender] - 'male', 'female', or null for random
   * @returns {string} Full name
   */
  getRandomName(gender = null) {
    const firstName = this.getRandomFirstName(gender);
    const lastName = this.getRandomLastName();
    return `${firstName} ${lastName}`;
  }

  /**
   * Get a random first name
   * @param {string} [gender] - 'male', 'female', or null for random
   * @returns {string} First name
   */
  getRandomFirstName(gender = null) {
    // Normalize gender to lowercase for case-insensitive matching
    const normalizedGender = gender ? gender.toLowerCase() : null;
    const selectedGender = normalizedGender || (Math.random() > 0.5 ? 'male' : 'female');
    const names = this.firstNames[selectedGender] || this.firstNames.male; // Fallback for invalid gender
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Get a random last name
   * @returns {string} Last name
   */
  getRandomLastName() {
    return this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
  }

  /**
   * Alias for getRandomLastName (for consistency)
   * @returns {string} Last name
   */
  getRandomSurname() {
    return this.getRandomLastName();
  }

  /**
   * Alias for getRandomName (for consistency)
   * @param {string} [gender] - 'male', 'female', or null for random
   * @returns {string} Full name
   */
  getRandomFullName(gender = null) {
    return this.getRandomName(gender);
  }

  /**
   * Get multiple random names (for batch replacement)
   * @param {number} count - Number of names to generate
   * @param {string} [gender] - 'male', 'female', or null for random
   * @returns {string[]} Array of full names
   */
  getRandomNames(count, gender = null) {
    const names = new Set();
    while (names.size < count) {
      names.add(this.getRandomName(gender));
    }
    return Array.from(names);
  }

  /**
   * Check if a name might be a proper noun (simple heuristic)
   * @param {string} word - Word to check
   * @returns {boolean} True if likely a name
   */
  isLikelyName(word) {
    // Check if capitalized and not a common word
    if (!/^[A-Z][a-z]+$/.test(word)) return false;

    // Check if it's in our name pool
    const allFirstNames = [...this.firstNames.male, ...this.firstNames.female];
    const isFirstName = allFirstNames.includes(word);
    const isLastName = this.lastNames.includes(word);

    return isFirstName || isLastName;
  }
}

export default NamePool;
