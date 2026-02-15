import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  Request,
  CreateRequestData,
  EditRequestData,
  RejectRequestData,
  TransferRequestData,
  ReturnItemsData,
  ItemAvailability,
} from '../../types/request';

const REQUESTS_COLLECTION = 'requests';
const REQUEST_COUNTERS_COLLECTION = 'requestCounters';
const INVENTORY_COLLECTION = 'inventory';
const ITEMS_COLLECTION = 'items';

/**
 * Generate unique request number using a counter document.
 * Format: REQ-YYYY-NNNN
 * Uses requestCounters collection so Site Managers can increment without
 * needing to query all requests (which would require broader read permissions).
 */
const generateRequestNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  const counterDocId = `year_${year}`;

  try {
    const result = await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, REQUEST_COUNTERS_COLLECTION, counterDocId);
      const counterSnap = await transaction.get(counterRef);

      const lastNumber = counterSnap.exists()
        ? (counterSnap.data()?.lastNumber ?? 0)
        : 0;
      const nextNumber = lastNumber + 1;

      transaction.set(counterRef, {
        year,
        lastNumber: nextNumber,
        updatedAt: serverTimestamp(),
      });

      return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    });

    return result;
  } catch (error) {
    console.error('Error generating request number:', error);
    // Fallback: timestamp-based (unique per millisecond)
    return `${prefix}${Date.now()}`;
  }
};

/**
 * Create a new request
 */
export const createRequest = async (
  requestData: CreateRequestData,
  userId: string,
  userName: string,
  isDraft: boolean = false
): Promise<string> => {
  try {
    const requestNumber = await generateRequestNumber();
    
    const newRequest = {
      requestNumber,
      siteId: requestData.siteId,
      siteName: requestData.siteName,
      requestedBy: userId,
      requestedByName: userName,
      
      status: isDraft ? 'draft' : 'pending',
      priority: requestData.priority,
      purpose: requestData.purpose ?? '',
      
      items: requestData.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        itemType: item.itemType,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        imageUrl: item.imageUrl || null,
        quantityRequested: item.quantity,
        quantityApproved: item.quantity,
        quantityReturned: 0,
        status: 'pending',
        weightPerMeter: item.weightPerMeter,
        lengthPerPiece: item.lengthPerPiece,
      })),
      
      processedBy: null,
      processedByName: null,
      processedAt: null,
      storeNotes: null,
      rejectionReason: null,
      rejectionComments: null,
      
      transferredAt: null,
      transferredBy: null,
      transferredByName: null,
      receivedBy: null,
      receivedByName: null,
      
      returnHistory: null,
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), newRequest);
    return docRef.id;
  } catch (error) {
    console.error('Error creating request:', error);
    throw new Error('Failed to create request. Please try again.');
  }
};

/**
 * Check availability of items in central store
 */
export const checkItemsAvailability = async (
  items: Array<{ itemId: string; itemName: string; quantityRequested: number }>
): Promise<ItemAvailability[]> => {
  try {
    const availabilityChecks = await Promise.all(
      items.map(async (item) => {
        const inventoryQuery = query(
          collection(db, INVENTORY_COLLECTION),
          where('itemId', '==', item.itemId),
          where('locationId', '==', 'store'),
          limit(1)
        );
        const inventorySnapshot = await getDocs(inventoryQuery);
        const available = inventorySnapshot.empty 
          ? 0 
          : inventorySnapshot.docs[0].data()?.quantity || 0;
        
        return {
          itemId: item.itemId,
          itemName: item.itemName,
          requested: item.quantityRequested,
          available,
          sufficient: available >= item.quantityRequested,
        };
      })
    );
    
    return availabilityChecks;
  } catch (error) {
    console.error('Error checking items availability:', error);
    throw new Error('Failed to check item availability');
  }
};

/**
 * Update an existing request
 * IMPORTANT: Only Site Manager can edit, and only their own DRAFT requests.
 * Store Incharge cannot edit requests—they can only approve or reject.
 */
export const editRequest = async (
  requestId: string,
  updates: EditRequestData,
  editedBy: string,
  editedByName: string
): Promise<void> => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const currentData = requestSnap.data();
    
    // Enforce: Only request owner can edit, and only when status is draft
    if (currentData.requestedBy !== editedBy) {
      throw new Error('Only the request creator can edit this request');
    }
    if (currentData.status !== 'draft') {
      throw new Error('Only draft requests can be edited. Submitted requests cannot be modified.');
    }
    
    // Update request
    await updateDoc(requestRef, {
      ...(updates.priority && { priority: updates.priority }),
      ...(updates.purpose && { purpose: updates.purpose }),
      ...(updates.items && { items: updates.items }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error editing request:', error);
    throw error;
  }
};

/**
 * Submit a draft request (convert draft → pending)
 * Only the request creator can submit their own draft.
 */
export const submitDraftRequest = async (
  requestId: string,
  userId: string
): Promise<void> => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const currentData = requestSnap.data();
    
    // Enforce: Only request owner can submit
    if (currentData.requestedBy !== userId) {
      throw new Error('Only the request creator can submit this request');
    }
    
    // Enforce: Only drafts can be submitted
    if (currentData.status !== 'draft') {
      throw new Error('Only draft requests can be submitted');
    }
    
    // Update status to pending
    await updateDoc(requestRef, {
      status: 'pending',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error submitting draft:', error);
    throw error;
  }
};

/**
 * Approve a request (reserves items)
 */
export const approveRequest = async (
  requestId: string,
  processedBy: string,
  processedByName: string,
  storeNotes?: string
): Promise<void> => {
  try {
    // First check availability
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    const items = Array.isArray(requestData?.items) ? requestData.items : [];
    const availability = await checkItemsAvailability(
      items.map((item: { itemId: string; itemName: string; quantityRequested: number }) => ({
        itemId: item.itemId,
        itemName: item.itemName ?? item.itemId,
        quantityRequested: item.quantityRequested ?? 0,
      }))
    );

    // Ensure all items sufficient
    const allSufficient = Array.isArray(availability) && availability.every((item) => item.sufficient);
    if (!allSufficient) {
      throw new Error('Cannot approve: insufficient stock for some items');
    }
    
    // Update status
    await updateDoc(requestRef, {
      status: 'approved',
      processedBy,
      processedByName,
      processedAt: serverTimestamp(),
      storeNotes: storeNotes || null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error approving request:', error);
    throw error;
  }
};

/**
 * Reject a request
 */
export const rejectRequest = async (
  requestId: string,
  rejectionData: RejectRequestData,
  processedBy: string,
  processedByName: string
): Promise<void> => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    
    await updateDoc(requestRef, {
      status: 'rejected',
      processedBy,
      processedByName,
      processedAt: serverTimestamp(),
      rejectionReason: rejectionData.reason,
      rejectionComments: rejectionData.comments,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    throw new Error('Failed to reject request. Please try again.');
  }
};

const MAX_TRANSFER_RETRIES = 3;

/**
 * Transfer request items (atomic inventory update)
 * Uses retry logic for transient failures (network, etc.)
 */
export const transferRequest = async (
  requestId: string,
  transferData: TransferRequestData,
  transferredBy: string,
  transferredByName: string
): Promise<void> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_TRANSFER_RETRIES; attempt++) {
    try {
      // Step 1: Fetch request data first (outside transaction)
      const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Request not found');
      }

      const requestData = requestSnap.data();

      if (requestData.status !== 'approved') {
        throw new Error('Only approved requests can be transferred');
      }

      const items = Array.isArray(requestData?.items) ? requestData.items : [];
      if (items.length === 0) {
        throw new Error('Request has no items to transfer');
      }

      // Step 2: Query all inventory documents we'll need (outside transaction)
      const inventoryRefs: Map<string, { storeRef: any; siteRef: any }> = new Map();

      for (const item of items) {
        // Query central store inventory
        const centralStoreQuery = query(
          collection(db, INVENTORY_COLLECTION),
          where('itemId', '==', item.itemId),
          where('locationId', '==', 'store'),
          limit(1)
        );
        const centralStoreSnap = await getDocs(centralStoreQuery);
        const storeRef = centralStoreSnap.empty ? null : centralStoreSnap.docs[0].ref;

        // Query site inventory
        const siteLocationId = `site_${requestData.siteId}`;
        const siteInventoryQuery = query(
          collection(db, INVENTORY_COLLECTION),
          where('itemId', '==', item.itemId),
          where('locationId', '==', siteLocationId),
          limit(1)
        );
        const siteInventorySnap = await getDocs(siteInventoryQuery);
        const siteRef = siteInventorySnap.empty ? null : siteInventorySnap.docs[0].ref;

        inventoryRefs.set(item.itemId, { storeRef, siteRef });
      }
    
    // Step 3: Run transaction with the document references we found
    await runTransaction(db, async (transaction) => {
      // =====================================================
      // PHASE 1: ALL READS (must complete before any writes)
      // =====================================================
      
      // Re-read request inside transaction to ensure consistency
      const requestSnap = await transaction.get(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Request not found');
      }
      
      const requestData = requestSnap.data();
      
      if (requestData.status !== 'approved') {
        throw new Error('Only approved requests can be transferred');
      }
      
      // Prepare array to collect all read data
      interface TransactionReadData {
        item: any;
        quantity: number;
        itemRef: any;
        itemData: any;
        refs: { storeRef: any; siteRef: any };
        storeDoc: any;
        siteDoc: any;
      }
      const readsData: TransactionReadData[] = [];
      
      // Read all documents upfront
      for (const item of requestData.items) {
        const quantity = item.quantityApproved;

        const refs = inventoryRefs.get(item.itemId);
        if (!refs) continue;
        
        // Read item document (for denormalized totals)
        const itemRef = doc(db, ITEMS_COLLECTION, item.itemId);
        const itemSnap = await transaction.get(itemRef);
        const itemData = itemSnap.exists() ? itemSnap.data() : null;
        
        // Read central store inventory
        let storeDoc = null;
        if (refs.storeRef) {
          storeDoc = await transaction.get(refs.storeRef);
        }
        
        // Read site inventory
        let siteDoc = null;
        if (refs.siteRef) {
          siteDoc = await transaction.get(refs.siteRef);
        }
        
        // Store all read data for this item
        readsData.push({
          item,
          quantity,
          itemRef,
          itemData,
          refs,
          storeDoc,
          siteDoc,
        });
      }
      
      // =====================================================
      // PHASE 2: ALL WRITES (after all reads are complete)
      // =====================================================
      
      // Process all writes based on the read data
      for (const data of readsData) {
        const { item, quantity, itemRef, itemData, refs, storeDoc, siteDoc } = data;
        
        // Decrement central store
        if (storeDoc && storeDoc.exists()) {
          const currentQty = storeDoc.data().quantity;
          transaction.update(refs.storeRef, {
            quantity: currentQty - quantity,
            updatedAt: serverTimestamp(),
          });
        }
        
        // Increment or create site inventory
        if (siteDoc && siteDoc.exists()) {
          const currentQty = siteDoc.data().quantity;
          transaction.update(refs.siteRef, {
            quantity: currentQty + quantity,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Create new inventory entry - copy lengthPerPiece from central store if present
          const siteLocationId = `site_${requestData.siteId}`;
          const newInventoryRef = doc(collection(db, INVENTORY_COLLECTION));
          const storeLengthPerPiece = storeDoc?.exists() ? storeDoc.data().lengthPerPiece : undefined;
          const lengthToUse = storeLengthPerPiece ?? item.lengthPerPiece;
          const newEntry: Record<string, unknown> = {
            itemId: item.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            locationId: siteLocationId,
            locationType: 'site',
            locationName: requestData.siteName,
            quantity: quantity,
            updatedAt: serverTimestamp(),
          };
          if (lengthToUse != null) newEntry.lengthPerPiece = lengthToUse;
          transaction.set(newInventoryRef, newEntry);
        }

        // Update item's denormalized stock totals
        if (itemData) {
          transaction.update(itemRef, {
            centralStoreQuantity: (itemData.centralStoreQuantity || 0) - quantity,
            atSitesQuantity: (itemData.atSitesQuantity || 0) + quantity,
            updatedAt: serverTimestamp(),
          });
        }
      }
      
      // Update item statuses in request
      const updatedItems = requestData.items.map((item: any) => ({
        ...item,
        status: 'transferred',
      }));
      
      // Update request status
      transaction.update(requestRef, {
        items: updatedItems,
        status: 'transferred',
        transferredAt: serverTimestamp(),
        transferredBy,
        transferredByName,
        receivedBy: transferData.receivedBy,
        receivedByName: transferData.receivedByName,
        updatedAt: serverTimestamp(),
      });
    });
      return;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: string })?.code ?? '';
      const isRetryable =
        errorCode === 'unavailable' ||
        errorCode === 'resource-exhausted' ||
        errorCode === 'aborted' ||
        errorCode === 'deadline-exceeded' ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('timeout');

      if (isRetryable && attempt < MAX_TRANSFER_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.warn(
          `transferRequest attempt ${attempt}/${MAX_TRANSFER_RETRIES} failed, retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('Error transferring request:', error);
        throw new Error('Failed to complete transfer. Please try again.');
      }
    }
  }
  console.error('Error transferring request:', lastError);
  throw new Error('Failed to complete transfer. Please try again.');
};

/**
 * Generate unique return event ID
 */
const generateReturnId = (): string =>
  `ret_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/**
 * Return items from site to central store
 * Supports partial returns: status becomes 'partially_returned' until all
 * non-consumable items are fully returned, then 'returned'.
 * ALL returns go to central store first, regardless of condition.
 *
 * Uses writeBatch() + increment() instead of runTransaction() because the
 * Firestore REST transport (used by React Native) has a known issue where
 * transaction.get() inside runTransaction() can read stale cached document
 * versions, producing incorrect `currentDocument.updateTime` preconditions
 * that Firestore rejects as "permission-denied".
 *
 * writeBatch() avoids this because:
 *  - batch.update() only checks document existence (no updateTime precondition)
 *  - increment() applies quantity deltas atomically on the server, so even
 *    concurrent returns calculate correct totals without needing a read-inside-tx
 */
export const returnItems = async (
  requestId: string,
  returnData: ReturnItemsData,
  userId: string,
  userName: string
): Promise<void> => {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await returnItemsBatch(requestId, returnData, userId, userName);
      return; // Success!
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code ?? '';

      // Only retry for transient / network errors
      const isRetryable =
        errorCode === 'unavailable' ||
        errorCode === 'resource-exhausted' ||
        errorCode === 'aborted' ||
        errorCode === 'deadline-exceeded' ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout');

      if (isRetryable && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.warn(
          `Return batch attempt ${attempt}/${maxRetries} failed ` +
          `(code: ${errorCode || 'none'}, msg: ${errorMessage}). ` +
          `Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable, or final attempt exhausted
      throw error;
    }
  }
};

/**
 * Internal: Execute return items as an atomic batch write.
 *
 * Flow:
 *  1. Fresh-read request from server (getDocFromServer) → validate status & quantities
 *  2. Query inventory docs (getDocs goes to server for queries) → get document refs
 *  3. Build a writeBatch with:
 *       - increment() for inventory & item quantity fields (atomic, no read needed)
 *       - Full replacement for request.items / returnHistory / status
 *  4. batch.commit() → all writes succeed or all fail, no updateTime preconditions
 */
const returnItemsBatch = async (
  requestId: string,
  returnData: ReturnItemsData,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    // ─── Step 1: Fresh-read request from Firestore server ───
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDocFromServer(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestSnap.data();

    // Allow returns when transferred or partially_returned
    if (requestData.status !== 'transferred' && requestData.status !== 'partially_returned') {
      throw new Error('Only transferred or partially returned requests can have items returned');
    }

    // Validate quantities: each return must not exceed remaining
    for (const returnItem of returnData.items) {
      const item = requestData.items.find((i: any) => i.itemId === returnItem.itemId);
      if (!item || item.itemType === 'consumable') continue;
      const currentReturned = item.quantityReturned ?? 0;
      const remaining = item.quantityApproved - currentReturned;
      if (returnItem.quantityReturned > remaining || returnItem.quantityReturned < 1) {
        throw new Error(
          `Invalid quantity for ${item.itemName}: cannot return ${returnItem.quantityReturned}, remaining is ${remaining}`
        );
      }
    }

    // ─── Step 2: Query inventory document refs ───
    // getDocs() always fetches from the server for queries, so data is fresh.
    const inventoryRefs: Map<string, { siteRef: any; storeRef: any; hasStore: boolean }> = new Map();

    for (const returnItem of returnData.items) {
      const item = requestData.items.find((i: any) => i.itemId === returnItem.itemId);
      if (!item || item.itemType === 'consumable') continue;

      // Site inventory
      const siteLocationId = `site_${requestData.siteId}`;
      const siteInventoryQuery = query(
        collection(db, INVENTORY_COLLECTION),
        where('itemId', '==', returnItem.itemId),
        where('locationId', '==', siteLocationId),
        limit(1)
      );
      const siteSnap = await getDocs(siteInventoryQuery);
      const siteRef = siteSnap.empty ? null : siteSnap.docs[0].ref;

      // Central store inventory
      const storeInventoryQuery = query(
        collection(db, INVENTORY_COLLECTION),
        where('itemId', '==', returnItem.itemId),
        where('locationId', '==', 'store'),
        limit(1)
      );
      const storeSnap = await getDocs(storeInventoryQuery);
      const storeRef = storeSnap.empty ? null : storeSnap.docs[0].ref;

      inventoryRefs.set(returnItem.itemId, {
        siteRef,
        storeRef,
        hasStore: !storeSnap.empty,
      });
    }

    // ─── Step 3: Build atomic batch write ───
    const batch = writeBatch(db);

    for (const returnItem of returnData.items) {
      const item = requestData.items.find((i: any) => i.itemId === returnItem.itemId);
      if (!item || item.itemType === 'consumable') continue;

      const refs = inventoryRefs.get(returnItem.itemId);
      if (!refs) continue;

      // Decrement site inventory (increment is atomic on the server)
      if (refs.siteRef) {
        batch.update(refs.siteRef, {
          quantity: increment(-returnItem.quantityReturned),
          updatedAt: serverTimestamp(),
        });
      }

      // Increment or create central store inventory
      if (refs.hasStore && refs.storeRef) {
        batch.update(refs.storeRef, {
          quantity: increment(returnItem.quantityReturned),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Store entry doesn't exist yet – create it
        const newInventoryRef = doc(collection(db, INVENTORY_COLLECTION));
        batch.set(newInventoryRef, {
          itemId: returnItem.itemId,
          itemName: item.itemName,
          itemSku: item.itemSku,
          locationId: 'store',
          locationType: 'store',
          locationName: 'Central Store',
          quantity: returnItem.quantityReturned,
          updatedAt: serverTimestamp(),
        });
      }

      // Update item's denormalized stock totals (atomic increments)
      const itemRef = doc(db, ITEMS_COLLECTION, returnItem.itemId);
      batch.update(itemRef, {
        centralStoreQuantity: increment(returnItem.quantityReturned),
        atSitesQuantity: increment(-returnItem.quantityReturned),
        updatedAt: serverTimestamp(),
      });
    }

    // ─── Build updated items array for the request document ───
    const currentItems = requestData.items as any[];
    const quantityReturnedMap = new Map<string, number>();
    for (const ri of returnData.items) {
      const item = currentItems.find((i: any) => i.itemId === ri.itemId);
      if (!item || item.itemType === 'consumable') continue;
      const prev = item.quantityReturned ?? 0;
      quantityReturnedMap.set(ri.itemId, prev + ri.quantityReturned);
    }

    const updatedItems = currentItems.map((item: any) => {
      const newQtyReturned = quantityReturnedMap.get(item.itemId) ?? item.quantityReturned ?? 0;
      const isFullyReturned = item.itemType === 'consumable' || newQtyReturned >= item.quantityApproved;
      return {
        ...item,
        quantityReturned: newQtyReturned,
        status: isFullyReturned ? 'returned' : 'partially_returned',
      };
    });

    // ─── Build new return history event ───
    const returnId = generateReturnId();
    const newReturnEvent = {
      returnId,
      returnedAt: Timestamp.now(),
      returnedBy: userId,
      returnedByName: userName,
      items: returnData.items.map((ri) => {
        const item = currentItems.find((i: any) => i.itemId === ri.itemId);
        const prevReturned = item?.quantityReturned ?? 0;
        return {
          itemId: ri.itemId,
          itemName: item?.itemName ?? ri.itemId,
          quantityReturned: ri.quantityReturned,
          condition: ri.condition,
          cumulativeReturned: prevReturned + ri.quantityReturned,
        };
      }),
      returnNotes: returnData.returnNotes || null,
    };

    const existingHistory = requestData.returnHistory ?? [];

    // ─── Determine new request status ───
    const allNonConsumables = updatedItems.filter((i: any) => i.itemType === 'non_consumable');
    const allFullyReturned =
      allNonConsumables.length === 0 ||
      allNonConsumables.every((i: any) => (i.quantityReturned ?? 0) >= i.quantityApproved);
    const newStatus = allFullyReturned ? 'returned' : 'partially_returned';

    // Update request document
    batch.update(requestRef, {
      items: updatedItems,
      status: newStatus,
      returnHistory: [...existingHistory, newReturnEvent],
      updatedAt: serverTimestamp(),
    });

    // ─── Commit all writes atomically ───
    await batch.commit();
  } catch (error) {
    console.error('Error in return items batch:', error);
    throw error;
  }
};

/**
 * Cancel a draft or pending request
 */
export const cancelRequest = async (requestId: string): Promise<void> => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    
    if (requestData.status !== 'draft' && requestData.status !== 'pending') {
      throw new Error('Only draft or pending requests can be cancelled');
    }
    
    await updateDoc(requestRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    throw new Error('Failed to cancel request. Please try again.');
  }
};

/**
 * Get single request by ID
 */
export const getRequestById = async (requestId: string): Promise<Request | null> => {
  try {
    const requestDoc = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
    
    if (!requestDoc.exists()) {
      return null;
    }
    
    return {
      id: requestDoc.id,
      ...requestDoc.data(),
    } as Request;
  } catch (error) {
    console.error('Error getting request:', error);
    throw new Error('Failed to fetch request');
  }
};

/**
 * Subscribe to requests (real-time)
 */
export const subscribeToRequests = (
  filters: {
    status?: string;
    siteId?: string;
    userId?: string; // For Site Manager's own requests
  },
  callback: (requests: Request[]) => void
): (() => void) => {
  try {
    let q = query(collection(db, REQUESTS_COLLECTION));
    
    // Apply filters
    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }
    
    if (filters.siteId && filters.siteId !== 'all') {
      q = query(q, where('siteId', '==', filters.siteId));
    }
    
    if (filters.userId) {
      q = query(q, where('requestedBy', '==', filters.userId));
    }
    
    // Order by created date
    q = query(q, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const byId = new Map<string, Request>();
        snapshot.forEach((doc) => {
          const r = { id: doc.id, ...doc.data() } as Request;
          if (!byId.has(r.id)) byId.set(r.id, r);
        });
        let requests = Array.from(byId.values());

        // Drafts: only visible to the site manager who created them.
        // When userId is provided (My Requests), show all including drafts.
        // When userId is NOT provided (Request Queue for Store Incharge/Admin), exclude drafts.
        if (!filters.userId) {
          requests = requests.filter((r) => r.status !== 'draft');
        }

        // Sort by priority (high → medium → low) and then by date
        const safeToMillis = (ts: unknown): number => {
          if (ts == null) return 0;
          const t = ts as { toMillis?: () => number; seconds?: number };
          if (typeof t.toMillis === 'function') return t.toMillis();
          if (typeof t.seconds === 'number') return t.seconds * 1000;
          return 0;
        };
        const sortedRequests = requests.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority];
          
          if (priorityCompare !== 0) {
            return priorityCompare;
          }
          
          // If same priority, sort by date (newest first).
          // Guard against legacy/null createdAt values from malformed documents.
          return safeToMillis(b.createdAt) - safeToMillis(a.createdAt);
        });
        
        callback(sortedRequests);
      },
      (error) => {
        console.error('Error in requests subscription:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up requests subscription:', error);
    return () => {};
  }
};

/**
 * Subscribe to a single request for real-time updates
 * @param onError - Optional callback when subscription fails (e.g. permission, network)
 */
export const subscribeToRequest = (
  requestId: string,
  callback: (request: Request | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);

    const unsubscribe = onSnapshot(
      requestRef,
      (doc) => {
        if (doc.exists()) {
          const request = { id: doc.id, ...doc.data() } as Request;
          callback(request);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error in single request subscription:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
        callback(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up single request subscription:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return () => {};
  }
};

export const requestService = {
  createRequest,
  checkItemsAvailability,
  editRequest,
  submitDraftRequest,
  approveRequest,
  rejectRequest,
  transferRequest,
  returnItems,
  cancelRequest,
  getRequestById,
  subscribeToRequests,
  subscribeToRequest,
};
