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
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { auth } from '../../../config/firebase';
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

    // Create item document
    const itemRef = doc(collection(db, ITEMS_COLLECTION));
    const now = serverTimestamp();
    
    const itemDocData = {
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

    batch.set(itemRef, itemDocData);

    // Create initial inventory entry for central store
    const inventoryRef = doc(collection(db, INVENTORY_COLLECTION));
    const inventoryDocData = {
      itemId: itemRef.id,
      itemName: itemData.name,
      itemSku: itemData.sku,
      locationId: 'store',
      locationType: 'store' as LocationType,
      locationName: 'Central Store',
      quantity: itemData.initialQuantity,
      updatedAt: now,
    };

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
 * Note: Item type cannot be changed after first transaction (business rule)
 * This is enforced by not allowing type updates in UpdateItemData
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

    // Get current inventory entry
    const inventoryQuery = query(
      collection(db, INVENTORY_COLLECTION),
      where('itemId', '==', adjustmentData.itemId),
      where('locationId', '==', adjustmentData.locationId)
    );

    const inventorySnapshot = await getDocs(inventoryQuery);
    let inventoryRef: any;
    let currentQuantity = 0;

    if (inventorySnapshot.empty) {
      // Create new inventory entry if it doesn't exist
      inventoryRef = doc(collection(db, INVENTORY_COLLECTION));
      currentQuantity = 0;
    } else {
      inventoryRef = doc(db, INVENTORY_COLLECTION, inventorySnapshot.docs[0].id);
      currentQuantity = inventorySnapshot.docs[0].data().quantity || 0;
    }

    // Calculate new quantity
    const quantityChange =
      adjustmentData.type === 'add'
        ? adjustmentData.quantity
        : -adjustmentData.quantity;
    const newQuantity = currentQuantity + quantityChange;

    // Prevent negative stock
    if (newQuantity < 0) {
      throw new Error(
        `Cannot reduce stock below zero. Current quantity: ${currentQuantity}, Attempted change: ${quantityChange}`
      );
    }

    // Get item data for denormalized fields
    const itemDoc = await getDoc(doc(db, ITEMS_COLLECTION, adjustmentData.itemId));
    if (!itemDoc.exists()) {
      throw new Error(`Item ${adjustmentData.itemId} not found`);
    }

    const itemData = itemDoc.data();
    const batch = writeBatch(db);

    // Update or create inventory entry
    const inventoryUpdateData: any = {
      itemId: adjustmentData.itemId,
      itemName: itemData.name,
      itemSku: itemData.sku,
      locationId: adjustmentData.locationId,
      locationType: adjustmentData.locationType,
      locationName: adjustmentData.locationName,
      quantity: newQuantity,
      updatedAt: serverTimestamp(),
    };

    if (inventorySnapshot.empty) {
      batch.set(inventoryRef, inventoryUpdateData);
    } else {
      batch.update(inventoryRef, inventoryUpdateData);
    }

    // Update item's denormalized stock totals
    const itemRef = doc(db, ITEMS_COLLECTION, adjustmentData.itemId);
    const currentTotals = {
      totalQuantity: itemData.totalQuantity || 0,
      centralStoreQuantity: itemData.centralStoreQuantity || 0,
      atSitesQuantity: itemData.atSitesQuantity || 0,
      inMaintenanceQuantity: itemData.inMaintenanceQuantity || 0,
    };

    // Calculate new totals based on location type
    let updatedTotals: any = {};
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

    batch.update(itemRef, updatedTotals);

    // Commit batch
    await batch.commit();
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
  const q = query(
    collection(db, INVENTORY_COLLECTION),
    where('locationId', '==', locationId),
    orderBy('itemName', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const inventory: InventoryEntry[] = [];

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
          updatedAt: data.updatedAt,
        };
        inventory.push(firestoreInventoryEntryToInventoryEntry(firestoreEntry));
      });

      callback(inventory);
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
    const q = query(
      collection(db, INVENTORY_COLLECTION),
      where('locationId', '==', locationId),
      orderBy('itemName', 'asc')
    );

    const snapshot = await getDocs(q);
    const inventory: InventoryEntry[] = [];

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
        updatedAt: data.updatedAt,
      };
      inventory.push(firestoreInventoryEntryToInventoryEntry(firestoreEntry));
    });

    return inventory;
  } catch (error) {
    console.error('Error getting inventory by location:', error);
    throw error;
  }
};

