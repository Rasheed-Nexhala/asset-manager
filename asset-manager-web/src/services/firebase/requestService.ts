import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
  Timestamp,
} from 'firebase/firestore';
import type { DocumentSnapshot, QueryConstraint } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import type {
  Request,
  RequestStatus,
  CreateRequestData,
  EditRequestData,
  RejectRequestData,
  TransferRequestData,
  ReturnItemsData,
  ItemAvailability,
} from '../../types/request';

const REQUESTS_COLLECTION = 'requests';

/** Queue list: all lifecycle states except drafts (avoids `!=` + orderBy quirks; max 10 for `in`). */
export const REQUEST_QUEUE_NON_DRAFT_STATUSES: RequestStatus[] = [
  'pending',
  'approved',
  'rejected',
  'transferred',
  'partially_returned',
  'returned',
  'cancelled',
];
const REQUEST_COUNTERS_COLLECTION = 'requestCounters';
const INVENTORY_COLLECTION = 'inventory';
const ITEMS_COLLECTION = 'items';

const getInventoryDocId = (itemId: string, locationId: string): string =>
  `${itemId}_${locationId}`;

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
 * Create a new request (standard or site_transfer)
 */
export const createRequest = async (
  requestData: CreateRequestData,
  userId: string,
  userName: string,
  isDraft: boolean = false
): Promise<string> => {
  try {
    const requestNumber = await generateRequestNumber();

    const isSiteTransfer = requestData.requestType === 'site_transfer';
    
    if (!requestData.items || requestData.items.length === 0) {
      throw new Error('Request must contain at least one item');
    }

    const itemIds = new Set<string>();
    for (const item of requestData.items) {
      if (itemIds.has(item.itemId)) {
        throw new Error(`Duplicate item found in request: ${item.itemName || item.itemId}`);
      }
      itemIds.add(item.itemId);

      if (typeof item.quantity !== 'number' || isNaN(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity for item: ${item.itemName || item.itemId}. Quantity must be a numeric value greater than 0.`);
      }
    }

    const newRequest: Record<string, unknown> = {
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
        ...(item.unit ? { unit: item.unit } : {}),
        itemType: item.itemType,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        imageUrl: item.imageUrl ?? null,
        quantityRequested: item.quantity,
        quantityApproved: item.quantity,
        quantityReturned: 0,
        status: 'pending',
        weightPerMeter: item.weightPerMeter ?? null,
        lengthPerPiece: item.lengthPerPiece ?? null,
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

    // Site transfer fields (only set when relevant to keep documents clean)
    if (isSiteTransfer) {
      newRequest.requestType = 'site_transfer';
      if (requestData.sourceSiteId) newRequest.sourceSiteId = requestData.sourceSiteId;
      if (requestData.sourceSiteName) newRequest.sourceSiteName = requestData.sourceSiteName;
    }
    
    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), newRequest);
    return docRef.id;
  } catch (error) {
    console.error('Error creating request:', error);
    throw new Error('Failed to create request. Please try again.');
  }
};

/**
 * Check availability of items at a given location.
 * Defaults to 'store' (central store) for standard requests.
 * For site_transfer requests, pass the source site's locationId (e.g. 'site_abc123').
 */
export const checkItemsAvailability = async (
  items: Array<{ itemId: string; itemName: string; quantityRequested: number }>,
  locationId: string = 'store'
): Promise<ItemAvailability[]> => {
  try {
    const availabilityChecks = await Promise.all(
      items.map(async (item) => {
        const inventoryDocRef = doc(
          db,
          INVENTORY_COLLECTION,
          getInventoryDocId(item.itemId, locationId)
        );
        const inventorySnapshot = await getDoc(inventoryDocRef);
        const available = inventorySnapshot.exists() 
          ? inventorySnapshot.data()?.quantity || 0 
          : 0;
        
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
export type PartialApproveSplitResult = {
  parentRequestId: string;
  remainderRequestId: string | null;
  remainderRequestNumber: string | null;
};

/**
 * Approve selected lines and optionally create a pending remainder request (callable).
 */
export const partialApproveAndSplitCallable = async (params: {
  parentRequestId: string;
  approvedLineItems: Array<{ itemId: string; quantityApproved: number }>;
  storeNotes?: string;
}): Promise<PartialApproveSplitResult> => {
  const fn = httpsCallable(functions, 'partialApproveAndSplit');
  const result = await fn({
    parentRequestId: params.parentRequestId,
    approvedLineItems: params.approvedLineItems,
    storeNotes: params.storeNotes,
  });
  return result.data as PartialApproveSplitResult;
};

export const approveRequest = async (
  requestId: string,
  processedBy: string,
  processedByName: string,
  storeNotes?: string,
  updatedItems?: Array<{ itemId: string; quantityApproved: number }>
): Promise<void> => {
  try {
    // First check availability
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    if (requestData.status !== 'pending') {
      throw new Error('Only pending requests can be approved');
    }

    let items = Array.isArray(requestData?.items) ? requestData.items : [];

    // Apply updated quantities if provided
    if (updatedItems && updatedItems.length > 0) {
      const updatedMap = new Map(updatedItems.map(i => [i.itemId, i.quantityApproved]));
      items = items.map(item => {
        const newQty = updatedMap.get(item.itemId);
        if (newQty !== undefined) {
          return { ...item, quantityApproved: newQty };
        }
        return item;
      });
    }

    // For site transfers, check availability at the SOURCE site, not the central store.
    const locationId =
      requestData.requestType === 'site_transfer' && requestData.sourceSiteId
        ? `site_${requestData.sourceSiteId}`
        : 'store';

    const availability = await checkItemsAvailability(
      items.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName ?? item.itemId,
        quantityRequested: item.quantityApproved ?? item.quantityRequested ?? 0,
      })),
      locationId
    );

    // Ensure all items sufficient
    const allSufficient = Array.isArray(availability) && availability.every((item) => item.sufficient);
    if (!allSufficient) {
      throw new Error('Cannot approve: insufficient stock for some items');
    }
    
    // Update status within transaction to prevent race conditions
    await runTransaction(db, async (transaction) => {
      const txSnap = await transaction.get(requestRef);
      if (!txSnap.exists()) {
        throw new Error('Request not found');
      }
      if (txSnap.data().status !== 'pending') {
        throw new Error('Only pending requests can be approved');
      }
      
      transaction.update(requestRef, {
        items,
        status: 'approved',
        processedBy,
        processedByName,
        processedAt: serverTimestamp(),
        storeNotes: storeNotes || null,
        updatedAt: serverTimestamp(),
      });
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
    
    await runTransaction(db, async (transaction) => {
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists()) {
        throw new Error('Request not found');
      }
      if (requestSnap.data().status !== 'pending') {
        throw new Error('Only pending requests can be rejected');
      }
      
      transaction.update(requestRef, {
        status: 'rejected',
        processedBy,
        processedByName,
        processedAt: serverTimestamp(),
        rejectionReason: rejectionData.reason,
        rejectionComments: rejectionData.comments || '',
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    throw new Error('Failed to reject request. Please try again.');
  }
};

const MAX_TRANSFER_RETRIES = 3;

/**
 * Thrown for business-rule violations inside transferRequest.
 * These are never transient — retrying would not help — so the retry
 * loop checks for this class and exits immediately without waiting.
 *
 * Example real-world analogy: if you ask a shopkeeper for an item and
 * they say "we don't stock that", waiting 1 second and asking again
 * won't change the answer. The shop needs to restock first.
 */
class TransferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferValidationError';
  }
}

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
        throw new TransferValidationError('Request not found');
      }

      const requestData = requestSnap.data();

      if (requestData.status !== 'approved') {
        throw new TransferValidationError('Only approved requests can be transferred');
      }

      const items = Array.isArray(requestData?.items) ? requestData.items : [];
      if (items.length === 0) {
        throw new TransferValidationError('Request has no items to transfer');
      }

      // Step 2: Build deterministic inventory refs (outside transaction).
      // For site_transfer: source = site_${sourceSiteId}, dest = site_${siteId}.
      // For standard: source = store, dest = site_${siteId}.
      const isSiteTransfer = requestData.requestType === 'site_transfer';
      const sourceLocationId = isSiteTransfer
        ? `site_${requestData.sourceSiteId}`
        : 'store';

      const inventoryRefs: Map<string, { storeRef: any; siteRef: any }> = new Map();

      for (const item of items) {
        const siteLocationId = `site_${requestData.siteId}`;
        const storeRef = doc(
          db,
          INVENTORY_COLLECTION,
          getInventoryDocId(item.itemId, sourceLocationId)
        );
        const siteRef = doc(
          db,
          INVENTORY_COLLECTION,
          getInventoryDocId(item.itemId, siteLocationId)
        );

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
        throw new TransferValidationError('Request not found');
      }
      
      const requestData = requestSnap.data();
      
      if (requestData.status !== 'approved') {
        throw new TransferValidationError('Only approved requests can be transferred');
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
        if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
          throw new TransferValidationError(`Invalid approved quantity for ${item.itemName}`);
        }

        const refs = inventoryRefs.get(item.itemId);
        if (!refs) continue;
        
        // Read item document (for denormalized totals)
        const itemRef = doc(db, ITEMS_COLLECTION, item.itemId);
        const itemSnap = await transaction.get(itemRef);
        const itemData = itemSnap.exists() ? itemSnap.data() : null;
        
        // Read central store inventory
        const storeDoc = await transaction.get(refs.storeRef);
        
        // Read site inventory
        const siteDoc = await transaction.get(refs.siteRef);
        
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
      
      // Whether this is a site-to-site transfer (read from the re-fetched request inside tx)
      const isSiteTransferTx = requestData.requestType === 'site_transfer';
      const sourceName = isSiteTransferTx
        ? requestData.sourceSiteName ?? 'Source Site'
        : 'Central Store';
      const sourceLocationIdInTx = isSiteTransferTx
        ? `site_${requestData.sourceSiteId}`
        : 'store';
      const sourceIsSiteLocation = sourceLocationIdInTx.startsWith('site_');

      // Process all writes based on the read data
      for (const data of readsData) {
        const { item, quantity, itemRef, itemData, refs, storeDoc, siteDoc } = data;
        
        // Decrement source location (central store OR source site for site_transfer)
        if (storeDoc && storeDoc.exists()) {
          const currentQty = storeDoc.data().quantity;
          if (currentQty < quantity) {
            throw new TransferValidationError(
              `Insufficient stock for "${item.itemName}" at ${sourceName}. Available: ${currentQty}, Required: ${quantity}`
            );
          }
          const newSourceQty = currentQty - quantity;
          if (sourceIsSiteLocation && newSourceQty === 0) {
            transaction.delete(refs.storeRef);
          } else {
            transaction.update(refs.storeRef, {
              quantity: newSourceQty,
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          throw new TransferValidationError(
            `Item "${item.itemName}" has no inventory record at "${sourceName}". ` +
            `Please run the inventory migration or add stock via an adjustment first.`
          );
        }
        
        // Increment or create destination site inventory
        if (siteDoc && siteDoc.exists()) {
          const currentQty = siteDoc.data().quantity;
          transaction.update(refs.siteRef, {
            quantity: currentQty + quantity,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Create new inventory entry - copy lengthPerPiece from source if present
          const siteLocationId = `site_${requestData.siteId}`;
          const sourceLengthPerPiece = storeDoc?.exists() ? storeDoc.data().lengthPerPiece : undefined;
          const lengthToUse = sourceLengthPerPiece ?? item.lengthPerPiece;
          const newEntry: Record<string, unknown> = {
            itemId: item.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            locationId: siteLocationId,
            locationType: 'site',
            locationName: requestData.siteName,
            quantity: quantity,
            itemType: item.itemType ?? itemData?.type,
            unit: item.unit ?? itemData?.unit,
            updatedAt: serverTimestamp(),
          };
          if (lengthToUse != null) newEntry.lengthPerPiece = lengthToUse;
          transaction.set(refs.siteRef, newEntry);
        }

        // Update item's denormalized stock totals.
        // Standard: store→site means centralStoreQty-- and atSitesQty++.
        // Site transfer: site→site means atSitesQty stays the same (items remain "at sites").
        if (itemData && !isSiteTransferTx) {
          if ((itemData.centralStoreQuantity || 0) < quantity) {
            throw new TransferValidationError(`Insufficient central store stock tracked on item document for ${item.itemName}`);
          }
          transaction.update(itemRef, {
            centralStoreQuantity: (itemData.centralStoreQuantity || 0) - quantity,
            atSitesQuantity: (itemData.atSitesQuantity || 0) + quantity,
            isLowStock: (itemData.centralStoreQuantity || 0) - quantity <= (itemData.minStockLevel || 0),
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

      // Domain/validation errors: retrying won't help — surface immediately.
      if (error instanceof TransferValidationError) {
        console.error('Transfer validation error:', error.message);
        throw error;
      }

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
 * Uses runTransaction to guarantee stock integrity.
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
 * Internal: Execute return items as an atomic transaction.
 *
 * Flow:
 *  1. Fresh-read request from server (getDocFromServer) → validate status
 *  2. Query inventory docs (getDocs goes to server for queries) → get document refs
 *  3. Run transaction:
 *       - Re-read request and validate quantities
 *       - Read all item and inventory documents
 *       - Update all quantities atomically
 *       - Update request document
 */
const returnItemsBatch = async (
  requestId: string,
  returnData: ReturnItemsData,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    if (!returnData.items || returnData.items.length === 0) {
      throw new Error('Return must contain at least one item');
    }

    const returnItemIds = new Set<string>();
    for (const item of returnData.items) {
      if (returnItemIds.has(item.itemId)) {
        throw new Error(`Duplicate item found in return: ${item.itemId}`);
      }
      returnItemIds.add(item.itemId);

      if (typeof item.quantityReturned !== 'number' || isNaN(item.quantityReturned) || item.quantityReturned <= 0) {
        throw new Error(`Invalid return quantity for item: ${item.itemId}. Quantity must be a numeric value greater than 0.`);
      }
    }

    // ─── Step 1: Fresh-read request from Firestore server ───
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnapOuter = await getDocFromServer(requestRef);

    if (!requestSnapOuter.exists()) {
      throw new Error('Request not found');
    }

    const requestDataOuter = requestSnapOuter.data();

    // Allow returns when transferred or partially_returned
    if (requestDataOuter.status !== 'transferred' && requestDataOuter.status !== 'partially_returned') {
      throw new Error('Only transferred or partially returned requests can have items returned');
    }

    // ─── Step 2: Build deterministic inventory refs ───
    const inventoryRefs: Map<string, { siteRef: any; storeRef: any }> = new Map();

    for (const returnItem of returnData.items) {
      const item = requestDataOuter.items.find((i: any) => i.itemId === returnItem.itemId);
      if (!item || item.itemType === 'consumable' || item.itemType === 'fuel') continue;

      const siteLocationId = `site_${requestDataOuter.siteId}`;
      const siteRef = doc(
        db,
        INVENTORY_COLLECTION,
        getInventoryDocId(returnItem.itemId, siteLocationId)
      );
      const storeRef = doc(
        db,
        INVENTORY_COLLECTION,
        getInventoryDocId(returnItem.itemId, 'store')
      );

      inventoryRefs.set(returnItem.itemId, {
        siteRef,
        storeRef,
      });
    }

    // ─── Step 3: Run Atomic Transaction ───
    await runTransaction(db, async (transaction) => {
      // 1. Re-read request
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists()) {
        throw new Error('Request not found');
      }
      const requestData = requestSnap.data();

      if (requestData.status !== 'transferred' && requestData.status !== 'partially_returned') {
        throw new Error('Only transferred or partially returned requests can have items returned');
      }

      for (const returnItem of returnData.items) {
        const item = requestData.items.find((i: any) => i.itemId === returnItem.itemId);
        if (!item || item.itemType === 'consumable' || item.itemType === 'fuel') continue;
        if (typeof returnItem.quantityReturned !== 'number' || isNaN(returnItem.quantityReturned) || returnItem.quantityReturned <= 0) {
          throw new Error(`Invalid return quantity for ${item.itemName}`);
        }
        const currentReturned = item.quantityReturned ?? 0;
        /**
         * Items currently in a supervisor's custody can't be returned to central store;
         * they must first be handed back (this decrements `supervisorOutstandingQty`).
         */
        const withSupervisors = item.supervisorOutstandingQty ?? 0;
        const remaining = item.quantityApproved - currentReturned - withSupervisors;
        if (returnItem.quantityReturned > remaining || returnItem.quantityReturned <= 0) {
          const suffix =
            withSupervisors > 0
              ? ` (${withSupervisors} still with supervisors — collect back first)`
              : '';
          throw new Error(
            `Invalid quantity for ${item.itemName}: cannot return ${returnItem.quantityReturned}, remaining is ${remaining}${suffix}`
          );
        }
      }

      // 2. Read all item and inventory documents
      const readsData: any[] = [];

      for (const returnItem of returnData.items) {
        const item = requestData.items.find((i: any) => i.itemId === returnItem.itemId);
        if (!item || item.itemType === 'consumable' || item.itemType === 'fuel') continue;

        const refs = inventoryRefs.get(returnItem.itemId);
        if (!refs) continue;

        // Read item doc
        const itemRef = doc(db, ITEMS_COLLECTION, returnItem.itemId);
        const itemSnap = await transaction.get(itemRef);

        const siteDoc = await transaction.get(refs.siteRef);
        const storeDoc = await transaction.get(refs.storeRef);

        readsData.push({
          returnItem,
          item,
          refs,
          itemRef,
          itemData: itemSnap.exists() ? itemSnap.data() : null,
          siteDoc,
          storeDoc,
        });
      }

      // 3. Perform writes
      const now = serverTimestamp();

      for (const data of readsData) {
        const { returnItem, item, refs, itemRef, itemData, siteDoc, storeDoc } = data;
        const qty = returnItem.quantityReturned;

        // Update site inventory (remove doc when site stock is fully returned)
        if (siteDoc && siteDoc.exists()) {
          const currentSiteQty = siteDoc.data().quantity;
          if (currentSiteQty < qty) {
            throw new Error(`Insufficient stock at site for ${item.itemName}. Available: ${currentSiteQty}, Trying to return: ${qty}`);
          }
          const newSiteQty = currentSiteQty - qty;
          if (newSiteQty === 0) {
            transaction.delete(refs.siteRef);
          } else {
            transaction.update(refs.siteRef, {
              quantity: newSiteQty,
              updatedAt: now,
            });
          }
        } else {
          throw new Error(`Item ${item.itemName} not found in site inventory. Cannot return.`);
        }

        // Update central store inventory
        if (storeDoc && storeDoc.exists()) {
          const currentStoreQty = storeDoc.data().quantity;
          transaction.update(refs.storeRef, {
            quantity: currentStoreQty + qty,
            updatedAt: now,
          });
        } else {
          const newEntry: Record<string, unknown> = {
            itemId: returnItem.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            locationId: 'store',
            locationType: 'store',
            locationName: 'Central Store',
            quantity: qty,
            updatedAt: now,
          };
          if (item.lengthPerPiece != null) newEntry.lengthPerPiece = item.lengthPerPiece;
          if (item.weightPerMeter != null) newEntry.weightPerMeter = item.weightPerMeter;
          transaction.set(refs.storeRef, newEntry);
        }

        // Update item denormalized stock totals
        if (itemData) {
          transaction.update(itemRef, {
            centralStoreQuantity: (itemData.centralStoreQuantity || 0) + qty,
            atSitesQuantity: (itemData.atSitesQuantity || 0) - qty,
            isLowStock: (itemData.centralStoreQuantity || 0) + qty <= (itemData.minStockLevel || 0),
            updatedAt: now,
          });
        }
      }

      // Build updated items array
      const currentItems = requestData.items as any[];
      const quantityReturnedMap = new Map<string, number>();
      for (const ri of returnData.items) {
        const item = currentItems.find((i: any) => i.itemId === ri.itemId);
        if (!item || item.itemType === 'consumable' || item.itemType === 'fuel') continue;
        const prev = item.quantityReturned ?? 0;
        quantityReturnedMap.set(ri.itemId, prev + ri.quantityReturned);
      }

      const updatedItems = currentItems.map((item: any) => {
        const newQtyReturned = quantityReturnedMap.get(item.itemId) ?? item.quantityReturned ?? 0;
        const isFullyReturned =
          item.itemType === 'consumable' || item.itemType === 'fuel' || newQtyReturned >= item.quantityApproved;
        return {
          ...item,
          quantityReturned: newQtyReturned,
          status: isFullyReturned ? 'returned' : 'partially_returned',
        };
      });

      // Build new return history event
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

      // Determine new request status
      const allNonConsumables = updatedItems.filter((i: any) => i.itemType === 'non_consumable');
      const allFullyReturned =
        allNonConsumables.length === 0 ||
        allNonConsumables.every((i: any) => (i.quantityReturned ?? 0) >= i.quantityApproved);
      const newStatus = allFullyReturned ? 'returned' : 'partially_returned';

      transaction.update(requestRef, {
        items: updatedItems,
        status: newStatus,
        returnHistory: [...existingHistory, newReturnEvent],
        updatedAt: now,
      });
    });
  } catch (error) {
    console.error('Error in return items batch:', error);
    throw error;
  }
};

/**
 * Delete a draft request (permanently removes from Firestore).
 * Only the request creator can delete, and only when status is draft.
 */
export const deleteRequest = async (
  requestId: string,
  userId: string
): Promise<void> => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const requestData = requestSnap.data();

    if (requestData.status !== 'draft') {
      throw new Error('Only draft requests can be deleted');
    }

    if (requestData.requestedBy !== userId) {
      throw new Error('Only the request creator can delete this draft');
    }

    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error deleting request:', error);
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

/** Filters for paginated request list (queue: status, siteId; my: userId) */
export interface RequestListFilters {
  status?: string;
  siteId?: string;
  userId?: string;
}

/** Default page size for paginated request lists */
export const REQUESTS_PAGE_SIZE = 10;

/**
 * Build Firestore query constraints for requests (shared by listPaginated and getCount).
 * - Queue (no userId): excludes drafts via status filter; optional status/siteId
 * - My Requests (userId): includes drafts; filters by requestedBy
 */
export const buildRequestQueryConstraints = (
  filters?: RequestListFilters
): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];

  if (filters?.userId) {
    constraints.push(where('requestedBy', '==', filters.userId));
  } else {
    // Queue: exclude drafts (queue staff never see drafts)
    if (filters?.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    } else {
      constraints.push(where('status', 'in', REQUEST_QUEUE_NON_DRAFT_STATUSES));
    }
    if (filters?.siteId && filters.siteId !== 'all') {
      constraints.push(where('siteId', '==', filters.siteId));
    }
  }

  constraints.push(orderBy('createdAt', 'desc'));
  return constraints;
};

/**
 * List requests with cursor-based pagination.
 *
 * @param filters - status, siteId (queue) or userId (my requests)
 * @param pageSize - Number of requests per page
 * @param lastDoc - Cursor for next page (from previous response)
 * @returns Requests and cursor for next page
 */
export const listRequestsPaginated = async (
  filters: RequestListFilters | undefined,
  pageSize: number,
  lastDoc?: DocumentSnapshot
): Promise<{ requests: Request[]; lastDoc: DocumentSnapshot | null }> => {
  try {
    const constraints = buildRequestQueryConstraints(filters);
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    const q = query(collection(db, REQUESTS_COLLECTION), ...constraints);
    const snapshot = await getDocsFromServer(q);

    const requests: Request[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Request[];

    const newLastDoc =
      snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { requests, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error listing requests (paginated):', error);
    throw error;
  }
};

/**
 * Get total count of requests matching Firestore filters.
 * Must use same where/orderBy as listRequestsPaginated.
 *
 * @param filters - Same filters as listRequestsPaginated
 * @returns Total count from server
 */
export const getRequestsCount = async (
  filters: RequestListFilters | undefined
): Promise<number> => {
  try {
    const constraints = buildRequestQueryConstraints(filters);
    const q = query(collection(db, REQUESTS_COLLECTION), ...constraints);
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting requests count:', error);
    throw error;
  }
};

/**
 * Fetch all requests matching filters without pagination for exporting
 * 
 * @param filters - Same filters as listRequestsPaginated
 * @returns Array of requests
 */
export const exportRequestsData = async (
  filters?: RequestListFilters
): Promise<Request[]> => {
  try {
    const constraints = buildRequestQueryConstraints(filters);
    const q = query(collection(db, REQUESTS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const requests: Request[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Request[];

    return requests;
  } catch (error) {
    console.error('Error exporting requests:', error);
    throw error;
  }
};

/**
 * Get recent pending requests for the dashboard
 */
export const getRecentPendingRequests = async (
  filters: {
    siteId?: string;
    userId?: string;
  },
  limitCount: number = 5
): Promise<Request[]> => {
  try {
    let q = query(collection(db, REQUESTS_COLLECTION), where('status', '==', 'pending'));

    if (filters.siteId && filters.siteId !== 'all') {
      q = query(q, where('siteId', '==', filters.siteId));
    }

    if (filters.userId) {
      q = query(q, where('requestedBy', '==', filters.userId));
    }

    q = query(q, orderBy('createdAt', 'desc'), limit(limitCount));

    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Request[];

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return requests.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  } catch (error) {
    console.error('Error getting recent pending requests:', error);
    return [];
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
  callback: (requests: Request[]) => void,
  onError?: (error: Error) => void
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
        // When userId is NOT provided (Request Queue for Store Incharge / Super Admin), exclude drafts.
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
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up requests subscription:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
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
  partialApproveAndSplitCallable,
  approveRequest,
  rejectRequest,
  transferRequest,
  returnItems,
  deleteRequest,
  cancelRequest,
  getRequestById,
  listRequestsPaginated,
  exportRequestsData,
  getRequestsCount,
  getRecentPendingRequests,
  subscribeToRequests,
  subscribeToRequest,
};
