/**
 * Partial approval: approve in-stock lines on the parent request and create a pending
 * remainder request (same requester) for the rest. Callable uses Admin SDK so Store
 * Incharge can create the remainder despite Firestore client create rules.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import {
  partitionPartialApproval,
  type LineItem,
  type ApprovedLineInput,
} from './partialApprovePartition.js';

const db = admin.firestore();

const REQUESTS_COLLECTION = 'requests';
const REQUEST_COUNTERS_COLLECTION = 'requestCounters';
const INVENTORY_COLLECTION = 'inventory';

const getInventoryDocId = (itemId: string, locationId: string): string =>
  `${itemId}_${locationId}`;

export type { ApprovedLineInput };

async function getAvailability(
  items: Array<{ itemId: string; itemName: string; quantity: number }>,
  locationId: string
): Promise<Map<string, { available: number; sufficient: boolean }>> {
  const result = new Map<string, { available: number; sufficient: boolean }>();
  for (const item of items) {
    const ref = db
      .collection(INVENTORY_COLLECTION)
      .doc(getInventoryDocId(item.itemId, locationId));
    const snap = await ref.get();
    const available = snap.exists ? Number(snap.data()?.quantity ?? 0) : 0;
    const sufficient = available >= item.quantity;
    result.set(item.itemId, { available, sufficient });
  }
  return result;
}

async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  const counterDocId = `year_${year}`;

  return db.runTransaction(async (transaction) => {
    const counterRef = db.collection(REQUEST_COUNTERS_COLLECTION).doc(counterDocId);
    const counterSnap = await transaction.get(counterRef);
    const lastNumber = counterSnap.exists ? Number(counterSnap.data()?.lastNumber ?? 0) : 0;
    const nextNumber = lastNumber + 1;
    transaction.set(counterRef, {
      year,
      lastNumber: nextNumber,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  });
}

async function assertCanManageRequests(uid: string): Promise<void> {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throw new HttpsError('permission-denied', 'User profile not found');
  }
  const role = userSnap.data()?.role as string | undefined;
  if (role !== 'StoreIncharge' && role !== 'SuperAdmin') {
    throw new HttpsError('permission-denied', 'Only Store Incharge or SuperAdmin can approve');
  }
  const isActive = userSnap.data()?.isActive;
  if (isActive === false) {
    throw new HttpsError('permission-denied', 'Account inactive');
  }
}

export const partialApproveAndSplit = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  const uid = request.auth.uid;
  await assertCanManageRequests(uid);

  const raw = request.data as Record<string, unknown> | null | undefined;
  const parentRequestId = typeof raw?.parentRequestId === 'string' ? raw.parentRequestId.trim() : '';
  const storeNotesRaw = raw?.storeNotes;
  const storeNotes =
    typeof storeNotesRaw === 'string' && storeNotesRaw.trim().length > 0
      ? storeNotesRaw.trim()
      : undefined;
  const approvedLineItems = raw?.approvedLineItems as ApprovedLineInput[] | undefined;

  if (!parentRequestId) {
    throw new HttpsError('invalid-argument', 'parentRequestId is required');
  }
  if (!Array.isArray(approvedLineItems) || approvedLineItems.length === 0) {
    throw new HttpsError('invalid-argument', 'approvedLineItems is required');
  }

  const userSnap = await db.collection('users').doc(uid).get();
  const userName =
    (userSnap.data()?.displayName as string | undefined) ||
    (userSnap.data()?.email as string | undefined) ||
    'Unknown';

  const parentRef = db.collection(REQUESTS_COLLECTION).doc(parentRequestId);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists) {
    throw new HttpsError('not-found', 'Request not found');
  }
  const parent = parentSnap.data() as Record<string, unknown>;
  if (parent.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Only pending requests can be approved');
  }

  const parentItems = Array.isArray(parent.items) ? (parent.items as LineItem[]) : [];
  if (parentItems.length === 0) {
    throw new HttpsError('failed-precondition', 'Request has no items');
  }

  const { fulfillLines, remainderLines, error: partError } = partitionPartialApproval(
    parentItems,
    approvedLineItems
  );
  if (partError || fulfillLines.length === 0) {
    throw new HttpsError('invalid-argument', partError ?? 'Nothing to approve');
  }

  const isSiteTransfer = parent.requestType === 'site_transfer';
  const sourceSiteId = parent.sourceSiteId as string | undefined;
  const locationId =
    isSiteTransfer && sourceSiteId ? `site_${sourceSiteId}` : 'store';

  const checkItems = fulfillLines.map((line) => ({
    itemId: line.itemId,
    itemName: typeof line.itemName === 'string' ? line.itemName : line.itemId,
    quantity: line.quantityRequested,
  }));
  const availability = await getAvailability(checkItems, locationId);
  for (const line of fulfillLines) {
    const a = availability.get(line.itemId);
    if (!a?.sufficient) {
      throw new HttpsError(
        'failed-precondition',
        `Insufficient stock for "${line.itemName ?? line.itemId}" at source`
      );
    }
  }

  const requestNumberParent = parent.requestNumber as string;
  const remainderRequestNumber = await generateRequestNumber();
  const remainderRef = db.collection(REQUESTS_COLLECTION).doc();

  const requestedBy = parent.requestedBy as string;
  const requestedByName = parent.requestedByName as string;
  const siteId = parent.siteId as string;
  const siteName = parent.siteName as string;
  const priority = parent.priority as string;
  const purpose = (parent.purpose as string) ?? '';

  await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(parentRef);
    if (!fresh.exists) {
      throw new HttpsError('not-found', 'Request not found');
    }
    const d = fresh.data() as Record<string, unknown>;
    if (d.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Request is no longer pending');
    }

    const updatePayload: Record<string, unknown> = {
      items: fulfillLines,
      status: 'approved',
      processedBy: uid,
      processedByName: userName,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      storeNotes: storeNotes ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (remainderLines.length > 0) {
      updatePayload.splitRemainderRequestId = remainderRef.id;
      updatePayload.splitRemainderRequestNumber = remainderRequestNumber;
    }

    transaction.update(parentRef, updatePayload);

    if (remainderLines.length > 0) {
      const childPayload: Record<string, unknown> = {
        requestNumber: remainderRequestNumber,
        siteId,
        siteName,
        requestedBy,
        requestedByName,
        status: 'pending',
        priority,
        purpose,
        items: remainderLines,
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
        splitFromRequestId: parentRequestId,
        splitFromRequestNumber: requestNumberParent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (isSiteTransfer && sourceSiteId) {
        childPayload.requestType = 'site_transfer';
        childPayload.sourceSiteId = sourceSiteId;
        if (parent.sourceSiteName) childPayload.sourceSiteName = parent.sourceSiteName;
      }
      transaction.set(remainderRef, childPayload);
    }
  });

  logger.info('partialApproveAndSplit completed', {
    parentRequestId,
    remainderId: remainderLines.length > 0 ? remainderRef.id : null,
  });

  return {
    parentRequestId,
    remainderRequestId: remainderLines.length > 0 ? remainderRef.id : null,
    remainderRequestNumber: remainderLines.length > 0 ? remainderRequestNumber : null,
  };
});
