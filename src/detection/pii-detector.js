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

    if (types.includes('locations') || types.includes('location')) {
      const locations = this.patternMatcher.findLocations(text);
      entities.push(
        ...locations.map((match) => ({
          type: 'location',
          original: match.value,
          start: match.start,
          end: match.end,
          confidence: match.matchType === 'gazetteer' ? 0.95 : 0.9, // High confidence for locations
          metadata: { matchType: match.matchType }, // 'pattern' or 'gazetteer'
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

      // Process locations if enabled
      if (types.includes('locations') || types.includes('location')) {
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

      const context = {
        hasHonorific,
        hasJobTitle,
        hasCompanySuffix: hasCompanySuffix || hasTechSuffix,
        wordCount,
        isSentenceStart,
        nearPII,
        isDepartmentName,
        emailDomainMatch,
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
      // Note: Not skipping 'a' tags - author names in links are legitimate PII
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
      // Note: Not skipping 'a' tags - author names in links are legitimate PII
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
   * Get dictionary statistics
   * @returns {Object} Dictionary stats
   */
  getDictionaryStats() {
    return this.dictionary.getStats();
  }
}
