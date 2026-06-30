import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from 'firebase/auth';
import type { AuthState } from '../../types/auth';
import { INACTIVE_ACCOUNT_MESSAGE } from '../../services/firebase/authService';
import type { UserRoleData } from '../../types/roles';
import {
  signUpUser,
  signInUser,
  signOutUser,
  deleteAccountUser,
} from '../thunks/authThunks';
import { sanitizeForDisplay } from '../../utils/sanitizeUtils';

const initialState: AuthState = {
  user: null,
  userRole: null,
  isAuthenticated: false,
  isLoading: false,
  isRoleLoading: false,
  authInitialized: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      const wasAuthenticated = state.isAuthenticated;
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
      state.authInitialized = true;
      // Clear error only on successful login; preserve when user becomes null so
      // signOutUser({ reason: 'account-deactivated' }) can show the deactivated message on redirect
      if (action.payload !== null) {
        state.error = null;
      }
      if (action.payload === null) {
        state.userRole = null;
        state.isRoleLoading = false;
      } else if (!wasAuthenticated) {
        // Only start role loading on a fresh login (null → user), not when
        // re-dispatched for an already-authenticated user (e.g. useAuthStateSync
        // confirming the session). This avoids resetting isRoleLoading to true
        // after useUserRoleSync has already resolved it.
        state.isRoleLoading = true;
      }
    },
    setUserRole: (state, action: PayloadAction<UserRoleData | null>) => {
      state.userRole = action.payload;
      state.isRoleLoading = false;
    },
    setRoleLoading: (state, action: PayloadAction<boolean>) => {
      state.isRoleLoading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signUpUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpUser.fulfilled, (state) => {
        // Auth state (user, isAuthenticated, isRoleLoading) is managed
        // exclusively by useAuthStateSync → setUser to avoid race
        // conditions with the delayed thunk resolution.
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(signInUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInUser.fulfilled, (state) => {
        // Auth state (user, isAuthenticated, isRoleLoading) is managed
        // exclusively by useAuthStateSync → setUser to avoid race
        // conditions with the delayed thunk resolution.
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(signOutUser.pending, (state, action) => {
        state.isLoading = true;
        // Set deactivated message for redirect; clear error for normal sign-out
        const arg = action.meta.arg as SignOutPayload | undefined;
        if (arg?.reason === 'account-deactivated') {
          state.error = INACTIVE_ACCOUNT_MESSAGE;
        } else {
          state.error = null;
        }
      })
      .addCase(signOutUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.userRole = null;
        state.isRoleLoading = false;
        state.isAuthenticated = false;
        // Preserve error for account-deactivated so Login screen shows the message
        const arg = action.meta.arg as SignOutPayload | undefined;
        if (arg?.reason !== 'account-deactivated') {
          state.error = null;
        }
      })
      .addCase(signOutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'An unexpected error occurred';
        // Safety: ensure user is cleared even if thunk failed before setUser(null)
        state.user = null;
        state.userRole = null;
        state.isRoleLoading = false;
        state.isAuthenticated = false;
      })
      .addCase(deleteAccountUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccountUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.userRole = null;
        state.isRoleLoading = false;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(deleteAccountUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          sanitizeForDisplay(action.payload as string | undefined) ||
          'Account deletion failed. Please try again.';
      });
  },
});

export const { setUser, setUserRole, setRoleLoading, clearError, setError, setLoading } = authSlice.actions;
export {
  signUpUser,
  signInUser,
  signOutUser,
  deleteAccountUser,
} from '../thunks/authThunks';
export default authSlice.reducer;
