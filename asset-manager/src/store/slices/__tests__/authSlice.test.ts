// Mock authThunks to avoid Firebase dependency; use createAsyncThunk for correct action types
jest.mock('../../thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk('auth/signIn', async () => ({ uid: 'mock' })),
    signOutUser: createAsyncThunk('auth/signOut', async () => null),
    signUpUser: createAsyncThunk('auth/signUp', async () => ({ uid: 'mock' })),
  };
});

import authReducer, { setUser, setUserRole, clearError, setError, setLoading } from '../authSlice';
import { signInUser, signOutUser } from '../../thunks/authThunks';

const mockUser = {
  uid: 'user123',
  email: 'user@example.com',
  displayName: 'Test User',
} as unknown as import('firebase/auth').User;

describe('authSlice', () => {
  const initialState = {
    user: null,
    userRole: null,
    isAuthenticated: false,
    isLoading: false,
    isRoleLoading: false,
    authInitialized: false,
    error: null,
  };

  it('has correct initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setUser sets user and isAuthenticated when user is provided', () => {
    const state = authReducer(initialState, setUser(mockUser));
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.error).toBe(null);
    expect(state.isRoleLoading).toBe(true);
  });

  it('setUser clears user and isAuthenticated when user is null', () => {
    const withUser = authReducer(initialState, setUser(mockUser));
    const state = authReducer(withUser, setUser(null));
    expect(state.user).toBe(null);
    expect(state.isAuthenticated).toBe(false);
    expect(state.userRole).toBe(null);
    expect(state.isRoleLoading).toBe(false);
  });

  it('setUser preserves error when user becomes null (e.g. signOut for account-deactivated)', () => {
    const withUserAndError = authReducer(
      { ...initialState, user: mockUser, error: 'Your account is deactivated, please contact admin.' },
      setUser(null)
    );
    expect(withUserAndError.user).toBe(null);
    expect(withUserAndError.error).toBe('Your account is deactivated, please contact admin.');
  });

  it('setUserRole sets userRole and clears isRoleLoading', () => {
    const role = { role: 'Admin' as const, isActive: true, permissions: [] };
    const state = authReducer(initialState, setUserRole(role));
    expect(state.userRole).toEqual(role);
    expect(state.isRoleLoading).toBe(false);
  });

  it('clearError clears error', () => {
    const withError = authReducer(
      { ...initialState, error: 'Something went wrong' },
      clearError()
    );
    expect(withError.error).toBe(null);
  });

  it('setError sets error message', () => {
    const message = 'Your account is deactivated, please contact admin.';
    const state = authReducer(initialState, setError(message));
    expect(state.error).toBe(message);
  });

  it('setLoading sets isLoading', () => {
    const state = authReducer(initialState, setLoading(true));
    expect(state.isLoading).toBe(true);
  });

  it('signInUser.pending sets isLoading and clears error', () => {
    const state = authReducer(
      initialState,
      signInUser.pending('req1', { email: 'a@b.com', password: 'pwd' })
    );
    expect(state.isLoading).toBe(true);
    expect(state.error).toBe(null);
  });

  it('signInUser.fulfilled sets user, isAuthenticated, and isRoleLoading', () => {
    const state = authReducer(
      initialState,
      signInUser.fulfilled(mockUser, 'req1', { email: 'a@b.com', password: 'pwd' })
    );
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
    // Role must still be loaded by useUserRoleSync before Main is shown
    expect(state.isRoleLoading).toBe(true);
  });

  it('signUpUser.fulfilled sets user, isAuthenticated, and isRoleLoading', () => {
    const { signUpUser } = require('../../thunks/authThunks');
    const state = authReducer(
      initialState,
      signUpUser.fulfilled(mockUser, 'req1', { email: 'a@b.com', password: 'pwd' })
    );
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
    // Role must still be loaded by useUserRoleSync before Main is shown
    expect(state.isRoleLoading).toBe(true);
  });

  it('signInUser.rejected clears user and isAuthenticated', () => {
    const withUser = authReducer(initialState, signInUser.fulfilled(mockUser, 'req1', { email: 'a@b.com', password: 'pwd' }));
    const state = authReducer(
      withUser,
      signInUser.rejected(
        'Invalid credentials' as never,
        'req1',
        { email: 'a@b.com', password: 'pwd' }
      )
    );
    expect(state.isLoading).toBe(false);
    expect(state.user).toBe(null);
    expect(state.isAuthenticated).toBe(false);
  });

  it('signOutUser.fulfilled clears user and role', () => {
    const withUser = authReducer(initialState, setUser(mockUser));
    const state = authReducer(withUser, signOutUser.fulfilled(null, 'req1'));
    expect(state.user).toBe(null);
    expect(state.userRole).toBe(null);
    expect(state.isAuthenticated).toBe(false);
    expect(state.isRoleLoading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('signOutUser preserves error when sign-out is due to account deactivation', () => {
    const withUser = authReducer(initialState, setUser(mockUser));
    const deactivatedArg = { reason: 'account-deactivated' as const };
    const afterPending = authReducer(
      withUser,
      signOutUser.pending('req1', deactivatedArg)
    );
    expect(afterPending.error).toBe('Your account is deactivated, please contact admin.');
    const afterFulfilled = authReducer(
      afterPending,
      signOutUser.fulfilled(null, 'req1', deactivatedArg)
    );
    expect(afterFulfilled.user).toBe(null);
    expect(afterFulfilled.isAuthenticated).toBe(false);
    expect(afterFulfilled.error).toBe('Your account is deactivated, please contact admin.');
  });

  it('signOutUser.rejected clears user and sets error', () => {
    const withUser = authReducer(initialState, setUser(mockUser));
    const state = authReducer(
      withUser,
      signOutUser.rejected(
        new Error('Network error'),
        'req1',
        undefined,
        'Sign out failed'
      )
    );
    expect(state.user).toBe(null);
    expect(state.userRole).toBe(null);
    expect(state.isAuthenticated).toBe(false);
    expect(state.isRoleLoading).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Sign out failed');
  });
});
