import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  writeBatch,
  Timestamp,
  runTransaction,
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
        minStockLevel: data.minStockLevel,
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

    // Apply low stock filter in memory (after fetching)
    if (filters?.lowStockOnly) {
      return items.filter(
        (item) => item.totalQuantity <= item.minStockLevel
      );
    }

    return items;
  } catch (error) {
    console.error('Error listing items:', error);
    throw error;
  }
};

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
    const firestoreItem: FirestoreItem = {
      id: itemDoc.id,
      name: data.name,
      sku: data.sku,
      description: data.description,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      type: data.type,
      unit: data.unit,
      imageUrl: data.imageUrl,
      minStockLevel: data.minStockLevel,
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
  } catch (error) {
    console.error('Error getting item by ID:', error);
    throw error;
  }
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

    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // If categoryId is updated, ensure categoryName is also updated
    if (updates.categoryId && categoryName) {
      updateData.categoryName = categoryName;
    }

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
export const adjustQuantity = async (
  adjustmentData: AdjustmentData
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to adjust inventory');
    }

    const inventoryQuery = query(
      collection(db, INVENTORY_COLLECTION),
      where('itemId', '==', adjustmentData.itemId),
      where('locationId', '==', adjustmentData.locationId)
    );

    const itemRef = doc(db, ITEMS_COLLECTION, adjustmentData.itemId);

    await runTransaction(db, async (transaction) => {
      // Read inventory within transaction (atomic with writes)
      // Note: transaction.get() supports Query at runtime; type assertion needed for TS
      const inventorySnapshot = (await (
        transaction as unknown as { get: (ref: unknown) => Promise<QuerySnapshot> }
      ).get(inventoryQuery)) as QuerySnapshot;
      let inventoryRef: ReturnType<typeof doc>;
      let currentQuantity = 0;

      if (inventorySnapshot.empty) {
        inventoryRef = doc(collection(db, INVENTORY_COLLECTION));
        currentQuantity = 0;
      } else {
        inventoryRef = doc(db, INVENTORY_COLLECTION, inventorySnapshot.docs[0].id);
        currentQuantity = inventorySnapshot.docs[0].data()?.quantity || 0;
      }

      // Read item within transaction
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists()) {
        throw new Error(`Item ${adjustmentData.itemId} not found`);
      }
      const itemData = itemDoc.data() ?? {};

      // Calculate new quantity
      const quantityChange =
        adjustmentData.type === 'add'
          ? adjustmentData.quantity
          : -adjustmentData.quantity;
      const newQuantity = currentQuantity + quantityChange;

      // Prevent negative stock (atomic check)
      if (newQuantity < 0) {
        throw new Error(
          `Cannot reduce stock below zero. Current quantity: ${currentQuantity}, Attempted change: ${quantityChange}`
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

      if (inventorySnapshot.empty) {
        transaction.set(inventoryRef, inventoryUpdateData);
      } else {
        transaction.update(inventoryRef, inventoryUpdateData);
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
    });
  } catch (error) {
    console.error('Error adjusting quantity:', error);
    throw error;
  }
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
          minStockLevel: data.minStockLevel,
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

      // Apply low stock filter in memory
      if (filters?.lowStockOnly) {
        const filteredItems = items.filter(
          (item) => item.totalQuantity <= item.minStockLevel
        );
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

