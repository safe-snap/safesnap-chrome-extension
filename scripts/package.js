#!/usr/bin/env node
/* eslint-env node */

/**
 * Package script for SafeSnap Chrome Extension
 * Creates a distributable .zip file from the dist folder
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const MANIFEST_PATH = path.join(DIST_DIR, 'manifest.json');

/**
 * Get version from manifest.json in dist folder
 * @returns {string} Version string
 */
function getVersion() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Error: dist/manifest.json not found. Run "bun run build" first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  return manifest.version;
}

/**
 * Create zip file of the dist folder
 * @param {string} version - Version string for the filename
 */
function createZip(version) {
  const zipFilename = `safesnap-v${version}.zip`;
  const zipPath = path.join(ROOT_DIR, zipFilename);

  // Remove existing zip if present
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
    console.log(`Removed existing ${zipFilename}`);
  }

  // Check if dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist folder not found. Run "bun run build" first.');
    process.exit(1);
  }

  // Create zip using system zip command
  try {
    // Change to dist directory and zip all contents
    execSync(`cd "${DIST_DIR}" && zip -r "${zipPath}" .`, {
      stdio: 'inherit',
    });

    // Verify zip was created
    if (fs.existsSync(zipPath)) {
      const stats = fs.statSync(zipPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`\nPackage created successfully!`);
      console.log(`  File: ${zipFilename}`);
      console.log(`  Size: ${sizeKB} KB`);
      console.log(`  Path: ${zipPath}`);
    } else {
      console.error('Error: Failed to create zip file');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error creating zip:', error.message);
    process.exit(1);
  }
}

// Main execution
console.log('Packaging SafeSnap Chrome Extension...\n');

const version = getVersion();
console.log(`Version: ${version}`);

createZip(version);

console.log('\nDone! You can now upload this file to the Chrome Web Store.');
