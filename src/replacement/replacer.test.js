/**
 * Replacer Tests
 */

import { Replacer } from './replacer.js';

describe('Replacer', () => {
  let replacer;

  beforeEach(() => {
    replacer = new Replacer();
  });

  describe('Initialization', () => {
    test('should initialize with pools', () => {
      expect(replacer.namePool).toBeDefined();
      expect(replacer.companyPool).toBeDefined();
      expect(replacer.patternMatcher).toBeDefined();
    });
  });

  describe('replaceProperNoun', () => {
    test('should replace person name', () => {
      const replacement = replacer.replaceProperNoun('John Doe', 'person');
      expect(typeof replacement).toBe('string');
      expect(replacement.length).toBeGreaterThan(0);
      expect(replacement).not.toBe('John Doe');
    });

    test('should replace company name', () => {
      const replacement = replacer.replaceProperNoun('Acme Corp', 'company');
      expect(typeof replacement).toBe('string');
      expect(replacement).not.toBe('Acme Corp');
    });

    test('should auto-detect company', () => {
      const replacement = replacer.replaceProperNoun('Tech Inc', 'auto');
      expect(typeof replacement).toBe('string');
    });

    test('should auto-detect person', () => {
      const replacement = replacer.replaceProperNoun('Jane Smith', 'auto');
      expect(typeof replacement).toBe('string');
    });
  });

  describe('replaceMoney', () => {
    test('should replace money with variance', () => {
      const replacement = replacer.replaceMoney('$100.00');
      expect(replacement).toMatch(/^\$\d+\.\d{2}$/);
      expect(replacement).not.toBe('$100.00');
    });

    test('should preserve currency symbol', () => {
      const replacement = replacer.replaceMoney('$1,234.56');
      expect(replacement).toContain('$');
    });

    test('should preserve commas', () => {
      const replacement = replacer.replaceMoney('$1,000.00');
      expect(replacement).toMatch(/\$\d{1,3}(,\d{3})*\.\d{2}/);
    });

    test('should return original if no match', () => {
      const replacement = replacer.replaceMoney('not money');
      expect(replacement).toBe('not money');
    });
  });

  describe('replaceQuantity', () => {
    test('should replace quantity with variance', () => {
      const replacement = replacer.replaceQuantity('100 items');
      expect(replacement).toMatch(/\d+(\.\d+)? items/);
      expect(replacement).not.toBe('100 items');
    });

    test('should preserve unit', () => {
      const replacement = replacer.replaceQuantity('25.5 kg');
      expect(replacement).toContain('kg');
    });

    test('should return original if no match', () => {
      const replacement = replacer.replaceQuantity('not a quantity');
      expect(replacement).toBe('not a quantity');
    });
  });

  describe('replaceEmail', () => {
    test('should generate valid email format', () => {
      const replacement = replacer.replaceEmail('test@example.com');
      expect(replacement).toMatch(/^[a-z.]+@[a-z0-9-]+\.[a-z]{2,}$/);
      expect(replacement).not.toBe('test@example.com');
    });

    test('should use random names', () => {
      const emails = new Set();
      for (let i = 0; i < 10; i++) {
        emails.add(replacer.replaceEmail('test@example.com'));
      }
      expect(emails.size).toBeGreaterThan(1);
    });
  });

  describe('replacePhone', () => {
    test('should preserve phone format', () => {
      const replacement = replacer.replacePhone('(555) 123-4567');
      expect(replacement).toMatch(/\(\d{3}\) \d{3}-\d{4}/);
      expect(replacement).not.toBe('(555) 123-4567');
    });

    test('should handle dash format', () => {
      const replacement = replacer.replacePhone('555-123-4567');
      expect(replacement).toMatch(/\d{3}-\d{3}-\d{4}/);
    });

    test('should handle international format', () => {
      const replacement = replacer.replacePhone('+1-555-123-4567');
      expect(replacement).toContain('+1');
    });

    test('should return original if no match', () => {
      const replacement = replacer.replacePhone('not a phone');
      expect(replacement).toBe('not a phone');
    });
  });

  describe('replaceURL', () => {
    test('should generate valid URL', () => {
      const replacement = replacer.replaceURL('https://example.com');
      expect(replacement).toMatch(/^https?:\/\/[a-z0-9-]+\.[a-z]{2,}/);
      expect(replacement).not.toBe('https://example.com');
    });

    test('should preserve protocol', () => {
      const replacement = replacer.replaceURL('https://test.com');
      expect(replacement).toContain('https://');
    });
  });

  describe('replaceAddress', () => {
    test('should generate street address format', () => {
      const replacement = replacer.replaceAddress('123 Main St');
      expect(replacement).toMatch(/\d+ [A-Za-z]+ (St|Ave|Rd|Blvd|Dr|Ln|Ct|Way)/);
      expect(replacement).not.toBe('123 Main St');
    });

    test('should vary street numbers', () => {
      const addresses = new Set();
      for (let i = 0; i < 10; i++) {
        addresses.add(replacer.replaceAddress('123 Main St'));
      }
      expect(addresses.size).toBeGreaterThan(1);
    });
  });

  describe('replaceDate', () => {
    test('should replace date', () => {
      const replacement = replacer.replaceDate('2026-01-15');
      expect(replacement).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(replacement).not.toBe('2026-01-15');
    });

    test('should preserve US format with zero-padding', () => {
      const replacement = replacer.replaceDate('01/15/2026');
      expect(replacement).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    test('should preserve US format with single digits (e.g., 1/1/2026)', () => {
      const replacement = replacer.replaceDate('1/1/2026');
      // Should match pattern: M/D/YYYY or MM/DD/YYYY (single or double digit month/day)
      expect(replacement).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
      expect(replacement).not.toBe('1/1/2026');
      // Should NOT be ISO format
      expect(replacement).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Should NOT have zero-padding if original didn't
      expect(replacement).not.toMatch(/^0\d\//);
    });

    test('should preserve textual date format (e.g., Dec 9, 2025)', () => {
      const replacement = replacer.replaceDate('Dec 9, 2025');
      // Should match pattern: MonthName Day, Year (e.g., "Jan 15, 2025")
      expect(replacement).toMatch(/^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/);
      expect(replacement).not.toBe('Dec 9, 2025');
      // Should NOT be ISO format
      expect(replacement).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should preserve textual date format (e.g., January 8, 2026)', () => {
      const replacement = replacer.replaceDate('January 8, 2026');
      // Should match pattern: FullMonthName Day, Year (e.g., "February 15, 2026")
      expect(replacement).toMatch(/^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}$/);
      expect(replacement).not.toBe('January 8, 2026');
      // Should NOT be ISO format
      expect(replacement).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return original if invalid', () => {
      const replacement = replacer.replaceDate('not a date');
      expect(replacement).toBe('not a date');
    });
  });

  describe('replaceSSN', () => {
    test('should preserve SSN format', () => {
      const replacement = replacer.replaceSSN('123-45-6789');
      expect(replacement).toMatch(/\d{3}-\d{2}-\d{4}/);
      expect(replacement).not.toBe('123-45-6789');
    });

    test('should handle no-dash format', () => {
      const replacement = replacer.replaceSSN('123456789');
      expect(replacement).toMatch(/\d{9}/);
    });
  });

  describe('replaceCreditCard', () => {
    test('should preserve credit card format', () => {
      const replacement = replacer.replaceCreditCard('4532-1234-5678-9010');
      expect(replacement).toMatch(/\d{4}-\d{4}-\d{4}-\d{4}/);
      expect(replacement).not.toBe('4532-1234-5678-9010');
    });

    test('should handle no-dash format', () => {
      const replacement = replacer.replaceCreditCard('4532123456789010');
      expect(replacement).toMatch(/\d{16}/);
    });
  });

  describe('replaceIPAddress', () => {
    test('should generate valid IPv4', () => {
      const replacement = replacer.replaceIPAddress('192.168.1.100');
      expect(replacement).toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
      expect(replacement).not.toBe('192.168.1.100');
    });

    test('should handle IPv6', () => {
      const replacement = replacer.replaceIPAddress('2001:0db8:85a3::8a2e:0370:7334');
      expect(replacement).toContain(':');
    });
  });

  describe('applyReplacements', () => {
    test('should apply multiple replacements', () => {
      const text = 'Contact John at john@example.com';
      const entities = [
        { type: 'properNoun', original: 'John', start: 8, end: 12 },
        { type: 'email', original: 'john@example.com', start: 16, end: 32 },
      ];
      const consistencyMap = new Map();

      const result = replacer.applyReplacements(text, entities, consistencyMap);

      expect(result).not.toBe(text);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should use consistency map', () => {
      const text = 'John and John';
      const entities = [
        { type: 'properNoun', original: 'John', start: 0, end: 4 },
        { type: 'properNoun', original: 'John', start: 9, end: 13 },
      ];
      const consistencyMap = new Map();

      const result = replacer.applyReplacements(text, entities, consistencyMap);

      // Both "John" should be replaced with the same name
      const parts = result.split(' and ');
      expect(parts[0]).toBe(parts[1]);
    });

    test('should handle overlapping entities correctly', () => {
      const text = 'Test string';
      const entities = [{ type: 'properNoun', original: 'Test', start: 0, end: 4 }];
      const consistencyMap = new Map();

      expect(() => {
        replacer.applyReplacements(text, entities, consistencyMap);
      }).not.toThrow();
    });

    test('should return original text with empty entities', () => {
      const text = 'Test string';
      const entities = [];
      const consistencyMap = new Map();

      const result = replacer.applyReplacements(text, entities, consistencyMap);
      expect(result).toBe(text);
    });
  });
});
