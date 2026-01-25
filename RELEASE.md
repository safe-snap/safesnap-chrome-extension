# Release Process

This document explains how to create a new release of SafeSnap Chrome Extension.

## Version Management

The extension version is managed in two places:

- `manifest.json` - Chrome extension version (required by Chrome Web Store)
- `package.json` - NPM package version (for consistency)

**Important:** These files must always have the same version number.

## How Versioning Works

1. **Single Source of Truth**: `manifest.json` is the source of truth for the version
2. **Webpack Injection**: During build, webpack reads `manifest.json` and injects the version as `__APP_VERSION__`
3. **Popup Display**: The popup's "About" tab displays this version automatically
4. **GitHub Releases**: Tagged with the same version (e.g., `v1.0.0`)

## Creating a New Release

### Step 1: Bump the Version

Use the built-in version bump script:

```bash
# Patch version (1.0.0 -> 1.0.1) - for bug fixes
bun run version patch

# Minor version (1.0.0 -> 1.1.0) - for new features
bun run version minor

# Major version (1.0.0 -> 2.0.0) - for breaking changes
bun run version major

# Specific version
bun run version 1.2.3
```

This script will:

- ✅ Update `manifest.json`
- ✅ Update `package.json`
- ✅ Print next steps

### Step 2: Update CHANGELOG.md

Edit `CHANGELOG.md` and add release notes for the new version:

```markdown
## [1.1.0] - 2024-01-15

### Added

- New feature X
- Support for Y

### Fixed

- Bug Z

### Changed

- Improved performance of...
```

### Step 3: Commit and Tag

```bash
# Stage all changes
git add manifest.json package.json CHANGELOG.md

# Commit with conventional commit format
git commit -m "chore: bump version to v0.0.3"

# Create annotated tag
git tag -a v0.0.3 -m "Release v0.0.3"

# Push commits and tags
git push origin main
git push origin v0.0.3
```

### Step 4: GitHub Actions Creates the Release

Once you push the tag, GitHub Actions will automatically:

1. ✅ Run all tests
2. ✅ Run linter
3. ✅ Build the extension
4. ✅ Package the extension as a `.zip` file
5. ✅ Verify version matches between tag and manifest
6. ✅ Extract changelog for this version
7. ✅ Create GitHub Release with:
   - Release title: "SafeSnap vX.Y.Z"
   - Release notes from CHANGELOG.md
   - Packaged extension (`.zip` file) as attachment

### Step 5: View the Release

Go to: https://github.com/safe-snap/safesnap-chrome-extension/releases

You'll see your new release with:

- Version number
- Release notes
- Download link for the packaged extension
- Automatic changelog

## Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version (1.0.0 -> 2.0.0): Breaking changes
  - Changed API behavior
  - Removed features
  - Major architectural changes

- **MINOR** version (1.0.0 -> 1.1.0): New features (backwards compatible)
  - New PII detection types
  - New settings
  - Enhanced functionality

- **PATCH** version (1.0.0 -> 1.0.1): Bug fixes (backwards compatible)
  - Bug fixes
  - Performance improvements
  - Documentation updates

## Manual Release (Alternative)

If you need to create a release manually:

```bash
# Build and package
bun run build
bun run package

# This creates: safesnap-vX.Y.Z.zip
```

Then create the release manually on GitHub:

1. Go to https://github.com/safe-snap/safesnap-chrome-extension/releases/new
2. Choose tag: Create new tag `vX.Y.Z`
3. Add title: `SafeSnap vX.Y.Z`
4. Add release notes from CHANGELOG.md
5. Upload the `.zip` file
6. Publish release

## Troubleshooting

### Version Mismatch Error

If you see "Version mismatch" in GitHub Actions:

```bash
# Check current versions
grep '"version":' manifest.json
grep '"version":' package.json

# Fix manually if needed, then:
git add manifest.json package.json
git commit --amend --no-edit
git tag -f v0.0.3  # Force update tag
git push -f origin v0.0.3
```

### Failed Release Build

If the automated release fails:

1. Check the Actions tab: https://github.com/safe-snap/safesnap-chrome-extension/actions
2. Review the error logs
3. Fix the issue locally
4. Delete the tag: `git tag -d v0.0.3 && git push origin :refs/tags/v0.0.3`
5. Start over from Step 1

## Publishing to Chrome Web Store

After creating a GitHub release:

1. Download the `.zip` file from the release
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Click on SafeSnap extension
4. Click "Package" → "Upload new package"
5. Upload the `.zip` file
6. Fill in any required changes to store listing
7. Submit for review

Chrome will review the extension (usually 1-3 business days).

## Release Checklist

Before creating a release, ensure:

- [ ] All tests pass locally (`bun run test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Build succeeds (`bun run build`)
- [ ] Extension works in Chrome (manual testing)
- [ ] CHANGELOG.md is updated
- [ ] Version number follows semantic versioning
- [ ] No sensitive data or API keys in code
- [ ] README.md is up to date

## Version History

View all releases: https://github.com/safe-snap/safesnap-chrome-extension/releases
