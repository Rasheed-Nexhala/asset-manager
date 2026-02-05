# React Native Testing Library API Reference

## Render API

### `render(component, options?)`

Renders a React Native component into a container.

```typescript
import { render } from '@testing-library/react-native';

const {
  getByText,
  queryByText,
  getAllByText,
  ...queries
} = render(<MyComponent />);
```

**Options:**
- `wrapper`: Component to wrap the component being tested
- `createNodeMock`: Custom mock for refs

**Returns:** Object containing all query functions and utilities

### `screen`

Pre-bound queries scoped to the document body:

```typescript
import { screen } from '@testing-library/react-native';

screen.getByText('Hello');
screen.getByRole('button');
```

## Query Functions

### Text Queries

#### `getByText(text, options?)`
Finds element by text content. Throws if not found.

```typescript
screen.getByText('Hello World');
screen.getByText(/hello/i); // Regex
screen.getByText('Hello', { exact: false }); // Partial match
```

#### `getAllByText(text, options?)`
Finds all elements by text content. Returns array.

#### `queryByText(text, options?)`
Same as `getByText` but returns `null` if not found.

#### `queryAllByText(text, options?)`
Same as `getAllByText` but returns empty array if not found.

#### `findByText(text, options?)`
Returns Promise, waits for element to appear.

```typescript
const element = await screen.findByText('Loaded');
```

#### `findAllByText(text, options?)`
Returns Promise, waits for all matching elements.

### Placeholder Queries

#### `getByPlaceholderText(text, options?)`
Finds TextInput by placeholder text.

```typescript
screen.getByPlaceholderText('Enter email');
```

#### `getAllByPlaceholderText`, `queryByPlaceholderText`, etc.
Same pattern as text queries.

### Display Value Queries

#### `getByDisplayValue(value, options?)`
Finds TextInput by displayed value.

```typescript
screen.getByDisplayValue('test@example.com');
```

### TestID Queries

#### `getByTestId(testId)`
Finds element by `testID` prop. Use sparingly.

```typescript
screen.getByTestId('submit-button');
```

**Note:** Prefer accessible queries (`getByRole`, `getByText`) over `testID`.

### Role Queries (Preferred)

#### `getByRole(role, options?)`
Finds element by accessibility role.

```typescript
screen.getByRole('button');
screen.getByRole('button', { name: 'Submit' });
screen.getByRole('text');
screen.getByRole('textinput');
screen.getByRole('header');
```

**Common roles:**
- `button` - Button components
- `text` - Text components
- `textinput` - TextInput components
- `image` - Image components
- `header` - Header text

#### `getAllByRole`, `queryByRole`, `findByRole`, etc.
Same pattern as other queries.

### Label Queries

#### `getByLabelText(text, options?)`
Finds element by accessibility label.

```typescript
<Button accessibilityLabel="Submit form" />
screen.getByLabelText('Submit form');
```

## User Events

### `fireEvent`

#### `fireEvent.press(element)`
Simulates press event.

```typescript
fireEvent.press(screen.getByText('Submit'));
```

#### `fireEvent.changeText(element, text)`
Simulates text change in TextInput.

```typescript
fireEvent.changeText(
  screen.getByPlaceholderText('Email'),
  'test@example.com'
);
```

#### `fireEvent.scroll(element, eventData)`
Simulates scroll event.

```typescript
fireEvent.scroll(screen.getByTestId('scroll-view'), {
  nativeEvent: {
    contentOffset: { y: 100 },
    contentSize: { height: 500 },
    layoutMeasurement: { height: 100 },
  },
});
```

#### `fireEvent(element, eventName, eventData?)`
Generic event firing.

```typescript
fireEvent(screen.getByText('Hold'), 'longPress');
fireEvent(screen.getByPlaceholderText('Email'), 'focus');
fireEvent(screen.getByPlaceholderText('Email'), 'blur');
```

## Async Utilities

### `waitFor(fn, options?)`

Waits for condition to be true.

```typescript
import { waitFor } from '@testing-library/react-native';

await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeTruthy();
});

// With options
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeTruthy();
}, {
  timeout: 3000,
  interval: 100,
});
```

**Options:**
- `timeout`: Maximum wait time (default: 1000ms)
- `interval`: Check interval (default: 50ms)

### `waitForElementToBeRemoved(fn, options?)`

Waits for element to be removed.

```typescript
import { waitForElementToBeRemoved } from '@testing-library/react-native';

await waitForElementToBeRemoved(() => 
  screen.getByText('Loading...')
);
```

## Hook Testing

### `renderHook(hook, options?)`

Renders a hook for testing.

```typescript
import { renderHook, act } from '@testing-library/react-native';

const { result, rerender, unmount } = renderHook(() => useCustomHook());

// Access hook return value
result.current.increment();

// Rerender with new props
rerender({ newProp: 'value' });

// Unmount hook
unmount();
```

### `act(fn)`

Wraps state updates.

```typescript
act(() => {
  result.current.increment();
});
```

## Matchers (jest-native)

Install: `npm install --save-dev @testing-library/jest-native`

### Text Matchers

```typescript
import '@testing-library/jest-native/extend-expect';

expect(element).toHaveTextContent('Hello');
expect(element).toHaveTextContent(/hello/i);
```

### Style Matchers

```typescript
expect(element).toHaveStyle({ backgroundColor: 'red' });
expect(element).toHaveStyle({ fontSize: 16 });
```

### Accessibility Matchers

```typescript
expect(element).toBeAccessible();
expect(element).toHaveAccessibilityValue({ min: 0, max: 100 });
expect(element).toHaveAccessibilityState({ disabled: false });
expect(element).toHaveAccessibilityLabel('Submit button');
```

### Disabled State

```typescript
expect(element).toBeDisabled();
expect(element).toBeEnabled();
```

## Query Options

### Text Matching Options

```typescript
// Exact match (default)
screen.getByText('Hello', { exact: true });

// Partial match
screen.getByText('Hello', { exact: false });

// Case insensitive
screen.getByText(/hello/i);
```

### Role Options

```typescript
// By name
screen.getByRole('button', { name: 'Submit' });

// By accessibility state
screen.getByRole('button', { 
  name: 'Submit',
  disabled: false 
});
```

## Utilities

### `within(element)`

Scopes queries to a specific element.

```typescript
import { render, within } from '@testing-library/react-native';

const { getByTestId } = render(<Component />);
const section = getByTestId('section');

within(section).getByText('Section content');
```

### `cleanup()`

Cleans up rendered components. Automatically called after each test.

```typescript
import { cleanup } from '@testing-library/react-native';

afterEach(cleanup);
```

## Common Patterns

### Custom Render with Providers

```typescript
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';

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

### Testing Ref Callbacks

```typescript
const createNodeMock = (element) => {
  if (element.type === 'TextInput') {
    return {
      focus: jest.fn(),
      blur: jest.fn(),
    };
  }
  return null;
};

render(<Component />, { createNodeMock });
```

### Debugging

```typescript
import { screen, debug } from '@testing-library/react-native';

// Print component tree
debug();

// Print specific element
debug(screen.getByText('Hello'));

// Print with options
debug(screen.getByText('Hello'), {
  message: 'Debug output',
});
```

## Event Data Structures

### Press Event

```typescript
fireEvent.press(element, {
  nativeEvent: {
    // Event data
  },
});
```

### Scroll Event

```typescript
fireEvent.scroll(element, {
  nativeEvent: {
    contentOffset: { x: 0, y: 100 },
    contentSize: { width: 300, height: 500 },
    layoutMeasurement: { width: 300, height: 100 },
  },
});
```

### Text Change Event

```typescript
fireEvent.changeText(element, 'new text');
// Internally creates:
{
  nativeEvent: {
    text: 'new text',
  },
}
```

## Configuration

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

### Jest Config

```json
{
  "jest": {
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"]
  }
}
```
