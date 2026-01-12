/**
 * CompanyPool Tests
 */

import { CompanyPool } from './company-pool.js';

describe('CompanyPool', () => {
  let companyPool;

  beforeEach(() => {
    companyPool = new CompanyPool();
  });

  describe('Initialization', () => {
    test('should initialize with prefixes', () => {
      expect(companyPool.prefixes.length).toBeGreaterThan(0);
    });

    test('should initialize with company types', () => {
      expect(companyPool.companyTypes.length).toBeGreaterThan(0);
    });

    test('should initialize with suffixes', () => {
      expect(companyPool.suffixes.length).toBeGreaterThan(0);
    });

    test('should initialize with TLDs', () => {
      expect(companyPool.tlds.length).toBeGreaterThan(0);
    });

    test('should have at least 20 prefixes', () => {
      expect(companyPool.prefixes.length).toBeGreaterThanOrEqual(20);
    });

    test('should have at least 10 company types', () => {
      expect(companyPool.companyTypes.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getRandomCompany', () => {
    test('should return a string', () => {
      const company = companyPool.getRandomCompany();
      expect(typeof company).toBe('string');
    });

    test('should return a company name', () => {
      const company = companyPool.getRandomCompany();
      expect(company.length).toBeGreaterThan(0);
    });

    test('should return different companies on multiple calls', () => {
      const companies = new Set();
      for (let i = 0; i < 30; i++) {
        companies.add(companyPool.getRandomCompany());
      }
      expect(companies.size).toBeGreaterThan(5);
    });

    test('should sometimes include prefix', () => {
      let hasPrefix = false;
      for (let i = 0; i < 50; i++) {
        const company = companyPool.getRandomCompany();
        if (companyPool.prefixes.some((prefix) => company.startsWith(prefix))) {
          hasPrefix = true;
          break;
        }
      }
      expect(hasPrefix).toBe(true);
    });

    test('should sometimes include suffix', () => {
      let hasSuffix = false;
      for (let i = 0; i < 50; i++) {
        const company = companyPool.getRandomCompany();
        if (companyPool.suffixes.some((suffix) => company.includes(suffix))) {
          hasSuffix = true;
          break;
        }
      }
      expect(hasSuffix).toBe(true);
    });

    test('should include a company type', () => {
      const company = companyPool.getRandomCompany();
      const hasType = companyPool.companyTypes.some((type) => company.includes(type));
      expect(hasType).toBe(true);
    });
  });

  describe('getRandomDomain', () => {
    test('should return a string', () => {
      const domain = companyPool.getRandomDomain();
      expect(typeof domain).toBe('string');
    });

    test('should return a valid domain format', () => {
      const domain = companyPool.getRandomDomain();
      expect(domain).toMatch(/^[a-z0-9-]+\.[a-z]{2,}$/);
    });

    test('should contain a TLD', () => {
      const domain = companyPool.getRandomDomain();
      const tld = domain.split('.').pop();
      expect(companyPool.tlds).toContain('.' + tld);
    });

    test('should return different domains on multiple calls', () => {
      const domains = new Set();
      for (let i = 0; i < 30; i++) {
        domains.add(companyPool.getRandomDomain());
      }
      expect(domains.size).toBeGreaterThan(5);
    });

    test('should be all lowercase', () => {
      const domain = companyPool.getRandomDomain();
      expect(domain).toBe(domain.toLowerCase());
    });

    test('should not contain spaces', () => {
      const domain = companyPool.getRandomDomain();
      expect(domain).not.toContain(' ');
    });
  });

  describe('Data Quality', () => {
    test('all prefixes should be capitalized', () => {
      companyPool.prefixes.forEach((prefix) => {
        expect(prefix[0]).toBe(prefix[0].toUpperCase());
      });
    });

    test('all company types should be capitalized', () => {
      companyPool.companyTypes.forEach((type) => {
        expect(type[0]).toBe(type[0].toUpperCase());
      });
    });

    test('all suffixes should be capitalized', () => {
      companyPool.suffixes.forEach((suffix) => {
        expect(suffix[0]).toBe(suffix[0].toUpperCase());
      });
    });

    test('TLDs should start with dot', () => {
      companyPool.tlds.forEach((tld) => {
        expect(tld).toMatch(/^\.[a-z]{2,}$/);
      });
    });

    test('should not have duplicate prefixes', () => {
      const unique = new Set(companyPool.prefixes);
      expect(unique.size).toBe(companyPool.prefixes.length);
    });

    test('should not have duplicate company types', () => {
      const unique = new Set(companyPool.companyTypes);
      expect(unique.size).toBe(companyPool.companyTypes.length);
    });

    test('should not have duplicate suffixes', () => {
      const unique = new Set(companyPool.suffixes);
      expect(unique.size).toBe(companyPool.suffixes.length);
    });

    test('should not have duplicate TLDs', () => {
      const unique = new Set(companyPool.tlds);
      expect(unique.size).toBe(companyPool.tlds.length);
    });

    test('company types should be reasonable length', () => {
      companyPool.companyTypes.forEach((type) => {
        expect(type.length).toBeGreaterThanOrEqual(2);
        expect(type.length).toBeLessThanOrEqual(15);
      });
    });
  });

  describe('Randomness', () => {
    test('should produce varied distribution of companies', () => {
      const companies = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        companies.add(companyPool.getRandomCompany());
      }

      // Should generate at least 50 unique companies out of 100
      expect(companies.size).toBeGreaterThan(50);
    });

    test('should produce varied distribution of domains', () => {
      const domains = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        domains.add(companyPool.getRandomDomain());
      }

      // Should generate at least 50 unique domains out of 100
      expect(domains.size).toBeGreaterThan(50);
    });

    test('should use different TLDs', () => {
      const tlds = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const domain = companyPool.getRandomDomain();
        const tld = '.' + domain.split('.').pop();
        tlds.add(tld);
      }

      // Should use at least 3 different TLDs
      expect(tlds.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Domain Generation', () => {
    test('should convert company name to valid domain', () => {
      for (let i = 0; i < 20; i++) {
        const domain = companyPool.getRandomDomain();
        // Should not have uppercase letters
        expect(domain).toBe(domain.toLowerCase());
        // Should not have special characters except dots and hyphens
        expect(domain).toMatch(/^[a-z0-9-]+\.[a-z]{2,}$/);
      }
    });

    test('domain should be derived from company components', () => {
      const domain = companyPool.getRandomDomain();
      const domainBase = domain.split('.')[0];

      // Should be alphanumeric with possible hyphens
      expect(domainBase).toMatch(/^[a-z0-9-]+$/);
      expect(domainBase.length).toBeGreaterThan(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle repeated calls without errors', () => {
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          companyPool.getRandomCompany();
          companyPool.getRandomDomain();
        }
      }).not.toThrow();
    });

    test('should not generate empty company names', () => {
      for (let i = 0; i < 100; i++) {
        const company = companyPool.getRandomCompany();
        expect(company).toBeTruthy();
        expect(company.length).toBeGreaterThan(5);
      }
    });

    test('should not generate empty domains', () => {
      for (let i = 0; i < 100; i++) {
        const domain = companyPool.getRandomDomain();
        expect(domain).toBeTruthy();
        expect(domain.length).toBeGreaterThan(5);
      }
    });
  });

  describe('Realistic Company Names', () => {
    test('should generate realistic sounding company names', () => {
      const company = companyPool.getRandomCompany();

      // Should have at least one word from the pool
      const words = company.split(/\s+/);
      expect(words.length).toBeGreaterThanOrEqual(2);
      expect(words.length).toBeLessThanOrEqual(4);
    });

    test('should include business entity type', () => {
      const businessTypes = [
        'Inc',
        'Corp',
        'LLC',
        'Ltd',
        'Group',
        'Partners',
        'Solutions',
        'Systems',
        'Technologies',
      ];

      // Check multiple companies to account for randomness (suffix only added 70% of the time)
      let hasBusinessType = false;
      for (let i = 0; i < 10; i++) {
        const company = companyPool.getRandomCompany();
        if (businessTypes.some((type) => company.includes(type))) {
          hasBusinessType = true;
          break;
        }
      }

      expect(hasBusinessType).toBe(true);
    });
  });

  describe('Style-specific generation', () => {
    test('should generate short company with style parameter', () => {
      const company = companyPool.getRandomCompany('short');
      expect(company).toBeTruthy();
      expect(company.length).toBeGreaterThan(0);
      // Short names should not have commas
      expect(company).not.toContain(',');
    });

    test('should generate domain with style parameter', () => {
      const domain = companyPool.getRandomCompany('domain');
      expect(domain).toMatch(/\.[a-z]{2,}$/);
    });

    test('should generate full company with style parameter', () => {
      const company = companyPool.getRandomCompany('full');
      expect(company).toBeTruthy();
      expect(company.length).toBeGreaterThan(5);
    });
  });

  describe('getShortCompanyName', () => {
    test('should return a short company name', () => {
      const company = companyPool.getShortCompanyName();
      expect(typeof company).toBe('string');
      expect(company.length).toBeGreaterThan(0);
    });

    test('should not include suffix', () => {
      const company = companyPool.getShortCompanyName();
      // Check for suffix as a separate token (e.g., ", Inc" or " LLC")
      // Not just as substring (which would incorrectly match "Corporation" containing "Corp")
      const hasSuffix = companyPool.suffixes.some(
        (suffix) => company.includes(`, ${suffix}`) || company.endsWith(` ${suffix}`)
      );
      expect(hasSuffix).toBe(false);
    });

    test('should vary between single and multi-word', () => {
      const companies = new Set();
      for (let i = 0; i < 50; i++) {
        const company = companyPool.getShortCompanyName();
        companies.add(company.includes(' ') ? 'multi' : 'single');
      }
      // Should have both single and multi-word names
      expect(companies.size).toBeGreaterThan(1);
    });
  });

  describe('getFullCompanyName', () => {
    test('should return a full company name', () => {
      const company = companyPool.getFullCompanyName();
      expect(typeof company).toBe('string');
      expect(company.length).toBeGreaterThan(5);
    });

    test('should always include a prefix and type', () => {
      const company = companyPool.getFullCompanyName();
      const words = company.replace(/,.*$/, '').split(' ');
      expect(words.length).toBeGreaterThanOrEqual(2);
    });

    test('should sometimes include suffix', () => {
      const companies = [];
      for (let i = 0; i < 20; i++) {
        companies.push(companyPool.getFullCompanyName());
      }
      const withSuffix = companies.filter((c) => companyPool.suffixes.some((s) => c.includes(s)));
      expect(withSuffix.length).toBeGreaterThan(0);
    });
  });

  describe('getRelatedDomain', () => {
    test('should extract domain from company name', () => {
      const domain = companyPool.getRelatedDomain('Acme Corp, Inc');
      expect(domain).toMatch(/\.[a-z]{2,}$/);
      expect(domain.toLowerCase()).toContain('acme');
    });

    test('should handle company name without suffix', () => {
      const domain = companyPool.getRelatedDomain('Global Tech');
      expect(domain).toMatch(/\.[a-z]{2,}$/);
    });

    test('should handle short company names', () => {
      const domain = companyPool.getRelatedDomain('Acme');
      expect(domain).toMatch(/\.[a-z]{2,}$/);
    });

    test('should fallback for invalid names', () => {
      const domain = companyPool.getRelatedDomain('');
      expect(domain).toMatch(/\.[a-z]{2,}$/);
    });
  });

  describe('isLikelyCompany', () => {
    test('should return true for names with suffixes', () => {
      expect(companyPool.isLikelyCompany('Acme Corp')).toBe(true);
      expect(companyPool.isLikelyCompany('Tech Inc')).toBe(true);
      expect(companyPool.isLikelyCompany('Global LLC')).toBe(true);
    });

    test('should return true for names with company words', () => {
      expect(companyPool.isLikelyCompany('Acme Tech')).toBe(true);
      expect(companyPool.isLikelyCompany('Global Solutions')).toBe(true);
    });

    test('should return false for non-company words', () => {
      expect(companyPool.isLikelyCompany('hello world')).toBe(false);
    });
  });

  describe('getRandomCompanies', () => {
    test('should return array of specified length', () => {
      const companies = companyPool.getRandomCompanies(5);
      expect(companies).toHaveLength(5);
    });

    test('should return unique companies', () => {
      const companies = companyPool.getRandomCompanies(10);
      const uniqueCompanies = new Set(companies);
      expect(uniqueCompanies.size).toBe(10);
    });

    test('should accept style parameter', () => {
      const domains = companyPool.getRandomCompanies(3, 'domain');
      domains.forEach((domain) => {
        expect(domain).toMatch(/\.[a-z]{2,}$/);
      });
    });
  });
});
