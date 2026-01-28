#!/usr/bin/env node
/* eslint-env node */

/**
 * Screenshot UI Script for SafeSnap Chrome Extension
 *
 * Takes screenshots and promo tiles for Chrome Web Store.
 * Uses Playwright to render the extension pages.
 *
 * Chrome Web Store requirements:
 * - Screenshots: 1280x800 or 640x400 (max 5)
 * - Small promo tile: 440x280
 * - Marquee promo tile: 1400x560
 * - Format: JPEG or 24-bit PNG (no alpha)
 *
 * Usage:
 *   bun run screenshot-ui
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots');

// Chrome Web Store dimensions
const STORE_WIDTH = 1280;
const STORE_HEIGHT = 800;
const SMALL_TILE_WIDTH = 440;
const SMALL_TILE_HEIGHT = 280;
const MARQUEE_WIDTH = 1400;
const MARQUEE_HEIGHT = 560;

// Colors for the showcase background
const COLORS = {
  primary: '#4f46e5', // Indigo - matches extension branding
  secondary: '#6366f1',
  accent: '#818cf8',
  background: '#f8fafc',
  dark: '#1e293b',
};

/**
 * Get extension ID from browser context
 */
async function getExtensionId(browser) {
  let extensionId = null;

  // Try service workers first
  const serviceWorkers = browser.serviceWorkers();
  if (serviceWorkers.length > 0) {
    const url = serviceWorkers[0].url();
    const match = url.match(/chrome-extension:\/\/([^/]+)/);
    if (match) {
      extensionId = match[1];
    }
  }

  // Try background pages
  if (!extensionId) {
    const backgroundPages = browser.backgroundPages();
    if (backgroundPages.length > 0) {
      const url = backgroundPages[0].url();
      const match = url.match(/chrome-extension:\/\/([^/]+)/);
      if (match) {
        extensionId = match[1];
      }
    }
  }

  // Fallback: wait and retry
  if (!extensionId) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const workers = browser.serviceWorkers();
    for (const worker of workers) {
      const url = worker.url();
      if (url.includes('chrome-extension://')) {
        const match = url.match(/chrome-extension:\/\/([^/]+)/);
        if (match) {
          extensionId = match[1];
          break;
        }
      }
    }
  }

  return extensionId;
}

/**
 * Create a showcase page that displays the popup centered with branding
 */
function createShowcasePage(title, description) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${STORE_WIDTH}px;
          height: ${STORE_HEIGHT}px;
          background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 50%, ${COLORS.accent} 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }
        .container {
          display: flex;
          align-items: center;
          gap: 60px;
          padding: 40px;
        }
        .text-content {
          color: white;
          max-width: 450px;
        }
        .logo {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .logo img {
          width: 64px;
          height: 64px;
          background: white;
          border-radius: 16px;
          padding: 8px;
        }
        .title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 12px;
          line-height: 1.2;
        }
        .description {
          font-size: 18px;
          opacity: 0.9;
          line-height: 1.5;
        }
        .popup-frame {
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          width: 400px;
        }
        .browser-bar {
          background: #f1f5f9;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .browser-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .dot-red { background: #ef4444; }
        .dot-yellow { background: #eab308; }
        .dot-green { background: #22c55e; }
        .popup-content {
          /* iframe will be inserted here */
        }
        iframe {
          border: none;
          width: 400px;
          height: 550px;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="text-content">
          <div class="logo">
            <img src="assets/icons/logo.svg" alt="SafeSnap" />
            SafeSnap
          </div>
          <div class="title">${title}</div>
          <div class="description">${description}</div>
        </div>
        <div class="popup-frame">
          <div class="browser-bar">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <div class="popup-content">
            <iframe id="popup-iframe" src="popup.html"></iframe>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create settings showcase page
 */
function createSettingsShowcasePage() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${STORE_WIDTH}px;
          height: ${STORE_HEIGHT}px;
          background: ${COLORS.background};
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
          color: white;
          padding: 24px 40px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header img {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 10px;
          padding: 6px;
        }
        .header-text h1 {
          font-size: 24px;
          font-weight: 700;
        }
        .header-text p {
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          flex: 1;
          overflow: hidden;
        }
        iframe {
          border: none;
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="assets/icons/logo.svg" alt="SafeSnap" />
        <div class="header-text">
          <h1>SafeSnap Advanced Settings</h1>
          <p>Customize detection, redaction modes, and more</p>
        </div>
      </div>
      <div class="content">
        <iframe src="settings.html"></iframe>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create small promo tile (440x280)
 */
function createSmallPromoTile() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${SMALL_TILE_WIDTH}px;
          height: ${SMALL_TILE_HEIGHT}px;
          background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 60%, ${COLORS.accent} 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
          text-align: center;
          padding: 30px;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }
        .logo-icon {
          width: 56px;
          height: 56px;
          background: white;
          border-radius: 14px;
          padding: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .logo-text {
          font-size: 36px;
          font-weight: 800;
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .tagline {
          font-size: 18px;
          font-weight: 600;
          color: white;
          opacity: 0.95;
          line-height: 1.4;
        }
        .badge {
          margin-top: 16px;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .shield-icon {
          width: 16px;
          height: 16px;
          fill: white;
        }
      </style>
    </head>
    <body>
      <div class="logo-container">
        <img class="logo-icon" src="assets/icons/logo.svg" alt="" />
        <span class="logo-text">SafeSnap</span>
      </div>
      <div class="tagline">Protect PII in Screenshots</div>
      <div class="badge">
        <svg class="shield-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
        </svg>
        100% Local Processing
      </div>
    </body>
    </html>
  `;
}

/**
 * Create standalone banner showcase (PII Protected banner)
 */
function createPIIProtectedBannerPage() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 500px;
          height: 200px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
          padding: 20px;
        }
        .banner {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .banner-main {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .banner-icon {
          width: 20px;
          height: 20px;
          fill: white;
        }
        .banner-title {
          font-weight: 700;
          font-size: 16px;
        }
        .banner-subtitle {
          font-size: 12px;
          opacity: 0.9;
          margin-left: 30px;
        }
      </style>
    </head>
    <body>
      <div class="banner">
        <div class="banner-main">
          <svg class="banner-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          <span class="banner-title">PII Protected</span>
        </div>
        <div class="banner-subtitle">42 entities replaced</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create standalone banner showcase (Highlights legend)
 */
function createHighlightsLegendPage() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 400px;
          height: 380px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
          padding: 20px;
        }
        .legend {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .legend-title {
          font-weight: bold;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .legend-title-icon {
          width: 18px;
          height: 18px;
          fill: #1f2937;
        }
        .legend-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .color-blue { background: rgba(59, 130, 246, 0.4); border: 2px solid #3b82f6; }
        .color-green { background: rgba(16, 185, 129, 0.4); border: 2px solid #10b981; }
        .color-orange { background: rgba(245, 158, 11, 0.4); border: 2px solid #f59e0b; }
        .color-red { background: rgba(239, 68, 68, 0.4); border: 2px solid #ef4444; }
        .color-gray { background: rgba(156, 163, 175, 0.4); border: 2px solid #9ca3af; }
        .legend-hint {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          font-size: 11px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="legend">
        <div class="legend-title">
          <svg class="legend-title-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          What SafeSnap Detects
        </div>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-color color-blue"></div>
            <span><strong>Blue:</strong> Pattern Match (Email, Phone, etc.)</span>
          </div>
          <div class="legend-item">
            <div class="legend-color color-green"></div>
            <span><strong>Green:</strong> Will be protected</span>
          </div>
          <div class="legend-item">
            <div class="legend-color color-orange"></div>
            <span><strong>Orange:</strong> Close but not protected</span>
          </div>
          <div class="legend-item">
            <div class="legend-color color-red"></div>
            <span><strong>Red:</strong> Unlikely to be protected</span>
          </div>
          <div class="legend-item">
            <div class="legend-color color-gray"></div>
            <span><strong>Gray:</strong> Not a name</span>
          </div>
        </div>
        <div class="legend-hint">
          Hover over highlights to see why
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create marquee promo tile (1400x560)
 */
function createMarqueePromoTile() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${MARQUEE_WIDTH}px;
          height: ${MARQUEE_HEIGHT}px;
          background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 50%, ${COLORS.accent} 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
          padding: 60px 80px;
        }
        .left-content {
          color: white;
          max-width: 650px;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .logo-icon {
          width: 64px;
          height: 64px;
          background: white;
          border-radius: 16px;
          padding: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .logo-text {
          font-size: 48px;
          font-weight: 800;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .headline {
          font-size: 36px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 24px;
        }
        .features {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .feature {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 500;
          opacity: 0.95;
        }
        .feature-icon {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .feature-icon svg {
          width: 18px;
          height: 18px;
          fill: white;
        }
        .right-content {
          position: relative;
        }
        .popup-frame {
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          width: 340px;
          transform: perspective(1000px) rotateY(-5deg);
        }
        .browser-bar {
          background: #f1f5f9;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid #e2e8f0;
        }
        .browser-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot-red { background: #ef4444; }
        .dot-yellow { background: #eab308; }
        .dot-green { background: #22c55e; }
        iframe {
          border: none;
          width: 340px;
          height: 420px;
          display: block;
        }
        .badge-container {
          position: absolute;
          bottom: -20px;
          right: -30px;
          background: #10b981;
          color: white;
          padding: 10px 20px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge-container svg {
          width: 18px;
          height: 18px;
          fill: white;
        }
      </style>
    </head>
    <body>
      <div class="left-content">
        <div class="logo-container">
          <img class="logo-icon" src="assets/icons/logo.svg" alt="" />
          <span class="logo-text">SafeSnap</span>
        </div>
        <div class="headline">Share Screenshots Without<br/>Exposing Sensitive Data</div>
        <div class="features">
          <div class="feature">
            <span class="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </span>
            Detect names, emails, phone numbers automatically
          </div>
          <div class="feature">
            <span class="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            </span>
            Redact money amounts, dates, and quantities
          </div>
          <div class="feature">
            <span class="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </span>
            100% local processing - data never leaves your browser
          </div>
        </div>
      </div>
      <div class="right-content">
        <div class="popup-frame">
          <div class="browser-bar">
            <div class="browser-dot dot-red"></div>
            <div class="browser-dot dot-yellow"></div>
            <div class="browser-dot dot-green"></div>
          </div>
          <iframe src="popup.html"></iframe>
        </div>
        <div class="badge-container">
          <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
          Privacy First
        </div>
      </div>
    </body>
    </html>
  `;
}

async function takeScreenshots() {
  // Ensure dist exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist folder not found. Run "bun run build" first.');
    process.exit(1);
  }

  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('Launching browser with extension...\n');

  // Launch browser with extension loaded
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${DIST_DIR}`,
      `--load-extension=${DIST_DIR}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const tempFiles = [];

  try {
    const extensionId = await getExtensionId(browser);

    if (!extensionId) {
      console.error('Could not determine extension ID.');
      process.exit(1);
    }

    console.log(`Extension ID: ${extensionId}\n`);
    console.log('='.repeat(50));
    console.log('SCREENSHOTS (1280x800)');
    console.log('='.repeat(50));

    const baseUrl = `chrome-extension://${extensionId}`;

    // Screenshot 1: Popup - Protect Tab (main feature)
    console.log('\n📸 1/5: Popup - Protect Tab...');
    const page1 = await browser.newPage();
    await page1.setViewportSize({ width: STORE_WIDTH, height: STORE_HEIGHT });

    const showcase1Html = createShowcasePage(
      'Protect PII in Screenshots',
      'Automatically detect and redact names, emails, phone numbers, money amounts, and more before sharing screenshots.'
    );

    const showcase1Path = path.join(DIST_DIR, '_showcase1.html');
    fs.writeFileSync(showcase1Path, showcase1Html);
    tempFiles.push(showcase1Path);

    await page1.goto(`${baseUrl}/_showcase1.html`);
    await page1.waitForLoadState('networkidle');
    await page1.waitForTimeout(1000);

    await page1.screenshot({
      path: path.join(SCREENSHOTS_DIR, '1-protect-pii.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: 1-protect-pii.png');
    await page1.close();

    // Screenshot 2: Popup - Settings Tab
    console.log('📸 2/5: Popup - Settings Tab...');
    const page2 = await browser.newPage();
    await page2.setViewportSize({ width: STORE_WIDTH, height: STORE_HEIGHT });

    const showcase2Html = createShowcasePage(
      'Customize Detection',
      'Choose which PII types to detect, adjust sensitivity, and configure redaction modes to match your workflow.'
    );

    const showcase2Path = path.join(DIST_DIR, '_showcase2.html');
    fs.writeFileSync(showcase2Path, showcase2Html);
    tempFiles.push(showcase2Path);

    await page2.goto(`${baseUrl}/_showcase2.html`);
    await page2.waitForLoadState('networkidle');
    await page2.waitForTimeout(500);

    const iframe2 = page2.frameLocator('iframe');
    await iframe2.locator('[data-tab="settings"]').click();
    await page2.waitForTimeout(500);

    await page2.screenshot({
      path: path.join(SCREENSHOTS_DIR, '2-customize-settings.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: 2-customize-settings.png');
    await page2.close();

    // Screenshot 3: Highlight detections feature
    console.log('📸 3/5: Highlight Detections...');
    const page3 = await browser.newPage();
    await page3.setViewportSize({ width: STORE_WIDTH, height: STORE_HEIGHT });

    const showcase3Html = createShowcasePage(
      'Preview Before Capture',
      'Enable highlight mode to see exactly what will be redacted. Review detections before taking your screenshot.'
    );

    const showcase3Path = path.join(DIST_DIR, '_showcase3.html');
    fs.writeFileSync(showcase3Path, showcase3Html);
    tempFiles.push(showcase3Path);

    await page3.goto(`${baseUrl}/_showcase3.html`);
    await page3.waitForLoadState('networkidle');
    await page3.waitForTimeout(500);

    const iframe3 = page3.frameLocator('iframe');
    await iframe3.locator('#highlightToggleContainer').click();
    await page3.waitForTimeout(300);

    await page3.screenshot({
      path: path.join(SCREENSHOTS_DIR, '3-highlight-preview.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: 3-highlight-preview.png');
    await page3.close();

    // Screenshot 4: Advanced Settings
    console.log('📸 4/5: Advanced Settings...');
    const page4 = await browser.newPage();
    await page4.setViewportSize({ width: STORE_WIDTH, height: STORE_HEIGHT });

    const showcase4Html = createSettingsShowcasePage();
    const showcase4Path = path.join(DIST_DIR, '_showcase4.html');
    fs.writeFileSync(showcase4Path, showcase4Html);
    tempFiles.push(showcase4Path);

    await page4.goto(`${baseUrl}/_showcase4.html`);
    await page4.waitForLoadState('networkidle');
    await page4.waitForTimeout(1000);

    await page4.screenshot({
      path: path.join(SCREENSHOTS_DIR, '4-advanced-settings.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: 4-advanced-settings.png');
    await page4.close();

    // Screenshot 5: About/Privacy
    console.log('📸 5/5: Privacy First...');
    const page5 = await browser.newPage();
    await page5.setViewportSize({ width: STORE_WIDTH, height: STORE_HEIGHT });

    const showcase5Html = createShowcasePage(
      '100% Privacy First',
      'All processing happens locally in your browser. No data is ever sent to external servers. Your screenshots stay private.'
    );

    const showcase5Path = path.join(DIST_DIR, '_showcase5.html');
    fs.writeFileSync(showcase5Path, showcase5Html);
    tempFiles.push(showcase5Path);

    await page5.goto(`${baseUrl}/_showcase5.html`);
    await page5.waitForLoadState('networkidle');
    await page5.waitForTimeout(500);

    const iframe5 = page5.frameLocator('iframe');
    await iframe5.locator('[data-tab="about"]').click();
    await page5.waitForTimeout(500);

    await page5.screenshot({
      path: path.join(SCREENSHOTS_DIR, '5-privacy-first.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: 5-privacy-first.png');
    await page5.close();

    // Standalone Popup Screenshots (all tabs)
    console.log('\n📸 Standalone Popup Screenshots (all tabs)...');
    const popupTabs = [
      {
        name: 'protect',
        label: 'Protect',
        selector: '[data-tab="protect"]',
        filename: 'popup-standalone-protect.png',
      },
      {
        name: 'settings',
        label: 'Settings',
        selector: '[data-tab="settings"]',
        filename: 'popup-standalone-settings.png',
      },
      {
        name: 'about',
        label: 'About',
        selector: '[data-tab="about"]',
        filename: 'popup-standalone-about.png',
      },
    ];
    for (const [_i, tab] of popupTabs.entries()) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 400, height: 550 });
      await page.goto(`${baseUrl}/popup.html`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      if (tab.name !== 'protect') {
        // Switch to the tab using the data-tab selector
        await page.locator(tab.selector).click();
        await page.waitForTimeout(300);
      }
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, tab.filename),
        type: 'png',
      });
      console.log(`   ✅ Saved: ${tab.filename}`);
      await page.close();
    }

    // BANNER SCREENSHOTS
    console.log('\n' + '='.repeat(50));
    console.log('BANNER SCREENSHOTS');
    console.log('='.repeat(50));

    // PII Protected Banner
    console.log('\n📸 PII Protected Banner...');
    const piiProtectedPage = await browser.newPage();
    await piiProtectedPage.setViewportSize({ width: 500, height: 200 });

    const piiProtectedHtml = createPIIProtectedBannerPage();
    const piiProtectedPath = path.join(DIST_DIR, '_pii_protected_banner.html');
    fs.writeFileSync(piiProtectedPath, piiProtectedHtml);
    tempFiles.push(piiProtectedPath);

    await piiProtectedPage.goto(`${baseUrl}/_pii_protected_banner.html`);
    await piiProtectedPage.waitForLoadState('networkidle');
    await piiProtectedPage.waitForTimeout(500);

    await piiProtectedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'banner-pii-protected.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: banner-pii-protected.png');
    await piiProtectedPage.close();

    // Highlights Legend Banner
    console.log('📸 Highlights Legend Banner...');
    const highlightsLegendPage = await browser.newPage();
    await highlightsLegendPage.setViewportSize({ width: 400, height: 380 });

    const highlightsLegendHtml = createHighlightsLegendPage();
    const highlightsLegendPath = path.join(DIST_DIR, '_highlights_legend_banner.html');
    fs.writeFileSync(highlightsLegendPath, highlightsLegendHtml);
    tempFiles.push(highlightsLegendPath);

    await highlightsLegendPage.goto(`${baseUrl}/_highlights_legend_banner.html`);
    await highlightsLegendPage.waitForLoadState('networkidle');
    await highlightsLegendPage.waitForTimeout(500);

    await highlightsLegendPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'banner-highlights-legend.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: banner-highlights-legend.png');
    await highlightsLegendPage.close();

    // PROMO TILES
    console.log('\n' + '='.repeat(50));
    console.log('PROMO TILES');
    console.log('='.repeat(50));

    // Small Promo Tile (440x280)
    console.log('\n📸 Small Promo Tile (440x280)...');
    const smallTilePage = await browser.newPage();
    await smallTilePage.setViewportSize({ width: SMALL_TILE_WIDTH, height: SMALL_TILE_HEIGHT });

    const smallTileHtml = createSmallPromoTile();
    const smallTilePath = path.join(DIST_DIR, '_small_tile.html');
    fs.writeFileSync(smallTilePath, smallTileHtml);
    tempFiles.push(smallTilePath);

    await smallTilePage.goto(`${baseUrl}/_small_tile.html`);
    await smallTilePage.waitForLoadState('networkidle');
    await smallTilePage.waitForTimeout(500);

    await smallTilePage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'promo-small-440x280.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: promo-small-440x280.png');
    await smallTilePage.close();

    // Marquee Promo Tile (1400x560)
    console.log('📸 Marquee Promo Tile (1400x560)...');
    const marqueePage = await browser.newPage();
    await marqueePage.setViewportSize({ width: MARQUEE_WIDTH, height: MARQUEE_HEIGHT });

    const marqueeHtml = createMarqueePromoTile();
    const marqueePath = path.join(DIST_DIR, '_marquee_tile.html');
    fs.writeFileSync(marqueePath, marqueeHtml);
    tempFiles.push(marqueePath);

    await marqueePage.goto(`${baseUrl}/_marquee_tile.html`);
    await marqueePage.waitForLoadState('networkidle');
    await marqueePage.waitForTimeout(1000);

    await marqueePage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'promo-marquee-1400x560.png'),
      type: 'png',
    });
    console.log('   ✅ Saved: promo-marquee-1400x560.png');
    await marqueePage.close();

    // Cleanup temporary files
    console.log('\nCleaning up temporary files...');
    tempFiles.forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ All Chrome Web Store assets ready!');
    console.log('='.repeat(50));

    console.log('\nSCREENSHOTS (1280x800):');
    const screenshots = fs
      .readdirSync(SCREENSHOTS_DIR)
      .filter((f) => f.match(/^\d-.*\.png$/))
      .sort();
    screenshots.forEach((file) => {
      const stats = fs.statSync(path.join(SCREENSHOTS_DIR, file));
      console.log(`   ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    });

    console.log('\nPROMO TILES:');
    const promos = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.startsWith('promo-'));
    promos.forEach((file) => {
      const stats = fs.statSync(path.join(SCREENSHOTS_DIR, file));
      const dimensions = file.includes('440x280') ? '440x280' : '1400x560';
      console.log(`   ${file} (${dimensions}, ${(stats.size / 1024).toFixed(1)} KB)`);
    });

    console.log('\nBANNER SCREENSHOTS:');
    const banners = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.startsWith('banner-'));
    banners.forEach((file) => {
      const stats = fs.statSync(path.join(SCREENSHOTS_DIR, file));
      console.log(`   ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    });

    console.log(`\nLocation: ${SCREENSHOTS_DIR}`);
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch((error) => {
  console.error('Error taking screenshots:', error);
  process.exit(1);
});
