/**
 * Warning shown when using Bun's test runner instead of Jest
 * This file is preloaded by Bun's test runner via bunfig.toml
 */

const warningMessage = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                           ⚠️  WARNING ⚠️                                  ║
║                                                                           ║
║  You are using Bun's test runner directly via 'bun test'                 ║
║                                                                           ║
║  ⚠️  DEPRECATED: 2 tests will FAIL due to matcher compatibility issues   ║
║                                                                           ║
║  ✅ RECOMMENDED: Use 'bun run test' instead                              ║
║                                                                           ║
║  Why?                                                                     ║
║  • Jest has 100% test compatibility (338/338 pass)                       ║
║  • Bun test runner has 99% compatibility (336/338 pass)                  ║
║  • CI/CD uses 'bun run test' (Jest)                                      ║
║  • Better mocking support for Chrome extensions                          ║
║                                                                           ║
║  Tests that will fail with 'bun test':                                   ║
║  1. Dictionary > loadCoreDictionary > should handle load errors          ║
║  2. Dictionary > loadFullDictionary > should handle cache miss           ║
║                                                                           ║
║  For more info: See TESTING.md                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

`;

console.warn(warningMessage);
