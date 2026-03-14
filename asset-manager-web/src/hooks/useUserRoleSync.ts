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

async function performAutoLogout(dispatch: AppDispatch) {
  try {
    await dispatch(signOutUser({ reason: 'account-deactivated' })).unwrap();
    return;
  } catch {
    try {
      await dispatch(signOutUser({ reason: 'account-deactivated' })).unwrap();
      return;
    } catch {
      dispatch(setUser(null));
      dispatch(setError(SIGN_OUT_ERROR_MESSAGE));
    }
  }
}

/**
 * Hook that subscribes to real-time user role updates from Firestore
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

    const unsubscribe = subscribeToUserRole(userId, (userRole) => {
      if (userRole && userRole.isActive === false) {
        performAutoLogout(dispatch);
        return;
      }

      dispatch(setUserRole(userRole));
      dispatch(setRoleLoading(false));
    });

    return () => {
      unsubscribe();
    };
  }, [userId, dispatch]);
};

export default useUserRoleSync;
