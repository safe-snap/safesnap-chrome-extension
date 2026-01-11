#!/usr/bin/env node

/**
 * This script ensures that Bun is used instead of npm/yarn/pnpm.
 * It runs before any npm install/run command.
 */

// Allow CI/CD environments to use npm if needed (GitHub Actions with setup-bun uses npm internally)
const isCI = process.env.CI === 'true';
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

// Skip check in CI environments (they should use setup-bun action instead)
if (isCI || isGitHubActions) {
  process.exit(0);
}

const execPath = process.env.npm_execpath || '';
const userAgent = process.env.npm_config_user_agent || '';

// Check if npm is being used
const isNpm = execPath.includes('npm') || userAgent.includes('npm');
const isYarn = execPath.includes('yarn') || userAgent.includes('yarn');
const isPnpm = execPath.includes('pnpm') || userAgent.includes('pnpm');

if (isNpm || isYarn || isPnpm) {
  const packageManager = isYarn ? 'yarn' : isPnpm ? 'pnpm' : 'npm';

  console.error('\n┌────────────────────────────────────────────────────────┐');
  console.error('│                                                        │');
  console.error(
    '│  ❌  This project uses Bun, not ' + packageManager.padEnd(4) + '!                │'
  );
  console.error('│                                                        │');
  console.error('│  Please install Bun and use it instead:               │');
  console.error('│                                                        │');
  console.error('│    Installation:                                       │');
  console.error('│    $ curl -fsSL https://bun.sh/install | bash         │');
  console.error('│                                                        │');
  console.error('│    Then run:                                           │');
  console.error('│    $ bun install                                       │');
  console.error('│    $ bun run build                                     │');
  console.error('│    $ bun test                                          │');
  console.error('│                                                        │');
  console.error('│  Why Bun?                                              │');
  console.error('│  • 7-10x faster than npm                               │');
  console.error('│  • Better developer experience                         │');
  console.error('│  • 100% compatible with npm packages                   │');
  console.error('│                                                        │');
  console.error('│  See BUN_MIGRATION.md for more details.               │');
  console.error('│                                                        │');
  console.error('└────────────────────────────────────────────────────────┘\n');

  process.exit(1);
}

// If we get here, we're using Bun or running the script directly
// Allow the command to proceed
process.exit(0);
