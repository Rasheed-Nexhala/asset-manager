import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { subscribeToSiteManagers } from '../services/firebase/userRoleService';
import { cleanupManagerAssignments } from '../store/thunks/managerValidationThunks';
import {
  selectIsAuthenticated,
  selectIsAdminOrSuperAdmin,
  selectIsRoleLoaded,
} from '../store/selectors/authSelectors';
import type { UserListItem } from '../types/roles';

/**
 * Hook that monitors all users for changes that invalidate site manager assignments
 * and automatically triggers cleanup operations.
 */
export const useManagerValidationSync = (): void => {
  const dispatch = useAppDispatch();
  const previousUsersRef = useRef<Map<string, UserListItem>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCleanupsRef = useRef<Set<string>>(new Set());

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isRoleLoaded = useAppSelector(selectIsRoleLoaded);
  const shouldRun = isAuthenticated && isRoleLoaded && isAdminOrSuperAdmin;

  const checkManagerInvalidation = useCallback(
    (prevUser: UserListItem | undefined, currentUser: UserListItem | undefined): boolean => {
      if (prevUser && !currentUser) return true;
      if (prevUser?.isActive && currentUser && !currentUser.isActive) return true;
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

  const processPendingCleanups = useCallback(() => {
    const managerIdsToCleanup = Array.from(pendingCleanupsRef.current);
    pendingCleanupsRef.current.clear();

    managerIdsToCleanup.forEach((managerId) => {
      dispatch(cleanupManagerAssignments(managerId)).catch((error) => {
        console.error(`Failed to cleanup manager ${managerId}:`, error);
      });
    });
  }, [dispatch]);

  const triggerCleanup = useCallback(
    (managerId: string) => {
      pendingCleanupsRef.current.add(managerId);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        processPendingCleanups();
      }, 2000);
    },
    [processPendingCleanups]
  );

  useEffect(() => {
    if (!shouldRun) return;

    const unsubscribe = subscribeToSiteManagers((currentUsers) => {
      const currentUsersMap = new Map<string, UserListItem>();
      currentUsers.forEach((user) => {
        currentUsersMap.set(user.id, user);
      });

      const previousUsers = previousUsersRef.current;

      const allUserIds = new Set([
        ...previousUsers.keys(),
        ...currentUsersMap.keys(),
      ]);

      allUserIds.forEach((userId) => {
        const prevUser = previousUsers.get(userId);
        const currentUser = currentUsersMap.get(userId);

        if (
          prevUser?.role === 'SiteManager' ||
          (currentUser?.role === 'SiteManager' && !prevUser)
        ) {
          if (checkManagerInvalidation(prevUser, currentUser)) {
            triggerCleanup(userId);
          }
        }
      });

      previousUsersRef.current = currentUsersMap;
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [shouldRun, checkManagerInvalidation, triggerCleanup]);
};

export default useManagerValidationSync;
