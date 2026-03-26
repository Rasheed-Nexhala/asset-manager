import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  QuerySnapshot,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { auth } from '../../../config/firebase';
import type {
  InventoryUpdateRequest,
  InventoryUpdateRequestStatus,
  InventoryUpdateAccessScope,
} from '../../types/inventoryUpdateRequest';
import { normalizeInventoryUpdateAccessScopes } from '../../types/inventoryUpdateRequest';

const COLLECTION = 'inventoryUpdateRequests';

/** Active time-boxed access merged from all approved, non-revoked, non-expired grants for the user. */
export interface MyActiveAccessSummary {
  centralStoreAccessExpiresAt: string | null;
  maintenanceWriteOffAccessExpiresAt: string | null;
}

/**
 * Convert Firestore document to InventoryUpdateRequest (serialize timestamps to ISO strings)
 */
function docToRequest(
  id: string,
  data: Record<string, unknown>
): InventoryUpdateRequest {
  const toISO = (v: unknown): string | undefined => {
    if (!v) return undefined;
    if (v instanceof Date) return v.toISOString();
    if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
      return (v as Timestamp).toDate().toISOString();
    }
    return String(v);
  };

  const rawScopes = data.accessScopes;
  let accessScopes: InventoryUpdateAccessScope[] | undefined;
  if (Array.isArray(rawScopes)) {
    accessScopes = normalizeInventoryUpdateAccessScopes(
      rawScopes.filter((s): s is InventoryUpdateAccessScope => typeof s === 'string') as InventoryUpdateAccessScope[]
    );
  }

  return {
    id,
    requestedBy: String(data.requestedBy ?? ''),
    requestedByName: String(data.requestedByName ?? ''),
    requestedByRole: String(data.requestedByRole ?? ''),
    reason: String(data.reason ?? ''),
    ...(accessScopes ? { accessScopes } : {}),
    status: (data.status as InventoryUpdateRequestStatus) ?? 'pending',
    approvedBy: data.approvedBy != null ? String(data.approvedBy) : undefined,
    approvedByName: data.approvedByName != null ? String(data.approvedByName) : undefined,
    approvedAt: data.approvedAt != null ? toISO(data.approvedAt) : undefined,
    accessExpiresAt: data.accessExpiresAt != null ? toISO(data.accessExpiresAt) : undefined,
    accessRevoked: data.accessRevoked === true,
    rejectionReason: data.rejectionReason != null ? String(data.rejectionReason) : undefined,
    createdAt: toISO(data.createdAt) ?? new Date().toISOString(),
    updatedAt: toISO(data.updatedAt) ?? new Date().toISOString(),
  };
}

/**
 * Create a pending inventory update request.
 * Store Incharge only.
 *
 * @param userId - Requesting user ID
 * @param userName - Requesting user display name
 * @param userRole - Requesting user role (e.g. 'StoreIncharge')
 * @param reason - Reason for requesting access
 * @param accessScopes - What access is being requested (default: central store only)
 * @returns The created request document ID
 */
export const createRequest = async (
  userId: string,
  userName: string,
  userRole: string,
  reason: string,
  accessScopes?: InventoryUpdateAccessScope[]
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to create inventory update request');
  }
  if (userId !== user.uid) {
    throw new Error('Cannot create request on behalf of another user');
  }

  const scopes = normalizeInventoryUpdateAccessScopes(accessScopes);

  const docRef = await addDoc(collection(db, COLLECTION), {
    requestedBy: userId,
    requestedByName: userName,
    requestedByRole: userRole,
    reason: reason.trim() || 'Inventory update required',
    accessScopes: scopes,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

/**
 * Approve an inventory update request.
 * Admin only. Sets status to approved and accessExpiresAt.
 *
 * @param requestId - Document ID of the request
 * @param adminId - Admin user ID
 * @param adminName - Admin display name
 * @param expiresInHours - Hours until access expires
 */
export const approveRequest = async (
  requestId: string,
  adminId: string,
  adminName: string,
  expiresInHours: number
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to approve request');
  }

  const requestRef = doc(db, COLLECTION, requestId);

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error(`Request ${requestId} not found`);
    }

    const data = requestSnap.data();
    if (data.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending (status: ${data.status})`);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    transaction.update(requestRef, {
      status: 'approved',
      approvedBy: adminId,
      approvedByName: adminName,
      approvedAt: serverTimestamp(),
      accessExpiresAt: Timestamp.fromDate(expiresAt),
      updatedAt: serverTimestamp(),
    });
  });
};

/**
 * Revoke Store Incharge's access. Admin only.
 * Sets accessRevoked: true so Store Incharge loses access immediately.
 */
export const revokeAccess = async (requestId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to revoke access');
  }

  const requestRef = doc(db, COLLECTION, requestId);

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error(`Request ${requestId} not found`);
    }

    const data = requestSnap.data();
    if (data.status !== 'approved') {
      throw new Error(`Request ${requestId} is not approved (status: ${data.status})`);
    }

    transaction.update(requestRef, {
      accessRevoked: true,
      updatedAt: serverTimestamp(),
    });
  });
};

/**
 * Restore Store Incharge's access. Admin only.
 * Sets accessRevoked: false so Store Incharge regains access.
 */
export const restoreAccess = async (requestId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to restore access');
  }

  const requestRef = doc(db, COLLECTION, requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error(`Request ${requestId} not found`);
  }

  const data = requestSnap.data();
  if (data.status !== 'approved') {
    throw new Error(`Request ${requestId} is not approved (status: ${data.status})`);
  }

  await updateDoc(requestRef, {
    accessRevoked: false,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Reject an inventory update request.
 * Admin only.
 *
 * @param requestId - Document ID of the request
 * @param adminId - Admin user ID
 * @param adminName - Admin display name
 * @param rejectionReason - Reason for rejection
 */
export const rejectRequest = async (
  requestId: string,
  adminId: string,
  adminName: string,
  rejectionReason: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to reject request');
  }

  const requestRef = doc(db, COLLECTION, requestId);

  await runTransaction(db, async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists()) {
      throw new Error(`Request ${requestId} not found`);
    }

    const data = requestSnap.data();
    if (data.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending (status: ${data.status})`);
    }

    transaction.update(requestRef, {
      status: 'rejected',
      approvedBy: adminId,
      approvedByName: adminName,
      approvedAt: serverTimestamp(),
      rejectionReason: rejectionReason.trim() || 'Rejected by Admin',
      updatedAt: serverTimestamp(),
    });
  });
};

/**
 * Get all active approved requests (accessExpiresAt > now).
 * Admin only. Used to show revoke toggle for each Store Incharge with active access.
 * Uses status-only query to avoid composite index; filters and sorts client-side.
 */
export const getActiveApprovedRequests = async (): Promise<InventoryUpdateRequest[]> => {
  const now = Date.now();
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'approved')
  );

  const snapshot = await getDocs(q);
  const requests = snapshot.docs.map((d) => docToRequest(d.id, d.data()));

  return requests
    .filter((r) => {
      const exp = r.accessExpiresAt ? new Date(r.accessExpiresAt).getTime() : 0;
      return exp > now;
    })
    .sort((a, b) => {
      const aExp = a.accessExpiresAt ? new Date(a.accessExpiresAt).getTime() : 0;
      const bExp = b.accessExpiresAt ? new Date(b.accessExpiresAt).getTime() : 0;
      return bExp - aExp;
    });
};

/**
 * Get all pending inventory update requests.
 * Admin only (Store Incharge can only see own via getMyActiveAccessSummary / list).
 * Ordered by createdAt desc.
 */
export const getPendingRequests = async (): Promise<InventoryUpdateRequest[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToRequest(d.id, d.data()));
};

function mergeMyActiveAccessFromSnapshot(snapshot: QuerySnapshot): MyActiveAccessSummary {
  const now = Date.now();
  let centralUntil: string | null = null;
  let writeOffUntil: string | null = null;

  for (const d of snapshot.docs) {
    const data = d.data();
    if (data.accessRevoked === true) continue;
    const exp = data.accessExpiresAt as Timestamp | undefined;
    const expMs = exp?.toMillis?.() ?? (exp ? new Date(exp as unknown as string).getTime() : 0);
    if (expMs <= now) continue;

    const req = docToRequest(d.id, data);
    const scopes = normalizeInventoryUpdateAccessScopes(req.accessScopes);
    const iso = req.accessExpiresAt;
    if (!iso) continue;
    const isoMs = new Date(iso).getTime();

    if (scopes.includes('central_store')) {
      if (!centralUntil || isoMs > new Date(centralUntil).getTime()) centralUntil = iso;
    }
    if (scopes.includes('maintenance_writeoff')) {
      if (!writeOffUntil || isoMs > new Date(writeOffUntil).getTime()) writeOffUntil = iso;
    }
  }

  return {
    centralStoreAccessExpiresAt: centralUntil,
    maintenanceWriteOffAccessExpiresAt: writeOffUntil,
  };
}

/**
 * Store Incharge: merge all approved, non-revoked, non-expired grants (by scope).
 */
export const getMyActiveAccessSummary = async (
  userId: string
): Promise<MyActiveAccessSummary> => {
  const q = query(
    collection(db, COLLECTION),
    where('requestedBy', '==', userId),
    where('status', '==', 'approved'),
    orderBy('accessExpiresAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return mergeMyActiveAccessFromSnapshot(snapshot);
};

/**
 * Subscribe to real-time updates of the Store Incharge's active access (merged by scope).
 * Re-evaluates when any matching document changes or when the nearest expiry time is reached.
 */
export const subscribeToMyActiveAccess = (
  userId: string,
  callback: (summary: MyActiveAccessSummary) => void
): Unsubscribe => {
  const empty: MyActiveAccessSummary = {
    centralStoreAccessExpiresAt: null,
    maintenanceWriteOffAccessExpiresAt: null,
  };

  if (!userId) {
    callback(empty);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION),
    where('requestedBy', '==', userId),
    where('status', '==', 'approved'),
    orderBy('accessExpiresAt', 'desc')
  );

  let expiryTimerId: ReturnType<typeof setTimeout> | null = null;
  let lastSnapshot: QuerySnapshot | null = null;

  const evaluateAndNotify = () => {
    if (expiryTimerId) {
      clearTimeout(expiryTimerId);
      expiryTimerId = null;
    }
    if (!lastSnapshot) return;

    const summary = mergeMyActiveAccessFromSnapshot(lastSnapshot);
    callback(summary);

    const now = Date.now();
    let minExpiryMs: number | null = null;
    for (const d of lastSnapshot.docs) {
      const data = d.data();
      if (data.accessRevoked === true) continue;
      const exp = data.accessExpiresAt as Timestamp | undefined;
      const expMs = exp?.toMillis?.() ?? (exp ? new Date(exp as unknown as string).getTime() : 0);
      if (expMs > now && (minExpiryMs === null || expMs < minExpiryMs)) {
        minExpiryMs = expMs;
      }
    }
    if (minExpiryMs !== null) {
      const delay = Math.max(0, minExpiryMs - now);
      expiryTimerId = setTimeout(() => evaluateAndNotify(), delay);
    }
  };

  const unsubscribe = onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      lastSnapshot = snapshot;
      evaluateAndNotify();
    },
    (error) => {
      console.error('Error in subscribeToMyActiveAccess:', error);
      if (expiryTimerId) clearTimeout(expiryTimerId);
      callback(empty);
    }
  );

  return () => {
    unsubscribe();
    if (expiryTimerId) clearTimeout(expiryTimerId);
  };
};
