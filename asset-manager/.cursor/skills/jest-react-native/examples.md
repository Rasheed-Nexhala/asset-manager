# Jest Testing Examples

## Component Testing Examples

### Simple Component Test

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
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

### Component with Props

```typescript
// UserCard.test.tsx
import { render, screen } from '@testing-library/react-native';
import UserCard from './UserCard';

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  it('displays user information', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
  });

  it('handles missing user gracefully', () => {
    render(<UserCard user={null} />);
    expect(screen.getByText('No user data')).toBeTruthy();
  });
});
```

### Component with NativeWind Classes

```typescript
// Card.test.tsx
import { render } from '@testing-library/react-native';
import Card from './Card';

describe('Card', () => {
  it('applies className correctly', () => {
    const { getByTestId } = render(
      <Card testID="card" className="bg-blue-500 p-4" />
    );
    
    const card = getByTestId('card');
    expect(card).toBeTruthy();
    // Note: NativeWind classes are applied at runtime, test behavior not classes
  });
});
```

## Hook Testing Examples

### Custom Hook with State

```typescript
// useCounter.test.ts
import { renderHook, act } from '@testing-library/react-native';
import useCounter from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.decrement();
    });
    
    expect(result.current.count).toBe(4);
  });
});
```

### Hook with Async Operations

```typescript
// useFetch.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import useFetch from './useFetch';

describe('useFetch', () => {
  it('fetches data successfully', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useFetch('/api/data'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });
    expect(result.current.error).toBe(null);
  });
});
```

## Redux Testing Examples

### Testing a Slice

```typescript
// authSlice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  login,
  logout,
  setUser,
  initialState,
} from './authSlice';

describe('authSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: { auth: authReducer },
    });
  });

  it('handles initial state', () => {
    expect(store.getState().auth).toEqual(initialState);
  });

  it('handles login', () => {
    const user = { id: '1', email: 'test@example.com' };
    store.dispatch(login(user));
    
    expect(store.getState().auth.user).toEqual(user);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it('handles logout', () => {
    store.dispatch(login({ id: '1', email: 'test@example.com' }));
    store.dispatch(logout());
    
    expect(store.getState().auth.user).toBe(null);
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
```

### Testing Selectors

```typescript
// selectors.test.ts
import { selectIsAuthenticated, selectUser } from './selectors';
import { RootState } from './store';

describe('auth selectors', () => {
  const mockState: RootState = {
    auth: {
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
    },
  };

  it('selectIsAuthenticated returns correct value', () => {
    expect(selectIsAuthenticated(mockState)).toBe(true);
  });

  it('selectUser returns user data', () => {
    expect(selectUser(mockState)).toEqual({
      id: '1',
      email: 'test@example.com',
    });
  });
});
```

## Utility Function Testing

### Pure Functions

```typescript
// utils.test.ts
import { formatCurrency, calculateTotal, validateEmail } from './utils';

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(100)).toBe('$100.00');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('handles negative numbers', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
  });
});

describe('calculateTotal', () => {
  it('calculates sum of array', () => {
    expect(calculateTotal([10, 20, 30])).toBe(60);
  });

  it('handles empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
});

describe('validateEmail', () => {
  it('validates correct emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
  });
});
```

## Mocking Examples

### Mocking Firebase

```typescript
// authService.test.ts
import authService from './authService';

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    currentUser: null,
  })),
}));

describe('authService', () => {
  it('signs in user', async () => {
    const { default: auth } = require('@react-native-firebase/auth');
    auth().signInWithEmailAndPassword.mockResolvedValue({
      user: { uid: '123', email: 'test@example.com' },
    });

    const result = await authService.signIn('test@example.com', 'password');
    
    expect(result.user.uid).toBe('123');
    expect(auth().signInWithEmailAndPassword).toHaveBeenCalledWith(
      'test@example.com',
      'password'
    );
  });
});
```

### Mocking Navigation

```typescript
// LoginScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('LoginScreen', () => {
  it('navigates to home after successful login', async () => {
    render(<LoginScreen />);
    
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password');
    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Home');
    });
  });
});
```

### Mocking Async Functions

```typescript
// api.test.ts
import { fetchUserData } from './api';

describe('fetchUserData', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches user data successfully', async () => {
    const mockData = { id: '1', name: 'John' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchUserData('1');
    expect(result).toEqual(mockData);
  });

  it('handles fetch errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(fetchUserData('1')).rejects.toThrow('Network error');
  });
});
```

## Integration Test Example

### Testing Component with Redux

```typescript
// UserProfile.test.tsx
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UserProfile from './UserProfile';
import authReducer from './authSlice';

describe('UserProfile', () => {
  const createMockStore = (initialState = {}) => {
    return configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: initialState },
    });
  };

  it('displays user info from Redux store', () => {
    const store = createMockStore({
      user: { id: '1', name: 'John Doe', email: 'john@example.com' },
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
});
```
