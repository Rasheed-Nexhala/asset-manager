# React Native Testing Library Examples

## Basic Component Examples

### Simple Button Component

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import Button from './Button';

describe('Button', () => {
  it('renders with title', () => {
    render(<Button title="Click Me" />);
    expect(screen.getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Click Me" onPress={onPress} />);
    
    fireEvent.press(screen.getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button title="Click Me" disabled />);
    const button = screen.getByText('Click Me');
    expect(button).toBeDisabled();
  });
});
```

### Text Input Component

```typescript
// TextInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import CustomTextInput from './CustomTextInput';

describe('CustomTextInput', () => {
  it('renders with placeholder', () => {
    render(<CustomTextInput placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('updates value on text change', () => {
    const onChangeText = jest.fn();
    render(
      <CustomTextInput 
        placeholder="Email" 
        onChangeText={onChangeText}
      />
    );

    const input = screen.getByPlaceholderText('Email');
    fireEvent.changeText(input, 'test@example.com');
    
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });

  it('displays error message when error prop is provided', () => {
    render(
      <CustomTextInput 
        placeholder="Email"
        error="Invalid email format"
      />
    );
    
    expect(screen.getByText('Invalid email format')).toBeTruthy();
  });
});
```

## Form Testing Examples

### Login Form

```typescript
// LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm />);
    
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();
  });

  it('submits form with correct data', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ success: true });
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Email'),
      'test@example.com'
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('Password'),
      'password123'
    );
    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows validation error for empty email', () => {
    render(<LoginForm />);
    
    fireEvent.press(screen.getByText('Login'));
    
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('disables submit button while submitting', async () => {
    const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password');
    fireEvent.press(screen.getByText('Login'));

    const submitButton = screen.getByText('Login');
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
```

## List Component Examples

### FlatList Component

```typescript
// ItemList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import ItemList from './ItemList';

describe('ItemList', () => {
  const mockItems = [
    { id: '1', title: 'Item 1', description: 'Description 1' },
    { id: '2', title: 'Item 2', description: 'Description 2' },
    { id: '3', title: 'Item 3', description: 'Description 3' },
  ];

  it('renders all items', () => {
    render(<ItemList items={mockItems} />);
    
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
    expect(screen.getByText('Item 3')).toBeTruthy();
  });

  it('calls onItemPress when item is pressed', () => {
    const onItemPress = jest.fn();
    render(<ItemList items={mockItems} onItemPress={onItemPress} />);
    
    fireEvent.press(screen.getByText('Item 1'));
    expect(onItemPress).toHaveBeenCalledWith(mockItems[0]);
  });

  it('renders empty state when no items', () => {
    render(<ItemList items={[]} />);
    expect(screen.getByText('No items found')).toBeTruthy();
  });

  it('renders correct number of items', () => {
    render(<ItemList items={mockItems} />);
    const items = screen.getAllByTestId('list-item');
    expect(items).toHaveLength(3);
  });
});
```

## Conditional Rendering Examples

### Toggle Component

```typescript
// ToggleComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import ToggleComponent from './ToggleComponent';

describe('ToggleComponent', () => {
  it('shows content when toggled on', () => {
    render(<ToggleComponent />);
    
    fireEvent.press(screen.getByText('Toggle'));
    expect(screen.getByText('Content is visible')).toBeTruthy();
  });

  it('hides content when toggled off', () => {
    render(<ToggleComponent />);
    
    const toggleButton = screen.getByText('Toggle');
    fireEvent.press(toggleButton); // Toggle on
    fireEvent.press(toggleButton); // Toggle off
    
    expect(screen.queryByText('Content is visible')).toBeNull();
  });

  it('shows different content based on state', () => {
    render(<ToggleComponent />);
    
    expect(screen.getByText('Initial state')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Toggle'));
    expect(screen.getByText('Toggled state')).toBeTruthy();
    expect(screen.queryByText('Initial state')).toBeNull();
  });
});
```

## Async Component Examples

### Data Loading Component

```typescript
// DataLoader.test.tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import DataLoader from './DataLoader';

describe('DataLoader', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('shows loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<DataLoader />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('displays data after loading', async () => {
    const mockData = { name: 'John', age: 30 };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<DataLoader />);

    await waitFor(() => {
      expect(screen.getByText('John')).toBeTruthy();
    });

    expect(screen.queryByText('Loading...')).toBeNull();
  });

  it('displays error message on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<DataLoader />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeTruthy();
    });
  });

  it('removes loading indicator after data loads', async () => {
    const mockData = { name: 'John' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<DataLoader />);

    const loadingIndicator = screen.getByText('Loading...');
    await waitFor(() => {
      expect(loadingIndicator).not.toBeTruthy();
    });
  });
});
```

## Navigation Testing Examples

### Screen with Navigation

```typescript
// HomeScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to profile screen', () => {
    render(<HomeScreen />);
    
    fireEvent.press(screen.getByText('View Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('navigates with params', () => {
    render(<HomeScreen />);
    
    fireEvent.press(screen.getByText('View User'));
    expect(mockNavigate).toHaveBeenCalledWith('User', { userId: '123' });
  });

  it('goes back when back button is pressed', () => {
    render(<HomeScreen />);
    
    fireEvent.press(screen.getByText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
```

## Redux Integration Examples

### Component with Redux

```typescript
// UserProfile.test.tsx
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UserProfile from './UserProfile';
import authReducer from './authSlice';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: initialState },
  });
};

describe('UserProfile', () => {
  it('displays user info from Redux store', () => {
    const store = createMockStore({
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      isAuthenticated: true,
    });

    render(
      <Provider store={store}>
        <UserProfile />
      </Provider>
    );

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
  });

  it('shows login prompt when not authenticated', () => {
    const store = createMockStore({
      user: null,
      isAuthenticated: false,
    });

    render(
      <Provider store={store}>
        <UserProfile />
      </Provider>
    );

    expect(screen.getByText('Please log in')).toBeTruthy();
  });

  it('dispatches action on button press', () => {
    const store = createMockStore({
      user: { id: '1', name: 'John' },
      isAuthenticated: true,
    });

    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <UserProfile />
      </Provider>
    );

    fireEvent.press(screen.getByText('Update Profile'));
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
```

## Accessibility Testing Examples

### Accessible Button

```typescript
// AccessibleButton.test.tsx
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import AccessibleButton from './AccessibleButton';

describe('AccessibleButton', () => {
  it('has accessible role', () => {
    render(<AccessibleButton title="Submit" />);
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });

  it('has accessibility label', () => {
    render(
      <AccessibleButton 
        title="Submit" 
        accessibilityLabel="Submit form"
      />
    );
    const button = screen.getByLabelText('Submit form');
    expect(button).toBeTruthy();
  });

  it('has correct accessibility state when disabled', () => {
    render(<AccessibleButton title="Submit" disabled />);
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibilityState({ disabled: true });
  });
});
```

## Error Boundary Examples

### Error Handling

```typescript
// ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react-native';
import ErrorBoundary from './ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('displays error message when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('calls onError callback', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
  });
});
```

## Custom Hook Integration Examples

### Component Using Custom Hook

```typescript
// CounterComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import CounterComponent from './CounterComponent';

describe('CounterComponent', () => {
  it('displays initial count', () => {
    render(<CounterComponent />);
    expect(screen.getByText('Count: 0')).toBeTruthy();
  });

  it('increments count on button press', () => {
    render(<CounterComponent />);
    
    fireEvent.press(screen.getByText('Increment'));
    expect(screen.getByText('Count: 1')).toBeTruthy();
  });

  it('decrements count on button press', () => {
    render(<CounterComponent />);
    
    fireEvent.press(screen.getByText('Decrement'));
    expect(screen.getByText('Count: -1')).toBeTruthy();
  });

  it('resets count on reset button press', () => {
    render(<CounterComponent />);
    
    fireEvent.press(screen.getByText('Increment'));
    fireEvent.press(screen.getByText('Reset'));
    
    expect(screen.getByText('Count: 0')).toBeTruthy();
  });
});
```
