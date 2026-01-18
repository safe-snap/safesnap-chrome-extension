/**
 * Integration Tests for PIIDictionary
 *
 * Tests dictionary building (Phase 3) and refinement (Phase 4)
 *
 * @jest-environment jsdom
 */

const { PIIDictionary } = require('../../src/detection/pii-dictionary.js');
const { TextExtractor } = require('../../src/detection/text-extractor.js');

describe('PIIDictionary - Phase 3 & 4: Build and Refine Dictionary', () => {
  let dictionary;
  let textExtractor;

  beforeEach(() => {
    dictionary = new PIIDictionary();
    textExtractor = new TextExtractor();
    document.body.innerHTML = '';
  });

  describe('Phase 3: Build Dictionary', () => {
    test('should create entity for single candidate', () => {
      document.body.innerHTML = '<div>test@example.com</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'email',
          original: 'test@example.com',
          start: 0,
          end: 16,
          confidence: 1.0,
        },
      ];

      dictionary.buildFrom(candidates, textMap);

      const entities = dictionary.getAll();
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('email');
      expect(entities[0].original).toBe('test@example.com');
    });

    test('should group identical PII across multiple occurrences', () => {
      document.body.innerHTML = '<div>Jim Glab wrote this. Contact Jim Glab at email.</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      // Simulate detecting "Jim Glab" twice
      const candidates = [
        {
          type: 'properNoun',
          original: 'Jim Glab',
          start: 0,
          end: 8,
          rawConfidence: 0.85,
        },
        {
          type: 'properNoun',
          original: 'Jim Glab',
          start: 28,
          end: 36,
          rawConfidence: 0.85,
        },
      ];

      dictionary.buildFrom(candidates, textMap);

      const entities = dictionary.getAll();
      expect(entities).toHaveLength(1);
      expect(entities[0].occurrences).toHaveLength(2);
    });

    test('should create both entities initially, refine() removes overlap', () => {
      document.body.innerHTML = '<div>United Airlines</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'properNoun',
          original: 'United',
          start: 0,
          end: 6,
          rawConfidence: 0.9, // High enough to pass threshold
        },
        {
          type: 'properNoun',
          original: 'United Airlines',
          start: 0,
          end: 15,
          rawConfidence: 0.9,
        },
      ];

      dictionary.buildFrom(candidates, textMap);

      // After build: both entities exist (different text)
      expect(dictionary.getAll()).toHaveLength(2);

      // After refine: overlap removed, longer one wins
      dictionary.refine();
      const entities = dictionary.getAll();
      expect(entities).toHaveLength(1);
      expect(entities[0].original).toBe('United Airlines');
    });

    test('should track all occurrences for each entity', () => {
      document.body.innerHTML = '<div>test@example.com and test@example.com</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'email',
          original: 'test@example.com',
          start: 0,
          end: 16,
          confidence: 1.0,
        },
        {
          type: 'email',
          original: 'test@example.com',
          start: 22,
          end: 38,
          confidence: 1.0,
        },
      ];

      dictionary.buildFrom(candidates, textMap);

      const entities = dictionary.getAll();
      expect(entities).toHaveLength(1);
      expect(entities[0].occurrences).toHaveLength(2);
      expect(entities[0].occurrences[0].start).toBe(0);
      expect(entities[0].occurrences[1].start).toBe(22);
    });
  });

  describe('Phase 4: Refine Dictionary - Overlap Removal', () => {
    test('should remove quantity when overlapping with date', () => {
      document.body.innerHTML = '<div>Jan 17, 2026</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'date',
          original: 'Jan 17, 2026',
          start: 0,
          end: 12,
          confidence: 1.0,
        },
        {
          type: 'quantity',
          original: '17',
          start: 4,
          end: 6,
          confidence: 1.0,
        },
      ];

      dictionary.buildFrom(candidates, textMap);
      dictionary.refine();

      const entities = dictionary.getAll();
      // Only date should remain (priority 90 > quantity priority 60)
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('date');
      expect(entities[0].original).toBe('Jan 17, 2026');
    });

    test('should keep email over properNoun when overlapping', () => {
      document.body.innerHTML = '<div>test@example.com</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'email',
          original: 'test@example.com',
          start: 0,
          end: 16,
          confidence: 1.0,
        },
        {
          type: 'properNoun',
          original: 'example',
          start: 5,
          end: 12,
          rawConfidence: 0.8,
        },
      ];

      dictionary.buildFrom(candidates, textMap);
      dictionary.refine();

      const entities = dictionary.getAll();
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('email');
    });
  });

  describe('Phase 4: Refine Dictionary - Confidence Filtering', () => {
    test('should filter out proper nouns below threshold', () => {
      document.body.innerHTML = '<div>Maybe Name</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'properNoun',
          original: 'Maybe Name',
          start: 0,
          end: 10,
          rawConfidence: 0.6, // Below 0.75 threshold
        },
      ];

      dictionary.buildFrom(candidates, textMap);
      dictionary.refine();

      const entities = dictionary.getAll();
      expect(entities).toHaveLength(0); // Filtered out
    });

    test('should keep emails regardless of threshold', () => {
      document.body.innerHTML = '<div>test@example.com</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'email',
          original: 'test@example.com',
          start: 0,
          end: 16,
          confidence: 1.0,
        },
      ];

      dictionary.buildFrom(candidates, textMap);
      dictionary.refine();

      const entities = dictionary.getAll();
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('email');
    });
  });

  describe('Public API - getEnabled()', () => {
    test('should filter entities by enabled types', () => {
      document.body.innerHTML = '<div>Jim Glab test@example.com $100</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'properNoun',
          original: 'Jim Glab',
          start: 0,
          end: 8,
          rawConfidence: 0.85,
        },
        {
          type: 'email',
          original: 'test@example.com',
          start: 10,
          end: 26,
          confidence: 1.0,
        },
        {
          type: 'money',
          original: '$100',
          start: 28,
          end: 32,
          confidence: 1.0,
        },
      ];

      dictionary.buildFrom(candidates, textMap);
      dictionary.refine();

      // Only enable properNouns
      const enabled = dictionary.getEnabled(['properNouns']);
      expect(enabled).toHaveLength(1);
      expect(enabled[0].type).toBe('properNoun');

      // Enable emails and money
      const enabled2 = dictionary.getEnabled(['emails', 'money']);
      expect(enabled2).toHaveLength(2);
    });
  });

  describe('Statistics', () => {
    test('should provide stats about dictionary', () => {
      document.body.innerHTML = '<div>Jim Glab test@example.com $100</div>';
      const textMap = textExtractor.extractVisibleText(document.body);

      const candidates = [
        {
          type: 'properNoun',
          original: 'Jim Glab',
          start: 0,
          end: 8,
          rawConfidence: 0.85,
        },
        {
          type: 'email',
          original: 'test@example.com',
          start: 10,
          end: 26,
          confidence: 1.0,
        },
        {
          type: 'money',
          original: '$100',
          start: 28,
          end: 32,
          confidence: 1.0,
        },
      ];

      dictionary.buildFrom(candidates, textMap);
      dictionary.refine();

      const stats = dictionary.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byType.properNoun).toBe(1);
      expect(stats.byType.email).toBe(1);
      expect(stats.byType.money).toBe(1);
    });
  });
});
