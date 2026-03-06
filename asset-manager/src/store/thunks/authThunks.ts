import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  signUp,
  signIn,
  logout,
  updateUserProfile,
} from '../../services/firebase/authService';
import { createDefaultUserDocument } from '../../services/firebase/userRoleService';
import { setUser } from '../slices/authSlice';
import { clearActivityLogs } from '../slices/activityLogSlice';
import { clearInventory } from '../slices/inventorySlice';
import { clearAccess } from '../slices/inventoryUpdateRequestSlice';
import { clearRequests } from '../slices/requestsSlice';
import { clearMaintenance } from '../slices/maintenanceSlice';
import { clearPurchaseOrders } from '../slices/purchaseOrderSlice';
import { clearSteelMasters } from '../slices/steelMasterSlice';
import { clearSites } from '../slices/sitesSlice';
import { unsubscribeFromActivityLogs } from './activityLogThunks';
import { unsubscribeFromMyActiveAccess } from './inventoryUpdateRequestThunks';
import type {
  SignUpCredentials,
  SignInCredentials,
  SignOutPayload,
} from '../../types/auth';
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
  SignOutPayload | void,
  { state: RootState; dispatch: AppDispatch }
>(
  'auth/signOut',
  async (_arg, { dispatch, rejectWithValue }) => {
    try {
      // 1. Unsubscribe from thunk-managed listeners
      dispatch(unsubscribeFromActivityLogs());
      dispatch(unsubscribeFromMyActiveAccess());

      // 2. Clear user in Redux FIRST so RootNavigator switches to Auth screen.
      //    This unmounts MainStackNavigator and all Firestore subscriptions
      //    BEFORE we invalidate auth. Prevents "Missing or insufficient permissions"
      //    errors from subscriptions firing with null auth.
      dispatch(setUser(null));

      // 3. Let React flush the unmount so subscriptions clean up
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 4. Clear all feature-domain state
      dispatch(clearActivityLogs());
      dispatch(clearInventory());
      dispatch(clearAccess());
      dispatch(clearRequests());
      dispatch(clearMaintenance());
      dispatch(clearPurchaseOrders());
      dispatch(clearSteelMasters());
      dispatch(clearSites());

      // 5. Invalidate Firebase auth last (after subscriptions are torn down)
      await logout();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign out failed. Please try again.');
    }
  }
);
