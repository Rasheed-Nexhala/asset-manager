import { Timestamp } from 'firebase/firestore';

/**
 * Item type: consumable (single-use, no return) or non-consumable (returnable)
 */
export type ItemType = 'consumable' | 'non_consumable';

/**
 * Item status: active or discontinued
 */
export type ItemStatus = 'active' | 'discontinued';

/**
 * Location type: store (central warehouse), site (construction site), or maintenance
 */
export type LocationType = 'store' | 'site' | 'maintenance';

/**
 * Adjustment type: add (increase stock) or remove (decrease stock)
 */
export type AdjustmentType = 'add' | 'remove';

/**
 * Item document structure in Firestore (with Firebase Timestamps)
 * This is the master item record stored in the items collection
 */
export interface FirestoreItem {
  id: string;                      // Firebase-generated document ID
  name: string;                    // Required, unique item name
  sku: string;                    // Required, unique SKU code
  description?: string;            // Optional item description
  categoryId: string;              // Reference to categories collection
  categoryName: string;            // Denormalized category name
  type: ItemType;                 // consumable or non_consumable
  unit: string;                   // Unit of measurement (piece, bag, set, etc.)
  imageUrl?: string;              // Optional image URL from Firebase Storage
  minStockLevel: number;          // Minimum stock level for low-stock alerts
  status: ItemStatus;             // active or discontinued
  
  // Denormalized stock totals (calculated from inventory collection)
  totalQuantity: number;          // Total quantity across all locations
  centralStoreQuantity: number;   // Quantity in central store
  atSitesQuantity: number;        // Total quantity at all sites
  inMaintenanceQuantity: number;  // Quantity in maintenance
  
  // Weight-based item configuration (optional)
  weightPerMeter?: number;        // kg/m (if custom or copied from steelMaster)
  lengthPerPiece?: number;        // meters (default length)
  steelMasterId?: string;         // Reference to steelMaster collection (if linked)
  steelMasterName?: string;       // Denormalized name for display
  isWeightBased?: boolean;        // Flag for quick identification (derived from weightPerMeter)
  
  createdAt: Timestamp;           // Creation timestamp
  updatedAt: Timestamp;           // Last modified timestamp
}

/**
 * Item document structure for Redux store (serialized timestamps)
 * This version uses ISO strings for timestamps to be Redux-serializable
 */
export interface Item {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  type: ItemType;
  unit: string;
  imageUrl?: string;
  minStockLevel: number;
  status: ItemStatus;
  totalQuantity: number;
  centralStoreQuantity: number;
  atSitesQuantity: number;
  inMaintenanceQuantity: number;
  weightPerMeter?: number;
  lengthPerPiece?: number;
  steelMasterId?: string;
  steelMasterName?: string;
  isWeightBased?: boolean;
  createdAt: string;             // Serialized creation timestamp (ISO string)
  updatedAt: string;             // Serialized last modified timestamp (ISO string)
}

/**
 * Inventory entry document structure in Firestore (with Firebase Timestamps)
 * This represents stock at a specific location (store, site, or maintenance)
 */
export interface FirestoreInventoryEntry {
  id: string;                     // Firebase-generated document ID
  itemId: string;                 // Reference to items collection
  itemName: string;                // Denormalized item name
  itemSku: string;                // Denormalized item SKU
  locationId: string;              // Location identifier ("store", "site_001", "maintenance")
  locationType: LocationType;     // store, site, or maintenance
  locationName: string;            // Denormalized location name
  quantity: number;                // Current quantity at this location
  lengthPerPiece?: number;        // meters, length of pieces at this location
  updatedAt: Timestamp;           // Last modified timestamp
}

/**
 * Inventory entry document structure for Redux store (serialized timestamps)
 */
export interface InventoryEntry {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  locationId: string;
  locationType: LocationType;
  locationName: string;
  quantity: number;
  lengthPerPiece?: number;
  updatedAt: string;             // Serialized timestamp (ISO string)
}

/**
 * Category document structure in Firestore (with Firebase Timestamps)
 */
export interface FirestoreCategory {
  id: string;                     // Firebase-generated document ID
  name: string;                    // Required, unique category name
  createdAt: Timestamp;            // Creation timestamp
}

/**
 * Category document structure for Redux store (serialized timestamps)
 */
export interface Category {
  id: string;
  name: string;
  createdAt: string;             // Serialized creation timestamp (ISO string)
}

/**
 * Data required to create a new item
 */
export interface CreateItemData {
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  type: ItemType;
  unit: string;
  imageUrl?: string;
  minStockLevel: number;
  initialQuantity: number;        // Initial quantity to add to central store
  weightPerMeter?: number;
  lengthPerPiece?: number;
  steelMasterId?: string;
  steelMasterName?: string;
  /** User who created the item (for activity log) */
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
}

/**
 * Data for updating an existing item
 * Note: type cannot be changed after first transaction (business rule; enforced in inventoryService)
 */
export interface UpdateItemData {
  name?: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  type?: ItemType;  // Validated by service: cannot change after first transaction
  unit?: string;
  imageUrl?: string;
  minStockLevel?: number;
  status?: ItemStatus;
  weightPerMeter?: number;
  lengthPerPiece?: number;
  /** User who updated the item (for activity log) */
  updatedBy?: string;
  updatedByName?: string;
  updatedByRole?: string;
}

/**
 * Data for adjusting inventory quantity
 */
export interface AdjustmentData {
  itemId: string;
  itemName: string;                // For activity log display
  itemSku: string;                 // For activity log display
  locationId: string;
  locationType: LocationType;
  locationName: string;
  type: AdjustmentType;            // add or remove
  quantity: number;                // Amount to add or remove (pieces for weight-based items)
  reason: string;                  // Required reason
  notes: string;                   // Required notes
  entryMode?: 'kg' | 'ton' | 'pieces';    // How user entered the data (for weight-based items)
  enteredValue?: number;          // What user actually typed (for audit)
  lengthPerPiece?: number;         // Required when adding stock for weight-based items
}

/**
 * Filters for listing items
 */
export interface ItemFilters {
  categoryId?: string;             // Filter by category
  type?: ItemType;                 // Filter by item type
  lowStockOnly?: boolean;          // Show only items below minimum stock level
  status?: ItemStatus;             // Filter by status
}

/**
 * Helper function to convert Firestore timestamp to ISO string.
 * Handles null/undefined from serverTimestamp() during optimistic updates.
 * Falls back to current time when timestamp is missing to prevent runtime errors.
 *
 * @param timestamp - Firebase Timestamp, Date, or null/undefined
 * @returns ISO string - never null (uses current time as fallback)
 */
export const timestampToISO = (timestamp: Timestamp | Date | null | undefined): string => {
  if (!timestamp || timestamp === null) {
    return new Date().toISOString(); // Fallback to current time during optimistic updates
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  // Firestore Timestamp or object with toDate() (handles mocks in tests)
  if (typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
    return (timestamp as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString(); // Final fallback
};

/**
 * Helper function to convert ISO string to Firestore timestamp
 */
export const isoToTimestamp = (isoString: string | null | undefined): Timestamp | null => {
  if (!isoString) return null;
  return Timestamp.fromDate(new Date(isoString));
};
