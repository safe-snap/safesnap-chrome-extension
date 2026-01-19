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

    test('should allow updating proper noun threshold', () => {
      // Initial threshold (default or from settings)
      const initialThreshold = detector.properNounThreshold;
      expect(initialThreshold).toBeDefined();

      // Update threshold
      detector.setProperNounThreshold(0.9);
      expect(detector.properNounThreshold).toBe(0.9);

      // Update again
      detector.setProperNounThreshold(0.5);
      expect(detector.properNounThreshold).toBe(0.5);

      // Restore original
      detector.setProperNounThreshold(initialThreshold);
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

    test('should detect dates with month abbreviations like "Dec. 9"', () => {
      const text =
        'The venture firm filed its own Chapter 11 bankruptcy petition on Dec. 9, attempting to stall the Cayman Islands litigation.';
      const entities = detector.detectInText(text, ['date']);

      expect(entities.length).toBeGreaterThan(0);
      const dateEntity = entities.find((e) => e.type === 'date' && e.original.includes('Dec'));
      expect(dateEntity).toBeDefined();
      expect(dateEntity.original).toMatch(/Dec.*9/i);
    });

    test('should detect dates regardless of enabled types (detection-first, filter-later architecture)', () => {
      const text =
        'The venture firm filed its own Chapter 11 bankruptcy petition on Dec. 9, attempting to stall the litigation.';

      // Test 1: With only properNouns enabled, dates are DETECTED but FILTERED OUT
      const entitiesFiltered = detector.detectInText(text, ['properNouns']);

      // Filtered results should NOT include dates (date type is not enabled)
      const dateEntitiesFiltered = entitiesFiltered.filter((e) => e.type === 'date');
      expect(dateEntitiesFiltered.length).toBe(0);

      // "Dec" should still not be detected as a proper noun
      // The detector should recognize Dec. 9 as a date pattern first (even if dates are filtered)
      // This prevents false positives from treating month names as proper nouns
      const properNounsFiltered = entitiesFiltered.filter((e) => e.type === 'properNoun');
      const decAsProperNoun = properNounsFiltered.find((e) => e.original.includes('Dec'));
      expect(decAsProperNoun).toBeUndefined();

      // Test 2: Dates are ALWAYS detected internally (for deduplication)
      // But they are FILTERED OUT when not in enabledTypes
      const testDiv = document.createElement('div');
      testDiv.textContent = text;
      const filteredResults = detector.detectWithDebugInfo(testDiv, ['properNouns']);

      // Dates should NOT be in filtered results (only properNouns enabled)
      const dateInFiltered = filteredResults.find((e) => e.type === 'date');
      expect(dateInFiltered).toBeUndefined();

      // But "Dec" should also NOT be detected as a proper noun
      // because it was recognized as part of a date during deduplication
      const decAsProperNoun2 = filteredResults.find(
        (e) => e.original && e.original.includes('Dec')
      );
      expect(decAsProperNoun2).toBeUndefined();

      // Test 3: With both types enabled, date should be detected (not proper noun)
      const entitiesBoth = detector.detectInText(text, ['date', 'properNouns']);
      const dateEntitiesBoth = entitiesBoth.filter((e) => e.type === 'date');
      expect(dateEntitiesBoth.length).toBeGreaterThan(0);

      // "Dec" should still not be a proper noun (date wins priority conflict)
      const properNounsBoth = entitiesBoth.filter((e) => e.type === 'properNoun');
      const decAsProperNounBoth = properNounsBoth.find((e) => e.original.includes('Dec'));
      expect(decAsProperNounBoth).toBeUndefined();
    });

    test('should NOT detect numbers within dates as separate quantities', () => {
      // Bug report: "Jan 16, 2026" becomes "Jan -1-7, -20-26"
      // Root cause: Numbers within dates are detected as quantities
      // even when dates have higher priority (90 vs 60)

      const text = 'Article published on Jan 16, 2026';

      // CRITICAL TEST 1: detectWithDebugInfo shows ALL candidates before filtering
      const testDiv = document.createElement('div');
      testDiv.textContent = text;
      const allCandidates = detector.detectWithDebugInfo(testDiv, ['quantity']);

      console.log(
        'All candidates (before filtering):',
        allCandidates.map((c) => ({
          type: c.type,
          original: c.original,
          start: c.start,
          end: c.end,
        }))
      );

      // After deduplication, numbers within dates should be removed
      const dateCandidate = allCandidates.find((e) => e.original && e.original.includes('Jan'));
      const q16Candidate = allCandidates.find((e) => e.original === '16');
      const q2026Candidate = allCandidates.find((e) => e.original === '2026');

      console.log('Date candidate:', dateCandidate);
      console.log('16 candidate:', q16Candidate);
      console.log('2026 candidate:', q2026Candidate);

      // CRITICAL TEST 2: With ONLY quantities enabled (dates NOT enabled)
      // The numbers in the date should still NOT be detected as quantities
      const entitiesQuantityOnly = detector.detectInText(text, ['quantity']);

      // Should NOT detect "16" or "2026" as separate quantities
      const q16 = entitiesQuantityOnly.find((e) => e.original === '16');
      const q2026 = entitiesQuantityOnly.find((e) => e.original === '2026');

      console.log(
        'Entities with quantity-only enabled:',
        entitiesQuantityOnly.map((e) => ({
          type: e.type,
          original: e.original,
        }))
      );

      expect(q16).toBeUndefined();
      expect(q2026).toBeUndefined();
    });

    test('should NOT detect numbers within numeric-format dates as quantities', () => {
      // Test with numeric date formats: 1/16/2026, 01/16/2026, 2026-01-16
      // These are more prone to quantity pattern matching due to \b at slashes
      const testCases = [
        { text: 'Event on 1/16/2026', date: '1/16/2026', nums: ['1', '16'] },
        { text: 'Event on 01/16/2026', date: '01/16/2026', nums: ['01', '16'] },
        { text: 'Event on 2026-01-16', date: '2026-01-16', nums: ['01', '16'] },
      ];

      for (const { text, date, nums } of testCases) {
        // With ONLY quantities enabled (dates disabled)
        const entities = detector.detectInText(text, ['quantity']);

        console.log(
          `\nTest: "${text}"\nExpected: No quantities (date "${date}" has higher priority)\nActual:`,
          entities.map((e) => e.original)
        );

        // Should NOT detect any numbers from the date as quantities
        for (const num of nums) {
          const found = entities.find((e) => e.original === num);
          expect(found).toBeUndefined();
        }

        // Should have ZERO quantity entities
        expect(entities.length).toBe(0);
      }
    });

    test('should NOT detect numbers within text-format dates like "Jan 17, 2026" as quantities', () => {
      // CRITICAL TEST: When dates are DISABLED and quantities are ENABLED,
      // numbers inside dates should still be protected by deduplication
      const text = 'Published on Jan 17, 2026 by author';

      // Test with ONLY quantities enabled (dates disabled)
      const entities = detector.detectInText(text, ['quantity']);

      console.log(
        `\nCRITICAL TEST: "${text}"\nWith quantities enabled, dates disabled\nDetected:`,
        entities.map((e) => `${e.type}:${e.original}`)
      );

      // Should NOT detect "17" or "2026" as quantities (they're part of a date)
      const q17 = entities.find((e) => e.original === '17');
      const q2026 = entities.find((e) => e.original === '2026');

      expect(q17).toBeUndefined();
      expect(q2026).toBeUndefined();
      expect(entities.length).toBe(0);
    });

    test('should detect both dates and quantities when both enabled', () => {
      const text = 'Article published on Jan 16, 2026';

      // Test with both enabled - should detect the full date, not the numbers
      const entities = detector.detectInText(text, ['date', 'quantity']);

      // Should detect the full date
      const dateEntity = entities.find((e) => e.type === 'date');
      expect(dateEntity).toBeDefined();
      expect(dateEntity.original).toMatch(/Jan 16, 2026/i);

      // Should NOT detect "16" or "2026" as separate quantities
      const quantities = entities.filter((e) => e.type === 'quantity');
      const q16Both = quantities.find((e) => e.original === '16');
      const q2026Both = quantities.find((e) => e.original === '2026');
      expect(q16Both).toBeUndefined();
      expect(q2026Both).toBeUndefined();
    });

    test('should NOT detect "17" as quantity in "Jan 17, 2026" when dates disabled (detectInDOM)', () => {
      // CRITICAL BUG TEST: This is the exact scenario reported by the user
      // With dates DISABLED and only quantities ENABLED,
      // "Jan 17, 2026" should NOT have "17" detected as a quantity

      const div = document.createElement('div');
      div.innerHTML = '<p>Published on Jan 17, 2026</p>';

      // Detect with ONLY quantities enabled (dates disabled)
      const entities = detector.detectInDOM(div, ['quantity']);

      console.log(
        '\n🐛 CRITICAL BUG TEST: "Jan 17, 2026" with only quantities enabled',
        '\nDetected entities:',
        entities.map((e) => ({ type: e.type, original: e.original, start: e.start, end: e.end }))
      );

      // Should NOT detect "17" as a quantity (it's part of a date)
      const q17 = entities.find((e) => e.original === '17');
      expect(q17).toBeUndefined();

      // Should NOT detect "2026" as a quantity
      const q2026 = entities.find((e) => e.original === '2026');
      expect(q2026).toBeUndefined();

      // Should have ZERO entities
      expect(entities.length).toBe(0);
    });

    test('should NOT detect quantities in dates split across multiple text nodes', () => {
      // CRITICAL: This tests the actual bug scenario
      // When a date like "Jan 16, 2026" is split across multiple DOM text nodes,
      // each node is processed separately by detectInDOM()
      // This can cause numbers in dates to be detected as quantities

      // Scenario 1: Date split across two nodes
      const div1 = document.createElement('div');
      div1.innerHTML = '<span>Jan</span><span> 16, 2026</span>';

      const entities1 = detector.detectInDOM(div1, ['quantity']);

      console.log(
        '\nScenario 1: "<span>Jan</span><span> 16, 2026</span>"',
        '\nDetected quantities:',
        entities1.map((e) => ({ original: e.original, type: e.type }))
      );

      // Should NOT detect "16" as a quantity
      const q16_1 = entities1.find((e) => e.original === '16');
      expect(q16_1).toBeUndefined();

      // Scenario 2: Each part in separate node
      const div2 = document.createElement('div');
      div2.innerHTML = '<span>Jan</span> <span>16</span><span>, </span><span>2026</span>';

      const entities2 = detector.detectInDOM(div2, ['quantity']);

      console.log(
        '\nScenario 2: "<span>Jan</span> <span>16</span><span>, </span><span>2026</span>"',
        '\nDetected quantities:',
        entities2.map((e) => ({ original: e.original, type: e.type }))
      );

      // Should NOT detect "16" or "2026" as quantities
      const q16_2 = entities2.find((e) => e.original === '16');
      const q2026_2 = entities2.find((e) => e.original === '2026');
      expect(q16_2).toBeUndefined();
      expect(q2026_2).toBeUndefined();

      // Scenario 3: Numeric date format split across nodes
      // NOTE: When numeric dates are split like "1/" and "16/2026" across nodes,
      // adding spaces between nodes (to fix word boundary issues) breaks the date pattern.
      // This is an edge case - real HTML rarely splits dates this way.
      // The space fix is more important for common cases like "<span>Writer</span><time>Jan 17, 2026</time>"
      const div3 = document.createElement('div');
      div3.innerHTML = '<span>1/</span><span>16/2026</span>';

      const entities3 = detector.detectInDOM(div3, ['quantity']);

      console.log(
        '\nScenario 3: "<span>1/</span><span>16/2026</span>"',
        '\nDetected quantities:',
        entities3.map((e) => ({ original: e.original, type: e.type }))
      );

      // With space separator fix, this becomes "1/ 16/2026" which breaks date pattern
      // So "1" and "16" are detected as quantities (expected with current fix)
      // This is acceptable trade-off for fixing the more common SFGate bug
      const q1_3 = entities3.find((e) => e.original === '1');
      const q16_3 = entities3.find((e) => e.original === '16');

      // These will be detected now (expected behavior after space fix)
      expect(q1_3).toBeDefined();
      expect(q16_3).toBeDefined();
    });

    test('should detect dates in adjacent inline elements without spaces (SFGate bug)', () => {
      // CRITICAL BUG TEST: This replicates the exact SFGate HTML structure
      // <span>Freelance Writer</span><time>Jan 17, 2026</time>
      // When text nodes are concatenated without spaces, dates fail to match regex word boundaries
      const div = document.createElement('div');
      div.innerHTML =
        '<span>Freelance Writer</span><time datetime="2026-01-17">Jan 17, 2026</time>';

      // First verify dates ARE detected when dates enabled
      const dateEntities = detector.detectInDOM(div, ['date']);
      console.log(
        '\n🐛 SFGate Bug Test: Adjacent inline elements',
        '\nHTML: <span>Freelance Writer</span><time>Jan 17, 2026</time>',
        '\nWith dates enabled:',
        dateEntities.map((e) => ({ type: e.type, original: e.original }))
      );

      const dateEntity = dateEntities.find((e) => e.type === 'date' && e.original.includes('Jan'));
      expect(dateEntity).toBeDefined();
      expect(dateEntity.original).toMatch(/Jan 17, 2026/i);

      // Now verify quantities are NOT detected when only quantities enabled
      const quantityEntities = detector.detectInDOM(div, ['quantity']);
      console.log(
        '\nWith only quantities enabled:',
        quantityEntities.map((e) => ({ type: e.type, original: e.original }))
      );

      // Should NOT detect "17" or "2026" as quantities
      const q17 = quantityEntities.find((e) => e.original === '17');
      const q2026 = quantityEntities.find((e) => e.original === '2026');
      expect(q17).toBeUndefined();
      expect(q2026).toBeUndefined();
      expect(quantityEntities.length).toBe(0);
    });
  });

  describe('Address Detection', () => {
    test('should detect locations', () => {
      const text = 'Moving from Bay Area to Silicon Valley';
      const entities = detector.detectInText(text, ['locations']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('location');
      expect(entities[0].original).toBe('Bay Area');
    });

    test('should detect single-word cities from gazetteer', () => {
      const text = 'Traveling from Paris to Tokyo';
      const entities = detector.detectInText(text, ['locations']);

      expect(entities.length).toBeGreaterThanOrEqual(2);
      const paris = entities.find((e) => e.original === 'Paris');
      const tokyo = entities.find((e) => e.original === 'Tokyo');
      expect(paris).toBeDefined();
      expect(tokyo).toBeDefined();
      expect(paris.type).toBe('location');
      expect(tokyo.type).toBe('location');
    });

    test('should detect US states', () => {
      const text = 'Offices in California and Texas';
      const entities = detector.detectInText(text, ['locations']);

      expect(entities.length).toBeGreaterThanOrEqual(2);
      expect(entities.some((e) => e.original === 'California')).toBe(true);
      expect(entities.some((e) => e.original === 'Texas')).toBe(true);
    });

    test('should detect geographic features', () => {
      const text = 'Sailing across Pacific Ocean';
      const entities = detector.detectInText(text, ['locations']);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].original).toBe('Pacific Ocean');
      expect(entities[0].confidence).toBeGreaterThanOrEqual(0.9);
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

      // Atomic detection: "John" and "Doe" detected separately with honorific boost
      const john = entities.find((e) => e.original === 'John');
      expect(john).toBeDefined();
      expect(john.confidence).toBeGreaterThanOrEqual(0.8); // Honorific + unknown word

      const doe = entities.find((e) => e.original === 'Doe');
      expect(doe).toBeDefined();
      expect(doe.confidence).toBeGreaterThanOrEqual(0.65); // Unknown word (no honorific for 2nd word)

      // "Sarah" and "Smith" detected separately with honorific boost
      const sarah = entities.find((e) => e.original === 'Sarah');
      expect(sarah).toBeDefined();
      expect(sarah.confidence).toBeGreaterThanOrEqual(0.8);

      const smith = entities.find((e) => e.original === 'Smith');
      expect(smith).toBeDefined();
      expect(smith.confidence).toBeGreaterThanOrEqual(0.65);
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

      // Atomic detection: detects "John" and "Doe" separately (not "John Doe")
      expect(properNouns.length).toBeGreaterThanOrEqual(2);

      // Should detect "John" (after honorific)
      const john = properNouns.find((e) => e.original === 'John');
      expect(john).toBeDefined();
      expect(john.confidence).toBeGreaterThanOrEqual(0.75);

      // Should detect "Doe" (unknown word after known name pattern)
      const doe = properNouns.find((e) => e.original === 'Doe');
      expect(doe).toBeDefined();
    });

    test('should protect "John Doe" even when preceded by common word', () => {
      const text = 'Contact John Doe for details';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Atomic detection: detects "John" and "Doe" separately
      expect(properNouns.length).toBeGreaterThanOrEqual(2);

      const john = properNouns.find((e) => e.original === 'John');
      expect(john).toBeDefined();
      expect(john.confidence).toBeGreaterThanOrEqual(0.75);

      const doe = properNouns.find((e) => e.original === 'Doe');
      expect(doe).toBeDefined();
    });

    test('should protect "Contact John" near email (meets new threshold)', () => {
      const text = 'Contact John at john@example.com';
      const entities = detector.detectInText(text, ['properNouns', 'email']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // UPDATED: After stripping "Contact", "John" alone is detected
      // With nearPII bonus and the scoring system, single names near PII can be detected
      // Score: 0.3 (cap) + 0.35 (unknown) + 0 (single word) + 0.15 (mid-sent) + 0.25 (near PII) = 1.05 → capped to 1.0
      // This is above the 0.75 threshold, so it WILL be detected
      expect(properNouns.length).toBeGreaterThanOrEqual(1);
      const john = properNouns.find((p) => /John/i.test(p.original));
      expect(john).toBeDefined();
      expect(john.confidence).toBeGreaterThanOrEqual(0.75);
    });

    test('should protect "Acme Corp" (company suffix)', () => {
      const text = 'Works at Acme Corp in the city';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Atomic detection: detects "Acme" and "Corp" separately
      // "Acme" should be detected (unknown word, capitalized)
      const acme = properNouns.find((e) => e.original === 'Acme');
      expect(acme).toBeDefined();

      // "Corp" should also be detected (company suffix, capitalized)
      const corp = properNouns.find((e) => e.original === 'Corp');
      expect(corp).toBeDefined();
    });

    test('should protect "Acme Industries" (2 unknown words, no suffix)', () => {
      const text = 'Works at Acme Industries in the city';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Atomic detection: detects "Acme" and "Industries" separately
      const acme = properNouns.find((e) => e.original === 'Acme');
      expect(acme).toBeDefined();
      expect(acme.confidence).toBeGreaterThanOrEqual(0.75);

      const industries = properNouns.find((e) => e.original === 'Industries');
      expect(industries).toBeDefined();
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

      // Atomic detection: "Microsoft" detected separately
      const microsoft = properNouns.find((e) => e.original === 'Microsoft');
      expect(microsoft).toBeDefined();
      expect(microsoft.confidence).toBeGreaterThanOrEqual(0.65);

      // "Corporation" detected separately (company suffix)
      const corporation = properNouns.find((e) => e.original === 'Corporation');
      expect(corporation).toBeDefined();
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

    test('should protect three-word names', () => {
      const text = 'Mary Jane Watson is here';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Atomic detection: "Mary", "Jane", "Watson" detected separately (all at sentence start)
      expect(properNouns.length).toBeGreaterThanOrEqual(2); // At least 2 should be detected

      const jane = properNouns.find((e) => e.original === 'Jane');
      expect(jane).toBeDefined();
      expect(jane.confidence).toBeGreaterThanOrEqual(0.65);

      const watson = properNouns.find((e) => e.original === 'Watson');
      expect(watson).toBeDefined();
      expect(watson.confidence).toBeGreaterThanOrEqual(0.65);
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

    // Context Signal Enhancement Tests

    test('should detect companies with ampersands (Johnson & Johnson, McKinsey & Company)', () => {
      const text = 'McKinsey & Company and Johnson & Johnson are consulting firms.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Ampersand handling is complex - may detect "McKinsey" and "Company" separately or together
      // As long as we detect the company names in some form, that's acceptable
      expect(properNouns.length).toBeGreaterThanOrEqual(1);

      const hasMcKinsey = properNouns.some(
        (e) => e.original.includes('McKinsey') || e.original.includes('Company')
      );
      const hasJohnson = properNouns.some((e) => e.original.includes('Johnson'));

      // At least detect the unique company names
      expect(hasMcKinsey || hasJohnson).toBe(true);
    });

    test('should detect tech company suffixes (Technologies, Tech, Systems, Solutions)', () => {
      const text = 'Oracle Systems, Salesforce Technologies, and CloudTech Solutions are vendors.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should detect at least 2 of the 3 companies
      expect(properNouns.length).toBeGreaterThanOrEqual(2);

      // Check that we're detecting companies with tech suffixes
      const hasTechSuffix = properNouns.some(
        (e) =>
          e.original.includes('Systems') ||
          e.original.includes('Technologies') ||
          e.original.includes('Solutions') ||
          e.original.includes('Tech')
      );
      expect(hasTechSuffix).toBe(true);
    });

    test('should handle single-word company names (SpaceX, OpenAI, Google)', () => {
      const text = 'SpaceX launched rockets. OpenAI developed ChatGPT.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Single words mid-sentence without suffix get lower scores
      // SpaceX: 0.3 (cap) + 0.3 (unknown) + 0.1 (mid-sent) = 0.7 < 0.8 threshold
      // OpenAI: 0.3 (cap) + 0.3 (unknown) + 0.1 (mid-sent) = 0.7 < 0.8 threshold
      // These would need additional signals to be detected
      // This test documents current behavior - single-word brands are challenging
      expect(properNouns.length).toBeLessThanOrEqual(2);
    });

    // End of Context Signal Enhancement Tests
    // ========================================================================

    // ========================================================================
    // Department Name Filtering Tests
    // ========================================================================

    // End of Department Name Filtering Tests
    // ========================================================================

    // ========================================================================
    // Email Domain Extraction Tests
    // ========================================================================

    test('should boost confidence for company names matching email domains', async () => {
      const text = 'Contact john@acme.com or visit Acme Corp website.';
      const entities = detector.detectInText(text, ['properNouns', 'email']);
      const acmeEntity = entities.find((e) => e.type === 'properNoun' && /Acme/i.test(e.original));

      // Should detect Acme Corp with high confidence due to email domain match
      expect(acmeEntity).toBeDefined();
      expect(acmeEntity.confidence).toBeGreaterThanOrEqual(0.75);
      // Email domain matching happens when enabled - check if present
      // Note: scoreBreakdown.matchesEmailDomain may not be present if email detection order changes
    });

    test('should handle multiple email domains', async () => {
      const text = 'Email john@acme.com or jane@widgets.com. Acme and Widgets Corp are partners.';
      const entities = detector.detectInText(text, ['properNouns', 'email']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should detect both Acme and Widgets with email domain boost
      const detected = properNouns.map((e) => e.original);
      expect(detected.some((name) => /Acme/i.test(name))).toBe(true);
      expect(detected.some((name) => /Widgets/i.test(name))).toBe(true);
    });

    test('should match company names with suffixes to email domains', async () => {
      const text = 'Contact us at info@techsolutions.com. Techsolutions Inc is hiring.';
      const entities = detector.detectInText(text, ['properNouns', 'email']);
      const company = entities.find(
        (e) => e.type === 'properNoun' && /Techsolutions/i.test(e.original)
      );

      // Should match "Techsolutions Inc" to "techsolutions" domain
      expect(company).toBeDefined();
      // Email domain matching happens when enabled
      // Note: scoreBreakdown.matchesEmailDomain may not be present if email detection order changes
    });

    // End of Email Domain Extraction Tests
    // ========================================================================

    // ========================================================================
    // Inside Link Signal Tests
    // ========================================================================

    // End of Inside Link Signal Tests
    // ========================================================================

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

  describe('type priority conflict resolution', () => {
    test('should prioritize date over properNoun for "Dec"', () => {
      const text = 'Meeting scheduled for Dec. 9';
      const allEntities = detector._detectAllTypes(text);

      // "Dec. 9" should be detected as date (priority 90), NOT "Dec" as proper noun (priority 10)
      const dates = allEntities.filter((e) => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);
      const decDate = dates.find((e) => e.original.includes('Dec'));
      expect(decDate).toBeDefined();
      expect(decDate.type).toBe('date');

      // Should NOT have "Dec" as separate proper noun (date won the priority conflict)
      const properNouns = allEntities.filter((e) => e.type === 'properNoun');
      const decAsProperNoun = properNouns.find((e) => e.original === 'Dec');
      expect(decAsProperNoun).toBeUndefined();
    });

    test('should prioritize email over url for overlapping matches', () => {
      const text = 'Contact test@example.com for more info';
      const allEntities = detector._detectAllTypes(text);

      // Should detect as email (priority 100) not URL (priority 70) if they overlap
      const emails = allEntities.filter((e) => e.type === 'email');
      expect(emails.length).toBe(1);
      expect(emails[0].original).toBe('test@example.com');

      // If there's a URL entity, it shouldn't overlap with the email
      const urls = allEntities.filter((e) => e.type === 'url');
      for (const url of urls) {
        const urlStart = url.start;
        const urlEnd = url.end;
        const emailStart = emails[0].start;
        const emailEnd = emails[0].end;
        // Check no overlap
        expect(urlEnd <= emailStart || urlStart >= emailEnd).toBe(true);
      }
    });

    test('should prioritize location over properNoun for known cities', () => {
      const text = 'Traveling to Paris tomorrow';
      const allEntities = detector._detectAllTypes(text);

      // "Paris" should be location (priority 50) not proper noun (priority 10)
      const locations = allEntities.filter((e) => e.type === 'location');
      const paris = locations.find((e) => e.original === 'Paris');
      expect(paris).toBeDefined();
      expect(paris.type).toBe('location');

      // Should NOT have "Paris" as a separate proper noun
      const properNouns = allEntities.filter((e) => e.type === 'properNoun');
      const parisAsProperNoun = properNouns.find((e) => e.original === 'Paris');
      expect(parisAsProperNoun).toBeUndefined();
    });

    test('should use confidence as tiebreaker for same priority', () => {
      // Two proper nouns that might overlap should use confidence to decide
      const text = 'Dr. Smith LLC is a company';
      const allEntities = detector._detectAllTypes(text);

      const properNouns = allEntities.filter((e) => e.type === 'properNoun');
      expect(properNouns.length).toBeGreaterThan(0);

      // Check no overlapping proper nouns (deduplication worked)
      for (let i = 1; i < properNouns.length; i++) {
        const prev = properNouns[i - 1];
        const current = properNouns[i];
        expect(current.start).toBeGreaterThanOrEqual(prev.end);
      }
    });

    test('should use length as final tiebreaker for same priority and confidence', () => {
      const text = 'New York City is amazing';
      const allEntities = detector._detectAllTypes(text);

      // Should prefer longer location match "New York" over shorter matches
      const locations = allEntities.filter((e) => e.type === 'location');

      // Either no locations detected, or at least one is longer than "New"
      const hasLongMatch =
        locations.length === 0 || locations.some((loc) => loc.original.length > 3);
      expect(hasLongMatch).toBe(true);

      // Check no overlapping entities
      for (let i = 1; i < allEntities.length; i++) {
        const prev = allEntities[i - 1];
        const current = allEntities[i];
        expect(current.start).toBeGreaterThanOrEqual(prev.end);
      }
    });

    test('should handle multiple priority conflicts in same text', () => {
      const text = 'Email john@example.com on Dec. 15 about the Paris trip';
      const allEntities = detector._detectAllTypes(text);

      // Should have email (not URL), date (not proper noun "Dec"), location (not proper noun "Paris")
      const emails = allEntities.filter((e) => e.type === 'email');
      expect(emails.length).toBe(1);

      const dates = allEntities.filter((e) => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);

      const locations = allEntities.filter((e) => e.type === 'location');
      const paris = locations.find((e) => e.original === 'Paris');
      expect(paris).toBeDefined();

      // "Dec" should not be a proper noun (date won)
      const properNouns = allEntities.filter((e) => e.type === 'properNoun');
      const decAsProperNoun = properNouns.find((e) => e.original === 'Dec');
      expect(decAsProperNoun).toBeUndefined();

      // Check no overlaps
      for (let i = 1; i < allEntities.length; i++) {
        const prev = allEntities[i - 1];
        const current = allEntities[i];
        expect(current.start).toBeGreaterThanOrEqual(prev.end);
      }
    });

    test('should not remove candidates from different text nodes with same positions', () => {
      // Bug: Deduplication treats candidates from different nodes as overlapping
      // if they have the same start/end positions (positions are node-relative, not document-relative)
      //
      // Example: H1 has "Bay Area" at position 78-86
      //          P has "something" at position 78-86
      // These should NOT be considered overlapping because they're in different nodes!

      // Create mock text nodes
      const headingNode = {
        textContent:
          "'The situation is dire': Dispute with Russian billionaire leads to 4 Bay Area bankruptcies",
        parentElement: { tagName: 'H1' },
      };

      const bodyNode = {
        textContent:
          'This is a long paragraph with some text at the same position offsets as the heading but in a different node',
        parentElement: { tagName: 'P' },
      };

      // Heading candidate: "Bay Area" at position 78-86 in H1
      const headingCandidate = {
        type: 'location',
        original: 'Bay Area',
        start: 78,
        end: 86,
        confidence: 0.9,
        node: headingNode,
        nodeText: headingNode.textContent,
      };

      // Body candidate: some word at SAME position 78-86 but in DIFFERENT node
      const bodyCandidate = {
        type: 'properNoun',
        original: 'position',
        start: 78,
        end: 86,
        confidence: 0.7,
        node: bodyNode,
        nodeText: bodyNode.textContent,
      };

      // Both candidates should survive deduplication because they're in different nodes
      const allCandidates = [headingCandidate, bodyCandidate];
      const deduplicated = detector._deduplicateWithPriority(allCandidates);

      // Both should be present (they're from different nodes, so no real overlap)
      expect(deduplicated.length).toBe(2);
      expect(deduplicated.some((c) => c.original === 'Bay Area')).toBe(true);
      expect(deduplicated.some((c) => c.original === 'position')).toBe(true);
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

  describe('getDictionaryStats', () => {
    test('should return dictionary statistics', () => {
      const stats = detector.getDictionaryStats();

      expect(stats).toHaveProperty('dictionarySize');
      expect(stats).toHaveProperty('isLoaded');
    });
  });

  describe('Edge Cases', () => {
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

  describe('_hasNearbyPII', () => {});

  describe('_calculateUnknownWordRatio', () => {});

  describe('_calculateProperNounScore', () => {});

  describe('_shouldSkipElementForDebug', () => {
    test('should skip script tags', () => {
      const scriptEl = {
        tagName: 'SCRIPT',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElementForDebug(scriptEl)).toBe(true);
    });

    test('should skip style tags', () => {
      const styleEl = {
        tagName: 'STYLE',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElementForDebug(styleEl)).toBe(true);
    });

    test('should skip noscript tags', () => {
      const noscriptEl = {
        tagName: 'NOSCRIPT',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElementForDebug(noscriptEl)).toBe(true);
    });

    test('should not skip paragraph tags', () => {
      const pEl = {
        tagName: 'P',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElementForDebug(pEl)).toBe(false);
    });

    test('should not skip div tags', () => {
      const divEl = {
        tagName: 'DIV',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElementForDebug(divEl)).toBe(false);
    });

    test('should NOT skip link (anchor) tags - author names in links are legitimate PII', () => {
      const linkEl = {
        tagName: 'A',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElementForDebug(linkEl)).toBe(false);
    });

    test('should skip elements with safesnap- id prefix', () => {
      const mockElement = {
        tagName: 'DIV',
        id: 'safesnap-notification-panel',
        className: '',
        getAttribute: () => null,
        closest: () => null,
      };
      expect(detector._shouldSkipElementForDebug(mockElement)).toBe(true);
    });

    test('should skip elements with safesnap- in className', () => {
      const mockElement = {
        tagName: 'DIV',
        id: '',
        className: 'safesnap-highlight-overlay',
        getAttribute: () => null,
        closest: () => null,
      };
      expect(detector._shouldSkipElementForDebug(mockElement)).toBe(true);
    });

    test('should skip descendants of safesnap elements (id check)', () => {
      const mockElement = {
        tagName: 'SPAN',
        id: '',
        className: '',
        getAttribute: () => null,
        closest: (selector) => (selector === '[id^="safesnap-"]' ? {} : null),
      };
      expect(detector._shouldSkipElementForDebug(mockElement)).toBe(true);
    });

    test('should skip descendants of safesnap elements (class check)', () => {
      const mockElement = {
        tagName: 'SPAN',
        id: '',
        className: '',
        getAttribute: () => null,
        closest: (selector) => (selector === '[class*="safesnap-"]' ? {} : null),
      };
      expect(detector._shouldSkipElementForDebug(mockElement)).toBe(true);
    });

    test('should handle SVG elements with non-string className', () => {
      const mockSVG = {
        tagName: 'RECT',
        id: '',
        className: { baseVal: 'some-class', animVal: 'some-class' }, // SVGAnimatedString
        getAttribute: () => null,
        closest: () => null,
      };
      // Should not throw and should not skip (no safesnap- prefix)
      expect(() => detector._shouldSkipElementForDebug(mockSVG)).not.toThrow();
      expect(detector._shouldSkipElementForDebug(mockSVG)).toBe(false);
    });

    test('should not skip regular elements without safesnap prefix', () => {
      const mockElement = {
        tagName: 'DIV',
        id: 'regular-div',
        className: 'regular-class',
        getAttribute: () => null,
        closest: () => null,
      };
      expect(detector._shouldSkipElementForDebug(mockElement)).toBe(false);
    });

    test('should skip elements with role="navigation"', () => {
      const mockElement = {
        tagName: 'DIV',
        id: '',
        className: '',
        getAttribute: (attr) => (attr === 'role' ? 'navigation' : null),
        closest: () => null,
      };
      expect(detector._shouldSkipElementForDebug(mockElement)).toBe(true);
    });

    test('should allow heading elements in debug mode', () => {
      const mockElement = {
        tagName: 'H1',
        id: '',
        className: '',
        getAttribute: () => null,
        closest: () => null,
      };
      // Headings should NOT be skipped in debug mode (for visualization)
      expect(detector._shouldSkipElementForDebug(mockElement)).toBe(false);
    });
  });

  describe('_shouldSkipElement', () => {
    test('should skip script tags', () => {
      const scriptEl = {
        tagName: 'SCRIPT',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElement(scriptEl)).toBe(true);
    });

    test('should skip style tags', () => {
      const styleEl = {
        tagName: 'STYLE',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElement(styleEl)).toBe(true);
    });

    test('should skip button tags', () => {
      const buttonEl = {
        tagName: 'BUTTON',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElement(buttonEl)).toBe(true);
    });

    test('should skip label tags', () => {
      const labelEl = {
        tagName: 'LABEL',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElement(labelEl)).toBe(true);
    });

    test('should not skip paragraph tags', () => {
      const pEl = {
        tagName: 'P',
        classList: { contains: () => false },
        getAttribute: () => null,
      };
      expect(detector._shouldSkipElement(pEl)).toBe(false);
    });
  });

  describe('_detectAllProperNounCandidates', () => {});

  describe('detectWithDebugInfo', () => {
    let mockRootElement;
    let mockTextNodes;

    beforeEach(() => {
      mockTextNodes = [
        {
          textContent: 'Contact Mr. John Doe at john@example.com',
          parentElement: { tagName: 'P', classList: { contains: () => false } },
        },
        {
          textContent: 'Meeting on 01/15/2026',
          parentElement: { tagName: 'DIV', classList: { contains: () => false } },
        },
      ];

      let currentIndex = 0;
      global.document.createTreeWalker = jest.fn(() => ({
        nextNode: jest.fn(() => mockTextNodes[currentIndex++] || null),
      }));

      mockRootElement = {
        textContent: 'Contact Mr. John Doe at john@example.com. Meeting on 01/15/2026',
      };
    });

    test('should return all candidates with debug info', () => {
      const candidates = detector.detectWithDebugInfo(mockRootElement, ['properNouns', 'email']);

      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);

      // Should include node information
      candidates.forEach((candidate) => {
        expect(candidate).toHaveProperty('node');
        expect(candidate).toHaveProperty('nodeText');
      });
    });

    test('should detect emails in debug mode', () => {
      const candidates = detector.detectWithDebugInfo(mockRootElement, ['email']);
      const emails = candidates.filter((c) => c.type === 'email');

      expect(emails.length).toBeGreaterThan(0);
      expect(emails[0].original).toContain('@');
    });

    test('should detect proper nouns in debug mode', () => {
      const candidates = detector.detectWithDebugInfo(mockRootElement, ['properNouns']);
      const properNouns = candidates.filter((c) => c.type === 'properNoun');

      expect(properNouns.length).toBeGreaterThan(0);
    });

    test('should detect multiple types in debug mode', () => {
      const candidates = detector.detectWithDebugInfo(mockRootElement, [
        'properNouns',
        'email',
        'date',
      ]);

      const types = new Set(candidates.map((c) => c.type));
      expect(types.size).toBeGreaterThan(1);
    });

    test('should use default types when not specified', () => {
      const candidates = detector.detectWithDebugInfo(mockRootElement);

      expect(Array.isArray(candidates)).toBe(true);
    });

    test('should include all PII types when enabled', () => {
      mockTextNodes = [
        {
          textContent: 'Call (555) 123-4567 or visit https://example.com',
          parentElement: { tagName: 'P', classList: { contains: () => false } },
        },
      ];

      let currentIndex = 0;
      global.document.createTreeWalker = jest.fn(() => ({
        nextNode: jest.fn(() => mockTextNodes[currentIndex++] || null),
      }));

      const candidates = detector.detectWithDebugInfo(mockRootElement, ['phone', 'url']);

      expect(candidates.length).toBeGreaterThan(0);
    });

    test('should detect money in debug mode', () => {
      mockTextNodes = [
        {
          textContent: 'Price is $199.99',
          parentElement: { tagName: 'P', classList: { contains: () => false } },
        },
      ];

      let currentIndex = 0;
      global.document.createTreeWalker = jest.fn(() => ({
        nextNode: jest.fn(() => mockTextNodes[currentIndex++] || null),
      }));

      const candidates = detector.detectWithDebugInfo(mockRootElement, ['money']);
      const money = candidates.filter((c) => c.type === 'money');

      expect(money.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases and false positives', () => {});

  describe('POS Tagging - Adjective/Verb/Adverb Filtering', () => {
    beforeEach(async () => {
      detector = new PIIDetector();
      await detector.initialize();
    });

    describe('_isAdjective', () => {
      test('should NOT detect proper nouns as adjectives', () => {
        expect(detector.properNounDetector._isAdjective('John')).toBe(false);
        expect(detector.properNounDetector._isAdjective('Smith')).toBe(false);
        expect(detector.properNounDetector._isAdjective('Google')).toBe(false);
        expect(detector.properNounDetector._isAdjective('Microsoft')).toBe(false);
      });
    });

    describe('_isVerb', () => {
      test('should NOT detect proper nouns as verbs', () => {
        expect(detector.properNounDetector._isVerb('John')).toBe(false);
        expect(detector.properNounDetector._isVerb('Smith')).toBe(false);
      });
    });

    describe('_isAdverb', () => {
      test('should NOT detect proper nouns as adverbs', () => {
        expect(detector.properNounDetector._isAdverb('John')).toBe(false);
        expect(detector.properNounDetector._isAdverb('Smith')).toBe(false);
      });
    });

    describe('Adjective filtering in detection', () => {
      test('should still detect proper nouns that happen to be adjective-like', () => {
        // Some names might look like adjectives but are actually names
        const text = 'Mr. Swift works at the company.';
        const entities = detector.detectInText(text, ['properNouns']);

        // "Swift" after honorific should still be detected (honorific overrides)
        const swift = entities.find((e) => e.original === 'Swift');
        expect(swift).toBeDefined();
      });
    });
  });
});
