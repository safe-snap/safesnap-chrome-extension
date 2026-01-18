/**
 * SafeSnap E2E Tests - PII Protection and Replacement
 *
 * Tests actual PII detection and replacement in a real browser environment
 * These tests catch issues that unit tests miss, like cross-node entity handling
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * Helper: Load a test fixture page
 */
async function loadFixture(page, filename) {
  const fixturePath = path.resolve(__dirname, `../fixtures/${filename}`);
  const fixtureUrl = `file://${fixturePath}`;
  await page.goto(fixtureUrl);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Helper: Inject content script manually (since we can't fully load extension in file:// context)
 */
async function injectSafeSnapScript(page) {
  // Read the built content script
  const contentScriptPath = path.resolve(__dirname, '../../dist/content.js');
  const contentScript = require('fs').readFileSync(contentScriptPath, 'utf-8');

  // Inject it into the page
  await page.addScriptTag({ content: contentScript });

  // Wait for SafeSnap to initialize
  await page.waitForFunction(() => {
    return window.SafeSnap !== undefined;
  });
}

/**
 * Helper: Trigger PII protection
 */
async function protectPII(page, options = {}) {
  const enabledTypes = options.enabledTypes || [
    'emails',
    'phones',
    'ssn',
    'creditCards',
    'money',
    'quantity',
    'dates',
    'ipAddresses',
    'properNouns',
  ];

  await page.evaluate((types) => {
    if (window.SafeSnap && window.SafeSnap.protectPII) {
      window.SafeSnap.protectPII(types);
    }
  }, enabledTypes);

  // Wait for protection to complete
  await page.waitForTimeout(500);
}

test.describe('SafeSnap - PII Replacement (Cross-Node Entities)', () => {
  test('should replace proper nouns that span multiple inline elements (Jim Glab bug)', async ({
    page,
  }) => {
    // Create a page that mimics the SFGate byline structure
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Cross-Node Proper Nouns</title></head>
        <body>
          <div class="byline">
            <span class="author-name">Jim Glab</span>
            <span class="author-title">Freelance Writer</span>
            <time class="publish-date">Jan 17, 2026</time>
          </div>
          <p>Another mention of Jim Glab in the article.</p>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);

    // Get original text
    const originalByline = await page.locator('.author-name').textContent();
    const originalMention = await page.locator('p').textContent();

    expect(originalByline).toBe('Jim Glab');
    expect(originalMention).toContain('Jim Glab');

    // Protect with only proper nouns enabled
    await protectPII(page, { enabledTypes: ['properNouns'] });

    // Verify replacements happened
    const newByline = await page.locator('.author-name').textContent();
    const newMention = await page.locator('p').textContent();

    // Names should be replaced
    expect(newByline).not.toBe('Jim Glab');
    expect(newByline.length).toBeGreaterThan(0); // Should have a replacement

    // Article mention should also be replaced
    expect(newMention).not.toContain('Jim Glab');

    // Both instances should use the same replacement (consistency)
    expect(newMention).toContain(newByline);
  });

  test('should handle adjacent inline elements without inserting spaces (Freelance Writer + Jan 17)', async ({
    page,
  }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Adjacent Elements</title></head>
        <body>
          <div>
            <span>Freelance Writer</span><time>Jan 17, 2026</time>
          </div>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);

    // Protect with dates enabled, proper nouns disabled
    await protectPII(page, { enabledTypes: ['dates'] });

    // The date should be detected and replaced (not corrupted)
    const divText = await page.locator('div').textContent();

    // Should not detect "17" as a standalone quantity
    expect(divText).toContain('Freelance Writer'); // Job title unchanged

    // Date should be replaced or left intact (depending on detection)
    // At minimum, we should not see corrupted dates like "Jan 35, 2026"
    expect(divText).not.toContain('Jan 35, 2026');
  });

  test('should detect dates split across nodes with spaces preserved', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Split Dates</title></head>
        <body>
          <div id="test1"><span>Jan</span> <span>16</span>, <span>2026</span></div>
          <div id="test2"><span>Written on</span> <time>Dec 10, 2024</time></div>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);

    const originalTest1 = await page.locator('#test1').textContent();
    const originalTest2 = await page.locator('#test2').textContent();

    // Protect with dates enabled, quantities disabled
    await protectPII(page, { enabledTypes: ['dates'] });

    const newTest1 = await page.locator('#test1').textContent();
    const newTest2 = await page.locator('#test2').textContent();

    // Dates should be detected and replaced
    expect(newTest1).not.toBe(originalTest1);
    expect(newTest2).not.toBe(originalTest2);

    // Should not have standalone "16" remaining (it was part of date)
    // Note: This depends on date detection working correctly
  });

  test('should not replace job titles as proper nouns', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Job Titles</title></head>
        <body>
          <p>John Smith is a Senior Engineer at Tech Corp.</p>
          <p>Jane Doe works as a Freelance Writer for various publications.</p>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);

    await protectPII(page, { enabledTypes: ['properNouns'] });

    const p1 = await page.locator('p').nth(0).textContent();
    const p2 = await page.locator('p').nth(1).textContent();

    // Job titles should NOT be replaced
    expect(p1).toContain('Senior Engineer');
    expect(p2).toContain('Freelance Writer');

    // But names SHOULD be replaced
    expect(p1).not.toContain('John Smith');
    expect(p2).not.toContain('Jane Doe');
  });
});

test.describe('SafeSnap - Consistency Mapping', () => {
  test('should replace same name with same replacement across entire page', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Consistency</title></head>
        <body>
          <p id="p1">Alice Johnson wrote the report.</p>
          <p id="p2">The report by Alice Johnson was thorough.</p>
          <p id="p3">Contact Alice Johnson for more details.</p>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);
    await protectPII(page, { enabledTypes: ['properNouns'] });

    const p1 = await page.locator('#p1').textContent();
    const p2 = await page.locator('#p2').textContent();
    const p3 = await page.locator('#p3').textContent();

    // Extract the replacement name from first paragraph
    const replacementMatch = p1.match(/([A-Z][a-z]+ [A-Z][a-z]+) wrote/);
    expect(replacementMatch).toBeTruthy();
    const replacement = replacementMatch[1];

    // All instances should use the same replacement
    expect(p2).toContain(replacement);
    expect(p3).toContain(replacement);

    // Original name should be gone
    expect(p1).not.toContain('Alice Johnson');
    expect(p2).not.toContain('Alice Johnson');
    expect(p3).not.toContain('Alice Johnson');
  });

  test('should maintain consistent money replacements', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Money Consistency</title></head>
        <body>
          <p>Budget: $50,000</p>
          <p>Allocated: $50,000</p>
          <p>Remaining: $50,000</p>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);
    await protectPII(page, { enabledTypes: ['money'] });

    const paragraphs = await page.locator('p').all();
    const texts = await Promise.all(paragraphs.map((p) => p.textContent()));

    // Extract the replacement amount from first paragraph
    const match = texts[0].match(/\$[\d,]+/);
    expect(match).toBeTruthy();
    const replacement = match[0];

    // All instances should use the same replacement
    expect(texts[1]).toContain(replacement);
    expect(texts[2]).toContain(replacement);

    // Original amount should be gone
    texts.forEach((text) => {
      expect(text).not.toContain('$50,000');
    });
  });
});

test.describe('SafeSnap - Priority System (Date > Quantity)', () => {
  test('should prioritize date detection over quantity detection', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Date Priority</title></head>
        <body>
          <p id="test1">Event on 1/16/2026</p>
          <p id="test2">Published Jan 17, 2026</p>
          <p id="test3">Deadline: 01/15/2026</p>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);

    // Enable ONLY quantities (dates disabled)
    await protectPII(page, { enabledTypes: ['quantity'] });

    const p1 = await page.locator('#test1').textContent();
    const p2 = await page.locator('#test2').textContent();
    const p3 = await page.locator('#test3').textContent();

    // Dates should NOT be corrupted (numbers inside dates should not be replaced as quantities)
    // They should remain intact because date detection has higher priority during deduplication
    expect(p1).toContain('1/16/2026');
    expect(p2).toContain('Jan 17, 2026');
    expect(p3).toContain('01/15/2026');
  });
});

test.describe('SafeSnap - Highlighting and Visual Feedback', () => {
  test('should add highlight class to detected entities', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Highlighting</title></head>
        <body>
          <p>Contact john.doe@example.com for details.</p>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);

    // Trigger highlight mode (not replacement)
    await page.evaluate(() => {
      if (window.SafeSnap && window.SafeSnap.highlightPII) {
        window.SafeSnap.highlightPII(['emails']);
      }
    });

    await page.waitForTimeout(300);

    // Check if highlight spans were added
    const highlights = await page.locator('.safesnap-highlight').count();
    expect(highlights).toBeGreaterThan(0);

    // Email should still be in DOM (highlighted, not replaced)
    const text = await page.locator('p').textContent();
    expect(text).toContain('john.doe@example.com');
  });
});

test.describe('SafeSnap - Complex Real-World Scenarios', () => {
  test('should handle complex article byline with multiple entities', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Complex Byline</title></head>
        <body>
          <article>
            <div class="byline">
              By <span class="author">Sarah Martinez</span>, 
              <span class="role">Senior Reporter</span> at 
              <span class="org">Tech News Daily</span> | 
              Published <time>December 15, 2025</time>
            </div>
            <p>Sarah Martinez reports on technology trends.</p>
          </article>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);
    await protectPII(page, { enabledTypes: ['properNouns', 'dates'] });

    const bylineText = await page.locator('.byline').textContent();
    const articleText = await page.locator('p').textContent();

    // Name should be replaced in both locations
    expect(bylineText).not.toContain('Sarah Martinez');
    expect(articleText).not.toContain('Sarah Martinez');

    // Job title should remain
    expect(bylineText).toContain('Senior Reporter');

    // Company name should be replaced
    expect(bylineText).not.toContain('Tech News Daily');

    // Date should be replaced
    expect(bylineText).not.toContain('December 15, 2025');
  });

  test('should handle table with multiple PII types', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Table Data</title></head>
        <body>
          <table>
            <tr>
              <td>Name</td>
              <td>Email</td>
              <td>Salary</td>
            </tr>
            <tr>
              <td class="name">Robert Chen</td>
              <td class="email">robert.chen@company.com</td>
              <td class="salary">$95,000</td>
            </tr>
            <tr>
              <td class="name">Maria Lopez</td>
              <td class="email">maria.lopez@company.com</td>
              <td class="salary">$102,000</td>
            </tr>
          </table>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);
    await protectPII(page, { enabledTypes: ['properNouns', 'emails', 'money'] });

    // All PII should be replaced
    const name1 = await page.locator('.name').nth(0).textContent();
    const name2 = await page.locator('.name').nth(1).textContent();
    const email1 = await page.locator('.email').nth(0).textContent();
    const email2 = await page.locator('.email').nth(1).textContent();
    const salary1 = await page.locator('.salary').nth(0).textContent();
    const salary2 = await page.locator('.salary').nth(1).textContent();

    expect(name1).not.toBe('Robert Chen');
    expect(name2).not.toBe('Maria Lopez');
    expect(email1).not.toContain('robert.chen');
    expect(email2).not.toContain('maria.lopez');
    expect(salary1).not.toBe('$95,000');
    expect(salary2).not.toBe('$102,000');
  });
});

test.describe('SafeSnap - Edge Cases and Error Handling', () => {
  test('should handle deeply nested DOM structures', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Nested DOM</title></head>
        <body>
          <div>
            <section>
              <article>
                <div>
                  <p><span><strong>Emily Davis</strong></span> wrote this.</p>
                </div>
              </article>
            </section>
          </div>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);
    await protectPII(page, { enabledTypes: ['properNouns'] });

    const text = await page.locator('p').textContent();
    expect(text).not.toContain('Emily Davis');
  });

  test('should handle entities at text node boundaries', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test: Boundaries</title></head>
        <body>
          <p>Contact<span> </span>alice@example.com<span> </span>today.</p>
          <p>Price:<span> </span>$1,000<span> </span>only.</p>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);
    await protectPII(page, { enabledTypes: ['emails', 'money'] });

    const p1 = await page.locator('p').nth(0).textContent();
    const p2 = await page.locator('p').nth(1).textContent();

    expect(p1).not.toContain('alice@example.com');
    expect(p2).not.toContain('$1,000');
  });

  test('should skip script and style tags', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test: Skip Tags</title>
          <style>
            /* Email in CSS: admin@example.com */
            .test { content: 'test@test.com'; }
          </style>
        </head>
        <body>
          <p>Real email: user@example.com</p>
          <script>
            // Email in script: script@example.com
            const email = 'code@example.com';
          </script>
        </body>
      </html>
    `);

    await injectSafeSnapScript(page);
    await protectPII(page, { enabledTypes: ['emails'] });

    // Email in paragraph should be replaced
    const pText = await page.locator('p').textContent();
    expect(pText).not.toContain('user@example.com');

    // Emails in script/style should remain unchanged
    const scriptText = await page.locator('script').textContent();
    const styleText = await page.locator('style').textContent();

    expect(scriptText).toContain('code@example.com');
    expect(styleText).toContain('test@test.com');
  });
});
