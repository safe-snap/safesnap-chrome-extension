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
    this.properNounThreshold = 0.75; // Default threshold
  }

  /**
   * Initialize the detector (load dictionary and settings)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.initialized) {
      await this.dictionary.initialize();

      // Load user's threshold preference from storage
      try {
        const result = await chrome.storage.sync.get(['safesnap_settings']);
        const settings = result.safesnap_settings || {};
        this.properNounThreshold =
          settings.properNounThreshold || APP_CONFIG.properNounDetection?.minimumScore || 0.75;
        console.log(`[PIIDetector] Proper noun threshold: ${this.properNounThreshold}`);
      } catch (error) {
        console.warn('[PIIDetector] Could not load threshold from storage, using default:', error);
        this.properNounThreshold = APP_CONFIG.properNounDetection?.minimumScore || 0.75;
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
    console.log(`[PIIDetector] Threshold updated to: ${threshold}`);
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
    if (!enabledTypes || enabledTypes.length === 0) {
      return entities; // No filter, return all
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
      const properNounCandidates = this._detectAllProperNounCandidates(text, currentNode);
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
   * Detect ALL proper noun candidates including those below threshold
   * Used for debug mode visualization
   * @private
   * @param {string} text - Text to analyze
   * @param {Node} node - DOM node containing the text (optional, for context signals)
   * @returns {Array<Object>} Array of all candidates with scores
   */
  _detectAllProperNounCandidates(text, node = null) {
    const candidates = [];
    const minimumScore = this.properNounThreshold; // Use instance variable from initialize()

    // Enhanced pattern to handle apostrophes, hyphens, ampersands, and more company/job title indicators
    // Matches:
    // - Honorifics: Mr., Mrs., Ms., Dr., Prof.
    // - Job titles: CEO, CTO, CFO, Director, Manager, VP, President, etc.
    // - Names with apostrophes: O'Brien, D'Angelo
    // - Names with hyphens: Mary-Jane, Jean-Luc
    // - Company suffixes: Inc, Corp, LLC, Ltd, Limited, Company, Co., Corporation, GmbH, SA, PLC, AG
    // - Names with ampersands: McKinsey & Company, Johnson & Johnson
    //
    // Note: Using (?<![a-zA-Z']) negative lookbehind to handle apostrophes properly
    const capitalizedPattern =
      /(?<![a-zA-Z'])(?:(?:Mr|Mrs|Ms|Dr|Prof|CEO|CTO|CFO|VP|SVP|EVP|President|Director|Manager|Chief|Senior|Junior|Lead)\.?\s+)?(?!Mr|Mrs|Ms|Dr|Prof|CEO|CTO|CFO|VP|SVP|EVP|President|Director|Manager|Chief|Senior|Junior|Lead\b)[A-Z][a-z]+(?:[''-][A-Z]?[a-z]+)?(?:\s+(?:&\s+)?(?!Mr|Mrs|Ms|Dr|Prof|CEO|CTO|CFO|VP|SVP|EVP|President|Director|Manager|Chief|Senior|Junior|Lead\b)[A-Z][a-z]+(?:[''-][A-Z]?[a-z]+)?)*(?:\s+(?:Inc|Corp|LLC|Ltd|Limited|Company|Co\.|Corporation|GmbH|SA|PLC|AG|Group|Partners|Associates|Ventures|Technologies|Tech|Systems|Solutions|Consulting|Services|International|Intl))?\.?(?![a-zA-Z'])/g;

    let match;
    while ((match = capitalizedPattern.exec(text)) !== null) {
      let candidate = match[0];
      let start = match.index;
      let end = start + candidate.length;

      // Fix Issue #1: Remove common prepositions/words at the start if they're in the dictionary
      // This prevents "By Stephen Council" from being detected; instead detects "Stephen Council"
      const commonStartWords = [
        'By',
        'In',
        'On',
        'At',
        'For',
        'With',
        'From',
        'To',
        'As',
        'Of',
        'Meet',
        'See',
        'Contact',
        'Call',
        'Visit',
        'Email',
        'Ask',
      ];
      const firstWord = candidate.split(/\s+/)[0];

      if (commonStartWords.includes(firstWord)) {
        // Remove the common word from the start (no need to check dictionary for these known words)
        const wordsToRemove = firstWord.length + 1; // +1 for the space
        candidate = candidate.substring(wordsToRemove).trim();
        start = start + wordsToRemove;

        // Skip if nothing left after removal
        if (candidate.length === 0) {
          continue;
        }
      }

      const hasHonorific = /^(?:Mr|Mrs|Ms|Dr|Prof)\b\.?\s+/i.test(candidate);
      const hasJobTitle =
        /^(?:CEO|CTO|CFO|VP|SVP|EVP|President|Director|Manager|Chief|Senior|Junior|Lead)\b\.?\s+/i.test(
          candidate
        );

      // Fix Issue #2: Only consider company suffix if it's at the END of the phrase
      // This prevents "Tech Reporter" from being detected as a company
      const hasCompanySuffix =
        /\b(Inc|Corp|LLC|Ltd|Limited|Company|Co\.|Corporation|GmbH|SA|PLC|AG|Group|Partners|Associates|Ventures)\.?\s*$/i.test(
          candidate
        );

      // Separate check for tech/service suffixes (only at end)
      const hasTechSuffix =
        /\b(Technologies|Tech|Systems|Solutions|Consulting|Services|International|Intl)\.?\s*$/i.test(
          candidate
        );

      // Fix Issue #2b: Detect if this is ONLY a standalone job title pattern (no name following)
      // E.g., "Tech Reporter" or "Senior Engineer" by itself
      const isStandaloneJobTitle =
        /^(Senior|Junior|Lead|Chief|Principal|Staff|Associate)\s+(Engineer|Developer|Manager|Designer|Analyst|Writer|Reporter|Editor|Architect|Scientist|Consultant)$/i.test(
          candidate
        ) ||
        /^(Tech|Senior Tech|Lead Tech|Staff Tech)\s+(Writer|Reporter|Lead|Manager)$/i.test(
          candidate
        );

      // Fix Issue #2c: Detect job description patterns in the candidate
      // Instead of stripping, we'll penalize the confidence score later
      // This gives users control via threshold adjustment
      const hasJobDescriptionPrefix =
        /^(?:Senior|Junior|Lead|Chief|Principal|Staff|Associate|Tech)\s+(?:Engineer|Developer|Designer|Analyst|Writer|Reporter|Editor|Architect|Scientist|Consultant|Technician|Specialist)\s+/i.test(
          candidate
        ) ||
        /^(?:Engineer|Developer|Designer|Analyst|Writer|Reporter|Editor|Architect|Scientist|Consultant|Tech|Technician|Specialist)\s+(?!Inc|Corp|LLC|Ltd)/i.test(
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
      const isDepartmentName = this._isDepartmentName(candidate);
      const emailDomainMatch = this._matchesNearbyEmailDomain(text, candidate, start, end);

      // Check if text is inside a link (author bylines, profile links, etc.)
      const insideLink = node && node.parentElement && node.parentElement.tagName === 'A';

      // Check if candidate is a known location (New York, Paris, Delaware, etc.)
      const isKnownLocation = this._isKnownLocation(candidate);

      const context = {
        hasHonorific,
        hasJobTitle,
        hasCompanySuffix: hasCompanySuffix || hasTechSuffix,
        wordCount,
        isSentenceStart,
        nearPII,
        isDepartmentName,
        emailDomainMatch,
        insideLink,
        isKnownLocation,
        isStandaloneJobTitle, // NEW: Flag for standalone job titles
        hasJobDescriptionPrefix, // NEW: Flag for job description prefixes
      };

      let { score, breakdown } = this._calculateProperNounScore(candidate, context);

      // Fix Issue #2d: Apply penalties based on job-related context
      // This allows users to control detection via threshold adjustment

      // Skip standalone job titles entirely (e.g., "Tech Reporter" alone)
      if (isStandaloneJobTitle) {
        score = 0;
        breakdown.isStandaloneJobTitle = 'skipped';
      }

      // Penalize job description prefixes (e.g., "Senior Engineer John Smith" or "Tech Writer John Smith")
      // Reduced penalty to -0.25 to allow detection with user threshold adjustment
      if (hasJobDescriptionPrefix && !isStandaloneJobTitle) {
        score = Math.max(0, score - 0.25);
        breakdown.hasJobDescriptionPrefix = -0.25;
      }

      // Determine entity type based on context
      let entityContext = 'unknown';
      if (hasCompanySuffix || hasTechSuffix) {
        entityContext = 'company';
      } else if (hasHonorific || hasJobTitle) {
        entityContext = 'person';
      } else if (wordCount === 1) {
        // Single word could be brand/company (e.g., "SpaceX", "Google")
        entityContext = 'company_or_person';
      } else {
        // Multi-word is likely a person name
        entityContext = 'person';
      }

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
   * Check if candidate matches a common department/team name pattern
   * Uses pattern matching instead of hardcoded list for better coverage
   * @private
   */
  _isDepartmentName(candidate) {
    const config = APP_CONFIG.properNounDetection;
    const prefixes = config?.departmentPrefixes || [];
    const suffixes = config?.departmentSuffixes || [];

    // Remove trailing punctuation and normalize
    let normalized = candidate
      .trim()
      .replace(/[.,;!?]+$/, '')
      .toLowerCase();

    // Also check after removing common leading verbs (e.g., "Visit Human Resources")
    const withoutLeadingVerb = normalized.replace(/^(call|visit|contact|reach|see)\s+/, '');

    // Check both with and without leading verb
    for (const text of [normalized, withoutLeadingVerb]) {
      // Pattern 1: Exact prefix match (e.g., "Human Resources")
      if (prefixes.some((prefix) => prefix.toLowerCase() === text)) {
        return true;
      }

      // Pattern 2: Prefix + Suffix (e.g., "Marketing Department", "Executive Team")
      for (const suffix of suffixes) {
        const suffixLower = suffix.toLowerCase();
        if (text.endsWith(suffixLower)) {
          // Extract prefix (everything before the suffix)
          const prefix = text.substring(0, text.length - suffixLower.length).trim();

          // Check if prefix matches any known department prefix
          if (prefixes.some((p) => p.toLowerCase() === prefix)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if candidate matches a company name from nearby email domain
   * @private
   */
  _matchesNearbyEmailDomain(text, candidate, start, end) {
    const windowSize = APP_CONFIG.properNounDetection?.nearbyPIIWindowSize || 50;
    const windowStart = Math.max(0, start - windowSize);
    const windowEnd = Math.min(text.length, end + windowSize);
    const windowText = text.substring(windowStart, windowEnd);

    // Extract emails from nearby text
    const emails = this.patternMatcher.matchType(windowText, 'email');
    if (emails.length === 0) return false;

    // Extract domain names from emails (without TLD)
    // e.g., john@acme.com -> "acme"
    const domains = emails
      .map((e) => {
        // PatternMatcher returns { value, index, type, length }
        const emailText = e.value || e.original;
        if (!emailText) return null;
        const match = emailText.match(/@([^.]+)\./);
        return match ? match[1].toLowerCase() : null;
      })
      .filter((d) => d !== null);

    // Check if candidate matches any domain name
    const candidateNormalized = candidate
      .toLowerCase()
      .replace(/\s+(inc|corp|llc|ltd|limited|company|co\.|corporation|gmbh|sa|plc|ag)$/i, '')
      .trim();

    return domains.some((domain) => candidateNormalized === domain);
  }

  /**
   * Check if candidate is a known location in the gazetteer
   * @private
   */
  _isKnownLocation(candidate) {
    if (!this.patternMatcher || !this.patternMatcher.locationGazetteer) {
      return false;
    }
    const normalized = candidate.toLowerCase().trim();
    return this.patternMatcher.locationGazetteer.has(normalized);
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

    // Signal 3: Honorific, Job Title, or Company Suffix
    if (context.hasHonorific || context.hasJobTitle || context.hasCompanySuffix) {
      breakdown.hasHonorificOrSuffix = weights.hasHonorificOrSuffix || 0.4;
      let detail = [];
      if (context.hasHonorific) detail.push('honorific');
      if (context.hasJobTitle) detail.push('job_title');
      if (context.hasCompanySuffix) detail.push('company_suffix');
      breakdown.hasHonorificOrSuffix_detail = detail.join('+');
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
      breakdown.nearOtherPII = weights.nearOtherPII || 0.25;
      score += breakdown.nearOtherPII;
    }

    // Signal 7: Matches email domain
    if (context.emailDomainMatch) {
      breakdown.matchesEmailDomain = weights.matchesEmailDomain || 0.3;
      breakdown.matchesEmailDomain_detail = 'company_from_email';
      score += breakdown.matchesEmailDomain;
    }

    // Signal 8: Inside link (author bylines, profile links)
    if (context.insideLink) {
      breakdown.insideLink = weights.insideLink || 0.25;
      breakdown.insideLink_detail = 'text_in_link';
      score += breakdown.insideLink;
    }

    // Signal 9: Known location (New York, Paris, Delaware, etc.)
    if (context.isKnownLocation) {
      breakdown.knownLocation = weights.knownLocation || 0.5;
      breakdown.knownLocation_detail = 'location_gazetteer';
      score += breakdown.knownLocation;
    }

    // Penalty: Department name (strong negative signal)
    if (context.isDepartmentName) {
      breakdown.isDepartmentName = -0.9;
      breakdown.isDepartmentName_detail = 'generic_department';
      score += breakdown.isDepartmentName;
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
      .replace(/^(?:Mr|Mrs|Ms|Dr|Prof)\b\.?\s+/i, '')
      .replace(
        /^(?:CEO|CTO|CFO|VP|SVP|EVP|President|Director|Manager|Chief|Senior|Junior|Lead)\b\.?\s+/i,
        ''
      )
      .replace(
        /\s+(Inc|Corp|LLC|Ltd|Limited|Company|Co\.|Corporation|GmbH|SA|PLC|AG|Group|Partners|Associates|Ventures|Technologies|Tech|Systems|Solutions|Consulting|Services|International|Intl\.)$/i,
        ''
      );

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
    if (entities.length === 0) return [];

    const priorities = APP_CONFIG.properNounDetection?.typePriorities || {};

    // Group entities by their text node
    // This ensures we only compare overlaps within the same text node
    const byNode = new Map();
    for (const entity of entities) {
      const nodeKey = entity.node || 'unknown';
      if (!byNode.has(nodeKey)) {
        byNode.set(nodeKey, []);
      }
      byNode.get(nodeKey).push(entity);
    }

    // Deduplicate within each text node separately
    const allDeduplicated = [];
    for (const nodeEntities of byNode.values()) {
      // Sort by position first, then by priority (high to low)
      const sorted = [...nodeEntities].sort((a, b) => {
        if (a.start !== b.start) {
          return a.start - b.start;
        }
        // If same start position, prioritize by type
        const priorityA = priorities[a.type] || 0;
        const priorityB = priorities[b.type] || 0;
        return priorityB - priorityA; // Higher priority first
      });

      let lastEnd = -1;

      for (const entity of sorted) {
        if (entity.start >= lastEnd) {
          // No overlap, add it
          allDeduplicated.push(entity);
          lastEnd = entity.end;
        } else {
          // Overlap detected - decide which to keep
          const lastEntity = allDeduplicated[allDeduplicated.length - 1];

          const priorityNew = priorities[entity.type] || 0;
          const priorityLast = priorities[lastEntity.type] || 0;

          if (priorityNew > priorityLast) {
            // Replace with higher priority type
            allDeduplicated[allDeduplicated.length - 1] = entity;
            lastEnd = entity.end;
          } else if (priorityNew === priorityLast) {
            // Same priority - use confidence as tiebreaker
            if (entity.confidence > lastEntity.confidence) {
              allDeduplicated[allDeduplicated.length - 1] = entity;
              lastEnd = entity.end;
            } else if (entity.confidence === lastEntity.confidence) {
              // Same confidence - use length (longer match wins)
              const lengthNew = entity.end - entity.start;
              const lengthLast = lastEntity.end - lastEntity.start;
              if (lengthNew > lengthLast) {
                allDeduplicated[allDeduplicated.length - 1] = entity;
                lastEnd = entity.end;
              }
            }
          }
          // Otherwise keep existing entity (has higher priority/confidence/length)
        }
      }
    }

    return allDeduplicated;
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
