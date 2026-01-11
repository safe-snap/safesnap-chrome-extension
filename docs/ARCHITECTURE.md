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
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── popup.css
│   │   └── popup.test.js
│   ├── settings/
│   │   ├── settings.html
│   │   ├── settings.js
│   │   └── settings.test.js
│   ├── content/
│   │   ├── content.js         // Content script
│   │   ├── banner.js
│   │   └── banner.test.js
│   ├── background/
│   │   ├── background.js      // Service worker
│   │   └── background.test.js
│   ├── detection/
│   │   ├── dictionary.js
│   │   ├── pii-detector.js
│   │   ├── pattern-matcher.js
│   │   └── *.test.js
│   ├── replacement/
│   │   ├── replacer.js
│   │   ├── consistency-mapper.js
│   │   ├── name-pool.js
│   │   ├── company-pool.js
│   │   └── *.test.js
│   └── utils/
├── assets/
│   ├── icons/
│   │   ├── logo.svg
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── dictionaries/
│       ├── core-20k.json
│       └── full-80k.json (downloaded)
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

- Inject environment banner into web pages
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
- Display environment detection

**Communication:**

- Sends messages to content script for PII protection
- Sends messages to background for screenshot capture

### 4. Settings Page

**Files:** `src/settings/settings.html`, `settings.js`

**Responsibilities:**

- Configure default PII types
- Manage custom environment patterns
- Customize banner appearance
- Add/edit custom regex patterns
- Manage dictionary (download full version, clear cache)

### 5. PII Detection System

#### Dictionary Manager

**File:** `src/detection/dictionary.js`

**Responsibilities:**

- Load core dictionary (20K words) from bundled assets
- Handle optional full dictionary download (80K words)
- Provide word lookup functionality
- Manage dictionary caching
- Track usage count for smart download suggestion

**Data Source:**

- Census/SSA public domain data
- Curated common English words
- Technical terms and jargon

#### PII Detector

**File:** `src/detection/pii-detector.js`

**Responsibilities:**

- Coordinate between dictionary and pattern matching
- Implement proper noun detection with multi-signal scoring
- Consider HTML context (skip labels, headings, etc.)
- Handle multi-word capitalized sequences
- Return PII entities with positions and confidence scores

**Algorithm:**

```javascript
function detectPII(text, context) {
  1. Run pattern matchers (email, phone, money, etc.)
     → Match found: Mark as PII (confidence = 1.0)
     → No match: Continue to step 2

  2. Detect proper noun candidates (capitalized words/phrases)
     - Match regex: /\b(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?(?!Mr|Mrs|Ms|Dr|Prof\b)[A-Z][a-z]+.../
     - For each candidate: Continue to step 3

  3. Calculate multi-signal score:
     score = 0.3 (capitalization)
           + 0.3 (if >50% words unknown in dictionary)
           + 0.4 (if has honorific OR company suffix)
           + 0.2 (if multi-word, 2+ words)
           + 0.1 (if not at sentence start)
           + 0.2 (if near email/phone within 50 chars)

     → score >= 0.8: Mark as PII (proper noun)
     → score < 0.8: Keep as regular text

  4. Check HTML context
     - Inside <label>, <th>, <h1-h6>, etc.?
     - Has role="label"?
     → Yes: Skip detection for this element
     → No: Apply detection results
}
```

**Configuration:**

```javascript
properNounDetection: {
  minimumScore: 0.8,
  weights: {
    capitalizationPattern: 0.3,
    unknownInDictionary: 0.3,
    hasHonorificOrSuffix: 0.4,
    multiWord: 0.2,
    notSentenceStart: 0.1,
    nearOtherPII: 0.2,
  },
  nearbyPIIWindowSize: 50,
  debugMode: false,
}
```

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
  // ... more patterns
}
```

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

### 7. Environment Banner

**File:** `src/content/banner.js`

**Responsibilities:**

- Detect environment from URL patterns
- Inject banner into page (default top-right)
- Handle banner customization (position, colors, text, size, opacity)
- Implement fade interaction (20% opacity + 50% shrink on cursor proximity)
- Update banner text based on protection status
- Display error warnings

**Behavior:**

```javascript
States:
1. Initial: "⚠️ PRODUCTION"
2. Protected: "⚠️ PRODUCTION - PII PROTECTED"
3. Restored: "⚠️ PRODUCTION"
4. Error: Separate persistent warning bar (non-dismissible)
```

### 8. Configuration

**File:** `config/app-config.js`

**Responsibilities:**

- Centralized storage for app name and version
- Default settings and constants
- Environment pattern defaults
- Banner customization defaults

```javascript
export const APP_CONFIG = {
  name: 'SafeSnap',
  version: '1.0.0',
  tier: 'free'

  defaults: {
    enabledPIITypes: ['properNouns', 'money', 'quantities'],
    bannerPosition: 'top-right',
    bannerOpacity: 100,
    fadeDistance: 100,
    magnitudeVariance: 30,
  },

  environmentPatterns: {
    PROD: /\.(prod|production)($|\/|:)/,
    DEV: /\.(dev|development)($|\/|:)/,
    STAGING: /\.(staging|stg|stage)($|\/|:)/,
    LOCAL: /\.(local|loc)($|\/|:|localhost|127\.0\.0\.1|192\.168\.|10\.0\.)/,
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
  "description": "Screenshot tool with PII protection and environment indicators",

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

- Core dictionary (20K) loads on first "Protect PII" click
- Full dictionary (80K) downloads only when user accepts suggestion
- ~100-200ms initial load time

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
- No data sent to external servers (free tier)
- Dictionary files are static, bundled assets
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

- Framework: Jest with jest-chrome
- Co-located with source files (\*.test.js)
- Focus: Individual functions and classes
- Coverage: ~90%+

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

- Webpack or Rollup for bundling
- Babel for transpilation
- PostCSS for CSS processing

### Development Workflow

1. `npm install` - Install dependencies
2. `npm run dev` - Start development server with hot reload
3. `npm test` - Run unit tests
4. `npm run test:integration` - Run integration tests
5. `npm run test:e2e` - Run E2E tests
6. `npm run build` - Build production bundle
7. `npm run package` - Create .zip for Chrome Web Store

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
