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
  createdAt: string | null;       // Serialized creation timestamp (ISO string)
  updatedAt: string | null;       // Serialized last modified timestamp (ISO string)
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
  updatedAt: string | null;       // Serialized timestamp (ISO string)
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
  createdAt: string | null;        // Serialized creation timestamp (ISO string)
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
}

/**
 * Data for updating an existing item
 * Note: type cannot be changed after first transaction (business rule)
 */
export interface UpdateItemData {
  name?: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  unit?: string;
  imageUrl?: string;
  minStockLevel?: number;
  status?: ItemStatus;
}

/**
 * Data for adjusting inventory quantity
 */
export interface AdjustmentData {
  itemId: string;
  locationId: string;
  locationType: LocationType;
  locationName: string;
  type: AdjustmentType;            // add or remove
  quantity: number;                // Amount to add or remove
  reason: string;                  // Required reason
  notes: string;                   // Required notes
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
 * Helper function to convert Firestore timestamp to ISO string
 */
export const timestampToISO = (timestamp: Timestamp | null | undefined): string | null => {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
};

/**
 * Helper function to convert ISO string to Firestore timestamp
 */
export const isoToTimestamp = (isoString: string | null | undefined): Timestamp | null => {
  if (!isoString) return null;
  return Timestamp.fromDate(new Date(isoString));
};
