# Asset Manager Testing Examples

## Utility Test

```typescript
// src/utils/authValidation.test.ts
import { validateEmail, validateLoginForm } from '../authValidation';

describe('validateLoginForm', () => {
  it('returns empty errors for valid credentials', () => {
    const errors = validateLoginForm({ email: 'a@b.com', password: 'abc123', name: '' });
    expect(errors).toEqual({});
  });

  it('requires email', () => {
    const errors = validateLoginForm({ email: '', password: 'abc123', name: '' });
    expect(errors.email).toBe('Email is required');
  });

  it('requires password at least 6 characters', () => {
    const errors = validateLoginForm({ email: 'a@b.com', password: '123', name: '' });
    expect(errors.password).toBe('Password must be at least 6 characters');
  });
});
```

## Redux Slice Test

```typescript
// src/store/slices/authSlice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setUser, clearError } from './authSlice';

describe('authSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({ reducer: { auth: authReducer } });
  });

  it('setUser sets user and marks authenticated', () => {
    store.dispatch(setUser({ uid: '123', email: 'test@test.com' }));
    expect(store.getState().auth.user).toBeTruthy();
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it('setUser(null) clears user on logout', () => {
    store.dispatch(setUser({ uid: '123' }));
    store.dispatch(setUser(null));
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
```

## Pure Component Test (RequestCard)

```typescript
// src/components/Requests/__tests__/RequestCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RequestCard } from '../RequestCard';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const mockRequest = {
  id: 'req-001',
  requestNumber: 'REQ-001',
  status: 'pending',
  priority: 'high',
  siteName: 'Site Alpha',
  items: [{ id: 'item-1' }, { id: 'item-2' }],
  createdAt: '2026-01-01T10:00:00.000Z',
};

describe('RequestCard', () => {
  it('displays request number and site', () => {
    render(<RequestCard request={mockRequest} onPress={jest.fn()} />);
    expect(screen.getByText('REQ-001')).toBeTruthy();
    expect(screen.getByText('Site Alpha')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<RequestCard request={mockRequest} onPress={onPress} />);
    fireEvent.press(screen.getByAccessibilityLabel('Request REQ-001'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows availability when showAvailability is true', () => {
    render(
      <RequestCard request={mockRequest} onPress={jest.fn()} showAvailability isAllSufficient />
    );
    expect(screen.getByText('All items available')).toBeTruthy();
  });
});
```

## Connected Screen Test (LoginScreen)

```typescript
// src/screens/Authentication/__tests__/LoginScreen.test.tsx
import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { renderWithProviders } from '../../../__tests__/utils/renderWithProviders';

jest.mock('../../../store/thunks/authThunks', () => ({
  signInUser: jest.fn(() => ({ type: 'auth/signInUser/pending', unwrap: () => Promise.resolve() })),
  signUpUser: jest.fn(),
  signOutUser: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

describe('LoginScreen', () => {
  it('shows email validation error when submitted empty', () => {
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByAccessibilityLabel('Log in'));
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('shows auth error from Redux store', () => {
    renderWithProviders(<LoginScreen />, {
      preloadedState: {
        auth: { error: 'Invalid credentials', isLoading: false, user: null, isAuthenticated: false },
      },
    });
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('calls onGoToSignup when sign up link is pressed', () => {
    const mockGoToSignup = jest.fn();
    renderWithProviders(<LoginScreen onGoToSignup={mockGoToSignup} />);
    fireEvent.press(screen.getByText("Don't have an account? Sign up"));
    expect(mockGoToSignup).toHaveBeenCalledTimes(1);
  });
});
```
