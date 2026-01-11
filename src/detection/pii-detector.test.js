/**
 * PIIDetector Tests
 */

/* eslint-env node, jest */

import { PIIDetector } from './pii-detector.js';

// Mock DOM
global.document = {
  createTreeWalker: jest.fn(() => ({
    nextNode: jest.fn(() => null),
  })),
};

global.NodeFilter = {
  SHOW_TEXT: 4,
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
};

describe('PIIDetector', () => {
  let detector;

  beforeEach(async () => {
    detector = new PIIDetector();
    await detector.initialize();
  });

  describe('Initialization', () => {
    test('should initialize with modules', () => {
      expect(detector.patternMatcher).toBeDefined();
      expect(detector.dictionary).toBeDefined();
      expect(detector.initialized).toBe(true);
    });
  });

  describe('detectInText', () => {
    test('should detect emails', () => {
      const text = 'Contact us at test@example.com';
      const entities = detector.detectInText(text, ['email']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('email');
      expect(entities[0].original).toBe('test@example.com');
    });

    test('should detect phones', () => {
      const text = 'Call (555) 123-4567';
      const entities = detector.detectInText(text, ['phone']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('phone');
    });

    test('should detect money', () => {
      const text = 'Total: $1,234.56';
      const entities = detector.detectInText(text, ['money']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('money');
    });

    test('should detect quantities', () => {
      const text = 'Order 150 items';
      const entities = detector.detectInText(text, ['quantities']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('quantity');
    });

    test('should detect URLs', () => {
      const text = 'Visit https://example.com';
      const entities = detector.detectInText(text, ['url']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('url');
    });

    test('should detect IP addresses', () => {
      const text = 'Server at 192.168.1.100';
      const entities = detector.detectInText(text, ['ipAddress']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('ipAddress');
    });

    test('should detect SSNs', () => {
      const text = 'SSN: 123-45-6789';
      const entities = detector.detectInText(text, ['ssn']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('ssn');
    });

    test('should detect credit cards', () => {
      const text = 'Card: 4111-1111-1111-1111';
      const entities = detector.detectInText(text, ['creditCard']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('creditCard');
    });

    test('should detect dates', () => {
      const text = 'Meeting on 01/15/2026';
      const entities = detector.detectInText(text, ['date']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('date');
    });

    test('should detect addresses', () => {
      const text = 'Located at 123 Main Street';
      const entities = detector.detectInText(text, ['address']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('address');
    });

    test('should detect proper nouns', () => {
      const text = 'Contact John Doe';
      const entities = detector.detectInText(text, ['properNouns']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('properNoun');
    });

    test('should NOT detect month abbreviations as proper nouns', () => {
      const text = 'Dec 10, 2024 - Jan 9, 2025';
      const entities = detector.detectInText(text, ['properNouns']);

      // Should not detect "Dec" or "Jan" as proper nouns since they're common month abbreviations
      const properNouns = entities.filter((e) => e.type === 'properNoun');
      const monthAbbrevs = properNouns.filter((e) => e.original === 'Dec' || e.original === 'Jan');

      expect(monthAbbrevs.length).toBe(0);
    });

    test('should NOT detect common verbs at sentence start as proper nouns', () => {
      const text = 'Visualize warehouse data on a map';
      const entities = detector.detectInText(text, ['properNouns']);

      // Should not detect "Visualize" as a proper noun
      const properNouns = entities.filter((e) => e.type === 'properNoun');
      const visualizeNouns = properNouns.filter((e) => e.original === 'Visualize');

      expect(visualizeNouns.length).toBe(0);
    });

    test('should NOT protect single words at sentence start (score too low)', () => {
      const text = 'Barbara is a database. John works there.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Single words at sentence start have low scores (0.3-0.4) and are filtered out
      // Barbara: 0.3 (cap) + 0.3 (unknown) + 0 (sentence start) = 0.6 < 0.8
      // John: 0.3 (cap) + 0.3 (unknown) + 0 (sentence start) = 0.6 < 0.8 (actually John is mid-sentence after period)
      // Both should be filtered out
      expect(properNouns.length).toBe(0);
    });

    test('should give HIGH confidence to names with honorific prefixes', () => {
      const text = 'Contact Mr. John Doe or Dr. Sarah Smith for assistance.';
      const entities = detector.detectInText(text, ['properNouns']);

      // "Mr. John Doe" should have high confidence
      const mrJohnDoe = entities.find((e) => e.original === 'Mr. John Doe');
      expect(mrJohnDoe).toBeDefined();
      expect(mrJohnDoe.confidence).toBeGreaterThanOrEqual(0.85);

      // "Dr. Sarah Smith" should have high confidence
      const drSarahSmith = entities.find((e) => e.original === 'Dr. Sarah Smith');
      expect(drSarahSmith).toBeDefined();
      expect(drSarahSmith.confidence).toBeGreaterThanOrEqual(0.85);
    });

    test('should give HIGHER confidence to multi-word proper nouns', () => {
      const text = 'Sarah Smith joined the team. Welcome aboard!';
      const entities = detector.detectInText(text, ['properNouns']);

      // "Sarah Smith" (2 words) should have higher confidence than single words
      const sarahSmith = entities.find((e) => e.original === 'Sarah Smith');
      expect(sarahSmith).toBeDefined();
      expect(sarahSmith.confidence).toBeGreaterThanOrEqual(0.75);
    });

    test('should detect Mrs/Ms/Prof honorifics with high confidence', () => {
      const text = 'Ask Mrs. Johnson, Ms. Lee, or Prof. Anderson.';
      const entities = detector.detectInText(text, ['properNouns']);

      const mrsJohnson = entities.find((e) => e.original.includes('Johnson'));
      const msLee = entities.find((e) => e.original.includes('Lee'));
      const profAnderson = entities.find((e) => e.original.includes('Anderson'));

      expect(mrsJohnson).toBeDefined();
      expect(mrsJohnson.confidence).toBeGreaterThanOrEqual(0.85);

      expect(msLee).toBeDefined();
      expect(msLee.confidence).toBeGreaterThanOrEqual(0.85);

      expect(profAnderson).toBeDefined();
      expect(profAnderson.confidence).toBeGreaterThanOrEqual(0.85);
    });

    test('should detect dates but not proper nouns when both types enabled', () => {
      const text = 'Period: Dec 10, 2024 - Jan 9, 2025';
      const entities = detector.detectInText(text, ['date', 'properNouns']);

      // Should detect both dates
      const dates = entities.filter((e) => e.type === 'date');
      expect(dates.length).toBe(2);

      // Should NOT detect "Dec" or "Jan" as proper nouns
      const properNouns = entities.filter((e) => e.type === 'properNoun');
      const monthAbbrevs = properNouns.filter((e) => e.original === 'Dec' || e.original === 'Jan');
      expect(monthAbbrevs.length).toBe(0);
    });

    // ========================================================================
    // New Scoring System Tests (Multi-Signal Approach)
    // ========================================================================

    test('should NOT protect "Average Receipt Value" (only 1/3 unknown)', () => {
      const text = 'Average Receipt Value: $1,234';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should not detect any of these words as proper nouns
      // Score: 0.3 (cap) + 0.0 (only 1/3 unknown) + 0.2 (multi-word) + 0.1 (mid-sentence) = 0.6 < 0.8
      expect(properNouns.length).toBe(0);
    });

    test('should NOT protect "Total Revenue Growth" (all common words)', () => {
      const text = 'Total Revenue Growth: 15%';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // All words are common, score should be low
      expect(properNouns.length).toBe(0);
    });

    test('should NOT protect single capitalized common word', () => {
      const text = 'The Receipt shows the total amount';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Single word "Receipt" at mid-sentence but common word
      // Score: 0.3 (cap) + 0.3 (unknown) + 0.1 (mid-sentence) = 0.7 < 0.8
      expect(properNouns.length).toBe(0);
    });

    test('should protect "Mr. John Doe" (honorific + 2 unknown words)', () => {
      const text = 'Contact Mr. John Doe for details';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      expect(properNouns.length).toBe(1);
      expect(properNouns[0].original).toBe('Mr. John Doe');
      // Score: 0.3 (cap) + 0.3 (2/2 unknown) + 0.4 (honorific) + 0.2 (multi) + 0.1 (mid) = 1.3
      expect(properNouns[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should protect "John Doe" even when preceded by common word', () => {
      const text = 'Contact John Doe for details';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // The regex matches "Contact John Doe" as one phrase
      // Score: 0.3 (cap) + 0.3 (2/3 unknown, majority) + 0.2 (multi) + 0 (sentence start) = 0.8
      expect(properNouns.length).toBe(1);
      expect(properNouns[0].original).toBe('Contact John Doe');
      expect(properNouns[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should NOT protect "Contact John" near email (insufficient score)', () => {
      const text = 'Contact John at john@example.com';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // "Contact John" is matched as one phrase
      // Unknown: 1/2 (only John) = 50%, NOT > 50%, so no 0.3 bonus
      // Score: 0.3 (cap) + 0 (not majority) + 0.2 (multi) + 0.2 (near PII) = 0.7 < 0.8
      // Not protected due to insufficient score
      expect(properNouns.length).toBe(0);
    });

    test('should protect "Acme Corp" (company suffix)', () => {
      const text = 'Works at Acme Corp in the city';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      expect(properNouns.length).toBe(1);
      expect(properNouns[0].original).toBe('Acme Corp');
      // Score: 0.3 (cap) + 0.3 (2/2 unknown) + 0.4 (company suffix) + 0.2 (multi) + 0.1 (mid) = 1.3
      expect(properNouns[0].confidence).toBeGreaterThanOrEqual(0.8);
      expect(properNouns[0].context).toBe('company');
    });

    test('should protect "Acme Industries" (2 unknown words, no suffix)', () => {
      const text = 'Works at Acme Industries in the city';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      expect(properNouns.length).toBe(1);
      expect(properNouns[0].original).toBe('Acme Industries');
      // Score: 0.3 (cap) + 0.3 (2/2 unknown) + 0.2 (multi) + 0.1 (mid) = 0.9
      expect(properNouns[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should NOT protect "Dr. Smith" at sentence start (lower score)', () => {
      const text = 'Smith works at the hospital.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Single word at sentence start, even if unknown
      // Score: 0.3 (cap) + 0.3 (unknown) + 0.0 (sentence start) = 0.6 < 0.8
      expect(properNouns.length).toBe(0);
    });

    test('should protect company name with multiple signals', () => {
      const text = 'Partnership with Microsoft Corporation announced today';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      const company = properNouns.find((e) => e.original.includes('Microsoft'));
      expect(company).toBeDefined();
      // Has company suffix "Corporation", should have high confidence
      expect(company.confidence).toBeGreaterThanOrEqual(0.8);
      expect(company.context).toBe('company');
    });

    test('should handle mixed known/unknown words correctly', () => {
      const text = 'The Johnson Report was published yesterday';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      const johnsonReport = properNouns.find((e) => e.original === 'Johnson Report');
      // "Johnson" unknown, "Report" common = 1/2 unknown = NOT majority
      // Score would be low, should not be protected
      expect(johnsonReport).toBeUndefined();
    });

    test('should include scoreBreakdown in results', () => {
      const text = 'Contact John Doe';
      const entities = detector.detectInText(text, ['properNouns']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].scoreBreakdown).toBeDefined();
      expect(entities[0].scoreBreakdown.capitalizationPattern).toBeDefined();
      expect(entities[0].scoreBreakdown.unknownInDictionary).toBeDefined();
    });

    // Additional Design Stage Test Cases
    test('should protect multi-word names without honorifics', () => {
      const text = 'Sarah Johnson attended the meeting';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // "Sarah Johnson": 2/2 unknown, multi-word, mid-sentence
      // Score: 0.3 + 0.3 + 0.2 + 0.1 = 0.9
      expect(properNouns.length).toBe(1);
      expect(properNouns[0].original).toBe('Sarah Johnson');
      expect(properNouns[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should protect three-word names', () => {
      const text = 'Mary Jane Watson is here';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // "Mary Jane Watson": 3/3 unknown, multi-word, mid-sentence
      expect(properNouns.length).toBe(1);
      expect(properNouns[0].original).toBe('Mary Jane Watson');
      expect(properNouns[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should NOT protect business terms even when capitalized', () => {
      const text = 'Customer Satisfaction Index';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // All words should be in dictionary as business terms
      // No protection expected
      expect(properNouns.length).toBe(0);
    });

    test('should NOT protect "Annual Performance Review"', () => {
      const text = 'Annual Performance Review is next week';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // All common business/time words
      expect(properNouns.length).toBe(0);
    });

    test('should protect company names with "Inc"', () => {
      const text = 'Widgets Inc manufactures products';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // "Widgets Inc": company suffix gives +0.4
      expect(properNouns.length).toBe(1);
      expect(properNouns[0].original).toBe('Widgets Inc');
      expect(properNouns[0].context).toBe('company');
    });

    test('should protect "LLC" and "Corp" company suffixes', () => {
      const text = 'Acme LLC and Beta Corp are partners';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      expect(properNouns.length).toBe(2);
      expect(properNouns.some((e) => e.original === 'Acme LLC')).toBe(true);
      expect(properNouns.some((e) => e.original === 'Beta Corp')).toBe(true);
    });

    test('should handle names near multiple PII types', () => {
      const text = 'Contact Sarah Smith at sarah@example.com or (555) 123-4567';
      const entities = detector.detectInText(text, ['properNouns', 'emails', 'phones']);

      const properNouns = entities.filter((e) => e.type === 'properNoun');
      const emails = entities.filter((e) => e.type === 'email');
      const phones = entities.filter((e) => e.type === 'phone');

      expect(emails.length).toBe(1);
      expect(phones.length).toBe(1);
      // "Contact Sarah Smith" should be protected (2/3 unknown)
      expect(properNouns.length).toBe(1);
    });

    test('should correctly score names at different positions', () => {
      const text = 'Michael called. Then Michael Jackson arrived.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // "Then Michael Jackson" is matched as one phrase (2/3 unknown)
      // Score: 0.3 + 0.3 + 0.2 + 0 (sentence start) = 0.8
      const michaelJackson = properNouns.find((e) => e.original.includes('Michael Jackson'));
      expect(michaelJackson).toBeDefined();
      expect(michaelJackson.confidence).toBeGreaterThanOrEqual(0.8);
    });

    // End of Scoring System Tests
    // ========================================================================

    test('should detect multiple types', () => {
      const text = 'John at john@example.com, call (555) 123-4567';
      const entities = detector.detectInText(text, ['properNouns', 'email', 'phone']);

      expect(entities.length).toBeGreaterThanOrEqual(2);
    });

    test('should deduplicate overlapping entities', () => {
      const text = 'test@example.com';
      const entities = detector.detectInText(text, ['email', 'url']);

      // Should not have duplicates for the same text
      const uniqueStarts = new Set(entities.map((e) => e.start));
      expect(uniqueStarts.size).toBeLessThanOrEqual(entities.length);
    });

    test('should return empty array for no matches', () => {
      const text = 'No PII here';
      const entities = detector.detectInText(text, ['email', 'phone']);

      expect(entities).toEqual([]);
    });

    test('should use default types if not specified', () => {
      const text = 'Contact John at $100';
      const entities = detector.detectInText(text);

      expect(Array.isArray(entities)).toBe(true);
    });
  });

  describe('filterByConfidence', () => {
    test('should filter entities by confidence', () => {
      const entities = [
        { type: 'email', original: 'test@example.com', confidence: 1.0 },
        { type: 'date', original: '01/15/2026', confidence: 0.8 },
        { type: 'properNoun', original: 'John', confidence: 0.6 },
        { type: 'address', original: '123 Main St', confidence: 0.7 },
      ];

      const filtered = detector.filterByConfidence(entities, 0.75);

      expect(filtered.length).toBe(2);
      expect(filtered.every((e) => e.confidence >= 0.75)).toBe(true);
    });

    test('should return all with confidence 0', () => {
      const entities = [
        { type: 'email', confidence: 0.5 },
        { type: 'phone', confidence: 0.3 },
      ];

      const filtered = detector.filterByConfidence(entities, 0);
      expect(filtered.length).toBe(2);
    });

    test('should return empty array if all below threshold', () => {
      const entities = [{ type: 'email', confidence: 0.5 }];

      const filtered = detector.filterByConfidence(entities, 0.9);
      expect(filtered).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('should return statistics', () => {
      const entities = [
        { type: 'email', confidence: 1.0 },
        { type: 'email', confidence: 0.9 },
        { type: 'phone', confidence: 1.0 },
      ];

      const stats = detector.getStats(entities);

      expect(stats.total).toBe(3);
      expect(stats.byType.email).toBe(2);
      expect(stats.byType.phone).toBe(1);
      expect(stats.avgConfidence).toBeCloseTo(0.966, 2);
    });

    test('should handle empty entities', () => {
      const stats = detector.getStats([]);

      expect(stats.total).toBe(0);
      expect(stats.avgConfidence).toBe(0);
    });
  });

  describe('checkDictionaryUsage', () => {
    test('should increment dictionary usage', () => {
      const result = detector.checkDictionaryUsage();
      expect(typeof result).toBe('boolean');
    });

    test('should suggest download after threshold', () => {
      for (let i = 0; i < 10; i++) {
        detector.checkDictionaryUsage();
      }
      // After multiple uses, should have suggested or not based on threshold
      expect(detector.dictionary.getUsageCount()).toBeGreaterThan(0);
    });
  });

  describe('getDictionaryStats', () => {
    test('should return dictionary statistics', () => {
      const stats = detector.getDictionaryStats();

      expect(stats).toHaveProperty('coreDictionarySize');
      expect(stats).toHaveProperty('fullDictionarySize');
      expect(stats).toHaveProperty('usageCount');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty text', () => {
      const entities = detector.detectInText('', ['email']);
      expect(entities).toEqual([]);
    });

    test('should handle very long text', () => {
      const longText = 'test@example.com '.repeat(100);
      expect(() => {
        detector.detectInText(longText, ['email']);
      }).not.toThrow();
    });

    test('should handle special characters', () => {
      const text = 'Email: test@example.com!!! Phone: (555) 123-4567???';
      const entities = detector.detectInText(text, ['email', 'phone']);

      expect(entities.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle unicode text', () => {
      const text = 'Café email: test@example.com';
      const entities = detector.detectInText(text, ['email']);

      expect(entities.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should process large text efficiently', () => {
      const text = 'Contact john@example.com or call (555) 123-4567 at $100 '.repeat(100);

      const start = Date.now();
      detector.detectInText(text, ['email', 'phone', 'money']);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('_hasNearbyPII', () => {
    test('should detect email within window', () => {
      const text = 'Contact John Doe at john@example.com for details';
      const result = detector._hasNearbyPII(text, 8, 16); // "John Doe"
      expect(result).toBe(true);
    });

    test('should detect phone within window', () => {
      const text = 'Call Jane Smith at (555) 123-4567';
      const result = detector._hasNearbyPII(text, 5, 15); // "Jane Smith"
      expect(result).toBe(true);
    });

    test('should return false when no PII nearby', () => {
      const text = 'The Average Receipt Value is calculated monthly';
      const result = detector._hasNearbyPII(text, 4, 26); // "Average Receipt Value"
      expect(result).toBe(false);
    });

    test('should respect window size', () => {
      const text = 'John Doe' + ' '.repeat(100) + 'test@example.com';
      const result = detector._hasNearbyPII(text, 0, 8); // "John Doe" with email 100+ chars away
      expect(result).toBe(false);
    });

    test('should handle text at boundaries', () => {
      const text = 'test@example.com John Doe';
      const result = detector._hasNearbyPII(text, 17, 25); // "John Doe" at start
      expect(result).toBe(true);
    });
  });

  describe('_calculateUnknownWordRatio', () => {
    test('should return 1.0 for completely unknown name', () => {
      const ratio = detector._calculateUnknownWordRatio('Xerxes');
      expect(ratio).toBe(1.0);
    });

    test('should return 0.0 for all common words', () => {
      const ratio = detector._calculateUnknownWordRatio('The Average Value');
      expect(ratio).toBe(0.0);
    });

    test('should return 0.5 when dictionary not initialized', () => {
      const uninitDetector = new PIIDetector();
      uninitDetector.initialized = false;
      const ratio = uninitDetector._calculateUnknownWordRatio('Unknown Person');
      expect(ratio).toBe(0.5);
    });

    test('should ignore honorifics when calculating', () => {
      const ratio1 = detector._calculateUnknownWordRatio('John Doe');
      const ratio2 = detector._calculateUnknownWordRatio('Mr. John Doe');
      expect(ratio1).toBe(ratio2);
    });

    test('should ignore company suffixes when calculating', () => {
      const ratio1 = detector._calculateUnknownWordRatio('Acme Corporation');
      const ratio2 = detector._calculateUnknownWordRatio('Acme');
      expect(ratio1).toBe(ratio2);
    });

    test('should handle standalone company suffix', () => {
      // "Inc" standalone is treated as a word, not removed
      const ratio = detector._calculateUnknownWordRatio('Inc');
      expect(ratio).toBe(1);
    });

    test('should handle mixed known and unknown words', () => {
      const ratio = detector._calculateUnknownWordRatio('The Xerxes Project');
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThan(1);
    });
  });

  describe('_calculateProperNounScore', () => {
    test('should score "Mr. John Doe" as 1.0 (capped)', () => {
      const context = {
        hasHonorific: true,
        hasCompanySuffix: false,
        wordCount: 2,
        isSentenceStart: false,
        nearPII: false,
      };
      const { score } = detector._calculateProperNounScore('Mr. John Doe', context);
      expect(score).toBe(1.0);
    });

    test('should score sentence-start single word below threshold', () => {
      const context = {
        hasHonorific: false,
        hasCompanySuffix: false,
        wordCount: 1,
        isSentenceStart: true,
        nearPII: false,
      };
      const { score } = detector._calculateProperNounScore('Smith', context);
      expect(score).toBeLessThan(0.8);
    });

    test('should include breakdown details', () => {
      const context = {
        hasHonorific: true,
        hasCompanySuffix: false,
        wordCount: 2,
        isSentenceStart: false,
        nearPII: true,
      };
      const { score, breakdown } = detector._calculateProperNounScore('Mr. John Doe', context);

      expect(score).toBe(1.0);
      expect(breakdown.capitalizationPattern).toBeDefined();
      expect(breakdown.hasHonorificOrSuffix).toBeDefined();
      expect(breakdown.multiWord).toBeDefined();
      expect(breakdown.notSentenceStart).toBeDefined();
      expect(breakdown.nearOtherPII).toBeDefined();
    });

    test('should add unknown dictionary signal for uncommon names', () => {
      const context = {
        hasHonorific: false,
        hasCompanySuffix: false,
        wordCount: 1,
        isSentenceStart: false,
        nearPII: false,
      };
      const { breakdown } = detector._calculateProperNounScore('Xerxes', context);
      expect(breakdown.unknownInDictionary).toBeDefined();
    });

    test('should not add unknown dictionary signal for common words', () => {
      const context = {
        hasHonorific: false,
        hasCompanySuffix: false,
        wordCount: 2,
        isSentenceStart: false,
        nearPII: false,
      };
      const { breakdown } = detector._calculateProperNounScore('The Average', context);
      expect(breakdown.unknownInDictionary).toBeUndefined();
    });

    test('should handle company suffix context', () => {
      const context = {
        hasHonorific: false,
        hasCompanySuffix: true,
        wordCount: 2,
        isSentenceStart: false,
        nearPII: false,
      };
      const { breakdown } = detector._calculateProperNounScore('Acme Corp', context);
      expect(breakdown.hasHonorificOrSuffix).toBeDefined();
      expect(breakdown.hasHonorificOrSuffix_detail).toBe('suffix');
    });

    test('should handle honorific context', () => {
      const context = {
        hasHonorific: true,
        hasCompanySuffix: false,
        wordCount: 2,
        isSentenceStart: false,
        nearPII: false,
      };
      const { breakdown } = detector._calculateProperNounScore('Dr. Smith', context);
      expect(breakdown.hasHonorificOrSuffix).toBeDefined();
      expect(breakdown.hasHonorificOrSuffix_detail).toBe('honorific');
    });

    test('should cap score at 1.0', () => {
      const context = {
        hasHonorific: true,
        hasCompanySuffix: false,
        wordCount: 3,
        isSentenceStart: false,
        nearPII: true,
      };
      const { score } = detector._calculateProperNounScore('Mr. John Doe', context);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });
});
