/**
 * User Roles in the system
 */
export type UserRole =
  | 'SuperAdmin'
  | 'Admin'
  | 'StoreIncharge'
  | 'SiteManager'
  | 'Unassigned';

/**
 * Available permissions
 */
export type Permission = 
  | 'canCreateUser'
  | 'canDeleteUser'
  | 'canEditUser'
  | 'canManageInventory'
  | 'canApproveOrders'
  | 'canGenerateReports'
  | 'canManageAssets';

/**
 * User role data stored in Firestore
 */
export interface UserRoleData {
  role: UserRole;
  isActive: boolean;
  permissions: Permission[];
  /** Display name from the Firestore users doc (more reliable than Firebase Auth displayName) */
  displayName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User list item for displaying users in a list
 */
export interface UserListItem {
  id: string;
  email?: string | null;
  displayName?: string | null;
  role: UserRole;
  isActive: boolean;
  permissions: Permission[];
  /** True when user has deleted their account (soft delete) */
  isDeleted?: boolean;
}
