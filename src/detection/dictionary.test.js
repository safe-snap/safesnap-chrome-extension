/**
 * Dictionary Tests
 */

/* eslint-env node, jest */

import { Dictionary } from './dictionary.js';

// Mock Chrome storage API
// eslint-disable-next-line no-global-assign
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn((data, callback) => callback && callback()),
      remove: jest.fn((keys, callback) => callback && callback()),
      getBytesInUse: jest.fn((keys, callback) => callback(0)),
    },
  },
};

describe('Dictionary', () => {
  let dictionary;

  beforeEach(() => {
    dictionary = new Dictionary();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with empty dictionary', () => {
      expect(dictionary.dictionary.size).toBe(0);
      expect(dictionary.isLoaded).toBe(false);
    });
  });

  describe('loadDictionary', () => {
    test('should load dictionary', async () => {
      await dictionary.loadDictionary();

      expect(dictionary.isLoaded).toBe(true);
      expect(dictionary.dictionary.size).toBeGreaterThan(0);
    });

    test('should have common words', async () => {
      await dictionary.loadDictionary();

      expect(dictionary.dictionary.has('the')).toBe(true);
      expect(dictionary.dictionary.has('and')).toBe(true);
      expect(dictionary.dictionary.has('is')).toBe(true);
    });

    test('should handle load errors gracefully', async () => {
      await expect(dictionary.loadDictionary()).resolves.not.toThrow();
    });
  });

  describe('initialize', () => {
    test('should load dictionary on initialize', async () => {
      await dictionary.initialize();

      expect(dictionary.isLoaded).toBe(true);
      expect(dictionary.dictionary.size).toBeGreaterThan(0);
    });

    test('should not reload if already initialized', async () => {
      await dictionary.initialize();
      const firstSize = dictionary.dictionary.size;

      await dictionary.initialize();

      expect(dictionary.dictionary.size).toBe(firstSize);
    });
  });

  describe('isCommonWord', () => {
    beforeEach(async () => {
      await dictionary.initialize();
    });

    test('should return true for common words', () => {
      expect(dictionary.isCommonWord('the')).toBe(true);
      expect(dictionary.isCommonWord('and')).toBe(true);
      expect(dictionary.isCommonWord('computer')).toBe(true);
    });

    test('should return false for uncommon words', () => {
      expect(dictionary.isCommonWord('Xerxes')).toBe(false);
      expect(dictionary.isCommonWord('Nebuchadnezzar')).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(dictionary.isCommonWord('THE')).toBe(true);
      expect(dictionary.isCommonWord('The')).toBe(true);
      expect(dictionary.isCommonWord('the')).toBe(true);
    });

    test('should handle trimming', () => {
      expect(dictionary.isCommonWord(' the ')).toBe(true);
      expect(dictionary.isCommonWord(' and\n')).toBe(true);
    });

    test('should return false for empty strings', () => {
      expect(dictionary.isCommonWord('')).toBe(false);
      expect(dictionary.isCommonWord('   ')).toBe(false);
    });
  });

  describe('isCommonPhrase', () => {
    beforeEach(async () => {
      await dictionary.initialize();
    });

    test('should return true for phrases with all common words', () => {
      expect(dictionary.isCommonPhrase('the and is')).toBe(true);
      expect(dictionary.isCommonPhrase('this is a')).toBe(true);
    });

    test('should return false for phrases with uncommon words', () => {
      expect(dictionary.isCommonPhrase('the quick Nebuchadnezzar fox')).toBe(false);
      expect(dictionary.isCommonPhrase('John Smith')).toBe(false);
    });

    test('should return true for empty phrases', () => {
      expect(dictionary.isCommonPhrase('')).toBe(true);
      expect(dictionary.isCommonPhrase('   ')).toBe(true);
    });

    test('should handle single words', () => {
      expect(dictionary.isCommonPhrase('the')).toBe(true);
      expect(dictionary.isCommonPhrase('Xerxes')).toBe(false);
    });
  });

  describe('getStats', () => {
    test('should return correct stats before initialization', () => {
      const stats = dictionary.getStats();

      expect(stats).toHaveProperty('dictionarySize');
      expect(stats).toHaveProperty('isLoaded');
      expect(stats.dictionarySize).toBe(0);
      expect(stats.isLoaded).toBe(false);
    });

    test('should return correct stats after initialization', async () => {
      await dictionary.initialize();

      const stats = dictionary.getStats();

      expect(stats.dictionarySize).toBeGreaterThan(0);
      expect(stats.isLoaded).toBe(true);
    });
  });

  describe('Bug: Common words showing as unknown', () => {
    beforeEach(async () => {
      await dictionary.initialize();
    });

    test('should recognize "dispute" as a common word', () => {
      expect(dictionary.isCommonWord('dispute')).toBe(true);
      expect(dictionary.isCommonWord('Dispute')).toBe(true);
    });

    test('nationality adjectives are now filtered by POS tagging (not in dictionary)', () => {
      // These are no longer in the dictionary - POS tagging filters them instead
      expect(dictionary.isCommonWord('American')).toBe(false);
      expect(dictionary.isCommonWord('Russian')).toBe(false);
      expect(dictionary.isCommonWord('French')).toBe(false);
      expect(dictionary.isCommonWord('British')).toBe(false);
      expect(dictionary.isCommonWord('German')).toBe(false);
      expect(dictionary.isCommonWord('Chinese')).toBe(false);
    });
  });
});
