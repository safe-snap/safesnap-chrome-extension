// Jest setup file for Chrome extension testing
require('jest-webextension-mock');

/**
 * Seeded pseudo-random number generator (mulberry32)
 * Makes tests deterministic while still testing randomness logic
 * @param {number} seed - Initial seed value
 * @returns {function} Function that returns next random number [0, 1)
 */
function createSeededRandom(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Store original Math.random
const originalMathRandom = Math.random;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Seed Math.random with a deterministic value for reproducible tests
  // Using the test name hash or a fixed seed
  const seed = 12345;
  const seededRandom = createSeededRandom(seed);
  Math.random = seededRandom;
});

// Restore original Math.random after all tests
afterAll(() => {
  Math.random = originalMathRandom;
});
