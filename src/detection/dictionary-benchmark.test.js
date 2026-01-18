/**
 * Dictionary Benchmark Test
 *
 * Tests the impact of dictionary size on proper noun detection accuracy.
 * Measures false positives, false negatives, and overall accuracy.
 */

import { PIIDetector } from './pii-detector.js';
import { Dictionary } from './dictionary.js';

describe('Dictionary Size Impact Analysis', () => {
  /**
   * Test Dataset - Categorized test cases
   */
  const testDataset = {
    // TRUE POSITIVES - Should be detected as proper nouns
    properNouns: {
      personNames: [
        'John Smith',
        'Maria Garcia',
        'Wei Zhang',
        'Amara Okafor',
        'Dr. Sarah Johnson',
        'Mr. David Lee',
        'Prof. Jennifer Williams',
        "James O'Brien",
        'Mary-Anne Thompson',
      ],
      companyNames: [
        'Apple Inc.',
        'Microsoft Corporation',
        'Amazon Web Services',
        'Goldman Sachs',
        'McKinsey & Company',
        'Deloitte',
        'Tesla Motors',
        'SpaceX',
        'OpenAI',
      ],
      brands: [
        'iPhone',
        'PlayStation',
        'Nike',
        'Google',
        'Facebook',
        'Twitter',
        'LinkedIn',
        'Salesforce',
        'Oracle',
      ],
      places: [
        'San Francisco',
        'New York City',
        'United States',
        'Mount Everest',
        'Pacific Ocean',
        'Main Street',
        'Golden Gate Bridge',
      ],
    },

    // TRUE NEGATIVES - Should NOT be detected (common words/phrases)
    commonPhrases: {
      sentences: [
        'The quick brown fox jumps over the lazy dog.',
        'I went to the store yesterday.',
        'She is working on a new project.',
        'We will meet at the office tomorrow.',
        'They have been friends for many years.',
      ],
      capitalizedWords: [
        // Words at sentence start (should be filtered out)
        'Today is a good day.',
        'Tomorrow we will see.',
        'Yesterday was great.',
        'Maybe we should go.',
        'Perhaps that works.',
      ],
      commonNouns: [
        'The President spoke today.', // Title, not name
        "My Doctor said it's fine.", // Generic title
        'The Manager approved it.', // Generic role
        'Call Customer Service.', // Department name
        'Visit Human Resources.', // Department name
      ],
    },

    // EDGE CASES - Tricky scenarios
    edgeCases: {
      acronyms: ['NASA', 'FBI', 'CIA', 'NATO', 'UNESCO', 'UNICEF'],
      abbreviations: ['Mr.', 'Dr.', 'Prof.', 'Inc.', 'Corp.', 'Ltd.'],
      mixedContext: [
        'John went to the store.', // Name + common words
        'Apple sells iPhones in stores.', // Brand + common phrase
        'I work at Microsoft.', // Sentence start + company
        'Meet me at Starbucks tomorrow.', // Place + time
      ],
      falsePositiveTriggers: [
        'I AM NOT SHOUTING', // All caps
        'THIS IS IMPORTANT', // All caps
        'Customer Success Team', // Title Case phrase
        'Product Development Manager', // Role title
      ],
    },
  };

  /**
   * Helper: Create detector with custom dictionary
   */
  async function createDetectorWithDictionary(words) {
    const detector = new PIIDetector();
    detector.dictionary = new Dictionary();
    detector.dictionary.coreDictionary = new Set(words.map((w) => w.toLowerCase()));
    detector.dictionary.isCoreDictionaryLoaded = true;
    await detector.initialize(); // Properly initialize detector
    return detector;
  }

  /**
   * Helper: Calculate metrics for detection results
   */
  function calculateMetrics(results) {
    const { truePositives, falsePositives, trueNegatives, falseNegatives } = results;

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const accuracy =
      (truePositives + trueNegatives) /
        (truePositives + trueNegatives + falsePositives + falseNegatives) || 0;
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;

    return {
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      precision: (precision * 100).toFixed(2) + '%',
      recall: (recall * 100).toFixed(2) + '%',
      accuracy: (accuracy * 100).toFixed(2) + '%',
      f1Score: f1Score.toFixed(4),
    };
  }

  /**
   * Helper: Run detection test suite
   */
  async function runDetectionTests(detector, dataset) {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    const detailedResults = {
      properNouns: { detected: [], missed: [] },
      commonPhrases: { correct: [], falseDetections: [] },
      edgeCases: { detected: [], missed: [] },
    };

    // Test proper nouns (should be detected)
    for (const category in dataset.properNouns) {
      for (const text of dataset.properNouns[category]) {
        const entities = detector.detectInText(text, ['properNouns']);
        const detected = entities.some((e) => e.type === 'properNoun');

        if (detected) {
          truePositives++;
          detailedResults.properNouns.detected.push({ text, category });
        } else {
          falseNegatives++;
          detailedResults.properNouns.missed.push({ text, category });
        }
      }
    }

    // Test common phrases (should NOT be detected)
    for (const category in dataset.commonPhrases) {
      for (const text of dataset.commonPhrases[category]) {
        const entities = detector.detectInText(text, ['properNouns']);
        const detected = entities.some((e) => e.type === 'properNoun');

        if (!detected) {
          trueNegatives++;
          detailedResults.commonPhrases.correct.push({ text, category });
        } else {
          falsePositives++;
          detailedResults.commonPhrases.falseDetections.push({
            text,
            category,
            detectedEntities: entities.filter((e) => e.type === 'properNoun'),
          });
        }
      }
    }

    // Test edge cases
    for (const category in dataset.edgeCases) {
      for (const text of dataset.edgeCases[category]) {
        const entities = detector.detectInText(text, ['properNouns']);
        const detected = entities.some((e) => e.type === 'properNoun');

        // For edge cases, we'll track both but won't count toward metrics
        // (since expected behavior is ambiguous)
        if (detected) {
          detailedResults.edgeCases.detected.push({ text, category });
        } else {
          detailedResults.edgeCases.missed.push({ text, category });
        }
      }
    }

    return {
      metrics: calculateMetrics({
        truePositives,
        falsePositives,
        trueNegatives,
        falseNegatives,
      }),
      details: detailedResults,
    };
  }

  /**
   * Benchmark Test 1: Current 500-word dictionary
   */
  test('Benchmark: Current 500-word dictionary', async () => {
    const detector = new PIIDetector();
    await detector.initialize();

    const results = await runDetectionTests(detector, testDataset);

    console.log('\n=== 500-WORD DICTIONARY BENCHMARK ===');
    console.log('Metrics:', JSON.stringify(results.metrics, null, 2));
    console.log('\nTrue Positives (Detected):', results.details.properNouns.detected.length);
    console.log('False Negatives (Missed):', results.details.properNouns.missed.length);
    console.log('True Negatives (Correct):', results.details.commonPhrases.correct.length);
    console.log('False Positives (Wrong):', results.details.commonPhrases.falseDetections.length);

    if (results.details.properNouns.missed.length > 0) {
      console.log('\nMissed Proper Nouns (examples):');
      results.details.properNouns.missed.slice(0, 5).forEach((item) => {
        console.log(`  - "${item.text}" (${item.category})`);
      });
    }

    if (results.details.commonPhrases.falseDetections.length > 0) {
      console.log('\nFalse Positives (examples):');
      results.details.commonPhrases.falseDetections.slice(0, 5).forEach((item) => {
        console.log(`  - "${item.text}" (${item.category})`);
      });
    }

    // Store for comparison
    expect(results.metrics).toBeDefined();
  }, 30000);

  /**
   * Benchmark Test 2: Simulated 20K dictionary
   */
  test('Benchmark: Simulated 20K dictionary', async () => {
    // Get 20K most common English words
    // For now, we'll simulate by loading a larger set
    const common20k = await fetch20kDictionary();
    const detector = await createDetectorWithDictionary(common20k);

    const results = await runDetectionTests(detector, testDataset);

    console.log('\n=== 20K-WORD DICTIONARY BENCHMARK ===');
    console.log('Metrics:', JSON.stringify(results.metrics, null, 2));
    console.log('\nTrue Positives (Detected):', results.details.properNouns.detected.length);
    console.log('False Negatives (Missed):', results.details.properNouns.missed.length);
    console.log('True Negatives (Correct):', results.details.commonPhrases.correct.length);
    console.log('False Positives (Wrong):', results.details.commonPhrases.falseDetections.length);

    expect(results.metrics).toBeDefined();
  }, 30000);

  /**
   * Comparison Test: Side-by-side analysis
   */
  test('Comparison: 500-word vs 20K', async () => {
    console.log('\n=== DICTIONARY SIZE COMPARISON ===\n');

    // Test with each dictionary size
    const sizes = [
      { name: '500-word (current)', words: await fetchCurrentDictionary() },
      { name: '20K-word', words: await fetch20kDictionary() },
    ];

    const comparisonResults = [];

    for (const { name, words } of sizes) {
      const detector = await createDetectorWithDictionary(words);
      const results = await runDetectionTests(detector, testDataset);

      comparisonResults.push({
        name,
        dictionarySize: words.length,
        ...results.metrics,
      });
    }

    // Print comparison table
    console.log(
      'Dictionary Size | TP  | FP  | TN  | FN  | Precision | Recall | Accuracy | F1 Score'
    );
    console.log('-'.repeat(90));

    comparisonResults.forEach((result) => {
      console.log(
        `${result.name.padEnd(15)} | ` +
          `${String(result.truePositives).padStart(3)} | ` +
          `${String(result.falsePositives).padStart(3)} | ` +
          `${String(result.trueNegatives).padStart(3)} | ` +
          `${String(result.falseNegatives).padStart(3)} | ` +
          `${result.precision.padStart(9)} | ` +
          `${result.recall.padStart(6)} | ` +
          `${result.accuracy.padStart(8)} | ` +
          `${result.f1Score.padStart(8)}`
      );
    });

    // Calculate improvements
    const baseline = comparisonResults[0];
    const improved20k = comparisonResults[1];

    console.log('\n=== IMPROVEMENT ANALYSIS ===');
    console.log(`20K vs 500-word:`);
    console.log(`  Accuracy: ${parseFloat(improved20k.accuracy) - parseFloat(baseline.accuracy)}%`);
    console.log(`  F1 Score: ${parseFloat(improved20k.f1Score) - parseFloat(baseline.f1Score)}`);

    expect(comparisonResults).toHaveLength(2);
  }, 60000);
});

/**
 * Helper Functions to Load Different Dictionary Sizes
 */

async function fetchCurrentDictionary() {
  // Load the current ~500-word dictionary from en.js
  const { enDictionary } = await import('../dictionaries/en.js');
  return enDictionary.commonWords || [];
}

async function fetch20kDictionary() {
  // Load real 20K dictionary from Google's Trillion Word Corpus
  // Source: https://github.com/first20hours/google-10000-english (20k.txt)
  const fs = require('fs');
  const path = require('path');
  // eslint-disable-next-line no-undef
  const filePath = path.join(__dirname, '../../test-data/20k.txt');
  const text = fs.readFileSync(filePath, 'utf8');
  return text.split('\n').filter((word) => word.trim() !== '');
}
