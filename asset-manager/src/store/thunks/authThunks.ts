import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  signUp,
  signIn,
  logout,
  updateUserProfile,
} from '../../services/firebase/authService';
import { createDefaultUserDocument } from '../../services/firebase/userRoleService';
import { clearActivityLogs } from '../slices/activityLogSlice';
import {
  unsubscribeFromActivityLogs,
  unsubscribeFromMyRecentActivity,
} from './activityLogThunks';
import type { SignUpCredentials, SignInCredentials } from '../../types/auth';
import type { AppDispatch, RootState } from '../index';

export const signUpUser = createAsyncThunk(
  'auth/signUp',
  async (credentials: SignUpCredentials, { rejectWithValue }) => {
    try {
      const userCredential = await signUp(credentials.email, credentials.password);

      if (credentials.displayName) {
        await updateUserProfile({ displayName: credentials.displayName });
      }

      // Create user document in Firestore with default role
      await createDefaultUserDocument(
        userCredential.user.uid,
        userCredential.user.email,
        credentials.displayName || null
      );

      return userCredential.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign up failed. Please try again.');
    }
  }
);

export const signInUser = createAsyncThunk(
  'auth/signIn',
  async (credentials: SignInCredentials, { rejectWithValue }) => {
    try {
      const userCredential = await signIn(credentials.email, credentials.password);
      return userCredential.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign in failed. Please try again.');
    }
  }
);

export const signOutUser = createAsyncThunk<
  null,
  void,
  { state: RootState; dispatch: AppDispatch }
>(
  'auth/signOut',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(unsubscribeFromActivityLogs());
      dispatch(unsubscribeFromMyRecentActivity());
      await logout();
      dispatch(clearActivityLogs());
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign out failed. Please try again.');
    }
  }
);
