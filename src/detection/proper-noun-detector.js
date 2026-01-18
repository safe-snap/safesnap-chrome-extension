/**
 * Proper Noun Detector Module
 *
 * Detects proper nouns (names, companies, brands) using:
 * - Capitalization patterns
 * - Dictionary lookup (common word filtering)
 * - Adjective filtering (nationality adjectives, common adjectives)
 * - Context signals (honorifics, job titles, company suffixes)
 * - Proximity to other PII
 * - Location gazetteer
 */

import { APP_CONFIG } from '../../config/app-config.js';

export class ProperNounDetector {
  constructor(dictionary, patternMatcher) {
    this.dictionary = dictionary;
    this.patternMatcher = patternMatcher;
    this.threshold = APP_CONFIG.properNounDetection?.minimumScore || 0.75;
    this.pageContext = null; // Cache for page-wide context

    // Common adjective suffixes (English grammar patterns)
    // These endings are almost never proper nouns
    // Note: Some nationality adjectives (e.g., French, Dutch, Greek) may not match
    // these patterns and will be detected as proper nouns. This is acceptable to
    // avoid maintaining hardcoded lists.
    this.adjectiveSuffixes = [
      'able',
      'ible', // capable, visible
      'al', // national, regional
      'ful', // beautiful, useful
      'ic', // historic, economic
      'ical', // historical, economical
      'ive', // active, creative
      'less', // endless, helpless
      'ous',
      'ious', // famous, serious
      'ish', // British, Finnish, foolish
      'ese', // Chinese, Japanese, Portuguese
      'an',
      'ian', // American, Canadian, Italian
      'ern', // Northern, Southern, Western, Eastern
      'ly', // friendly, likely (also adverbs)
    ];
  }

  /**
   * Build page-wide context by analyzing all links and PII on the page
   * This allows us to boost confidence for words that appear in authoritative contexts
   * @private
   */
  _buildPageContext() {
    if (this.pageContext) {
      return this.pageContext; // Return cached context
    }

    const context = {
      wordsInLinks: new Set(), // Words that appear in hyperlinks
      wordsNearPII: new Set(), // Words that appear near emails/phones
      wordsInHeadersFooters: new Set(), // Words in headers/footers (likely UI/nav)
    };

    // Extract all text from hyperlinks
    const links = document.querySelectorAll('a');
    links.forEach((link) => {
      const text = link.textContent || '';
      // Match capitalized words in link text
      const words = text.match(/[A-Z][a-z]+(?:[''-][A-Z]?[a-z]+)?/g);
      if (words) {
        words.forEach((word) => context.wordsInLinks.add(word));
      }
    });

    // Extract all text from header and footer elements
    // These typically contain navigation, branding, copyright, legal links - unlikely to be PII
    const headerFooters = document.querySelectorAll(
      'header, footer, [role="banner"], [role="contentinfo"], [role="navigation"], ' +
        'nav, .header, .footer, #header, #footer, .site-header, .site-footer, ' +
        '.nav, .navbar, .navigation, [class*="header"], [class*="footer"]'
    );
    headerFooters.forEach((element) => {
      const text = element.textContent || '';
      // Match capitalized words
      const words = text.match(/[A-Z][a-z]+(?:[''-][A-Z]?[a-z]+)?/g);
      if (words) {
        words.forEach((word) => context.wordsInHeadersFooters.add(word));
      }
    });

    this.pageContext = context;
    console.log(
      `[ProperNounDetector] Page context built: ${context.wordsInLinks.size} words in links, ${context.wordsInHeadersFooters.size} words in headers/footers`
    );
    return context;
  }

  /**
   * Clear cached page context (call when page changes)
   */
  clearPageContext() {
    this.pageContext = null;
  }

  /**
   * Set the detection threshold
   * @param {number} threshold - New threshold (0.0-1.0)
   */
  setThreshold(threshold) {
    this.threshold = threshold;
  }

  /**
   * Detect proper nouns in text
   * @param {string} text - Text to analyze
   * @param {Node} node - Optional DOM node for additional context
   * @returns {Array<Object>} Detected proper nouns above threshold
   */
  detect(text, node = null) {
    const candidates = this.detectAllCandidates(text, node);
    return candidates.filter((candidate) => candidate.confidence >= this.threshold);
  }

  /**
   * Detect ALL proper noun candidates (including below threshold)
   * Used for debug mode visualization
   * @param {string} text - Text to analyze
   * @param {Node} node - Optional DOM node for additional context
   * @returns {Array<Object>} All candidates with scores
   */
  detectAllCandidates(text, node = null) {
    const candidates = [];

    // Build page-wide context (cached after first call)
    const pageContext = this._buildPageContext();

    // ATOMIC DETECTION: Match single capitalized words only
    // This allows "Jim Glab" to be detected as "Jim" + "Glab" separately
    // Benefits: consistent replacement, no cross-node entities, phrases benefit automatically
    const capitalizedPattern = /(?<![a-zA-Z'])[A-Z][a-z]+(?:[''-][A-Z]?[a-z]+)?(?![a-zA-Z'])/g;

    let match;
    while ((match = capitalizedPattern.exec(text)) !== null) {
      const candidate = match[0];
      const start = match.index;
      const end = start + candidate.length;

      // Skip common prepositions and articles
      const skipWords = [
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
        'The',
        'A',
        'An',
        'Meet',
        'See',
        'Contact',
        'Call',
        'Visit',
        'Email',
        'Ask',
      ];
      if (skipWords.includes(candidate)) {
        continue;
      }

      // Check for honorifics/titles in PRECEDING text (not part of match anymore)
      const precedingText = text.substring(Math.max(0, start - 10), start);
      const hasHonorific = /(?:Mr|Mrs|Ms|Dr|Prof)\.?\s*$/.test(precedingText);
      const hasJobTitle = /(?:CEO|CTO|CFO|VP|SVP|EVP)\s*$/.test(precedingText);

      // Position context
      const beforeChar = start > 0 ? text[start - 1] : '';
      const twoBeforeChar = start > 1 ? text[start - 2] : '';
      const isSentenceStart =
        start === 0 ||
        beforeChar === '.' ||
        beforeChar === '!' ||
        beforeChar === '?' ||
        (beforeChar === ' ' &&
          (twoBeforeChar === '.' || twoBeforeChar === '!' || twoBeforeChar === '?'));

      // Additional context
      const nearPII = this._hasNearbyPII(text, start, end);
      const emailDomainMatch = this._matchesNearbyEmailDomain(text, candidate, start, end);
      const insideLink = node && node.parentElement && node.parentElement.tagName === 'A';
      const isKnownLocation = this._isKnownLocation(candidate);

      // PAGE-WIDE CONTEXT: Check if this word appears in links anywhere on page
      const appearsInPageLinks = pageContext.wordsInLinks.has(candidate);

      // PAGE-WIDE CONTEXT: Check if word appears in header/footer (negative signal)
      const appearsInHeaderFooter = pageContext.wordsInHeadersFooters.has(candidate);

      const context = {
        hasHonorific,
        hasJobTitle,
        wordCount: 1, // Always 1 for atomic detection
        isSentenceStart,
        nearPII,
        emailDomainMatch,
        insideLink,
        isKnownLocation,
        appearsInPageLinks, // page-wide signal (positive)
        appearsInHeaderFooter, // page-wide signal (negative)
      };

      const { score, breakdown } = this._calculateScore(candidate, context);

      // Determine entity type
      let entityContext = 'unknown';
      if (hasHonorific || hasJobTitle) {
        entityContext = 'person';
      } else {
        // Single word - could be person or company
        entityContext = 'company_or_person';
      }

      candidates.push({
        type: 'properNoun',
        original: candidate,
        start,
        end,
        confidence: score,
        context: entityContext,
        scoreBreakdown: breakdown,
        willBeProtected: score >= this.threshold,
        threshold: this.threshold,
      });
    }

    return candidates;
  }

  /**
   * Check if nearby PII exists within window
   * @private
   */
  _hasNearbyPII(text, start, end) {
    const windowSizeConfig = APP_CONFIG.properNounDetection?.nearbyPIIWindowSize;
    const windowSize =
      typeof windowSizeConfig === 'object' ? windowSizeConfig.default : windowSizeConfig || 50;

    const windowStart = Math.max(0, start - windowSize);
    const windowEnd = Math.min(text.length, end + windowSize);
    const windowText = text.substring(windowStart, windowEnd);

    const emails = this.patternMatcher.matchType(windowText, 'email');
    const phones = this.patternMatcher.matchType(windowText, 'phone');

    return emails.length > 0 || phones.length > 0;
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

    const emails = this.patternMatcher.matchType(windowText, 'email');
    if (emails.length === 0) return false;

    const domains = emails
      .map((e) => {
        const emailText = e.value || e.original;
        if (!emailText) return null;
        const match = emailText.match(/@([^.]+)\./);
        return match ? match[1].toLowerCase() : null;
      })
      .filter((d) => d !== null);

    const candidateNormalized = candidate
      .toLowerCase()
      .replace(/\s+(inc|corp|llc|ltd|limited|company|co\.|corporation|gmbh|sa|plc|ag)$/i, '')
      .trim();

    return domains.some((domain) => candidateNormalized === domain);
  }

  /**
   * Check if candidate is a known location
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
  _calculateScore(candidate, context) {
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

    // Signal 3: Honorific or Job Title (preceding)
    if (context.hasHonorific || context.hasJobTitle) {
      breakdown.hasHonorificOrSuffix = weights.hasHonorificOrSuffix || 0.4;
      let detail = [];
      if (context.hasHonorific) detail.push('honorific');
      if (context.hasJobTitle) detail.push('job_title');
      breakdown.hasHonorificOrSuffix_detail = detail.join('+');
      score += breakdown.hasHonorificOrSuffix;
    }

    // Signal 4: Not sentence start (removed multi-word bonus for atomic detection)
    if (!context.isSentenceStart) {
      breakdown.notSentenceStart = weights.notSentenceStart || 0.1;
      score += breakdown.notSentenceStart;
    }

    // Signal 5: Near PII
    if (context.nearPII) {
      breakdown.nearOtherPII = weights.nearOtherPII || 0.25;
      score += breakdown.nearOtherPII;
    }

    // Signal 6: Matches email domain
    if (context.emailDomainMatch) {
      breakdown.matchesEmailDomain = weights.matchesEmailDomain || 0.3;
      breakdown.matchesEmailDomain_detail = 'company_from_email';
      score += breakdown.matchesEmailDomain;
    }

    // Signal 7: Inside link
    if (context.insideLink) {
      breakdown.insideLink = weights.insideLink || 0.25;
      breakdown.insideLink_detail = 'text_in_link';
      score += breakdown.insideLink;
    }

    // Signal 8: Known location
    if (context.isKnownLocation) {
      breakdown.knownLocation = weights.knownLocation || 0.5;
      breakdown.knownLocation_detail = 'location_gazetteer';
      score += breakdown.knownLocation;
    }

    // Signal 9: Appears in page links (PAGE-WIDE CONTEXT)
    // If "Jim" appears in a link anywhere on the page, ALL instances get boosted
    if (context.appearsInPageLinks) {
      breakdown.appearsInPageLinks = weights.appearsInPageLinks || 0.3;
      breakdown.appearsInPageLinks_detail = 'word_in_page_links';
      score += breakdown.appearsInPageLinks;
    }

    // Signal 10: Appears in header/footer (PAGE-WIDE CONTEXT - NEGATIVE)
    // If word appears in header/footer elements, it's likely UI/navigation text, not PII
    if (context.appearsInHeaderFooter) {
      breakdown.appearsInHeaderFooter = weights.appearsInHeaderFooter || -0.5;
      breakdown.appearsInHeaderFooter_detail = 'word_in_header_footer';
      score += breakdown.appearsInHeaderFooter; // Negative weight reduces score
    }

    // Signal 11: POS Tagging - Filter adjectives, verbs, adverbs (NEGATIVE)
    // These are unlikely to be proper nouns (person/company names)
    const isAdj = this._isAdjective(candidate);
    const isVerb = this._isVerb(candidate);
    const isAdverb = this._isAdverb(candidate);

    if (isAdj || isVerb || isAdverb) {
      breakdown.nonNounPOS = weights.nonNounPOS || -0.5;
      const posTypes = [];
      if (isAdj) posTypes.push('adjective');
      if (isVerb) posTypes.push('verb');
      if (isAdverb) posTypes.push('adverb');
      breakdown.nonNounPOS_detail = posTypes.join('+');
      score += breakdown.nonNounPOS; // Strong negative weight
    }

    score = Math.min(score, 1.0);
    score = Math.max(score, 0.0); // Ensure score doesn't go negative

    return { score, breakdown };
  }

  /**
   * Calculate ratio of unknown words (not in dictionary)
   * For atomic detection, candidate is always a single word
   * @private
   */
  _calculateUnknownWordRatio(candidate) {
    // Fallback if dictionary not initialized
    if (!this.dictionary) {
      return 0.5;
    }

    // For single word, return 1.0 if unknown, 0.0 if known
    return this.dictionary.isCommonWord(candidate.toLowerCase()) ? 0.0 : 1.0;
  }

  /**
   * Check if a word is an adjective using suffix patterns and curated lists
   * @private
   * @param {string} word - Word to check
   * @returns {boolean} True if word is an adjective
   */
  _isAdjective(word) {
    const normalized = word.toLowerCase();

    // Check if word ends with common adjective suffixes
    // Require minimum length to avoid false positives
    if (normalized.length >= 4) {
      for (const suffix of this.adjectiveSuffixes) {
        if (normalized.endsWith(suffix)) {
          // Minimum word length requirements based on suffix
          // This prevents names like "Ian", "Stan", "Jordan" from matching
          const minLength =
            {
              an: 7, // American, Canadian, Italian (not Ian, Stan, Jordan)
              ian: 7, // Italian, Canadian (not Adrian)
              al: 6, // National, Regional (not Al)
              ic: 6, // Historic, Economic (not Eric)
              ish: 6, // British, Finnish (not Dish)
              ese: 6, // Chinese, Japanese (not These)
              ern: 6, // Northern, Southern (not Fern)
            }[suffix] || 4; // Default: 4 characters minimum

          if (normalized.length >= minLength) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if a word is a verb (placeholder for future expansion)
   * @private
   * @param {string} _word - Word to check (unused, prefix with _ to indicate intentionally unused)
   * @returns {boolean} True if word is a verb
   */
  _isVerb(_word) {
    // Could add verb list here if needed
    // For now, verbs are less of a false positive issue than adjectives
    return false;
  }

  /**
   * Check if a word is an adverb (placeholder for future expansion)
   * @private
   * @param {string} _word - Word to check (unused, prefix with _ to indicate intentionally unused)
   * @returns {boolean} True if word is an adverb
   */
  _isAdverb(_word) {
    // Could add adverb list here if needed
    // Most adverbs end in -ly and are already filtered by dictionary
    return false;
  }
}
