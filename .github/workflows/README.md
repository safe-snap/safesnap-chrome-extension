# GitHub Actions Workflows

This directory contains CI/CD workflows for the SafeSnap Chrome Extension.

## 🚀 Using Bun

All workflows use [Bun](https://bun.sh) instead of npm for **faster dependency installation and test execution**:

- ⚡ **3-5x faster** than npm for installing dependencies
- 🔥 **Native TypeScript support** (future-proof)
- ✅ **Drop-in replacement** for npm (same package.json, same commands)
- 📦 **Works with all npm packages** (100% compatible)

## Workflows

### 1. `ci.yml` - Continuous Integration

**Triggers**: Push to `main` or `develop`, Pull Requests

**Jobs**:

- **Lint**: Runs ESLint on all source files
- **Test**: Runs Jest tests with coverage reporting
- **Build**: Builds the extension and verifies output
- **All Checks**: Final gate that requires all jobs to pass

**Purpose**: Comprehensive CI pipeline that runs on all branches and PRs.

### 2. `pr-checks.yml` - Pull Request Quality Checks

**Triggers**: Pull Request opened, synchronized, or reopened

**Jobs**:

- Runs linting, testing, and build checks
- Posts a formatted comment on the PR with results
- Updates the comment on subsequent pushes
- Fails the PR if any check fails

**Purpose**: Provides clear feedback on PR quality with a nice summary comment.

### 3. `required-checks.yml` - Required Status Checks

**Triggers**: Push to main branches, feature branches, and PRs

**Jobs**:

- Simple, fast check that runs lint + test + build
- Designed to be set as a required status check in GitHub settings

**Purpose**: Lightweight check that can be required before merging PRs.

## Setting Up Required Status Checks

To make these checks required before merging:

1. Go to your repository settings
2. Navigate to **Branches** → **Branch protection rules**
3. Add a rule for `main` branch
4. Enable **Require status checks to pass before merging**
5. Select these checks:
   - `Required Checks (Lint & Test)`
   - `Lint Code`
   - `Run Tests`
   - `Build Extension`

## Local Development

Before pushing, you can run the same checks locally:

```bash
# Run linting
bun run lint

# Fix linting issues automatically
bun run lint:fix

# Run tests
bun test

# Run tests with coverage
bun test -- --coverage

# Build the extension
bun run build
```

## Workflow Features

### Coverage Reporting

Tests generate coverage reports that are uploaded to Codecov (optional, requires setup).

### Build Artifacts

Successful builds are uploaded as artifacts and kept for 7 days, useful for testing.

### PR Comments

The `pr-checks.yml` workflow posts a nicely formatted comment showing:

- ✅/❌ Status for each check
- Number of tests passed/failed
- Clear indication if PR is ready to merge

### Caching

All workflows use npm caching to speed up dependency installation.

## Customization

### Node.js Version

All workflows use Node.js 18. To change:

```yaml
node-version: '18' # Change to '20' or '16' as needed
```

### Branch Triggers

To add more branches to CI:

```yaml
on:
  push:
    branches:
      - main
      - develop
      - staging # Add custom branches here
```

### Required Checks

To make checks less strict during development, you can:

1. Use `continue-on-error: true` for non-critical jobs
2. Remove the final `all-checks` job
3. Only require `required-checks.yml` for PRs

## Troubleshooting

### "bun install" fails

- Check that `package-lock.json` is committed
- Verify Node.js version compatibility

### Tests fail on CI but pass locally

- Check for environment-specific code
- Verify timezone/locale differences
- Look for race conditions in async tests

### Permissions errors on PR comments

- Ensure workflow has `pull-requests: write` permission
- Check repository settings → Actions → General → Workflow permissions

## Dependencies

These workflows use the following GitHub Actions:

- `actions/checkout@v4` - Checkout repository code
- `actions/setup-node@v4` - Setup Node.js environment
- `actions/upload-artifact@v4` - Upload build artifacts
- `actions/github-script@v7` - Run JavaScript in workflow (for PR comments)
- `codecov/codecov-action@v4` - Upload coverage reports (optional)
