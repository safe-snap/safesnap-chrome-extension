/**
 * SafeSnap E2E Test - Scenario Runner
 *
 * This test framework runs scenarios defined in scenarios.config.js.
 * Each scenario navigates to a URL and captures screenshots at configurable steps.
 *
 * USAGE:
 *   Run all scenarios:     bunx playwright test test/e2e/scenarios.spec.js
 *   Run specific scenario: bunx playwright test test/e2e/scenarios.spec.js -g "scenario-name"
 *   Run headed (visible):  bunx playwright test test/e2e/scenarios.spec.js --headed
 *
 * To add new scenarios, edit: test/e2e/scenarios.config.js
 *
 * OUTPUT:
 *   Screenshots are saved to: test/screenshots/<scenario-name>/
 *   Each screenshot has an accompanying JSON file with detection metadata:
 *   - 01-original.png + 01-original.json
 *   - 02-highlighted.png + 02-highlighted.json
 *   - etc.
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { SCENARIOS, DEFAULT_STEPS } = require('./scenarios.config.js');

// ============================================================================
// TEST INFRASTRUCTURE
// ============================================================================

const SCREENSHOTS_BASE_DIR = path.resolve(__dirname, '../screenshots');
const IS_CI = !!process.env.CI;

// Step metadata for filenames and logging
const STEP_CONFIG = {
  original: {
    filename: '01-original.png',
    emoji: '📍',
    label: 'Original page (before SafeSnap)',
  },
  highlighted: {
    filename: '02-highlighted.png',
    emoji: '🔍',
    label: 'PII highlighted',
  },
  protected: {
    filename: '03-protected.png',
    emoji: '🛡️',
    label: 'PII protected (no highlights)',
  },
  'protected-highlighted': {
    filename: '04-protected-highlighted.png',
    emoji: '🔒',
    label: 'PII protected (with highlights)',
  },
};

/**
 * Ensure screenshot directory exists for a scenario
 */
function ensureScreenshotDir(scenarioName) {
  const dir = path.join(SCREENSHOTS_BASE_DIR, scenarioName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Inject SafeSnap content script into the page
 * For strict CSP sites, we use CDP to bypass CSP restrictions
 */
async function injectSafeSnapScript(page) {
  const contentScriptPath = path.resolve(__dirname, '../../dist/content.js');
  const contentScript = fs.readFileSync(contentScriptPath, 'utf-8');

  // Check if already injected
  const alreadyInjected = await page
    .evaluate(() => window.SafeSnap !== undefined && window.SafeSnap.isInitialized)
    .catch(() => false);

  if (alreadyInjected) {
    console.log('[Test] SafeSnap already injected');
    return;
  }

  // Use CDP to bypass CSP - this injects at the browser level, not page level
  const client = await page.context().newCDPSession(page);

  try {
    await client.send('Runtime.evaluate', {
      expression: contentScript,
      awaitPromise: true,
    });
  } catch (cdpError) {
    console.error('[Test] CDP injection failed:', cdpError.message);
    // Fallback to regular injection (won't work on strict CSP sites)
    try {
      await page.addScriptTag({ path: contentScriptPath });
    } catch (pathError) {
      await page.addScriptTag({ content: contentScript });
    }
  }

  await page.waitForFunction(() => window.SafeSnap !== undefined && window.SafeSnap.isInitialized, {
    timeout: 10000,
  });

  console.log('[Test] SafeSnap content script injected and initialized');
}

/**
 * Inject banner CSS
 */
async function injectBannerCSS(page) {
  const cssPath = path.resolve(__dirname, '../../dist/banner.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf-8');
    await page.addStyleTag({ content: css });
    console.log('[Test] Banner CSS injected');
  }
}

/**
 * Get detection results from SafeSnap
 * Returns array of detected PII with type, score, breakdown, and replacement
 */
async function getDetectionMetadata(page, state) {
  // Only get metadata if SafeSnap is injected
  if (!state.safeSnapInjected) {
    return null;
  }

  try {
    const results = await page.evaluate(() => {
      if (window.SafeSnap && window.SafeSnap.getDetectionResults) {
        return window.SafeSnap.getDetectionResults();
      }
      return null;
    });
    return results;
  } catch (error) {
    console.warn(`   ⚠️ Could not get detection metadata: ${error.message}`);
    return null;
  }
}

/**
 * Save detection metadata to JSON file alongside screenshot
 */
function saveMetadata(screenshotPath, metadata, scenario, stepName) {
  const jsonPath = screenshotPath.replace(/\.png$/, '.json');

  const fullMetadata = {
    scenario: scenario.name,
    step: stepName,
    timestamp: new Date().toISOString(),
    settings: {
      enabledTypes: scenario.enabledTypes,
      properNounSensitivity: scenario.properNounSensitivity,
      protectionMode: scenario.protectionMode || 'random',
      zoom: scenario.zoom || 1,
    },
    summary: metadata
      ? {
          totalDetections: metadata.length,
          byType: metadata.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
          }, {}),
          protectedCount: metadata.filter((item) => item.meetsThreshold).length,
          rejectedCount: metadata.filter((item) => !item.meetsThreshold).length,
        }
      : null,
    detections: metadata,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(fullMetadata, null, 2));
  console.log(`   📋 Metadata saved: ${path.basename(jsonPath)}`);

  return jsonPath;
}

// ============================================================================
// STEP EXECUTORS
// ============================================================================

/**
 * State tracker for scenario execution
 */
class ScenarioState {
  constructor() {
    this.safeSnapInjected = false;
    this.settingsApplied = false;
    this.highlightsEnabled = false;
    this.piiProtected = false;
    this.zoomApplied = false;
  }
}

/**
 * Apply scenario settings to SafeSnap
 */
async function applyScenarioSettings(page, scenario, state) {
  if (state.settingsApplied) return;

  // Apply proper noun sensitivity if configured (directly to detector)
  if (scenario.properNounSensitivity !== undefined) {
    await page.evaluate((threshold) => {
      if (window.SafeSnap && window.SafeSnap.setProperNounThreshold) {
        window.SafeSnap.setProperNounThreshold(threshold);
      }
    }, scenario.properNounSensitivity);
    console.log(`   Proper noun sensitivity: ${scenario.properNounSensitivity}`);
  }

  state.settingsApplied = true;
}

/**
 * Apply zoom level to the page
 */
async function applyZoom(page, zoom) {
  if (zoom && zoom !== 1) {
    await page.evaluate((z) => {
      document.body.style.zoom = z;
    }, zoom);
    console.log(`   Zoom set to ${Math.round(zoom * 100)}%`);
  }
}

/**
 * Execute the 'original' step - capture page before SafeSnap
 */
async function executeOriginalStep(page, scenario, screenshotDir, stepNum, state) {
  const config = STEP_CONFIG.original;
  const filename = `${String(stepNum).padStart(2, '0')}-original.png`;
  console.log(`\n${config.emoji} Step ${stepNum}: ${config.label}`);

  // Apply zoom if configured and not already applied
  if (!state.zoomApplied && scenario.zoom) {
    await applyZoom(page, scenario.zoom);
    state.zoomApplied = true;
  }

  const screenshotPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`   ✅ Screenshot saved: ${filename}`);

  // Save metadata (will be null for original step since SafeSnap not injected)
  const metadata = await getDetectionMetadata(page, state);
  saveMetadata(screenshotPath, metadata, scenario, 'original');

  return screenshotPath;
}

/**
 * Execute the 'highlighted' step - show PII highlights
 */
async function executeHighlightedStep(page, scenario, screenshotDir, stepNum, state) {
  const config = STEP_CONFIG.highlighted;
  const filename = `${String(stepNum).padStart(2, '0')}-highlighted.png`;
  console.log(`\n${config.emoji} Step ${stepNum}: ${config.label}`);

  // Apply zoom if configured and not already applied
  if (!state.zoomApplied && scenario.zoom) {
    await applyZoom(page, scenario.zoom);
    state.zoomApplied = true;
  }

  // Inject SafeSnap if not already done
  if (!state.safeSnapInjected) {
    await injectBannerCSS(page);
    await injectSafeSnapScript(page);
    state.safeSnapInjected = true;
  }

  // Apply scenario settings before detection
  await applyScenarioSettings(page, scenario, state);

  // Enable highlights
  console.log(`   Enabled types: ${scenario.enabledTypes.join(', ')}`);
  await page.evaluate(async (types) => {
    if (window.SafeSnap && window.SafeSnap.highlightPII) {
      window.SafeSnap.highlightPII(types);
    }
  }, scenario.enabledTypes);

  await page.waitForTimeout(2000);
  state.highlightsEnabled = true;

  const highlightCount = await page.locator('.safesnap-highlight').count();
  console.log(`   Highlights found: ${highlightCount}`);

  const screenshotPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`   ✅ Screenshot saved: ${filename}`);

  // Save metadata with detection results
  const metadata = await getDetectionMetadata(page, state);
  saveMetadata(screenshotPath, metadata, scenario, 'highlighted');

  return screenshotPath;
}

/**
 * Execute the 'protected' step - replace PII, remove highlights
 */
async function executeProtectedStep(page, scenario, screenshotDir, stepNum, state) {
  const config = STEP_CONFIG.protected;
  const filename = `${String(stepNum).padStart(2, '0')}-protected.png`;
  const mode = scenario.protectionMode || 'random';
  console.log(`\n${config.emoji} Step ${stepNum}: ${config.label} (mode: ${mode})`);

  // Apply zoom if configured and not already applied
  if (!state.zoomApplied && scenario.zoom) {
    await applyZoom(page, scenario.zoom);
    state.zoomApplied = true;
  }

  // Inject SafeSnap if not already done
  if (!state.safeSnapInjected) {
    await injectBannerCSS(page);
    await injectSafeSnapScript(page);
    state.safeSnapInjected = true;
  }

  // Apply scenario settings before detection
  await applyScenarioSettings(page, scenario, state);

  // Remove highlights if they exist (use proper API)
  if (state.highlightsEnabled) {
    await page.evaluate(() => {
      if (window.SafeSnap && window.SafeSnap.disableHighlights) {
        window.SafeSnap.disableHighlights();
      }
    });
    await page.waitForTimeout(500);
    state.highlightsEnabled = false;
  }

  // Protect PII if not already done
  if (!state.piiProtected) {
    // Set protection mode setting before protecting
    await page.evaluate((redactionMode) => {
      if (window.SafeSnap && window.SafeSnap.setSetting) {
        window.SafeSnap.setSetting('redactionMode', redactionMode);
      }
    }, mode);

    await page.evaluate(async (types) => {
      if (window.SafeSnap && window.SafeSnap.protectPII) {
        await window.SafeSnap.protectPII(types);
      }
    }, scenario.enabledTypes);
    await page.waitForTimeout(2000);
    state.piiProtected = true;
  }

  const screenshotPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`   ✅ Screenshot saved: ${filename}`);

  // Save metadata with detection results (includes replacements after protection)
  const metadata = await getDetectionMetadata(page, state);
  saveMetadata(screenshotPath, metadata, scenario, 'protected');

  return screenshotPath;
}

/**
 * Execute the 'protected-highlighted' step - replace PII AND show highlights
 */
async function executeProtectedHighlightedStep(page, scenario, screenshotDir, stepNum, state) {
  const config = STEP_CONFIG['protected-highlighted'];
  const filename = `${String(stepNum).padStart(2, '0')}-protected-highlighted.png`;
  const mode = scenario.protectionMode || 'random';
  console.log(`\n${config.emoji} Step ${stepNum}: ${config.label} (mode: ${mode})`);

  // Apply zoom if configured and not already applied
  if (!state.zoomApplied && scenario.zoom) {
    await applyZoom(page, scenario.zoom);
    state.zoomApplied = true;
  }

  // Inject SafeSnap if not already done
  if (!state.safeSnapInjected) {
    await injectBannerCSS(page);
    await injectSafeSnapScript(page);
    state.safeSnapInjected = true;
  }

  // Apply scenario settings before detection
  await applyScenarioSettings(page, scenario, state);

  // Protect PII if not already done
  if (!state.piiProtected) {
    // Set protection mode setting before protecting
    await page.evaluate((redactionMode) => {
      if (window.SafeSnap && window.SafeSnap.setSetting) {
        window.SafeSnap.setSetting('redactionMode', redactionMode);
      }
    }, mode);

    await page.evaluate(async (types) => {
      if (window.SafeSnap && window.SafeSnap.protectPII) {
        await window.SafeSnap.protectPII(types);
      }
    }, scenario.enabledTypes);
    await page.waitForTimeout(2000);
    state.piiProtected = true;
  }

  // Enable highlights (after protection)
  if (!state.highlightsEnabled) {
    console.log(`   Enabled types: ${scenario.enabledTypes.join(', ')}`);
    await page.evaluate(async (types) => {
      if (window.SafeSnap && window.SafeSnap.highlightPII) {
        window.SafeSnap.highlightPII(types);
      }
    }, scenario.enabledTypes);
    await page.waitForTimeout(2000);
    state.highlightsEnabled = true;
  }

  const highlightCount = await page.locator('.safesnap-highlight').count();
  console.log(`   Highlights on protected content: ${highlightCount}`);

  const screenshotPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`   ✅ Screenshot saved: ${filename}`);

  // Save metadata with detection results (includes replacements)
  const metadata = await getDetectionMetadata(page, state);
  saveMetadata(screenshotPath, metadata, scenario, 'protected-highlighted');

  return screenshotPath;
}

// Map step names to executor functions
const STEP_EXECUTORS = {
  original: executeOriginalStep,
  highlighted: executeHighlightedStep,
  protected: executeProtectedStep,
  'protected-highlighted': executeProtectedHighlightedStep,
};

// ============================================================================
// SCENARIO RUNNER
// ============================================================================

/**
 * Run a scenario through its configured steps
 */
async function runScenario(page, scenario) {
  const screenshotDir = ensureScreenshotDir(scenario.name);
  const steps = scenario.steps || DEFAULT_STEPS;
  const state = new ScenarioState();
  const screenshots = [];

  // Set viewport
  await page.setViewportSize(scenario.viewport);

  // Set up console logging (filter out verbose debug messages)
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('SafeSnap') && !text.includes('Debug') && !text.includes('Overlap')) {
      console.log(`[PAGE] ${text}`);
    }
  });

  // -------------------------------------------------------------------------
  // Navigate to URL
  // -------------------------------------------------------------------------
  console.log(`\n📄 Navigating to ${scenario.url}`);
  await page.goto(scenario.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(scenario.waitAfterLoad);

  const pageTitle = await page.title();
  console.log(`   Page title: ${pageTitle}`);

  // Check for bot detection pages
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  const pageIsBlank = !pageTitle || pageTitle.trim() === '';
  const hasBotDetection =
    bodyText.includes('Access to this page has been denied') ||
    bodyText.includes('Press & Hold') ||
    bodyText.includes('Verify you are human') ||
    bodyText.includes('captcha') ||
    bodyText.includes('unusual traffic');

  if (pageIsBlank || hasBotDetection) {
    console.log(`   ⚠️ Page appears blocked or blank!`);
    if (hasBotDetection) {
      console.log(`   Bot detection text found: ${bodyText.substring(0, 100)}...`);
    }

    if (scenario.waitForUser && scenario.headed) {
      console.log(`\n   ⏸️  PAUSED: Interact with the browser to bypass bot protection.`);
      console.log(
        `   📝 When the page loads correctly, press Enter in the terminal to continue...`
      );

      // Wait for user to press Enter
      await new Promise((resolve) => {
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('', () => {
          rl.close();
          resolve();
        });
      });

      // Give the page a moment to stabilize after user interaction
      await page.waitForTimeout(2000);
      const newTitle = await page.title();
      console.log(`   ▶️  Resuming... Page title: ${newTitle}`);
    } else if (!scenario.headed) {
      console.log(
        `   💡 Tip: Add "headed: true" and "waitForUser: true" to interact with bot protection`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Execute each configured step
  // -------------------------------------------------------------------------
  console.log(`\n📋 Steps to execute: ${steps.join(' → ')}`);

  for (let i = 0; i < steps.length; i++) {
    const stepName = steps[i];
    const stepNum = i + 1;

    const executor = STEP_EXECUTORS[stepName];
    if (!executor) {
      throw new Error(
        `Unknown step type: "${stepName}". Valid steps: ${Object.keys(STEP_EXECUTORS).join(', ')}`
      );
    }

    const screenshotPath = await executor(page, scenario, screenshotDir, stepNum, state);
    screenshots.push(screenshotPath);
  }

  // -------------------------------------------------------------------------
  // Verify all screenshots were created
  // -------------------------------------------------------------------------
  for (const screenshotPath of screenshots) {
    expect(fs.existsSync(screenshotPath)).toBe(true);
  }

  console.log(`\n✅ Scenario "${scenario.name}" completed!`);
  console.log(`   📁 Screenshots: ${screenshotDir}`);
  console.log(`   📸 Files: ${screenshots.map((s) => path.basename(s)).join(', ')}`);

  return { screenshots, state };
}

/**
 * Run a scenario with a custom browser launch (for headed mode)
 */
async function runScenarioWithCustomBrowser(scenario) {
  const extensionPath = path.resolve(__dirname, '../../dist');

  // Launch browser with custom options
  const browser = await chromium.launch({
    headless: false, // Visible browser
    slowMo: scenario.slowMo || 0,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Additional args to appear more like a real browser
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
    ],
  });

  const context = await browser.newContext({
    viewport: scenario.viewport,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    await runScenario(page, scenario);
  } finally {
    await browser.close();
  }
}

// ============================================================================
// TEST DEFINITIONS
// ============================================================================

test.describe('SafeSnap Scenarios', () => {
  test.setTimeout(120000);

  // Generate a test for each scenario defined in scenarios.config.js
  for (const scenario of SCENARIOS) {
    // Skip CI-only scenarios when running in CI
    if (scenario.skipInCI && IS_CI) {
      test.skip(`${scenario.name}: ${scenario.description}`, async () => {
        console.log(`Skipping "${scenario.name}" in CI environment`);
      });
      continue;
    }

    // For headed scenarios, use custom browser launch
    if (scenario.headed) {
      test(`${scenario.name}: ${scenario.description}`, async () => {
        await runScenarioWithCustomBrowser(scenario);
      });
    } else {
      // Standard scenarios use the default Playwright page
      test(`${scenario.name}: ${scenario.description}`, async ({ page }) => {
        await runScenario(page, scenario);
      });
    }
  }
});
