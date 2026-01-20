/**
 * @jest-environment jsdom
 */

const { PIIDetector } = require('../../src/detection/pii-detector.js');

describe('California in bold vs plain text', () => {
  let detector;

  beforeEach(async () => {
    detector = new PIIDetector();
    await detector.initialize();
    document.body.innerHTML = '';
  });

  test('California in STRONG tag (problematic case)', () => {
    document.body.innerHTML = `
      <div class="articleBody">
        <p><strong>In California route news</strong>, Alaska Airlines last week introduced service.</p>
      </div>
    `;

    const entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    console.log('\n=== STRONG TAG CASE ===');
    console.log(
      'All entities found:',
      entities.map((e) => ({
        type: e.type,
        original: e.original,
        confidence: e.confidence,
        score: e.score,
      }))
    );

    const california = entities.find((e) => e.original === 'California');
    console.log(
      'California entity:',
      california
        ? {
            type: california.type,
            confidence: california.confidence,
            score: california.score,
            scoreBreakdown: california.scoreBreakdown,
          }
        : 'NOT FOUND'
    );

    // California should be detected
    expect(california).toBeDefined();
    expect(california.confidence).toBeGreaterThanOrEqual(0.75);
  });

  test('California in plain text (working case)', () => {
    document.body.innerHTML = `
      <div class="articleBody">
        <p><strong>On the international side</strong>, Its only California service this summer will be six flights.</p>
      </div>
    `;

    const entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    console.log('\n=== PLAIN TEXT CASE ===');
    console.log(
      'All entities found:',
      entities.map((e) => ({
        type: e.type,
        original: e.original,
        confidence: e.confidence,
        score: e.score,
      }))
    );

    const california = entities.find((e) => e.original === 'California');
    console.log(
      'California entity:',
      california
        ? {
            type: california.type,
            confidence: california.confidence,
            score: california.score,
            scoreBreakdown: california.scoreBreakdown,
          }
        : 'NOT FOUND'
    );

    expect(california).toBeDefined();
  });

  test('Direct comparison - same sentence different formatting', () => {
    // Test 1: California in strong
    document.body.innerHTML = `<p><strong>In California route news</strong></p>`;
    let entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    let calif1 = entities.find((e) => e.original === 'California');
    console.log('\n=== DIRECT COMPARISON ===');
    console.log(
      'In <strong>: California found?',
      !!calif1,
      calif1?.confidence,
      calif1?.scoreBreakdown
    );

    // Test 2: California in plain text
    document.body.innerHTML = `<p>In California route news</p>`;
    entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    let calif2 = entities.find((e) => e.original === 'California');
    console.log(
      'In plain <p>: California found?',
      !!calif2,
      calif2?.confidence,
      calif2?.scoreBreakdown
    );

    // Both should be found
    expect(calif1).toBeDefined();
    expect(calif2).toBeDefined();
  });

  test('detectInDOM comparison (used for replacement)', () => {
    // Test 1: California in strong
    document.body.innerHTML = `<p><strong>In California route news</strong>, more text here.</p>`;
    let entities = detector.detectInDOM(document.body, ['properNouns', 'locations']);
    let calif1 = entities.find((e) => e.original === 'California');
    console.log('\n=== detectInDOM (replacement method) ===');
    console.log('In <strong>: California found?', !!calif1, calif1);

    // Test 2: California in plain text
    document.body.innerHTML = `<p>In California route news, more text here.</p>`;
    entities = detector.detectInDOM(document.body, ['properNouns', 'locations']);
    let calif2 = entities.find((e) => e.original === 'California');
    console.log('In plain <p>: California found?', !!calif2, calif2);

    // Both should be found
    expect(calif1).toBeDefined();
    expect(calif2).toBeDefined();
  });

  test('Check node and position info for highlight rendering', () => {
    document.body.innerHTML = `<p><strong>In California route news</strong>, more text here.</p>`;
    const entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    const calif = entities.find((e) => e.original === 'California');

    console.log('\n=== NODE POSITION INFO ===');
    console.log('California entity:', {
      original: calif?.original,
      start: calif?.start,
      end: calif?.end,
      nodeText: calif?.nodeText,
      nodeTextLength: calif?.nodeText?.length,
      nodeParentTag: calif?.node?.parentElement?.tagName,
    });

    // The text content of the node should be "In California route news"
    // California starts at position 3
    expect(calif).toBeDefined();
    expect(calif.start).toBe(3);
    expect(calif.end).toBe(13);
    expect(calif.nodeText).toBe('In California route news');
  });

  test('Verify highlight can be created for STRONG content', () => {
    document.body.innerHTML = `<p><strong>In California route news</strong>, more text here.</p>`;
    const entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    const calif = entities.find((e) => e.original === 'California');

    // Simulate what createHighlight does - check if range is valid
    const textNode = calif.node;
    const start = calif.start;
    const end = calif.end;

    console.log('\n=== RANGE VALIDATION ===');
    console.log('Text node content:', textNode.textContent);
    console.log('Text node length:', textNode.textContent.length);
    console.log('Range: start=', start, 'end=', end);
    console.log('Is start valid?', start < textNode.textContent.length);
    console.log('Is end valid?', end <= textNode.textContent.length);

    // This would cause createHighlight to return null
    const isRangeValid = start < textNode.textContent.length && end <= textNode.textContent.length;
    expect(isRangeValid).toBe(true);

    // Try creating an actual Range
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    console.log('Range text:', range.toString());
    expect(range.toString()).toBe('California');
  });
});
