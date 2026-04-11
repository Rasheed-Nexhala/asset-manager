import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  SiteSupervisor,
  SiteSupervisorInput,
  SupervisorItemAllocation,
  CreateSupervisorAllocationInput,
  MultiRequestAllocationInput,
} from '../../types/siteSupervisor';
import type { Request, RequestItem } from '../../types/request';

function allocationItemTypeFromDoc(raw: unknown): RequestItem['itemType'] | undefined {
  if (raw === 'consumable' || raw === 'non_consumable' || raw === 'fuel') return raw;
  return undefined;
}

const SUPERVISORS_SUB = 'siteSupervisors';
const ALLOCATIONS_SUB = 'supervisorAllocations';
const REQUESTS_COLLECTION = 'requests';

function supervisorsCol(siteId: string) {
  return collection(db, 'sites', siteId, SUPERVISORS_SUB);
}

function allocationsCol(siteId: string) {
  return collection(db, 'sites', siteId, ALLOCATIONS_SUB);
}

export function subscribeSiteSupervisors(
  siteId: string,
  onSnapshotCb: (rows: SiteSupervisor[]) => void
): () => void {
  const q = query(supervisorsCol(siteId), orderBy('name'));
  return onSnapshot(
    q,
    (snap) => {
      const rows: SiteSupervisor[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          siteId,
          name: String(data.name ?? ''),
          phone: data.phone != null ? String(data.phone) : undefined,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
          createdByManagerId: String(data.createdByManagerId ?? ''),
        };
      });
      onSnapshotCb(rows);
    },
    () => onSnapshotCb([])
  );
}

export async function addSiteSupervisor(
  siteId: string,
  input: SiteSupervisorInput,
  managerId: string
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Supervisor name is required');

  const ref = await addDoc(supervisorsCol(siteId), {
    name,
    phone: input.phone?.trim() || null,
    createdByManagerId: managerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSiteSupervisor(
  siteId: string,
  supervisorId: string,
  input: SiteSupervisorInput
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error('Supervisor name is required');

  await updateDoc(doc(db, 'sites', siteId, SUPERVISORS_SUB, supervisorId), {
    name,
    phone: input.phone?.trim() || null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSiteSupervisor(
  siteId: string,
  supervisorId: string
): Promise<void> {
  const open = await getDocs(
    query(
      allocationsCol(siteId),
      where('supervisorId', '==', supervisorId)
    )
  );
  const requestCache = new Map<string, Request>();

  const lineItemType = async (
    requestId: string,
    itemId: string
  ): Promise<RequestItem['itemType'] | undefined> => {
    if (!requestCache.has(requestId)) {
      const snap = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
      if (!snap.exists()) return undefined;
      requestCache.set(requestId, snap.data() as Request);
    }
    const req = requestCache.get(requestId);
    return req?.items?.find((i) => i.itemId === itemId)?.itemType;
  };

  for (const d of open.docs) {
    const data = d.data();
    const alloc = Number(data.quantityAllocated ?? 0);
    const ret = Number(data.quantityReturnedToManager ?? 0);
    const outstanding = alloc - ret;
    if (outstanding <= 0) continue;

    const fromDoc = allocationItemTypeFromDoc(data.itemType);

    const resolved =
      fromDoc ?? (await lineItemType(String(data.requestId ?? ''), String(data.itemId ?? '')));
    if (resolved !== 'non_consumable') continue;

    throw new Error(
      'Cannot remove a supervisor who still has items not returned to you. Record returns first.'
    );
  }
  await deleteDoc(doc(db, 'sites', siteId, SUPERVISORS_SUB, supervisorId));
}

export function subscribeSiteAllocations(
  siteId: string,
  onSnapshotCb: (rows: SupervisorItemAllocation[]) => void
): () => void {
  const q = query(allocationsCol(siteId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const rows: SupervisorItemAllocation[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          siteId,
          supervisorId: String(data.supervisorId ?? ''),
          supervisorName: String(data.supervisorName ?? ''),
          requestId: String(data.requestId ?? ''),
          requestNumber: String(data.requestNumber ?? ''),
          itemId: String(data.itemId ?? ''),
          itemName: String(data.itemName ?? ''),
          itemType: allocationItemTypeFromDoc(data.itemType),
          quantityAllocated: Number(data.quantityAllocated ?? 0),
          quantityReturnedToManager: Number(data.quantityReturnedToManager ?? 0),
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });
      onSnapshotCb(rows);
    },
    () => onSnapshotCb([])
  );
}

function sortAllocationsByCreatedDesc(rows: SupervisorItemAllocation[]): void {
  rows.sort((a, b) => {
    const ta = a.createdAt && typeof (a.createdAt as { toMillis?: () => number }).toMillis === 'function'
      ? (a.createdAt as { toMillis: () => number }).toMillis()
      : 0;
    const tb = b.createdAt && typeof (b.createdAt as { toMillis?: () => number }).toMillis === 'function'
      ? (b.createdAt as { toMillis: () => number }).toMillis()
      : 0;
    return tb - ta;
  });
}

export function subscribeRequestAllocations(
  siteId: string,
  requestId: string,
  onSnapshotCb: (rows: SupervisorItemAllocation[]) => void
): () => void {
  const q = query(allocationsCol(siteId), where('requestId', '==', requestId));
  return onSnapshot(
    q,
    (snap) => {
      const rows: SupervisorItemAllocation[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          siteId,
          supervisorId: String(data.supervisorId ?? ''),
          supervisorName: String(data.supervisorName ?? ''),
          requestId: String(data.requestId ?? ''),
          requestNumber: String(data.requestNumber ?? ''),
          itemId: String(data.itemId ?? ''),
          itemName: String(data.itemName ?? ''),
          itemType: allocationItemTypeFromDoc(data.itemType),
          quantityAllocated: Number(data.quantityAllocated ?? 0),
          quantityReturnedToManager: Number(data.quantityReturnedToManager ?? 0),
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });
      sortAllocationsByCreatedDesc(rows);
      onSnapshotCb(rows);
    },
    () => onSnapshotCb([])
  );
}

function patchItemsSupervisorQty(
  items: RequestItem[],
  itemId: string,
  delta: number
): RequestItem[] {
  return items.map((line) => {
    if (line.itemId !== itemId) return line;
    const prev = line.supervisorOutstandingQty ?? 0;
    const next = prev + delta;
    if (next < 0) {
      throw new Error('Invalid supervisor quantity update');
    }
    return { ...line, supervisorOutstandingQty: next };
  });
}

export async function createSupervisorAllocation(
  siteId: string,
  input: CreateSupervisorAllocationInput,
  supervisorName: string,
  actor: { userId: string; userName: string }
): Promise<void> {
  const { requestId, itemId, supervisorId, quantity } = input;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive whole number');
  }

  const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
  const newAllocRef = doc(allocationsCol(siteId));

  await runTransaction(db, async (transaction) => {
    const reqSnap = await transaction.get(requestRef);
    if (!reqSnap.exists()) throw new Error('Request not found');
    const requestData = reqSnap.data() as Request;

    if (requestData.siteId !== siteId) {
      throw new Error('Request does not belong to this site');
    }
    if (requestData.status !== 'transferred' && requestData.status !== 'partially_returned') {
      throw new Error('Items can only be divided after the request is transferred');
    }

    const line = requestData.items?.find((i) => i.itemId === itemId);
    if (!line) throw new Error('Item not found on this request');

    const qtyApproved = Number(line.quantityApproved ?? 0);
    const qtyReturnedCentral = Number(line.quantityReturned ?? 0);
    const maxAtSite = qtyApproved - qtyReturnedCentral;
    const supOut = Number(line.supervisorOutstandingQty ?? 0);

    if (supOut + quantity > maxAtSite) {
      throw new Error(
        `Only ${Math.max(0, maxAtSite - supOut)} unit(s) can still be assigned to supervisors for this item`
      );
    }

    const newItems = patchItemsSupervisorQty(requestData.items, itemId, quantity);

    transaction.update(requestRef, {
      items: newItems,
      updatedAt: serverTimestamp(),
      lastSupervisorCustodyUpdateBy: actor.userId,
      lastSupervisorCustodyUpdateByName: actor.userName,
    });

    transaction.set(newAllocRef, {
      supervisorId,
      supervisorName,
      requestId,
      requestNumber: requestData.requestNumber ?? '',
      itemId,
      itemName: line.itemName ?? '',
      itemType: line.itemType,
      quantityAllocated: quantity,
      quantityReturnedToManager: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Allocates an item to a supervisor across multiple request lines in one atomic transaction.
 * Used by the inventory-first split flow. Each distribution entry creates one allocation doc
 * with a real requestId, keeping supervisorOutstandingQty accurate on every request line.
 */
export async function createMultiRequestSupervisorAllocation(
  input: MultiRequestAllocationInput,
  actor: { userId: string; userName: string }
): Promise<void> {
  const { siteId, itemId, itemName, itemType, supervisorId, supervisorName, distributions } = input;

  const active = distributions.filter((d) => d.quantity > 0);
  if (active.length === 0) throw new Error('No quantity to allocate');

  for (const dist of active) {
    if (!Number.isInteger(dist.quantity) || dist.quantity < 1) {
      throw new Error('Each quantity must be a positive whole number');
    }
  }

  const requestRefs = active.map((d) => doc(db, REQUESTS_COLLECTION, d.requestId));
  const allocRefs = active.map(() => doc(allocationsCol(siteId)));

  await runTransaction(db, async (transaction) => {
    const reqSnaps = await Promise.all(requestRefs.map((ref) => transaction.get(ref)));

    for (let i = 0; i < active.length; i++) {
      const dist = active[i];
      const reqSnap = reqSnaps[i];
      if (!reqSnap.exists()) throw new Error(`Request not found`);
      const requestData = reqSnap.data() as Request;

      if (requestData.siteId !== siteId) throw new Error('Request does not belong to this site');
      if (requestData.status !== 'transferred' && requestData.status !== 'partially_returned') {
        throw new Error(`Request ${requestData.requestNumber} is not transferred yet`);
      }

      const line = requestData.items?.find((item) => item.itemId === itemId);
      if (!line) throw new Error(`Item not found on request ${requestData.requestNumber}`);

      const maxAtSite =
        Number(line.quantityApproved ?? 0) - Number(line.quantityReturned ?? 0);
      const supOut = Number(line.supervisorOutstandingQty ?? 0);

      if (supOut + dist.quantity > maxAtSite) {
        throw new Error(
          `Only ${Math.max(0, maxAtSite - supOut)} unit(s) available on ${requestData.requestNumber}`
        );
      }

      const newItems = patchItemsSupervisorQty(requestData.items, itemId, dist.quantity);

      transaction.update(requestRefs[i], {
        items: newItems,
        updatedAt: serverTimestamp(),
        lastSupervisorCustodyUpdateBy: actor.userId,
        lastSupervisorCustodyUpdateByName: actor.userName,
      });

      transaction.set(allocRefs[i], {
        supervisorId,
        supervisorName,
        requestId: dist.requestId,
        requestNumber: requestData.requestNumber ?? '',
        itemId,
        itemName,
        itemType,
        quantityAllocated: dist.quantity,
        quantityReturnedToManager: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function recordReturnFromSupervisor(
  siteId: string,
  allocationId: string,
  quantity: number,
  actor: { userId: string; userName: string }
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive whole number');
  }

  const allocRef = doc(db, 'sites', siteId, ALLOCATIONS_SUB, allocationId);

  await runTransaction(db, async (transaction) => {
    const allocSnap = await transaction.get(allocRef);
    if (!allocSnap.exists()) throw new Error('Allocation not found');
    const data = allocSnap.data();
    const alloc = Number(data.quantityAllocated ?? 0);
    const ret = Number(data.quantityReturnedToManager ?? 0);
    const outstanding = alloc - ret;
    if (quantity > outstanding) {
      throw new Error(`Only ${outstanding} unit(s) can be marked as returned from this supervisor`);
    }

    const requestId = String(data.requestId ?? '');
    const itemId = String(data.itemId ?? '');
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);

    const reqSnap = await transaction.get(requestRef);
    if (!reqSnap.exists()) throw new Error('Request not found');
    const requestData = reqSnap.data() as Request;

    const line = requestData.items?.find((i) => i.itemId === itemId);
    if (!line) throw new Error('Item not found on this request');
    if (line.itemType !== 'non_consumable') {
      throw new Error('Only non-consumable items can be returned from supervisors');
    }

    const newItems = patchItemsSupervisorQty(requestData.items, itemId, -quantity);

    transaction.update(requestRef, {
      items: newItems,
      updatedAt: serverTimestamp(),
      lastSupervisorCustodyUpdateBy: actor.userId,
      lastSupervisorCustodyUpdateByName: actor.userName,
    });

    transaction.update(allocRef, {
      quantityReturnedToManager: ret + quantity,
      updatedAt: serverTimestamp(),
    });
  });
}

export const siteSupervisorService = {
  subscribeSiteSupervisors,
  addSiteSupervisor,
  updateSiteSupervisor,
  deleteSiteSupervisor,
  subscribeSiteAllocations,
  subscribeRequestAllocations,
  createSupervisorAllocation,
  createMultiRequestSupervisorAllocation,
  recordReturnFromSupervisor,
};
