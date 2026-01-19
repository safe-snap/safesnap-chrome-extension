/**
 * PII Protection Module
 * Handles detection, replacement, and restoration of PII on web pages
 */

import { TextExtractor } from '../../detection/text-extractor.js';
import { PIIDictionary } from '../../detection/pii-dictionary.js';
import { updateStatusPanel } from './notification-panel.js';
import { isHighlightEnabled } from './highlight-mode.js';

let originalContent = new Map(); // Store original text nodes
let isPIIProtected = false;
let lastEntityCount = 0; // Track last protection count for panel updates

/**
 * Get protection status
 * @returns {boolean} Whether PII is currently protected
 */
export function getProtectionStatus() {
  return isPIIProtected;
}

/**
 * Update the status panel based on current state
 * Called by highlight-mode when it toggles on/off
 */
export function updateProtectionStatusPanel() {
  const highlightActive = isHighlightEnabled();

  if (isPIIProtected && highlightActive) {
    updateStatusPanel({
      mode: 'protected-highlight',
      data: { entityCount: lastEntityCount },
    });
  } else if (isPIIProtected) {
    updateStatusPanel({
      mode: 'protected',
      data: { entityCount: lastEntityCount },
    });
  } else if (highlightActive) {
    updateStatusPanel({ mode: 'highlight' });
  } else {
    updateStatusPanel({ mode: 'idle' });
  }
}

/**
 * Get original text for a node (used by highlight mode)
 * @param {Node} node - The text node to get original content for
 * @returns {string|null} Original text content or null if not found
 */
export function getOriginalTextForNode(node) {
  if (!isPIIProtected) {
    return null;
  }
  return originalContent.get(node) || null;
}

let replacementLengthMap = new Map(); // Track replacement lengths for highlight position updates

/**
 * Get replacement info for highlight position updates
 * @param {Node} node - Text node
 * @param {number} start - Start position in original text
 * @param {number} end - End position in original text
 * @returns {Object|null} Replacement info {start, end, newLength} or null if not found
 */
export function getReplacementInfo(node, start, end) {
  const nodeKey = `${node}:${start}:${end}`;
  return replacementLengthMap.get(nodeKey) || null;
}

/**
 * Protect PII on the page using 5-phase pipeline
 * @param {Array<string>} enabledTypes - Array of PII types to detect
 * @param {Object} detector - PIIDetector instance
 * @param {Object} replacer - Replacer instance
 * @param {Object} consistencyMapper - ConsistencyMapper instance
 */
export async function protectPII(enabledTypes, detector, replacer, consistencyMapper) {
  console.log('Protecting PII with types:', enabledTypes);

  if (isPIIProtected) {
    console.log('PII is already protected, ignoring duplicate request');
    return;
  }

  if (!detector || !replacer) {
    throw new Error('SafeSnap modules not initialized');
  }

  // Reset multipliers so all money/quantities use the same factor
  replacer.resetMultipliers();

  // Clear previous mappings
  consistencyMapper.clear();
  originalContent.clear();
  replacementLengthMap.clear();

  try {
    // ========================================================================
    // 5-PHASE PIPELINE: Detect PII in DOM
    // ========================================================================
    console.time('PII Detection (5-Phase Pipeline)');

    // Phase 1: Extract text from DOM
    console.time('[Phase 1] Extract Text');
    const textExtractor = new TextExtractor();
    const textMap = textExtractor.extractVisibleText(document.body);
    console.timeEnd('[Phase 1] Extract Text');
    console.log(`[Phase 1] Extracted ${textMap.segments.length} text segments`);

    // Phase 2: Find all candidates (no filtering)
    console.time('[Phase 2] Find Candidates');
    const candidates = detector.findAllCandidates(textMap);
    console.timeEnd('[Phase 2] Find Candidates');
    console.log(`[Phase 2] Found ${candidates.length} raw candidates`);

    // Phase 3: Build dictionary (group by text, resolve conflicts)
    console.time('[Phase 3] Build Dictionary');
    const piiDictionary = new PIIDictionary();
    piiDictionary.buildFrom(candidates, textMap);
    console.timeEnd('[Phase 3] Build Dictionary');
    console.log(`[Phase 3] Dictionary: ${piiDictionary.entities.size} unique entities`);

    // Phase 4: Refine dictionary (remove overlaps, apply thresholds)
    console.time('[Phase 4] Refine');
    piiDictionary.refine();
    console.timeEnd('[Phase 4] Refine');
    console.log(`[Phase 4] Refined: ${piiDictionary.entities.size} entities`);

    // Phase 5: Get enabled entities (filter by user-selected types)
    const piiEntities = piiDictionary.getEnabled(enabledTypes);
    console.log(`[Phase 5] Enabled types: ${piiEntities.length} entities`);

    console.timeEnd('PII Detection (5-Phase Pipeline)');

    // Convert PIIDictionary entities to old format for compatibility with existing replacement logic
    // TODO: Refactor replacement logic to work directly with PIIDictionary entities
    const entities = [];
    for (const entity of piiEntities) {
      for (const occurrence of entity.occurrences) {
        // For single-segment occurrences (most common case)
        if (occurrence.segments.length === 1) {
          const seg = occurrence.segments[0];

          // If entity is entirely within one node
          if (seg.nodes.length === 1) {
            const nodeInfo = seg.nodes[0];
            const textNode = nodeInfo.node;

            // Calculate position relative to the node
            const nodeStart = seg.segmentRelativeStart - nodeInfo.startInSegment;
            const nodeEnd = seg.segmentRelativeEnd - nodeInfo.startInSegment;

            entities.push({
              type: entity.type,
              original: entity.original,
              start: nodeStart,
              end: nodeEnd,
              confidence: entity.confidence,
              context: entity.context,
              node: textNode,
              nodeText: textNode.textContent,
              spansMultipleNodes: false,
            });
          }
          // Entity spans multiple nodes within one segment
          else {
            const firstNode = seg.nodes[0].node;
            entities.push({
              type: entity.type,
              original: entity.original,
              start: occurrence.start,
              end: occurrence.end,
              confidence: entity.confidence,
              context: entity.context,
              node: firstNode,
              nodeText: seg.segment.text,
              spansMultipleNodes: true,
            });
          }
        }
        // For cross-segment occurrences
        else {
          const firstNode = occurrence.segments[0].nodes[0].node;
          entities.push({
            type: entity.type,
            original: entity.original,
            start: occurrence.start,
            end: occurrence.end,
            confidence: entity.confidence,
            context: entity.context,
            node: firstNode,
            nodeText: occurrence.segments.map((s) => s.segment.text).join(' '),
            spansMultipleNodes: true,
          });
        }
      }
    }

    console.log(`[SafeSnap] Detected ${entities.length} PII entities`, detector.getStats(entities));

    // DEBUG: Log all detected entities with their positions and nodes
    console.log(
      '[SafeSnap Debug] ⚠️ ALL DETECTED ENTITIES AFTER detectInDOM:',
      entities.map((e) => ({
        type: e.type,
        original: e.original,
        start: e.start,
        end: e.end,
        nodeText: e.nodeText ? e.nodeText.substring(0, 50) : 'N/A',
        spansMultipleNodes: e.spansMultipleNodes || false,
      }))
    );

    // Auto-link related entities
    consistencyMapper.autoLinkRelated(entities);

    // Phase 1: Generate all replacements and build consistency map
    console.time('Generate Replacements');
    const replacementMap = new Map(); // Map of type+original -> replacement

    for (const entity of entities) {
      const { original, type } = entity;

      // Skip entities without valid original text
      if (!original || typeof original !== 'string') {
        console.warn('[SafeSnap] Skipping entity without valid original text:', entity);
        continue;
      }

      const key = `${type}:${original}`;

      // Skip if we already have a replacement for this
      if (replacementMap.has(key)) {
        continue;
      }

      // Get or generate replacement
      let replacement;
      if (consistencyMapper.has(type, original)) {
        replacement = consistencyMapper.get(type, original);
        console.log(`[SafeSnap Debug] Using cached replacement for ${key}:`, replacement);
      } else {
        // Generate new replacement
        replacement = generateReplacement(type, original, entity.context, replacer);
        console.log(`[SafeSnap Debug] Generated new replacement for ${key}:`, {
          original,
          replacement,
          context: entity.context,
        });

        // Store in consistency map
        consistencyMapper.set(type, original, replacement);

        // Propagate to related entities
        consistencyMapper.propagateToRelated(type, original, replacement);
      }

      replacementMap.set(key, replacement);
    }
    console.timeEnd('Generate Replacements');

    // Phase 2: Apply replacements ONLY to detected positions (not all occurrences)
    console.time('Apply Replacements');
    const replacementCount = applyReplacements(entities, replacementMap);
    console.timeEnd('Apply Replacements');
    console.log(`Applied replacements to ${replacementCount} occurrences`);

    // Protect form inputs
    protectFormInputs(enabledTypes, detector, consistencyMapper);

    isPIIProtected = true;
    lastEntityCount = entities.length;

    // Update status panel - check if highlight mode is also active
    const highlightActive = isHighlightEnabled();
    updateStatusPanel({
      mode: highlightActive ? 'protected-highlight' : 'protected',
      data: { entityCount: entities.length },
    });

    return entities;
  } catch (error) {
    console.error('PII protection failed:', error);
    // Update panel to idle state
    updateStatusPanel({ mode: 'idle' });
    throw error;
  }
}

/**
 * Generate replacement for a PII entity
 * @private
 */
function generateReplacement(type, original, context, replacer) {
  switch (type) {
    case 'properNoun':
      return replacer.replaceProperNoun(original, context);
    case 'email':
      return replacer.replaceEmail(original);
    case 'phone':
      return replacer.replacePhone(original);
    case 'money':
      return replacer.replaceMoney(original);
    case 'quantity':
      return replacer.replaceQuantity(original);
    case 'url':
      return replacer.replaceURL(original);
    case 'address':
      return replacer.replaceAddress(original);
    case 'date':
      return replacer.replaceDate(original);
    case 'ssn':
      return replacer.replaceSSN(original);
    case 'creditCard':
      return replacer.replaceCreditCard(original);
    case 'ipAddress':
      return replacer.replaceIPAddress(original);
    case 'location':
      return replacer.replaceLocation(original);
    default:
      return original;
  }
}

/**
 * Apply replacements to DOM nodes
 * @private
 */
function applyReplacements(entities, replacementMap) {
  let replacementCount = 0;

  // DEBUG: Log all replacements
  if (replacementMap.size > 0) {
    console.log(
      '[SafeSnap Debug] Replacement map:',
      Array.from(replacementMap.entries()).map(([key, val]) => ({
        key,
        original: key.substring(key.indexOf(':') + 1),
        replacement: val,
      }))
    );
  }

  // Group entities by their text node for efficient processing
  const entitiesByNode = new Map();
  const crossNodeEntities = [];

  // DEBUG: Check for duplicate entities and REMOVE them
  // Use a Map to track entities by their actual DOM node reference + position
  const seenEntityKeys = new Map();
  const deduplicatedEntities = [];

  for (const entity of entities) {
    // Create a unique key using the DOM node object reference (not text content)
    // This ensures two identical text nodes in different locations are treated as separate entities
    const nodeKey = entity.node; // The actual DOM node object
    const positionKey = `${entity.type}:${entity.original}:${entity.start}-${entity.end}`;

    // Check if this exact node + position combination has been seen
    if (!seenEntityKeys.has(nodeKey)) {
      seenEntityKeys.set(nodeKey, new Set());
    }

    const nodePositions = seenEntityKeys.get(nodeKey);
    if (nodePositions.has(positionKey)) {
      console.warn('[SafeSnap Debug] ⚠️ DUPLICATE ENTITY DETECTED (REMOVED):', {
        type: entity.type,
        original: entity.original,
        start: entity.start,
        end: entity.end,
        node: entity.node?.parentElement?.tagName || 'unknown',
      });
      continue; // Skip this duplicate
    }

    nodePositions.add(positionKey);
    deduplicatedEntities.push(entity);
  }

  console.log(
    `[SafeSnap Debug] Deduplicated entities: ${entities.length} → ${deduplicatedEntities.length}`
  );

  for (const entity of deduplicatedEntities) {
    if (!entity.node) {
      console.warn('[SafeSnap] Entity without node reference:', entity);
      continue;
    }

    // Check if entity spans beyond its node (cross-node entity)
    if (entity.spansMultipleNodes || entity.end > entity.nodeText.length) {
      console.log('[SafeSnap Debug] Detected cross-node entity for processing:', {
        original: entity.original,
        type: entity.type,
        nodeTextLength: entity.nodeText.length,
        entityEnd: entity.end,
      });
      crossNodeEntities.push(entity);
      continue;
    }

    if (!entitiesByNode.has(entity.node)) {
      entitiesByNode.set(entity.node, []);
    }
    entitiesByNode.get(entity.node).push(entity);
  }

  // Handle cross-node entities
  replacementCount += handleCrossNodeEntities(crossNodeEntities, replacementMap);

  // Process each node that has detected entities
  for (const [node, nodeEntities] of entitiesByNode.entries()) {
    // Store original content before any modification
    if (!originalContent.has(node)) {
      originalContent.set(node, node.textContent);
    }

    // Sort entities by position (descending) to replace from end to beginning
    const sorted = nodeEntities.sort((a, b) => b.start - a.start);

    let nodeText = node.textContent;
    const nodeTextBefore = nodeText;

    // Apply replacements in reverse order (end to beginning)
    for (const entity of sorted) {
      const { original, type, start, end } = entity;
      const key = `${type}:${original}`;
      const replacement = replacementMap.get(key);

      if (!replacement) {
        console.warn('[SafeSnap] No replacement found for:', key);
        continue;
      }

      // Safety check: ensure positions are within node bounds
      if (start < 0 || end > nodeText.length || start >= end) {
        console.warn('[SafeSnap] Invalid position for entity:', {
          original,
          start,
          end,
          nodeTextLength: nodeText.length,
          node: node.parentElement?.tagName || 'unknown',
        });
        continue;
      }

      // Extract the text at the exact position to verify it matches
      const actualText = nodeText.substring(start, end);

      if (actualText !== original) {
        console.warn('[SafeSnap] Text mismatch at position:', {
          expected: original,
          actual: actualText,
          position: `${start}-${end}`,
          node: node.parentElement?.tagName || 'unknown',
        });
        continue;
      }

      // Replace only this specific occurrence at this position
      const before = nodeText;
      nodeText = nodeText.substring(0, start) + replacement + nodeText.substring(end);
      replacementCount++;

      // Track replacement length for highlight position updates
      const nodeKey = `${node}:${start}:${end}`;
      replacementLengthMap.set(nodeKey, {
        start: start,
        end: start + replacement.length, // New end position after replacement
        originalLength: original.length,
        newLength: replacement.length,
      });

      // DEBUG: Log each replacement
      console.log('[SafeSnap Debug] Text replacement:', {
        node: node.parentElement?.tagName || 'unknown',
        before: before, // Show current state, not original
        after: nodeText,
        position: `${start}-${end}`,
        original: original,
        replacement: replacement,
      });
    }

    // Update the node's text content if any replacements were made
    if (nodeText !== nodeTextBefore) {
      node.textContent = nodeText;
    }
  }

  return replacementCount;
}

/**
 * Handle cross-node entities by finding their parent container
 * @private
 */
function handleCrossNodeEntities(crossNodeEntities, replacementMap) {
  let replacementCount = 0;

  if (crossNodeEntities.length === 0) {
    return replacementCount;
  }

  console.log(
    '[SafeSnap] Processing cross-node entities:',
    crossNodeEntities.map((e) => `${e.type}:${e.original}`)
  );

  for (const entity of crossNodeEntities) {
    const { original, type } = entity;
    const key = `${type}:${original}`;
    const replacement = replacementMap.get(key);

    if (!replacement) {
      console.warn('[SafeSnap] No replacement found for cross-node entity:', key);
      continue;
    }

    // Find the nearest parent element that contains this text
    let container = entity.node;
    while (container && container.parentElement) {
      const parentText = container.parentElement.textContent || '';
      if (parentText.includes(original)) {
        container = container.parentElement;
        break;
      }
      container = container.parentElement;
    }

    if (!container) {
      console.warn('[SafeSnap] Could not find container for cross-node entity:', original);
      continue;
    }

    // Use TreeWalker to find and replace in all text nodes within container
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tagName = parent.tagName?.toUpperCase();
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    // Collect all text nodes
    const textNodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode);
    }

    // Try to find and replace the entity text across nodes
    const fullText = textNodes.map((n) => n.textContent).join(' ');
    const index = fullText.indexOf(original);

    if (index !== -1) {
      // Found it - now figure out which nodes contain it
      let charCount = 0;
      let startNodeIndex = -1;
      let endNodeIndex = -1;
      let startOffset = 0;
      let endOffset = 0;

      for (let i = 0; i < textNodes.length; i++) {
        const nodeText = textNodes[i].textContent;
        const nodeLength = nodeText.length;

        if (charCount <= index && index < charCount + nodeLength) {
          startNodeIndex = i;
          startOffset = index - charCount;
        }

        if (
          charCount < index + original.length &&
          index + original.length <= charCount + nodeLength
        ) {
          endNodeIndex = i;
          endOffset = index + original.length - charCount;
          break;
        }

        charCount += nodeLength + 1; // +1 for space separator
      }

      if (startNodeIndex !== -1 && endNodeIndex !== -1) {
        // Case 1: Entity is within a single node
        if (startNodeIndex === endNodeIndex) {
          const node = textNodes[startNodeIndex];
          const text = node.textContent;
          node.textContent =
            text.substring(0, startOffset) + replacement + text.substring(endOffset);
          replacementCount++;
          console.log('[SafeSnap Debug] Replaced cross-node entity (single node):', {
            original,
            replacement,
            node: node.parentElement?.tagName,
          });
        }
        // Case 2: Entity spans multiple nodes - replace by removing middle nodes and putting replacement in first node
        else {
          console.log('[SafeSnap Debug] Cross-node entity spans multiple text nodes:', {
            original,
            startNode: startNodeIndex,
            endNode: endNodeIndex,
            nodeCount: endNodeIndex - startNodeIndex + 1,
          });

          // Strategy: Put the entire replacement in the first node, clear the rest
          const firstNode = textNodes[startNodeIndex];
          const lastNode = textNodes[endNodeIndex];

          // Build the new first node content
          const firstNodeText = firstNode.textContent;
          firstNode.textContent = firstNodeText.substring(0, startOffset) + replacement;

          // Clear middle nodes completely
          for (let i = startNodeIndex + 1; i < endNodeIndex; i++) {
            textNodes[i].textContent = '';
          }

          // Update last node - keep only text after the entity
          const lastNodeText = lastNode.textContent;
          lastNode.textContent = lastNodeText.substring(endOffset);

          replacementCount++;
          console.log('[SafeSnap Debug] Replaced multi-node cross-node entity:', {
            original,
            replacement,
            nodeCount: endNodeIndex - startNodeIndex + 1,
            firstNodeNew: firstNode.textContent,
            lastNodeNew: lastNode.textContent,
          });
        }
      }
    }
  }

  return replacementCount;
}

/**
 * Protect form inputs
 * @private
 */
function protectFormInputs(enabledTypes, detector, consistencyMapper) {
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], textarea, select'
  );

  inputs.forEach((input) => {
    if (input.value && input.value.trim()) {
      const original = input.value;
      const entities = detector.detectInText(original, enabledTypes);

      if (entities.length > 0) {
        // Store original
        if (!originalContent.has(input)) {
          originalContent.set(input, original);
        }

        // Apply replacements
        let newValue = original;
        for (const entity of entities.reverse()) {
          // Skip entities without valid original text
          if (!entity.original || typeof entity.original !== 'string') {
            continue;
          }

          let replacement;
          if (consistencyMapper.has(entity.type, entity.original)) {
            replacement = consistencyMapper.get(entity.type, entity.original);
          } else {
            replacement = entity.original; // Fallback
          }

          newValue =
            newValue.substring(0, entity.start) + replacement + newValue.substring(entity.end);
        }

        input.value = newValue;
      }
    }
  });
}

/**
 * Restore original content
 */
export function restoreOriginal() {
  console.log('Restoring original content');

  if (!isPIIProtected) {
    return;
  }

  // Restore all modified text nodes
  for (const [node, originalText] of originalContent.entries()) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = originalText;
    } else if (
      node.tagName === 'INPUT' ||
      node.tagName === 'TEXTAREA' ||
      node.tagName === 'SELECT'
    ) {
      node.value = originalText;
    }
  }

  // Clear storage
  originalContent.clear();
  replacementLengthMap.clear();
  isPIIProtected = false;
  lastEntityCount = 0;

  // Update status panel - check if highlight mode is still active
  const highlightActive = isHighlightEnabled();
  updateStatusPanel({
    mode: highlightActive ? 'highlight' : 'idle',
  });

  console.log('✅ Original content restored');
}
