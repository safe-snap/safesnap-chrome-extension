/**
 * SafeSnap E2E Scenario Configurations
 *
 * This file defines test scenarios for the SafeSnap E2E test runner.
 * Each scenario navigates to a URL and captures screenshots at configurable steps.
 *
 * USAGE:
 *   Run all scenarios:     bunx playwright test test/e2e/scenarios.spec.js
 *   Run specific scenario: bunx playwright test test/e2e/scenarios.spec.js -g "scenario-name"
 *   Run headed (visible):  bunx playwright test test/e2e/scenarios.spec.js --headed
 *
 * ADDING A NEW SCENARIO:
 *   1. Add a new object to the SCENARIOS array below
 *   2. Run the test to generate screenshots in test/screenshots/<scenario-name>/
 *
 * SCENARIO OPTIONS:
 *   - name: string          - Unique identifier (used for screenshot folder)
 *   - description: string   - What the scenario tests
 *   - url: string           - Page URL to test
 *   - enabledTypes: array   - PII types to detect (see list at bottom)
 *   - viewport: object      - { width, height } in pixels
 *   - waitAfterLoad: number - Delay after page load (ms)
 *   - headed: boolean       - Force visible browser (for bot-protected sites)
 *   - slowMo: number        - Slow down actions by ms (helps with bot detection)
 *   - waitForUser: boolean  - Pause and wait for user to bypass bot protection (requires headed)
 *   - skipInCI: boolean     - Skip this scenario in CI environment
 *   - steps: array          - Screenshot sequence (see AVAILABLE STEPS below)
 *   - zoom: number           - Page zoom level (0.5 = 50%, 1 = 100%, default: 1)
 *   - protectionMode: string - 'random' (fake data) or 'blackout' (redact), default: 'random'
 *   - properNounSensitivity: number - Detection threshold 0-1 (0.5=more, 0.9=fewer), default: 0.75
 *
 * AVAILABLE STEPS:
 *   - 'original'             - Page before SafeSnap injection
 *   - 'highlighted'          - PII highlighted with overlay
 *   - 'protected'            - PII replaced, highlights removed
 *   - 'protected-highlighted' - PII replaced WITH highlights visible
 *
 * DEFAULT STEPS (if not specified):
 *   ['original', 'highlighted', 'protected']
 */

// Default step sequence if not specified in scenario
const DEFAULT_STEPS = ['original', 'highlighted', 'protected'];

const SCENARIOS = [
  // -------------------------------------------------------------------------
  // Calculator.net - Tax calculator with financial PII
  // -------------------------------------------------------------------------
  {
    name: 'calculator-net-tax',
    description: 'Tax calculator with income, withholding, and deduction data',
    url: 'https://www.calculator.net/tax-calculator.html?cfilestatus=MarriedJoint&callowance=2&callowanceold=0&ctaxyear=2025&cage=30&csalaryincome=125%2C000&cwithheld=26%2C000&csalarystate=12%2C000&csalarylocal=0&chasbusiness=no&cbusinessincome=0&cestimatedtax=0&cmedicarewage=0&cage2=30&csalaryincome2=122%2C000&cwithheld2=40%2C000&csalarystate2=11%2C000&csalarylocal2=0&chasbusiness2=no&cbusinessincome2=0&cestimatedtax2=0&cmedicarewage2=0&cssincome=0&cinterestincome=0&cordinarydividends=1%2C111&cqualifieddividends=0&crentalincome=0&cshortcapitalgain=0&clongcapitalgain=0&cotherincome=0&cstatetaxrate=0&ctips=0&covertime=0&ccar=0&cira=0&csalestax=0&cmortgage=23%2C444&cdonations=02%2C222&cstudentloan=0&cchildcare=0&ctuition=0&ctuition2=0&ctuition3=0&ctuition4=0&cotherdeductable=0&printit=0&x=Calculate',
    enabledTypes: ['money', 'quantities', 'dates', 'properNouns'],
    viewport: { width: 1280, height: 1200 },
    waitAfterLoad: 2000,
    steps: ['original', 'highlighted', 'protected'],
    properNounSensitivity: 1, // Lower threshold = more detections
    protectionMode: 'random',
  },

  // -------------------------------------------------------------------------
  // LinkedIn - Profile page with names, locations, job titles
  // -------------------------------------------------------------------------
  {
    name: 'linkedin-profile',
    description: 'LinkedIn profile page with names, locations, job titles',
    url: 'https://www.linkedin.com/in/satyanadella/',
    enabledTypes: ['dates', 'properNouns', 'locations'],
    viewport: { width: 1280, height: 1200 },
    waitAfterLoad: 2000,
    headed: true, // LinkedIn has bot protection
    slowMo: 2000,
    steps: ['original', 'highlighted', 'protected'],
    properNounSensitivity: 0.75, // Lower threshold = more detections
    protectionMode: 'blackout',
  },

  // -------------------------------------------------------------------------
  // Zillow - Real estate listing with address, price, and property details
  // -------------------------------------------------------------------------
  {
    name: 'zillow-listing',
    description: 'Zillow property listing with address, price, and details',
    url: 'https://www.zillow.com/homedetails/479-Kentucky-Ave-Berkeley-CA-94707/24847894_zpid/',
    enabledTypes: ['money', 'quantities', 'dates', 'properNouns', 'locations', 'addresses'],
    viewport: { width: 1280, height: 1400 },
    waitAfterLoad: 5000,
    headed: true, // Zillow has bot protection
    slowMo: 2000,
    waitForUser: true, // Pause for user to solve captcha/bot protection
    skipInCI: true,
    steps: ['original', 'highlighted', 'protected'],
    protectionMode: 'random',
  },

  // -------------------------------------------------------------------------
  // Wikipedia - Good for testing without bot protection
  // -------------------------------------------------------------------------
  {
    name: 'wikipedia-san-francisco-blackout',
    description: 'Wikipedia article about San Francisco',
    url: 'https://en.wikipedia.org/wiki/San_Francisco',
    enabledTypes: ['dates', 'properNouns', 'quantities', 'locations'],
    viewport: { width: 1280, height: 900 },
    waitAfterLoad: 2000,
    zoom: 1, // 50% zoom
    properNounSensitivity: 0.95, // Lower threshold = more detections
    steps: ['original', 'highlighted', 'protected'],
    protectionMode: 'blackout', // Use blackout mode for this scenario
    // Uses default steps: ['original', 'highlighted', 'protected']
  },

  // -------------------------------------------------------------------------
  // News sites - Require headed mode to bypass bot protection
  // -------------------------------------------------------------------------
  {
    name: 'sfgate-united-article',
    description: 'SFGate news article (requires headed mode)',
    url: 'https://www.sfgate.com/travel/article/united-unveiling-most-luxurious-jet-two-major-sfo-21297088.php',
    enabledTypes: ['dates', 'properNouns', 'quantities', 'locations'],
    viewport: { width: 1280, height: 1900 },
    waitAfterLoad: 5000,
    headed: true, // Force visible browser to bypass bot detection
    slowMo: 100, // Slow down to appear more human-like
    zoom: 1, // 100% zoom
    properNounSensitivity: 0.95, // Lower threshold = more detections
    steps: ['original', 'highlighted', 'protected', 'protected-highlighted'],
    // Uses default steps: ['original', 'highlighted', 'protected']
  },

  // -------------------------------------------------------------------------
  // Example: Custom step sequences
  // -------------------------------------------------------------------------
  // {
  //   name: 'protection-only',
  //   description: 'Show only original and protected (skip highlights)',
  //   url: 'https://en.wikipedia.org/wiki/Main_Page',
  //   enabledTypes: ['dates', 'properNouns'],
  //   viewport: { width: 1280, height: 900 },
  //   waitAfterLoad: 2000,
  //   steps: ['original', 'protected'],  // Skip highlighted step
  // },
  //
  // {
  //   name: 'full-sequence',
  //   description: 'All four screenshot types',
  //   url: 'https://en.wikipedia.org/wiki/Main_Page',
  //   enabledTypes: ['dates', 'properNouns'],
  //   viewport: { width: 1280, height: 900 },
  //   waitAfterLoad: 2000,
  //   steps: ['original', 'highlighted', 'protected', 'protected-highlighted'],
  // },
  //
  // {
  //   name: 'highlights-comparison',
  //   description: 'Compare protected with and without highlights',
  //   url: 'https://en.wikipedia.org/wiki/Main_Page',
  //   enabledTypes: ['dates', 'properNouns'],
  //   viewport: { width: 1280, height: 900 },
  //   waitAfterLoad: 2000,
  //   steps: ['original', 'protected', 'protected-highlighted'],
  // },

  // -------------------------------------------------------------------------
  // Example: Testing specific PII types
  // -------------------------------------------------------------------------
  // {
  //   name: 'email-detection-test',
  //   description: 'Page with email addresses',
  //   url: 'https://example.com/contact',
  //   enabledTypes: ['emails'],
  //   viewport: { width: 1280, height: 900 },
  //   waitAfterLoad: 2000,
  // },

  // -------------------------------------------------------------------------
  // Example: Mobile viewport
  // -------------------------------------------------------------------------
  // {
  //   name: 'mobile-test',
  //   description: 'Mobile viewport test',
  //   url: 'https://en.wikipedia.org/wiki/Main_Page',
  //   enabledTypes: ['dates', 'properNouns'],
  //   viewport: { width: 375, height: 812 },  // iPhone X dimensions
  //   waitAfterLoad: 2000,
  // },
];

// Available PII types for reference:
// - 'dates'       - Date patterns (Jan 15, 2024, 01/15/2024, etc.)
// - 'properNouns' - Names and proper nouns
// - 'quantity'    - Numbers and quantities
// - 'locations'   - Place names and addresses
// - 'emails'      - Email addresses
// - 'phones'      - Phone numbers
// - 'ssn'         - Social Security Numbers
// - 'creditCards' - Credit card numbers
// - 'money'       - Currency amounts ($100, €50, etc.)
// - 'ipAddresses' - IP addresses

module.exports = { SCENARIOS, DEFAULT_STEPS };
