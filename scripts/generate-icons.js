#!/usr/bin/env node
/**
 * Generate PNG icons from SVG
 * 
 * This script requires one of the following tools to be installed:
 * - ImageMagick (convert or magick)
 * - rsvg-convert (from librsvg)
 * - Inkscape
 * 
 * Install one with:
 * - macOS: brew install imagemagick or brew install librsvg
 * - Ubuntu: apt-get install imagemagick or apt-get install librsvg2-bin
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icons/logo.svg');
const iconsDir = path.join(__dirname, '../assets/icons');

const sizes = [16, 48, 128];

// Check which tool is available
function findConversionTool() {
  const tools = [
    { cmd: 'rsvg-convert', test: 'rsvg-convert --version', convert: (size) => `rsvg-convert -w ${size} -h ${size} -b none "${svgPath}" -o "${iconsDir}/icon${size}.png"` },
    { cmd: 'inkscape', test: 'inkscape --version', convert: (size) => `inkscape "${svgPath}" -o "${iconsDir}/icon${size}.png" -w ${size} -h ${size}` },
    { cmd: 'magick', test: 'magick --version', convert: (size) => `magick "${svgPath}" -background none -resize ${size}x${size} "${iconsDir}/icon${size}.png"` },
    { cmd: 'convert', test: 'convert --version', convert: (size) => `convert -background none "${svgPath}" -resize ${size}x${size} "${iconsDir}/icon${size}.png"` },
  ];

  for (const tool of tools) {
    try {
      execSync(tool.test, { stdio: 'ignore' });
      return tool;
    } catch (e) {
      continue;
    }
  }
  return null;
}

console.log('SafeSnap Icon Generator');
console.log('======================\n');

const tool = findConversionTool();

if (!tool) {
  console.error('❌ No image conversion tool found!');
  console.error('\nPlease install one of the following:');
  console.error('  - macOS:  brew install imagemagick');
  console.error('           brew install librsvg');
  console.error('  - Linux:  apt-get install imagemagick');
  console.error('           apt-get install librsvg2-bin');
  console.error('\nAlternatively, you can manually convert logo.svg to PNG files using:');
  console.error('  - Online tool: https://cloudconvert.com/svg-to-png');
  console.error('  - Figma, Sketch, or any image editor\n');
  process.exit(1);
}

console.log(`✓ Using: ${tool.cmd}\n`);

// Generate icons
for (const size of sizes) {
  try {
    const cmd = tool.convert(size);
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ Generated icon${size}.png`);
  } catch (error) {
    console.error(`✗ Failed to generate icon${size}.png`);
    process.exit(1);
  }
}

console.log('\n✓ All icons generated successfully!');
