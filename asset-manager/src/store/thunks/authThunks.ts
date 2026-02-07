import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  signUp,
  signIn,
  logout,
  updateUserProfile,
} from '../../services/firebase/authService';
import { createDefaultUserDocument } from '../../services/firebase/userRoleService';
import type { SignUpCredentials, SignInCredentials } from '../../types/auth';

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

export const signOutUser = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await logout();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign out failed. Please try again.');
    }
  }
);
