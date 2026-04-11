import {
  collection,
  addDoc,
  getDocs,
  getDocsFromServer,
  getCountFromServer,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  writeBatch,
  Timestamp,
  runTransaction,
  QueryConstraint,
  DocumentSnapshot,
  deleteField,
} from 'firebase/firestore';
import type { Transaction } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { auth } from '../../../config/firebase';
import { deleteItemImageByUrl } from './storageService';
import type {
  FirestoreItem,
  Item,
  FirestoreInventoryEntry,
  InventoryEntry,
  CreateItemData,
  UpdateItemData,
  AdjustmentData,
  ItemFilters,
  LocationType,
} from '../../types/inventory';
import { 
  timestampToISO, 
  prepareCategoryData, 
  getDisplayCategoryName,
  normalizeCategoryId 
} from '../../types/inventory';
import { getLocationId, getLocationTypeFromId } from '../../utils/locationUtils';
import { isLowStock } from '../../utils/inventoryUtils';

// Collection names
const ITEMS_COLLECTION = 'items';

/** Lowercase copies of name/sku for case-insensitive Firestore prefix range queries */
function itemSearchIndexFields(name: string, sku: string): { nameSearch: string; skuSearch: string } {
  return {
    nameSearch: (name ?? '').toLowerCase(),
    skuSearch: (sku ?? '').toLowerCase(),
  };
}
const INVENTORY_COLLECTION = 'inventory';

const getInventoryDocId = (itemId: string, locationId: string): string =>
  `${itemId}_${locationId}`;

const isDiscreteUnit = (unit: string): boolean =>
  ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(unit);


/**
 * Convert FirestoreItem to Item (for Redux store)
 */
const firestoreItemToItem = (firestoreItem: FirestoreItem): Item => {
  return {
    ...firestoreItem,
    createdAt: timestampToISO(firestoreItem.createdAt),
    updatedAt: timestampToISO(firestoreItem.updatedAt),
  };
};

/**
 * Convert FirestoreInventoryEntry to InventoryEntry (for Redux store)
 */
const firestoreInventoryEntryToInventoryEntry = (
  firestoreEntry: FirestoreInventoryEntry
): InventoryEntry => {
  return {
    ...firestoreEntry,
    updatedAt: timestampToISO(firestoreEntry.updatedAt),
  };
};


/**
 * List items with optional filters
 * 
 * @param filters - Optional filters for category, type, lowStockOnly, status
 * @returns Array of items matching the filters
 */
export const listItems = async (filters?: ItemFilters): Promise<Item[]> => {
  try {
    let q = query(collection(db, ITEMS_COLLECTION));

    // Apply categoryId filter with support for null/uncategorized items
    if (filters?.categoryId !== undefined) {
      if (filters.categoryId === null || filters.categoryId === 'uncategorized' || filters.categoryId === '') {
        // Filter for items without categories (null categoryId)
        q = query(q, where('categoryId', '==', null));
      } else {
        // Filter for items with the specific categoryId
        q = query(q, where('categoryId', '==', filters.categoryId));
      }
    }
    // If no categoryId filter is provided, return all items regardless of category status
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    // Order by name
    q = query(q, orderBy('name', 'asc'));

    const snapshot = await getDocs(q);
    const items: Item[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const firestoreItem: FirestoreItem = {
        id: docSnap.id,
        name: data.name,
        sku: data.sku,
        description: data.description,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        type: data.type,
        unit: data.unit,
        imageUrl: data.imageUrl,
        minStockLevel: data.minStockLevel ?? 0,
        status: data.status,
        totalQuantity: data.totalQuantity || 0,
        centralStoreQuantity: data.centralStoreQuantity || 0,
        atSitesQuantity: data.atSitesQuantity || 0,
        inMaintenanceQuantity: data.inMaintenanceQuantity || 0,
        weightPerMeter: data.weightPerMeter,
        lengthPerPiece: data.lengthPerPiece,
        steelMasterId: data.steelMasterId,
        steelMasterName: data.steelMasterName,
        isWeightBased: data.isWeightBased,
        standardUnitPrice: data.standardUnitPrice,
        standardGstPercentage: data.standardGstPercentage,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      items.push(firestoreItemToItem(firestoreItem));
    });

    // Apply low stock filter in memory (central store quantity <= min)
    if (filters?.lowStockOnly) {
      return items.filter((item) => isLowStock(item));
    }

    return items;
  } catch (error) {
    console.error('Error listing items:', error);
    throw error;
  }
};

/**
 * Quick preview query for low-stock dashboard widgets.
 * Uses a bounded query sorted by centralStoreQuantity ASC to loosely approximate low-stock priority 
 * without fetching all N items in the database. Filters client-side for true \`isLowStock\`, then caps out.
 */
export const getDashboardLowStockPreview = async (
  requestedLimit: number = 5,
  maxFetchPool: number = 50
): Promise<Item[]> => {
  try {
    const q = query(
      collection(db, ITEMS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('centralStoreQuantity', 'asc'),
      limit(maxFetchPool)
    );
    const snap = await getDocs(q);
    const items: Item[] = [];
    snap.forEach((docSnap) => {
      items.push(firestoreItemToItem({ id: docSnap.id, ...docSnap.data() } as FirestoreItem));
    });
    return items.filter(isLowStock).slice(0, requestedLimit);
  } catch (error) {
    console.error('Error fetching dashboard low stock preview:', error);
    return [];
  }
};

/**
 * Returns true when an item's central store quantity is at or below the minimum stock level.
 * This mirrors the isLowStock logic in inventoryUtils so we can write it denormalized to Firestore.
 */
function computeIsLowStock(centralStoreQuantity: number, minStockLevel: number): boolean {
  return centralStoreQuantity <= minStockLevel;
}

/**
 * Count items in low stock across the catalog using server-side count (no document fetches).
 * Optional category/type/status scope matches the existing item filters.
 */
export const countLowStockItems = async (
  scope?: Pick<ItemFilters, 'categoryId' | 'type' | 'status'>
): Promise<number> => {
  const constraints: QueryConstraint[] = [where('isLowStock', '==', true)];

  if (scope?.categoryId !== undefined) {
    if (scope.categoryId === null || scope.categoryId === 'uncategorized' || scope.categoryId === '') {
      constraints.push(where('categoryId', '==', null));
    } else {
      constraints.push(where('categoryId', '==', scope.categoryId));
    }
  }
  if (scope?.type) constraints.push(where('type', '==', scope.type));
  if (scope?.status) constraints.push(where('status', '==', scope.status));

  const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
  const snap = await getCountFromServer(q);
  return snap.data().count;
};

/**
 * Build Firestore query constraints for items (shared by listItemsPaginated and getItemsCount).
 * Excludes lowStockOnly — that filter is applied client-side.
 */
const buildItemsQueryConstraints = (filters?: ItemFilters): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];
  
  // Handle categoryId filtering with support for null/uncategorized items
  if (filters?.categoryId !== undefined) {
    if (filters.categoryId === null || filters.categoryId === 'uncategorized' || filters.categoryId === '') {
      // Filter for items without categories (null categoryId)
      constraints.push(where('categoryId', '==', null));
    } else {
      // Filter for items with the specific categoryId
      constraints.push(where('categoryId', '==', filters.categoryId));
    }
  }
  // If no categoryId filter is provided, return all items regardless of category status
  
  if (filters?.type) {
    constraints.push(where('type', '==', filters.type));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  const trimmed = filters?.searchTerm?.trim();
  if (trimmed) {
    const lowerPrefix = trimmed.toLowerCase();
    constraints.push(where('nameSearch', '>=', lowerPrefix));
    constraints.push(where('nameSearch', '<=', lowerPrefix + '\uf8ff'));
    constraints.push(orderBy('nameSearch', 'asc'));
  } else {
    constraints.push(orderBy('name', 'asc'));
  }
  return constraints;
};

/**
 * Build query constraints for maintenance item selection (browse / paginated list only).
 * Filters: type=non_consumable, order by name. Search uses client-side full-list filter instead.
 */
const buildMaintenanceItemsQueryConstraints = (): QueryConstraint[] => [
  where('type', '==', 'non_consumable'),
  orderBy('name', 'asc'),
];

const filterItemsWithCentralStock = (items: Item[]): Item[] =>
  items.filter((item) => (item.centralStoreQuantity || 0) > 0);

/** Same fields as Redux selectItemsBySearchQuery — substring, case-insensitive. */
function itemMatchesInventoryStyleSearch(item: Item, trimmedQuery: string): boolean {
  const lowerQuery = trimmedQuery.toLowerCase();
  return (
    (item.name ?? '').toLowerCase().includes(lowerQuery) ||
    (item.sku ?? '').toLowerCase().includes(lowerQuery) ||
    Boolean(item.description && item.description.toLowerCase().includes(lowerQuery)) ||
    Boolean(item.categoryName && item.categoryName.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Full non-consumable catalog search for maintenance picker (parity with central store inventory search).
 */
async function listMaintenancePickerItemsClientSearch(searchTerm: string): Promise<Item[]> {
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return [];
  }
  const all = await listItems({ type: 'non_consumable' });
  const withStock = filterItemsWithCentralStock(all);
  return withStock
    .filter((item) => itemMatchesInventoryStyleSearch(item, trimmed))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

function filterItemsByAllowedTypes(items: Item[], allowedItemTypes?: string[]): Item[] {
  if (!allowedItemTypes || allowedItemTypes.length === 0) {
    return items;
  }
  const allowed = new Set(allowedItemTypes);
  return items.filter((item) => allowed.has(item.type));
}

/**
 * Active items for request/PO picker — full-catalog substring search (parity with central store).
 */
async function listSelectionPickerItemsClientSearch(
  searchTerm: string,
  allowedItemTypes?: string[]
): Promise<Item[]> {
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return [];
  }
  const allActive = await listItems({ status: 'active' });
  const pool = filterItemsByAllowedTypes(allActive, allowedItemTypes);
  return pool
    .filter((item) => itemMatchesInventoryStyleSearch(item, trimmed))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

/** Default page size for paginated item lists */
export const ITEMS_PAGE_SIZE = 10;

/**
 * List items with cursor-based pagination.
 * Uses same Firestore filters as listItems; lowStockOnly is applied client-side.
 *
 * @param filters - Optional filters (categoryId, type, status). lowStockOnly is client-side.
 * @param pageSize - Number of items per page
 * @param lastDoc - Cursor for next page (from previous response)
 * @returns Items and cursor for next page
 */
export const listItemsPaginated = async (
  filters: ItemFilters | undefined,
  pageSize: number,
  lastDoc?: DocumentSnapshot
): Promise<{ items: Item[]; lastDoc: DocumentSnapshot | null }> => {
  try {
    const constraints = buildItemsQueryConstraints(filters);
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
    const snapshot = await getDocsFromServer(q);

    const items: Item[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const firestoreItem: FirestoreItem = {
        id: docSnap.id,
        name: data.name,
        sku: data.sku,
        description: data.description,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        type: data.type,
        unit: data.unit,
        imageUrl: data.imageUrl,
        minStockLevel: data.minStockLevel ?? 0,
        status: data.status,
        totalQuantity: data.totalQuantity || 0,
        centralStoreQuantity: data.centralStoreQuantity || 0,
        atSitesQuantity: data.atSitesQuantity || 0,
        inMaintenanceQuantity: data.inMaintenanceQuantity || 0,
        weightPerMeter: data.weightPerMeter,
        lengthPerPiece: data.lengthPerPiece,
        steelMasterId: data.steelMasterId,
        steelMasterName: data.steelMasterName,
        isWeightBased: data.isWeightBased,
        standardUnitPrice: data.standardUnitPrice,
        standardGstPercentage: data.standardGstPercentage,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      return firestoreItemToItem(firestoreItem);
    });

    const newLastDoc =
      snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { items, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error listing items (paginated):', error);
    throw error;
  }
};

/**
 * Get total count of items matching Firestore filters.
 * Must use same where/orderBy as listItemsPaginated for consistency.
 * lowStockOnly is not applied — total reflects Firestore filters only.
 *
 * @param filters - Same filters as listItemsPaginated (categoryId, type, status)
 * @returns Total count from server
 */
export const getItemsCount = async (
  filters: ItemFilters | undefined
): Promise<number> => {
  try {
    const constraints = buildItemsQueryConstraints(filters);
    const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting items count:', error);
    throw error;
  }
};

/** Page size for maintenance item selection */
export const MAINTENANCE_ITEMS_PAGE_SIZE = 15;

/**
 * Map Firestore document snapshot to Item (shared by maintenance + item selection list helpers).
 */
const docSnapToItem = (docSnap: DocumentSnapshot): Item => {
  const data = docSnap.data();
  const firestoreItem: FirestoreItem = {
    id: docSnap.id,
    name: data?.name,
    sku: data?.sku,
    description: data?.description,
    categoryId: data?.categoryId,
    categoryName: data?.categoryName,
    type: data?.type,
    unit: data?.unit,
    imageUrl: data?.imageUrl,
    minStockLevel: data?.minStockLevel ?? 0,
    status: data?.status,
    totalQuantity: data?.totalQuantity || 0,
    centralStoreQuantity: data?.centralStoreQuantity || 0,
    atSitesQuantity: data?.atSitesQuantity || 0,
    inMaintenanceQuantity: data?.inMaintenanceQuantity || 0,
    weightPerMeter: data?.weightPerMeter,
    lengthPerPiece: data?.lengthPerPiece,
    steelMasterId: data?.steelMasterId,
    steelMasterName: data?.steelMasterName,
    isWeightBased: data?.isWeightBased,
    standardUnitPrice: data?.standardUnitPrice,
    standardGstPercentage: data?.standardGstPercentage,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  } as FirestoreItem;
  return firestoreItemToItem(firestoreItem);
};

/**
 * List items available for maintenance (non-consumable, central store quantity > 0
 * filtered client-side). Paginated when not searching. When searching, loads all non-consumable
 * items and filters like central-store inventory (substring on name, SKU, category, description).
 *
 * @param searchTerm - Optional search string (client-side contains match when non-empty)
 * @param pageSize - Items per page (browse mode only)
 * @param lastDoc - Cursor for next page (browse mode only)
 * @returns Items and cursor for next page (items with centralStoreQuantity <= 0 filtered out)
 */
export const listItemsForMaintenancePaginated = async (
  searchTerm: string | undefined,
  pageSize: number,
  lastDoc?: DocumentSnapshot
): Promise<{ items: Item[]; lastDoc: DocumentSnapshot | null }> => {
  try {
    const trimmed = searchTerm?.trim();

    if (trimmed) {
      const items = await listMaintenancePickerItemsClientSearch(trimmed);
      return { items, lastDoc: null };
    }

    const constraints = buildMaintenanceItemsQueryConstraints();
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
    const snapshot = await getDocsFromServer(q);

    const items = filterItemsWithCentralStock(snapshot.docs.map(docSnapToItem));

    const newLastDoc =
      snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { items, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error listing items for maintenance:', error);
    throw error;
  }
};

/**
 * Get total count of non-consumable items (for maintenance selection).
 * When searching: length of client-filtered list (with central stock > 0).
 * When browsing: Firestore count (central stock not applied).
 *
 * @param searchTerm - Optional search string
 * @returns Total count
 */
export const getItemsForMaintenanceCount = async (
  searchTerm: string | undefined
): Promise<number> => {
  try {
    const trimmed = searchTerm?.trim();

    if (trimmed) {
      const items = await listMaintenancePickerItemsClientSearch(trimmed);
      return items.length;
    }

    const constraints = buildMaintenanceItemsQueryConstraints();
    const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting items for maintenance count:', error);
    throw error;
  }
};

/**
 * Build query constraints for generic item selection (Requests, PO) — browse / pagination only.
 */
const buildSelectionItemsQueryConstraints = (allowedItemTypes?: string[]): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [where('status', '==', 'active')];

  if (allowedItemTypes && allowedItemTypes.length > 0) {
    constraints.push(where('type', 'in', allowedItemTypes));
  }

  constraints.push(orderBy('name', 'asc'));
  return constraints;
};

/** Page size for item selection (Requests, PO) */
export const SELECTION_ITEMS_PAGE_SIZE = 15;

/**
 * List active items for selection (Requests, PO). Paginated when not searching.
 * When searching, loads all active items (optional type filter) and applies the same
 * substring search as central-store inventory (name, SKU, description, category).
 *
 * @param searchTerm - Optional search string (client-side contains when non-empty)
 * @param pageSize - Items per page (browse mode only)
 * @param lastDoc - Cursor (browse mode only)
 */
export const listItemsForSelectionPaginated = async (
  searchTerm: string | undefined,
  pageSize: number,
  lastDoc?: DocumentSnapshot,
  allowedItemTypes?: string[]
): Promise<{ items: Item[]; lastDoc: DocumentSnapshot | null }> => {
  try {
    const trimmed = searchTerm?.trim();

    if (trimmed) {
      const items = await listSelectionPickerItemsClientSearch(trimmed, allowedItemTypes);
      return { items, lastDoc: null };
    }

    const constraints = buildSelectionItemsQueryConstraints(allowedItemTypes);
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
    const snapshot = await getDocsFromServer(q);

    const items: Item[] = snapshot.docs.map(docSnapToItem);
    const newLastDoc =
      snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { items, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error listing items for selection:', error);
    throw error;
  }
};

/**
 * Get total count of active items for selection (Requests, PO).
 * When searching: length of client-filtered list. When browsing: Firestore count.
 */
export const getItemsForSelectionCount = async (
  searchTerm: string | undefined,
  allowedItemTypes?: string[]
): Promise<number> => {
  try {
    const trimmed = searchTerm?.trim();

    if (trimmed) {
      const items = await listSelectionPickerItemsClientSearch(trimmed, allowedItemTypes);
      return items.length;
    }

    const constraints = buildSelectionItemsQueryConstraints(allowedItemTypes);
    const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting items for selection count:', error);
    throw error;
  }
};

/**
 * Build FirestoreItem from Firestore document data (shared by getItemById and subscribeItemById)
 */
const docDataToItem = (id: string, data: Record<string, unknown>): Item =>
  firestoreItemToItem({
    id,
    name: data.name,
    sku: data.sku,
    description: data.description,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    type: data.type,
    unit: data.unit,
    imageUrl: data.imageUrl,
    minStockLevel: data.minStockLevel ?? 0,
    status: data.status,
    totalQuantity: data.totalQuantity || 0,
    centralStoreQuantity: data.centralStoreQuantity || 0,
    atSitesQuantity: data.atSitesQuantity || 0,
    inMaintenanceQuantity: data.inMaintenanceQuantity || 0,
    weightPerMeter: data.weightPerMeter,
    lengthPerPiece: data.lengthPerPiece,
    steelMasterId: data.steelMasterId,
    steelMasterName: data.steelMasterName,
    isWeightBased: data.isWeightBased,
    standardUnitPrice: data.standardUnitPrice,
    standardGstPercentage: data.standardGstPercentage,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as FirestoreItem);

/**
 * Get a single item by ID
 *
 * @param id - Item document ID
 * @returns Item if found, null otherwise
 */
export const getItemById = async (id: string): Promise<Item | null> => {
  try {
    const itemDoc = await getDoc(doc(db, ITEMS_COLLECTION, id));

    if (!itemDoc.exists()) {
      return null;
    }

    const data = itemDoc.data();
    return docDataToItem(itemDoc.id, data);
  } catch (error) {
    console.error('Error getting item by ID:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for a single item by ID
 *
 * @param id - Item document ID
 * @param callback - Called whenever the item changes (or with null if deleted)
 * @returns Unsubscribe function
 */
export const subscribeItemById = (
  id: string,
  callback: (item: Item | null) => void
): Unsubscribe => {
  if (!id) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, ITEMS_COLLECTION, id),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      callback(docDataToItem(snap.id, data));
    },
    (error) => {
      console.error('Error in item subscription:', error);
      callback(null);
    }
  );
};

/**
 * Get all SKUs that start with the given prefix
 * Used for HSN-based SKU auto-generation (e.g., prefix "721699-" returns ["721699-001", "721699-002"])
 *
 * @param prefix - SKU prefix (e.g., "721699-")
 * @returns Array of SKUs matching the prefix
 */
export const getSkusWithPrefix = async (prefix: string): Promise<string[]> => {
  try {
    if (!prefix || !prefix.trim()) {
      return [];
    }
    const trimmedPrefix = prefix.trim();
    // Firestore prefix query: >= prefix and <= prefix + high Unicode char
    const endPrefix = trimmedPrefix + '\uf8ff';
    const snapshot = await getDocs(
      query(
        collection(db, ITEMS_COLLECTION),
        where('sku', '>=', trimmedPrefix),
        where('sku', '<=', endPrefix)
      )
    );
    return snapshot.docs.map((docSnap) => docSnap.id).filter(Boolean);
  } catch (error) {
    console.error('Error getting SKUs with prefix:', error);
    throw error;
  }
};

/**
 * Check if an SKU already exists
 * Used for validation before creating/updating items
 * 
 * @param sku - SKU to check
 * @param excludeId - Optional item ID to exclude (for updates)
 * @returns true if SKU exists, false otherwise
 */
export const checkSkuExists = async (
  sku: string,
  excludeId?: string
): Promise<boolean> => {
  try {
    const skuRef = doc(db, 'skus', sku);
    const skuDoc = await getDoc(skuRef);
    if (skuDoc.exists()) {
      if (excludeId && skuDoc.data()?.itemId === excludeId) {
        // Continue checking legacy in case it also exists there
      } else {
        return true;
      }
    }

    // Fallback to checking items collection in case some SKUs aren't in `skus` collection yet
    const itemsSnapshot = await getDocs(
      query(collection(db, ITEMS_COLLECTION), where('sku', '==', sku))
    );

    // If checking for update, exclude the current item
    if (excludeId) {
      return itemsSnapshot.docs.some((doc) => doc.id !== excludeId);
    }

    return !itemsSnapshot.empty;
  } catch (error) {
    console.error('Error checking SKU exists:', error);
    throw error;
  }
};

/**
 * Create a new item and initial inventory record
 * 
 * This function:
 * 1. Creates the item document in the items collection
 * 2. Creates an initial inventory entry for the central store
 * 3. Updates the item's denormalized stock totals
 * 
 * @param itemData - Item data including initial quantity
 * @param categoryName - Category name for denormalization (optional, defaults to "Uncategorized")
 * @returns The created item ID
 */
export const createItem = async (
  itemData: CreateItemData,
  categoryName?: string
): Promise<string> => {
  try {
    if (isDiscreteUnit(itemData.unit)) {
      if (!Number.isInteger(itemData.initialQuantity)) {
        throw new Error(`${itemData.unit} initial quantity must be a whole number`);
      }
      if (!Number.isInteger(itemData.minStockLevel)) {
        throw new Error(`${itemData.unit} minimum stock must be a whole number`);
      }
    }
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to create items');
    }

    // Pre-check SKU existence outside transaction
    const skuExists = await checkSkuExists(itemData.sku);
    if (skuExists) {
      throw new Error(`SKU "${itemData.sku}" already exists`);
    }

    return await runTransaction(db, async (transaction) => {
      // Re-check SKU uniqueness safely inside transaction via the 'skus' collection
      const skuRef = doc(db, 'skus', itemData.sku);
      const skuDoc = await transaction.get(skuRef);
      if (skuDoc.exists()) {
        throw new Error(`SKU "${itemData.sku}" already exists`);
      }

      // Create item document with auto-generated ID
      const itemRef = doc(collection(db, ITEMS_COLLECTION));
      const now = serverTimestamp();
      
      const isWeightBased = Boolean(itemData.weightPerMeter);
      const lengthPerPiece = itemData.lengthPerPiece;
      const steelMasterId = itemData.steelMasterId;
      const steelMasterName = itemData.steelMasterName ?? undefined;

      // Handle optional categories using helper functions
      const { categoryId: finalCategoryId, categoryName: finalCategoryName } = prepareCategoryData(
        itemData.categoryId,
        categoryName
      );

      const itemDocData: Record<string, unknown> = {
        name: itemData.name,
        sku: itemData.sku,
        ...itemSearchIndexFields(itemData.name, itemData.sku),
        description: itemData.description || '',
        categoryId: finalCategoryId,
        categoryName: finalCategoryName,
        type: itemData.type,
        unit: itemData.unit,
        imageUrl: itemData.imageUrl || '',
        minStockLevel: itemData.minStockLevel,
        status: 'active' as const,
        totalQuantity: itemData.initialQuantity,
        centralStoreQuantity: itemData.initialQuantity,
        isLowStock: computeIsLowStock(itemData.initialQuantity, itemData.minStockLevel),
        atSitesQuantity: 0,
        inMaintenanceQuantity: 0,
        createdAt: now,
        updatedAt: now,
      };
      if (itemData.createdBy) itemDocData.createdBy = itemData.createdBy;
      if (itemData.createdByName) itemDocData.createdByName = itemData.createdByName;
      if (itemData.createdByRole) itemDocData.createdByRole = itemData.createdByRole;
      if (itemData.weightPerMeter != null) itemDocData.weightPerMeter = itemData.weightPerMeter;
      if (itemData.standardUnitPrice != null) itemDocData.standardUnitPrice = itemData.standardUnitPrice;
      if (itemData.standardGstPercentage != null) itemDocData.standardGstPercentage = itemData.standardGstPercentage;
      if (lengthPerPiece != null) itemDocData.lengthPerPiece = lengthPerPiece;
      if (steelMasterId) itemDocData.steelMasterId = steelMasterId;
      if (steelMasterName) itemDocData.steelMasterName = steelMasterName;
      if (isWeightBased) itemDocData.isWeightBased = true;

      // Create initial inventory entry for central store
      const inventoryRef = doc(
        db,
        INVENTORY_COLLECTION,
        getInventoryDocId(itemRef.id, getLocationId('store'))
      );
      const inventoryDocData: Record<string, unknown> = {
        itemId: itemRef.id,
        itemName: itemData.name,
        itemSku: itemData.sku,
        locationId: getLocationId('store'),
        locationType: 'store' as LocationType,
        locationName: 'Central Store',
        quantity: itemData.initialQuantity,
        updatedAt: now,
      };
      if (lengthPerPiece != null) inventoryDocData.lengthPerPiece = lengthPerPiece;

      transaction.set(skuRef, { itemId: itemRef.id, createdAt: now });
      transaction.set(itemRef, itemDocData);
      transaction.set(inventoryRef, inventoryDocData);

      return itemRef.id;
    });
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

/**
 * Update an existing item
 *
 * Type changes are blocked only when stock exists at sites or in maintenance
 * (central-only stock still allows correcting a mistaken type).
 *
 * @param id - Item document ID
 * @param updates - Item data to update
 * @param categoryName - Optional category name if categoryId is being updated
 */
export const updateItem = async (
  id: string,
  updates: UpdateItemData,
  categoryName?: string
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to update items');
    }

    // Pre-check SKU existence outside transaction
    if (updates.sku) {
      const skuExists = await checkSkuExists(updates.sku, id);
      if (skuExists) {
        throw new Error(`SKU "${updates.sku}" already exists`);
      }
    }

    await runTransaction(db, async (transaction) => {
      // Fetch current item for validation
      const itemRef = doc(db, ITEMS_COLLECTION, id);
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists()) {
        throw new Error(`Item with ID ${id} not found`);
      }
      const itemData = itemDoc.data();

      const resolvedUnit = updates.unit ?? itemData.unit;
      if (updates.minStockLevel != null && isDiscreteUnit(resolvedUnit) && !Number.isInteger(updates.minStockLevel)) {
        throw new Error(`${resolvedUnit} minimum stock must be a whole number`);
      }

      // Type change: block only when stock is at sites or in maintenance (not central-only)
      if (updates.type !== undefined && updates.type !== itemData.type) {
        const stockAtSitesOrMaintenance =
          (itemData.atSitesQuantity ?? 0) > 0 || (itemData.inMaintenanceQuantity ?? 0) > 0;

        if (stockAtSitesOrMaintenance) {
          throw new Error(
            'Item type cannot be changed while stock exists at sites or in maintenance'
          );
        }
      }

      // If SKU is being updated, check if new SKU already exists safely inside transaction
      if (updates.sku && updates.sku !== itemData.sku) {
        const newSkuRef = doc(db, 'skus', updates.sku);
        const newSkuDoc = await transaction.get(newSkuRef);
        if (newSkuDoc.exists() && newSkuDoc.data()?.itemId !== id) {
          throw new Error(`SKU "${updates.sku}" already exists`);
        }
        
        // Write the new SKU doc
        transaction.set(newSkuRef, { itemId: id, updatedAt: serverTimestamp() });
        
        // Delete the old SKU doc
        if (itemData.sku) {
          const oldSkuRef = doc(db, 'skus', itemData.sku);
          transaction.delete(oldSkuRef);
        }
      }

      // Build update payload — Firestore rejects undefined; omit undefined fields
      const rawData: Record<string, unknown> = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      const newType = updates.type !== undefined ? updates.type : itemData.type;
      if (newType === 'fuel') {
        rawData.unit = 'Liters';
        if (itemData.type !== 'fuel') {
          rawData.steelMasterId = deleteField();
          rawData.steelMasterName = deleteField();
          rawData.weightPerMeter = deleteField();
          rawData.lengthPerPiece = deleteField();
        }
      }

      // Handle category updates using helper functions
      if (updates.categoryId !== undefined) {
        const { categoryId: finalCategoryId, categoryName: finalCategoryName } = prepareCategoryData(
          updates.categoryId,
          categoryName
        );
        rawData.categoryId = finalCategoryId;
        rawData.categoryName = finalCategoryName;
      }
      if (updates.updatedBy) rawData.updatedBy = updates.updatedBy;
      if (updates.updatedByName) rawData.updatedByName = updates.updatedByName;
      if (updates.updatedByRole) rawData.updatedByRole = updates.updatedByRole;

      const mergedName =
        updates.name !== undefined ? updates.name : ((itemData.name as string) ?? '');
      const mergedSku =
        updates.sku !== undefined ? updates.sku : ((itemData.sku as string) ?? '');
      Object.assign(rawData, itemSearchIndexFields(mergedName, mergedSku));

      // Recompute isLowStock if minStockLevel or centralStoreQuantity-affecting fields changed
      const newMinStockLevel = updates.minStockLevel !== undefined
        ? updates.minStockLevel
        : (itemData.minStockLevel as number ?? 0);
      const currentCentralQty = itemData.centralStoreQuantity as number ?? 0;
      rawData.isLowStock = computeIsLowStock(currentCentralQty, newMinStockLevel);

      const updateData = Object.fromEntries(
        Object.entries(rawData).filter(([, v]) => v !== undefined)
      ) as Record<string, unknown>;

      transaction.update(itemRef, updateData);
    });
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

/**
 * Delete an item and clean up associated data
 *
 * This function:
 * 1. Gets the item document to retrieve imageUrl
 * 2. If imageUrl exists, deletes the image from Storage (prevents orphaned files)
 * 3. Deletes all inventory entries for this item
 * 4. Deletes the item document
 * Uses batch operations for Firestore writes (atomic delete of inventory + item)
 *
 * @param id - Item document ID
 */
export const deleteItem = async (id: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to delete items');
    }

    // Pre-fetch inventory entries for this item since we can't query inside transaction
    const inventoryQuery = query(
      collection(db, INVENTORY_COLLECTION),
      where('itemId', '==', id)
    );
    const inventorySnapshot = await getDocs(inventoryQuery);
    const inventoryRefs = inventorySnapshot.docs.map((docSnap) => docSnap.ref);

    let imageUrl: string | undefined;

    await runTransaction(db, async (transaction) => {
      const itemRef = doc(db, ITEMS_COLLECTION, id);
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists()) {
        throw new Error(`Item with ID ${id} not found`);
      }

      const itemData = itemDoc.data();

      // Allow delete when: totalQuantity === 0 OR (atSitesQuantity === 0 AND inMaintenanceQuantity === 0)
      // Block when stock is at sites or in maintenance (physical assets elsewhere)
      const totalQty = itemData.totalQuantity || 0;
      const atSites = itemData.atSitesQuantity || 0;
      const inMaint = itemData.inMaintenanceQuantity || 0;
      const hasStockAtSitesOrMaint = atSites > 0 || inMaint > 0;
      if (hasStockAtSitesOrMaint) {
        throw new Error(
          'Cannot delete item with stock at sites or in maintenance. Reduce stock to zero or move all to central store first.'
        );
      }

      imageUrl = itemData.imageUrl;

      // Delete the sku document if one exists for this item
      if (itemData.sku) {
        const skuRef = doc(db, 'skus', itemData.sku);
        transaction.delete(skuRef);
      }

      // Delete all inventory entries
      for (const invRef of inventoryRefs) {
        transaction.delete(invRef);
      }

      // Delete the item document itself
      transaction.delete(itemRef);
    });

    // Delete image from storage after successful database deletion
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
      await deleteItemImageByUrl(imageUrl).catch((err) => {
        console.error('Error deleting item image:', err);
      });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

/**
 * Adjust inventory quantity at a specific location
 * 
 * This function:
 * 1. Updates the inventory entry for the location
 * 2. Updates the item's denormalized stock totals
 * 
 * @param adjustmentData - Adjustment data including itemId, locationId, type, quantity, reason, notes
 */
const MAX_TRANSACTION_RETRIES = 3;

/**
 * Apply inventory + item total updates inside an existing Firestore transaction.
 * Performs all reads first, then writes. Callers may add more writes after this resolves.
 */
export async function applyInventoryAdjustmentInTransaction(
  transaction: Transaction,
  adjustmentData: AdjustmentData
): Promise<{ oldQuantity: number; newQuantity: number }> {
  const inventoryDocRef = doc(
    db,
    INVENTORY_COLLECTION,
    getInventoryDocId(adjustmentData.itemId, adjustmentData.locationId)
  );

  const itemRef = doc(db, ITEMS_COLLECTION, adjustmentData.itemId);

  const inventoryDoc = await transaction.get(inventoryDocRef);
  const invData = inventoryDoc.exists() ? inventoryDoc.data() : null;
  const currentQty = invData?.quantity ?? 0;

  const itemDoc = await transaction.get(itemRef);
  if (!itemDoc.exists()) {
    throw new Error(`Item ${adjustmentData.itemId} not found`);
  }
  const itemData = itemDoc.data() ?? {};

  let quantityChange: number;
  let newQuantity: number;

  if (adjustmentData.type === 'set') {
    newQuantity = adjustmentData.quantity;
    quantityChange = newQuantity - currentQty;
    if (newQuantity < 0) {
      throw new Error(
        `Target quantity cannot be negative. Requested: ${adjustmentData.quantity}`
      );
    }
  } else {
    quantityChange =
      adjustmentData.type === 'add'
        ? adjustmentData.quantity
        : -adjustmentData.quantity;
    newQuantity = currentQty + quantityChange;
  }

  if (newQuantity < 0) {
    throw new Error(
      `Cannot reduce stock below zero. Current quantity: ${currentQty}, Attempted change: ${quantityChange}`
    );
  }

  const inventoryUpdateData: Record<string, unknown> = {
    itemId: adjustmentData.itemId,
    itemName: itemData.name,
    itemSku: itemData.sku,
    locationId: adjustmentData.locationId,
    locationType: adjustmentData.locationType,
    locationName: adjustmentData.locationName,
    quantity: newQuantity,
    updatedAt: serverTimestamp(),
  };
  if (adjustmentData.lengthPerPiece != null) {
    inventoryUpdateData.lengthPerPiece = adjustmentData.lengthPerPiece;
  }

  if (newQuantity === 0 && adjustmentData.locationType === 'site') {
    if (inventoryDoc.exists()) {
      transaction.delete(inventoryDocRef);
    }
  } else if (!inventoryDoc.exists()) {
    transaction.set(inventoryDocRef, inventoryUpdateData);
  } else {
    transaction.update(inventoryDocRef, inventoryUpdateData);
  }

  const currentTotals = {
    totalQuantity: itemData.totalQuantity || 0,
    centralStoreQuantity: itemData.centralStoreQuantity || 0,
    atSitesQuantity: itemData.atSitesQuantity || 0,
    inMaintenanceQuantity: itemData.inMaintenanceQuantity || 0,
  };

  const updatedTotals: Record<string, unknown> = {};
  if (adjustmentData.locationType === 'store') {
    updatedTotals.centralStoreQuantity =
      currentTotals.centralStoreQuantity + quantityChange;
  } else if (adjustmentData.locationType === 'site') {
    updatedTotals.atSitesQuantity =
      currentTotals.atSitesQuantity + quantityChange;
  } else if (adjustmentData.locationType === 'maintenance') {
    updatedTotals.inMaintenanceQuantity =
      currentTotals.inMaintenanceQuantity + quantityChange;
  }

  updatedTotals.totalQuantity = currentTotals.totalQuantity + quantityChange;
  updatedTotals.updatedAt = serverTimestamp();

  if (typeof updatedTotals.totalQuantity === 'number' && updatedTotals.totalQuantity < 0) {
    throw new Error('Total quantity cannot drop below zero.');
  }
  if (typeof updatedTotals.centralStoreQuantity === 'number' && updatedTotals.centralStoreQuantity < 0) {
    throw new Error('Central store quantity cannot drop below zero.');
  }
  if (typeof updatedTotals.atSitesQuantity === 'number' && updatedTotals.atSitesQuantity < 0) {
    throw new Error('Site quantity cannot drop below zero.');
  }
  if (typeof updatedTotals.inMaintenanceQuantity === 'number' && updatedTotals.inMaintenanceQuantity < 0) {
    throw new Error('Maintenance quantity cannot drop below zero.');
  }

  if (typeof updatedTotals.centralStoreQuantity === 'number') {
    const newCentralQty = updatedTotals.centralStoreQuantity;
    const minStock = (itemData.minStockLevel as number) ?? 0;
    updatedTotals.isLowStock = computeIsLowStock(newCentralQty, minStock);
  }

  transaction.update(itemRef, updatedTotals);
  return { oldQuantity: currentQty, newQuantity };
}

export const adjustQuantity = async (
  adjustmentData: AdjustmentData
): Promise<{ oldQuantity: number; newQuantity: number }> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to adjust inventory');
  }

  if (!adjustmentData.itemId?.trim()) {
    throw new Error('Item ID is required to adjust quantity');
  }
  if (!adjustmentData.locationId?.trim()) {
    throw new Error('Location ID is required to adjust quantity');
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt++) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        return applyInventoryAdjustmentInTransaction(transaction, adjustmentData);
      });
      return result;
    } catch (error) {
      lastError = error;
      const isRetryable =
        (error as { code?: string })?.code === 'unavailable' ||
        (error as { code?: string })?.code === 'resource-exhausted' ||
        (error as { code?: string })?.code === 'aborted' ||
        (error as { code?: string })?.code === 'deadline-exceeded' ||
        String(error).toLowerCase().includes('network') ||
        String(error).toLowerCase().includes('timeout');

      if (isRetryable && attempt < MAX_TRANSACTION_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.warn(
          `adjustQuantity attempt ${attempt}/${MAX_TRANSACTION_RETRIES} failed, retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('Error adjusting quantity:', error);
        const toThrow =
          error instanceof Error
            ? error
            : new Error(String(error ?? 'Failed to adjust quantity'));
        throw toThrow;
      }
    }
  }
  console.error('Error adjusting quantity:', lastError);
  const toThrow =
    lastError instanceof Error
      ? lastError
      : new Error(String(lastError ?? 'Failed to adjust quantity'));
  throw toThrow;
};

/**
 * Subscribe to real-time updates for items collection
 * 
 * @param callback - Function called whenever the items list changes
 * @param filters - Optional filters for category, type, lowStockOnly, status
 * @returns Unsubscribe function to stop listening
 */
export const subscribeItems = (
  callback: (items: Item[]) => void,
  filters?: ItemFilters
): Unsubscribe => {
  let q = query(collection(db, ITEMS_COLLECTION));

  // Apply categoryId filter with support for null/uncategorized items
  if (filters?.categoryId !== undefined) {
    if (filters.categoryId === null || filters.categoryId === 'uncategorized' || filters.categoryId === '') {
      // Filter for items without categories (null categoryId)
      q = query(q, where('categoryId', '==', null));
    } else {
      // Filter for items with the specific categoryId
      q = query(q, where('categoryId', '==', filters.categoryId));
    }
  }
  // If no categoryId filter is provided, return all items regardless of category status
  if (filters?.type) {
    q = query(q, where('type', '==', filters.type));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }

  // Order by name
  q = query(q, orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const items: Item[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const firestoreItem: FirestoreItem = {
          id: docSnap.id,
          name: data.name,
          sku: data.sku,
          description: data.description,
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          type: data.type,
          unit: data.unit,
          imageUrl: data.imageUrl,
          minStockLevel: data.minStockLevel ?? 0,
          status: data.status,
          totalQuantity: data.totalQuantity || 0,
          centralStoreQuantity: data.centralStoreQuantity || 0,
          atSitesQuantity: data.atSitesQuantity || 0,
          inMaintenanceQuantity: data.inMaintenanceQuantity || 0,
          standardUnitPrice: data.standardUnitPrice,
          standardGstPercentage: data.standardGstPercentage,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        items.push(firestoreItemToItem(firestoreItem));
      });

      // Apply low stock filter in memory (central store quantity <= min)
      if (filters?.lowStockOnly) {
        const filteredItems = items.filter((item) => isLowStock(item));
        callback(filteredItems);
      } else {
        callback(items);
      }
    },
    (error) => {
      console.error('Error in items subscription:', error);
    }
  );
};

/**
 * Subscribe to real-time updates for inventory by location
 * 
 * @param locationId - Location ID to filter by
 * @param callback - Function called whenever the inventory changes
 * @returns Unsubscribe function to stop listening
 */
export const subscribeInventoryByLocation = (
  locationId: string,
  callback: (inventory: InventoryEntry[]) => void
): Unsubscribe => {
  // Include locationType for Firestore rules: Site Managers can only read
  // docs where locationType == 'site'; query must filter by it to succeed.
  const locationType = getLocationTypeFromId(locationId);
  if (!locationId || !locationType) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, INVENTORY_COLLECTION),
    where('locationId', '==', locationId),
    where('locationType', '==', locationType),
    orderBy('itemName', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const inventory: InventoryEntry[] = [];

      const byId = new Map<string, InventoryEntry>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const firestoreEntry: FirestoreInventoryEntry = {
          id: docSnap.id,
          itemId: data.itemId,
          itemName: data.itemName,
          itemSku: data.itemSku,
          locationId: data.locationId,
          locationType: data.locationType,
          locationName: data.locationName,
          quantity: data.quantity,
          itemType: data.itemType,
          unit: data.unit,
          lengthPerPiece: data.lengthPerPiece,
          updatedAt: data.updatedAt,
        };
        const entry = firestoreInventoryEntryToInventoryEntry(firestoreEntry);
        if (!byId.has(entry.id)) byId.set(entry.id, entry);
      });

      callback(Array.from(byId.values()));
    },
    (error) => {
      console.error('Error in inventory subscription:', error);
    }
  );
};

/**
 * Get inventory for a specific location (one-time read)
 * 
 * @param locationId - Location ID to get inventory for
 * @returns Array of inventory entries for the location
 */
export const getInventoryByLocation = async (
  locationId: string
): Promise<InventoryEntry[]> => {
  try {
    // Site Managers can only read inventory where locationType == 'site'.
    // Firestore requires the query to include locationType so it can verify
    // the query only returns allowed documents. Without this, the query fails
    // with "Missing or insufficient permissions" for Site Managers.
    const locationType = getLocationTypeFromId(locationId);
    if (!locationId || !locationType) {
      return [];
    }

    const q = query(
      collection(db, INVENTORY_COLLECTION),
      where('locationId', '==', locationId),
      where('locationType', '==', locationType),
      orderBy('itemName', 'asc')
    );

    const snapshot = await getDocs(q);
    const byId = new Map<string, InventoryEntry>();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const firestoreEntry: FirestoreInventoryEntry = {
        id: docSnap.id,
        itemId: data.itemId,
        itemName: data.itemName,
        itemSku: data.itemSku,
        locationId: data.locationId,
        locationType: data.locationType,
        locationName: data.locationName,
        quantity: data.quantity,
        lengthPerPiece: data.lengthPerPiece,
        updatedAt: data.updatedAt,
      };
      const entry = firestoreInventoryEntryToInventoryEntry(firestoreEntry);
      if (!byId.has(entry.id)) byId.set(entry.id, entry);
    });

    return Array.from(byId.values());
  } catch (error) {
    console.error('Error getting inventory by location:', error);
    throw error;
  }
};

/**
 * Get inventory for a specific item across all locations (central store, sites, maintenance).
 * Used for stock distribution breakdown on Item Detail screen.
 *
 * @param itemId - Item document ID
 * @returns Array of inventory entries for the item at each location
 */
export const getInventoryByItemId = async (
  itemId: string
): Promise<InventoryEntry[]> => {
  try {
    if (!itemId) return [];

    const q = query(
      collection(db, INVENTORY_COLLECTION),
      where('itemId', '==', itemId),
      orderBy('locationId', 'asc')
    );

    const snapshot = await getDocs(q);
    const entries: InventoryEntry[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const firestoreEntry: FirestoreInventoryEntry = {
        id: docSnap.id,
        itemId: data.itemId,
        itemName: data.itemName,
        itemSku: data.itemSku,
        locationId: data.locationId,
        locationType: data.locationType,
        locationName: data.locationName,
        quantity: data.quantity,
        itemType: data.itemType,
        unit: data.unit,
        lengthPerPiece: data.lengthPerPiece,
        updatedAt: data.updatedAt,
      };
      entries.push(firestoreInventoryEntryToInventoryEntry(firestoreEntry));
    });

    return entries;
  } catch (error) {
    console.error('Error getting inventory by item:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for inventory of a specific item across all locations.
 *
 * @param itemId - Item document ID
 * @param callback - Called whenever the item's inventory changes
 * @returns Unsubscribe function
 */
export const subscribeInventoryByItemId = (
  itemId: string,
  callback: (entries: InventoryEntry[]) => void
): Unsubscribe => {
  if (!itemId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, INVENTORY_COLLECTION),
    where('itemId', '==', itemId),
    orderBy('locationId', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const entries: InventoryEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const firestoreEntry: FirestoreInventoryEntry = {
          id: docSnap.id,
          itemId: data.itemId,
          itemName: data.itemName,
          itemSku: data.itemSku,
          locationId: data.locationId,
          locationType: data.locationType,
          locationName: data.locationName,
          quantity: data.quantity,
          itemType: data.itemType,
          unit: data.unit,
          lengthPerPiece: data.lengthPerPiece,
          updatedAt: data.updatedAt,
        };
        entries.push(firestoreInventoryEntryToInventoryEntry(firestoreEntry));
      });
      callback(entries);
    },
    (error) => {
      console.error('Error in inventory-by-item subscription:', error);
    }
  );
};

