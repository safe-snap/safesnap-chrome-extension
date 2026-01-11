# GitHub Actions CI/CD Setup

## Overview

GitHub Actions have been configured to automatically test and validate all commits and pull requests. This ensures code quality and prevents broken code from being merged.

## What Was Added

### 1. Workflow Files (`.github/workflows/`)

Three workflow files were created:

#### `required-checks.yml` (Recommended for Required Status Checks)

- **Fastest and simplest** check
- Runs on: Push to main/develop/feature/fix branches, and all PRs
- Checks: Lint → Test → Build
- **Use this as your required status check** in branch protection rules

#### `ci.yml` (Comprehensive CI Pipeline)

- **Most comprehensive** check with detailed reporting
- Runs on: Push to main/develop, and all PRs
- Jobs: Lint, Test (with coverage), Build, Final gate
- Uploads build artifacts (kept for 7 days)
- Optional: Codecov integration for coverage reports

#### `pr-checks.yml` (PR Quality Report)

- **Best for PR feedback** with formatted comments
- Runs on: PRs only (opened, updated)
- Posts a comment showing check results in a nice table
- Updates comment on each push (doesn't spam)
- Shows pass/fail status for each check

### 2. Documentation

- **`.github/workflows/README.md`**: Explains each workflow and how to use them
- **`.github/pull_request_template.md`**: Template for PR descriptions with checklist
- **Updated `CONTRIBUTING.md`**: Added section about GitHub Actions CI

## How It Works

### For Contributors

When you create a pull request:

1. **GitHub Actions automatically run** checks (you don't need to do anything)
2. **You'll see check status** at the bottom of your PR:
   - ✅ Green = Passed
   - ❌ Red = Failed (click "Details" to see why)
   - 🟡 Yellow = Running
3. **A bot posts a comment** with a summary table (from `pr-checks.yml`)
4. **You can't merge** until all required checks pass

### For Maintainers

To enforce checks before merging:

1. Go to **Settings** → **Branches**
2. Add a rule for `main` branch
3. Enable **Require status checks to pass before merging**
4. Select: `Required Checks (Lint & Test)`
5. Optionally also require: `Lint Code`, `Run Tests`, `Build Extension`

## What Gets Checked

Every PR/commit is automatically checked for:

1. **Linting**: `npm run lint`
   - Checks code style and quality
   - Must have 0 errors and 0 warnings

2. **Tests**: `npm test`
   - Runs all Jest tests
   - Must have 100% pass rate

3. **Build**: `npm run build`
   - Ensures extension builds successfully
   - Verifies manifest.json exists in dist/

## Local Development

Contributors should run these **before pushing**:

```bash
# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Build extension
npm run build
```

This ensures CI will pass when they push.

## Benefits

### ✅ Quality Assurance

- No broken code gets merged
- Consistent code style across all contributions
- Tests always pass on main branch

### ✅ Faster Reviews

- Maintainers see check status immediately
- Don't need to manually test each PR
- Can focus on code logic, not syntax errors

### ✅ Better Contributor Experience

- Clear feedback on what needs fixing
- Automated checks catch issues early
- No surprise "your code doesn't build" comments

### ✅ Protection for Main Branch

- Can't accidentally merge broken code
- Always deployable from main
- Builds are guaranteed to work

## Customization

### Change Node.js Version

All workflows use Node.js 18. To change:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20' # Change here
```

### Add More Branches

To run CI on additional branches:

```yaml
on:
  push:
    branches:
      - main
      - develop
      - staging # Add here
```

### Make Checks Less Strict

For development, you can:

1. Only require `required-checks.yml` (not individual jobs)
2. Add `continue-on-error: true` to non-critical steps
3. Remove the `all-checks` job from `ci.yml`

## Monitoring

### View Workflow Runs

- Go to **Actions** tab in your repository
- See all workflow runs and their status
- Click on a run to see detailed logs

### Build Artifacts

- Successful builds upload the `dist/` folder as an artifact
- Available in the Actions tab → Workflow run → Artifacts
- Kept for 7 days (configurable)

## Troubleshooting

### "npm ci" fails

- Ensure `package-lock.json` is committed
- Check Node.js version compatibility

### Tests pass locally but fail on CI

- Check for environment-specific code
- Verify no hardcoded paths or timezones
- Look for async/race conditions

### PR comment not posted

- Check workflow has `pull-requests: write` permission
- Go to Settings → Actions → General → Workflow permissions
- Select "Read and write permissions"

## Cost

GitHub Actions is **free** for public repositories (unlimited minutes).

For private repositories:

- Free tier: 2,000 minutes/month
- Each workflow run takes ~1-2 minutes
- ~1,000-2,000 PR checks per month on free tier

## Next Steps

1. **Push this to GitHub** to enable the workflows
2. **Set up branch protection** (see "For Maintainers" above)
3. **Test with a PR** to see checks in action
4. **Optional**: Set up Codecov for coverage reports
5. **Optional**: Add status badges to README:

```markdown
![CI](https://github.com/YOUR_ORG/safesnap-chrome-extension/workflows/CI/badge.svg)
![Tests](https://github.com/YOUR_ORG/safesnap-chrome-extension/workflows/Required%20Checks/badge.svg)
```

## Questions?

See `.github/workflows/README.md` for detailed documentation on each workflow.
