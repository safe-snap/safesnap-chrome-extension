/**
 * Integration Tests for TextExtractor
 *
 * Tests the text extraction phase (Phase 1) of the PII detection pipeline
 *
 * @jest-environment jsdom
 */

const { TextExtractor } = require('../../src/detection/text-extractor.js');

describe('TextExtractor - Phase 1: Extract Visible Text', () => {
  let extractor;

  beforeEach(() => {
    extractor = new TextExtractor();
    // Clear document body for each test
    document.body.innerHTML = '';
  });

  describe('Basic Text Extraction', () => {
    test('should extract text from simple HTML', () => {
      document.body.innerHTML = '<div>Hello World</div>';

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.segments).toHaveLength(1);
      expect(textMap.segments[0].text).toBe('Hello World');
      expect(textMap.fullText).toContain('Hello World');
    });

    test('should extract text from multiple elements', () => {
      document.body.innerHTML = `
        <div>First paragraph</div>
        <div>Second paragraph</div>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.segments.length).toBeGreaterThanOrEqual(2);
      expect(textMap.fullText).toContain('First paragraph');
      expect(textMap.fullText).toContain('Second paragraph');
    });

    test('should add space separators between segments', () => {
      document.body.innerHTML = `
        <span>Word1</span><span>Word2</span>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      // Space separator should be added between segments
      expect(textMap.fullText).toMatch(/Word1\s+Word2/);
    });
  });

  describe('Cross-Node Inline Elements', () => {
    test('should handle text split across inline elements', () => {
      document.body.innerHTML = `
        <div>
          <span>Jim Glab</span> is a <span>freelance writer</span>
        </div>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      // Should extract all text parts
      expect(textMap.fullText).toContain('Jim Glab');
      expect(textMap.fullText).toContain('is a');
      expect(textMap.fullText).toContain('freelance writer');
    });

    test('should handle date split across adjacent elements', () => {
      document.body.innerHTML = `
        <div>
          Published on <span>Jan</span> <time>17, 2026</time>
        </div>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.fullText).toContain('Jan');
      expect(textMap.fullText).toContain('17, 2026');
      // With space separators, this should be detectable as a date
    });
  });

  describe('Skip Elements', () => {
    test('should skip SCRIPT tags', () => {
      document.body.innerHTML = `
        <div>Visible text</div>
        <script>const x = 'invisible';</script>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.fullText).toContain('Visible text');
      expect(textMap.fullText).not.toContain('invisible');
    });

    test('should skip STYLE tags', () => {
      document.body.innerHTML = `
        <div>Visible text</div>
        <style>.class { color: red; }</style>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.fullText).toContain('Visible text');
      expect(textMap.fullText).not.toContain('color');
    });

    test('should skip buttons and labels', () => {
      document.body.innerHTML = `
        <button>Click me</button>
        <label>Form label</label>
        <div>Actual content</div>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.fullText).not.toContain('Click me');
      expect(textMap.fullText).not.toContain('Form label');
      expect(textMap.fullText).toContain('Actual content');
    });
  });

  describe('Position Mapping', () => {
    test('should build correct segment positions in fullText', () => {
      document.body.innerHTML = `
        <span>ABC</span>
        <span>DEF</span>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      // First segment: "ABC" at position 0-3
      expect(textMap.segments[0].startInFullText).toBe(0);
      expect(textMap.segments[0].endInFullText).toBe(3);

      // Second segment: "DEF" after space separator
      expect(textMap.segments[1].startInFullText).toBe(4); // 3 + 1 space
      expect(textMap.segments[1].endInFullText).toBe(7);
    });

    test('should find segments for a given range', () => {
      document.body.innerHTML = `
        <span>0123456789</span>
        <span>ABCDEFGHIJ</span>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      // Find segments for range that spans both
      const segments = textMap.findSegmentsForRange(5, 15);

      // Should include both segments
      expect(segments.length).toBeGreaterThanOrEqual(1);
    });

    test('should get node for specific position', () => {
      document.body.innerHTML = '<span>Hello World</span>';

      const textMap = extractor.extractVisibleText(document.body);

      // Position 6 should be in the word "World"
      const nodeInfo = textMap.getNodeForPosition(6);

      expect(nodeInfo).not.toBeNull();
      expect(nodeInfo.node.textContent).toContain('Hello World');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty elements', () => {
      document.body.innerHTML = `
        <div></div>
        <span>Content</span>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.fullText).toContain('Content');
      expect(textMap.segments).toHaveLength(1);
    });

    test('should handle whitespace-only text nodes', () => {
      document.body.innerHTML = `
        <span>Word1</span>
        
        <span>Word2</span>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      // Whitespace-only nodes should be skipped
      expect(textMap.segments.length).toBe(2);
    });

    test('should handle nested elements', () => {
      document.body.innerHTML = `
        <div>
          <p>
            <span>Deeply</span> nested <a href="#">content</a>
          </p>
        </div>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.fullText).toContain('Deeply');
      expect(textMap.fullText).toContain('nested');
      expect(textMap.fullText).toContain('content');
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle article byline pattern', () => {
      document.body.innerHTML = `
        <div class="byline">
          By <span class="author">Jim Glab</span> is a freelance writer
        </div>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      expect(textMap.fullText).toContain('Jim Glab');
      expect(textMap.fullText).toContain('freelance writer');

      // Should be able to find "Jim Glab" in the extracted text
      const jimGlabStart = textMap.fullText.indexOf('Jim Glab');
      expect(jimGlabStart).toBeGreaterThanOrEqual(0);

      const segments = textMap.findSegmentsForRange(jimGlabStart, jimGlabStart + 8);
      expect(segments.length).toBeGreaterThan(0);
    });

    test('should handle complex date formatting', () => {
      document.body.innerHTML = `
        <div>
          Published on <span>Jan</span> <time datetime="2026-01-17">17, 2026</time>
        </div>
      `;

      const textMap = extractor.extractVisibleText(document.body);

      // All date parts should be present
      expect(textMap.fullText).toContain('Jan');
      expect(textMap.fullText).toMatch(/17/);
      expect(textMap.fullText).toMatch(/2026/);
    });
  });
});
