/**
 * ConsistencyMapper Tests
 */

import { ConsistencyMapper } from './consistency-mapper.js';

describe('ConsistencyMapper', () => {
  let mapper;

  beforeEach(() => {
    mapper = new ConsistencyMapper();
  });

  describe('Initialization', () => {
    test('should initialize with empty map', () => {
      expect(mapper.size()).toBe(0);
    });

    test('should initialize with empty related entities', () => {
      expect(mapper.relatedEntities.size).toBe(0);
    });
  });

  describe('set and get', () => {
    test('should store and retrieve replacement', () => {
      mapper.set('email', 'john@example.com', 'jane@test.com');
      const result = mapper.get('email', 'john@example.com');

      expect(result).toBe('jane@test.com');
    });

    test('should be case-insensitive', () => {
      mapper.set('properNoun', 'John Doe', 'Jane Smith');

      expect(mapper.get('properNoun', 'john doe')).toBe('Jane Smith');
      expect(mapper.get('properNoun', 'JOHN DOE')).toBe('Jane Smith');
      expect(mapper.get('properNoun', 'JoHn DoE')).toBe('Jane Smith');
    });

    test('should trim whitespace', () => {
      mapper.set('properNoun', '  John Doe  ', 'Jane Smith');

      expect(mapper.get('properNoun', 'John Doe')).toBe('Jane Smith');
    });

    test('should return null for non-existent key', () => {
      const result = mapper.get('email', 'nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('has', () => {
    test('should return true for existing mapping', () => {
      mapper.set('phone', '555-1234', '555-9999');
      expect(mapper.has('phone', '555-1234')).toBe(true);
    });

    test('should return false for non-existent mapping', () => {
      expect(mapper.has('phone', '555-0000')).toBe(false);
    });

    test('should be case-insensitive', () => {
      mapper.set('properNoun', 'John Doe', 'Jane Smith');
      expect(mapper.has('properNoun', 'john doe')).toBe(true);
    });
  });

  describe('linkRelated', () => {
    test('should link two entities bidirectionally', () => {
      mapper.linkRelated('properNoun', 'Acme Corp', 'url', 'acme.com');

      const related1 = mapper.getRelated('properNoun', 'Acme Corp');
      const related2 = mapper.getRelated('url', 'acme.com');

      expect(related1).toContain('url:acme.com');
      expect(related2).toContain('properNoun:acme corp');
    });

    test('should handle multiple related entities', () => {
      mapper.linkRelated('properNoun', 'John Doe', 'email', 'john@example.com');
      mapper.linkRelated('properNoun', 'John Doe', 'phone', '555-1234');

      const related = mapper.getRelated('properNoun', 'John Doe');
      expect(related).toHaveLength(2);
      expect(related).toContain('email:john@example.com');
      expect(related).toContain('phone:555-1234');
    });
  });

  describe('getRelated', () => {
    test('should return empty array for entity with no relations', () => {
      const related = mapper.getRelated('email', 'test@example.com');
      expect(related).toEqual([]);
    });

    test('should return all related entities', () => {
      mapper.linkRelated('properNoun', 'Tech Corp', 'url', 'techcorp.com');
      mapper.linkRelated('properNoun', 'Tech Corp', 'email', 'info@techcorp.com');

      const related = mapper.getRelated('properNoun', 'Tech Corp');
      expect(related).toHaveLength(2);
    });
  });

  describe('propagateToRelated', () => {
    test('should propagate company to domain', () => {
      mapper.linkRelated('properNoun', 'TechFlow Inc', 'url', 'techflow.com');
      mapper.propagateToRelated('properNoun', 'TechFlow Inc', 'DataBridge Corp');

      const urlReplacement = mapper.get('url', 'techflow.com');
      expect(urlReplacement).toContain('databridge');
    });

    test('should propagate domain to company', () => {
      mapper.linkRelated('url', 'example.com', 'properNoun', 'Example Corp');
      mapper.propagateToRelated('url', 'example.com', 'testsite.com');

      const companyReplacement = mapper.get('properNoun', 'Example Corp');
      expect(companyReplacement).toContain('Testsite');
    });

    test('should propagate email to name', () => {
      mapper.linkRelated('email', 'john.doe@example.com', 'properNoun', 'John Doe');
      mapper.propagateToRelated('email', 'john.doe@example.com', 'jane.smith@test.com');

      const nameReplacement = mapper.get('properNoun', 'John Doe');
      expect(nameReplacement).toBeTruthy();
    });

    test('should propagate name to email', () => {
      mapper.linkRelated('properNoun', 'John Doe', 'email', 'john@example.com');
      mapper.propagateToRelated('properNoun', 'John Doe', 'Jane Smith');

      const emailReplacement = mapper.get('email', 'john@example.com');
      expect(emailReplacement).toBeTruthy();
    });
  });

  describe('clear', () => {
    test('should clear all mappings', () => {
      mapper.set('email', 'test1@example.com', 'replacement1@test.com');
      mapper.set('email', 'test2@example.com', 'replacement2@test.com');

      mapper.clear();

      expect(mapper.size()).toBe(0);
      expect(mapper.get('email', 'test1@example.com')).toBeNull();
    });

    test('should clear all relationships', () => {
      mapper.linkRelated('properNoun', 'Company', 'url', 'company.com');
      mapper.clear();

      expect(mapper.relatedEntities.size).toBe(0);
      expect(mapper.getRelated('properNoun', 'Company')).toEqual([]);
    });
  });

  describe('size', () => {
    test('should return correct size', () => {
      expect(mapper.size()).toBe(0);

      mapper.set('email', 'test1@example.com', 'rep1@test.com');
      expect(mapper.size()).toBe(1);

      mapper.set('email', 'test2@example.com', 'rep2@test.com');
      expect(mapper.size()).toBe(2);

      mapper.set('phone', '555-1234', '555-9999');
      expect(mapper.size()).toBe(3);
    });
  });

  describe('export and import', () => {
    test('should export mappings', () => {
      mapper.set('email', 'test@example.com', 'replacement@test.com');
      mapper.set('phone', '555-1234', '555-9999');

      const exported = mapper.export();

      expect(exported.mappings).toHaveLength(2);
      expect(exported.relations).toBeDefined();
    });

    test('should import mappings', () => {
      const data = {
        mappings: [
          ['email:test@example.com', 'replacement@test.com'],
          ['phone:555-1234', '555-9999'],
        ],
        relations: [],
      };

      mapper.import(data);

      expect(mapper.size()).toBe(2);
      expect(mapper.get('email', 'test@example.com')).toBe('replacement@test.com');
      expect(mapper.get('phone', '555-1234')).toBe('555-9999');
    });

    test('should preserve relationships on export/import', () => {
      mapper.linkRelated('properNoun', 'Company', 'url', 'company.com');

      const exported = mapper.export();
      const newMapper = new ConsistencyMapper();
      newMapper.import(exported);

      const related = newMapper.getRelated('properNoun', 'Company');
      expect(related).toContain('url:company.com');
    });
  });

  describe('autoLinkRelated', () => {
    test('should link companies with similar URLs', () => {
      const entities = [
        { type: 'properNoun', original: 'Acme Corp', start: 0, end: 9 },
        { type: 'url', original: 'https://acmecorp.com', start: 20, end: 40 },
      ];

      mapper.autoLinkRelated(entities);

      const related = mapper.getRelated('properNoun', 'Acme Corp');
      expect(related.length).toBeGreaterThan(0);
    });

    test('should link names with matching emails', () => {
      const entities = [
        { type: 'properNoun', original: 'John Doe', start: 0, end: 8 },
        { type: 'email', original: 'john.doe@example.com', start: 10, end: 30 },
      ];

      mapper.autoLinkRelated(entities);

      const related = mapper.getRelated('properNoun', 'John Doe');
      expect(related.some((r) => r.includes('email'))).toBe(true);
    });

    test('should handle empty entity list', () => {
      expect(() => {
        mapper.autoLinkRelated([]);
      }).not.toThrow();
    });

    test('should handle entities with no matches', () => {
      const entities = [
        { type: 'properNoun', original: 'Random Name', start: 0, end: 11 },
        { type: 'email', original: 'completely@different.com', start: 20, end: 44 },
      ];

      expect(() => {
        mapper.autoLinkRelated(entities);
      }).not.toThrow();
    });
  });

  describe('Private Helper Methods', () => {
    test('_looksLikeCompany should identify company names', () => {
      expect(mapper._looksLikeCompany('Acme Corp')).toBe(true);
      expect(mapper._looksLikeCompany('Tech Inc')).toBe(true);
      expect(mapper._looksLikeCompany('John Doe')).toBe(false);
    });

    test('_extractCompanyBase should remove suffixes', () => {
      const base = mapper._extractCompanyBase('Acme Corporation');
      expect(base.toLowerCase()).toBe('acme');
    });

    test('_extractDomainBase should extract base domain', () => {
      const base = mapper._extractDomainBase('https://www.example.com');
      expect(base).toBe('example');
    });

    test('_areSimilar should detect similar strings', () => {
      expect(mapper._areSimilar('acme', 'acme')).toBe(true);
      expect(mapper._areSimilar('acme', 'acmecorp')).toBe(true);
      expect(mapper._areSimilar('acme', 'xyz')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long entity names', () => {
      const longName = 'A'.repeat(1000);
      mapper.set('properNoun', longName, 'Short Name');

      expect(mapper.get('properNoun', longName)).toBe('Short Name');
    });

    test('should handle special characters in entity names', () => {
      mapper.set('properNoun', "O'Brien & Sons", 'Smith Inc');
      expect(mapper.get('properNoun', "O'Brien & Sons")).toBe('Smith Inc');
    });

    test('should handle unicode characters', () => {
      mapper.set('properNoun', 'Café François', 'Coffee Shop');
      expect(mapper.get('properNoun', 'Café François')).toBe('Coffee Shop');
    });

    test('should handle empty strings gracefully', () => {
      mapper.set('email', '', 'test@example.com');
      expect(mapper.get('email', '')).toBe('test@example.com');
    });

    test('should handle null replacement values', () => {
      mapper.set('email', 'test@example.com', null);
      expect(mapper.get('email', 'test@example.com')).toBeNull();
    });
  });

  describe('Performance', () => {
    test('should handle large number of mappings efficiently', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        mapper.set('email', `test${i}@example.com`, `rep${i}@test.com`);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(mapper.size()).toBe(1000);
    });

    test('should retrieve mappings quickly', () => {
      for (let i = 0; i < 1000; i++) {
        mapper.set('email', `test${i}@example.com`, `rep${i}@test.com`);
      }

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        mapper.get('email', `test${i}@example.com`);
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});
