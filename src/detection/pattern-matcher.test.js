/**
 * PatternMatcher Tests
 */

import { PatternMatcher } from './pattern-matcher.js';

describe('PatternMatcher', () => {
  let matcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  describe('Email Detection', () => {
    test('should find valid email addresses', () => {
      const text = 'Contact john.doe@example.com or jane@company.org';
      const emails = matcher.findEmails(text);

      expect(emails).toHaveLength(2);
      expect(emails[0].value).toBe('john.doe@example.com');
      expect(emails[1].value).toBe('jane@company.org');
    });

    test('should handle email with plus addressing', () => {
      const text = 'Send to user+tag@example.com';
      const emails = matcher.findEmails(text);

      expect(emails).toHaveLength(1);
      expect(emails[0].value).toBe('user+tag@example.com');
    });

    test('should return empty array for no emails', () => {
      const text = 'No emails here';
      const emails = matcher.findEmails(text);

      expect(emails).toHaveLength(0);
    });
  });

  describe('Phone Number Detection', () => {
    test('should find US phone numbers in various formats', () => {
      const text = 'Call (555) 123-4567 or 555-987-6543 or 5551234567';
      const phones = matcher.findPhones(text);

      expect(phones.length).toBeGreaterThanOrEqual(2);
      expect(phones[0].value).toBe('(555) 123-4567');
    });

    test('should find international phone numbers', () => {
      const text = 'International: +1-555-123-4567';
      const phones = matcher.findPhones(text);

      expect(phones.length).toBeGreaterThanOrEqual(1);
      expect(phones[0].value).toContain('+1');
    });

    test('should return empty array for no phones', () => {
      const text = 'No phone numbers here';
      const phones = matcher.findPhones(text);

      expect(phones).toHaveLength(0);
    });
  });

  describe('Money Detection', () => {
    test('should find money with dollar sign', () => {
      const text = 'Total: $1,234.56 USD';
      const money = matcher.findMoney(text);

      expect(money.length).toBeGreaterThanOrEqual(1);
      expect(money[0].value).toBe('$1,234.56');
      expect(money[0].numericValue).toBe(1234.56);
      expect(money[0].currency).toBe('$');
      expect(money[0].hasCommas).toBe(true);
    });

    test('should find money with currency codes', () => {
      const text = 'Price: 999.99 EUR';
      const money = matcher.findMoney(text);

      expect(money.length).toBeGreaterThanOrEqual(1);
      expect(money[0].currency).toBe('EUR');
    });

    test('should detect currency symbol position', () => {
      const text = '$100.00';
      const money = matcher.findMoney(text);

      expect(money[0].symbolPosition).toBe('before');
    });

    test('should return empty array for no money', () => {
      const text = 'No money values here';
      const money = matcher.findMoney(text);

      expect(money).toHaveLength(0);
    });
  });

  describe('Quantity Detection', () => {
    test('should find quantities with units', () => {
      const text = 'Order 150 items and 25.5 kg of materials';
      const quantities = matcher.findQuantities(text);

      expect(quantities.length).toBeGreaterThanOrEqual(2);
      expect(quantities[0].value).toBe('Order 150 items');
      expect(quantities[0].numericValue).toBe(150);
      expect(quantities[0].unit).toBe('items');
    });

    test('should handle quantities with commas', () => {
      const text = 'Stock: 1,000 units';
      const quantities = matcher.findQuantities(text);

      expect(quantities[0].value).toBe('1,000 units');
      expect(quantities[0].numericValue).toBe(1000);
      expect(quantities[0].hasCommas).toBe(true);
    });

    test('should return empty array for no quantities', () => {
      const text = 'No quantities here';
      const quantities = matcher.findQuantities(text);

      expect(quantities).toHaveLength(0);
    });
  });

  describe('URL Detection', () => {
    test('should find HTTP/HTTPS URLs', () => {
      const text = 'Visit https://example.com or http://test.org';
      const urls = matcher.findURLs(text);

      expect(urls.length).toBeGreaterThanOrEqual(2);
      expect(urls[0].value).toContain('https://');
    });

    test('should find www URLs', () => {
      const text = 'Check www.example.com for info';
      const urls = matcher.findURLs(text);

      expect(urls.length).toBeGreaterThanOrEqual(1);
      expect(urls[0].value).toContain('www.');
    });

    test('should return empty array for no URLs', () => {
      const text = 'No URLs here';
      const urls = matcher.findURLs(text);

      expect(urls).toHaveLength(0);
    });
  });

  describe('IP Address Detection', () => {
    test('should find IPv4 addresses', () => {
      const text = 'Server at 192.168.1.100';
      const ips = matcher.findIPAddresses(text);

      expect(ips.length).toBeGreaterThanOrEqual(1);
      expect(ips[0].value).toBe('192.168.1.100');
    });

    test('should find IPv6 addresses', () => {
      const text = 'IPv6: 2001:0DB8:0000:0000:0000:0000:0000:0001';
      const ips = matcher.findIPAddresses(text);

      expect(ips.length).toBeGreaterThanOrEqual(1);
    });

    test('should return empty array for no IPs', () => {
      const text = 'No IP addresses here';
      const ips = matcher.findIPAddresses(text);

      expect(ips).toHaveLength(0);
    });
  });

  describe('SSN Detection', () => {
    test('should find SSN in standard format', () => {
      const text = 'SSN: 123-45-6789';
      const ssns = matcher.findSSNs(text);

      expect(ssns).toHaveLength(1);
      expect(ssns[0].value).toBe('123-45-6789');
    });

    test('should return empty array for no SSNs', () => {
      const text = 'No SSN here';
      const ssns = matcher.findSSNs(text);

      expect(ssns).toHaveLength(0);
    });
  });

  describe('Credit Card Detection', () => {
    test('should find credit card numbers', () => {
      const text = 'Card: 4111-1111-1111-1111';
      const cards = matcher.findCreditCards(text);

      expect(cards).toHaveLength(1);
      expect(cards[0].value).toBe('4111-1111-1111-1111');
    });

    test('should find credit card without dashes', () => {
      const text = 'Card: 4012888888881881';
      const cards = matcher.findCreditCards(text);

      expect(cards).toHaveLength(1);
    });

    test('should return empty array for no cards', () => {
      const text = 'No cards here';
      const cards = matcher.findCreditCards(text);

      expect(cards).toHaveLength(0);
    });
  });

  describe('Date Detection', () => {
    test('should find dates in various formats', () => {
      const text = 'Meeting on 01/15/2026 and 2026-03-30';
      const dates = matcher.findDates(text);

      expect(dates.length).toBeGreaterThanOrEqual(2);
    });

    test('should find month name dates', () => {
      const text = 'Due: January 15, 2026';
      const dates = matcher.findDates(text);

      expect(dates.length).toBeGreaterThanOrEqual(1);
    });

    test('should find date ranges with month abbreviations', () => {
      // This test verifies that dates like "Dec 10, 2024" are properly detected
      const text = 'Dec 10, 2024 - Jan 9, 2025';
      const dates = matcher.findDates(text);

      // Should find both dates in the range
      expect(dates.length).toBe(2);
      expect(dates[0].value).toMatch(/Dec.*10.*2024/i);
      expect(dates[1].value).toMatch(/Jan.*9.*2025/i);
    });

    test('should return empty array for no dates', () => {
      const text = 'No dates here';
      const dates = matcher.findDates(text);

      expect(dates).toHaveLength(0);
    });
  });

  describe('Address Detection', () => {
    test('should find street addresses', () => {
      const text = 'Located at 123 Main Street';
      const addresses = matcher.findAddresses(text);

      expect(addresses.length).toBeGreaterThanOrEqual(1);
      expect(addresses[0].value).toContain('Main Street');
    });

    test('should find abbreviated addresses', () => {
      const text = 'Address: 456 Oak Ave';
      const addresses = matcher.findAddresses(text);

      expect(addresses.length).toBeGreaterThanOrEqual(1);
    });

    test('should return empty array for no addresses', () => {
      const text = 'No addresses here';
      const addresses = matcher.findAddresses(text);

      expect(addresses).toHaveLength(0);
    });
  });

  describe('Location Detection', () => {
    test('should find multi-word locations with pattern keywords', () => {
      const text = 'Moving from Bay Area to Silicon Valley';
      const locations = matcher.findLocations(text);

      expect(locations.length).toBe(2);
      expect(locations[0].value).toBe('Bay Area');
      expect(locations[0].matchType).toBe('pattern');
      expect(locations[1].value).toBe('Silicon Valley');
      expect(locations[1].matchType).toBe('pattern');
    });

    test('should find geographic features', () => {
      const text = 'Sailing across Pacific Ocean and Caribbean Sea';
      const locations = matcher.findLocations(text);

      expect(locations.length).toBeGreaterThanOrEqual(2);
      expect(locations.some((l) => l.value === 'Pacific Ocean')).toBe(true);
      expect(locations.some((l) => l.value === 'Caribbean Sea')).toBe(true);
    });

    test('should find single-word locations from gazetteer', () => {
      const text = 'Traveling from Paris to Tokyo via London';
      const locations = matcher.findLocations(text);

      expect(locations.length).toBeGreaterThanOrEqual(3);
      expect(locations.some((l) => l.value === 'Paris')).toBe(true);
      expect(locations.some((l) => l.value === 'Tokyo')).toBe(true);
      expect(locations.some((l) => l.value === 'London')).toBe(true);
      // All should be gazetteer matches
      locations.forEach((loc) => {
        expect(loc.matchType).toBe('gazetteer');
      });
    });

    test('should find US states', () => {
      const text = 'California and Texas are large states';
      const locations = matcher.findLocations(text);

      expect(locations.length).toBeGreaterThanOrEqual(2);
      expect(locations.some((l) => l.value === 'California')).toBe(true);
      expect(locations.some((l) => l.value === 'Texas')).toBe(true);
    });

    test('should find countries', () => {
      const text = 'Trade between United States and Canada';
      const locations = matcher.findLocations(text);

      expect(locations.length).toBeGreaterThanOrEqual(2);
      expect(locations.some((l) => l.value === 'United States')).toBe(true);
      expect(locations.some((l) => l.value === 'Canada')).toBe(true);
    });

    test('should find mountains and rivers', () => {
      const text = 'Climbing Rocky Mountains and rafting down Mississippi River';
      const locations = matcher.findLocations(text);

      expect(locations.length).toBeGreaterThanOrEqual(2);
      expect(locations.some((l) => l.value.includes('Mountains'))).toBe(true);
      expect(locations.some((l) => l.value.includes('River'))).toBe(true);
    });

    test('should not duplicate overlapping matches', () => {
      const text = 'New York City and New York State';
      const locations = matcher.findLocations(text);

      // Should find both but not duplicate "New York"
      const values = locations.map((l) => l.value);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });

    test('should handle mixed pattern and gazetteer matches', () => {
      const text = 'Conference in Bay Area, with speakers from Paris and Silicon Valley';
      const locations = matcher.findLocations(text);

      expect(locations.length).toBeGreaterThanOrEqual(3);
      const bayArea = locations.find((l) => l.value === 'Bay Area');
      const paris = locations.find((l) => l.value === 'Paris');
      const siliconValley = locations.find((l) => l.value === 'Silicon Valley');

      expect(bayArea.matchType).toBe('pattern');
      expect(paris.matchType).toBe('gazetteer');
      expect(siliconValley.matchType).toBe('pattern');
    });

    test('should return empty array for no locations', () => {
      const text = 'No geographic information here at all';
      const locations = matcher.findLocations(text);

      expect(locations).toHaveLength(0);
    });

    test('should not match common words that look like locations', () => {
      const text = 'Reading a book about history';
      const locations = matcher.findLocations(text);

      // Should not match 'Reading' (despite being a city in UK)
      // because it's likely being used as a verb in this context
      // Our gazetteer check is case-sensitive enough to avoid this
      expect(locations).toHaveLength(0);
    });
  });

  describe('Match Single Value Methods', () => {
    test('matchMoney should return first match with metadata', () => {
      const text = '$100.00';
      const match = matcher.matchMoney(text);

      expect(match).not.toBeNull();
      expect(match.value).toBe('$100.00');
      expect(match.numericValue).toBe(100);
      expect(match.currency).toBe('$');
    });

    test('matchMoney should return null for no match', () => {
      const text = 'No money here';
      const match = matcher.matchMoney(text);

      expect(match).toBeNull();
    });

    test('matchQuantity should return first match with metadata', () => {
      const text = '50 items';
      const match = matcher.matchQuantity(text);

      expect(match).not.toBeNull();
      expect(match.value).toBe('50 items');
      expect(match.numericValue).toBe(50);
      expect(match.unit).toBe('items');
    });

    test('matchPhone should return first match', () => {
      const text = 'Call (555) 123-4567';
      const match = matcher.matchPhone(text);

      expect(match).not.toBeNull();
      expect(match.value).toContain('555');
    });

    test('matchDate should return first match', () => {
      const text = 'Date: 01/15/2026';
      const match = matcher.matchDate(text);

      expect(match).not.toBeNull();
    });
  });

  describe('matchType method', () => {
    test('should match specific type', () => {
      const text = 'Email: test@example.com';
      const matches = matcher.matchType(text, 'email');

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe('email');
    });

    test('should return empty array for unknown type', () => {
      const text = 'Some text';
      const matches = matcher.matchType(text, 'unknown');

      expect(matches).toHaveLength(0);
    });
  });

  describe('test method', () => {
    test('should return true if pattern matches', () => {
      const text = 'test@example.com';
      const result = matcher.test(text, 'email');

      expect(result).toBe(true);
    });

    test('should return false if pattern does not match', () => {
      const text = 'no email here';
      const result = matcher.test(text, 'email');

      expect(result).toBe(false);
    });
  });

  describe('validatePattern method', () => {
    test('should validate correct regex', () => {
      const result = matcher.validatePattern('\\d{3}-\\d{2}-\\d{4}');

      expect(result.valid).toBe(true);
      expect(result.pattern).toBeInstanceOf(RegExp);
    });

    test('should reject invalid regex', () => {
      const result = matcher.validatePattern('[invalid');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('addCustomPattern method', () => {
    test('should add and use custom pattern', () => {
      const customPattern = /EMP-\d{6}/g;
      matcher.addCustomPattern('employeeId', customPattern);

      const text = 'Employee EMP-123456';
      const matches = matcher.matchType(text, 'employeeId');

      expect(matches).toHaveLength(1);
      expect(matches[0].value).toBe('EMP-123456');
    });
  });

  describe('extractMetadata method', () => {
    test('should extract metadata from match object', () => {
      const match = { value: '$100.00', type: 'money' };
      const metadata = matcher.extractMetadata(match);

      expect(metadata.originalValue).toBe('$100.00');
      expect(metadata.type).toBe('money');
    });

    test('should extract phone metadata', () => {
      const match = { value: '+1-555-123-4567', type: 'phone' };
      const metadata = matcher.extractMetadata(match);

      expect(metadata.isInternational).toBe(true);
    });

    test('should extract email metadata', () => {
      const match = { value: 'user@example.com', type: 'email' };
      const metadata = matcher.extractMetadata(match);

      expect(metadata.domain).toBe('example.com');
    });
  });

  describe('matchAll', () => {
    test('should match multiple PII types at once', () => {
      const text = 'Contact john@example.com at (555) 123-4567 for $100';
      const matches = matcher.matchAll(text, ['email', 'phone', 'money']);

      expect(matches.length).toBeGreaterThan(0);

      const hasEmail = matches.some((m) => m.type === 'email');
      const hasPhone = matches.some((m) => m.type === 'phone');
      const hasMoney = matches.some((m) => m.type === 'money');

      expect(hasEmail || hasPhone || hasMoney).toBe(true);
    });

    test('should return matches sorted by position', () => {
      const text = 'Email: test@example.com Phone: (555) 123-4567';
      const matches = matcher.matchAll(text, ['email', 'phone']);

      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(matches[0].index).toBeLessThan(matches[1].index);
    });
  });

  describe('Quantity matching with metadata', () => {
    test('should find quantities', () => {
      const text = '100 kg of material';
      const quantities = matcher.findQuantities(text);

      expect(quantities.length).toBeGreaterThan(0);
      expect(quantities[0].value).toContain('kg');
    });

    test('should handle quantities with commas', () => {
      const text = 'We have 1,500 items in stock';
      const quantities = matcher.findQuantities(text);

      expect(quantities.length).toBeGreaterThan(0);
    });

    test('should handle split money nodes correctly', () => {
      // Create a mock DOM structure like the user's HTML
      const mockElement = {
        querySelectorAll: () => [],
        children: [],
      };

      // Mock text nodes for: <span>$</span><span>1,199</span><span>.</span><span class="mui-2qzt8l">99</span>
      const mockNodes = [
        { textContent: '$', parentElement: mockElement },
        { textContent: '1,199', parentElement: mockElement },
        { textContent: '.', parentElement: mockElement },
        { textContent: '99', parentElement: mockElement },
      ];

      // Simulate what detectInDOM does
      const textNodes = [];
      let globalOffset = 0;

      for (const node of mockNodes) {
        const text = node.textContent;
        if (text && text.trim()) {
          textNodes.push({
            node: node,
            text,
            start: globalOffset,
            end: globalOffset + text.length,
          });
          globalOffset += text.length + 1; // +1 for space separator
        }
      }

      // Concatenated text: "$ 1,199 . 99"
      const fullText = textNodes.map((n) => n.text).join(' ');
      console.log('Full concatenated text:', `"${fullText}"`);

      // Detect all types on concatenated text
      const entities = [];
      const money = matcher.findMoney(fullText);
      entities.push(
        ...money.map((m) => ({
          type: 'money',
          original: m.value,
          start: m.start,
          end: m.end,
          confidence: 1.0,
        }))
      );

      const quantities = matcher.findQuantities(fullText);
      entities.push(
        ...quantities.map((m) => ({
          type: 'quantity',
          original: m.value,
          start: m.start,
          end: m.end,
          confidence: 1.0,
        }))
      );

      console.log('Entities from concatenated text:', entities);

      // Map back to nodes
      const entitiesWithNodes = entities.map((entity) => {
        const nodeInfo = textNodes.find((n) => entity.start >= n.start && entity.start < n.end);
        if (nodeInfo) {
          const nodeRelativeStart = entity.start - nodeInfo.start;
          return {
            ...entity,
            node: nodeInfo.node,
            nodeText: nodeInfo.text,
            start: nodeRelativeStart,
            end: nodeRelativeStart + (entity.end - entity.start),
          };
        }
        return entity;
      });

      console.log('Entities mapped to nodes:', entitiesWithNodes);

      // Test what gets detected
      expect(entitiesWithNodes.some((e) => e.type === 'money')).toBe(true);
      expect(entitiesWithNodes.find((e) => e.type === 'money').original).toBe('$ 1,199 . 99');
    });
  });
});
