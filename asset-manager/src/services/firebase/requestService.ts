import {
  collection,
  doc,
  getDoc,
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
      
      returnedAt: null,
      returnItems: null,
      returnNotes: null,
      
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
    const availability = await checkItemsAvailability(
      requestData.items.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantityRequested: item.quantityRequested,
      }))
    );
    
    // Ensure all items sufficient
    const allSufficient = availability.every(item => item.sufficient);
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

/**
 * Transfer request items (atomic inventory update)
 */
export const transferRequest = async (
  requestId: string,
  transferData: TransferRequestData,
  transferredBy: string,
  transferredByName: string
): Promise<void> => {
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
    
    // Step 2: Query all inventory documents we'll need (outside transaction)
    const inventoryRefs: Map<string, { storeRef: any; siteRef: any }> = new Map();
    
    for (const item of requestData.items) {
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
          // Create new inventory entry
          const siteLocationId = `site_${requestData.siteId}`;
          const newInventoryRef = doc(collection(db, INVENTORY_COLLECTION));
          transaction.set(newInventoryRef, {
            itemId: item.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            locationId: siteLocationId,
            locationType: 'site',
            locationName: requestData.siteName,
            quantity: quantity,
            updatedAt: serverTimestamp(),
          });
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
  } catch (error) {
    console.error('Error transferring request:', error);
    throw new Error('Failed to complete transfer. Please try again.');
  }
};

/**
 * Return items from site to central store
 * ALL returns go to central store first, regardless of condition.
 * Store Incharge will verify condition and move to maintenance if needed.
 */
export const returnItems = async (
  requestId: string,
  returnData: ReturnItemsData,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    // Step 1: Fetch request data first (outside transaction)
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    
    // Step 2: Query all inventory documents we'll need (outside transaction)
    const inventoryRefs: Map<string, { siteRef: any; storeRef: any }> = new Map();
    
    for (const returnItem of returnData.items) {
      const item = requestData.items.find((i: any) => i.itemId === returnItem.itemId);
      if (!item || item.itemType === 'consumable') {
        continue; // Skip consumables
      }
      
      // Query site inventory
      const siteLocationId = `site_${requestData.siteId}`;
      const siteInventoryQuery = query(
        collection(db, INVENTORY_COLLECTION),
        where('itemId', '==', returnItem.itemId),
        where('locationId', '==', siteLocationId),
        limit(1)
      );
      const siteInventorySnap = await getDocs(siteInventoryQuery);
      const siteRef = siteInventorySnap.empty ? null : siteInventorySnap.docs[0].ref;
      
      // Query store inventory
      const targetInventoryQuery = query(
        collection(db, INVENTORY_COLLECTION),
        where('itemId', '==', returnItem.itemId),
        where('locationId', '==', 'store'),
        limit(1)
      );
      const targetInventorySnap = await getDocs(targetInventoryQuery);
      const storeRef = targetInventorySnap.empty ? null : targetInventorySnap.docs[0].ref;
      
      inventoryRefs.set(returnItem.itemId, { siteRef, storeRef });
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
      
      // Prepare array to collect all read data
      interface TransactionReadData {
        returnItem: any;
        item: any;
        itemRef: any;
        itemData: any;
        refs: { siteRef: any; storeRef: any };
        siteDoc: any;
        storeDoc: any;
      }
      const readsData: TransactionReadData[] = [];
      
      // Read all documents upfront
      for (const returnItem of returnData.items) {
        const item = requestData.items.find((i: any) => i.itemId === returnItem.itemId);
        if (!item || item.itemType === 'consumable') {
          continue; // Skip consumables
        }

        const refs = inventoryRefs.get(returnItem.itemId);
        if (!refs) continue;
        
        // Read item document (for denormalized totals)
        const itemRef = doc(db, ITEMS_COLLECTION, returnItem.itemId);
        const itemSnap = await transaction.get(itemRef);
        const itemData = itemSnap.exists() ? itemSnap.data() : null;
        
        // Read site inventory
        let siteDoc = null;
        if (refs.siteRef) {
          siteDoc = await transaction.get(refs.siteRef);
        }
        
        // Read store inventory
        let storeDoc = null;
        if (refs.storeRef) {
          storeDoc = await transaction.get(refs.storeRef);
        }
        
        // Store all read data for this item
        readsData.push({
          returnItem,
          item,
          itemRef,
          itemData,
          refs,
          siteDoc,
          storeDoc,
        });
      }
      
      // =====================================================
      // PHASE 2: ALL WRITES (after all reads are complete)
      // =====================================================
      
      // Process all writes based on the read data
      for (const data of readsData) {
        const { returnItem, item, itemRef, itemData, refs, siteDoc, storeDoc } = data;
        
        // Decrement site inventory
        if (siteDoc && siteDoc.exists()) {
          const currentQty = siteDoc.data().quantity;
          transaction.update(refs.siteRef, {
            quantity: currentQty - returnItem.quantityReturned,
            updatedAt: serverTimestamp(),
          });
        }
        
        // Increment or create store inventory
        if (storeDoc && storeDoc.exists()) {
          const currentQty = storeDoc.data().quantity;
          transaction.update(refs.storeRef, {
            quantity: currentQty + returnItem.quantityReturned,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Create new inventory entry at Central Store
          const newInventoryRef = doc(collection(db, INVENTORY_COLLECTION));
          transaction.set(newInventoryRef, {
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

        // Update item's denormalized stock totals
        if (itemData) {
          transaction.update(itemRef, {
            centralStoreQuantity: (itemData.centralStoreQuantity || 0) + returnItem.quantityReturned,
            atSitesQuantity: (itemData.atSitesQuantity || 0) - returnItem.quantityReturned,
            updatedAt: serverTimestamp(),
          });
        }
      }
      
      // Update request status
      transaction.update(requestRef, {
        status: 'returned',
        returnedAt: serverTimestamp(),
        returnItems: returnData.items,
        returnNotes: returnData.returnNotes || null,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error returning items:', error);
    throw new Error('Failed to return items. Please try again.');
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
 */
export const subscribeToRequest = (
  requestId: string,
  callback: (request: Request | null) => void
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
        callback(null);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up single request subscription:', error);
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
