---
name: jest-react-native
description: Create and write unit tests for React Native components, hooks, utilities, and Redux slices using Jest and React Native Testing Library. Use when writing tests, creating test files, testing components, or when the user mentions unit testing, test coverage, or Jest.
---

# Jest Testing for React Native

## Quick Start

When creating unit tests:

1. **Component tests**: Use `@testing-library/react-native` for rendering and queries
2. **Hook tests**: Use `renderHook` from `@testing-library/react-native`
3. **Redux tests**: Test slices and selectors in isolation
4. **Utility tests**: Test pure functions directly

## Test File Structure

Place test files next to the code they test:
- `Component.tsx` → `Component.test.tsx`
- `utils.ts` → `utils.test.ts`
- `hooks.ts` → `hooks.test.ts`

Or in a `__tests__` directory:
- `components/Button.tsx` → `components/__tests__/Button.test.tsx`

## Basic Test Template

```typescript
import { render, screen } from '@testing-library/react-native';
import ComponentName from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeTruthy();
  });
});
```

## Testing Components

### Rendering and Queries

```typescript
import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// Use getBy* for elements that must exist (throws if not found)
const text = screen.getByText('Hello');
const testId = screen.getByTestId('my-component');

// Use queryBy* for elements that might not exist (returns null)
const maybeText = screen.queryByText('Hello');

// Use findBy* for async elements (returns Promise)
const asyncText = await screen.findByText('Hello');
```

### Common Queries Priority

1. `getByRole` - Most accessible (preferred)
2. `getByText` - For visible text
3. `getByTestId` - Last resort, add `testID` prop

### Testing User Interactions

```typescript
import { fireEvent } from '@testing-library/react-native';

// Press button
fireEvent.press(screen.getByText('Submit'));

// Change text input
fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
```

## Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react-native';

const { result } = renderHook(() => useCustomHook());

act(() => {
  result.current.increment();
});

expect(result.current.count).toBe(1);
```

## Testing Redux Slices

```typescript
import { configureStore } from '@reduxjs/toolkit';
import sliceReducer, { sliceActions } from './slice';

describe('slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: { slice: sliceReducer },
    });
  });

  it('handles initial state', () => {
    expect(store.getState().slice).toEqual(initialState);
  });

  it('handles action', () => {
    store.dispatch(sliceActions.setValue('test'));
    expect(store.getState().slice.value).toBe('test');
  });
});
```

## Testing Utilities

```typescript
import { formatDate, calculateTotal } from './utils';

describe('formatDate', () => {
  it('formats date correctly', () => {
    expect(formatDate(new Date('2024-01-01'))).toBe('01/01/2024');
  });
});
```

## Common Patterns

### Mocking Modules

```typescript
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    signInWithEmailAndPassword: jest.fn(),
  })),
}));
```

### Mocking Navigation

```typescript
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
```

### Setup and Teardown

```typescript
describe('Component', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });
});
```

## Assertions

```typescript
// Basic
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContainEqual(item);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });
```

## Best Practices

1. **Test behavior, not implementation** - Test what users see/do
2. **One assertion per test** - Keep tests focused
3. **Descriptive test names** - Use "should" or "it" format
4. **Arrange-Act-Assert** - Structure tests clearly
5. **Mock external dependencies** - Keep tests isolated

## Running Tests

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm test -- --coverage  # With coverage
```

## Additional Resources

- For detailed examples, see [examples.md](examples.md)
- For API reference, see [reference.md](reference.md)
