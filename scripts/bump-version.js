#!/usr/bin/env node
/* eslint-env node */
/**
 * Version Bump Script
 *
 * Usage:
 *   bun run version patch  # 1.0.0 -> 1.0.1
 *   bun run version minor  # 1.0.0 -> 1.1.0
 *   bun run version major  # 1.0.0 -> 2.0.0
 *   bun run version 1.2.3  # Set specific version
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const packagePath = path.join(__dirname, '..', 'package.json');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function formatVersion(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

function bumpVersion(currentVersion, type) {
  const parts = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      parts.major += 1;
      parts.minor = 0;
      parts.patch = 0;
      break;
    case 'minor':
      parts.minor += 1;
      parts.patch = 0;
      break;
    case 'patch':
      parts.patch += 1;
      break;
    default: {
      // Check if it's a specific version
      const newParts = parseVersion(type);
      return formatVersion(newParts);
    }
  }

  return formatVersion(parts);
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: bun run version <patch|minor|major|x.y.z>');
  console.error('');
  console.error('Examples:');
  console.error('  bun run version patch  # 1.0.0 -> 1.0.1');
  console.error('  bun run version minor  # 1.0.0 -> 1.1.0');
  console.error('  bun run version major  # 1.0.0 -> 2.0.0');
  console.error('  bun run version 1.2.3  # Set to 1.2.3');
  process.exit(1);
}

const versionType = args[0];

try {
  // Read current versions
  const manifest = readJSON(manifestPath);
  const packageJson = readJSON(packagePath);

  const currentVersion = manifest.version;
  const newVersion = bumpVersion(currentVersion, versionType);

  console.log(`Current version: ${currentVersion}`);
  console.log(`New version: ${newVersion}`);

  // Update manifest.json
  manifest.version = newVersion;
  writeJSON(manifestPath, manifest);
  console.log('✅ Updated manifest.json');

  // Update package.json
  packageJson.version = newVersion;
  writeJSON(packagePath, packageJson);
  console.log('✅ Updated package.json');

  console.log('');
  console.log('Next steps:');
  console.log('1. Review CHANGELOG.md and add release notes');
  console.log(
    '2. Commit the changes: git add . && git commit -m "chore: bump version to v' + newVersion + '"'
  );
  console.log(
    '3. Create and push tag: git tag v' + newVersion + ' && git push origin v' + newVersion
  );
  console.log('4. GitHub Actions will automatically create the release');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
