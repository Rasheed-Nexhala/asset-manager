---
name: react-native-testing-library
description: Test React Native components using React Native Testing Library with focus on accessibility, user interactions, and component behavior. Use when testing components, writing component tests, or when the user mentions component testing, accessibility testing, or React Native Testing Library.
---

# React Native Testing Library - Component Testing

## Core Principle

> The more your tests resemble the way your software is used, the more confidence they can give you.

Test components from the user's perspective - what they see and interact with, not implementation details.

## Query Priority (Most Accessible First)

1. **`getByRole`** - Query by accessibility role (preferred)
2. **`getByLabelText`** - Query by accessibility label
3. **`getByText`** - Query by visible text
4. **`getByPlaceholderText`** - Query input placeholders
5. **`getByDisplayValue`** - Query input values
6. **`getByTestId`** - Last resort, requires `testID` prop

## Basic Component Test

```typescript
import { render, screen } from '@testing-library/react-native';
import Button from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button title="Click Me" />);
    expect(screen.getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Click Me" onPress={onPress} />);
    
    fireEvent.press(screen.getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

## Query Types

### getBy* (Throws if not found)
Use when element must exist:

```typescript
const button = screen.getByText('Submit');
const input = screen.getByPlaceholderText('Email');
const element = screen.getByTestId('my-component');
```

### queryBy* (Returns null if not found)
Use when element might not exist:

```typescript
const maybeText = screen.queryByText('Optional Text');
if (maybeText) {
  // Element exists
}
```

### findBy* (Returns Promise, waits for element)
Use for async elements:

```typescript
const asyncElement = await screen.findByText('Loaded');
```

### getAllBy* / queryAllBy* / findAllBy*
Use for multiple elements:

```typescript
const buttons = screen.getAllByRole('button');
const items = await screen.findAllByTestId('list-item');
```

## Testing User Interactions

### Press Events

```typescript
import { fireEvent } from '@testing-library/react-native';

// Press button
fireEvent.press(screen.getByText('Submit'));

// Long press
fireEvent(screen.getByText('Hold'), 'longPress');
```

### Text Input

```typescript
// Change text
fireEvent.changeText(
  screen.getByPlaceholderText('Email'),
  'test@example.com'
);

// Focus/Blur
fireEvent(screen.getByPlaceholderText('Email'), 'focus');
fireEvent(screen.getByPlaceholderText('Email'), 'blur');
```

### Scroll Events

```typescript
fireEvent.scroll(screen.getByTestId('scroll-view'), {
  nativeEvent: {
    contentOffset: { y: 100 },
    contentSize: { height: 500 },
    layoutMeasurement: { height: 100 },
  },
});
```

## Testing Accessibility

### Using Roles

```typescript
// Button role
const button = screen.getByRole('button');
const submitButton = screen.getByRole('button', { name: 'Submit' });

// Text role
const heading = screen.getByRole('header');
const text = screen.getByRole('text');

// TextInput role
const input = screen.getByRole('textinput');
```

### Using Accessibility Labels

```typescript
// Component with accessibilityLabel prop
<Button accessibilityLabel="Submit form" />

// Query by label
const button = screen.getByLabelText('Submit form');
```

### Accessibility Matchers

```typescript
import '@testing-library/jest-native/extend-expect';

expect(element).toBeAccessible();
expect(element).toHaveAccessibilityValue({ min: 0, max: 100 });
expect(element).toHaveAccessibilityState({ disabled: false });
```

## Testing Component Props

```typescript
describe('UserCard', () => {
  it('displays user name', () => {
    const user = { name: 'John Doe', email: 'john@example.com' };
    render(<UserCard user={user} />);
    
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
  });

  it('handles missing props gracefully', () => {
    render(<UserCard user={null} />);
    expect(screen.getByText('No user data')).toBeTruthy();
  });
});
```

## Testing Conditional Rendering

```typescript
describe('ConditionalComponent', () => {
  it('shows content when condition is true', () => {
    render(<ConditionalComponent showContent={true} />);
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('hides content when condition is false', () => {
    render(<ConditionalComponent showContent={false} />);
    expect(screen.queryByText('Content')).toBeNull();
  });
});
```

## Testing Lists

```typescript
describe('ItemList', () => {
  const items = ['Item 1', 'Item 2', 'Item 3'];

  it('renders all items', () => {
    render(<ItemList items={items} />);
    
    items.forEach(item => {
      expect(screen.getByText(item)).toBeTruthy();
    });
  });

  it('renders correct number of items', () => {
    render(<ItemList items={items} />);
    const listItems = screen.getAllByTestId('list-item');
    expect(listItems).toHaveLength(3);
  });
});
```

## Testing Async Behavior

### Using waitFor

```typescript
import { waitFor } from '@testing-library/react-native';

it('loads data asynchronously', async () => {
  render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeTruthy();
  });
});
```

### Using findBy*

```typescript
it('displays data after loading', async () => {
  render(<AsyncComponent />);
  
  const loadedText = await screen.findByText('Loaded');
  expect(loadedText).toBeTruthy();
});
```

### Waiting for Element Removal

```typescript
import { waitForElementToBeRemoved } from '@testing-library/react-native';

it('removes loading indicator', async () => {
  render(<AsyncComponent />);
  
  await waitForElementToBeRemoved(() => 
    screen.getByText('Loading...')
  );
});
```

## Testing with Providers

### Redux Provider

```typescript
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: initialState },
  });
};

it('displays user from Redux store', () => {
  const store = createMockStore({
    user: { name: 'John' },
  });

  render(
    <Provider store={store}>
      <UserProfile />
    </Provider>
  );

  expect(screen.getByText('John')).toBeTruthy();
});
```

### Custom Wrapper

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

// Use customRender instead of render
customRender(<Component />);
```

## Common Patterns

### Testing Form Submission

```typescript
it('submits form with correct data', () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  fireEvent.changeText(
    screen.getByPlaceholderText('Email'),
    'test@example.com'
  );
  fireEvent.changeText(
    screen.getByPlaceholderText('Password'),
    'password123'
  );
  fireEvent.press(screen.getByText('Submit'));

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  });
});
```

### Testing Navigation

```typescript
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

it('navigates on button press', () => {
  render(<NavigationButton />);
  
  fireEvent.press(screen.getByText('Go to Home'));
  expect(mockNavigate).toHaveBeenCalledWith('Home');
});
```

### Testing Error States

```typescript
it('displays error message', () => {
  render(<Form error="Invalid email" />);
  expect(screen.getByText('Invalid email')).toBeTruthy();
});

it('handles error gracefully', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation();
  
  render(<ErrorBoundary><BrokenComponent /></ErrorBoundary>);
  expect(screen.getByText('Something went wrong')).toBeTruthy();
  
  consoleError.mockRestore();
});
```

## Best Practices

1. **Test user behavior, not implementation** - Focus on what users see and do
2. **Use accessible queries first** - Prefer `getByRole` over `getByTestId`
3. **One assertion per test** - Keep tests focused and readable
4. **Descriptive test names** - Use "should" or "it" format describing behavior
5. **Arrange-Act-Assert** - Structure tests clearly
6. **Avoid testing implementation details** - Don't test internal state or methods
7. **Use testID sparingly** - Only when other queries don't work

## Common Mistakes to Avoid

❌ **Don't test implementation details:**
```typescript
// Bad - testing internal state
expect(component.state.isLoading).toBe(true);

// Good - testing user-visible behavior
expect(screen.getByText('Loading...')).toBeTruthy();
```

❌ **Don't overuse testID:**
```typescript
// Bad - using testID when text is available
screen.getByTestId('submit-button');

// Good - using accessible query
screen.getByRole('button', { name: 'Submit' });
```

❌ **Don't test multiple things in one test:**
```typescript
// Bad - multiple assertions
it('handles form', () => {
  // ... setup
  expect(screen.getByText('Email')).toBeTruthy();
  expect(screen.getByText('Password')).toBeTruthy();
  expect(screen.getByText('Submit')).toBeTruthy();
});

// Good - focused tests
it('displays email field', () => {
  expect(screen.getByText('Email')).toBeTruthy();
});
```

## Additional Resources

- For detailed examples, see [examples.md](examples.md)
- For API reference, see [reference.md](reference.md)
