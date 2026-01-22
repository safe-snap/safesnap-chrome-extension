# Testing with Bun

This project uses **Jest** for testing (not Bun's built-in test runner).

## ⚠️ Important: Use `bun run test`, NOT `bun test`

```bash
# ✅ CORRECT - Runs Jest through Bun (all 343 tests pass)
bun run test

# ❌ WRONG - Uses Bun's test runner (2 tests fail due to matcher differences)
# Note: A prominent warning box will appear at the top if you run this
bun test
```

## Why?

While Bun's built-in test runner is compatible with most Jest tests, some Jest-specific matchers like `expect(...).resolves.not.toThrow()` behave differently. We use Jest because:

1. **Full compatibility** - All 343 tests pass
2. **Better mocking** - jest-webextension-mock works perfectly
3. **Coverage reporting** - Jest's coverage is more mature
4. **Team familiarity** - Most contributors know Jest

**Deprecation Warning**: If you accidentally run `bun test`, you'll see a prominent warning box at the top of the output explaining why you should use `bun run test` instead. This warning is automatically displayed via `bunfig.toml` which preloads `test/bun-test-warning.ts`.

## Test Commands

```bash
# Run all tests (use this!)
bun run test

# Watch mode for TDD
bun run test:watch

# Coverage report
bun run test:coverage

# Run specific test file
bun run test path/to/test.test.js

# Integration tests only (currently 1 placeholder test)
# TODO: Add real integration tests - see test/integration/placeholder.test.js
bun run test:integration

# E2E tests with Playwright
bun run test:e2e
```

## What's Different with `bun test`?

If you accidentally run `bun test`, you'll immediately see a large warning box at the top of the output explaining the issue.

**The 2 failing tests:**

- `Dictionary > loadCoreDictionary > should handle load errors gracefully`
- `Dictionary > loadFullDictionary > should handle cache miss gracefully`

**Why they fail**: Bun's test runner handles `expect(...).resolves.not.toThrow()` differently than Jest. This is a matcher compatibility issue, not a bug in the code.

**The warning system**:

- `bunfig.toml` configures Bun's test runner to preload `test/bun-test-warning.ts`
- This file displays a prominent deprecation warning before any tests run
- The warning explains the issue and recommends using `bun run test`
- Jest users never see this warning

## CI/CD

GitHub Actions workflows correctly use `bun run test`, so all checks pass in CI.

## Test Suite Summary

The project has comprehensive test coverage across multiple areas:

- **Unit Tests**: 342 tests
  - Detection engine (PIIDetector, Dictionary, PatternMatcher)
  - Replacement logic (Replacer, ConsistencyMapper, name/company pools)
  - Content script (global PII replacement, highlight mode)
  - Background worker
  - Settings management
- **Integration Tests**: 1 test (placeholder - needs implementation)
  - See `test/integration/placeholder.test.js` for integration test TODOs
- **E2E Tests**: Playwright tests (separate command)
  - Full browser automation testing
  - User workflow validation

**Total**: 343 tests pass ✅

---

## E2E Screenshot Scenarios

The E2E test suite includes scenario-based testing that captures screenshots at various stages of PII detection and protection. These screenshots are used in [docs/DEMONSTRATION.md](docs/DEMONSTRATION.md).

### Running Scenarios

```bash
# Run all scenarios
bunx playwright test test/e2e/scenarios.spec.js

# Run specific scenario
bunx playwright test test/e2e/scenarios.spec.js -g "zillow-listing"
bunx playwright test test/e2e/scenarios.spec.js -g "calculator-net-tax"
bunx playwright test test/e2e/scenarios.spec.js -g "sfgate-united-article"
bunx playwright test test/e2e/scenarios.spec.js -g "wikipedia-san-francisco-blackout"

# Run with visible browser (headed mode)
bunx playwright test test/e2e/scenarios.spec.js --headed

# Run with debug output
DEBUG=pw:api bunx playwright test test/e2e/scenarios.spec.js
```

### Prerequisites

1. Install Playwright browsers:

   ```bash
   bunx playwright install chromium
   ```

2. Build the extension:
   ```bash
   bun run build
   ```

### Output Location

Screenshots are saved to:

```
test/screenshots/<scenario-name>/
├── 01-original.png          # Page before SafeSnap
├── 01-original.json         # Metadata (empty detections)
├── 02-highlighted.png       # PII highlighted
├── 02-highlighted.json      # Highlight candidates
├── 03-protected.png         # PII replaced
├── 03-protected.json        # Full detection results
├── 04-protected-highlighted.png  # (if step enabled)
└── 04-protected-highlighted.json
```

### Adding New Scenarios

Edit `test/e2e/scenarios.config.js`:

```javascript
{
  name: 'my-new-scenario',
  description: 'Description of what this tests',
  url: 'https://example.com/page-with-pii',
  enabledTypes: ['money', 'dates', 'properNouns', 'locations'],
  viewport: { width: 1280, height: 900 },
  waitAfterLoad: 2000,
  steps: ['original', 'highlighted', 'protected'],
  protectionMode: 'random',  // or 'blackout'
  properNounSensitivity: 0.75,  // 0.5 = more detections, 0.95 = fewer
}
```

### Available PII Types

| Type          | Description             | Examples                                  |
| ------------- | ----------------------- | ----------------------------------------- |
| `money`       | Currency amounts        | `$1,250.00`, `€50`, `£100`                |
| `dates`       | Date patterns           | `Jan 15, 2024`, `2024-01-15`, `2024`      |
| `properNouns` | Names and proper nouns  | `John Smith`, `Microsoft`                 |
| `locations`   | Place names             | `San Francisco`, `California`, `Bay Area` |
| `addresses`   | Street addresses        | `123 Main St`, `456 Oak Ave`              |
| `emails`      | Email addresses         | `user@example.com`                        |
| `phones`      | Phone numbers           | `(555) 123-4567`, `+1-555-123-4567`       |
| `ssn`         | Social Security Numbers | `123-45-6789`                             |
| `creditCards` | Credit card numbers     | `4532-1234-5678-9010`                     |
| `ipAddresses` | IP addresses            | `192.168.1.1`, `10.0.0.1`                 |
| `quantity`    | Numbers and quantities  | `1,234`, `5.67`                           |

### Scenario Configuration Options

| Option                  | Type    | Description                     |
| ----------------------- | ------- | ------------------------------- |
| `name`                  | string  | Unique identifier (folder name) |
| `description`           | string  | What the scenario tests         |
| `url`                   | string  | Page URL to capture             |
| `enabledTypes`          | array   | PII types to detect             |
| `viewport`              | object  | `{ width, height }` in pixels   |
| `waitAfterLoad`         | number  | Delay after page load (ms)      |
| `headed`                | boolean | Show browser window             |
| `slowMo`                | number  | Slow down actions (ms)          |
| `skipInCI`              | boolean | Skip in CI environment          |
| `steps`                 | array   | Screenshot sequence             |
| `zoom`                  | number  | Page zoom (1 = 100%)            |
| `protectionMode`        | string  | `'random'` or `'blackout'`      |
| `properNounSensitivity` | number  | Detection threshold (0.5-1.0)   |

### Bot Protection

Some sites (Zillow, news sites) have bot protection that may block headless browsers. For these:

```javascript
{
  headed: true,      // Show browser window
  slowMo: 100,       // Slow down to appear human
  skipInCI: true,    // Don't run in CI
}
```

### Detection Metadata

Each screenshot includes a JSON metadata file with detection details:

```json
{
  "scenario": "zillow-listing",
  "step": "protected",
  "timestamp": "2026-01-21T18:09:30.958Z",
  "settings": {
    "enabledTypes": ["money", "dates", "properNouns", "locations", "addresses"],
    "protectionMode": "random"
  },
  "summary": {
    "totalDetections": 664,
    "byType": { "money": 137, "location": 61, "date": 74, "address": 17 }
  },
  "detections": [{ "original": "$1,399,000", "type": "money", "replacement": "$194,808" }]
}
```

### Analyzing Metadata

```bash
# View detection summary
cat test/screenshots/zillow-listing/03-protected.json | jq '.summary'

# List unique money detections
cat test/screenshots/zillow-listing/03-protected.json | jq '[.detections[] | select(.type == "money")] | unique_by(.original) | .[] | {original, replacement}'

# Count detections by type
cat test/screenshots/zillow-listing/03-protected.json | jq '.summary.byType'
```
