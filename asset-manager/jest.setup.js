// Extend Jest matchers for React Native (e.g. toBeOnTheScreen, toHaveTextContent)
import '@testing-library/jest-native/extend-expect';

// Global AsyncStorage mock - getItem resolves immediately so WeightViewPreferenceProvider
// and other consumers get a settled promise. Tests that need custom behavior can override
// with their own jest.mock.
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Suppress act(...) warnings from known sources: WeightViewPreferenceProvider async
// setState, VirtualizedList timers, Redux subscription callbacks. Pragmatic fix used
// by many React Native projects - real errors are still shown.
const originalError = console.error;
console.error = (...args) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('act(...)') || msg.includes('not wrapped in act')) return;
  originalError.apply(console, args);
};
