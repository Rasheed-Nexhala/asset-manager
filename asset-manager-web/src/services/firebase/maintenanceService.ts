import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  onSnapshot,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  MaintenanceFirestore,
  Maintenance,
  MaintenancePhoto,
  AddToMaintenanceData,
  ReturnFromMaintenanceData,
  WriteOffData,
  MaintenanceStatus,
} from '../../types/maintenance';

// Collection names
const MAINTENANCE_COLLECTION = 'maintenance';
const ITEMS_COLLECTION = 'items';
const INVENTORY_COLLECTION = 'inventory';

const getInventoryDocId = (itemId: string, locationId: string): string =>
  `${itemId}_${locationId}`;

/**
 * Helper: Convert Firestore document to Redux-compatible format
 * 
 * Converts Firestore Timestamp objects to ISO date strings for Redux serialization
 * 
 * @param doc - Firestore document snapshot
 * @returns Maintenance object with serialized dates
 */
/**
 * Convert a single update entry's addedAt from Firestore Timestamp to ISO string
 */
function serializeUpdate(entry: { note: string; addedBy: string; addedByName: string; addedAt: unknown }): { note: string; addedBy: string; addedByName: string; addedAt: string } {
  const addedAt = entry.addedAt as { toDate?: () => Date } | string | undefined;
  return {
    note: entry.note,
    addedBy: entry.addedBy,
    addedByName: entry.addedByName,
    addedAt: typeof addedAt === 'object' && addedAt?.toDate ? addedAt.toDate().toISOString() : (typeof addedAt === 'string' ? addedAt : new Date().toISOString()),
  };
}

/** Serialize a single photo's uploadedAt (Firestore may store as Timestamp or string) */
function serializePhoto(photo: { url: string; fileName: string; uploadedAt: unknown }): MaintenancePhoto {
  const uploadedAt = photo.uploadedAt as { toDate?: () => Date } | string | undefined;
  return {
    url: photo.url,
    fileName: photo.fileName,
    uploadedAt:
      typeof uploadedAt === 'object' && uploadedAt?.toDate
        ? uploadedAt.toDate().toISOString()
        : typeof uploadedAt === 'string'
          ? uploadedAt
          : new Date().toISOString(),
  };
}

function firestoreToMaintenance(doc: any): Maintenance {
  const data = doc.data() as MaintenanceFirestore;
  const updates = (data.updates || []).filter(Boolean).map(serializeUpdate);
  const photos = (data.photos || []).filter(Boolean).map(serializePhoto);
  const writtenOffUnitsTotal =
    typeof data.writtenOffUnitsTotal === 'number' ? data.writtenOffUnitsTotal : null;

  return {
    ...data,
    id: doc.id,
    updates,
    photos,
    writtenOffUnitsTotal,
    addedAt: data.addedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    returnedAt: data.returnedAt?.toDate?.()?.toISOString() || null,
    writtenOffAt: data.writtenOffAt?.toDate?.()?.toISOString() || null,
    sourceReturnDate: data.sourceReturnDate?.toDate?.()?.toISOString() || null,
  };
}

/**
 * Add item to maintenance - Atomic transaction
 * 
 * This operation performs the following steps atomically:
 * 1. Validates item exists and has sufficient central store quantity
 * 2. Validates item is non-consumable (only non-consumable items can go to maintenance)
 * 3. Creates maintenance record
 * 4. Reduces central store inventory by specified quantity
 * 5. Increases item's inMaintenanceQuantity
 * 
 * All operations succeed together or fail together (transaction ensures atomicity)
 * 
 * @param data - Maintenance data including item details and issue information
 * @param userId - ID of user creating the maintenance record
 * @param userName - Display name of user creating the maintenance record
 * @returns Promise resolving to the maintenance record ID
 * @throws Error if item not found, insufficient quantity, or item is consumable
 */
export async function addToMaintenance(
  data: AddToMaintenanceData,
  userId: string,
  userName: string
): Promise<string> {
  try {
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
      throw new Error('Maintenance quantity must be a whole number greater than zero');
    }
    const inventoryDocRef = doc(
      db,
      INVENTORY_COLLECTION,
      getInventoryDocId(data.itemId, 'store')
    );

    const maintenanceId = await runTransaction(db, async (transaction) => {
      // 1. Read item document
      const itemRef = doc(db, ITEMS_COLLECTION, data.itemId);
      const itemSnap = await transaction.get(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      
      // Validate non-consumable only
      if (itemData.type === 'consumable') {
        throw new Error('Only non-consumable items can be moved to maintenance');
      }
      
      // 2. Read central store inventory
      const inventoryDoc = await transaction.get(inventoryDocRef);
      if (!inventoryDoc.exists()) {
        throw new Error('Item not found in central store inventory');
      }
      const inventoryData = inventoryDoc.data();
      
      // Validate sufficient quantity
      if (inventoryData.quantity < data.quantity) {
        throw new Error(
          `Insufficient quantity. Available: ${inventoryData.quantity}, Requested: ${data.quantity}`
        );
      }
      
      // 3. Create maintenance record
      const maintenanceRef = doc(collection(db, MAINTENANCE_COLLECTION));
      const maintenanceData: Omit<MaintenanceFirestore, 'id'> = {
        itemId: data.itemId,
        itemName: data.itemName,
        itemSku: data.itemSku,
        ...(data.unit ? { unit: data.unit } : {}),
        quantity: data.quantity,
        issueType: data.issueType,
        issueDescription: data.issueDescription ?? '',
        reportedBy: data.reportedBy || '',
        reportedByName: data.reportedByName || '',
        photos: data.photos || [],
        status: 'pending',
        updates: [],
        returnedAt: null,
        returnedQuantity: null,
        repairSummary: null,
        repairCost: null,
        repairedBy: null,
        writtenOffAt: null,
        writeOffReason: null,
        writeOffExplanation: null,
        writtenOffUnitsTotal: 0,
        addedBy: userId,
        addedByName: userName,
        addedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        sourceRequestId: data.sourceRequestId || null,
        sourceReturnDate: data.sourceReturnDate ? Timestamp.fromDate(data.sourceReturnDate) : null,
      };
      
      transaction.set(maintenanceRef, maintenanceData);
      
      // 4. Update inventory (reduce central store quantity)
      transaction.update(inventoryDocRef, {
        quantity: inventoryData.quantity - data.quantity,
        updatedAt: Timestamp.now(),
      });
      
      // 5. Update item denormalized counts
      const currentInMaintenance = itemData.inMaintenanceQuantity || 0;
      transaction.update(itemRef, {
        inMaintenanceQuantity: currentInMaintenance + data.quantity,
        centralStoreQuantity: (itemData.centralStoreQuantity || 0) - data.quantity,
        updatedAt: Timestamp.now(),
      });
      
      return maintenanceRef.id;
    });
    
    console.log('✅ Added to maintenance:', maintenanceId);
    return maintenanceId;
  } catch (error: any) {
    console.error('❌ Error adding to maintenance:', error);
    throw new Error(error.message || 'Failed to add item to maintenance');
  }
}

/**
 * Return item from maintenance - Atomic transaction
 * 
 * Returns repaired items back to central store inventory.
 * Supports partial returns (can return less than total quantity in maintenance).
 * 
 * This operation performs the following steps atomically:
 * 1. Validates maintenance record exists
 * 2. Validates return quantity doesn't exceed maintenance quantity
 * 3. Adds returned quantity back to central store inventory
 * 4. Updates item's inMaintenanceQuantity (decrease)
 * 5. Updates item's centralStoreQuantity (increase)
 * 6. Updates maintenance record with return details
 * 7. If full return (quantity becomes 0), marks status as 'returned'
 * 8. Adds update note to maintenance history
 * 
 * @param maintenanceId - ID of maintenance record
 * @param returnData - Return details including quantity and repair summary
 * @param userId - ID of user processing the return
 * @param userName - Display name of user processing the return
 * @throws Error if maintenance not found or return quantity exceeds maintenance quantity
 */
export async function returnFromMaintenance(
  maintenanceId: string,
  returnData: ReturnFromMaintenanceData,
  userId: string,
  userName: string
): Promise<void> {
  try {
    if (!Number.isInteger(returnData.returnQuantity) || returnData.returnQuantity <= 0) {
      throw new Error('Return quantity must be a whole number greater than zero');
    }
    const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
    const maintenanceSnapOuter = await getDoc(maintenanceRef);
    
    if (!maintenanceSnapOuter.exists()) {
      throw new Error('Maintenance record not found');
    }
    
    const maintenanceDataOuter = maintenanceSnapOuter.data() as MaintenanceFirestore;

    const inventoryDocRef = doc(
      db,
      INVENTORY_COLLECTION,
      getInventoryDocId(maintenanceDataOuter.itemId, 'store')
    );

    await runTransaction(db, async (transaction) => {
      // 1. Read maintenance record
      const maintenanceSnap = await transaction.get(maintenanceRef);
      
      if (!maintenanceSnap.exists()) {
        throw new Error('Maintenance record not found');
      }
      
      const maintenanceData = maintenanceSnap.data() as MaintenanceFirestore;
      
      // Validate quantity
      if (returnData.returnQuantity > maintenanceData.quantity) {
        throw new Error(
          `Return quantity (${returnData.returnQuantity}) exceeds maintenance quantity (${maintenanceData.quantity})`
        );
      }
      
      // 2. Read item document
      const itemRef = doc(db, ITEMS_COLLECTION, maintenanceData.itemId);
      const itemSnap = await transaction.get(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      
      // 3. Read central store inventory
      const inventoryDoc = await transaction.get(inventoryDocRef);
      const inventoryData = inventoryDoc.exists() ? inventoryDoc.data() : null;
      
      // 4. Update inventory (add back to central store)
      if (inventoryData) {
        transaction.update(inventoryDocRef, {
          quantity: inventoryData.quantity + returnData.returnQuantity,
          updatedAt: Timestamp.now(),
        });
      } else {
        const newEntry: Record<string, any> = {
          itemId: maintenanceData.itemId,
          itemName: maintenanceData.itemName,
          itemSku: maintenanceData.itemSku,
          locationId: 'store',
          locationType: 'store',
          locationName: 'Central Store',
          quantity: returnData.returnQuantity,
          updatedAt: Timestamp.now(),
        };
        if (itemData.unit != null) newEntry.unit = itemData.unit;
        if (itemData.lengthPerPiece != null) newEntry.lengthPerPiece = itemData.lengthPerPiece;
        if (itemData.weightPerMeter != null) newEntry.weightPerMeter = itemData.weightPerMeter;
        transaction.set(inventoryDocRef, newEntry);
      }
      
      // 5. Update item denormalized counts
      const currentInMaintenance = itemData.inMaintenanceQuantity || 0;
      transaction.update(itemRef, {
        inMaintenanceQuantity: Math.max(0, currentInMaintenance - returnData.returnQuantity),
        centralStoreQuantity: (itemData.centralStoreQuantity || 0) + returnData.returnQuantity,
        updatedAt: Timestamp.now(),
      });
      
      // 6. Update maintenance record
      const remainingQuantity = maintenanceData.quantity - returnData.returnQuantity;
      const isFullReturn = remainingQuantity === 0;
      const hasWriteOffs = maintenanceData.writtenOffAt !== null;
      
      let newStatus = 'partial_return';
      if (isFullReturn) {
        newStatus = hasWriteOffs ? 'partially_returned_and_written_off' : 'returned';
      }

      const noteSuffix = returnData.repairSummary?.trim()
        ? ` ${returnData.repairSummary}`
        : '';
      transaction.update(maintenanceRef, {
        quantity: remainingQuantity,
        status: newStatus,
        returnedAt: Timestamp.now(),
        returnedQuantity: (maintenanceData.returnedQuantity || 0) + returnData.returnQuantity,
        repairSummary: returnData.repairSummary?.trim() || null,
        repairCost: returnData.repairCost ?? null,
        repairedBy: returnData.repairedBy || null,
        updatedAt: Timestamp.now(),
        updates: [
          ...maintenanceData.updates,
          {
            note: `Returned ${returnData.returnQuantity} items to central store.${noteSuffix}`,
            addedBy: userId,
            addedByName: userName,
            addedAt: Timestamp.now(),
          },
        ],
      });
    });
    
    console.log('✅ Returned from maintenance:', maintenanceId);
  } catch (error: any) {
    console.error('❌ Error returning from maintenance:', error);
    throw new Error(error.message || 'Failed to return items from maintenance');
  }
}

/**
 * Write off item - Permanent removal from inventory
 * 
 * Permanently removes items from the inventory system. This action cannot be undone.
 * Supports partial write-offs (can write off less than total quantity in maintenance).
 * 
 * This operation performs the following steps atomically:
 * 1. Validates maintenance record exists
 * 2. Validates write-off quantity doesn't exceed maintenance quantity
 * 3. PERMANENTLY reduces item's totalQuantity
 * 4. Updates item's inMaintenanceQuantity (decrease)
 * 5. Updates maintenance record with write-off details
 * 6. If full write-off (quantity becomes 0), marks status as 'written_off'
 * 7. Adds update note to maintenance history
 * 
 * @param maintenanceId - ID of maintenance record
 * @param writeOffData - Write-off details including quantity and reason
 * @param userId - ID of user processing the write-off
 * @param userName - Display name of user processing the write-off
 * @throws Error if maintenance not found or write-off quantity exceeds maintenance quantity
 */
export async function writeOffItem(
  maintenanceId: string,
  writeOffData: WriteOffData,
  userId: string,
  userName: string
): Promise<void> {
  try {
    if (!Number.isInteger(writeOffData.writeOffQuantity) || writeOffData.writeOffQuantity <= 0) {
      throw new Error('Write-off quantity must be a whole number greater than zero');
    }
    await runTransaction(db, async (transaction) => {
      // 1. Read maintenance record
      const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
      const maintenanceSnap = await transaction.get(maintenanceRef);
      
      if (!maintenanceSnap.exists()) {
        throw new Error('Maintenance record not found');
      }
      
      const maintenanceData = maintenanceSnap.data() as MaintenanceFirestore;
      
      // Validate quantity
      if (writeOffData.writeOffQuantity > maintenanceData.quantity) {
        throw new Error(
          `Write-off quantity (${writeOffData.writeOffQuantity}) exceeds maintenance quantity (${maintenanceData.quantity})`
        );
      }
      
      // 2. Read item document
      const itemRef = doc(db, ITEMS_COLLECTION, maintenanceData.itemId);
      const itemSnap = await transaction.get(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      
      // 3. Update item (PERMANENT reduction in total quantity)
      const currentInMaintenance = itemData.inMaintenanceQuantity || 0;
      const currentTotal = itemData.totalQuantity || 0;
      
      transaction.update(itemRef, {
        totalQuantity: Math.max(0, currentTotal - writeOffData.writeOffQuantity),
        inMaintenanceQuantity: Math.max(0, currentInMaintenance - writeOffData.writeOffQuantity),
        updatedAt: Timestamp.now(),
      });
      
      // 4. Update maintenance record
      const remainingQuantity = maintenanceData.quantity - writeOffData.writeOffQuantity;
      const isFullWriteOff = remainingQuantity === 0;
      const hasReturns = (maintenanceData.returnedQuantity || 0) > 0;
      
      let newStatus = 'partial_return';
      if (isFullWriteOff) {
        newStatus = hasReturns ? 'partially_returned_and_written_off' : 'written_off';
      }

      const explanationText = writeOffData.explanation?.trim() || null;
      const priorWrittenOff = maintenanceData.writtenOffUnitsTotal ?? 0;
      transaction.update(maintenanceRef, {
        quantity: remainingQuantity,
        status: newStatus,
        writtenOffAt: Timestamp.now(),
        writeOffReason: writeOffData.reason,
        writeOffExplanation: explanationText,
        writtenOffUnitsTotal: priorWrittenOff + writeOffData.writeOffQuantity,
        updatedAt: Timestamp.now(),
        updates: [
          ...maintenanceData.updates,
          {
            note: `Written off ${writeOffData.writeOffQuantity} items. Reason: ${writeOffData.reason}.${explanationText ? ` ${explanationText}` : ''}`,
            addedBy: userId,
            addedByName: userName,
            addedAt: Timestamp.now(),
          },
        ],
      });
    });
    
    console.log('✅ Written off item:', maintenanceId);
  } catch (error: any) {
    console.error('❌ Error writing off item:', error);
    throw new Error(error.message || 'Failed to write off item');
  }
}

/**
 * Add status update note
 * 
 * Adds a note to the maintenance record's update history
 * Useful for tracking progress, issues, or other relevant information
 * 
 * @param maintenanceId - ID of maintenance record
 * @param note - Update note text
 * @param userId - ID of user adding the note
 * @param userName - Display name of user adding the note
 * @throws Error if maintenance record not found or update fails
 */
export async function addMaintenanceUpdate(
  maintenanceId: string,
  note: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
    const maintenanceSnap = await getDoc(maintenanceRef);
    
    if (!maintenanceSnap.exists()) {
      throw new Error('Maintenance record not found');
    }
    
    const maintenanceData = maintenanceSnap.data() as MaintenanceFirestore;
    
    await updateDoc(maintenanceRef, {
      updates: [
        ...maintenanceData.updates,
        {
          note,
          addedBy: userId,
          addedByName: userName,
          addedAt: Timestamp.now(),
        },
      ],
      updatedAt: Timestamp.now(),
    });
    
    console.log('✅ Added maintenance update:', maintenanceId);
  } catch (error: any) {
    console.error('❌ Error adding maintenance update:', error);
    throw new Error(error.message || 'Failed to add maintenance update');
  }
}

/**
 * Update maintenance record photos
 *
 * Replaces the photos array on an existing maintenance record.
 * Used after creating a record and uploading images to Storage.
 *
 * @param maintenanceId - ID of maintenance record
 * @param photos - Array of MaintenancePhoto metadata (url, fileName, uploadedAt)
 * @throws Error if maintenance record not found or update fails
 */
export async function updateMaintenancePhotos(
  maintenanceId: string,
  photos: MaintenancePhoto[]
): Promise<void> {
  try {
    const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
    const maintenanceSnap = await getDoc(maintenanceRef);

    if (!maintenanceSnap.exists()) {
      throw new Error('Maintenance record not found');
    }

    await updateDoc(maintenanceRef, {
      photos,
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Updated maintenance photos:', maintenanceId);
  } catch (error: any) {
    console.error('❌ Error updating maintenance photos:', error);
    throw new Error(error.message || 'Failed to update maintenance photos');
  }
}

/**
 * List maintenance records with optional filters
 * 
 * Retrieves maintenance records from Firestore with optional status and item filters.
 * Results are ordered by addedAt date (newest first).
 * 
 * @param filters - Optional filters for status and itemId
 * @param filters.status - Filter by maintenance status ('all' returns all statuses)
 * @param filters.itemId - Filter by specific item ID
 * @returns Promise resolving to array of maintenance records
 */
export async function listMaintenance(filters?: {
  status?: MaintenanceStatus | 'all';
  itemId?: string;
}): Promise<Maintenance[]> {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }
    
    if (filters?.itemId) {
      constraints.push(where('itemId', '==', filters.itemId));
    }
    
    constraints.push(orderBy('addedAt', 'desc'));
    
    const q = query(collection(db, MAINTENANCE_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(firestoreToMaintenance);
  } catch (error: any) {
    console.error('❌ Error listing maintenance:', error);
    return [];
  }
}

/**
 * Get single maintenance record
 * 
 * Retrieves a single maintenance record by ID
 * 
 * @param id - Maintenance record ID
 * @returns Promise resolving to maintenance record or null if not found
 */
export async function getMaintenanceById(id: string): Promise<Maintenance | null> {
  try {
    const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, id);
    const maintenanceSnap = await getDoc(maintenanceRef);
    
    if (!maintenanceSnap.exists()) {
      return null;
    }
    
    return firestoreToMaintenance(maintenanceSnap);
  } catch (error: any) {
    console.error('❌ Error getting maintenance by ID:', error);
    return null;
  }
}

/**
 * Real-time subscription to a single maintenance record
 *
 * Listens for changes to one maintenance document. Use on the detail screen
 * so the UI updates when the record is updated (e.g. status, return, write-off).
 *
 * @param maintenanceId - Document ID
 * @param callback - Called with the current record or null if not found / error
 * @returns Unsubscribe function
 */
export function subscribeToMaintenanceById(
  maintenanceId: string,
  callback: (record: Maintenance | null) => void
): () => void {
  try {
    const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
    const unsubscribe = onSnapshot(
      maintenanceRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        callback(firestoreToMaintenance(snapshot));
      },
      (error) => {
        console.error('❌ Maintenance document subscription error:', error);
        callback(null);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up maintenance document subscription:', error);
    return () => {};
  }
}

/**
 * Real-time subscription to maintenance records
 * 
 * Sets up a real-time listener for maintenance records matching the provided filters.
 * The callback function is called immediately with current data and whenever data changes.
 * 
 * IMPORTANT: Always call the returned unsubscribe function when component unmounts
 * to prevent memory leaks.
 * 
 * Example usage in React component:
 * ```typescript
 * useEffect(() => {
 *   const unsubscribe = subscribeToMaintenance((records) => {
 *     setMaintenanceRecords(records);
 *   });
 *   return unsubscribe; // Cleanup on unmount
 * }, []);
 * ```
 * 
 * @param callback - Function called with updated maintenance records
 * @param filters - Optional filters for status and itemId
 * @param filters.status - Filter by maintenance status ('all' returns all statuses)
 * @param filters.itemId - Filter by specific item ID
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToMaintenance(
  callback: (maintenanceRecords: Maintenance[]) => void,
  filters?: {
    status?: MaintenanceStatus | 'all';
    itemId?: string;
  }
): () => void {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }
    
    if (filters?.itemId) {
      constraints.push(where('itemId', '==', filters.itemId));
    }
    
    constraints.push(orderBy('addedAt', 'desc'));
    
    const q = query(collection(db, MAINTENANCE_COLLECTION), ...constraints);
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const maintenanceRecords = snapshot.docs.map(firestoreToMaintenance);
        callback(maintenanceRecords);
      },
      (error) => {
        console.error('❌ Maintenance subscription error:', error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up maintenance subscription:', error);
    return () => {};
  }
}
