# Agent Guidelines for SafeSnap Chrome Extension

This document provides coding agents with essential information for working effectively in this codebase.

## Project Overview

SafeSnap is a privacy-first Chrome extension that automatically detects and protects PII in screenshots.
Uses dictionary-based detection (20K+ proper nouns), pattern matching for structured data, and custom regex patterns.

**Tech Stack:** Vanilla JavaScript (ES6+), Jest for testing, Webpack for bundling, Bun as package manager
**Target:** Chrome 88+, uses Chrome Extension Manifest V3

## Build, Lint, and Test Commands

### Development Commands

```bash
# Install dependencies (MUST use bun, enforced by preinstall script)
bun install

# Build commands
bun run build              # Production build
bun run build:dev          # Development build with source maps
bun run dev                # Development build with watch mode

# Testing - CRITICAL: Always use "bun run test", NOT "bun test"
bun run test               # Run all tests (338 tests)
bun run test:watch         # Watch mode for TDD
bun run test:coverage      # Generate coverage report (>80% required)
bun run test path/to/file.test.js  # Run single test file

# Integration and E2E tests
bun run test:integration   # Integration tests only
bun run test:e2e           # Playwright E2E tests

# Linting and formatting
bun run lint               # ESLint check
bun run lint:fix           # ESLint auto-fix
bun run format             # Prettier format all files

# Package extension
bun run package            # Build and create distributable package
```

### Running a Single Test File

```bash
# Run specific test file
bun run test src/detection/pii-detector.test.js

# Run tests matching pattern
bun run test -- --testNamePattern="should detect emails"

# Run with coverage for specific file
bun run test -- --coverage --collectCoverageFrom=src/detection/pii-detector.js
```

### CRITICAL: Test Runner Warning

- **ALWAYS** use `bun run test` (runs Jest through Bun)
- **NEVER** use `bun test` (uses Bun's test runner, causes 2 test failures)
- See TESTING.md for detailed explanation of test runner differences
- CI/CD uses `bun run test` and all 338 tests pass

## Code Style Guidelines

### JavaScript Conventions

**ES6+ Syntax Required:**

```javascript
// ✅ Correct - Modern ES6+ syntax
const items = [1, 2, 3];
const doubled = items.map((x) => x * 2);
const { name, age } = person;

// ❌ Wrong - Avoid var and old-style functions
var items = [1, 2, 3];
var doubled = items.map(function (x) {
  return x * 2;
});
```

**Async/Await over Promises:**

```javascript
// ✅ Correct - Use async/await
async initialize() {
  await this.dictionary.initialize();
  this.initialized = true;
}

// ❌ Wrong - Avoid .then() chains
initialize() {
  return this.dictionary.initialize().then(() => {
    this.initialized = true;
  });
}
```

### Imports and Module Organization

**ES6 Module Imports:**

```javascript
// ✅ Correct - ES6 imports with .js extension
import { PIIDetector } from './pii-detector.js';
import { APP_CONFIG } from '../../config/app-config.js';

// Use path aliases defined in webpack.config.js
import { something } from '@/utils/helper.js';
import { config } from '@config/app-config.js';
```

**File Structure:**

- Source code: `src/`
- Tests: Co-located with source files as `*.test.js`
- Config: `config/`
- Keep files focused on single responsibility

### Naming Conventions

```javascript
// Classes: PascalCase
class PIIDetector {}
class PatternMatcher {}

// Functions/methods: camelCase
detectInText() {}
findEmails() {}

// Constants: UPPER_SNAKE_CASE
const APP_CONFIG = {};
const MAX_RETRIES = 3;

// Private/internal: prefix with underscore
_internalHelper() {}

// Parameters with underscore prefix are ignored by linter
functionName(param, _unusedParam) {}
```

### JSDoc Comments

**Required for all public functions:**

```javascript
/**
 * Detect PII in text string
 * @param {string} text - Text to analyze
 * @param {Array<string>} enabledTypes - PII types to detect
 * @returns {Array<Object>} Array of detected PII entities
 */
detectInText(text, enabledTypes = null) {
  // Implementation
}
```

### Error Handling

```javascript
// ✅ Correct - Try/catch with meaningful errors
async initialize() {
  try {
    await this.dictionary.initialize();
    this.initialized = true;
  } catch (error) {
    console.error('Failed to initialize dictionary:', error);
    throw new Error('PIIDetector initialization failed');
  }
}

// Use console methods appropriately
console.log('Info message');    // Allowed
console.warn('Warning');         // Allowed
console.error('Error details');  // Allowed
console.time('operation');       // Allowed for performance
console.timeEnd('operation');    // Allowed for performance
// console.debug() - Use sparingly
```

### Code Quality Rules

**ESLint Configuration:**

- Extends: `eslint:recommended`, `plugin:jest/recommended`, `prettier`
- Environment: Browser, ES2021, WebExtensions, Jest
- No unused variables (except prefixed with `_`)
- Console warnings (except log, warn, error, time, timeEnd)

**Prettier Configuration:**

- Semicolons: Required
- Quotes: Single quotes
- Trailing commas: ES5 style
- Print width: 100 characters
- Tab width: 2 spaces

## Testing Best Practices

### Test Structure

```javascript
describe('ModuleName', () => {
  let instance;

  beforeEach(async () => {
    instance = new ModuleName();
    await instance.initialize();
  });

  describe('methodName', () => {
    test('should do something specific', () => {
      const result = instance.methodName('input');
      expect(result).toBe('expected');
    });
  });
});
```

### Test Coverage Requirements

- Global minimum: Functions 80%, Lines 75%, Statements 75%, Branches 60%
- Write tests for both success and error cases
- Use descriptive test names explaining the scenario
- Mock Chrome APIs using jest-webextension-mock

### Chrome Extension Testing

```javascript
// Jest setup automatically loads jest-webextension-mock
// Chrome APIs are automatically mocked in tests
chrome.storage.local.get.mockResolvedValue({ key: 'value' });
```

## Project Architecture

### Directory Structure

```
src/
├── background/      # Background service worker
├── content/         # Content scripts (page injection)
├── detection/       # PII detection engine
│   ├── pii-detector.js      # Main orchestrator
│   ├── pattern-matcher.js   # Regex patterns
│   └── dictionary.js        # Proper noun dictionary
├── replacement/     # PII replacement logic
│   ├── replacer.js          # Replacement generator
│   ├── name-pool.js         # Fake name pool
│   ├── company-pool.js      # Fake company pool
│   └── consistency-mapper.js # Consistent replacements
├── popup/           # Extension popup UI
├── settings/        # Settings page
├── utils/           # Utility functions
├── dictionaries/    # Dictionary data files
└── i18n/            # Internationalization
```

### Key Architectural Principles

**Privacy First:**

- All processing happens locally in browser
- No data sent to external servers
- No analytics or tracking
- User data stays on their machine

**Detection Strategy:**

- Dictionary-based: 20K+ proper nouns (80K optional)
- Pattern-based: Structured data (emails, phones, credit cards, etc.)
- Custom patterns: User-defined regex patterns
- Context-aware: Skips UI labels, buttons, headings

**Replacement Strategy:**

- Consistent replacements within session (same input = same output)
- Magnitude variance for realistic money/quantities (configurable 0-100%)
- Pool-based replacements for names and companies
- Preserves data relationships and formats

## Common Patterns in Codebase

### Chrome Extension APIs

```javascript
// Storage API
await chrome.storage.local.set({ key: value });
const { key } = await chrome.storage.local.get('key');

// Messaging
chrome.runtime.sendMessage({ action: 'doSomething', data });
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message
});

// Tabs API
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
```

### Configuration Access

```javascript
import { APP_CONFIG } from '@config/app-config.js';

const defaultValue = APP_CONFIG.defaults?.settingName || fallback;
```

## Git Workflow

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for custom PII detection patterns
fix: resolve memory leak in screenshot capture
docs: update installation instructions
test: add unit tests for pattern matcher
refactor: simplify dictionary loading logic
chore: update dependencies
```

### Pull Request Requirements

- [ ] All tests pass (`bun run test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Build succeeds (`bun run build`)
- [ ] Code coverage maintained (>80%)
- [ ] JSDoc comments for new public functions
- [ ] Update CHANGELOG.md under "Unreleased"
- [ ] No merge conflicts with main

### CI/CD Checks (GitHub Actions)

All PRs automatically run:

1. Linting (`bun run lint`)
2. Tests (`bun run test`) - All 338 tests must pass
3. Build (`bun run build`)

PRs cannot be merged until all checks pass ✅

## Dependencies

**Production:**

- `card-validator` - Credit card validation
- `libphonenumber-js` - Phone number parsing/validation

**Development:**

- Babel, Webpack - Build tooling
- Jest - Testing framework
- ESLint, Prettier - Code quality
- Playwright - E2E testing
- jest-webextension-mock - Chrome API mocking

## Quick Reference

**File an issue?** Include: clear title, reproduction steps, expected vs actual behavior, browser version, OS
**Need help?** Check README.md, CONTRIBUTING.md, TESTING.md, or open a GitHub discussion
**Building for production?** `bun run build && bun run package` creates distributable extension

---

**Remember:** This is a privacy-focused tool. Never add telemetry, external API calls, or data collection.
All processing must remain local to the user's browser.
