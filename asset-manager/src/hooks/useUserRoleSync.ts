import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import type { AppDispatch } from '../store';
import {
  setUser,
  setUserRole,
  setRoleLoading,
  setError,
  signOutUser,
} from '../store/slices/authSlice';
import { subscribeToUserRole } from '../services/firebase/userRoleService';

const SIGN_OUT_ERROR_MESSAGE =
  'Something went wrong during sign out. Please try again.';

/**
 * Attempts to sign out the user. Retries once on failure.
 * On final failure, clears user locally and sets error so the user can reach the Login screen.
 */
async function performAutoLogout(dispatch: AppDispatch) {
  try {
    await dispatch(signOutUser({ reason: 'account-deactivated' })).unwrap();
    return;
  } catch {
    // Retry once (e.g. transient network failure)
    try {
      await dispatch(signOutUser({ reason: 'account-deactivated' })).unwrap();
      return;
    } catch {
      // Force clear user locally so user reaches Login screen; Firebase logout failed
      dispatch(setUser(null));
      dispatch(setError(SIGN_OUT_ERROR_MESSAGE));
    }
  }
}

/**
 * Hook that subscribes to real-time user role updates from Firestore
 *
 * This hook automatically listens for changes to the user's role data in Firestore
 * whenever the userId changes. It stores the role data in Redux state
 * for easy access throughout the app and updates automatically when data changes.
 *
 * When the user is made inactive (isActive: false), the user is automatically
 * signed out to enforce access control. If sign-out fails (e.g. network error),
 * the user is still cleared locally and shown an error on the Login screen.
 *
 * @param userId - The Firebase user ID (uid)
 *
 * @example
 * ```tsx
 * const userId = useAppSelector(selectUserId);
 * useUserRoleSync(userId);
 * ```
 */
export const useUserRoleSync = (userId: string | null): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!userId) {
      dispatch(setUserRole(null));
      dispatch(setRoleLoading(false));
      return;
    }

    dispatch(setRoleLoading(true));

    // Subscribe to real-time updates for the user's role
    const unsubscribe = subscribeToUserRole(userId, (userRole) => {
      // Auto-logout when user is made inactive
      if (userRole && userRole.isActive === false) {
        performAutoLogout(dispatch);
        return;
      }

      dispatch(setUserRole(userRole));
      dispatch(setRoleLoading(false));
    });

    // Cleanup subscription on unmount or userId change
    return () => {
      unsubscribe();
    };
  }, [userId, dispatch]);
};

export default useUserRoleSync;
