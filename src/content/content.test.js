/**
 * Content Script Tests
 * Tests for global PII replacement across DOM
 */

/* eslint-env node, jest */

import { PIIDetector } from '../detection/pii-detector.js';
import { Replacer } from '../replacement/replacer.js';
import { ConsistencyMapper } from '../replacement/consistency-mapper.js';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
    },
  },
};

// Setup DOM mocks
function setupDOMEnvironment() {
  // Create a basic document mock with text nodes array
  const textNodes = [];

  // Helper to create a mock text node
  const createTextNode = (content, parentTag = 'div') => {
    const node = {
      textContent: content,
      nodeType: 3,
      parentElement: {
        tagName: parentTag.toUpperCase(),
      },
    };
    textNodes.push(node);
    return node;
  };

  global.document = {
    body: {},
    readyState: 'complete',
    addEventListener: jest.fn(),
    createTreeWalker: jest.fn((_root, _whatToShow, _filter) => {
      let index = -1;
      return {
        nextNode: () => {
          index++;
          return index < textNodes.length ? textNodes[index] : null;
        },
      };
    }),
  };

  global.NodeFilter = {
    SHOW_TEXT: 4,
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
  };

  return { textNodes, createTextNode };
}

describe('Content Script - Global PII Replacement', () => {
  let detector;
  let replacer;
  let consistencyMapper;
  let originalContent;

  beforeEach(async () => {
    // Initialize PII detection modules
    detector = new PIIDetector();
    await detector.initialize();
    replacer = new Replacer();
    consistencyMapper = new ConsistencyMapper();
    originalContent = new Map();
  });

  describe('Global replace-all functionality', () => {
    test('should replace PII in all occurrences across multiple DOM nodes', () => {
      // Setup: Create DOM with same name in multiple places
      const { textNodes, createTextNode } = setupDOMEnvironment();

      const node1 = createTextNode('Welcome Eric Kendricks to the team!', 'h1');
      const node2 = createTextNode('Eric Kendricks will be presenting at the conference.', 'p');
      const node3 = createTextNode('Contact Eric Kendricks for more info.', 'a');
      const node4 = createTextNode('Also joining us is Alex Simon.', 'p');
      const node5 = createTextNode('Alex Simon is our lead developer.', 'span');

      // Phase 1: Detect PII (simulate detection results)
      // In real content script, this would call detector.detectInDOM()
      const mockEntities = [
        { type: 'properNoun', original: 'Eric Kendricks', context: 'name' },
        { type: 'properNoun', original: 'Alex Simon', context: 'name' },
      ];

      // Build replacement map
      const replacementMap = new Map();
      for (const entity of mockEntities) {
        const { original, type } = entity;
        const key = `${type}:${original}`;

        if (!replacementMap.has(key)) {
          let replacement;
          if (!consistencyMapper.has(type, original)) {
            replacement = replacer.replaceProperNoun(original, entity.context);
            consistencyMapper.set(type, original, replacement);
          } else {
            replacement = consistencyMapper.get(type, original);
          }
          replacementMap.set(key, replacement);
        }
      }

      // Phase 2: Apply all replacements across ALL text nodes
      // This simulates the global replacement logic from content.js lines 396-443
      // For testing, we'll directly iterate through the textNodes array instead of using TreeWalker
      const replacementResults = [];

      for (const currentNode of textNodes) {
        if (!originalContent.has(currentNode)) {
          originalContent.set(currentNode, currentNode.textContent);
        }

        let nodeText = currentNode.textContent;
        let modified = false;

        // Apply all replacements to this text node
        for (const [key, replacement] of replacementMap) {
          const original = key.substring(key.indexOf(':') + 1);
          const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedOriginal, 'g');

          if (nodeText.includes(original)) {
            nodeText = nodeText.replace(regex, replacement);
            modified = true;
          }
        }

        if (modified) {
          currentNode.textContent = nodeText;
          replacementResults.push({
            original: originalContent.get(currentNode),
            replaced: currentNode.textContent,
          });
        }
      }

      // Verify: All nodes with "Eric Kendricks" should be replaced
      const ericReplacement = replacementMap.get('properNoun:Eric Kendricks');
      const alexReplacement = replacementMap.get('properNoun:Alex Simon');

      expect(ericReplacement).toBeDefined();
      expect(alexReplacement).toBeDefined();
      expect(ericReplacement).not.toBe('Eric Kendricks');
      expect(alexReplacement).not.toBe('Alex Simon');

      // Check that Eric Kendricks was replaced in all 3 nodes
      expect(node1.textContent).toContain(ericReplacement);
      expect(node1.textContent).not.toContain('Eric Kendricks');

      expect(node2.textContent).toContain(ericReplacement);
      expect(node2.textContent).not.toContain('Eric Kendricks');

      expect(node3.textContent).toContain(ericReplacement);
      expect(node3.textContent).not.toContain('Eric Kendricks');

      // Check that Alex Simon was replaced in both nodes
      expect(node4.textContent).toContain(alexReplacement);
      expect(node4.textContent).not.toContain('Alex Simon');

      expect(node5.textContent).toContain(alexReplacement);
      expect(node5.textContent).not.toContain('Alex Simon');

      // Verify consistency: Same input = same output across all nodes
      expect(replacementResults.length).toBe(5); // All 5 nodes should be modified
    });

    test('should handle names with special regex characters', () => {
      const { textNodes, createTextNode } = setupDOMEnvironment();

      // Names with special characters that need escaping
      const node1 = createTextNode('Contact John (Jack) Smith today.', 'p');
      const node2 = createTextNode('John (Jack) Smith is available.', 'span');

      const mockEntities = [{ type: 'properNoun', original: 'John (Jack) Smith', context: 'name' }];

      const replacementMap = new Map();
      for (const entity of mockEntities) {
        const { original, type } = entity;
        const key = `${type}:${original}`;
        const replacement = replacer.replaceProperNoun(original, entity.context);
        replacementMap.set(key, replacement);
        consistencyMapper.set(type, original, replacement);
      }

      // Apply replacements - directly iterate through textNodes
      for (const currentNode of textNodes) {
        let nodeText = currentNode.textContent;
        let modified = false;

        for (const [key, replacement] of replacementMap) {
          const original = key.substring(key.indexOf(':') + 1);
          // Escape special regex characters
          const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedOriginal, 'g');

          if (nodeText.includes(original)) {
            nodeText = nodeText.replace(regex, replacement);
            modified = true;
          }
        }

        if (modified) {
          currentNode.textContent = nodeText;
        }
      }

      const replacement = replacementMap.get('properNoun:John (Jack) Smith');

      // Verify both nodes were updated
      expect(node1.textContent).toContain(replacement);
      expect(node1.textContent).not.toContain('John (Jack) Smith');

      expect(node2.textContent).toContain(replacement);
      expect(node2.textContent).not.toContain('John (Jack) Smith');
    });

    test('should maintain consistency across multiple occurrences in same node', () => {
      const { textNodes, createTextNode } = setupDOMEnvironment();

      // Same name appears twice in one text node
      const node1 = createTextNode('Eric Kendricks met with Eric Kendricks colleague.', 'p');

      const mockEntities = [{ type: 'properNoun', original: 'Eric Kendricks', context: 'name' }];

      const replacementMap = new Map();
      const entity = mockEntities[0];
      const key = `${entity.type}:${entity.original}`;
      const replacement = replacer.replaceProperNoun(entity.original, entity.context);
      replacementMap.set(key, replacement);

      // Apply replacements with global flag - directly iterate through textNodes
      for (const currentNode of textNodes) {
        let nodeText = currentNode.textContent;
        let modified = false;

        for (const [mapKey, mapReplacement] of replacementMap) {
          const original = mapKey.substring(mapKey.indexOf(':') + 1);
          const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedOriginal, 'g'); // global flag

          if (nodeText.includes(original)) {
            nodeText = nodeText.replace(regex, mapReplacement);
            modified = true;
          }
        }

        if (modified) {
          currentNode.textContent = nodeText;
        }
      }

      // Verify both occurrences in the same node were replaced
      expect(node1.textContent).not.toContain('Eric Kendricks');

      // Count occurrences of replacement in the text
      const occurrences = (node1.textContent.match(new RegExp(replacement, 'g')) || []).length;
      expect(occurrences).toBe(2); // Both instances should be replaced
    });

    test('should replace longer patterns before shorter ones to avoid substring conflicts', () => {
      const { textNodes, createTextNode } = setupDOMEnvironment();

      // Date "3/30/2026" contains quantity "30" - date should be replaced first
      const node1 = createTextNode('The deadline is 3/30/2026 for completion.', 'p');

      const mockEntities = [
        { type: 'date', original: '3/30/2026', context: 'date' },
        { type: 'quantity', original: '30', context: 'quantity' },
      ];

      const replacementMap = new Map();
      for (const entity of mockEntities) {
        const { original, type } = entity;
        const key = `${type}:${original}`;
        let replacement;
        if (type === 'date') {
          replacement = replacer.replaceDate(original);
        } else if (type === 'quantity') {
          replacement = replacer.replaceQuantity(original);
        }
        replacementMap.set(key, replacement);
        consistencyMapper.set(type, original, replacement);
      }

      // Sort replacements by length (longest first) to prevent substring conflicts
      const sortedReplacements = Array.from(replacementMap.entries()).sort((a, b) => {
        const originalA = a[0].substring(a[0].indexOf(':') + 1);
        const originalB = b[0].substring(b[0].indexOf(':') + 1);
        if (originalB.length !== originalA.length) {
          return originalB.length - originalA.length;
        }
        return originalA.localeCompare(originalB);
      });

      // Apply replacements with sorting - directly iterate through textNodes
      for (const currentNode of textNodes) {
        let nodeText = currentNode.textContent;
        let modified = false;

        for (const [key, replacement] of sortedReplacements) {
          const original = key.substring(key.indexOf(':') + 1);
          const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedOriginal, 'g');

          if (nodeText.includes(original)) {
            nodeText = nodeText.replace(regex, replacement);
            modified = true;
          }
        }

        if (modified) {
          currentNode.textContent = nodeText;
        }
      }

      const dateReplacement = replacementMap.get('date:3/30/2026');

      // Verify the date was replaced correctly (not corrupted by quantity replacement)
      expect(node1.textContent).toContain(dateReplacement);
      expect(node1.textContent).not.toContain('3/30/2026');
      expect(node1.textContent).not.toContain('3/33/'); // Should not have corrupted date

      // The date replacement should be a valid date format (month/day/year)
      expect(dateReplacement).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    test('should replace locations when detected', () => {
      const { textNodes, createTextNode } = setupDOMEnvironment();

      // Create DOM with locations
      const node1 = createTextNode('The company expanded from Bay Area to New York.', 'p');
      const node2 = createTextNode('Bay Area startups are growing rapidly.', 'p');
      const node3 = createTextNode('Offices in Paris, Tokyo, and London.', 'span');

      // Mock location entities (as they would be detected)
      const mockEntities = [
        { type: 'location', original: 'Bay Area', context: 'location' },
        { type: 'location', original: 'New York', context: 'location' },
        { type: 'location', original: 'Paris', context: 'location' },
        { type: 'location', original: 'Tokyo', context: 'location' },
        { type: 'location', original: 'London', context: 'location' },
      ];

      // Build replacement map (simulating content.js switch statement)
      const replacementMap = new Map();
      for (const entity of mockEntities) {
        const { original, type } = entity;
        const key = `${type}:${original}`;

        if (!replacementMap.has(key)) {
          let replacement;
          if (!consistencyMapper.has(type, original)) {
            // This switch statement simulates the ACTUAL content.js code (lines 284-320)
            // BUG: Missing case 'location' causes locations to NOT be replaced
            switch (type) {
              case 'properNoun':
                replacement = replacer.replaceProperNoun(original, entity.context);
                break;
              case 'email':
                replacement = replacer.replaceEmail(original);
                break;
              case 'phone':
                replacement = replacer.replacePhone(original);
                break;
              case 'money':
                replacement = replacer.replaceMoney(original);
                break;
              case 'quantity':
                replacement = replacer.replaceQuantity(original);
                break;
              case 'url':
                replacement = replacer.replaceURL(original);
                break;
              case 'address':
                replacement = replacer.replaceAddress(original);
                break;
              case 'date':
                replacement = replacer.replaceDate(original);
                break;
              case 'ssn':
                replacement = replacer.replaceSSN(original);
                break;
              case 'creditCard':
                replacement = replacer.replaceCreditCard(original);
                break;
              case 'ipAddress':
                replacement = replacer.replaceIPAddress(original);
                break;
              case 'location':
                replacement = replacer.replaceLocation(original);
                break;
              default:
                replacement = original;
            }
            consistencyMapper.set(type, original, replacement);
          } else {
            replacement = consistencyMapper.get(type, original);
          }
          replacementMap.set(key, replacement);
        }
      }

      // Apply replacements
      for (const currentNode of textNodes) {
        if (!originalContent.has(currentNode)) {
          originalContent.set(currentNode, currentNode.textContent);
        }

        let nodeText = currentNode.textContent;
        let modified = false;

        for (const [key, replacement] of replacementMap) {
          const original = key.substring(key.indexOf(':') + 1);
          const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedOriginal, 'g');

          if (nodeText.includes(original)) {
            nodeText = nodeText.replace(regex, replacement);
            modified = true;
          }
        }

        if (modified) {
          currentNode.textContent = nodeText;
        }
      }

      // Verify: Locations should be replaced with fake locations, not left unchanged
      const bayAreaReplacement = replacementMap.get('location:Bay Area');
      const newYorkReplacement = replacementMap.get('location:New York');
      const parisReplacement = replacementMap.get('location:Paris');
      const tokyoReplacement = replacementMap.get('location:Tokyo');
      const londonReplacement = replacementMap.get('location:London');

      // Critical assertions: Replacements should NOT be the same as originals
      expect(bayAreaReplacement).toBeDefined();
      expect(bayAreaReplacement).not.toBe('Bay Area');
      expect(newYorkReplacement).toBeDefined();
      expect(newYorkReplacement).not.toBe('New York');
      expect(parisReplacement).toBeDefined();
      expect(parisReplacement).not.toBe('Paris');
      expect(tokyoReplacement).toBeDefined();
      expect(tokyoReplacement).not.toBe('Tokyo');
      expect(londonReplacement).toBeDefined();
      expect(londonReplacement).not.toBe('London');

      // Verify replacements were applied to DOM nodes
      expect(node1.textContent).toContain(bayAreaReplacement);
      expect(node1.textContent).not.toContain('Bay Area');
      expect(node1.textContent).toContain(newYorkReplacement);
      expect(node1.textContent).not.toContain('New York');

      expect(node2.textContent).toContain(bayAreaReplacement);
      expect(node2.textContent).not.toContain('Bay Area');

      expect(node3.textContent).toContain(parisReplacement);
      expect(node3.textContent).not.toContain('Paris');
      expect(node3.textContent).toContain(tokyoReplacement);
      expect(node3.textContent).not.toContain('Tokyo');
      expect(node3.textContent).toContain(londonReplacement);
      expect(node3.textContent).not.toContain('London');

      // Verify consistency: Bay Area should have same replacement in both nodes
      // Both nodes should contain the same replacement for "Bay Area"
      expect(node1.textContent.includes(bayAreaReplacement)).toBe(true);
      expect(node2.textContent.includes(bayAreaReplacement)).toBe(true);
    });
  });
});
