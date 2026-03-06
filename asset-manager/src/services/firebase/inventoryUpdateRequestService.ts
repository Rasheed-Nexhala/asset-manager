import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { auth } from '../../../config/firebase';
import type { InventoryUpdateRequest, InventoryUpdateRequestStatus } from '../../types/inventoryUpdateRequest';

const COLLECTION = 'inventoryUpdateRequests';

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

  return {
    id,
    requestedBy: String(data.requestedBy ?? ''),
    requestedByName: String(data.requestedByName ?? ''),
    requestedByRole: String(data.requestedByRole ?? ''),
    reason: String(data.reason ?? ''),
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
 * @returns The created request document ID
 */
export const createRequest = async (
  userId: string,
  userName: string,
  userRole: string,
  reason: string
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to create inventory update request');
  }
  if (userId !== user.uid) {
    throw new Error('Cannot create request on behalf of another user');
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    requestedBy: userId,
    requestedByName: userName,
    requestedByRole: userRole,
    reason: reason.trim() || 'Inventory update required',
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
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error(`Request ${requestId} not found`);
  }

  const data = requestSnap.data();
  if (data.status !== 'pending') {
    throw new Error(`Request ${requestId} is not pending (status: ${data.status})`);
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  await updateDoc(requestRef, {
    status: 'approved',
    approvedBy: adminId,
    approvedByName: adminName,
    approvedAt: serverTimestamp(),
    accessExpiresAt: Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp(),
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
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error(`Request ${requestId} not found`);
  }

  const data = requestSnap.data();
  if (data.status !== 'approved') {
    throw new Error(`Request ${requestId} is not approved (status: ${data.status})`);
  }

  await updateDoc(requestRef, {
    accessRevoked: true,
    updatedAt: serverTimestamp(),
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
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error(`Request ${requestId} not found`);
  }

  const data = requestSnap.data();
  if (data.status !== 'pending') {
    throw new Error(`Request ${requestId} is not pending (status: ${data.status})`);
  }

  await updateDoc(requestRef, {
    status: 'rejected',
    approvedBy: adminId,
    approvedByName: adminName,
    approvedAt: serverTimestamp(),
    rejectionReason: rejectionReason.trim() || 'Rejected by Admin',
    updatedAt: serverTimestamp(),
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
 * Admin only (Store Incharge can only see own via getMyActiveAccess / list).
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

/**
 * Get the Store Incharge's active approved access (if any).
 * Returns the approved request where requestedBy == userId AND accessExpiresAt > now.
 *
 * @param userId - Store Incharge user ID
 * @returns The active approved request, or null if none
 */
export const getMyActiveAccess = async (
  userId: string
): Promise<InventoryUpdateRequest | null> => {
  const q = query(
    collection(db, COLLECTION),
    where('requestedBy', '==', userId),
    where('status', '==', 'approved'),
    orderBy('accessExpiresAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const now = Date.now();
  for (const d of snapshot.docs) {
    const data = d.data();
    if (data.accessRevoked === true) continue;
    const exp = data.accessExpiresAt as Timestamp | undefined;
    const expMs = exp?.toMillis?.() ?? (exp ? new Date(exp as unknown as string).getTime() : 0);
    if (expMs > now) {
      return docToRequest(d.id, data);
    }
  }
  return null;
};

/**
 * Subscribe to real-time updates of the Store Incharge's active access.
 * Callback receives the active approved request or null.
 * Filters client-side by accessExpiresAt > now and sets a timer to clear when access expires.
 *
 * @param userId - Store Incharge user ID
 * @param callback - Called with active request or null
 * @returns Unsubscribe function
 */
export const subscribeToMyActiveAccess = (
  userId: string,
  callback: (request: InventoryUpdateRequest | null) => void
): Unsubscribe => {
  if (!userId) {
    callback(null);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION),
    where('requestedBy', '==', userId),
    where('status', '==', 'approved'),
    orderBy('accessExpiresAt', 'desc')
  );

  let expiryTimerId: ReturnType<typeof setTimeout> | null = null;

  const evaluateAndNotify = (snapshot: QuerySnapshot) => {
    if (expiryTimerId) {
      clearTimeout(expiryTimerId);
      expiryTimerId = null;
    }

    const now = Date.now();
    let active: InventoryUpdateRequest | null = null;

    for (const d of snapshot.docs) {
      const data = d.data();
      if (data.accessRevoked === true) continue;
      const exp = data.accessExpiresAt as Timestamp | undefined;
      const expMs = exp?.toMillis?.() ?? (exp ? new Date(exp as unknown as string).getTime() : 0);
      if (expMs > now) {
        active = docToRequest(d.id, data);
        const delay = Math.max(0, expMs - now);
        expiryTimerId = setTimeout(() => callback(null), delay);
        break;
      }
    }

    if (!active) {
      callback(null);
    } else {
      callback(active);
    }
  };

  const unsubscribe = onSnapshot(
    q,
    (snapshot: QuerySnapshot) => evaluateAndNotify(snapshot),
    (error) => {
      console.error('Error in subscribeToMyActiveAccess:', error);
      if (expiryTimerId) clearTimeout(expiryTimerId);
      callback(null);
    }
  );

  return () => {
    unsubscribe();
    if (expiryTimerId) clearTimeout(expiryTimerId);
  };
};
