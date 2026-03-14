import { Timestamp } from 'firebase/firestore';

/**
 * Action Categories (Module Groups)
 *
 * Groups activity types by functional area for filtering and display.
 */
export type ActionCategory =
  | 'authentication'
  | 'users'
  | 'sites'
  | 'inventory'
  | 'requests'
  | 'purchase_orders'
  | 'maintenance'
  | 'vendors';

/**
 * Action Types (Specific Actions)
 *
 * Enumeration of all trackable actions across the CIAMS application.
 */
export type ActionType =
  // Authentication
  | 'user_login'
  | 'user_logout'
  | 'login_failed'
  | 'password_changed'
  // User Management
  | 'user_created'
  | 'user_updated'
  | 'user_disabled'
  | 'user_enabled'
  // Site Management
  | 'site_created'
  | 'site_updated'
  | 'site_status_changed'
  // Inventory
  | 'item_created'
  | 'item_updated'
  | 'quantity_adjusted'
  | 'item_transferred'
  | 'steel_master_created'
  | 'steel_master_updated'
  // Inventory Update Requests (Store Incharge access to central store)
  | 'inventory_update_request_created'
  | 'inventory_update_request_approved'
  | 'inventory_update_request_rejected'
  | 'inventory_update_request_revoked'
  | 'inventory_update_request_restored'
  // Requests
  | 'request_created'
  | 'request_edited'
  | 'request_approved'
  | 'request_rejected'
  | 'request_transferred'
  | 'items_returned'
  | 'request_cancelled'
  // Purchase Orders
  | 'po_created'
  | 'po_approved'
  | 'po_rejected'
  | 'po_received'
  | 'po_ordered'
  // Maintenance
  | 'maintenance_added'
  | 'maintenance_returned'
  | 'item_written_off'
  | 'maintenance_updated'
  // Vendors
  | 'vendor_created'
  | 'vendor_updated';

/**
 * Target Type (What was acted upon)
 *
 * The entity type that was modified or affected by the action.
 */
export type TargetType =
  | 'user'
  | 'site'
  | 'item'
  | 'request'
  | 'purchase_order'
  | 'maintenance'
  | 'vendor'
  | 'inventory_update_request';

/**
 * Change Entry (Before/After Values)
 *
 * Tracks field-level changes for audit trail with human-readable labels.
 */
export interface ChangeEntry {
  /** Field path (e.g., "items[1].quantityRequested") */
  field: string;
  /** Human-readable label (e.g., "Cement Bags Quantity") */
  fieldLabel: string;
  /** Previous value before the change */
  oldValue: unknown;
  /** New value after the change */
  newValue: unknown;
}

/**
 * Firestore Activity Log Document
 *
 * Raw document structure as stored in Firestore.
 * Uses Firestore Timestamp for server-side timestamp.
 */
export interface ActivityLogFirestore {
  id: string;
  timestamp: Timestamp;

  // User Information
  userId: string;
  userName: string;
  userRole: 'Admin' | 'StoreIncharge' | 'SiteManager' | 'Unassigned';

  // Action Information
  actionType: ActionType;
  actionCategory: ActionCategory;

  // Target Information
  targetType: TargetType;
  targetId: string;
  /** Human-readable identifier (e.g., "REQ-2025-0045") */
  targetDisplay: string;

  // Log Details
  /** Short summary (e.g., "Edited request: Cement qty 25→20") */
  summary: string;
  /** Longer description or reason */
  details: string;
  /** Before/after values for change tracking */
  changes: ChangeEntry[];

  // Device Metadata
  /** e.g., "Samsung Galaxy S21" */
  deviceInfo?: string;
  /** e.g., "192.168.1.xxx" */
  ipAddress?: string;
  /** e.g., "1.0.0" */
  appVersion?: string;
}

/**
 * Redux Activity Log (Serialized Timestamps)
 *
 * Client-side representation with ISO 8601 timestamp string
 * for Redux serialization compatibility.
 */
export interface ActivityLog extends Omit<ActivityLogFirestore, 'timestamp'> {
  /** ISO 8601 string representation of timestamp */
  timestamp: string;
}

/**
 * Base filter fields (shared between store and UI types)
 */
export interface ActivityLogFiltersBase {
  userId?: string | null;
  actionCategory?: ActionCategory | 'all';
  actionType?: ActionType | 'all';
  searchQuery?: string;
}

/**
 * Activity Log Filters (Store) - Redux-serializable
 *
 * Dates stored as ISO 8601 strings for Redux compatibility.
 * Use this type for Redux state and when passing filters to services.
 */
export interface ActivityLogFiltersStore extends ActivityLogFiltersBase {
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Activity Log Filters (UI) - For components using DateTimePicker
 *
 * Dates as Date objects for DateTimePicker and display.
 * Convert to ActivityLogFiltersStore before dispatching to Redux.
 */
export interface ActivityLogFiltersUI extends ActivityLogFiltersBase {
  startDate?: Date | null;
  endDate?: Date | null;
}

/**
 * @deprecated Use ActivityLogFiltersStore for Redux, ActivityLogFiltersUI for UI.
 * Kept for backward compatibility during migration.
 */
export type ActivityLogFilters = ActivityLogFiltersStore;

/**
 * Activity Log Export Options
 *
 * Options for exporting activity logs to CSV.
 */
export interface ActivityLogExportOptions {
  filters: ActivityLogFiltersStore;
  /** Maximum records to export (default: 1000) */
  maxRecords?: number;
}
