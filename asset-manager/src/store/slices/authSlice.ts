import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from 'firebase/auth';
import type { AuthState } from '../../types/auth';
import type { UserRoleData } from '../../types/roles';
import { signUpUser, signInUser, signOutUser } from '../thunks/authThunks';

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
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
      state.authInitialized = true;
      // Only clear error on successful login; preserve error when user becomes null
      // (e.g. signOut due to inactive account - we need to show the deactivated message)
      if (action.payload !== null) {
        state.error = null;
      }
      // Clear userRole when user logs out
      if (action.payload === null) {
        state.userRole = null;
        state.isRoleLoading = false;
      } else {
        // When user logs in, start loading role
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
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(signInUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(signOutUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signOutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.userRole = null;
        state.isRoleLoading = false;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(signOutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUser, setUserRole, setRoleLoading, clearError, setLoading } = authSlice.actions;
export { signUpUser, signInUser, signOutUser } from '../thunks/authThunks';
export default authSlice.reducer;
