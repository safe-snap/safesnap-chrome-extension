/**
 * Text Extractor Module
 *
 * Phase 1 of PII detection pipeline: Extract visible text from DOM
 * into a structured format that preserves node boundaries and position mappings.
 *
 * This allows subsequent phases to work with plain text while maintaining
 * the ability to map back to DOM nodes for replacement.
 */

import { APP_CONFIG } from '../../config/app-config.js';

/**
 * Represents a group of related text nodes (e.g., adjacent inline elements)
 */
class TextSegment {
  constructor(id) {
    this.id = id; // "segment-1"
    this.text = ''; // Concatenated text from all nodes
    this.nodes = []; // [{ node, text, startInSegment, endInSegment }]
    this.startInFullText = 0; // Position in TextMap.fullText
    this.endInFullText = 0; // Position in TextMap.fullText
  }

  /**
   * Add a text node to this segment
   * @param {Node} node - DOM text node
   * @param {string} text - Text content
   */
  addNode(node, text) {
    const startInSegment = this.text.length;
    this.text += text;
    const endInSegment = this.text.length;

    this.nodes.push({
      node,
      text,
      startInSegment,
      endInSegment,
    });
  }
}

/**
 * Represents the complete visible text structure of a DOM tree
 */
export class TextMap {
  constructor() {
    this.segments = []; // Array of TextSegment
    this.fullText = ''; // All text concatenated with space separators
    this.positionMap = []; // [{ start, end, segmentIndex, nodeIndex }]
  }

  /**
   * Find which segments contain a given text range
   * @param {number} start - Start position in fullText
   * @param {number} end - End position in fullText
   * @returns {Array<Object>} Array of segments with their portions
   */
  findSegmentsForRange(start, end) {
    const result = [];

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];

      // Check if segment overlaps with range
      if (segment.startInFullText < end && segment.endInFullText > start) {
        // Calculate overlap
        const overlapStart = Math.max(start, segment.startInFullText);
        const overlapEnd = Math.min(end, segment.endInFullText);

        // Convert to segment-relative positions
        const segmentRelativeStart = overlapStart - segment.startInFullText;
        const segmentRelativeEnd = overlapEnd - segment.startInFullText;

        // Find which nodes in this segment are involved
        const involvedNodes = [];
        for (const nodeInfo of segment.nodes) {
          if (
            nodeInfo.startInSegment < segmentRelativeEnd &&
            nodeInfo.endInSegment > segmentRelativeStart
          ) {
            involvedNodes.push(nodeInfo);
          }
        }

        result.push({
          segment,
          segmentIndex: i,
          overlapStart,
          overlapEnd,
          segmentRelativeStart,
          segmentRelativeEnd,
          nodes: involvedNodes,
        });
      }
    }

    return result;
  }

  /**
   * Find which node contains a specific position
   * @param {number} pos - Position in fullText
   * @returns {Object|null} Node info or null
   */
  getNodeForPosition(pos) {
    for (const segment of this.segments) {
      if (pos >= segment.startInFullText && pos < segment.endInFullText) {
        const segmentRelativePos = pos - segment.startInFullText;

        for (const nodeInfo of segment.nodes) {
          if (
            segmentRelativePos >= nodeInfo.startInSegment &&
            segmentRelativePos < nodeInfo.endInSegment
          ) {
            return {
              node: nodeInfo.node,
              segment,
              nodeInfo,
              positionInNode: segmentRelativePos - nodeInfo.startInSegment,
            };
          }
        }
      }
    }

    return null;
  }
}

/**
 * Extracts visible text from DOM into structured TextMap format
 */
export class TextExtractor {
  /**
   * Extract visible text from a DOM element
   * @param {Element} rootElement - Root element to scan
   * @returns {TextMap} Structured text map
   */
  extractVisibleText(rootElement) {
    const textMap = new TextMap();
    const segments = [];
    let segmentCounter = 0;

    // Walk the DOM tree and collect text nodes
    const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Skip non-visible elements
        if (this._shouldSkipElement(parent)) {
          // Debug: Log skipped elements containing "Jim" or "Glab"
          if (
            node.textContent &&
            (node.textContent.includes('Jim') || node.textContent.includes('Glab'))
          ) {
            console.log('[TextExtractor] ⚠️ SKIPPED element containing Jim/Glab:', {
              text: node.textContent,
              parent: parent.tagName,
              role: parent.getAttribute('role'),
              classes: parent.className,
            });
          }
          return NodeFilter.FILTER_REJECT;
        }

        // Skip empty or whitespace-only text
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    // Collect text nodes and group into segments
    let currentSegment = null;
    let currentNode;

    while ((currentNode = walker.nextNode())) {
      const text = currentNode.textContent;

      // For now, create a new segment for each text node
      // Future enhancement: merge adjacent inline elements into same segment
      if (!currentSegment) {
        currentSegment = new TextSegment(`segment-${++segmentCounter}`);
      }

      currentSegment.addNode(currentNode, text);

      // End current segment and start new one
      // (This creates one segment per text node for simplicity)
      segments.push(currentSegment);
      currentSegment = null;
    }

    // Build fullText and update segment positions
    let globalOffset = 0;
    const fullTextParts = [];

    for (const segment of segments) {
      segment.startInFullText = globalOffset;
      fullTextParts.push(segment.text);
      globalOffset += segment.text.length;
      segment.endInFullText = globalOffset;

      // Add space separator between segments (for word boundaries)
      fullTextParts.push(' ');
      globalOffset += 1;
    }

    textMap.segments = segments;
    textMap.fullText = fullTextParts.join('');

    // Log extraction results
    console.log('[TextExtractor] Extraction complete:', {
      segments: segments.length,
      totalChars: textMap.fullText.length,
      preview: textMap.fullText.substring(0, 100) + '...',
    });

    return textMap;
  }

  /**
   * Check if an element should be skipped during text extraction
   * @private
   * @param {Element} element - DOM element to check
   * @returns {boolean} True if element should be skipped
   */
  _shouldSkipElement(element) {
    const tagName = element.tagName.toUpperCase();
    const config = APP_CONFIG.skipElements;

    // Build combined skip list
    const skipTags = [
      ...config.common, // LABEL, TH, DT, BUTTON
      ...config.replacement, // Headings, formatting, structural
      ...config.debug, // SCRIPT, STYLE, NOSCRIPT
    ];

    // Check if tag is in skip list
    if (skipTags.includes(tagName)) return true;

    // Skip elements with certain roles (but NOT 'heading' - headings can contain PII like names)
    const role = element.getAttribute('role');
    if (role === 'label' || role === 'button' || role === 'navigation' || role === 'banner') {
      return true;
    }

    // Skip hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return true;
    }

    return false;
  }
}
