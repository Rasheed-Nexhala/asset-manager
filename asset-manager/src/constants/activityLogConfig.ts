import type { ActionType, ActionCategory } from '../types/activityLog';

/**
 * Action Type Display Configuration
 *
 * Maps each action type to its display label, icon name (Ionicons),
 * and parent category for UI rendering and filtering.
 */
export const ACTION_TYPE_CONFIG: Record<
  ActionType,
  {
    label: string;
    icon: string;
    category: ActionCategory;
  }
> = {
  // Authentication
  user_login: {
    label: 'Login',
    icon: 'log-in-outline',
    category: 'authentication',
  },
  user_logout: {
    label: 'Logout',
    icon: 'log-out-outline',
    category: 'authentication',
  },
  login_failed: {
    label: 'Failed Login',
    icon: 'warning-outline',
    category: 'authentication',
  },
  password_changed: {
    label: 'Password Changed',
    icon: 'key-outline',
    category: 'authentication',
  },

  // User Management
  user_created: {
    label: 'User Created',
    icon: 'person-add-outline',
    category: 'users',
  },
  user_updated: {
    label: 'User Updated',
    icon: 'create-outline',
    category: 'users',
  },
  user_disabled: {
    label: 'User Disabled',
    icon: 'remove-circle-outline',
    category: 'users',
  },
  user_enabled: {
    label: 'User Enabled',
    icon: 'checkmark-circle-outline',
    category: 'users',
  },

  // Site Management
  site_created: {
    label: 'Site Created',
    icon: 'business-outline',
    category: 'sites',
  },
  site_updated: {
    label: 'Site Updated',
    icon: 'create-outline',
    category: 'sites',
  },
  site_status_changed: {
    label: 'Site Status Changed',
    icon: 'swap-horizontal-outline',
    category: 'sites',
  },

  // Inventory
  item_created: {
    label: 'Item Created',
    icon: 'cube-outline',
    category: 'inventory',
  },
  item_updated: {
    label: 'Item Updated',
    icon: 'create-outline',
    category: 'inventory',
  },
  quantity_adjusted: {
    label: 'Quantity Adjusted',
    icon: 'swap-vertical-outline',
    category: 'inventory',
  },
  item_transferred: {
    label: 'Item Transferred',
    icon: 'arrow-forward-outline',
    category: 'inventory',
  },
  steel_master_created: {
    label: 'Steel Master Created',
    icon: 'resize-outline',
    category: 'inventory',
  },
  steel_master_updated: {
    label: 'Steel Master Updated',
    icon: 'create-outline',
    category: 'inventory',
  },
  inventory_update_request_created: {
    label: 'Inventory Update Request Created',
    icon: 'document-text-outline',
    category: 'inventory',
  },
  inventory_update_request_approved: {
    label: 'Inventory Update Request Approved',
    icon: 'checkmark-circle-outline',
    category: 'inventory',
  },
  inventory_update_request_rejected: {
    label: 'Inventory Update Request Rejected',
    icon: 'close-circle-outline',
    category: 'inventory',
  },
  inventory_update_request_revoked: {
    label: 'Inventory Update Access Revoked',
    icon: 'lock-closed-outline',
    category: 'inventory',
  },
  inventory_update_request_restored: {
    label: 'Inventory Update Access Restored',
    icon: 'lock-open-outline',
    category: 'inventory',
  },

  // Requests
  request_created: {
    label: 'Request Created',
    icon: 'file-tray-full-outline',
    category: 'requests',
  },
  request_edited: {
    label: 'Request Edited',
    icon: 'create-outline',
    category: 'requests',
  },
  request_approved: {
    label: 'Request Approved',
    icon: 'checkmark-circle-outline',
    category: 'requests',
  },
  request_rejected: {
    label: 'Request Rejected',
    icon: 'close-circle-outline',
    category: 'requests',
  },
  request_transferred: {
    label: 'Items Transferred',
    icon: 'arrow-forward-outline',
    category: 'requests',
  },
  items_returned: {
    label: 'Items Returned',
    icon: 'arrow-back-outline',
    category: 'requests',
  },
  request_cancelled: {
    label: 'Request Cancelled',
    icon: 'ban-outline',
    category: 'requests',
  },

  // Purchase Orders
  po_created: {
    label: 'PO Created',
    icon: 'document-text-outline',
    category: 'purchase_orders',
  },
  po_approved: {
    label: 'PO Approved',
    icon: 'checkmark-done-outline',
    category: 'purchase_orders',
  },
  po_rejected: {
    label: 'PO Rejected',
    icon: 'close-outline',
    category: 'purchase_orders',
  },
  po_received: {
    label: 'PO Received',
    icon: 'download-outline',
    category: 'purchase_orders',
  },
  po_ordered: {
    label: 'PO Ordered',
    icon: 'send-outline',
    category: 'purchase_orders',
  },

  // Maintenance
  maintenance_added: {
    label: 'Maintenance Added',
    icon: 'construct-outline',
    category: 'maintenance',
  },
  maintenance_returned: {
    label: 'Maintenance Returned',
    icon: 'checkmark-outline',
    category: 'maintenance',
  },
  item_written_off: {
    label: 'Item Written Off',
    icon: 'trash-outline',
    category: 'maintenance',
  },
  maintenance_updated: {
    label: 'Maintenance Updated',
    icon: 'create-outline',
    category: 'maintenance',
  },

  // Vendors
  vendor_created: {
    label: 'Vendor Created',
    icon: 'storefront-outline',
    category: 'vendors',
  },
  vendor_updated: {
    label: 'Vendor Updated',
    icon: 'create-outline',
    category: 'vendors',
  },
};

/**
 * Action Category Display Configuration
 *
 * Maps each action category to its display label and icon
 * for filter UI and grouping.
 */
export const ACTION_CATEGORY_CONFIG: Record<
  ActionCategory,
  {
    label: string;
    icon: string;
  }
> = {
  authentication: {
    label: 'Authentication',
    icon: 'shield-checkmark-outline',
  },
  users: {
    label: 'User Management',
    icon: 'people-outline',
  },
  sites: {
    label: 'Site Management',
    icon: 'business-outline',
  },
  inventory: {
    label: 'Inventory',
    icon: 'cube-outline',
  },
  requests: {
    label: 'Requests',
    icon: 'file-tray-full-outline',
  },
  purchase_orders: {
    label: 'Purchase Orders',
    icon: 'document-text-outline',
  },
  maintenance: {
    label: 'Maintenance',
    icon: 'construct-outline',
  },
  vendors: {
    label: 'Vendors',
    icon: 'storefront-outline',
  },
};

/**
 * Semantic colors for category badges and icon backgrounds.
 * Uses CIAMS design system: Success, Warning, Danger, Info, Primary.
 */
export const CATEGORY_COLOR_MAP: Record<ActionCategory, string> = {
  authentication: '#475569', // Info Slate
  users: '#4338CA', // Admin Indigo
  sites: '#0D9488', // Teal
  inventory: '#1E40AF', // Primary Blue
  requests: '#D97706', // Warning Amber
  purchase_orders: '#16A34A', // Success Green
  maintenance: '#DC2626', // Danger Red
  vendors: '#475569', // Info Slate
};

/**
 * NativeWind class names for category badges (15% opacity bg, full-color text).
 * Use these instead of inline style for CIAMS consistency.
 */
export const CATEGORY_BADGE_BG_CLASS: Record<ActionCategory, string> = {
  authentication: 'bg-[#475569]/15',
  users: 'bg-[#4338CA]/15',
  sites: 'bg-[#0D9488]/15',
  inventory: 'bg-[#1E40AF]/15',
  requests: 'bg-[#D97706]/15',
  purchase_orders: 'bg-[#16A34A]/15',
  maintenance: 'bg-[#DC2626]/15',
  vendors: 'bg-[#475569]/15',
};

export const CATEGORY_TEXT_CLASS: Record<ActionCategory, string> = {
  authentication: 'text-[#475569]',
  users: 'text-[#4338CA]',
  sites: 'text-[#0D9488]',
  inventory: 'text-[#1E40AF]',
  requests: 'text-[#D97706]',
  purchase_orders: 'text-[#16A34A]',
  maintenance: 'text-[#DC2626]',
  vendors: 'text-[#475569]',
};
