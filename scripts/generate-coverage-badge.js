#!/usr/bin/env node

/**
 * Generate a coverage badge SVG file from Jest coverage data
 * No external dependencies or services required
 */

/* eslint-env node */

const fs = require('fs');
const path = require('path');

// Read coverage summary
const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error('Error: coverage-summary.json not found. Run tests with coverage first.');
  process.exit(1);
}

const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const total = coverageData.total;

// Extract line coverage (the most intuitive metric)
const lines = total.lines.pct;

/**
 * Get badge color based on coverage percentage
 * @param {number} pct - Coverage percentage
 * @returns {string} - Color code
 */
function getColor(pct) {
  if (pct >= 90) return '#4c1'; // bright green
  if (pct >= 80) return '#97ca00'; // green
  if (pct >= 70) return '#a4a61d'; // yellow-green
  if (pct >= 60) return '#dfb317'; // yellow
  if (pct >= 50) return '#fe7d37'; // orange
  return '#e05d44'; // red
}

/**
 * Generate SVG badge
 * @param {string} label - Left side text
 * @param {string} value - Right side text
 * @param {string} color - Badge color
 * @returns {string} - SVG content
 */
function generateBadge(label, value, color) {
  // Calculate widths based on text length (approximate)
  const labelWidth = label.length * 6 + 10;
  const valueWidth = value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${(labelWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${label.length * 6 * 10}">${label}</text>
    <text x="${(labelWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${label.length * 6 * 10}">${label}</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${value.length * 7 * 10}">${value}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${value.length * 7 * 10}">${value}</text>
  </g>
</svg>`;
}

// Create badges directory
const badgesDir = path.join(__dirname, '../.github/badges');
if (!fs.existsSync(badgesDir)) {
  fs.mkdirSync(badgesDir, { recursive: true });
}

// Use lines coverage as the single metric (most intuitive)
// Lines coverage shows what % of your code lines are executed by tests
const coverage = lines;
const color = getColor(parseFloat(coverage));
const badge = generateBadge('coverage', `${coverage}%`, color);
fs.writeFileSync(path.join(badgesDir, 'coverage.svg'), badge);

// Output summary
console.log('✅ Coverage badge generated:');
console.log(`   ${coverage}% of code lines tested`);
console.log(`   Color: ${color}`);
console.log(`   Location: .github/badges/coverage.svg`);
