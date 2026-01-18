/**
 * Debug test to understand the date replacement bug
 * Run with: node debug-date-test.js
 */

// Simulate the text
const text = 'Article published on Jan 17, 2026';

// Simulate what detectInDOM should do after our fix
console.log('=== SIMULATION OF DATE BUG ===\n');

console.log('Input:', text);
console.log('');

// Simulate detection with quantities-only enabled
console.log('User Settings: Quantities ENABLED, Dates DISABLED');
console.log('');

// Step 1: Detect ALL types (internal)
console.log('Step 1: Internal detection (ALL types):');
const allDetected = [
  { type: 'date', original: 'Jan 17, 2026', start: 23, end: 36, confidence: 0.8 },
  { type: 'quantity', original: '17', start: 27, end: 29, confidence: 1.0 },
];
console.log('  - Date "Jan 17, 2026" at positions 23-36');
console.log('  - Quantity "17" at positions 27-29');
console.log('');

// Step 2: Deduplication (date priority 90 > quantity priority 60)
console.log('Step 2: Deduplication (date priority 90 > quantity priority 60):');
const afterDedup = [
  { type: 'date', original: 'Jan 17, 2026', start: 23, end: 36, confidence: 0.8 },
];
console.log('  - Date "Jan 17, 2026" KEPT (higher priority)');
console.log('  - Quantity "17" REMOVED (overlaps with date)');
console.log('');

// Step 3: Filter by enabled types
console.log('Step 3: Filter by enabledTypes (["quantity"]):');
const afterFilter = [];
console.log('  - Date "Jan 17, 2026" FILTERED OUT (not in enabledTypes)');
console.log('  Result: EMPTY array');
console.log('');

// Step 4: Generate replacements
console.log('Step 4: Generate replacements:');
console.log('  - replacementMap is EMPTY (no entities to replace)');
console.log('');

// Step 5: Apply replacements
console.log('Step 5: Apply replacements:');
console.log('  - NO replacements applied');
console.log('  - Final text: "Article published on Jan 17, 2026"');
console.log('');

console.log('=== EXPECTED BEHAVIOR: NO REPLACEMENT ===');
console.log('');

console.log('But the user reports: "Jan 17, 2026 is replaced as a quantity"');
console.log('');
console.log('POSSIBLE CAUSES:');
console.log('1. Deduplication is not working correctly');
console.log('2. Filtering is not working correctly');
console.log('3. There are multiple detection calls happening');
console.log('4. The replacement logic is using a different detection result');
console.log('5. The issue only happens when dates span multiple text nodes');
console.log('');

console.log('To debug further, we need:');
console.log('- Console logs from the actual browser');
console.log('- The exact HTML structure where the bug occurs');
console.log('- Whether the bug is consistent or intermittent');
