import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setUserRole, setRoleLoading, signOutUser } from '../store/slices/authSlice';
import { subscribeToUserRole } from '../services/firebase/userRoleService';

/**
 * Hook that subscribes to real-time user role updates from Firestore
 *
 * This hook automatically listens for changes to the user's role data in Firestore
 * whenever the userId changes. It stores the role data in Redux state
 * for easy access throughout the app and updates automatically when data changes.
 *
 * When the user is made inactive (isActive: false), the user is automatically
 * signed out to enforce access control.
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
        dispatch(signOutUser());
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
