# Jest Testing Reference

## React Native Testing Library API

### Render Functions

#### `render(component, options?)`
Renders a React component into a container.

```typescript
import { render } from '@testing-library/react-native';

const { getByText, queryByText, ...queries } = render(<MyComponent />);
```

**Options:**
- `wrapper`: Component to wrap the component being tested
- `createNodeMock`: Custom mock for refs

### Query Functions

#### Text Queries

```typescript
// getBy* - throws if not found
getByText(text, options?)
getByPlaceholderText(text, options?)
getByDisplayValue(value, options?)

// queryBy* - returns null if not found
queryByText(text, options?)
queryByPlaceholderText(text, options?)

// findBy* - returns Promise, waits for element
findByText(text, options?)
findByPlaceholderText(text, options?)
```

#### Role Queries (Preferred)

```typescript
getByRole(role, options?)
queryByRole(role, options?)
findByRole(role, options?)

// Common roles: 'button', 'text', 'textinput', 'image', 'header'
```

#### TestID Queries

```typescript
getByTestId(testId)
queryByTestId(testId)
findByTestId(testId)
```

#### Multiple Elements

```typescript
getAllByText(text, options?)
queryAllByText(text, options?)
findAllByText(text, options?)
```

### User Events

#### `fireEvent`

```typescript
import { fireEvent } from '@testing-library/react-native';

// Press events
fireEvent.press(element);
fireEvent.longPress(element);

// Text input
fireEvent.changeText(element, text);

// Scroll
fireEvent.scroll(element, { nativeEvent: { contentOffset: { y: 100 } } });

// Focus/Blur
fireEvent.focus(element);
fireEvent.blur(element);
```

### Wait Functions

#### `waitFor`

```typescript
import { waitFor } from '@testing-library/react-native';

await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeTruthy();
});

// With options
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeTruthy();
}, { timeout: 3000 });
```

#### `waitForElementToBeRemoved`

```typescript
import { waitForElementToBeRemoved } from '@testing-library/react-native';

await waitForElementToBeRemoved(() => screen.getByText('Loading...'));
```

### Hook Testing

#### `renderHook`

```typescript
import { renderHook, act } from '@testing-library/react-native';

const { result, rerender, unmount } = renderHook(() => useCustomHook());

// Update hook with new props
rerender({ newProp: 'value' });

// Unmount hook
unmount();
```

#### `act`

Wrap state updates:

```typescript
act(() => {
  result.current.increment();
});
```

## Jest Matchers

### Common Matchers

```typescript
// Equality
expect(value).toBe(expected);           // ===
expect(value).toEqual(expected);        // Deep equality
expect(value).not.toBe(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(number);
expect(value).toBeGreaterThanOrEqual(number);
expect(value).toBeLessThan(number);
expect(value).toBeLessThanOrEqual(number);
expect(value).toBeCloseTo(number, precision);

// Strings
expect(string).toMatch(/regex/);
expect(string).toContain(substring);
expect(string).toHaveLength(number);

// Arrays
expect(array).toContain(item);
expect(array).toContainEqual(item);
expect(array).toHaveLength(number);

// Objects
expect(object).toHaveProperty(path, value?);
expect(object).toMatchObject(object);
expect(object).toEqual(expect.objectContaining({ key: value }));

// Exceptions
expect(fn).toThrow();
expect(fn).toThrow(error);
expect(fn).toThrow('error message');
```

### Jest Mock Matchers

```typescript
// Function calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(number);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenLastCalledWith(arg1, arg2);
expect(mockFn).toHaveReturned();
expect(mockFn).toHaveReturnedWith(value);
```

## Mocking

### Mock Functions

```typescript
// Create mock function
const mockFn = jest.fn();

// With implementation
const mockFn = jest.fn((x) => x + 1);

// Mock return value
mockFn.mockReturnValue(42);
mockFn.mockReturnValueOnce(42);

// Mock resolved value (Promise)
mockFn.mockResolvedValue(data);
mockFn.mockResolvedValueOnce(data);

// Mock rejected value (Promise)
mockFn.mockRejectedValue(error);
mockFn.mockRejectedValueOnce(error);

// Mock implementation
mockFn.mockImplementation((x) => x * 2);
```

### Module Mocking

```typescript
// Mock entire module
jest.mock('./module');

// Mock with implementation
jest.mock('./module', () => ({
  namedExport: jest.fn(),
  default: jest.fn(),
}));

// Partial mock
jest.mock('./module', () => ({
  ...jest.requireActual('./module'),
  specificFunction: jest.fn(),
}));
```

### Manual Mocks

Create `__mocks__` directory:

```
module.js
__mocks__/
  module.js
```

```typescript
// __mocks__/module.js
module.exports = {
  functionName: jest.fn(),
};
```

### Clearing Mocks

```typescript
jest.clearAllMocks();        // Clear call history
jest.resetAllMocks();         // Clear history + implementation
jest.restoreAllMocks();      // Restore original implementation
```

## Async Testing

### Promises

```typescript
// Return promise
it('handles async', () => {
  return fetchData().then(data => {
    expect(data).toBeDefined();
  });
});

// Async/await
it('handles async', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// Resolves/Rejects
await expect(fetchData()).resolves.toBeDefined();
await expect(fetchData()).rejects.toThrow();
```

### Timers

```typescript
// Fake timers
jest.useFakeTimers();

// Fast-forward time
jest.advanceTimersByTime(1000);
jest.runAllTimers();
jest.runOnlyPendingTimers();

// Restore real timers
jest.useRealTimers();
```

## Setup and Teardown

### Global Setup

```typescript
// Runs once before all tests
beforeAll(() => {
  // Setup
});

// Runs once after all tests
afterAll(() => {
  // Cleanup
});
```

### Per-Test Setup

```typescript
// Runs before each test
beforeEach(() => {
  // Setup
});

// Runs after each test
afterEach(() => {
  // Cleanup
});
```

## Configuration

### Jest Config (package.json)

```json
{
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ],
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "testMatch": ["**/__tests__/**/*.test.[jt]s?(x)"],
    "collectCoverageFrom": [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts"
    ]
  }
}
```

### Setup File (jest.setup.js)

```javascript
import '@testing-library/jest-native/extend-expect';

// Global mocks
global.fetch = jest.fn();

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
```

## Common Patterns

### Testing with Providers

```typescript
const AllTheProviders = ({ children }) => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </Provider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };
```

### Testing Error Boundaries

```typescript
it('handles errors', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation();
  
  render(<ErrorBoundary><BrokenComponent /></ErrorBoundary>);
  
  expect(screen.getByText('Something went wrong')).toBeTruthy();
  
  consoleError.mockRestore();
});
```

### Snapshot Testing

```typescript
it('matches snapshot', () => {
  const tree = render(<Component />).toJSON();
  expect(tree).toMatchSnapshot();
});
```
