# Changelog

All notable changes to SafeSnap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup
- Comprehensive design documentation
- Project structure and build configuration
- Testing infrastructure (Jest + Playwright)
- Centralized app configuration
- Comprehensive agent guidelines (AGENTS.md) for AI coding assistants

### Fixed

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
