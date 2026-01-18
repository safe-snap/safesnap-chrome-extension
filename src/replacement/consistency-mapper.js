/**
 * Consistency Mapper Module
 *
 * Manages consistent PII replacements across a page session.
 * Ensures the same entity always gets the same replacement value.
 */

export class ConsistencyMapper {
  constructor() {
    // Map structure: "type:normalized_original" -> replacement
    this.map = new Map();

    // Track related entities (e.g., company name and domain)
    this.relatedEntities = new Map();
  }

  /**
   * Generate a normalized key for the entity
   * @param {string} type - PII type
   * @param {string} original - Original value
   * @returns {string} Normalized key for mapping
   */
  _normalizeKey(type, original) {
    // Case-insensitive, trimmed
    const normalized = original.toLowerCase().trim();
    return `${type}:${normalized}`;
  }

  /**
   * Check if an entity has a cached replacement
   * @param {string} type - PII type
   * @param {string} original - Original value
   * @returns {boolean} True if replacement exists
   */
  has(type, original) {
    const key = this._normalizeKey(type, original);
    return this.map.has(key);
  }

  /**
   * Get the cached replacement for an entity
   * @param {string} type - PII type
   * @param {string} original - Original value
   * @returns {string|null} Cached replacement or null
   */
  get(type, original) {
    const key = this._normalizeKey(type, original);
    return this.map.get(key) || null;
  }

  /**
   * Store a replacement for an entity
   * @param {string} type - PII type
   * @param {string} original - Original value
   * @param {string} replacement - Replacement value
   */
  set(type, original, replacement) {
    const key = this._normalizeKey(type, original);
    this.map.set(key, replacement);
  }

  /**
   * Link related entities (e.g., "Acme Corp" and "acme.com")
   * @param {string} primaryType - Type of primary entity
   * @param {string} primaryOriginal - Original primary value
   * @param {string} relatedType - Type of related entity
   * @param {string} relatedOriginal - Original related value
   */
  linkRelated(primaryType, primaryOriginal, relatedType, relatedOriginal) {
    const primaryKey = this._normalizeKey(primaryType, primaryOriginal);
    const relatedKey = this._normalizeKey(relatedType, relatedOriginal);

    // Store bidirectional relationship
    if (!this.relatedEntities.has(primaryKey)) {
      this.relatedEntities.set(primaryKey, new Set());
    }
    if (!this.relatedEntities.has(relatedKey)) {
      this.relatedEntities.set(relatedKey, new Set());
    }

    this.relatedEntities.get(primaryKey).add(relatedKey);
    this.relatedEntities.get(relatedKey).add(primaryKey);
  }

  /**
   * Get all related entities for a given entity
   * @param {string} type - PII type
   * @param {string} original - Original value
   * @returns {Array} Array of related keys
   */
  getRelated(type, original) {
    const key = this._normalizeKey(type, original);
    return this.relatedEntities.has(key) ? Array.from(this.relatedEntities.get(key)) : [];
  }

  /**
   * Ensure related entities use consistent replacements
   * For example, if "Acme Corp" -> "TechFlow Inc", then "acme.com" -> "techflow.com"
   * @param {string} type - PII type
   * @param {string} original - Original value
   * @param {string} replacement - Replacement value
   */
  propagateToRelated(type, original, replacement) {
    const related = this.getRelated(type, original);

    for (const relatedKey of related) {
      // Extract type from the related key
      const [relatedType] = relatedKey.split(':', 2);

      // Generate consistent replacement based on the primary replacement
      let consistentReplacement = replacement;

      // Handle specific type transformations
      if (type === 'properNoun' && relatedType === 'url') {
        // Extract domain from company name
        // "TechFlow Inc" -> "techflow.com"
        const domainBase = replacement
          .toLowerCase()
          .replace(/\s+(inc|corp|llc|ltd|limited|company|co\.?|corporation).*/i, '')
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '');
        consistentReplacement = `${domainBase}.com`;
      } else if (type === 'url' && relatedType === 'properNoun') {
        // Extract company name from domain
        // "techflow.com" -> "TechFlow"
        const companyName = replacement
          .replace(/^(https?:\/\/)?(www\.)?/, '')
          .replace(/\..+$/, '')
          .replace(/-/g, ' ')
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        consistentReplacement = companyName;
      } else if (type === 'email' && relatedType === 'properNoun') {
        // Extract name from email
        // "john.doe@example.com" -> "John Doe"
        const emailName = replacement.split('@')[0];
        consistentReplacement = emailName
          .split(/[._]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } else if (type === 'properNoun' && relatedType === 'email') {
        // Generate email from person name
        // "John Doe" -> "john.doe@example.com"
        const parts = replacement.toLowerCase().split(' ');
        consistentReplacement = `${parts.join('.')}@example.com`;
      }

      // Store the consistent replacement
      this.map.set(relatedKey, consistentReplacement);
    }
  }

  /**
   * Clear all mappings (e.g., when navigating to a new page)
   */
  clear() {
    this.map.clear();
    this.relatedEntities.clear();
  }

  /**
   * Get the number of cached mappings
   * @returns {number} Number of mappings
   */
  size() {
    return this.map.size;
  }

  /**
   * Export mappings for debugging or persistence
   * @returns {Object} Serializable mapping data
   */
  export() {
    return {
      mappings: Array.from(this.map.entries()),
      relations: Array.from(this.relatedEntities.entries()).map(([key, values]) => [
        key,
        Array.from(values),
      ]),
    };
  }

  /**
   * Import mappings from exported data
   * @param {Object} data - Exported mapping data
   */
  import(data) {
    this.clear();

    if (data.mappings) {
      this.map = new Map(data.mappings);
    }

    if (data.relations) {
      this.relatedEntities = new Map(data.relations.map(([key, values]) => [key, new Set(values)]));
    }
  }

  /**
   * Auto-detect and link related entities based on similarity
   * @param {Array} piiEntities - Array of detected PII entities
   */
  autoLinkRelated(piiEntities) {
    // Filter out entities without 'original' property
    const validEntities = piiEntities.filter(
      (e) => e && e.original && typeof e.original === 'string'
    );

    // Group entities by potential relationships
    const companies = validEntities.filter(
      (e) => e.type === 'properNoun' && this._looksLikeCompany(e.original)
    );
    const urls = validEntities.filter((e) => e.type === 'url');
    const emails = validEntities.filter((e) => e.type === 'email');
    const names = validEntities.filter(
      (e) => e.type === 'properNoun' && !this._looksLikeCompany(e.original)
    );

    // Link companies with their URLs
    for (const company of companies) {
      const companyBase = this._extractCompanyBase(company.original);
      for (const url of urls) {
        const urlBase = this._extractDomainBase(url.original);
        if (this._areSimilar(companyBase, urlBase)) {
          this.linkRelated('properNoun', company.original, 'url', url.original);
        }
      }
    }

    // Link names with their emails
    for (const name of names) {
      const nameParts = name.original.toLowerCase().split(/\s+/);
      for (const email of emails) {
        const emailLocal = email.original.split('@')[0].toLowerCase();
        // Check if email contains name parts
        if (nameParts.some((part) => emailLocal.includes(part))) {
          this.linkRelated('properNoun', name.original, 'email', email.original);
        }
      }
    }
  }

  /**
   * Check if a string looks like a company name
   * @private
   */
  _looksLikeCompany(text) {
    return /\b(Inc|Corp|LLC|Ltd|Limited|Company|Co\.|Corporation|Group|Partners|Associates)\b/i.test(
      text
    );
  }

  /**
   * Extract base company name (remove Inc, Corp, etc.)
   * @private
   */
  _extractCompanyBase(company) {
    return company
      .toLowerCase()
      .replace(
        /\s+(inc|corp|llc|ltd|limited|company|co\.?|corporation|group|partners|associates).*/i,
        ''
      )
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Extract base domain name (remove TLD)
   * @private
   */
  _extractDomainBase(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname
        .replace(/^www\./, '')
        .replace(/\..+$/, '')
        .replace(/[^a-z0-9]/g, '');
    } catch (e) {
      return url
        .replace(/^(https?:\/\/)?(www\.)?/, '')
        .replace(/\..+$/, '')
        .replace(/[^a-z0-9]/g, '');
    }
  }

  /**
   * Check if two strings are similar (for linking)
   * @private
   */
  _areSimilar(str1, str2) {
    // Simple similarity check - could be enhanced with Levenshtein distance
    if (str1 === str2) return true;
    if (str1.includes(str2) || str2.includes(str1)) return true;

    // Check if they share significant overlap (>70% of shorter string)
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length >= str2.length ? str1 : str2;
    const overlap = this._getOverlap(shorter, longer);
    return overlap / shorter.length > 0.7;
  }

  /**
   * Get character overlap between two strings
   * @private
   */
  _getOverlap(shorter, longer) {
    let overlap = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter.charAt(i))) {
        overlap++;
      }
    }
    return overlap;
  }
}
