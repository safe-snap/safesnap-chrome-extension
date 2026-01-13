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
    // Restore default mock implementations
    global.chrome.storage.local.get.mockImplementation((keys, callback) => callback({}));
    global.chrome.storage.local.set.mockImplementation((data, callback) => callback && callback());
    global.chrome.storage.local.remove.mockImplementation(
      (keys, callback) => callback && callback()
    );
  });

  describe('Initialization', () => {
    test('should initialize with empty dictionaries', () => {
      expect(dictionary.coreDictionary.size).toBe(0);
      expect(dictionary.fullDictionary.size).toBe(0);
      expect(dictionary.isCoreDictionaryLoaded).toBe(false);
      expect(dictionary.isFullDictionaryLoaded).toBe(false);
    });

    test('should initialize with zero usage count', () => {
      expect(dictionary.usageCount).toBe(0);
    });
  });

  describe('loadCoreDictionary', () => {
    test('should load core dictionary', async () => {
      await dictionary.loadCoreDictionary();

      expect(dictionary.isCoreDictionaryLoaded).toBe(true);
      expect(dictionary.coreDictionary.size).toBeGreaterThan(0);
    });

    test('should have common words', async () => {
      await dictionary.loadCoreDictionary();

      expect(dictionary.coreDictionary.has('the')).toBe(true);
      expect(dictionary.coreDictionary.has('and')).toBe(true);
      expect(dictionary.coreDictionary.has('is')).toBe(true);
    });

    test('should handle load errors gracefully', async () => {
      await expect(dictionary.loadCoreDictionary()).resolves.not.toThrow();
    });
  });

  describe('initialize', () => {
    test('should load core dictionary on initialize', async () => {
      await dictionary.initialize();

      expect(dictionary.isCoreDictionaryLoaded).toBe(true);
      expect(dictionary.coreDictionary.size).toBeGreaterThan(0);
    });

    test('should not reload if already initialized', async () => {
      await dictionary.initialize();
      const firstSize = dictionary.coreDictionary.size;

      await dictionary.initialize();

      expect(dictionary.coreDictionary.size).toBe(firstSize);
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
      expect(dictionary.isCommonWord('cryptocurrency')).toBe(false);
    });

    test('should be case-insensitive', () => {
      expect(dictionary.isCommonWord('The')).toBe(true);
      expect(dictionary.isCommonWord('THE')).toBe(true);
      expect(dictionary.isCommonWord('ThE')).toBe(true);
    });

    test('should trim whitespace', () => {
      expect(dictionary.isCommonWord('  the  ')).toBe(true);
    });
  });

  describe('isCommonPhrase', () => {
    beforeEach(async () => {
      await dictionary.initialize();
    });

    test('should return true if all words are common', () => {
      expect(dictionary.isCommonPhrase('the big house')).toBe(true);
    });

    test('should return false if any word is uncommon', () => {
      expect(dictionary.isCommonPhrase('the Acme Corporation')).toBe(false);
    });

    test('should handle single word phrases', () => {
      expect(dictionary.isCommonPhrase('computer')).toBe(true);
      expect(dictionary.isCommonPhrase('Xerxes')).toBe(false);
    });

    test('should handle empty phrases', () => {
      expect(dictionary.isCommonPhrase('')).toBe(true);
    });
  });

  describe('incrementUsage', () => {
    test('should increment usage count', () => {
      expect(dictionary.getUsageCount()).toBe(0);

      dictionary.incrementUsage();
      expect(dictionary.getUsageCount()).toBe(1);

      dictionary.incrementUsage();
      expect(dictionary.getUsageCount()).toBe(2);
    });

    test('should suggest download after threshold', () => {
      for (let i = 0; i < 4; i++) {
        const suggest = dictionary.incrementUsage();
        expect(suggest).toBe(false);
      }

      const suggest = dictionary.incrementUsage();
      expect(suggest).toBe(true);
    });

    test('should not suggest if full dictionary is loaded', async () => {
      dictionary.isFullDictionaryLoaded = true;

      for (let i = 0; i < 10; i++) {
        const suggest = dictionary.incrementUsage();
        expect(suggest).toBe(false);
      }
    });
  });

  describe('getUsageCount', () => {
    test('should return current usage count', () => {
      expect(dictionary.getUsageCount()).toBe(0);

      dictionary.incrementUsage();
      dictionary.incrementUsage();
      dictionary.incrementUsage();

      expect(dictionary.getUsageCount()).toBe(3);
    });
  });

  describe('downloadFullDictionary', () => {
    test('should download and cache dictionary', async () => {
      const result = await dictionary.downloadFullDictionary();

      expect(result).toBe(true);
      expect(dictionary.isFullDictionaryLoaded).toBe(true);
      expect(dictionary.fullDictionary.size).toBeGreaterThan(0);
    });

    test('should save to storage', async () => {
      await dictionary.downloadFullDictionary();

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('should handle download errors', async () => {
      // Mock console.error to suppress expected error output in tests
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      chrome.storage.local.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await dictionary.downloadFullDictionary();
      expect(result).toBe(false);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SafeSnap Dictionary] Failed to download full dictionary:'),
        expect.any(Error)
      );

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadFullDictionary', () => {
    test('should load from cache if available', async () => {
      const mockData = ['word1', 'word2', 'word3'];
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ fullDictionary: mockData });
      });

      await dictionary.loadFullDictionary();

      expect(dictionary.isFullDictionaryLoaded).toBe(true);
      expect(dictionary.fullDictionary.size).toBe(3);
    });

    test('should not reload if already loaded', async () => {
      dictionary.isFullDictionaryLoaded = true;
      const spy = jest.spyOn(chrome.storage.local, 'get');

      await dictionary.loadFullDictionary();

      expect(spy).not.toHaveBeenCalled();
    });

    test('should handle cache miss gracefully', async () => {
      await expect(dictionary.loadFullDictionary()).resolves.not.toThrow();
    });
  });

  describe('clearFullDictionary', () => {
    test('should clear full dictionary from memory', async () => {
      await dictionary.downloadFullDictionary();
      expect(dictionary.fullDictionary.size).toBeGreaterThan(0);

      await dictionary.clearFullDictionary();

      expect(dictionary.fullDictionary.size).toBe(0);
      expect(dictionary.isFullDictionaryLoaded).toBe(false);
    });

    test('should remove from storage', async () => {
      await dictionary.clearFullDictionary();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(
        ['fullDictionary'],
        expect.any(Function)
      );
    });
  });

  describe('getStats', () => {
    test('should return dictionary statistics', async () => {
      await dictionary.initialize();

      const stats = dictionary.getStats();

      expect(stats).toHaveProperty('coreDictionarySize');
      expect(stats).toHaveProperty('fullDictionarySize');
      expect(stats).toHaveProperty('isCoreDictionaryLoaded');
      expect(stats).toHaveProperty('isFullDictionaryLoaded');
      expect(stats).toHaveProperty('usageCount');
    });

    test('should reflect current state', async () => {
      await dictionary.initialize();
      dictionary.incrementUsage();
      dictionary.incrementUsage();

      const stats = dictionary.getStats();

      expect(stats.isCoreDictionaryLoaded).toBe(true);
      expect(stats.coreDictionarySize).toBeGreaterThan(0);
      expect(stats.usageCount).toBe(2);
    });
  });

  describe('_getMinimalCoreWords', () => {
    test('should return array of common words', () => {
      const words = dictionary._getMinimalCoreWords();

      expect(Array.isArray(words)).toBe(true);
      expect(words.length).toBeGreaterThan(100);
    });

    test('should include essential words', () => {
      const words = dictionary._getMinimalCoreWords();

      expect(words).toContain('the');
      expect(words).toContain('and');
      expect(words).toContain('is');
      expect(words).toContain('are');
    });

    test('should not have duplicates', () => {
      const words = dictionary._getMinimalCoreWords();
      const unique = new Set(words);

      expect(unique.size).toBe(words.length);
    });
  });

  describe('_getExtendedWords', () => {
    test('should return array of additional words', () => {
      const words = dictionary._getExtendedWords();

      expect(Array.isArray(words)).toBe(true);
      expect(words.length).toBeGreaterThan(0);
    });

    test('should not duplicate core words', () => {
      const coreWords = new Set(dictionary._getMinimalCoreWords());
      const extendedWords = dictionary._getExtendedWords();

      // Some overlap is acceptable, but extended should have unique words
      const uniqueExtended = extendedWords.filter((word) => !coreWords.has(word));
      expect(uniqueExtended.length).toBeGreaterThan(0);
    });
  });

  describe('Storage Integration', () => {
    test('_getFromStorage should retrieve data', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ testKey: 'testValue' });
      });

      const result = await dictionary._getFromStorage('testKey');
      expect(result).toBe('testValue');
    });

    test('_saveToStorage should save data', async () => {
      await dictionary._saveToStorage('testKey', 'testValue');

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { testKey: 'testValue' },
        expect.any(Function)
      );
    });

    test('_removeFromStorage should remove data', async () => {
      await dictionary._removeFromStorage('testKey');

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['testKey'], expect.any(Function));
    });

    test('should handle storage unavailable', async () => {
      const originalChrome = global.chrome;
      global.chrome = undefined;

      const result = await dictionary._getFromStorage('testKey');
      expect(result).toBeNull();

      global.chrome = originalChrome;
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long words', async () => {
      await dictionary.initialize();

      const longWord = 'a'.repeat(1000);
      expect(dictionary.isCommonWord(longWord)).toBe(false);
    });

    test('should handle empty string', async () => {
      await dictionary.initialize();

      expect(dictionary.isCommonWord('')).toBe(false);
    });

    test('should handle special characters', async () => {
      await dictionary.initialize();

      expect(dictionary.isCommonWord('test@#$')).toBe(false);
    });

    test('should handle unicode characters', async () => {
      await dictionary.initialize();

      expect(dictionary.isCommonWord('café')).toBe(false);
    });

    test('should handle numbers', async () => {
      await dictionary.initialize();

      expect(dictionary.isCommonWord('123')).toBe(false);
    });
  });

  describe('Performance', () => {
    test('should lookup words quickly', async () => {
      await dictionary.initialize();

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        dictionary.isCommonWord('the');
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    test('should handle large phrase lookup efficiently', async () => {
      await dictionary.initialize();

      const phrase = 'the quick brown fox jumps over the lazy dog';

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        dictionary.isCommonPhrase(phrase);
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
