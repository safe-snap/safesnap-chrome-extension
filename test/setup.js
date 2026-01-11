// Jest setup file for Chrome extension testing
require('jest-webextension-mock');

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
