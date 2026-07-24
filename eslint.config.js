const js = require('@eslint/js');
const jestPlugin = require('eslint-plugin-jest');
const prettier = require('eslint-config-prettier/flat');

const sharedRules = {
  ...prettier.rules,
  'no-console': [
    'warn',
    {
      allow: ['log', 'warn', 'error', 'time', 'timeEnd'],
    },
  ],
  'no-unused-vars': [
    'error',
    {
      caughtErrorsIgnorePattern: '^_',
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
};

const browserGlobals = {
  AbortController: 'readonly',
  Blob: 'readonly',
  CSS: 'readonly',
  ClipboardItem: 'readonly',
  CustomEvent: 'readonly',
  DOMParser: 'readonly',
  Element: 'readonly',
  Event: 'readonly',
  FileReader: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  MutationObserver: 'readonly',
  Node: 'readonly',
  NodeFilter: 'readonly',
  ResizeObserver: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Window: 'readonly',
  alert: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  location: 'readonly',
  navigator: 'readonly',
  performance: 'readonly',
  requestAnimationFrame: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  structuredClone: 'readonly',
  window: 'readonly',
};

const extensionGlobals = {
  chrome: 'readonly',
};

const nodeGlobals = {
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  console: 'readonly',
  global: 'readonly',
  module: 'readonly',
  process: 'readonly',
  require: 'readonly',
  setTimeout: 'readonly',
};

const jestFlatRecommended = jestPlugin.configs['flat/recommended'];

module.exports = [
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...browserGlobals,
        ...extensionGlobals,
      },
    },
    rules: sharedRules,
  },
  {
    ...jestFlatRecommended,
    files: ['src/**/*.test.js'],
    languageOptions: {
      ...jestFlatRecommended.languageOptions,
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...browserGlobals,
        ...extensionGlobals,
        __dirname: 'readonly',
        global: 'readonly',
        require: 'readonly',
        ...jestFlatRecommended.languageOptions.globals,
      },
    },
    rules: {
      ...sharedRules,
      ...jestFlatRecommended.rules,
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: sharedRules,
  },
];
