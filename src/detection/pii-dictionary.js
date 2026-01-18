/**
 * PII Dictionary Module
 *
 * Phase 3 & 4 of PII detection pipeline:
 * - Build dictionary: Create authoritative map of unique PII entities
 * - Refine dictionary: Remove overlaps, apply thresholds, link related entities
 *
 * The dictionary is the single source of truth for all PII on the page.
 * Each unique PII text gets ONE entity, with multiple occurrences tracked.
 */

import { APP_CONFIG } from '../../config/app-config.js';

/**
 * Represents a single PII entity in the dictionary
 */
class PIIEntity {
  constructor(id, type, original, confidence, threshold, context) {
    this.id = id; // "pii-123"
    this.type = type; // "email", "properNoun", etc.
    this.original = original; // "Jim Glab"
    this.confidence = confidence; // 0-1
    this.threshold = threshold; // Type-specific threshold
    this.context = context || {}; // Additional context from detection
    this.occurrences = []; // [{ start, end, segments }]
    this.linkedTo = []; // [entityId] - related entities
  }

  /**
   * Add an occurrence of this entity
   */
  addOccurrence(start, end, segments) {
    this.occurrences.push({ start, end, segments });
  }

  /**
   * Check if this entity meets its confidence threshold
   */
  meetsThreshold() {
    return this.confidence >= this.threshold;
  }
}

/**
 * Dictionary of all unique PII entities on a page
 */
export class PIIDictionary {
  constructor() {
    this.entities = new Map(); // entityId → PIIEntity
    this.idCounter = 0;
    this.typePriorities = this._loadTypePriorities();
  }

  /**
   * Phase 3: Build dictionary from candidates
   * @param {Array} candidates - Raw PII candidates from detection
   * @param {TextMap} textMap - Text map from Phase 1
   * @returns {PIIDictionary} this (for chaining)
   */
  buildFrom(candidates, textMap) {
    console.log(
      '[PIIDictionary] Phase 3: Building dictionary from',
      candidates.length,
      'candidates'
    );

    // Group candidates by their text content
    const grouped = this._groupByText(candidates);
    console.log(`[PIIDictionary] Grouped into ${grouped.size} unique texts`);

    // For each unique text, resolve conflicts and create entity
    for (const candidateGroup of grouped.values()) {
      const entity = this._resolveConflicts(candidateGroup, textMap);
      if (entity) {
        this.entities.set(entity.id, entity);
      }
    }

    console.log(`[PIIDictionary] Dictionary built with ${this.entities.size} entities`);
    return this;
  }

  /**
   * Phase 4: Refine dictionary
   * - Remove overlapping entities (priority-based)
   * - Apply confidence thresholds
   * - Link related entities
   * @returns {PIIDictionary} this (for chaining)
   */
  refine() {
    console.log('[PIIDictionary] Phase 4: Refining dictionary');

    const beforeCount = this.entities.size;

    // Step 1: Remove overlapping entities
    this._removeOverlaps();
    console.log(`[PIIDictionary] After overlap removal: ${this.entities.size} entities`);

    // Step 2: Apply confidence thresholds
    this._filterByConfidence();
    console.log(`[PIIDictionary] After confidence filter: ${this.entities.size} entities`);

    // Step 3: Link related entities (for consistent replacements)
    this._linkRelatedEntities();

    console.log(
      `[PIIDictionary] Refinement complete: ${beforeCount} → ${this.entities.size} entities`
    );
    return this;
  }

  /**
   * Group candidates by text content
   * @private
   */
  _groupByText(candidates) {
    const groups = new Map();

    for (const candidate of candidates) {
      const key = candidate.original;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(candidate);
    }

    return groups;
  }

  /**
   * Resolve conflicts when multiple candidates have same text
   * Strategy: Prefer longer text, higher priority type, higher confidence
   * @private
   */
  _resolveConflicts(candidateGroup, textMap) {
    // Sort by:
    // 1. Text length (longer wins - "United Airlines" > "United")
    // 2. Type priority (email > properNoun)
    // 3. Confidence
    const sorted = candidateGroup.sort((a, b) => {
      // Length comparison
      if (a.original.length !== b.original.length) {
        return b.original.length - a.original.length;
      }

      // Type priority comparison
      const priorityA = this._getTypePriority(a.type);
      const priorityB = this._getTypePriority(b.type);
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // Confidence comparison
      return (b.rawConfidence || b.confidence || 0) - (a.rawConfidence || a.confidence || 0);
    });

    // Use the highest-priority candidate as the primary
    return this._createEntity(sorted[0], candidateGroup, textMap);
  }

  /**
   * Create a PIIEntity from a candidate
   * @private
   */
  _createEntity(primaryCandidate, allCandidates, textMap) {
    const entityId = `pii-${++this.idCounter}`;
    const confidence = primaryCandidate.rawConfidence || primaryCandidate.confidence || 1.0;
    const threshold = this._getThresholdForType(primaryCandidate.type);

    const entity = new PIIEntity(
      entityId,
      primaryCandidate.type,
      primaryCandidate.original,
      confidence,
      threshold,
      primaryCandidate.context
    );

    // Add all occurrences (from all candidates with this text)
    for (const candidate of allCandidates) {
      const segments = textMap.findSegmentsForRange(candidate.start, candidate.end);
      entity.addOccurrence(candidate.start, candidate.end, segments);
    }

    return entity;
  }

  /**
   * Remove overlapping entities based on type priority
   * @private
   */
  _removeOverlaps() {
    // Collect all occurrences from all entities
    const occurrences = [];
    for (const entity of this.entities.values()) {
      for (const occ of entity.occurrences) {
        occurrences.push({ entity, occurrence: occ });
      }
    }

    // Sort by position
    occurrences.sort((a, b) => a.occurrence.start - b.occurrence.start);

    // Find overlaps and mark lower-priority entities for removal
    const toRemove = new Set();

    for (let i = 0; i < occurrences.length; i++) {
      const a = occurrences[i];

      // Skip if already marked for removal
      if (toRemove.has(a.entity.id)) continue;

      for (let j = i + 1; j < occurrences.length; j++) {
        const b = occurrences[j];

        // Skip if already marked for removal
        if (toRemove.has(b.entity.id)) continue;

        // Check if they overlap
        if (this._overlaps(a.occurrence, b.occurrence)) {
          const priorityA = this._getTypePriority(a.entity.type);
          const priorityB = this._getTypePriority(b.entity.type);

          if (priorityA > priorityB) {
            console.log(
              `[PIIDictionary] Overlap: "${a.entity.original}" (${a.entity.type}, priority ${priorityA}) wins over "${b.entity.original}" (${b.entity.type}, priority ${priorityB})`
            );
            toRemove.add(b.entity.id);
          } else if (priorityB > priorityA) {
            console.log(
              `[PIIDictionary] Overlap: "${b.entity.original}" (${b.entity.type}, priority ${priorityB}) wins over "${a.entity.original}" (${a.entity.type}, priority ${priorityA})`
            );
            toRemove.add(a.entity.id);
            break; // a is removed, move to next i
          } else {
            // Same priority - prefer longer text
            const lengthA = a.entity.original.length;
            const lengthB = b.entity.original.length;

            if (lengthA > lengthB) {
              console.log(
                `[PIIDictionary] Overlap (same priority): "${a.entity.original}" (${lengthA} chars) wins over "${b.entity.original}" (${lengthB} chars)`
              );
              toRemove.add(b.entity.id);
            } else if (lengthB > lengthA) {
              console.log(
                `[PIIDictionary] Overlap (same priority): "${b.entity.original}" (${lengthB} chars) wins over "${a.entity.original}" (${lengthA} chars)`
              );
              toRemove.add(a.entity.id);
              break; // a is removed, move to next i
            }
            // If same length too, keep both (very rare edge case)
          }
        } else if (b.occurrence.start >= a.occurrence.end) {
          // No more possible overlaps with a
          break;
        }
      }
    }

    // Remove losing entities
    for (const entityId of toRemove) {
      this.entities.delete(entityId);
    }
  }

  /**
   * Check if two occurrences overlap
   * @private
   */
  _overlaps(occ1, occ2) {
    return !(occ1.end <= occ2.start || occ2.end <= occ1.start);
  }

  /**
   * Filter out entities below their confidence threshold
   * @private
   */
  _filterByConfidence() {
    const belowThreshold = [];

    for (const [id, entity] of this.entities.entries()) {
      if (!entity.meetsThreshold()) {
        belowThreshold.push(id);
        console.log(
          `[PIIDictionary] Filtering out "${entity.original}" (${entity.type}): confidence ${entity.confidence.toFixed(2)} < threshold ${entity.threshold}`
        );
      }
    }

    for (const id of belowThreshold) {
      this.entities.delete(id);
    }
  }

  /**
   * Link related entities for consistent replacement
   * Example: "Jim Glab" and "jglab@example.com" should use related fake data
   * @private
   */
  _linkRelatedEntities() {
    // For now, this is a placeholder
    // Future enhancement: find names near emails and link them
    console.log('[PIIDictionary] Linking related entities (not yet implemented)');
  }

  /**
   * Get type priority from config
   * @private
   */
  _getTypePriority(type) {
    return this.typePriorities[type] || 0;
  }

  /**
   * Get confidence threshold for a type
   * @private
   */
  _getThresholdForType(type) {
    if (type === 'properNoun') {
      return APP_CONFIG.properNounDetection?.minimumScore || 0.75;
    }
    // Pattern-based types have 100% confidence, so any threshold works
    return 0.5;
  }

  /**
   * Load type priorities from config
   * @private
   */
  _loadTypePriorities() {
    return (
      APP_CONFIG.properNounDetection?.typePriorities || {
        // Pattern-based (highest confidence)
        email: 85,
        phone: 80,
        ssn: 80,
        creditCard: 80,

        // Structured data
        date: 90,
        money: 70,
        quantity: 60,
        address: 50,
        url: 40,

        // Geographic/fuzzy
        location: 30,
        properNoun: 10,
      }
    );
  }

  /**
   * Get all entities (public API)
   * @returns {Array<PIIEntity>} All entities
   */
  getAll() {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities by type (public API)
   * @param {string} type - Entity type
   * @returns {Array<PIIEntity>} Filtered entities
   */
  getByType(type) {
    return this.getAll().filter((e) => e.type === type);
  }

  /**
   * Get entities that are enabled by user settings (public API)
   * @param {Array<string>} enabledTypes - UI type names (e.g., ['properNouns', 'emails'])
   * @returns {Array<PIIEntity>} Enabled entities
   */
  getEnabled(enabledTypes) {
    if (!enabledTypes || enabledTypes.length === 0) {
      return this.getAll();
    }

    // Map UI type names to entity types
    const typeMap = {
      properNouns: 'properNoun',
      emails: 'email',
      phones: 'phone',
      money: 'money',
      quantities: 'quantity',
      dates: 'date',
      addresses: 'address',
      urls: 'url',
      ips: 'ipAddress',
      creditCards: 'creditCard',
      locations: 'location',
    };

    const entityTypes = enabledTypes.map((uiType) => typeMap[uiType]).filter((t) => t);

    return this.getAll().filter((e) => entityTypes.includes(e.type));
  }

  /**
   * Get statistics about the dictionary
   * @returns {Object} Statistics
   */
  getStats() {
    const stats = {
      total: this.entities.size,
      byType: {},
    };

    for (const entity of this.entities.values()) {
      if (!stats.byType[entity.type]) {
        stats.byType[entity.type] = 0;
      }
      stats.byType[entity.type]++;
    }

    return stats;
  }
}
