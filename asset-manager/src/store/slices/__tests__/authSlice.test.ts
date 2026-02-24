// Mock authThunks to avoid Firebase dependency; use createAsyncThunk for correct action types
jest.mock('../../thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk('auth/signIn', async () => ({ uid: 'mock' })),
    signOutUser: createAsyncThunk('auth/signOut', async () => null),
    signUpUser: createAsyncThunk('auth/signUp', async () => ({ uid: 'mock' })),
  };
});

import authReducer, { setUser, setUserRole, clearError, setLoading } from '../authSlice';
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

  it('signInUser.fulfilled sets user and isAuthenticated', () => {
    const state = authReducer(
      initialState,
      signInUser.fulfilled(mockUser, 'req1', { email: 'a@b.com', password: 'pwd' })
    );
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
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
  });
});
