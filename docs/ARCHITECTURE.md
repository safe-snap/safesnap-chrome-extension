# SafeSnap - Technical Architecture

## Overview

SafeSnap is a Chrome extension built using Manifest V3 with a focus on privacy, performance, and extensibility.

## File Structure

```
safesnap-extension/
├── manifest.json
├── config/
│   └── app-config.js          // Centralized name storage
├── src/
│   ├── background/      # Background service worker
│   ├── content/         # Content scripts
│   ├── popup/           # Extension popup UI
│   ├── settings/        # Settings page
│   ├── detection/       # PII detection engine (5-phase pipeline)
│   │   ├── dictionary.js          # Dictionary validation
│   │   ├── pii-detector.js        # Phase 2: Find candidates
│   │   ├── text-extractor.js      # Phase 1: Extract text from DOM
│   │   ├── pii-dictionary.js      # Phase 3-4: Build & refine entities
│   │   ├── pattern-matcher.js     # Regex patterns
│   │   └── *.test.js
│   ├── replacement/     # PII replacement logic
│   │   ├── replacer.js
│   │   ├── consistency-mapper.js
│   │   ├── name-pool.js
│   │   ├── company-pool.js
│   │   └── *.test.js
│   ├── dictionaries/    # Dictionary data files
│   │   └── en.js        # 801 common English words
│   └── utils/
├── assets/
│   └── dictionaries/
│       └── (removed - now in src/dictionaries/)
├── test/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── docs/
└── design/
    └── workflows/
```

## Core Components

### 1. Background Service Worker

**File:** `src/background/background.js`

**Responsibilities:**

- Coordinate communication between popup, content scripts, and settings
- Handle screenshot capture via Chrome APIs
- Manage extension lifecycle events
- Store and retrieve user settings from chrome.storage

**APIs Used:**

- `chrome.tabs.captureVisibleTab()` - Screenshot capture
- `chrome.storage.sync` - Settings persistence
- `chrome.runtime.onMessage` - Message passing

### 2. Content Script

**File:** `src/content/content.js`

**Responsibilities:**

- Perform PII detection and replacement on page content
- Manage DOM manipulation for PII protection
- Handle "Restore Original" functionality
- Listen for messages from popup/background

**Features:**

- Runs on all pages (configured via manifest)
- Isolated execution context
- Direct DOM access

### 3. Popup Interface

**Files:** `src/popup/popup.html`, `popup.js`, `popup.css`

**Responsibilities:**

- Display tabbed interface (Protect, Settings, About)
- Allow user to select PII types to protect
- Trigger PII protection and screenshot capture
- Show current protection status

**Communication:**

- Sends messages to content script for PII protection
- Sends messages to background for screenshot capture

### 4. Settings Page

**Files:** `src/settings/settings.html`, `settings.js`

**Responsibilities:**

- Configure default PII types
- Customize banner appearance
- Add/edit custom regex patterns

### 5. PII Detection System

#### Dictionary Manager

**File:** `src/detection/dictionary.js`

**Responsibilities:**

- Load curated dictionary (801 words) from bundled assets
- Provide word lookup functionality
- Manage dictionary caching

**Data Source:**

- Curated common English words
- Common verbs, adjectives, geographic names
- High-frequency words that are NOT proper nouns

#### PII Detector

**File:** `src/detection/pii-detector.js`

**Responsibilities:**

- Phase 2 of 5-phase pipeline: Find all PII candidates
- Coordinate between dictionary and pattern matching
- Implement proper noun detection with multi-signal scoring
- Consider HTML context (skip labels, headings, etc.)
- Handle email domain matching for company validation
- Return PII candidates with positions and confidence scores

**5-Phase Detection Pipeline:**

```
Phase 1 (TextExtractor): Extract text from DOM
  ↓ TextMap with node boundaries

Phase 2 (PIIDetector): Find all candidates
  ↓ Raw candidates (no filtering)

Phase 3 (PIIDictionary): Build dictionary
  ↓ Group by text, resolve conflicts (longer wins)

Phase 4 (PIIDictionary): Refine dictionary
  ↓ Remove overlaps (priority-based), apply thresholds

Phase 5 (Content Script): Generate & apply replacements
  ↓ Protected page
```

**Algorithm (Phase 2 - Find Candidates):**

```javascript
function findAllCandidates(textMap) {
  1. Run pattern matchers (email, phone, money, etc.)
     → Match found: Add as candidate (confidence = 1.0)
     → No match: Continue to step 2

  2. Detect proper noun candidates (capitalized words/phrases)
     - Match regex: /\b(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?(?!Mr|Mrs|Ms|Dr|Prof\b)[A-Z][a-z]+.../
     - For each candidate: Continue to step 3

  3. Calculate multi-signal score:
     score = 0.3 (capitalization)
           + 0.35 (if >50% words unknown in dictionary)
           + 0.45 (if has honorific OR company suffix)
           + 0.2 (if multi-word, 2+ words)
           + 0.15 (if not at sentence start)
           + 0.25 (if near email/phone within window)
           + 0.3 (if matches nearby email domain)

     → score >= 0.75: Add as candidate
     → score < 0.75: Skip

  4. Return ALL candidates (no filtering by enabled types yet)
}
```

**Overlap Resolution (Phase 4):**

When multiple PII types overlap (e.g., "17" in "Jan 17, 2026"):

- Higher priority type wins
- Priority order: date (90) > email (85) > phone/SSN/creditCard (80) > money (70) > quantity (60) > address (50) > url (40) > location (30) > properNoun (10)

**Configuration:**

```javascript
properNounDetection: {
  minimumScore: 0.75,
  weights: {
    capitalizationPattern: 0.30,
    unknownInDictionary: 0.35,
    hasHonorificOrSuffix: 0.45,
    notSentenceStart: 0.15,
    nearOtherPII: 0.25,
    matchesEmailDomain: 0.30,
    insideLink: 0.25,
    isKnownLocation: 0.50,
    appearsInPageLinks: 0.30,
    appearsInHeaderFooter: -0.50,  // Negative signal
    nonNounPOS: -0.50,              // Negative signal (adjective filtering)
  },
  nearbyPIIWindowSize: { default: 50, min: 10, max: 100 },
  debugMode: false,
},
typePriorities: {
  date: 90,
  email: 85,
  phone: 80,
  ssn: 80,
  creditCard: 80,
  money: 70,
  quantity: 60,
  address: 50,
  url: 40,
  location: 30,
  properNoun: 10,
}
```

**Performance (v1.0):**

- **Precision:** 100% (zero false positives)
- **Recall:** 55.88%
- **F1 Score:** 0.7170
- **Dictionary Size:** 801 curated common English words

**See [DETECTION.md](DETECTION.md) for detailed explanation of the detection algorithm.**

#### Pattern Matcher

**File:** `src/detection/pattern-matcher.js`

**Responsibilities:**

- Define regex patterns for each PII type
- Match emails, phones, money, URLs, IPs, dates, addresses
- Support custom user-defined regex patterns
- Return match type and metadata

**Patterns:**

```javascript
{
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phone: /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/,
  money: /[$€£¥]\s?\d{1,3}(,?\d{3})*(\.\d{2})?/,
  url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
  ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
  location: /\b(?:[A-Z][a-z]+\s+){0,3}(?:Bay|Valley|Area|...)\b/,  // Multi-word locations
  // ... more patterns
}
```

**PII Detection Types:**

- **Emails** - Email addresses via regex pattern
- **Phones** - Phone numbers (multiple formats) via regex + validation
- **Money** - Currency amounts via regex pattern
- **Credit Cards** - Major card formats via regex + validation
- **URLs** - Web addresses via regex pattern
- **IPs** - IPv4/IPv6 addresses via regex pattern
- **Dates** - Multiple formats via regex pattern
- **Addresses** - Street addresses via regex pattern
- **Proper Nouns** - Names and companies via dictionary + multi-signal scoring (20K+ entries)
- **Locations** - Geographic locations (cities, states, countries, features) via hybrid pattern + gazetteer (500 locations)
  - Multi-word locations: "Bay Area", "Silicon Valley", "Pacific Ocean" (pattern-based, confidence 0.90)
  - Single-word locations: "Paris", "Tokyo", "California" (gazetteer-based, confidence 0.95)
  - Type-aware replacements: city→city, region→region, country→country, feature→feature

### 6. Replacement System

#### Replacer

**File:** `src/replacement/replacer.js`

**Responsibilities:**

- Generate random replacements for detected PII
- Preserve magnitude (±30% variance for numbers)
- Maintain format (currency symbols, units, etc.)
- Use consistency mapper for repeated entities

**Replacement Functions:**

```javascript
- replaceProperNoun(name) → random name from pool
- replaceMoney(amount) → similar amount ±30%
- replaceQuantity(qty, unit) → similar quantity ±30%
- replaceDate(date) → ±2 months
- replaceEmail(email) → random email
- replacePhone(phone) → random phone (same format)
- replaceAddress(address) → random address (same structure)
- replaceURL(url) → random domain (same TLD)
```

#### Consistency Mapper

**File:** `src/replacement/consistency-mapper.js`

**Responsibilities:**

- Track entity → replacement mappings per page session
- Ensure same entity always gets same replacement
- Support case-insensitive matching
- Handle related entities (e.g., "Acme Corp" and "acme.com")

**Data Structure:**

```javascript
{
  session: {
    "john smith": "Alex Martinez",
    "acme corp": "Company A",
    "acme.com": "company-a.com",
    "$500": "$437.21"
  }
}
```

#### Name Pool

**File:** `src/replacement/name-pool.js`

**Responsibilities:**

- Provide ~100 person names from Census/SSA data
- Support first names, last names, and full names
- Ensure diverse representation

#### Company Pool

**File:** `src/replacement/company-pool.js`

**Responsibilities:**

- Provide ~100+ generic company terms
- Generate variations (Inc, LLC, Corp, Company, etc.)
- Examples: "Company A", "Organization B", "Tech Business C"

### 7. Configuration

**File:** `config/app-config.js`

**Responsibilities:**

- Centralized storage for app name and version
- Default settings and constants
- Banner customization defaults
- Detection weights and thresholds
- Department filtering patterns

```javascript
export const APP_CONFIG = {
  name: 'SafeSnap',
  version: '1.0.0',

  defaults: {
    enabledPIITypes: ['properNouns', 'money', 'quantities', 'emails', 'phones'],
    bannerPosition: 'top-right',
    bannerOpacity: 100,
    fadeDistance: 100,
    magnitudeVariance: 30,
  },

  properNounDetection: {
    minimumScore: 0.75,
    weights: {
      capitalizationPattern: 0.30,
      unknownInDictionary: 0.35,
      hasHonorificOrSuffix: 0.45,
      multiWord: 0.20,
      notSentenceStart: 0.15,
      nearOtherPII: 0.25,
      matchesEmailDomain: 0.30,
    },
    nearbyPIIWindowSize: 50,
  },

  departmentDetection: {
    departmentPrefixes: ['Human', 'Customer', 'Technical', ...],
    departmentSuffixes: ['Resources', 'Service', 'Support', 'Team', 'Department'],
    penalty: -0.9,
  },
};
```

## Data Flow

### PII Protection Flow

```
1. User clicks "Protect PII" in popup
   ↓
2. Popup sends message to content script
   ↓
3. Content script:
   a. Loads dictionary (if not loaded)
   b. Scans page DOM
   c. Detects PII using detector + pattern matcher
   d. Generates replacements using replacer + consistency mapper
   e. Modifies DOM with replacements
   f. Stores original content for restore
   g. Updates banner text
   ↓
4. Content script sends success/failure message to popup
   ↓
5. Popup updates UI status
```

### Screenshot Capture Flow

```
1. User clicks "Take Screenshot" or "Copy to Clipboard"
   ↓
2. Popup sends message to background service worker
   ↓
3. Background captures visible tab using chrome.tabs.captureVisibleTab()
   ↓
4. Background returns image data URL
   ↓
5. Popup:
   - For "Take Screenshot": Triggers download
   - For "Copy to Clipboard": Copies to clipboard
```

### Settings Persistence Flow

```
1. User modifies settings in settings page
   ↓
2. Settings page saves to chrome.storage.sync
   ↓
3. Chrome syncs settings across user's devices
   ↓
4. Other components (popup, content) read from chrome.storage.sync on load
```

## Chrome Extension Manifest V3

**Key Manifest Elements:**

```json
{
  "manifest_version": 3,
  "name": "SafeSnap",
  "version": "1.0.0",
  "description": "Screenshot tool with PII protection",

  "permissions": ["activeTab", "storage", "tabs"],

  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },

  "background": {
    "service_worker": "src/background/background.js"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.js"],
      "css": ["src/content/banner.css"],
      "run_at": "document_idle"
    }
  ],

  "options_page": "src/settings/settings.html",

  "web_accessible_resources": [
    {
      "resources": ["assets/dictionaries/*.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## Performance Considerations

### Lazy Loading

- Dictionary (801 words) loads on first "Protect PII" click
- ~10-20ms initial load time (fast, optimized)

### Progress Indicators

- Show loading spinner if processing takes >500ms
- Helpful for large pages with lots of content

### Optimization Strategies

- Use efficient DOM traversal (TreeWalker API)
- Batch DOM updates to minimize reflows
- Cache compiled regex patterns
- Use Web Workers for heavy processing (future)

## Security Considerations

### Privacy-First Design

- All processing happens locally in the browser
- No data sent to external servers
- Dictionary files are static, bundled assets (801 words)
- Settings stored in chrome.storage.sync (encrypted by Chrome)

### Content Security Policy

- Restrict inline scripts
- Use nonce-based script execution
- Prevent XSS attacks

### Permissions

- Minimal permissions requested
- `activeTab` instead of `<all_urls>` where possible
- Clear permission justifications

## Testing Architecture

### Unit Tests

- Framework: Jest with jest-webextension-mock
- Co-located with source files (\*.test.js)
- Focus: Individual functions and classes
- Coverage: >80% (functions), >75% (lines/statements), >60% (branches)

### Integration Tests

- Framework: Jest
- Location: `test/integration/`
- Focus: Component interactions
- Test data: Fixtures in `test/fixtures/`

### E2E Tests

- Framework: Playwright
- Location: `test/e2e/`
- Focus: Full user workflows
- Multi-browser support

### Test Organization

```
src/detection/pii-detector.test.js    // Unit tests (co-located)
test/integration/pii-detection.test.js // Integration tests
test/e2e/full-workflow.spec.js         // E2E tests
test/fixtures/sample-page.html         // Test data
```

## Build and Development

### Build Tools

- Bun for package management
- Webpack for bundling
- Babel for transpilation
- PostCSS for CSS processing

### Development Workflow

1. `bun install` - Install dependencies
2. `bun run dev` - Start development server with hot reload
3. `bun run test` - Run unit tests (IMPORTANT: Use "bun run test", NOT "bun test")
4. `bun run test:integration` - Run integration tests
5. `bun run test:e2e` - Run E2E tests
6. `bun run build` - Build production bundle
7. `bun run package` - Create .zip for Chrome Web Store

### Pre-commit Hooks

- Run linter (ESLint)
- Run formatter (Prettier)
- Run unit tests
- Ensure build succeeds

### Technical Improvements

- Web Workers for heavy processing
- IndexedDB for large dataset storage
- Service Worker background sync
- Advanced caching strategies
- Performance profiling and optimization
