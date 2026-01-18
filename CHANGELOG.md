# Changelog

All notable changes to SafeSnap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **5-Phase Detection Pipeline** - Complete rewrite of PII detection system
  - Phase 1 (`TextExtractor`): Extract text from DOM with node boundary tracking
  - Phase 2 (`PIIDetector`): Find all PII candidates without filtering
  - Phase 3 (`PIIDictionary`): Build dictionary, group by text, resolve conflicts
  - Phase 4 (`PIIDictionary`): Refine with priority-based overlap resolution
  - Phase 5 (Content Script): Generate and apply replacements
- **Atomic Word Detection Strategy** - Detects individual words instead of phrases
  - Detects "Jim" and "Glab" separately instead of "Jim Glab" as one entity
  - Benefits: consistent replacement, no cross-node entities, automatic phrase replacement
  - Example: "Jim" → "Daniel" everywhere, so "Jim Glab" becomes "Daniel Jackson"
  - Example: "United" → "Potato" everywhere, so "United Airlines" becomes "Potato Airlines"
- **Page-Wide Context Analysis** - Boosts confidence based on page-level signals
  - If a word appears in ANY hyperlink on the page, ALL instances get +0.3 confidence boost
  - Example: "Jim" in author byline link boosts "Jim" in article body
  - Cached after first analysis for performance
- **Job Title Filtering** - Automatically skips common job titles during detection
  - Filters: "Freelance", "Writer", "Editor", "Reporter", "Journalist", "Manager", etc.
  - Prevents false positives like "Freelance Writer" being detected as PII
- Priority-based overlap resolution - Higher priority PII types win when overlapping
  - Date (90) > Email (85) > Phone/SSN/Card (80) > Money (70) > Quantity (60) > Address (50) > URL (40) > Location (30) > Proper Noun (10)
  - Example: "Jan 17, 2026" detected as date, not quantity "17"
- Configurable proximity window for nearby PII detection (10-100 chars, default 50)
- Initial project setup
- Comprehensive design documentation
- Project structure and build configuration
- Testing infrastructure (Jest + Playwright)
- Centralized app configuration
- Comprehensive agent guidelines (AGENTS.md) for AI coding assistants

### Changed

- **Proper noun detection switched from greedy multi-word to atomic single-word matching**
  - OLD: Regex matched entire phrases like "Jim Glab Freelance Writer Jim Glab"
  - NEW: Regex matches individual words: "Jim", "Glab", "Freelance", "Writer"
  - OLD: Cross-node entities were complex to replace and often failed
  - NEW: Single words rarely cross nodes, replacement is simple and reliable
  - OLD: Multi-word bonus in scoring (+0.2 for 2+ words)
  - NEW: Removed multi-word bonus, replaced with page-wide context signal (+0.3)
- Detection system migrated from position-based to dictionary-based approach
- Proximity window changed from fixed 50 chars to configurable range (10-100)
- Type priorities now configurable in `app-config.js`

### Removed

- **Department name detection** - No longer filters out "Human Resources", "Customer Service", etc.
  - These will now be detected as proper nouns
  - Filtering can be handled by users via confidence threshold adjustment
- **Job title filtering logic** - Removed 70+ lines of brittle regex-based job title splitting
  - Fixes "Jim Glab is a freelance writer" bug where entire phrase was detected as one entity
  - Job titles like "Tech Reporter", "Freelance Writer" now detected separately from names
  - PIIDictionary handles overlap resolution automatically

### Fixed

- **Cross-node entity replacement bug** - PII spanning multiple DOM text nodes now replaced correctly
  - OLD: "Jim Glab" spanning 3 nodes (e.g., across <span> tags) was detected but not replaced
  - NEW: Atomic detection means "Jim" and "Glab" are separate entities within single nodes
  - Implemented multi-node replacement strategy for remaining edge cases
  - Strategy: Put entire replacement in first node, clear middle nodes, keep text after entity in last node
- **"Jim Glab" bug** - Names adjacent to job titles now detected correctly
  - OLD: "Jim Glab is a freelance writer" detected "Jim Glab Freelance Writer Jim Glab" as one entity
  - NEW: Detects "Jim" and "Glab" separately, filters "Freelance" and "Writer" as job titles
  - Result: "Jim Glab Freelance Writer Jim Glab" becomes "Daniel Jackson Freelance Writer Daniel Jackson"
- **Inconsistent replacement across page** - Same word now always replaced the same way
  - OLD: "United" might be replaced differently in different parts of the page
  - NEW: "United" → "Potato" consistently everywhere, so "United Airlines" becomes "Potato Airlines"
- Cross-node entity detection improved with TextMap boundary tracking
- Overlap conflicts resolved correctly (e.g., "17" in dates no longer detected as quantity)
- PII replacement now uses global replace-all strategy to catch all occurrences across the DOM
- Names appearing multiple times now consistently replaced everywhere on the page
- Replacement methods now guarantee values never match original:
  - `replaceMoney()` generates multiplier with minimum 1% variance (ensures multiplier ≠ 1.0)
  - `replaceQuantity()` generates multiplier with minimum 1% variance (ensures multiplier ≠ 1.0)
  - `replaceDate()` ensures day offset is never 0 (dates always change)
  - `replaceProperNoun()` retries selection if random name/company matches original (extremely rare)
  - `replaceEmail()` retries generation if email matches original (statistically negligible)
- Company name suffix detection test now uses whole-word matching
- Removed duplicate "Highlight Detections" toggle in popup UI

## [1.0.0] - TBD (Phase 1 MVP)

### Added

- Core PII detection (proper nouns, money, quantities)
- Dictionary-based detection (20K core words)
- Basic pattern matching (emails, phones, money)
- Simple text replacement with consistency
- Environment banner (basic, top-right)
- Popup UI with tabbed interface
- Screenshot capture (PNG only)
- Content script for DOM manipulation
- Background service worker
- Unit tests for core modules

### Security

- All processing happens locally in browser
- No external data transmission
- Minimal Chrome permissions

## Future Releases

See [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) for planned features.
