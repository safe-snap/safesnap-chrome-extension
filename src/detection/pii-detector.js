/**
 * PII Detector Module
 *
 * Main detection orchestrator that combines pattern matching, proper noun detection,
 * and dictionary lookup to identify PII entities in text and DOM.
 */

import { PatternMatcher } from './pattern-matcher.js';
import { Dictionary } from './dictionary.js';
import { APP_CONFIG } from '../../config/app-config.js';

export class PIIDetector {
  constructor() {
    this.patternMatcher = new PatternMatcher();
    this.dictionary = new Dictionary();
    this.initialized = false;
  }

  /**
   * Initialize the detector (load dictionary)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.initialized) {
      await this.dictionary.initialize();
      this.initialized = true;
    }
  }

  /**
   * Detect PII in text string
   * @param {string} text - Text to analyze
   * @param {Array<string>} enabledTypes - PII types to detect
   * @returns {Array<Object>} Array of detected PII entities
   */
  detectInText(text, enabledTypes = null) {
    const types = enabledTypes ||
      APP_CONFIG.defaults?.enabledPIITypes || ['properNouns', 'money', 'quantities'];
    const entities = [];

    // Pattern-based detection (emails, phones, money, etc.)
    if (types.includes('emails') || types.includes('email')) {
      const emails = this.patternMatcher.findEmails(text);
      entities.push(
        ...emails.map((match) => ({
          type: 'email',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 1.0,
        }))
      );
    }

    if (types.includes('phones') || types.includes('phone')) {
      const phones = this.patternMatcher.findPhones(text);
      entities.push(
        ...phones.map((match) => ({
          type: 'phone',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 1.0,
        }))
      );
    }

    if (types.includes('money')) {
      const money = this.patternMatcher.findMoney(text);
      entities.push(
        ...money.map((match) => ({
          type: 'money',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 1.0,
          metadata: match,
        }))
      );
    }

    if (types.includes('quantities')) {
      const quantities = this.patternMatcher.findQuantities(text);
      entities.push(
        ...quantities.map((match) => ({
          type: 'quantity',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 1.0,
          metadata: match,
        }))
      );
    }

    if (types.includes('urls') || types.includes('url')) {
      const urls = this.patternMatcher.findURLs(text);
      entities.push(
        ...urls.map((match) => ({
          type: 'url',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 1.0,
        }))
      );
    }

    if (types.includes('ips') || types.includes('ipAddress')) {
      const ips = this.patternMatcher.findIPAddresses(text);
      entities.push(
        ...ips.map((match) => ({
          type: 'ipAddress',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 1.0,
        }))
      );
    }

    if (types.includes('ssn')) {
      const ssns = this.patternMatcher.findSSNs(text);
      entities.push(
        ...ssns.map((match) => ({
          type: 'ssn',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 1.0,
        }))
      );
    }

    if (types.includes('creditCard')) {
      const cards = this.patternMatcher.findCreditCards(text);
      entities.push(
        ...cards.map((match) => ({
          type: 'creditCard',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 1.0,
        }))
      );
    }

    if (types.includes('dates') || types.includes('date')) {
      const dates = this.patternMatcher.findDates(text);
      entities.push(
        ...dates.map((match) => ({
          type: 'date',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 0.8, // Lower confidence for dates
        }))
      );
    }

    if (types.includes('addresses') || types.includes('address')) {
      const addresses = this.patternMatcher.findAddresses(text);
      entities.push(
        ...addresses.map((match) => ({
          type: 'address',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: 0.7, // Lower confidence for addresses
        }))
      );
    }

    // Proper noun detection (names, companies)
    if (types.includes('properNouns')) {
      const properNouns = this._detectProperNouns(text);
      entities.push(...properNouns);
    }

    // Sort by position and remove overlaps
    return this._deduplicateEntities(entities);
  }

  /**
   * Detect all PII candidates for debug/highlight mode
   * Returns ALL candidates including those below threshold for debugging
   * @param {Element} rootElement - Root element to scan
   * @param {Array<string>} enabledTypes - PII types to detect
   * @returns {Array<Object>} Array of all candidates with scores and debug info
   */
  detectWithDebugInfo(rootElement, enabledTypes = null) {
    const allCandidates = [];
    const types = enabledTypes ||
      APP_CONFIG.defaults?.enabledPIITypes || ['properNouns', 'money', 'quantities'];

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

      // Process proper nouns if enabled
      if (types.includes('properNouns')) {
        const properNounCandidates = this._detectAllProperNounCandidates(text);
        properNounCandidates.forEach((candidate) => {
          allCandidates.push({
            ...candidate,
            node: currentNode,
            nodeText: text,
          });
        });
      }

      // Process emails if enabled
      if (types.includes('emails') || types.includes('email')) {
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
      }

      // Process phones if enabled
      if (types.includes('phones') || types.includes('phone')) {
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
      }

      // Process money if enabled
      if (types.includes('money')) {
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
      }

      // Process quantities if enabled
      if (types.includes('quantities')) {
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
      }

      // Process addresses if enabled
      if (types.includes('addresses') || types.includes('address')) {
        const addressMatches = this.patternMatcher.matchType(text, 'address');
        addressMatches.forEach((match) => {
          allCandidates.push({
            type: 'address',
            original: match.value,
            start: match.index,
            end: match.index + match.length,
            confidence: 1.0,
            node: currentNode,
            nodeText: text,
            scoreBreakdown: { patternMatch: 1.0 },
          });
        });
      }

      // Process URLs if enabled
      if (types.includes('urls') || types.includes('url')) {
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
      }

      // Process credit cards if enabled
      if (types.includes('creditCards') || types.includes('creditCard')) {
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
      }

      // Process dates if enabled
      if (types.includes('dates') || types.includes('date')) {
        const dateMatches = this.patternMatcher.matchType(text, 'date');
        dateMatches.forEach((match) => {
          allCandidates.push({
            type: 'date',
            original: match.value,
            start: match.index,
            end: match.index + match.length,
            confidence: 1.0,
            node: currentNode,
            nodeText: text,
            scoreBreakdown: { patternMatch: 1.0 },
          });
        });
      }

      // Process IPs if enabled
      if (types.includes('ips') || types.includes('ip')) {
        const ipv4Matches = this.patternMatcher.matchType(text, 'ipv4');
        ipv4Matches.forEach((match) => {
          allCandidates.push({
            type: 'ip',
            original: match.value,
            start: match.index,
            end: match.index + match.length,
            confidence: 1.0,
            node: currentNode,
            nodeText: text,
            scoreBreakdown: { patternMatch: 1.0 },
          });
        });
      }
    }

    return allCandidates;
  }

  /**
   * Detect ALL proper noun candidates including those below threshold
   * Used for debug mode visualization
   * @private
   * @param {string} text - Text to analyze
   * @returns {Array<Object>} Array of all candidates with scores
   */
  _detectAllProperNounCandidates(text) {
    const candidates = [];
    const config = APP_CONFIG.properNounDetection;
    const minimumScore = config?.minimumScore || 0.8;

    const capitalizedPattern =
      /\b(?:(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?(?!Mr|Mrs|Ms|Dr|Prof\b)[A-Z][a-z]+(?:\s+(?!Mr|Mrs|Ms|Dr|Prof\b)[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd|Limited|Company|Co\.|Corporation))?\b/g;

    let match;
    while ((match = capitalizedPattern.exec(text)) !== null) {
      const candidate = match[0];
      const start = match.index;
      const end = start + candidate.length;

      const hasHonorific = /^(?:Mr|Mrs|Ms|Dr|Prof)\.\s+/i.test(candidate);
      const hasCompanySuffix = /\b(Inc|Corp|LLC|Ltd|Limited|Company|Co\.|Corporation)\b/i.test(
        candidate
      );

      const beforeChar = start > 0 ? text[start - 1] : '';
      const twoBeforeChar = start > 1 ? text[start - 2] : '';
      const isSentenceStart =
        start === 0 ||
        beforeChar === '.' ||
        beforeChar === '!' ||
        beforeChar === '?' ||
        (beforeChar === ' ' &&
          (twoBeforeChar === '.' || twoBeforeChar === '!' || twoBeforeChar === '?'));

      const nameWithoutHonorific = candidate.replace(/^(?:Mr|Mrs|Ms|Dr|Prof)\.\s+/i, '');
      const wordCount = nameWithoutHonorific.split(/\s+/).length;
      const nearPII = this._hasNearbyPII(text, start, end);

      const context = {
        hasHonorific,
        hasCompanySuffix,
        wordCount,
        isSentenceStart,
        nearPII,
      };

      const { score, breakdown } = this._calculateProperNounScore(candidate, context);
      const entityContext = hasCompanySuffix ? 'company' : 'person';

      candidates.push({
        type: 'properNoun',
        original: candidate,
        start,
        end,
        confidence: score,
        context: entityContext,
        scoreBreakdown: breakdown,
        willBeProtected: score >= minimumScore,
        threshold: minimumScore,
      });
    }

    return candidates;
  }

  /**
   * Check if nearby PII exists within window
   * @private
   */
  _hasNearbyPII(text, start, end) {
    const windowSize = APP_CONFIG.properNounDetection?.nearbyPIIWindowSize || 50;
    const windowStart = Math.max(0, start - windowSize);
    const windowEnd = Math.min(text.length, end + windowSize);
    const windowText = text.substring(windowStart, windowEnd);

    const emails = this.patternMatcher.matchType(windowText, 'email');
    const phones = this.patternMatcher.matchType(windowText, 'phone');

    return emails.length > 0 || phones.length > 0;
  }

  /**
   * Calculate proper noun confidence score
   * @private
   */
  _calculateProperNounScore(candidate, context) {
    const config = APP_CONFIG.properNounDetection;
    const weights = config?.weights || {};
    let score = 0;
    const breakdown = {};

    // Signal 1: Capitalization (always present)
    breakdown.capitalizationPattern = weights.capitalizationPattern || 0.3;
    score += breakdown.capitalizationPattern;

    // Signal 2: Unknown in Dictionary (>50%)
    const unknownRatio = this._calculateUnknownWordRatio(candidate);
    if (unknownRatio > 0.5) {
      breakdown.unknownInDictionary = weights.unknownInDictionary || 0.3;
      breakdown.unknownInDictionary_detail = `${Math.round(unknownRatio * 100)}% unknown`;
      score += breakdown.unknownInDictionary;
    }

    // Signal 3: Honorific or Company Suffix
    if (context.hasHonorific || context.hasCompanySuffix) {
      breakdown.hasHonorificOrSuffix = weights.hasHonorificOrSuffix || 0.4;
      breakdown.hasHonorificOrSuffix_detail = context.hasHonorific ? 'honorific' : 'suffix';
      score += breakdown.hasHonorificOrSuffix;
    }

    // Signal 4: Multi-word
    if (context.wordCount >= 2) {
      breakdown.multiWord = weights.multiWord || 0.2;
      breakdown.multiWord_detail = `${context.wordCount} words`;
      score += breakdown.multiWord;
    }

    // Signal 5: Not sentence start
    if (!context.isSentenceStart) {
      breakdown.notSentenceStart = weights.notSentenceStart || 0.1;
      score += breakdown.notSentenceStart;
    }

    // Signal 6: Near PII
    if (context.nearPII) {
      breakdown.nearOtherPII = weights.nearOtherPII || 0.2;
      score += breakdown.nearOtherPII;
    }

    score = Math.min(score, 1.0);

    return { score, breakdown };
  }

  /**
   * Calculate ratio of unknown words (not in dictionary)
   * @private
   */
  _calculateUnknownWordRatio(candidate) {
    const cleaned = candidate
      .replace(/^(?:Mr|Mrs|Ms|Dr|Prof)\.\s+/i, '')
      .replace(/\s+(Inc|Corp|LLC|Ltd|Limited|Company|Co\.|Corporation)$/i, '');

    const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return 0;

    // Fallback if dictionary not initialized
    if (!this.dictionary || !this.initialized) {
      return 0.5;
    }

    let unknownCount = 0;
    for (const word of words) {
      if (!this.dictionary.isCommonWord(word.toLowerCase())) {
        unknownCount++;
      }
    }

    const ratio = unknownCount / words.length;

    return ratio;
  }

  /**
   * Detect PII in DOM elements
   * @param {Element} rootElement - Root element to scan
   * @param {Array<string>} enabledTypes - PII types to detect
   * @returns {Array<Object>} Array of detected PII with DOM references
   */
  detectInDOM(rootElement, enabledTypes = null) {
    const entities = [];
    const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip certain elements that shouldn't be modified
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Skip labels, headings, and other structural elements
        if (this._shouldSkipElement(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip empty or whitespace-only text
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      const text = currentNode.textContent;
      const detected = this.detectInText(text, enabledTypes);

      // Add DOM reference to each entity
      detected.forEach((entity) => {
        entities.push({
          ...entity,
          node: currentNode,
          nodeText: text,
        });
      });
    }

    return entities;
  }

  /**
   * Detect proper nouns in text using capitalization and dictionary
   * @private
   * @param {string} text - Text to analyze
   * @returns {Array<Object>} Array of proper noun entities
   */
  _detectProperNouns(text) {
    // Use the new scoring system and filter by threshold
    const candidates = this._detectAllProperNounCandidates(text);
    // Filter to only return those that meet the threshold
    return candidates.filter((candidate) => candidate.confidence >= candidate.threshold);
  }

  /**
   * Check if an element should be skipped during detection
   * @private
   * @param {Element} element - DOM element to check
   * @returns {boolean} True if element should be skipped
   */
  _shouldSkipElement(element) {
    const tagName = element.tagName.toLowerCase();

    // Skip labels, headings, buttons, navigation, etc.
    const skipTags = [
      'label',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'button',
      'strong',
      'b',
      'em',
      'i',
      'nav',
      'header',
      'footer',
      'aside',
      'title',
      'a',
    ];
    if (skipTags.includes(tagName)) return true;

    // Skip elements with certain roles
    const role = element.getAttribute('role');
    if (
      role === 'heading' ||
      role === 'label' ||
      role === 'button' ||
      role === 'navigation' ||
      role === 'banner'
    )
      return true;

    // Skip elements with certain classes that indicate structural content
    const classList = element.className || '';
    if (typeof classList === 'string') {
      const structuralClasses = [
        'header',
        'nav',
        'menu',
        'title',
        'heading',
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

    // Skip script, style, and other non-content elements
    if (['script', 'style', 'noscript', 'iframe', 'svg'].includes(tagName)) return true;

    return false;
  }

  /**
   * Check if an element should be skipped during debug/highlight mode
   * Less restrictive than _shouldSkipElement - allows headings for visualization
   * @private
   * @param {Element} element - DOM element to check
   * @returns {boolean} True if element should be skipped
   */
  _shouldSkipElementForDebug(element) {
    const tagName = element.tagName.toLowerCase();

    // In debug mode, only skip truly structural elements
    const skipTags = [
      'script',
      'style',
      'noscript',
      'iframe',
      'svg',
      'label',
      'button',
      'nav',
      'footer',
      'aside',
      'title',
    ];
    if (skipTags.includes(tagName)) return true;

    // Skip elements with certain roles
    const role = element.getAttribute('role');
    if (role === 'label' || role === 'button' || role === 'navigation' || role === 'banner')
      return true;

    return false;
  }

  /**
   * Remove overlapping entities (keep highest confidence)
   * @private
   * @param {Array<Object>} entities - Array of entities
   * @returns {Array<Object>} Deduplicated entities
   */
  _deduplicateEntities(entities) {
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
   * Increment usage count and check for dictionary download suggestion
   * @returns {boolean} True if full dictionary download should be suggested
   */
  checkDictionaryUsage() {
    return this.dictionary.incrementUsage();
  }

  /**
   * Get dictionary statistics
   * @returns {Object} Dictionary stats
   */
  getDictionaryStats() {
    return this.dictionary.getStats();
  }
}
