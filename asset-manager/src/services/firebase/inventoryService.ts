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
} from 'firebase/firestore';
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
import { timestampToISO } from '../../types/inventory';
import { getLocationId, getLocationTypeFromId } from '../../utils/locationUtils';
import { isLowStock } from '../../utils/inventoryUtils';

// Collection names
const ITEMS_COLLECTION = 'items';
const INVENTORY_COLLECTION = 'inventory';

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

    // Apply filters
    if (filters?.categoryId) {
      q = query(q, where('categoryId', '==', filters.categoryId));
    }
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
 * Build Firestore query constraints for items (shared by listItemsPaginated and getItemsCount).
 * Excludes lowStockOnly — that filter is applied client-side.
 */
const buildItemsQueryConstraints = (filters?: ItemFilters): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];
  if (filters?.categoryId) {
    constraints.push(where('categoryId', '==', filters.categoryId));
  }
  if (filters?.type) {
    constraints.push(where('type', '==', filters.type));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }
  constraints.push(orderBy('name', 'asc'));
  return constraints;
};

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
 * @param categoryName - Category name for denormalization
 * @returns The created item ID
 */
export const createItem = async (
  itemData: CreateItemData,
  categoryName: string
): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to create items');
    }

    // Check if SKU already exists
    const skuExists = await checkSkuExists(itemData.sku);
    if (skuExists) {
      throw new Error(`SKU "${itemData.sku}" already exists`);
    }

    const batch = writeBatch(db);

    // Create item document with SKU as document ID (enables Firestore rule for SKU uniqueness)
    const itemRef = doc(db, ITEMS_COLLECTION, itemData.sku);
    const now = serverTimestamp();
    
    const isWeightBased = Boolean(itemData.weightPerMeter);
    const lengthPerPiece = itemData.lengthPerPiece;
    const steelMasterId = itemData.steelMasterId;
    const steelMasterName = itemData.steelMasterName ?? undefined;

    const itemDocData: Record<string, unknown> = {
      name: itemData.name,
      sku: itemData.sku,
      description: itemData.description || '',
      categoryId: itemData.categoryId,
      categoryName: categoryName,
      type: itemData.type,
      unit: itemData.unit,
      imageUrl: itemData.imageUrl || '',
      minStockLevel: itemData.minStockLevel,
      status: 'active' as const,
      totalQuantity: itemData.initialQuantity,
      centralStoreQuantity: itemData.initialQuantity,
      atSitesQuantity: 0,
      inMaintenanceQuantity: 0,
      createdAt: now,
      updatedAt: now,
    };
    if (itemData.createdBy) itemDocData.createdBy = itemData.createdBy;
    if (itemData.createdByName) itemDocData.createdByName = itemData.createdByName;
    if (itemData.createdByRole) itemDocData.createdByRole = itemData.createdByRole;
    if (itemData.weightPerMeter != null) itemDocData.weightPerMeter = itemData.weightPerMeter;
    if (lengthPerPiece != null) itemDocData.lengthPerPiece = lengthPerPiece;
    if (steelMasterId) itemDocData.steelMasterId = steelMasterId;
    if (steelMasterName) itemDocData.steelMasterName = steelMasterName;
    if (isWeightBased) itemDocData.isWeightBased = true;

    batch.set(itemRef, itemDocData);

    // Create initial inventory entry for central store
    const inventoryRef = doc(collection(db, INVENTORY_COLLECTION));
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

    batch.set(inventoryRef, inventoryDocData);

    // Commit batch
    await batch.commit();

    return itemRef.id;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

/**
 * Update an existing item
 *
 * Enforces business rule: item type cannot be changed after the first transaction
 * (i.e., once any quantity has been added at any location).
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

    // Fetch current item for validation (before any database operations)
    const itemDoc = await getDoc(doc(db, ITEMS_COLLECTION, id));
    if (!itemDoc.exists()) {
      throw new Error(`Item with ID ${id} not found`);
    }
    const itemData = itemDoc.data();

    // Enforce business rule: type cannot be changed after first transaction
    if (updates.type !== undefined && updates.type !== itemData.type) {
      const hasTransactions =
        (itemData.totalQuantity ?? 0) > 0 ||
        (itemData.centralStoreQuantity ?? 0) > 0 ||
        (itemData.atSitesQuantity ?? 0) > 0 ||
        (itemData.inMaintenanceQuantity ?? 0) > 0;

      if (hasTransactions) {
        throw new Error(
          'Item type cannot be changed after inventory transactions have occurred'
        );
      }
    }

    // If SKU is being updated, check if new SKU already exists
    if (updates.sku) {
      const skuExists = await checkSkuExists(updates.sku, id);
      if (skuExists) {
        throw new Error(`SKU "${updates.sku}" already exists`);
      }
    }

    // Build update payload — Firestore rejects undefined; omit undefined fields
    const rawData: Record<string, unknown> = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.categoryId && categoryName) {
      rawData.categoryName = categoryName;
    }
    if (updates.updatedBy) rawData.updatedBy = updates.updatedBy;
    if (updates.updatedByName) rawData.updatedByName = updates.updatedByName;
    if (updates.updatedByRole) rawData.updatedByRole = updates.updatedByRole;

    const updateData = Object.fromEntries(
      Object.entries(rawData).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>;

    await updateDoc(doc(db, ITEMS_COLLECTION, id), updateData);
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

    // Get item to retrieve imageUrl for storage cleanup
    const itemDoc = await getDoc(doc(db, ITEMS_COLLECTION, id));
    if (!itemDoc.exists()) {
      throw new Error(`Item with ID ${id} not found`);
    }

    const itemData = itemDoc.data();
    const imageUrl = itemData?.imageUrl;

    // Delete image from storage first (prevents orphaned files)
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
      await deleteItemImageByUrl(imageUrl);
    }

    // Get all inventory entries for this item
    const inventoryQuery = query(
      collection(db, INVENTORY_COLLECTION),
      where('itemId', '==', id)
    );
    const inventorySnapshot = await getDocs(inventoryQuery);

    // Use batch for atomic delete (inventory entries + item document)
    const batch = writeBatch(db);

    inventorySnapshot.docs.forEach((docSnap) => {
      batch.delete(doc(db, INVENTORY_COLLECTION, docSnap.id));
    });

    batch.delete(doc(db, ITEMS_COLLECTION, id));

    await batch.commit();
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

  // Firestore transaction.get() accepts only DocumentReference, not Query.
  // Fetch inventory doc ref OUTSIDE the transaction, then use it inside.
  const inventoryQuery = query(
    collection(db, INVENTORY_COLLECTION),
    where('itemId', '==', adjustmentData.itemId),
    where('locationId', '==', adjustmentData.locationId)
  );
  const inventorySnapshot = await getDocs(inventoryQuery);

  let inventoryDocRef: ReturnType<typeof doc>;
  let currentQuantity = 0;
  if (inventorySnapshot.empty) {
    inventoryDocRef = doc(collection(db, INVENTORY_COLLECTION));
    currentQuantity = 0;
  } else {
    const existingDoc = inventorySnapshot.docs[0];
    if (!existingDoc?.ref) {
      throw new Error('Invalid inventory snapshot: missing document reference');
    }
    inventoryDocRef = existingDoc.ref;
    currentQuantity = existingDoc.data()?.quantity || 0;
  }

  const itemRef = doc(db, ITEMS_COLLECTION, adjustmentData.itemId);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt++) {
    try {
      const result = await runTransaction(db, async (transaction) => {
      // Read inventory doc within transaction (transaction.get accepts DocumentReference only)
      const inventoryDoc = await transaction.get(inventoryDocRef);
      const invData = inventoryDoc.exists() ? inventoryDoc.data() : null;
      const currentQty = invData?.quantity ?? currentQuantity;

      // Read item within transaction
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists()) {
        throw new Error(`Item ${adjustmentData.itemId} not found`);
      }
      const itemData = itemDoc.data() ?? {};

      // Calculate new quantity
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

      // Prevent negative stock (atomic check)
      if (newQuantity < 0) {
        throw new Error(
          `Cannot reduce stock below zero. Current quantity: ${currentQty}, Attempted change: ${quantityChange}`
        );
      }

      // Update or create inventory entry
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

      if (!inventoryDoc.exists()) {
        transaction.set(inventoryDocRef, inventoryUpdateData);
      } else {
        transaction.update(inventoryDocRef, inventoryUpdateData);
      }

      // Update item's denormalized stock totals
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

      transaction.update(itemRef, updatedTotals);
        return { oldQuantity: currentQty, newQuantity };
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

  // Apply filters
  if (filters?.categoryId) {
    q = query(q, where('categoryId', '==', filters.categoryId));
  }
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
      callback([]);
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
      callback([]);
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
          lengthPerPiece: data.lengthPerPiece,
          updatedAt: data.updatedAt,
        };
        entries.push(firestoreInventoryEntryToInventoryEntry(firestoreEntry));
      });
      callback(entries);
    },
    (error) => {
      console.error('Error in inventory-by-item subscription:', error);
      callback([]);
    }
  );
};

