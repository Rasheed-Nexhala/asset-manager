/**
 * Mock for @sentry/react-native to prevent ESM parse errors and open handles
 * (Sentry sets up setInterval on load, which keeps Jest from exiting).
 */
module.exports = {
  init: jest.fn(),
  wrap: (Component) => Component,
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  captureEvent: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  setExtras: jest.fn(),
  setTags: jest.fn(),
  addIntegration: jest.fn(),
  Scope: jest.fn(),
  getCurrentScope: jest.fn(),
  getGlobalScope: jest.fn(),
  getIsolationScope: jest.fn(),
  getClient: jest.fn(),
  setCurrentClient: jest.fn(),
  addEventProcessor: jest.fn(),
  lastEventId: jest.fn(),
};
