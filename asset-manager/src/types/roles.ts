/**
 * User Roles in the system
 */
export type UserRole = 'Admin' | 'StoreIncharge' | 'SiteManager' | 'Unassigned';

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
  /** Super admin can change roles and deactivate any user including Admins, except themselves. Set manually in Firestore. */
  isSuperadmin?: boolean;
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
  /** Super admin can manage all users including Admins. Set manually in Firestore. */
  isSuperadmin?: boolean;
}
