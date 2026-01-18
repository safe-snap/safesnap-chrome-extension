/**
 * Entity Deduplicator Module
 *
 * Removes overlapping entities using:
 * - Type priorities (date > email > phone > ... > proper noun)
 * - Confidence scores
 * - Entity length
 */

import { APP_CONFIG } from '../../config/app-config.js';

export class EntityDeduplicator {
  constructor() {
    this.priorities = APP_CONFIG.properNounDetection?.typePriorities || {};
  }

  /**
   * Remove overlapping entities using type priority
   * @param {Array<Object>} entities - Array of entities
   * @returns {Array<Object>} Deduplicated entities
   */
  deduplicate(entities) {
    if (entities.length === 0) return [];

    // DEBUG: Log entities being deduplicated
    const hasDateAndQuantity =
      entities.some((e) => e.type === 'date') && entities.some((e) => e.type === 'quantity');
    if (hasDateAndQuantity) {
      console.log('[SafeSnap Debug] Deduplicating entities with both dates and quantities:', {
        dates: entities
          .filter((e) => e.type === 'date')
          .map((e) => ({
            original: e.original,
            start: e.start,
            end: e.end,
            priority: this.priorities.date,
          })),
        quantities: entities
          .filter((e) => e.type === 'quantity')
          .map((e) => ({
            original: e.original,
            start: e.start,
            end: e.end,
            priority: this.priorities.quantity,
          })),
      });
    }

    // Group entities by their text node
    const byNode = new Map();
    for (const entity of entities) {
      const nodeKey = entity.node || 'unknown';
      if (!byNode.has(nodeKey)) {
        byNode.set(nodeKey, []);
      }
      byNode.get(nodeKey).push(entity);
    }

    // DEBUG: Log grouping
    if (hasDateAndQuantity) {
      console.log('[SafeSnap Debug] Entities grouped by node:', {
        nodeCount: byNode.size,
        groups: Array.from(byNode.entries()).map(([key, ents]) => ({
          nodeKey: key === 'unknown' ? 'unknown' : typeof key,
          entityCount: ents.length,
          dates: ents.filter((e) => e.type === 'date').length,
          quantities: ents.filter((e) => e.type === 'quantity').length,
        })),
      });
    }

    // Deduplicate within each text node separately
    const allDeduplicated = [];
    for (const nodeEntities of byNode.values()) {
      const deduplicated = this._deduplicateNode(nodeEntities, hasDateAndQuantity);
      allDeduplicated.push(...deduplicated);
    }

    // DEBUG: Log final result
    if (hasDateAndQuantity) {
      console.log('[SafeSnap Debug] Deduplication result:', {
        before: entities.length,
        after: allDeduplicated.length,
        dates: allDeduplicated.filter((e) => e.type === 'date').map((e) => e.original),
        quantities: allDeduplicated.filter((e) => e.type === 'quantity').map((e) => e.original),
      });
    }

    return allDeduplicated;
  }

  /**
   * Deduplicate entities within a single text node
   * @private
   */
  _deduplicateNode(nodeEntities, debug = false) {
    // Sort by position first, then by priority (high to low)
    const sorted = [...nodeEntities].sort((a, b) => {
      if (a.start !== b.start) {
        return a.start - b.start;
      }
      // If same start position, prioritize by type
      const priorityA = this.priorities[a.type] || 0;
      const priorityB = this.priorities[b.type] || 0;
      return priorityB - priorityA; // Higher priority first
    });

    const deduplicated = [];
    let lastEnd = -1;

    for (const entity of sorted) {
      if (entity.start >= lastEnd) {
        // No overlap, add it
        deduplicated.push(entity);
        lastEnd = entity.end;
      } else {
        // Overlap detected - decide which to keep
        const lastEntity = deduplicated[deduplicated.length - 1];

        const priorityNew = this.priorities[entity.type] || 0;
        const priorityLast = this.priorities[lastEntity.type] || 0;

        // DEBUG: Log overlap decision
        if (
          debug &&
          (entity.type === 'date' ||
            entity.type === 'quantity' ||
            lastEntity.type === 'date' ||
            lastEntity.type === 'quantity')
        ) {
          console.log('[SafeSnap Debug] Overlap detected:', {
            existing: {
              type: lastEntity.type,
              original: lastEntity.original,
              start: lastEntity.start,
              end: lastEntity.end,
              priority: priorityLast,
            },
            new: {
              type: entity.type,
              original: entity.original,
              start: entity.start,
              end: entity.end,
              priority: priorityNew,
            },
            decision:
              priorityNew > priorityLast
                ? 'REPLACE with new'
                : priorityNew === priorityLast
                  ? 'Check confidence'
                  : 'KEEP existing',
          });
        }

        if (priorityNew > priorityLast) {
          // Replace with higher priority type
          if (debug && (lastEntity.type === 'date' || lastEntity.type === 'quantity')) {
            console.log('[SafeSnap Debug] 🗑️ REMOVED (replaced by higher priority):', {
              type: lastEntity.type,
              original: lastEntity.original,
              start: lastEntity.start,
              end: lastEntity.end,
            });
          }
          deduplicated[deduplicated.length - 1] = entity;
          lastEnd = entity.end;
        } else if (priorityNew === priorityLast) {
          // Same priority - use confidence as tiebreaker
          if (entity.confidence > lastEntity.confidence) {
            deduplicated[deduplicated.length - 1] = entity;
            lastEnd = entity.end;
          } else if (entity.confidence === lastEntity.confidence) {
            // Same confidence - use length (longer match wins)
            const lengthNew = entity.end - entity.start;
            const lengthLast = lastEntity.end - lastEntity.start;
            if (lengthNew > lengthLast) {
              deduplicated[deduplicated.length - 1] = entity;
              lastEnd = entity.end;
            }
          }
        } else {
          // Reject new entity (lower priority)
          if (debug && (entity.type === 'date' || entity.type === 'quantity')) {
            console.log('[SafeSnap Debug] 🗑️ REMOVED (rejected - lower priority):', {
              type: entity.type,
              original: entity.original,
              start: entity.start,
              end: entity.end,
            });
          }
        }
      }
    }

    return deduplicated;
  }

  /**
   * Legacy deduplication (confidence-based only)
   * @deprecated Use deduplicate() instead
   * @param {Array<Object>} entities - Array of entities
   * @returns {Array<Object>} Deduplicated entities
   */
  deduplicateLegacy(entities) {
    const sorted = [...entities].sort((a, b) => a.start - b.start);

    const deduplicated = [];
    let lastEnd = -1;

    for (const entity of sorted) {
      if (entity.start < lastEnd) {
        const lastEntity = deduplicated[deduplicated.length - 1];
        if (entity.confidence > lastEntity.confidence) {
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
}
