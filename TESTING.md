# Testing with Bun

This project uses **Jest** for testing (not Bun's built-in test runner).

## ⚠️ Important: Use `bun run test`, NOT `bun test`

```bash
# ✅ CORRECT - Runs Jest through Bun (all 338 tests pass)
bun run test

# ❌ WRONG - Uses Bun's test runner (2 tests fail due to matcher differences)
# Note: A prominent warning box will appear at the top if you run this
bun test
```

## Why?

While Bun's built-in test runner is compatible with most Jest tests, some Jest-specific matchers like `expect(...).resolves.not.toThrow()` behave differently. We use Jest because:

1. **Full compatibility** - All 338 tests pass
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

# Integration tests only
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
