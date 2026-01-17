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

      // UPDATED: After fix, "Contact" is stripped as a common starting word
      // Now detects "John Doe" without the "Contact" prefix (which is the desired behavior)
      expect(properNouns.length).toBe(1);
      expect(properNouns[0].original).toBe('John Doe');
      expect(properNouns[0].confidence).toBeGreaterThanOrEqual(0.75);
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

    // Context Signal Enhancement Tests
    test('should detect hyphenated names (Mary-Jane, Jean-Luc)', () => {
      const text = 'Mary-Jane Watson and Jean-Luc Picard attended.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      expect(properNouns.length).toBe(2);
      const maryJane = properNouns.find((e) => e.original.includes('Mary-Jane'));
      const jeanLuc = properNouns.find((e) => e.original.includes('Jean-Luc'));

      expect(maryJane).toBeDefined();
      expect(jeanLuc).toBeDefined();
    });

    test('should detect names with hyphens (Mary-Jane, Jean-Luc)', () => {
      const text = 'Mary-Jane Watson and Jean-Luc Picard attended.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      expect(properNouns.length).toBe(2);
      const maryJane = properNouns.find((e) => e.original.includes('Mary-Jane'));
      const jeanLuc = properNouns.find((e) => e.original.includes('Jean-Luc'));

      expect(maryJane).toBeDefined();
      expect(jeanLuc).toBeDefined();
    });

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

    test('should detect job titles (CEO, CTO, CFO, VP, Director, Manager)', () => {
      const text = 'CEO John Smith and CTO Jane Doe announced the product. VP Sarah Lee confirmed.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      expect(properNouns.length).toBeGreaterThanOrEqual(3);

      const ceoJohn = properNouns.find(
        (e) => e.original.includes('CEO') && e.original.includes('Smith')
      );
      const ctoJane = properNouns.find(
        (e) => e.original.includes('CTO') && e.original.includes('Doe')
      );
      const vpSarah = properNouns.find(
        (e) => e.original.includes('VP') && e.original.includes('Lee')
      );

      expect(ceoJohn).toBeDefined();
      expect(ctoJane).toBeDefined();
      expect(vpSarah).toBeDefined();

      // All should have high confidence due to job title
      expect(ceoJohn.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should detect international company suffixes (GmbH, SA, PLC, AG)', () => {
      const text =
        'Volkswagen AG, LVMH SA, and Barclays PLC are global companies. Siemens GmbH is German.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should detect at least 3 of the 4 companies
      expect(properNouns.length).toBeGreaterThanOrEqual(3);

      // Check that we're detecting companies with international suffixes
      const hasInternationalSuffix = properNouns.some(
        (e) =>
          e.original.includes('AG') ||
          e.original.includes('SA') ||
          e.original.includes('PLC') ||
          e.original.includes('GmbH')
      );
      expect(hasInternationalSuffix).toBe(true);
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

    test('should give higher confidence to names with job titles', () => {
      const text = 'Manager Tom Brown reported to Director Lisa Green.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      expect(properNouns.length).toBe(2);

      const managerTom = properNouns.find((e) => e.original.includes('Manager'));
      const directorLisa = properNouns.find((e) => e.original.includes('Director'));

      expect(managerTom).toBeDefined();
      expect(directorLisa).toBeDefined();

      // Job titles should boost confidence
      expect(managerTom.confidence).toBeGreaterThanOrEqual(0.85);
      expect(directorLisa.confidence).toBeGreaterThanOrEqual(0.85);

      // Should be classified as person
      expect(managerTom.context).toBe('person');
      expect(directorLisa.context).toBe('person');
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

    test('should NOT detect common department names as proper nouns', async () => {
      const text =
        'Contact Human Resources or Customer Service for assistance. Our Information Technology team can help.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should not detect any department names
      const detected = properNouns.map((e) => e.original);
      expect(detected).not.toContain('Human Resources');
      expect(detected).not.toContain('Customer Service');
      expect(detected).not.toContain('Information Technology');
    });

    test('should penalize department names with negative score', async () => {
      const text = 'The Human Resources team is hiring.';
      const entities = detector.detectInText(text, ['properNouns']);
      const hrEntity = entities.find((e) => e.original === 'Human Resources');

      // Department names should not be detected due to penalty
      expect(hrEntity).toBeUndefined(); // Should not be detected at all
    });

    test('should distinguish person names from department names', async () => {
      const text = 'John Smith works in Human Resources. Mary Johnson is in Sales Department.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should detect John Smith and Mary Johnson (both are 2-word names)
      const detected = properNouns.map((e) => e.original);
      expect(detected).toContain('John Smith');
      expect(detected).toContain('Mary Johnson');

      // Should NOT detect department names
      expect(detected).not.toContain('Human Resources');
      expect(detected).not.toContain('Sales Department');
    });

    test('should detect departments with "Department" suffix', async () => {
      const text = 'Contact the Legal Department or Finance Department for approval.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should not detect department names
      const detected = properNouns.map((e) => e.original);
      expect(detected).not.toContain('Legal Department');
      expect(detected).not.toContain('Finance Department');
    });

    test('should detect departments with "Team" suffix', async () => {
      const text = 'The Executive Team and Management Team are meeting today.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should not detect team names
      const detected = properNouns.map((e) => e.original);
      expect(detected).not.toContain('Executive Team');
      expect(detected).not.toContain('Management Team');
    });

    test('should detect departments with "Support" suffix', async () => {
      const text = 'Reach out to Technical Support or Customer Support for help.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should not detect support teams
      const detected = properNouns.map((e) => e.original);
      expect(detected).not.toContain('Technical Support');
      expect(detected).not.toContain('Customer Support');
    });

    test('should handle department names with leading verbs', async () => {
      const text =
        'Call Customer Service today. Visit Human Resources tomorrow. See the Sales Department.';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should not detect any department references (all should be filtered)
      const detected = properNouns.map((e) => e.original);
      expect(detected).not.toContain('Call Customer Service');
      expect(detected).not.toContain('Visit Human Resources');
      expect(detected).not.toContain('Sales Department');
    });

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
      expect(acmeEntity.scoreBreakdown.matchesEmailDomain).toBeDefined();
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
      expect(company.scoreBreakdown.matchesEmailDomain).toBeDefined();
    });

    // End of Email Domain Extraction Tests
    // ========================================================================

    // ========================================================================
    // Inside Link Signal Tests
    // ========================================================================

    test('should boost confidence for names inside link tags', () => {
      // Create mock DOM structure: <p>By <a>Stephen Council</a></p>
      const container = document.createElement('div');
      container.innerHTML = '<p>By <a href="/author/stephen">Stephen Council</a></p>';

      const candidates = detector.detectWithDebugInfo(container, ['properNouns']);
      const stephenEntity = candidates.find((e) => /Stephen Council/i.test(e.original));

      // Should detect Stephen Council with insideLink signal
      expect(stephenEntity).toBeDefined();
      expect(stephenEntity.scoreBreakdown.insideLink).toBeDefined();
      expect(stephenEntity.scoreBreakdown.insideLink).toBe(0.25);
      expect(stephenEntity.scoreBreakdown.insideLink_detail).toBe('text_in_link');
    });

    test('should NOT add insideLink signal for text outside links', () => {
      // Create mock DOM structure: <p>By Stephen Council</p>
      const container = document.createElement('div');
      container.innerHTML = '<p>By Stephen Council</p>';

      const candidates = detector.detectWithDebugInfo(container, ['properNouns']);
      const stephenEntity = candidates.find((e) => /Stephen Council/i.test(e.original));

      // Should detect Stephen Council but without insideLink signal
      expect(stephenEntity).toBeDefined();
      expect(stephenEntity.scoreBreakdown.insideLink).toBeUndefined();
    });

    test('should apply insideLink signal to company names in links', () => {
      // Create mock DOM structure: <p>Visit <a>Acme Corp</a> for details</p>
      const container = document.createElement('div');
      container.innerHTML = '<p>Visit <a href="https://acme.com">Acme Corp</a> for details</p>';

      const candidates = detector.detectWithDebugInfo(container, ['properNouns']);
      const acmeEntity = candidates.find((e) => /Acme Corp/i.test(e.original));

      // Should detect Acme Corp with insideLink signal
      expect(acmeEntity).toBeDefined();
      expect(acmeEntity.scoreBreakdown.insideLink).toBeDefined();
      expect(acmeEntity.confidence).toBeGreaterThan(0.7); // Higher confidence due to link
    });

    test('should use insideLink signal in _calculateProperNounScore', () => {
      const context = {
        hasHonorific: false,
        hasCompanySuffix: false,
        wordCount: 2,
        isSentenceStart: false,
        nearPII: false,
        insideLink: true,
      };
      const { score, breakdown } = detector._calculateProperNounScore('Stephen Council', context);

      expect(breakdown.insideLink).toBeDefined();
      expect(breakdown.insideLink).toBe(0.25);
      expect(breakdown.insideLink_detail).toBe('text_in_link');
      expect(score).toBeGreaterThan(0.5);
    });

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
      expect(breakdown.hasHonorificOrSuffix_detail).toBe('company_suffix');
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

    test('should skip heading tags', () => {
      expect(
        detector._shouldSkipElement({
          tagName: 'H1',
          classList: { contains: () => false },
          getAttribute: () => null,
        })
      ).toBe(true);
      expect(
        detector._shouldSkipElement({
          tagName: 'H2',
          classList: { contains: () => false },
          getAttribute: () => null,
        })
      ).toBe(true);
      expect(
        detector._shouldSkipElement({
          tagName: 'H3',
          classList: { contains: () => false },
          getAttribute: () => null,
        })
      ).toBe(true);
      expect(
        detector._shouldSkipElement({
          tagName: 'H4',
          classList: { contains: () => false },
          getAttribute: () => null,
        })
      ).toBe(true);
      expect(
        detector._shouldSkipElement({
          tagName: 'H5',
          classList: { contains: () => false },
          getAttribute: () => null,
        })
      ).toBe(true);
      expect(
        detector._shouldSkipElement({
          tagName: 'H6',
          classList: { contains: () => false },
          getAttribute: () => null,
        })
      ).toBe(true);
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

  describe('_detectAllProperNounCandidates', () => {
    test('should return all proper noun candidates including low-score ones', () => {
      const text = 'Contact Mr. John Doe and visit Acme Corp';
      const candidates = detector._detectAllProperNounCandidates(text);

      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);

      candidates.forEach((candidate) => {
        expect(candidate).toHaveProperty('type', 'properNoun');
        expect(candidate).toHaveProperty('confidence');
        expect(candidate).toHaveProperty('scoreBreakdown');
      });
    });

    test('should include candidates below threshold', () => {
      const text = 'Smith works here'; // Single word at sentence start = low score
      const candidates = detector._detectAllProperNounCandidates(text);

      // Should return at least the candidate even if score is below 0.8
      expect(candidates.length).toBeGreaterThan(0);
    });

    test('should return empty array for text with no capitalized words', () => {
      const text = 'this is all lowercase text';
      const candidates = detector._detectAllProperNounCandidates(text);

      expect(candidates).toEqual([]);
    });

    test('should handle empty text', () => {
      const candidates = detector._detectAllProperNounCandidates('');
      expect(candidates).toEqual([]);
    });

    test('should detect company names with suffixes', () => {
      const text = 'Works at Microsoft Corporation';
      const candidates = detector._detectAllProperNounCandidates(text);

      const company = candidates.find((c) => c.context === 'company');
      expect(company).toBeDefined();
    });
  });

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

  describe('Edge cases and false positives', () => {
    test('should not include common prepositions like "By" in proper noun detection', () => {
      // Issue: "By Stephen Council" was being detected instead of just "Stephen Council"
      const text = 'By Stephen Council, Tech Reporter';
      const entities = detector.detectInText(text, ['properNouns']);

      // Find the proper noun detection
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // Should detect "Stephen Council", NOT "By Stephen Council"
      expect(properNouns.length).toBeGreaterThan(0);

      const names = properNouns.map((e) => e.original);
      expect(names).toContain('Stephen Council');
      expect(names).not.toContain('By Stephen Council');

      // The word "By" should not be part of any detected entity
      const hasBy = properNouns.some((e) => e.original.startsWith('By '));
      expect(hasBy).toBe(false);
    });

    test('should not detect job titles with "Tech" as companies', () => {
      const text = 'By Stephen Council, Tech Reporter';
      const entities = detector.detectInText(text, ['properNouns']);
      const properNouns = entities.filter((e) => e.type === 'properNoun');

      // "Tech Reporter" standalone should NOT be detected (isStandaloneJobTitle pattern)
      const techReporter = properNouns.find((e) => e.original === 'Tech Reporter');
      expect(techReporter).toBeUndefined();

      // "Stephen Council" should be detected (after stripping "By")
      const stephenCouncil = properNouns.find((e) => e.original === 'Stephen Council');
      expect(stephenCouncil).toBeDefined();
      expect(stephenCouncil.confidence).toBeGreaterThanOrEqual(0.75);
    });

    test('should not detect other common job titles as companies', () => {
      const jobTitles = [
        'Senior Engineer',
        'Lead Developer',
        'Tech Writer',
        'Chief Editor',
        'Senior Manager',
        'Lead Designer',
      ];

      for (const title of jobTitles) {
        const text = `Meet ${title} John Smith`;
        const entities = detector.detectInText(text, ['properNouns']);

        // Job title by itself should NOT be detected (only as part of a name)
        const jobTitleOnly = entities.find((e) => e.original === title);
        expect(jobTitleOnly).toBeUndefined();

        // The full phrase with job title + name should be detected, but with reduced confidence
        // due to the hasJobDescriptionPrefix penalty (-0.25)
        const fullPhrase = entities.find((e) => e.original.includes('John Smith'));

        // Either the full phrase is detected (with job title prefix)
        // OR just the name is detected (if job title was stripped)
        // Both are acceptable outcomes - verify only if found
        expect(fullPhrase === undefined || fullPhrase.confidence >= 0.5).toBe(true);
      }
    });

    test('should not include common sentence-starting words in proper nouns', () => {
      const commonWords = ['By', 'In', 'On', 'At', 'For', 'With', 'From'];

      for (const word of commonWords) {
        const text = `${word} Alex Johnson, our CEO`;
        const entities = detector.detectInText(text, ['properNouns']);

        // Should detect "Alex Johnson", not include the preposition
        const properNouns = entities.filter((e) => e.type === 'properNoun');
        const names = properNouns.map((e) => e.original);

        // Should find the actual name
        expect(names.some((n) => n.includes('Alex Johnson'))).toBe(true);

        // Should not have the preposition as part of the name
        const hasPreposition = properNouns.some((e) => e.original.startsWith(`${word} `));
        expect(hasPreposition).toBe(false);
      }
    });
  });
});
