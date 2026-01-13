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

  describe('Consistent Transformations', () => {
    describe('resetMultipliers', () => {
      test('should set money multiplier and date offset', () => {
        replacer.resetMultipliers();
        expect(replacer.moneyMultiplier).not.toBeNull();
        expect(replacer.dateOffset).not.toBeNull();
      });

      test('should ensure multiplier is not exactly 1.0', () => {
        replacer.resetMultipliers();
        expect(Math.abs(replacer.moneyMultiplier - 1.0)).toBeGreaterThanOrEqual(0.01);
      });

      test('should ensure date offset is not 0', () => {
        replacer.resetMultipliers();
        expect(replacer.dateOffset).not.toBe(0);
      });

      test('should generate date offset within expected range', () => {
        replacer.resetMultipliers();
        expect(replacer.dateOffset).toBeGreaterThanOrEqual(-60);
        expect(replacer.dateOffset).toBeLessThanOrEqual(60);
      });
    });

    describe('Money and Quantity Consistency', () => {
      test('should use same multiplier for money and quantities', () => {
        replacer.resetMultipliers();

        const money1 = replacer.replaceMoney('$100.00');
        const money2 = replacer.replaceMoney('$200.00');
        const quantity1 = replacer.replaceQuantity('100 kg');
        const quantity2 = replacer.replaceQuantity('200 kg');

        // Extract numeric values
        const moneyValue1 = parseFloat(money1.replace('$', '').replace(',', ''));
        const moneyValue2 = parseFloat(money2.replace('$', '').replace(',', ''));
        const quantityValue1 = parseFloat(quantity1.replace(' kg', ''));
        const quantityValue2 = parseFloat(quantity2.replace(' kg', ''));

        // Calculate ratios
        const moneyRatio = moneyValue2 / moneyValue1;
        const quantityRatio = quantityValue2 / quantityValue1;

        // Should be same ratio (within floating point tolerance)
        // Using 0.02 (2%) tolerance to account for rounding in toFixed()
        expect(Math.abs(moneyRatio - quantityRatio)).toBeLessThan(0.02);
      });

      test('should apply consistent growth rate across all money and quantity values', () => {
        replacer.resetMultipliers();

        // Test multiple values
        const values = ['$50.00', '$100.00', '$150.00', '50 units', '100 units', '150 units'];
        const replacements = values.map((v) =>
          v.includes('$') ? replacer.replaceMoney(v) : replacer.replaceQuantity(v)
        );

        // Extract all numeric values
        const numericValues = replacements.map((r) =>
          parseFloat(r.replace(/[$,]/g, '').replace(/ units/g, ''))
        );

        // Calculate all ratios (should all be close to the same multiplier)
        const ratio1 = numericValues[1] / 100; // $100 replacement / 100
        const ratio2 = numericValues[4] / 100; // 100 units replacement / 100

        // Money and quantity should use same multiplier
        expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.01);
      });
    });

    describe('Date Consistency', () => {
      test('should add same number of days to all dates', () => {
        replacer.resetMultipliers();

        const date1 = replacer.replaceDate('1/15/2024');
        const date2 = replacer.replaceDate('2/15/2024');

        // Parse replaced dates
        const [m1, d1, y1] = date1.split('/').map(Number);
        const [m2, d2, y2] = date2.split('/').map(Number);

        const replaced1 = new Date(y1, m1 - 1, d1);
        const replaced2 = new Date(y2, m2 - 1, d2);
        const original1 = new Date(2024, 0, 15); // Jan 15, 2024
        const original2 = new Date(2024, 1, 15); // Feb 15, 2024

        // Calculate day differences (use Math.round to handle timezone/DST issues)
        const diff1 = Math.round((replaced1 - original1) / (1000 * 60 * 60 * 24));
        const diff2 = Math.round((replaced2 - original2) / (1000 * 60 * 60 * 24));

        // Should be same offset
        expect(diff1).toBe(diff2);
      });

      test('should consistently shift multiple dates', () => {
        replacer.resetMultipliers();

        // Test with different date formats
        const dates = ['1/1/2024', '6/15/2024', '12/31/2024'];
        const replacedDates = dates.map((d) => replacer.replaceDate(d));

        // Parse all dates
        const originalDates = [new Date(2024, 0, 1), new Date(2024, 5, 15), new Date(2024, 11, 31)];

        const parsedReplacements = replacedDates.map((d) => {
          const [m, day, y] = d.split('/').map(Number);
          return new Date(y, m - 1, day);
        });

        // Calculate offsets (use Math.round to handle timezone/DST issues)
        const offsets = originalDates.map((orig, i) => {
          const replaced = parsedReplacements[i];
          return Math.round((replaced - orig) / (1000 * 60 * 60 * 24));
        });

        // All offsets should be the same
        expect(offsets[0]).toBe(offsets[1]);
        expect(offsets[1]).toBe(offsets[2]);
      });

      test('should ensure dates always change', () => {
        replacer.resetMultipliers();

        const originalDate = '3/15/2024';
        const replacedDate = replacer.replaceDate(originalDate);

        expect(replacedDate).not.toBe(originalDate);
      });
    });
  });
});
