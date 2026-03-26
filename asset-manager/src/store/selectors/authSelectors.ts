import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Permission } from '../../types/roles';

const selectAuthState = (state: RootState) => state.auth;

export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
);

export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth) => auth.isLoading
);

export const selectRoleLoading = createSelector(
  [selectAuthState],
  (auth) => auth.isRoleLoading
);

export const selectIsRoleLoaded = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated ? auth.userRole !== null : true
);

export const selectAuthInitialized = createSelector(
  [selectAuthState],
  (auth) => auth.authInitialized
);

export const selectAuthError = createSelector(
  [selectAuthState],
  (auth) => auth.error
);

export const selectUserEmail = createSelector(
  [selectCurrentUser],
  (user) => user?.email || null
);

export const selectUserDisplayName = createSelector(
  [selectCurrentUser],
  (user) => user?.displayName || user?.email || null
);

export const selectUserId = createSelector(
  [selectAuthState],
  (auth) => auth.user?.uid ?? null
);

export const selectUserRole = createSelector(
  [selectAuthState],
  (auth) => auth.userRole
);

export const selectUserRoleType = createSelector(
  [selectUserRole],
  (role) => role?.role || null
);

export const selectIsActive = createSelector(
  [selectUserRole],
  (role) => role?.isActive ?? true
);

export const selectUserPermissions = createSelector(
  [selectUserRole],
  (role) => role?.permissions || []
);

export const selectIsAdmin = createSelector(
  [selectUserRoleType],
  (role) => role === 'Admin'
);

export const selectIsSuperAdmin = createSelector(
  [selectAuthState],
  (auth) => auth.userRole?.isSuperadmin === true
);

export const selectIsStoreIncharge = createSelector(
  [selectUserRoleType],
  (role) => role === 'StoreIncharge'
);

/** Store Incharge or super admin may create new POs (not regular Admin). */
export const selectCanCreatePurchaseOrder = createSelector(
  [selectIsStoreIncharge, selectIsSuperAdmin],
  (isStoreIncharge, isSuperAdmin) => isStoreIncharge || isSuperAdmin
);

export const selectIsSiteManager = createSelector(
  [selectUserRoleType],
  (role) => role === 'SiteManager'
);

export const selectHasPermission = (permission: Permission) =>
  createSelector(
    [selectUserPermissions],
    (permissions: Permission[]) => permissions.includes(permission)
  );
