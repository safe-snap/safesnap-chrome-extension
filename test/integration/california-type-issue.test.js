/**
 * @jest-environment jsdom
 */

const { PIIDetector } = require('../../src/detection/pii-detector.js');

describe('California type classification', () => {
  let detector;

  beforeEach(async () => {
    detector = new PIIDetector();
    await detector.initialize();
    document.body.innerHTML = '';
  });

  test('California should be detected as location in context "In California route news"', () => {
    // Bug fix test: Previously "In California" was matched as a phrase,
    // which wasn't in the gazetteer, so California was only detected as properNoun
    document.body.innerHTML = `<p>In California route news, Alaska Airlines last week introduced service.</p>`;
    const entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    const calif = entities.find((e) => e.original === 'California');

    expect(calif).toBeDefined();
    expect(calif.type).toBe('location');
    expect(calif.confidence).toBe(0.95);
  });

  test('California should be detected as location in context "Its only California service"', () => {
    document.body.innerHTML = `<p>Its only California service this summer will be six flights.</p>`;
    const entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    const calif = entities.find((e) => e.original === 'California');

    expect(calif).toBeDefined();
    expect(calif.type).toBe('location');
    expect(calif.confidence).toBe(0.95);
  });

  test('Alaska should be detected as location when followed by Airlines', () => {
    // Similar bug: "Alaska Airlines" was matched as a phrase, but now we
    // check individual words if the phrase isn't in the gazetteer
    document.body.innerHTML = `<p>Alaska Airlines last week introduced service.</p>`;
    const entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    const alaska = entities.find((e) => e.original === 'Alaska');

    expect(alaska).toBeDefined();
    expect(alaska.type).toBe('location');
  });

  test('Multi-word location "New York" should be matched as a single entity', () => {
    // Ensure multi-word locations still work properly
    document.body.innerHTML = `<p>Flights to New York are available.</p>`;
    const entities = detector.detectWithDebugInfo(document.body, ['properNouns', 'locations']);
    const newYork = entities.find((e) => e.original === 'New York');

    expect(newYork).toBeDefined();
    expect(newYork.type).toBe('location');
  });
});
