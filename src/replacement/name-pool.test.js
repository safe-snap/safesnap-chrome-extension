/**
 * NamePool Tests
 */

import { NamePool } from './name-pool.js';

describe('NamePool', () => {
  let namePool;

  beforeEach(() => {
    namePool = new NamePool();
  });

  describe('Initialization', () => {
    test('should initialize with first names', () => {
      expect(namePool.firstNames.male.length).toBeGreaterThan(0);
      expect(namePool.firstNames.female.length).toBeGreaterThan(0);
    });

    test('should initialize with surnames', () => {
      expect(namePool.lastNames.length).toBeGreaterThan(0);
    });

    test('should have at least 100 total first names', () => {
      const total = namePool.firstNames.male.length + namePool.firstNames.female.length;
      expect(total).toBeGreaterThanOrEqual(100);
    });

    test('should have at least 100 surnames', () => {
      expect(namePool.lastNames.length).toBeGreaterThanOrEqual(100);
    });
  });

  describe('getRandomFirstName', () => {
    test('should return a string', () => {
      const name = namePool.getRandomFirstName();
      expect(typeof name).toBe('string');
    });

    test('should return a name from the pool', () => {
      const name = namePool.getRandomFirstName();
      const allNames = [...namePool.firstNames.male, ...namePool.firstNames.female];
      expect(allNames).toContain(name);
    });

    test('should return different names on multiple calls', () => {
      const names = new Set();
      for (let i = 0; i < 20; i++) {
        names.add(namePool.getRandomFirstName());
      }
      // Should have at least a few different names
      expect(names.size).toBeGreaterThan(1);
    });

    test('should accept gender parameter', () => {
      const maleName = namePool.getRandomFirstName('male');
      expect(namePool.firstNames.male).toContain(maleName);

      const femaleName = namePool.getRandomFirstName('female');
      expect(namePool.firstNames.female).toContain(femaleName);
    });

    test('should handle invalid gender gracefully', () => {
      const name = namePool.getRandomFirstName('invalid');
      const allNames = [...namePool.firstNames.male, ...namePool.firstNames.female];
      expect(allNames).toContain(name);
    });
  });

  describe('getRandomSurname', () => {
    test('should return a string', () => {
      const surname = namePool.getRandomSurname();
      expect(typeof surname).toBe('string');
    });

    test('should return a surname from the pool', () => {
      const surname = namePool.getRandomSurname();
      expect(namePool.lastNames).toContain(surname);
    });

    test('should return different surnames on multiple calls', () => {
      const surnames = new Set();
      for (let i = 0; i < 20; i++) {
        surnames.add(namePool.getRandomSurname());
      }
      expect(surnames.size).toBeGreaterThan(1);
    });
  });

  describe('getRandomFullName', () => {
    test('should return a full name with space', () => {
      const fullName = namePool.getRandomFullName();
      expect(fullName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    });

    test('should contain first name and surname', () => {
      const fullName = namePool.getRandomFullName();
      const [firstName, lastName] = fullName.split(' ');

      const allFirstNames = [...namePool.firstNames.male, ...namePool.firstNames.female];
      expect(allFirstNames).toContain(firstName);
      expect(namePool.lastNames).toContain(lastName);
    });

    test('should return different full names on multiple calls', () => {
      const names = new Set();
      for (let i = 0; i < 20; i++) {
        names.add(namePool.getRandomFullName());
      }
      expect(names.size).toBeGreaterThan(1);
    });

    test('should accept gender parameter', () => {
      const maleName = namePool.getRandomFullName('male');
      const firstName = maleName.split(' ')[0];
      expect(namePool.firstNames.male).toContain(firstName);

      const femaleName = namePool.getRandomFullName('female');
      const femaleFirstName = femaleName.split(' ')[0];
      expect(namePool.firstNames.female).toContain(femaleFirstName);
    });
  });

  describe('Data Quality', () => {
    test('all male first names should be capitalized', () => {
      namePool.firstNames.male.forEach((name) => {
        expect(name[0]).toBe(name[0].toUpperCase());
      });
    });

    test('all female first names should be capitalized', () => {
      namePool.firstNames.female.forEach((name) => {
        expect(name[0]).toBe(name[0].toUpperCase());
      });
    });

    test('all surnames should be capitalized', () => {
      namePool.lastNames.forEach((name) => {
        expect(name[0]).toBe(name[0].toUpperCase());
      });
    });

    test('should not have duplicate male first names', () => {
      const unique = new Set(namePool.firstNames.male);
      expect(unique.size).toBe(namePool.firstNames.male.length);
    });

    test('should not have duplicate female first names', () => {
      const unique = new Set(namePool.firstNames.female);
      expect(unique.size).toBe(namePool.firstNames.female.length);
    });

    test('should not have duplicate surnames', () => {
      const unique = new Set(namePool.lastNames);
      expect(unique.size).toBe(namePool.lastNames.length);
    });

    test('names should not contain special characters', () => {
      const allNames = [
        ...namePool.firstNames.male,
        ...namePool.firstNames.female,
        ...namePool.lastNames,
      ];

      allNames.forEach((name) => {
        expect(name).toMatch(/^[A-Za-z]+$/);
      });
    });

    test('names should be reasonable length', () => {
      const allNames = [
        ...namePool.firstNames.male,
        ...namePool.firstNames.female,
        ...namePool.lastNames,
      ];

      allNames.forEach((name) => {
        expect(name.length).toBeGreaterThanOrEqual(2);
        expect(name.length).toBeLessThanOrEqual(15);
      });
    });
  });

  describe('Randomness', () => {
    test('should produce varied distribution of first names', () => {
      const counts = {};
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const name = namePool.getRandomFirstName();
        counts[name] = (counts[name] || 0) + 1;
      }

      // Should use at least 20% of available names
      const allNames = [...namePool.firstNames.male, ...namePool.firstNames.female];
      expect(Object.keys(counts).length).toBeGreaterThan(allNames.length * 0.2);
    });

    test('should produce varied distribution of surnames', () => {
      const counts = {};
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const name = namePool.getRandomSurname();
        counts[name] = (counts[name] || 0) + 1;
      }

      // Should use at least 20% of available surnames
      expect(Object.keys(counts).length).toBeGreaterThan(namePool.lastNames.length * 0.2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle gender parameter with different cases', () => {
      const name1 = namePool.getRandomFirstName('Male');
      expect(namePool.firstNames.male).toContain(name1);

      const name2 = namePool.getRandomFirstName('FEMALE');
      expect(namePool.firstNames.female).toContain(name2);
    });

    test('should handle null gender parameter', () => {
      const name = namePool.getRandomFirstName(null);
      const allNames = [...namePool.firstNames.male, ...namePool.firstNames.female];
      expect(allNames).toContain(name);
    });

    test('should handle undefined gender parameter', () => {
      const name = namePool.getRandomFirstName(undefined);
      const allNames = [...namePool.firstNames.male, ...namePool.firstNames.female];
      expect(allNames).toContain(name);
    });
  });

  describe('getRandomNames', () => {
    test('should return array of specified length', () => {
      const names = namePool.getRandomNames(5);
      expect(names).toHaveLength(5);
    });

    test('should return unique names', () => {
      const names = namePool.getRandomNames(10);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(10);
    });

    test('should accept gender parameter', () => {
      const names = namePool.getRandomNames(3, 'male');
      names.forEach((fullName) => {
        const firstName = fullName.split(' ')[0];
        expect(namePool.firstNames.male).toContain(firstName);
      });
    });
  });

  describe('isLikelyName', () => {
    test('should return true for first names', () => {
      expect(namePool.isLikelyName('John')).toBe(true);
      expect(namePool.isLikelyName('Mary')).toBe(true);
    });

    test('should return true for last names', () => {
      expect(namePool.isLikelyName('Smith')).toBe(true);
      expect(namePool.isLikelyName('Johnson')).toBe(true);
    });

    test('should return false for lowercase words', () => {
      expect(namePool.isLikelyName('john')).toBe(false);
      expect(namePool.isLikelyName('smith')).toBe(false);
    });

    test('should return false for all caps words', () => {
      expect(namePool.isLikelyName('JOHN')).toBe(false);
    });

    test('should return false for unknown names', () => {
      expect(namePool.isLikelyName('Xyz')).toBe(false);
    });

    test('should return false for words with special characters', () => {
      expect(namePool.isLikelyName('John-Smith')).toBe(false);
      expect(namePool.isLikelyName("O'Brien")).toBe(false);
    });
  });
});
