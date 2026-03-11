import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setUser, setError } from '../store/slices/authSlice';
import {
  subscribeToAuthState,
  signOutOnly,
  INACTIVE_ACCOUNT_MESSAGE,
} from '../services/firebase/authService';
import { getUserRole } from '../services/firebase/userRoleService';

/**
 * Syncs Firebase auth state to Redux, but only sets user after validating isActive.
 * Prevents flicker: inactive users never see the main app before being redirected to Login.
 */
export const useAuthStateSync = (): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Prevents stale dispatches if auth state changes while getUserRole is in-flight
    // (e.g. user logs out before the Firestore read resolves)
    let cancelled = false;

    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user === null) {
        dispatch(setUser(null));
        return;
      }

      try {
        const userRole = await getUserRole(user.uid);
        if (cancelled) return;
        if (userRole?.isActive === false) {
          await signOutOnly();
          if (cancelled) return;
          dispatch(setUser(null));
          dispatch(setError(INACTIVE_ACCOUNT_MESSAGE));
        } else {
          dispatch(setUser(user));
        }
      } catch (error) {
        if (cancelled) return;
        // Fail closed: do not allow user if role fetch fails
        await signOutOnly();
        if (cancelled) return;
        dispatch(setUser(null));
        dispatch(setError('Failed to verify user permissions. Please try again.'));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [dispatch]);
};

export default useAuthStateSync;
