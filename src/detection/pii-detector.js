/**
 * PII Detector Module
 *
 * Main detection orchestrator that combines pattern matching, proper noun detection,
 * and dictionary lookup to identify PII entities in text and DOM.
 */

import { PatternMatcher } from './pattern-matcher.js';
import { Dictionary } from './dictionary.js';
import { ProperNounDetector } from './proper-noun-detector.js';
import { EntityDeduplicator } from './entity-deduplicator.js';
import { APP_CONFIG } from '../../config/app-config.js';

export class PIIDetector {
  constructor() {
    this.patternMatcher = new PatternMatcher();
    this.dictionary = new Dictionary();
    this.properNounDetector = null; // Initialize after dictionary loads
    this.deduplicator = new EntityDeduplicator();
    this.initialized = false;
    this.properNounThreshold = 0.75; // Default threshold
  }

  /**
   * Initialize the detector (load dictionary and settings)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.initialized) {
      await this.dictionary.initialize();

      // Initialize proper noun detector with loaded dictionary
      this.properNounDetector = new ProperNounDetector(this.dictionary, this.patternMatcher);

      // Load user's threshold preference from storage
      try {
        const result = await chrome.storage.sync.get(['safesnap_settings']);
        const settings = result.safesnap_settings || {};
        this.properNounThreshold =
          settings.properNounThreshold || APP_CONFIG.properNounDetection?.minimumScore || 0.75;
        console.log(`[PIIDetector] Proper noun threshold: ${this.properNounThreshold}`);

        // Set threshold in ProperNounDetector
        this.properNounDetector.setThreshold(this.properNounThreshold);
      } catch (error) {
        console.warn('[PIIDetector] Could not load threshold from storage, using default:', error);
        this.properNounThreshold = APP_CONFIG.properNounDetection?.minimumScore || 0.75;
        this.properNounDetector.setThreshold(this.properNounThreshold);
      }

      this.initialized = true;
    }
  }

  /**
   * Update proper noun detection threshold
   * Used when user changes sensitivity setting
   * @param {number} threshold - New threshold value (0.0 to 1.0)
   */
  setProperNounThreshold(threshold) {
    this.properNounThreshold = threshold;
    if (this.properNounDetector) {
      this.properNounDetector.setThreshold(threshold);
    }
    console.log(`[PIIDetector] Threshold updated to: ${threshold}`);
  }

  /**
   * Phase 2: Find all PII candidates in a TextMap
   * NEW PIPELINE METHOD - does not filter by confidence or enabled types
   * @param {TextMap} textMap - TextMap from Phase 1
   * @returns {Array<Object>} All detected PII candidates (including low-confidence)
   */
  findAllCandidates(textMap) {
    console.log('[PIIDetector] Phase 2: Finding all PII candidates');
    const candidates = this._detectAllTypes(textMap.fullText);
    console.log(`[PIIDetector] Found ${candidates.length} candidates`);
    return candidates;
  }

  /**
   * Detect PII in text string
   * Always detects ALL types, then filters by enabledTypes
   * @param {string} text - Text to analyze
   * @param {Array<string>} enabledTypes - Types to include in results (filter, not detection control)
   * @returns {Array<Object>} Array of detected PII entities
   */
  detectInText(text, enabledTypes = null) {
    // ALWAYS detect all types
    const allEntities = this._detectAllTypes(text);

    // Filter by enabled types if specified
    if (enabledTypes && enabledTypes.length > 0) {
      return this._filterByEnabledTypes(allEntities, enabledTypes);
    }

    // No filter specified, use defaults or return all
    const defaultTypes = APP_CONFIG.defaults?.enabledPIITypes;
    if (defaultTypes && defaultTypes.length > 0) {
      return this._filterByEnabledTypes(allEntities, defaultTypes);
    }

    return allEntities;
  }

  /**
   * Detect all PII types in text (ignores enabledTypes parameter)
   * This is the core detection logic that always runs on all types
   * @private
   * @param {string} text - Text to analyze
   * @returns {Array<Object>} All detected entities
   */
  _detectAllTypes(text) {
    const entities = [];

    // Pattern-based detection (always run)
    const emails = this.patternMatcher.findEmails(text);
    entities.push(
      ...emails.map((m) => ({
        type: 'email',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 1.0,
      }))
    );

    const phones = this.patternMatcher.findPhones(text);
    entities.push(
      ...phones.map((m) => ({
        type: 'phone',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 1.0,
      }))
    );

    const money = this.patternMatcher.findMoney(text);
    entities.push(
      ...money.map((m) => ({
        type: 'money',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 1.0,
        metadata: m,
      }))
    );

    const quantities = this.patternMatcher.findQuantities(text);
    entities.push(
      ...quantities.map((m) => ({
        type: 'quantity',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 1.0,
        metadata: m,
      }))
    );

    const urls = this.patternMatcher.findURLs(text);
    entities.push(
      ...urls.map((m) => ({
        type: 'url',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 1.0,
      }))
    );

    const ipAddresses = this.patternMatcher.findIPAddresses(text);
    entities.push(
      ...ipAddresses.map((m) => ({
        type: 'ipAddress',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 1.0,
      }))
    );

    const ssns = this.patternMatcher.findSSNs(text);
    entities.push(
      ...ssns.map((m) => ({
        type: 'ssn',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 1.0,
      }))
    );

    const creditCards = this.patternMatcher.findCreditCards(text);
    entities.push(
      ...creditCards.map((m) => ({
        type: 'creditCard',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 1.0,
        metadata: m,
      }))
    );

    const dates = this.patternMatcher.findDates(text);
    entities.push(
      ...dates.map((m) => ({
        type: 'date',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 0.8,
      }))
    );

    const addresses = this.patternMatcher.findAddresses(text);
    entities.push(
      ...addresses.map((m) => ({
        type: 'address',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: 0.7,
      }))
    );

    // Locations (geographic entities)
    const locations = this.patternMatcher.findLocations(text);
    entities.push(
      ...locations.map((m) => ({
        type: 'location',
        original: m.value,
        start: m.start,
        end: m.end,
        confidence: m.matchType === 'gazetteer' ? 0.95 : 0.9,
        metadata: { matchType: m.matchType },
      }))
    );

    // Proper nouns (always run, but lowest priority)
    const properNouns = this._detectProperNouns(text);
    entities.push(...properNouns);

    // Deduplicate with type priority
    return this._deduplicateWithPriority(entities);
  }

  /**
   * Filter detected entities by enabled types
   * @private
   * @param {Array<Object>} entities - All detected entities
   * @param {Array<string>} enabledTypes - Types to include in results
   * @returns {Array<Object>} Filtered entities
   */
  _filterByEnabledTypes(entities, enabledTypes) {
    // null/undefined means "no filter specified" - return all (legacy behavior)
    if (enabledTypes === null || enabledTypes === undefined) {
      return entities;
    }
    // Empty array means "user explicitly selected nothing" - return nothing
    if (enabledTypes.length === 0) {
      return [];
    }

    // Normalize type names (handle singular/plural variations)
    const normalizedTypes = new Set();
    for (const type of enabledTypes) {
      normalizedTypes.add(type);
      // Add common variations
      if (type === 'email' || type === 'emails') {
        normalizedTypes.add('email');
        normalizedTypes.add('emails');
      }
      if (type === 'phone' || type === 'phones') {
        normalizedTypes.add('phone');
        normalizedTypes.add('phones');
      }
      if (type === 'address' || type === 'addresses') {
        normalizedTypes.add('address');
        normalizedTypes.add('addresses');
      }
      if (type === 'location' || type === 'locations') {
        normalizedTypes.add('location');
        normalizedTypes.add('locations');
      }
      if (type === 'properNoun' || type === 'properNouns') {
        normalizedTypes.add('properNoun');
        normalizedTypes.add('properNouns');
      }
      if (type === 'quantity' || type === 'quantities') {
        normalizedTypes.add('quantity');
        normalizedTypes.add('quantities');
      }
      if (type === 'date' || type === 'dates') {
        normalizedTypes.add('date');
        normalizedTypes.add('dates');
      }
      if (type === 'url' || type === 'urls') {
        normalizedTypes.add('url');
        normalizedTypes.add('urls');
      }
      if (type === 'ip' || type === 'ips' || type === 'ipAddress') {
        normalizedTypes.add('ip');
        normalizedTypes.add('ips');
        normalizedTypes.add('ipAddress');
      }
    }

    return entities.filter((entity) => {
      // Check if entity type is in normalized types
      return normalizedTypes.has(entity.type);
    });
  }

  /**
   * Detect all PII candidates for debug/highlight mode
   * Returns ALL candidates including those below threshold for debugging
   * Always detects all types, then filters by enabledTypes
   * @param {Element} rootElement - Root element to scan
   * @param {Array<string>} enabledTypes - Types to include in results (filter, not detection control)
   * @returns {Array<Object>} Array of all candidates with scores and debug info
   */
  detectWithDebugInfo(rootElement, enabledTypes = null) {
    const allCandidates = [];

    const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Don't skip headings in debug mode - we want to visualize everything
        if (this._shouldSkipElementForDebug(parent)) return NodeFilter.FILTER_REJECT;

        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      const text = currentNode.textContent;
      const parentTag = currentNode.parentElement?.tagName;
      const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(parentTag);

      // Debug logging for heading elements
      if (isHeading) {
        console.log('[SafeSnap Debug] Processing heading text:', {
          tag: parentTag,
          text: text.substring(0, 100),
          textLength: text.length,
        });
      }

      // ALWAYS process proper nouns
      const properNounCandidates = this.properNounDetector.detectAllCandidates(text, currentNode);
      properNounCandidates.forEach((candidate) => {
        allCandidates.push({
          ...candidate,
          node: currentNode,
          nodeText: text,
        });
      });

      // Debug logging for heading proper noun candidates
      if (isHeading && properNounCandidates.length > 0) {
        console.log('[SafeSnap Debug] Found proper noun candidates in heading:', {
          tag: parentTag,
          count: properNounCandidates.length,
          candidates: properNounCandidates.map((c) => ({
            value: c.original,
            score: c.score,
            confidence: c.confidence,
          })),
        });
      }

      // ALWAYS process emails
      const emailMatches = this.patternMatcher.matchType(text, 'email');
      emailMatches.forEach((match) => {
        allCandidates.push({
          type: 'email',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 1.0,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process phones
      const phoneMatches = this.patternMatcher.matchType(text, 'phone');
      phoneMatches.forEach((match) => {
        allCandidates.push({
          type: 'phone',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 1.0,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process money
      const moneyMatches = this.patternMatcher.matchType(text, 'money');
      moneyMatches.forEach((match) => {
        allCandidates.push({
          type: 'money',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 1.0,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process quantities
      const quantityMatches = this.patternMatcher.matchType(text, 'quantity');
      quantityMatches.forEach((match) => {
        allCandidates.push({
          type: 'quantity',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 1.0,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process addresses
      const addressMatches = this.patternMatcher.matchType(text, 'address');
      addressMatches.forEach((match) => {
        allCandidates.push({
          type: 'address',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 0.7,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process URLs
      const urlMatches = this.patternMatcher.matchType(text, 'url');
      urlMatches.forEach((match) => {
        allCandidates.push({
          type: 'url',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 1.0,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process IP addresses
      const ipMatches = this.patternMatcher.matchType(text, 'ipAddress');
      ipMatches.forEach((match) => {
        allCandidates.push({
          type: 'ipAddress',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 1.0,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process SSNs
      const ssnMatches = this.patternMatcher.matchType(text, 'ssn');
      ssnMatches.forEach((match) => {
        allCandidates.push({
          type: 'ssn',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 1.0,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process credit cards
      const creditCardMatches = this.patternMatcher.matchType(text, 'creditCard');
      creditCardMatches.forEach((match) => {
        allCandidates.push({
          type: 'creditCard',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 1.0,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process dates
      const dateMatches = this.patternMatcher.matchType(text, 'date');
      dateMatches.forEach((match) => {
        allCandidates.push({
          type: 'date',
          original: match.value,
          start: match.index,
          end: match.index + match.length,
          confidence: 0.8,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: { patternMatch: 1.0 },
        });
      });

      // ALWAYS process locations
      const locationMatches = this.patternMatcher.findLocations(text);
      locationMatches.forEach((match) => {
        allCandidates.push({
          type: 'location',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: match.matchType === 'gazetteer' ? 0.95 : 0.9,
          node: currentNode,
          nodeText: text,
          scoreBreakdown: {
            patternMatch: match.matchType === 'pattern' ? 1.0 : 0,
            gazetteerMatch: match.matchType === 'gazetteer' ? 1.0 : 0,
          },
        });
      });
    }

    console.log('[SafeSnap Debug] BEFORE deduplication - all candidates:', {
      total: allCandidates.length,
      headingCandidates: allCandidates.filter((c) =>
        ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(c.node?.parentElement?.tagName)
      ),
    });

    // Deduplicate with priority BEFORE filtering
    const deduplicated = this._deduplicateWithPriority(allCandidates);

    console.log('[SafeSnap Debug] AFTER deduplication:', {
      totalCandidates: allCandidates.length,
      afterDedup: deduplicated.length,
      headingCandidatesLeft: deduplicated.filter((c) =>
        ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(c.node?.parentElement?.tagName)
      ),
    });

    // Filter by enabled types if specified
    if (enabledTypes && enabledTypes.length > 0) {
      const filtered = this._filterByEnabledTypes(deduplicated, enabledTypes);
      console.log('[SafeSnap Debug] After filtering by enabled types:', {
        enabledTypes,
        beforeFilter: deduplicated.length,
        afterFilter: filtered.length,
        headingCandidatesBeforeFilter: deduplicated.filter((c) =>
          ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(c.node?.parentElement?.tagName)
        ),
        headingCandidatesAfterFilter: filtered.filter((c) =>
          ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(c.node?.parentElement?.tagName)
        ),
      });
      return filtered;
    }

    // No filter specified, use defaults or return all
    const defaultTypes = APP_CONFIG.defaults?.enabledPIITypes;
    if (defaultTypes && defaultTypes.length > 0) {
      return this._filterByEnabledTypes(deduplicated, defaultTypes);
    }

    return deduplicated;
  }

  /**
   * Detect PII in DOM elements
   * @param {Element} rootElement - Root element to scan
   * @param {Array<string>} enabledTypes - PII types to detect
   * @returns {Array<Object>} Array of detected PII with DOM references
   */
  detectInDOM(rootElement, enabledTypes = null) {
    // Step 1: Collect all text nodes and build a position map
    const textNodes = [];
    const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        if (this._shouldSkipElement(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode;
    let globalOffset = 0;

    while ((currentNode = walker.nextNode())) {
      const text = currentNode.textContent;
      textNodes.push({
        node: currentNode,
        text,
        start: globalOffset,
        end: globalOffset + text.length,
      });
      globalOffset += text.length;
      // Add 1 for the space separator we'll add between nodes
      globalOffset += 1;
    }

    // Step 2: Concatenate all text and detect on the full text
    // This allows date patterns to match across node boundaries
    // Add space separator to preserve word boundaries between adjacent elements
    // (e.g., <span>Writer</span><time>Jan 17, 2026</time> becomes "Writer Jan 17, 2026")
    const fullText = textNodes.map((n) => n.text).join(' ');

    // Detect ALL types first (including dates) to enable proper deduplication
    const allEntities = this._detectAllTypes(fullText);

    // Step 3: Map each entity back to its originating text node(s)
    const entitiesWithNodes = allEntities
      .map((entity) => {
        // Find which node this entity starts in
        const nodeInfo = textNodes.find((n) => entity.start >= n.start && entity.start < n.end);

        if (!nodeInfo) {
          console.warn('Could not find node for entity:', entity);
          return null;
        }

        // Convert global position to node-relative position
        const nodeRelativeStart = entity.start - nodeInfo.start;
        const nodeRelativeEnd = entity.end - nodeInfo.start;

        // CRITICAL: Check if entity spans beyond this node
        if (nodeRelativeEnd > nodeInfo.text.length) {
          // Entity spans multiple nodes!
          // For now, we keep it associated with the first node but with adjusted bounds
          // The replacement logic doesn't actually use node-relative positions,
          // it searches by original text, so this is primarily for debugging
          console.log('[SafeSnap Debug] Entity spans multiple nodes:', {
            entity: entity.original,
            type: entity.type,
            nodeText: nodeInfo.text,
            nodeRelativeEnd,
            nodeTextLength: nodeInfo.text.length,
          });

          // Create a valid entity for this node
          // Use the full entity original text, not truncated
          return {
            ...entity,
            node: nodeInfo.node,
            nodeText: nodeInfo.text,
            start: nodeRelativeStart,
            end: nodeRelativeEnd, // Keep the actual end position even if beyond node
            spansMultipleNodes: true,
          };
        }

        return {
          ...entity,
          node: nodeInfo.node,
          nodeText: nodeInfo.text,
          start: nodeRelativeStart,
          end: nodeRelativeEnd,
        };
      })
      .filter(Boolean);

    // Step 4: Filter by enabled types AFTER cross-node deduplication
    return this._filterByEnabledTypes(entitiesWithNodes, enabledTypes);
  }

  /**
   * Detect proper nouns in text using capitalization and dictionary
   * @private
   * @param {string} text - Text to analyze
   * @returns {Array<Object>} Array of proper noun entities
   */
  _detectProperNouns(text) {
    return this.properNounDetector.detect(text);
  }

  /**
   * Check if an element should be skipped during detection
   * Used during replacement/protection (detectInDOM)
   * @private
   * @param {Element} element - DOM element to check
   * @returns {boolean} True if element should be skipped
   */
  _shouldSkipElement(element) {
    const tagName = element.tagName.toUpperCase();
    const config = APP_CONFIG.skipElements;

    // Build combined skip list from config
    const skipTags = [
      ...config.common, // Always skip: LABEL, TH, DT, BUTTON
      ...config.replacement, // Skip during replacement: headings, formatting, structural
      ...config.debug, // Skip non-text content: SCRIPT, STYLE, etc.
    ];

    // Check if tag is in skip list
    if (skipTags.includes(tagName)) return true;

    // Skip elements with certain roles (but NOT 'heading' - headings can contain PII like names)
    const role = element.getAttribute('role');
    if (role === 'label' || role === 'button' || role === 'navigation' || role === 'banner')
      return true;

    // Skip elements with certain classes that indicate structural content
    // Note: 'heading' and 'title' are NOT skipped - they can contain PII like person names
    const classList = element.className || '';
    if (typeof classList === 'string') {
      const structuralClasses = [
        'header',
        'nav',
        'menu',
        'label',
        'btn',
        'button',
        'link',
        'tab',
        'breadcrumb',
        'sidebar',
      ];
      if (structuralClasses.some((cls) => classList.toLowerCase().includes(cls))) return true;
    }

    // Skip if parent is a label followed by colon
    const text = element.textContent || '';
    if (text.trim().endsWith(':')) return true;

    return false;
  }

  /**
   * Check if element should be skipped in debug/highlight mode
   * Less restrictive than _shouldSkipElement - allows headings for visualization
   * Used during highlighting/preview (detectWithDebugInfo)
   * @private
   * @param {Element} element - DOM element to check
   * @returns {boolean} True if element should be skipped
   */
  _shouldSkipElementForDebug(element) {
    const tagName = element.tagName.toUpperCase();
    const config = APP_CONFIG.skipElements;

    // Skip SafeSnap's own UI elements (notification panels, highlight overlays, etc.)
    const elementId = element.id || '';
    // className can be a string or SVGAnimatedString object, convert to string
    const elementClass = typeof element.className === 'string' ? element.className : '';
    if (
      elementId.startsWith('safesnap-') ||
      elementClass.includes('safesnap-') ||
      element.closest?.('[id^="safesnap-"]') ||
      element.closest?.('[class*="safesnap-"]')
    ) {
      return true;
    }

    // In debug mode, skip: common elements + debug-only (non-text content)
    // Do NOT skip: replacement elements (headings, formatting) - we want to visualize those
    const skipTags = [
      ...config.common, // Always skip: LABEL, TH, DT, BUTTON
      ...config.debug, // Skip non-text: SCRIPT, STYLE, NOSCRIPT, IFRAME, SVG
      'NAV',
      'FOOTER',
      'ASIDE',
      'TITLE', // Additional structural elements
    ];

    // Check if tag is in skip list
    if (skipTags.includes(tagName)) return true;

    // Skip elements with certain roles
    const role = element.getAttribute('role');
    if (role === 'label' || role === 'button' || role === 'navigation' || role === 'banner')
      return true;

    return false;
  }

  /**
   * Remove overlapping entities using type priority and confidence
   * @private
   * @param {Array<Object>} entities - Array of entities
   * @returns {Array<Object>} Deduplicated entities
   */
  _deduplicateWithPriority(entities) {
    return this.deduplicator.deduplicate(entities);
  }

  /**
   * Remove overlapping entities (keep highest confidence)
   * @private
   * @param {Array<Object>} entities - Array of entities
   * @returns {Array<Object>} Deduplicated entities
   * @deprecated Use _deduplicateWithPriority instead
   */
  _deduplicateEntities(entities) {
    // Keep old method for backward compatibility during transition
    // Sort by position
    const sorted = [...entities].sort((a, b) => a.start - b.start);

    const deduplicated = [];
    let lastEnd = -1;

    for (const entity of sorted) {
      // Skip if it overlaps with previous entity
      if (entity.start < lastEnd) {
        // Check if this entity has higher confidence
        const lastEntity = deduplicated[deduplicated.length - 1];
        if (entity.confidence > lastEntity.confidence) {
          // Replace with higher confidence entity
          deduplicated[deduplicated.length - 1] = entity;
          lastEnd = entity.end;
        }
        continue;
      }

      deduplicated.push(entity);
      lastEnd = entity.end;
    }

    return deduplicated;
  }

  /**
   * Filter entities by confidence threshold
   * @param {Array<Object>} entities - Array of entities
   * @param {number} minConfidence - Minimum confidence (0-1)
   * @returns {Array<Object>} Filtered entities
   */
  filterByConfidence(entities, minConfidence = 0.5) {
    return entities.filter((entity) => entity.confidence >= minConfidence);
  }

  /**
   * Get detection statistics
   * @param {Array<Object>} entities - Array of entities
   * @returns {Object} Statistics object
   */
  getStats(entities) {
    const stats = {
      total: entities.length,
      byType: {},
      avgConfidence: 0,
    };

    let totalConfidence = 0;

    for (const entity of entities) {
      // Count by type
      if (!stats.byType[entity.type]) {
        stats.byType[entity.type] = 0;
      }
      stats.byType[entity.type]++;

      // Sum confidence
      totalConfidence += entity.confidence;
    }

    // Calculate average confidence
    if (entities.length > 0) {
      stats.avgConfidence = totalConfidence / entities.length;
    }

    return stats;
  }

  /**
   * Get dictionary statistics
   * @returns {Object} Dictionary stats
   */
  getDictionaryStats() {
    return this.dictionary.getStats();
  }
}
