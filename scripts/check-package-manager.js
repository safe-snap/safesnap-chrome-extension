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

// Bun is present in process.versions.bun (most reliable) and also fakes an
// npm-compatible user agent string like "bun/1.3.14 npm/9.x node/v22.x ..."
// for tool compatibility — so it MUST be checked before the npm/yarn/pnpm
// substring checks below, or Bun gets misidentified as npm.
const isBun =
  Boolean(process.versions && process.versions.bun) ||
  execPath.includes('bun') ||
  userAgent.startsWith('bun/');

if (isBun) {
  process.exit(0);
}

// Only trust the FIRST token of the user agent string for the actual
// package manager identity (format is "<name>/<version> ...").
const uaPackageManager = userAgent.split('/')[0].split(' ')[0];

const isNpm = execPath.includes('npm') || uaPackageManager === 'npm';
const isYarn = execPath.includes('yarn') || uaPackageManager === 'yarn';
const isPnpm = execPath.includes('pnpm') || uaPackageManager === 'pnpm';

if (isNpm || isYarn || isPnpm) {
  const packageManager = isYarn ? 'yarn' : isPnpm ? 'pnpm' : 'npm';

  const message = [
    '',
    '┌────────────────────────────────────────────────────────┐',
    '│                                                        │',
    `│  ❌  This project uses Bun, not ${packageManager.padEnd(4)}!                │`,
    '│                                                        │',
    '│  Please install Bun and use it instead:               │',
    '│                                                        │',
    '│    Installation:                                       │',
    '│    $ curl -fsSL https://bun.sh/install | bash         │',
    '│                                                        │',
    '│    Then run:                                           │',
    '│    $ bun install                                       │',
    '│    $ bun run build                                     │',
    '│    $ bun test                                          │',
    '│                                                        │',
    '│  Why Bun?                                              │',
    '│  • 7-10x faster than npm                               │',
    '│  • Better developer experience                         │',
    '│  • 100% compatible with npm packages                   │',
    '│                                                        │',
    '│  See BUN_MIGRATION.md for more details.               │',
    '│                                                        │',
    '└────────────────────────────────────────────────────────┘',
    '',
  ].join('\n');

  console.error(message);
  process.exit(1);
}

// If we get here, we're using Bun or running the script directly
// Allow the command to proceed
process.exit(0);
