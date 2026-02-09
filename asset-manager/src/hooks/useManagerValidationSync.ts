import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { subscribeToAllUsers } from '../services/firebase/userRoleService';
import { cleanupManagerAssignments } from '../store/thunks/managerValidationThunks';
import { selectIsAuthenticated, selectIsAdmin, selectIsRoleLoaded } from '../store/selectors/authSelectors';
import type { UserListItem } from '../types/roles';

/**
 * Hook that monitors all users for changes that invalidate site manager assignments
 * and automatically triggers cleanup operations.
 *
 * This hook subscribes to real-time user updates and detects when:
 * - A SiteManager is deactivated (isActive: false)
 * - A SiteManager's role changes to something other than 'SiteManager'
 * - A user is deleted (no longer exists in the users collection)
 *
 * When invalidations are detected, it automatically unassigns the manager from all sites.
 * Uses debouncing to batch rapid changes and prevent excessive Firestore operations.
 *
 * @example
 * ```tsx
 * useManagerValidationSync();
 * ```
 */
export const useManagerValidationSync = (): void => {
  const dispatch = useAppDispatch();
  const previousUsersRef = useRef<Map<string, UserListItem>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCleanupsRef = useRef<Set<string>>(new Set());

  // Only run for authenticated admin users
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isRoleLoaded = useAppSelector(selectIsRoleLoaded);
  const shouldRun = isAuthenticated && isRoleLoaded && isAdmin;

  /**
   * Check if a user change invalidates their manager assignment
   */
  const checkManagerInvalidation = useCallback(
    (prevUser: UserListItem | undefined, currentUser: UserListItem | undefined): boolean => {
      // User was deleted
      if (prevUser && !currentUser) {
        return true;
      }

      // User was deactivated
      if (prevUser?.isActive && currentUser && !currentUser.isActive) {
        return true;
      }

      // Role changed from SiteManager to something else
      if (
        prevUser?.role === 'SiteManager' &&
        currentUser &&
        currentUser.role !== 'SiteManager'
      ) {
        return true;
      }

      return false;
    },
    []
  );

  /**
   * Process pending cleanup operations
   */
  const processPendingCleanups = useCallback(() => {
    const managerIdsToCleanup = Array.from(pendingCleanupsRef.current);
    pendingCleanupsRef.current.clear();

    // Dispatch cleanup for each invalid manager
    managerIdsToCleanup.forEach((managerId) => {
      dispatch(cleanupManagerAssignments(managerId)).catch((error) => {
        console.error(`Failed to cleanup manager ${managerId}:`, error);
      });
    });
  }, [dispatch]);

  /**
   * Debounced cleanup trigger
   */
  const triggerCleanup = useCallback(
    (managerId: string) => {
      pendingCleanupsRef.current.add(managerId);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer (2 second debounce)
      debounceTimerRef.current = setTimeout(() => {
        processPendingCleanups();
      }, 2000);
    },
    [processPendingCleanups]
  );

  useEffect(() => {
    // Only subscribe if user is authenticated admin with loaded role
    if (!shouldRun) {
      return;
    }

    // Subscribe to all users for real-time updates
    const unsubscribe = subscribeToAllUsers((currentUsers) => {
      const currentUsersMap = new Map<string, UserListItem>();
      currentUsers.forEach((user) => {
        currentUsersMap.set(user.id, user);
      });

      const previousUsers = previousUsersRef.current;

      // Check each user for changes that invalidate manager assignments
      const allUserIds = new Set([
        ...previousUsers.keys(),
        ...currentUsersMap.keys(),
      ]);

      allUserIds.forEach((userId) => {
        const prevUser = previousUsers.get(userId);
        const currentUser = currentUsersMap.get(userId);

        // Only check users who were SiteManagers or are being checked for the first time
        if (
          prevUser?.role === 'SiteManager' ||
          (currentUser?.role === 'SiteManager' && !prevUser)
        ) {
          if (checkManagerInvalidation(prevUser, currentUser)) {
            // Manager became invalid, trigger cleanup
            triggerCleanup(userId);
          }
        }
      });

      // Update ref for next comparison
      previousUsersRef.current = currentUsersMap;
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [shouldRun, checkManagerInvalidation, triggerCleanup]);
};

export default useManagerValidationSync;
