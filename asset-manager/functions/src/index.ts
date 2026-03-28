/**
 * CIAMS - Activity Logging Cloud Functions
 *
 * Phase 7: Firestore triggers and callable function for activity logging.
 * All logs are created server-side for immutability and audit trail.
 */

import { setGlobalOptions } from 'firebase-functions';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
  onDocumentDeleted,
} from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {
  sendExpoPushNotification,
  getUserPushTokens,
  getAdminAndStoreInchargeTokens,
  getAdminAndStoreInchargeUserIds,
  getRequestAlertPushTokens,
  getRequestQueueStaffInAppUserIds,
  getAdminOnlyTokens,
  getAdminOnlyUserIds,
  createInAppNotification,
} from './notifications';
import {
  analyzeSupervisorCustodyItemsChange,
  findSupervisorCustodyDeltas,
} from './supervisorCustodyActivity';

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

/**
 * Helper: Create activity log document
 * Reusable log creator - handles errors gracefully to not block main operations.
 * Use throwOnError: true when called from callable functions so Firestore errors
 * (e.g. permission denied) are surfaced to the client instead of silently swallowed.
 */
async function createActivityLog(
  logData: {
    userId: string;
    userName: string;
    userRole: string;
    actionType: string;
    actionCategory: string;
    targetType: string;
    targetId: string;
    targetDisplay: string;
    summary: string;
    details: string;
    changes?: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }>;
    deviceInfo?: string;
    ipAddress?: string;
    appVersion?: string;
  },
  options?: { throwOnError?: boolean }
): Promise<void> {
  try {
    await db.collection('activityLogs').add({
      ...logData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error('Failed to create activity log', { error, logData });
    if (options?.throwOnError) {
      throw error;
    }
    // Don't throw by default - logging failure should not block Firestore triggers
  }
}

type ActivityChangeEntry = {
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
};

/** True if changes already describe central store (delta or snapshot). */
function hasCentralStoreDeltaOrSnapshot(changes: ActivityChangeEntry[]): boolean {
  const f = new Set(changes.map((c) => String(c.field ?? '').toLowerCase()));
  return f.has('centralstorequantity') || f.has('contextcentralstore');
}

/**
 * When an item-targeted log has no central-store row yet, append a snapshot of
 * `items/{itemId}.centralStoreQuantity` so Item History can show how much was in
 * central store for that item at log time.
 */
async function ensureCentralStoreContextInChanges(
  changes: ActivityChangeEntry[],
  itemId: string
): Promise<ActivityChangeEntry[]> {
  if (hasCentralStoreDeltaOrSnapshot(changes)) {
    return changes;
  }
  const itemSnap = await db.collection('items').doc(itemId).get();
  if (!itemSnap.exists) {
    return changes;
  }
  const raw = itemSnap.data()?.centralStoreQuantity;
  const n = typeof raw === 'number' && !Number.isNaN(raw) ? raw : null;
  if (n == null) {
    return changes;
  }
  return [
    ...changes,
    {
      field: 'contextCentralStore',
      fieldLabel: 'Item master — central store total',
      oldValue: n,
      newValue: n,
    },
  ];
}

/**
 * When PO line receivedQuantity increases, emit one activity log per line with
 * targetType `item` so Item History shows PO receipts (full and partial).
 */
async function logPoReceiptDeltasForItemHistory(
  before: admin.firestore.DocumentData,
  after: admin.firestore.DocumentData,
  poId: string
): Promise<void> {
  const beforeItems = Array.isArray(before.items) ? before.items : [];
  const afterItems = Array.isArray(after.items) ? after.items : [];
  const beforeQty = new Map<string, number>();
  for (const row of beforeItems) {
    const rec = row as { itemId?: unknown; receivedQuantity?: unknown };
    const id = typeof rec.itemId === 'string' ? rec.itemId : '';
    if (!id) continue;
    const rq = rec.receivedQuantity;
    const n = typeof rq === 'number' && !Number.isNaN(rq) ? rq : 0;
    beforeQty.set(id, n);
  }

  const beforeGrrLen = Array.isArray(before.grrReceipts) ? before.grrReceipts.length : 0;
  const afterGrr = Array.isArray(after.grrReceipts) ? after.grrReceipts : [];
  const newGrr =
    afterGrr.length > beforeGrrLen
      ? (afterGrr[afterGrr.length - 1] as { grrNumber?: string })
      : undefined;
  const grrSuffix = newGrr?.grrNumber ? ` · GRR ${newGrr.grrNumber}` : '';

  const poNum = typeof after.poNumber === 'string' ? after.poNumber : poId;
  const vendorName = typeof after.vendorName === 'string' ? after.vendorName : 'Vendor';
  const receivedBy = typeof after.receivedBy === 'string' ? after.receivedBy : 'system';
  const receivedByName =
    typeof after.receivedByName === 'string' ? after.receivedByName : 'System';

  for (const row of afterItems) {
    const rec = row as { itemId?: unknown; itemName?: unknown; itemSku?: unknown; receivedQuantity?: unknown };
    const itemId = typeof rec.itemId === 'string' ? rec.itemId : '';
    if (!itemId) continue;
    const prev = beforeQty.get(itemId) ?? 0;
    const rq = rec.receivedQuantity;
    const next = typeof rq === 'number' && !Number.isNaN(rq) ? rq : 0;
    const delta = next - prev;
    if (delta <= 0) continue;

    const itemName = typeof rec.itemName === 'string' ? rec.itemName : 'Item';
    const itemSku = typeof rec.itemSku === 'string' ? rec.itemSku : '';
    const display = itemSku ? `${itemName} (${itemSku})` : itemName;

    const itemSnap = await db.collection('items').doc(itemId).get();
    const afterCentralRaw = itemSnap.data()?.centralStoreQuantity;
    const afterCentral =
      typeof afterCentralRaw === 'number' && !Number.isNaN(afterCentralRaw)
        ? afterCentralRaw
        : null;
    const beforeCentral =
      afterCentral != null ? afterCentral - delta : null;

    const summary = `Received +${delta} on PO ${poNum} at Central Store${grrSuffix}`;
    const details = [
      `Vendor: ${vendorName}`,
      `PO: ${poNum}`,
      `Quantity this receipt: ${delta} (cumulative on PO: ${next})`,
      'Stock added at: Central Store',
      beforeCentral != null && afterCentral != null
        ? `Central store when updating: ${beforeCentral} → ${afterCentral} after`
        : '',
    ]
      .filter((s) => s.length > 0)
      .join('\n');

    const changes: Array<{
      field: string;
      fieldLabel: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [
      {
        field: 'receivedQuantity',
        fieldLabel: 'Received quantity on PO',
        oldValue: prev,
        newValue: next,
      },
    ];
    if (beforeCentral != null && afterCentral != null) {
      changes.push({
        field: 'centralStoreQuantity',
        fieldLabel: 'Central store quantity',
        oldValue: beforeCentral,
        newValue: afterCentral,
      });
    }

    await createActivityLog({
      userId: receivedBy,
      userName: receivedByName,
      userRole: 'StoreIncharge',
      actionType: 'po_received',
      actionCategory: 'purchase_orders',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: display,
      summary,
      details,
      changes,
    });
  }
}

/**
 * When a request moves to transferred, emit one item-scoped log per line so
 * Item History shows site / central-store movements with destination (and source for site→site).
 */
async function logRequestTransferItemsForItemHistory(
  before: admin.firestore.DocumentData,
  after: admin.firestore.DocumentData,
  requestId: string
): Promise<void> {
  if (before.status === 'transferred' || after.status !== 'transferred') {
    return;
  }
  const items = Array.isArray(after.items) ? after.items : [];
  const requestNumber =
    typeof after.requestNumber === 'string' ? after.requestNumber : requestId;
  const dest =
    typeof after.siteName === 'string' && after.siteName.trim().length > 0
      ? after.siteName
      : 'Site';
  const isSiteTransfer = after.requestType === 'site_transfer';
  const sourceLabel = isSiteTransfer
    ? typeof after.sourceSiteName === 'string' && after.sourceSiteName.trim().length > 0
      ? after.sourceSiteName
      : 'Source site'
    : 'Central Store';

  const uid =
    (typeof after.transferredBy === 'string' && after.transferredBy
      ? after.transferredBy
      : typeof after.processedBy === 'string'
        ? after.processedBy
        : null) ?? 'unknown';
  const uname =
    (typeof after.transferredByName === 'string' && after.transferredByName
      ? after.transferredByName
      : typeof after.processedByName === 'string'
        ? after.processedByName
        : null) ?? 'Unknown';

  for (const line of items) {
    const row = line as {
      itemId?: unknown;
      itemName?: unknown;
      itemSku?: unknown;
      quantityApproved?: unknown;
      quantityRequested?: unknown;
    };
    const itemId = typeof row.itemId === 'string' ? row.itemId : '';
    if (!itemId) continue;
    const qa = row.quantityApproved;
    const qr = row.quantityRequested;
    const qty =
      typeof qa === 'number' && qa > 0
        ? qa
        : typeof qr === 'number' && qr > 0
          ? qr
          : 0;
    if (qty <= 0) continue;

    const itemName = typeof row.itemName === 'string' ? row.itemName : 'Item';
    const itemSku = typeof row.itemSku === 'string' ? row.itemSku : '';
    const display = itemSku ? `${itemName} (${itemSku})` : itemName;

    const summary = `Transferred ${qty} to ${dest}`;
    const details = isSiteTransfer
      ? `Request ${requestNumber}: ${sourceLabel} → ${dest} (site-to-site)`
      : `Request ${requestNumber}: Central store → ${dest}`;

    let changes: ActivityChangeEntry[] = [];

    if (!isSiteTransfer) {
      const itemSnap = await db.collection('items').doc(itemId).get();
      const afterCentralRaw = itemSnap.data()?.centralStoreQuantity;
      const afterCentral =
        typeof afterCentralRaw === 'number' && !Number.isNaN(afterCentralRaw)
          ? afterCentralRaw
          : null;
      if (afterCentral != null) {
        const beforeCentral = afterCentral + qty;
        changes.push({
          field: 'centralStoreQuantity',
          fieldLabel: 'Central store quantity',
          oldValue: beforeCentral,
          newValue: afterCentral,
        });
      }
    }

    changes = await ensureCentralStoreContextInChanges(changes, itemId);

    await createActivityLog({
      userId: uid,
      userName: uname,
      userRole: 'StoreIncharge',
      actionType: 'item_transferred',
      actionCategory: 'inventory',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: display,
      summary,
      details,
      changes,
    });
  }
}

/**
 * When returnHistory grows, emit one item-targeted log per returned line (site → central store).
 */
async function logRequestReturnDeltasForItemHistory(
  before: admin.firestore.DocumentData,
  after: admin.firestore.DocumentData,
  requestId: string
): Promise<void> {
  const beforeHist = Array.isArray(before.returnHistory) ? before.returnHistory : [];
  const afterHist = Array.isArray(after.returnHistory) ? after.returnHistory : [];
  if (afterHist.length <= beforeHist.length) {
    return;
  }

  const newEvents = afterHist.slice(beforeHist.length) as Array<{
    returnedBy?: unknown;
    returnedByName?: unknown;
    items?: unknown;
    returnNotes?: unknown;
  }>;

  const requestNumber =
    typeof after.requestNumber === 'string' ? after.requestNumber : requestId;
  const siteName =
    typeof after.siteName === 'string' && after.siteName.trim().length > 0
      ? after.siteName
      : 'Site';

  for (const ev of newEvents) {
    const uid =
      typeof ev.returnedBy === 'string' && ev.returnedBy ? ev.returnedBy : 'unknown';
    const uname =
      typeof ev.returnedByName === 'string' && ev.returnedByName
        ? ev.returnedByName
        : 'Unknown';
    const notes =
      ev.returnNotes != null && String(ev.returnNotes).trim().length > 0
        ? String(ev.returnNotes)
        : '';
    const items = Array.isArray(ev.items) ? ev.items : [];

    for (const line of items) {
      const row = line as {
        itemId?: unknown;
        itemName?: unknown;
        quantityReturned?: unknown;
        condition?: unknown;
      };
      const itemId = typeof row.itemId === 'string' ? row.itemId : '';
      if (!itemId) continue;
      const qty =
        typeof row.quantityReturned === 'number' && !Number.isNaN(row.quantityReturned)
          ? row.quantityReturned
          : 0;
      if (qty <= 0) continue;

      const itemName = typeof row.itemName === 'string' ? row.itemName : 'Item';
      const cond =
        typeof row.condition === 'string' && row.condition ? row.condition : 'n/a';

      const summary = `Returned ${qty} from ${siteName} to Central Store`;
      const itemSnap = await db.collection('items').doc(itemId).get();
      const afterCentralRaw = itemSnap.data()?.centralStoreQuantity;
      const afterCentral =
        typeof afterCentralRaw === 'number' && !Number.isNaN(afterCentralRaw)
          ? afterCentralRaw
          : null;
      const beforeCentral =
        afterCentral != null ? afterCentral - qty : null;

      const details = [
        `Request ${requestNumber}`,
        `Condition: ${cond}`,
        notes ? `Notes: ${notes}` : '',
        beforeCentral != null && afterCentral != null
          ? `Central store when updating: ${beforeCentral} → ${afterCentral} after`
          : '',
      ]
        .filter((s) => s.length > 0)
        .join('\n');

      const changes: Array<{
        field: string;
        fieldLabel: string;
        oldValue: unknown;
        newValue: unknown;
      }> = [];
      if (beforeCentral != null && afterCentral != null) {
        changes.push({
          field: 'centralStoreQuantity',
          fieldLabel: 'Central store quantity',
          oldValue: beforeCentral,
          newValue: afterCentral,
        });
      }

      await createActivityLog({
        userId: uid,
        userName: uname,
        userRole: 'StoreIncharge',
        actionType: 'items_returned',
        actionCategory: 'requests',
        targetType: 'item',
        targetId: itemId,
        targetDisplay: itemName,
        summary,
        details,
        changes,
      });
    }
  }
}

/**
 * PO draft → pending_approval: item-level "submitted for approval" lines.
 */
async function logPoSubmittedLineItemsForItemHistory(
  before: admin.firestore.DocumentData,
  after: admin.firestore.DocumentData,
  poId: string
): Promise<void> {
  if (before.status !== 'draft' || after.status !== 'pending_approval') {
    return;
  }
  await emitPoSubmittedItemLogs(after, poId);
}

/** New PO created already in pending_approval (no draft step). */
async function logPoCreatedPendingLineItemsForItemHistory(
  po: admin.firestore.DocumentData,
  poId: string
): Promise<void> {
  if (po.status !== 'pending_approval') {
    return;
  }
  await emitPoSubmittedItemLogs(po, poId);
}

async function emitPoSubmittedItemLogs(
  po: admin.firestore.DocumentData,
  poId: string
): Promise<void> {
  const items = Array.isArray(po.items) ? po.items : [];
  const poNum = typeof po.poNumber === 'string' ? po.poNumber : poId;
  const vendorName = typeof po.vendorName === 'string' ? po.vendorName : 'Vendor';
  const uid = typeof po.createdBy === 'string' ? po.createdBy : 'system';
  const uname = typeof po.createdByName === 'string' ? po.createdByName : 'System';
  const role = (po.createdByRole as string) ?? 'StoreIncharge';

  for (const row of items) {
    const rec = row as {
      itemId?: unknown;
      itemName?: unknown;
      itemSku?: unknown;
      quantity?: unknown;
    };
    const itemId = typeof rec.itemId === 'string' ? rec.itemId : '';
    if (!itemId) continue;
    const qty = typeof rec.quantity === 'number' && !Number.isNaN(rec.quantity) ? rec.quantity : 0;
    if (qty <= 0) continue;
    const itemName = typeof rec.itemName === 'string' ? rec.itemName : 'Item';
    const itemSku = typeof rec.itemSku === 'string' ? rec.itemSku : '';
    const display = itemSku ? `${itemName} (${itemSku})` : itemName;

    const changes = await ensureCentralStoreContextInChanges([], itemId);

    await createActivityLog({
      userId: uid,
      userName: uname,
      userRole: role,
      actionType: 'po_submitted',
      actionCategory: 'purchase_orders',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: display,
      summary: `Listed on PO ${poNum} (pending approval) · qty ${qty}`,
      details: `Vendor: ${vendorName}\nPO ${poNum} submitted for approval.`,
      changes,
    });
  }
}

/**
 * PO approved: item-level lines (procurement intent approved; not yet received).
 */
async function logPoApprovedLineItemsForItemHistory(
  before: admin.firestore.DocumentData,
  after: admin.firestore.DocumentData,
  poId: string
): Promise<void> {
  if (before.status === 'approved' || after.status !== 'approved') {
    return;
  }
  const items = Array.isArray(after.items) ? after.items : [];
  const poNum = typeof after.poNumber === 'string' ? after.poNumber : poId;
  const vendorName = typeof after.vendorName === 'string' ? after.vendorName : 'Vendor';
  const uid = typeof after.reviewedBy === 'string' ? after.reviewedBy : 'system';
  const uname = typeof after.reviewedByName === 'string' ? after.reviewedByName : 'System';

  for (const row of items) {
    const rec = row as {
      itemId?: unknown;
      itemName?: unknown;
      itemSku?: unknown;
      quantity?: unknown;
    };
    const itemId = typeof rec.itemId === 'string' ? rec.itemId : '';
    if (!itemId) continue;
    const qty = typeof rec.quantity === 'number' && !Number.isNaN(rec.quantity) ? rec.quantity : 0;
    if (qty <= 0) continue;
    const itemName = typeof rec.itemName === 'string' ? rec.itemName : 'Item';
    const itemSku = typeof rec.itemSku === 'string' ? rec.itemSku : '';
    const display = itemSku ? `${itemName} (${itemSku})` : itemName;

    const changes = await ensureCentralStoreContextInChanges([], itemId);

    await createActivityLog({
      userId: uid,
      userName: uname,
      userRole: 'Admin',
      actionType: 'po_approved',
      actionCategory: 'purchase_orders',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: display,
      summary: `Approved on PO ${poNum} · ordered qty ${qty}`,
      details: `Vendor: ${vendorName}\nPO ${poNum} approved (not yet received).`,
      changes,
    });
  }
}

/**
 * Mirror maintenance events to item-targeted logs for Item History.
 */
async function logMaintenanceItemScopedMirror(
  maintenance: admin.firestore.DocumentData,
  maintenanceId: string,
  kind: 'added' | 'returned' | 'written_off'
): Promise<void> {
  const itemId = typeof maintenance.itemId === 'string' ? maintenance.itemId : '';
  if (!itemId) return;

  const itemName = typeof maintenance.itemName === 'string' ? maintenance.itemName : 'Item';
  const itemSku = typeof maintenance.itemSku === 'string' ? maintenance.itemSku : '';
  const display = itemSku ? `${itemName} (${itemSku})` : itemName;
  const qty =
    typeof maintenance.quantity === 'number' && !Number.isNaN(maintenance.quantity)
      ? maintenance.quantity
      : 0;

  const uid = typeof maintenance.addedBy === 'string' ? maintenance.addedBy : 'unknown';
  const uname = typeof maintenance.addedByName === 'string' ? maintenance.addedByName : 'Unknown';

  if (kind === 'added') {
    const changes = await ensureCentralStoreContextInChanges([], itemId);
    await createActivityLog({
      userId: uid,
      userName: uname,
      userRole: 'StoreIncharge',
      actionType: 'maintenance_added',
      actionCategory: 'maintenance',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: display,
      summary: `Sent ${qty} unit(s) to maintenance (ticket ${maintenanceId})`,
      details: typeof maintenance.issueDescription === 'string' ? maintenance.issueDescription : '',
      changes,
    });
    return;
  }

  if (kind === 'returned') {
    const returnedQty =
      typeof maintenance.returnedQuantity === 'number' && !Number.isNaN(maintenance.returnedQuantity)
        ? maintenance.returnedQuantity
        : qty;
    const repair =
      typeof maintenance.repairSummary === 'string' ? maintenance.repairSummary : '';
    const changes = await ensureCentralStoreContextInChanges([], itemId);
    await createActivityLog({
      userId: uid,
      userName: uname,
      userRole: 'StoreIncharge',
      actionType: 'maintenance_returned',
      actionCategory: 'maintenance',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: display,
      summary: `Returned ${returnedQty} unit(s) from maintenance to Central Store`,
      details: repair,
      changes,
    });
    return;
  }

  // written_off
  const reason =
    typeof maintenance.writeOffReason === 'string' ? maintenance.writeOffReason : 'N/A';
  const expl =
    typeof maintenance.writeOffExplanation === 'string' ? maintenance.writeOffExplanation : '';
  const changes = await ensureCentralStoreContextInChanges([], itemId);
  await createActivityLog({
    userId: uid,
    userName: uname,
    userRole: 'StoreIncharge',
    actionType: 'item_written_off',
    actionCategory: 'maintenance',
    targetType: 'item',
    targetId: itemId,
    targetDisplay: display,
    summary: `Written off from maintenance (${reason})`,
    details: expl,
    changes,
  });
}

/**
 * Firestore Trigger: Log Item Creation
 * Triggered when a new document is created in items collection
 */
/**
 * Keep nameSearch / skuSearch in sync for case-insensitive catalog search.
 * Backfills legacy documents on any write; idempotent (skips when already correct).
 */
export const onItemSearchFieldsSync = onDocumentWritten('items/{itemId}', async (event) => {
  const afterSnap = event.data?.after;
  if (!afterSnap?.exists) {
    return;
  }
  const d = afterSnap.data() as Record<string, unknown>;
  const name = typeof d.name === 'string' ? d.name : '';
  const sku = typeof d.sku === 'string' ? d.sku : '';
  const nameSearch = name.toLowerCase();
  const skuSearch = sku.toLowerCase();
  if (d.nameSearch === nameSearch && d.skuSearch === skuSearch) {
    return;
  }
  try {
    await afterSnap.ref.update({ nameSearch, skuSearch });
  } catch (e) {
    logger.error('onItemSearchFieldsSync failed', { e, itemId: event.params.itemId });
  }
});

export const onItemCreated = onDocumentCreated(
  'items/{itemId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onItemCreated: No data associated with the event');
      return;
    }

    const item = snapshot.data();
    const itemId = event.params.itemId;

    const csRaw = item.centralStoreQuantity;
    const cs =
      typeof csRaw === 'number' && !Number.isNaN(csRaw) ? csRaw : 0;

    await createActivityLog({
      userId: item.createdBy ?? 'system',
      userName: item.createdByName ?? 'System',
      userRole: item.createdByRole ?? 'Admin',
      actionType: 'item_created',
      actionCategory: 'inventory',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: `${item.name ?? 'Item'} (${item.sku ?? itemId})`,
      summary: `Created item: ${item.name ?? 'Item'}`,
      details: `Added new ${item.type ?? 'item'} to ${item.categoryName ?? 'category'}`,
      changes: [
        {
          field: 'contextCentralStore',
          fieldLabel: 'Item master — central store total',
          oldValue: cs,
          newValue: cs,
        },
      ],
    });
  }
);

/**
 * Firestore Trigger: Log Request Creation
 * Triggered when a new document is created in requests collection
 */
export const onRequestCreated = onDocumentCreated(
  'requests/{requestId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onRequestCreated: No data associated with the event');
      return;
    }

    const request = snapshot.data();
    const requestId = event.params.requestId;

    const itemsCount = Array.isArray(request.items) ? request.items.length : 0;

    await createActivityLog({
      userId: request.requestedBy ?? 'unknown',
      userName: request.requestedByName ?? 'Unknown',
      userRole: 'SiteManager',
      actionType: 'request_created',
      actionCategory: 'requests',
      targetType: 'request',
      targetId: requestId,
      targetDisplay: request.requestNumber ?? `REQ-${requestId}`,
      summary: `Created request: ${request.requestNumber ?? requestId}`,
      details: `Request for ${itemsCount} items (${request.priority ?? 'normal'} priority)`,
      changes: [],
    });

    if (request.status === 'pending') {
      try {
        const requestedBy = request.requestedBy as string | undefined;
        const title = 'New Request';
        const body = `${request.requestedByName ?? 'Someone'} submitted request ${request.requestNumber ?? requestId}`;
        const pushData = { screen: 'RequestQueue', requestId };
        const userIds = await getRequestQueueStaffInAppUserIds(requestedBy);
        for (const uid of userIds) {
          await createInAppNotification(uid, 'new_request', title, body, pushData);
        }
        const tokens = await getRequestAlertPushTokens('requestUpdates', requestedBy);
        if (tokens.length > 0) {
          await sendExpoPushNotification(tokens, title, body, pushData);
        }
      } catch (notifErr) {
        logger.error('Push failed for new request', { notifErr, requestId });
      }
    }
  }
);

/**
 * Firestore Trigger: Log Request Updates
 * Triggered when a request document is updated (status changes or draft edits)
 */
export const onRequestUpdated = onDocumentUpdated(
  'requests/{requestId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const requestId = event.params.requestId;

    await logRequestReturnDeltasForItemHistory(before, after, requestId);

    // Log status changes
    if (before.status !== after.status) {
      let actionType = 'request_edited';
      let summary = `Request ${after.requestNumber ?? requestId} status changed`;

      if (after.status === 'approved') {
        actionType = 'request_approved';
        summary = `Approved request: ${after.requestNumber ?? requestId}`;
      } else if (after.status === 'rejected') {
        actionType = 'request_rejected';
        summary = `Rejected request: ${after.requestNumber ?? requestId}`;
      } else if (after.status === 'transferred') {
        actionType = 'request_transferred';
        summary = `Transferred items for request: ${after.requestNumber ?? requestId}`;
      } else if (after.status === 'returned') {
        actionType = 'items_returned';
        summary = `Items returned for request: ${after.requestNumber ?? requestId}`;
      } else if (after.status === 'cancelled') {
        actionType = 'request_cancelled';
        summary = `Cancelled request: ${after.requestNumber ?? requestId}`;
      }

      await createActivityLog({
        userId: after.processedBy ?? after.requestedBy ?? 'unknown',
        userName: after.processedByName ?? after.requestedByName ?? 'Unknown',
        userRole: after.processedByRole ?? 'SiteManager',
        actionType,
        actionCategory: 'requests',
        targetType: 'request',
        targetId: requestId,
        targetDisplay: after.requestNumber ?? requestId,
        summary,
        details: after.storeNotes ?? after.rejectionComments ?? '',
        changes: [
          {
            field: 'status',
            fieldLabel: 'Status',
            oldValue: before.status,
            newValue: after.status,
          },
        ],
      });

      await logRequestTransferItemsForItemHistory(before, after, requestId);

      // Push notifications for request status changes (exclude actor: don't notify processedBy)
      const requestNumber = after.requestNumber ?? requestId;
      const pushData = { screen: 'ProcessRequest', requestId };
      const requestedBy = after.requestedBy as string | undefined;
      const processedBy = after.processedBy as string | undefined;
      const shouldNotifyRequester = requestedBy && requestedBy !== processedBy;
      try {
        if (after.status === 'approved' && shouldNotifyRequester) {
          const tokens = await getUserPushTokens(requestedBy!, 'requestUpdates');
          if (tokens.length > 0) {
            await createInAppNotification(
              requestedBy!,
              'request_approved',
              'Request Approved',
              `Your request ${requestNumber} has been approved.`,
              pushData
            );
            await sendExpoPushNotification(tokens, 'Request Approved',
              `Your request ${requestNumber} has been approved.`,
              pushData);
          }
        } else if (after.status === 'rejected' && shouldNotifyRequester) {
          const tokens = await getUserPushTokens(requestedBy!, 'requestUpdates');
          if (tokens.length > 0) {
            await createInAppNotification(
              requestedBy!,
              'request_rejected',
              'Request Rejected',
              `Your request ${requestNumber} was rejected.`,
              pushData
            );
            await sendExpoPushNotification(tokens, 'Request Rejected',
              `Your request ${requestNumber} was rejected.`,
              pushData);
          }
        } else if (after.status === 'transferred' && shouldNotifyRequester) {
          const tokens = await getUserPushTokens(requestedBy!, 'requestUpdates');
          if (tokens.length > 0) {
            await createInAppNotification(
              requestedBy!,
              'request_transferred',
              'Items Transferred',
              `Items for request ${requestNumber} have been transferred.`,
              pushData
            );
            await sendExpoPushNotification(tokens, 'Items Transferred',
              `Items for request ${requestNumber} have been transferred.`,
              pushData);
          }
        } else if (after.status === 'returned' || after.status === 'partially_returned') {
          const processedBy = after.processedBy as string | undefined;
          const userIds = await getRequestQueueStaffInAppUserIds(processedBy);
          for (const uid of userIds) {
            await createInAppNotification(
              uid,
              'items_returned',
              'Items Returned',
              `Items returned for request ${requestNumber}.`,
              pushData
            );
          }
          const tokens = await getRequestAlertPushTokens('requestUpdates', processedBy);
          if (tokens.length > 0) {
            await sendExpoPushNotification(tokens, 'Items Returned',
              `Items returned for request ${requestNumber}.`,
              pushData);
          }
        }
      } catch (notifErr) {
        logger.error('Push notification failed', { notifErr, requestId });
      }
      return;
    }

    const custodyAnalysis = analyzeSupervisorCustodyItemsChange(before.items, after.items);
    const hasNonCustodyFieldsChanged =
      before.priority !== after.priority || before.storeNotes !== after.storeNotes;

    if (
      custodyAnalysis.isSupervisorOnly &&
      custodyAnalysis.deltas.length > 0 &&
      !hasNonCustodyFieldsChanged
    ) {
      const requestNumber = String(after.requestNumber ?? requestId);
      const actorId = String(
        after.lastSupervisorCustodyUpdateBy ?? after.requestedBy ?? 'unknown'
      );
      const actorName = String(
        after.lastSupervisorCustodyUpdateByName ?? after.requestedByName ?? 'Unknown'
      );
      const deltas = custodyAnalysis.deltas;
      const summaryLines = deltas.map((d) => {
        const delta = d.newSup - d.oldSup;
        const abs = Math.abs(delta);
        if (delta > 0) {
          return `Assigned ${abs} unit(s) of ${d.itemName} to supervisor custody (total with supervisors: ${d.oldSup} → ${d.newSup})`;
        }
        return `Recorded ${abs} unit(s) of ${d.itemName} returned from supervisor custody (total with supervisors: ${d.oldSup} → ${d.newSup})`;
      });
      const summary =
        deltas.length === 1
          ? `${requestNumber}: ${summaryLines[0]}`
          : `${requestNumber}: Supervisor custody updated (${deltas.length} line items)`;
      const details = summaryLines.join('\n');

      const changesCustody = deltas.map((d) => ({
        field: `items[${d.itemId}].supervisorOutstandingQty`,
        fieldLabel: `Supervisor custody — ${d.itemName}`,
        oldValue: d.oldSup,
        newValue: d.newSup,
      }));

      await createActivityLog({
        userId: actorId,
        userName: actorName,
        userRole: 'SiteManager',
        actionType: 'supervisor_custody_updated',
        actionCategory: 'requests',
        targetType: 'request',
        targetId: requestId,
        targetDisplay: requestNumber,
        summary,
        details,
        changes: changesCustody,
      });
      return;
    }

    // Log draft edits (status unchanged but items, priority, etc. changed)
    const changes: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }> = [];
    const supDeltas = findSupervisorCustodyDeltas(before.items, after.items);
    if (JSON.stringify(before.items) !== JSON.stringify(after.items)) {
      for (const d of supDeltas) {
        changes.push({
          field: `items[${d.itemId}].supervisorOutstandingQty`,
          fieldLabel: `Supervisor custody — ${d.itemName}`,
          oldValue: d.oldSup,
          newValue: d.newSup,
        });
      }
      changes.push({
        field: 'items',
        fieldLabel: 'Items (line count)',
        oldValue: Array.isArray(before.items) ? before.items.length : 0,
        newValue: Array.isArray(after.items) ? after.items.length : 0,
      });
    }
    if (before.priority !== after.priority) {
      changes.push({
        field: 'priority',
        fieldLabel: 'Priority',
        oldValue: before.priority,
        newValue: after.priority,
      });
    }
    if (before.storeNotes !== after.storeNotes) {
      changes.push({
        field: 'storeNotes',
        fieldLabel: 'Store Notes',
        oldValue: before.storeNotes ?? '',
        newValue: after.storeNotes ?? '',
      });
    }

    if (changes.length > 0) {
      const requestNumber = String(after.requestNumber ?? requestId);
      const detailsParts: string[] = [];
      if (after.storeNotes) detailsParts.push(String(after.storeNotes));
      if (supDeltas.length > 0) {
        const custodyLines = supDeltas.map((d) => {
          const delta = d.newSup - d.oldSup;
          const abs = Math.abs(delta);
          if (delta > 0) {
            return `Supervisor custody +${abs} on ${d.itemName} (${d.oldSup} → ${d.newSup})`;
          }
          return `Supervisor custody −${abs} on ${d.itemName} (${d.oldSup} → ${d.newSup})`;
        });
        detailsParts.push(custodyLines.join('\n'));
      }
      const details = detailsParts.filter(Boolean).join('\n\n');

      const summary =
        supDeltas.length > 0
          ? `${requestNumber}: Request updated (includes supervisor custody on ${supDeltas.length} line item(s))`
          : `Edited request: ${requestNumber}`;

      await createActivityLog({
        userId: after.requestedBy ?? 'unknown',
        userName: after.requestedByName ?? 'Unknown',
        userRole: 'SiteManager',
        actionType: 'request_edited',
        actionCategory: 'requests',
        targetType: 'request',
        targetId: requestId,
        targetDisplay: requestNumber,
        summary,
        details,
        changes,
      });

      const processedBy = after.processedBy as string | undefined;
      const requestedBy = after.requestedBy as string | undefined;
      if (
        requestedBy &&
        requestedBy !== processedBy &&
        processedBy
      ) {
        try {
          const tokens = await getUserPushTokens(requestedBy, 'requestUpdates');
          if (tokens.length > 0) {
            const requestNumber = after.requestNumber ?? requestId;
            const title = 'Request Edited';
            const body = `Request ${requestNumber} was modified by Store`;
            const pushData = { screen: 'ProcessRequest', requestId };
            await createInAppNotification(
              requestedBy,
              'request_edited',
              title,
              body,
              pushData
            );
            await sendExpoPushNotification(tokens, title, body, pushData);
          }
        } catch (notifErr) {
          logger.error('Push failed for request edited', { notifErr, requestId });
        }
      }
    }
  }
);

/**
 * Firestore Trigger: Log Maintenance Addition
 * Triggered when a new document is created in maintenance collection
 */
export const onMaintenanceAdded = onDocumentCreated(
  'maintenance/{maintenanceId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onMaintenanceAdded: No data associated with the event');
      return;
    }

    const maintenance = snapshot.data();
    const maintenanceId = event.params.maintenanceId;

    await createActivityLog({
      userId: maintenance.addedBy ?? 'unknown',
      userName: maintenance.addedByName ?? 'Unknown',
      userRole: 'StoreIncharge',
      actionType: 'maintenance_added',
      actionCategory: 'maintenance',
      targetType: 'maintenance',
      targetId: maintenanceId,
      targetDisplay: `${maintenance.itemName ?? 'Item'} (${maintenance.quantity ?? 0} units)`,
      summary: `Moved ${maintenance.quantity ?? 0} ${maintenance.itemName ?? 'items'} to maintenance`,
      details: maintenance.issueDescription ?? '',
      changes: [],
    });

    await logMaintenanceItemScopedMirror(maintenance, maintenanceId, 'added');

    try {
      const addedBy = maintenance.addedBy as string | undefined;
      const tokens = await getAdminAndStoreInchargeTokens(
        'maintenanceAlerts',
        addedBy
      );
      if (tokens.length > 0) {
        const addedByName = maintenance.addedByName ?? 'Someone';
        const quantity = maintenance.quantity ?? 0;
        const itemName = maintenance.itemName ?? 'item';
        const title = 'New Maintenance';
        const body = `${addedByName} moved ${quantity} ${itemName} to maintenance`;
        const pushData = { screen: 'Maintenance', maintenanceId };
        const userIds = await getAdminAndStoreInchargeUserIds(addedBy);
        for (const uid of userIds) {
          await createInAppNotification(uid, 'maintenance_added', title, body, pushData);
        }
        await sendExpoPushNotification(tokens, title, body, pushData);
      }
    } catch (notifErr) {
      logger.error('Push failed for new maintenance', { notifErr, maintenanceId });
    }
  }
);

/**
 * Firestore Trigger: Log User Creation
 * Triggered when a new document is created in users collection (signup)
 */
export const onUserCreated = onDocumentCreated(
  'users/{userId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onUserCreated: No data associated with the event');
      return;
    }

    const user = snapshot.data();
    const userId = event.params.userId;

    await createActivityLog({
      userId,
      userName: user.displayName ?? user.email ?? 'Unknown',
      userRole: (user.role as string) ?? 'Unassigned',
      actionType: 'user_created',
      actionCategory: 'users',
      targetType: 'user',
      targetId: userId,
      targetDisplay: user.displayName ?? user.email ?? userId,
      summary: `User created: ${user.displayName ?? user.email ?? userId}`,
      details: 'New user signed up',
      changes: [],
    });

    try {
      const tokens = await getAdminAndStoreInchargeTokens(
        'userUpdates',
        userId
      );
      if (tokens.length > 0) {
        const displayName = user.displayName ?? user.email ?? 'Unknown';
        const role = (user.role as string) ?? 'Unassigned';
        const title = 'New User Signed Up';
        const body = `${displayName} joined as ${role}`;
        const pushData = { screen: 'Users' };
        const userIds = await getAdminAndStoreInchargeUserIds(userId);
        for (const uid of userIds) {
          await createInAppNotification(uid, 'new_user_signup', title, body, pushData);
        }
        await sendExpoPushNotification(tokens, title, body, pushData);
      }
    } catch (notifErr) {
      logger.error('Push failed for new user signup', { notifErr, userId });
    }
  }
);

/**
 * Firestore Trigger: Log User Updates
 * Triggered when a user document is updated (role, active status, etc.)
 */
export const onUserUpdated = onDocumentUpdated(
  'users/{userId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const userId = event.params.userId;
    const changes: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }> = [];

    if (before.role !== after.role) {
      changes.push({
        field: 'role',
        fieldLabel: 'Role',
        oldValue: before.role,
        newValue: after.role,
      });
    }
    if (before.isActive !== after.isActive) {
      changes.push({
        field: 'isActive',
        fieldLabel: 'Active Status',
        oldValue: before.isActive,
        newValue: after.isActive,
      });
    }
    if (before.isDeleted !== after.isDeleted) {
      changes.push({
        field: 'isDeleted',
        fieldLabel: 'Deleted Status',
        oldValue: before.isDeleted,
        newValue: after.isDeleted,
      });
    }

    const isDeactivated = before.isActive !== false && after.isActive === false;
    const isDeleted = before.isDeleted !== true && after.isDeleted === true;
    const isRoleChanged = before.role === 'SiteManager' && after.role !== 'SiteManager';

    if (isDeactivated || isDeleted || isRoleChanged) {
      try {
        const sitesSnapshot = await db.collection('sites').where('managerId', '==', userId).get();
        if (!sitesSnapshot.empty) {
          const batch = db.batch();
          sitesSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
              managerId: null,
              managerName: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          logger.info(`Cleaned up ${sitesSnapshot.size} sites for deactivated/deleted user ${userId}`);
        }
      } catch (error) {
        logger.error('Failed to cleanup manager assignments', { error, userId });
      }
    }

    if (isDeleted) {
      try {
        await admin.auth().deleteUser(userId);
        logger.info(`Deleted Auth user for deleted Firestore user ${userId}`);
      } catch (error) {
        logger.error('Failed to delete Auth account', { error, userId });
      }
    }

    if (changes.length === 0) {
      return;
    }

    let actionType = 'user_updated';
    let summary = `User updated: ${after.displayName ?? after.email ?? userId}`;

    if (changes.length === 1 && changes[0].field === 'isActive') {
      actionType = after.isActive ? 'user_enabled' : 'user_disabled';
      summary = after.isActive
        ? `User enabled: ${after.displayName ?? after.email ?? userId}`
        : `User disabled: ${after.displayName ?? after.email ?? userId}`;
    }

    await createActivityLog({
      userId: 'system',
      userName: 'System',
      userRole: 'Admin',
      actionType,
      actionCategory: 'users',
      targetType: 'user',
      targetId: userId,
      targetDisplay: after.displayName ?? after.email ?? userId,
      summary,
      details: '',
      changes,
    });

    const targetName = after.displayName ?? after.email ?? userId;
    const updatedBy = after.updatedBy as string | undefined;

    try {
      if (isDeleted) {
        const tokens = await getAdminOnlyTokens('userUpdates');
        if (tokens.length > 0) {
          const title = 'User Deleted Account';
          const body = `${targetName} deleted their account`;
          const pushData = { screen: 'Users' };
          const userIds = await getAdminOnlyUserIds();
          for (const uid of userIds) {
            await createInAppNotification(
              uid,
              'user_deleted',
              title,
              body,
              pushData
            );
          }
          await sendExpoPushNotification(tokens, title, body, pushData);
        }
      } else if (isDeactivated) {
        const tokens = await getAdminOnlyTokens('userUpdates', updatedBy);
        if (tokens.length > 0) {
          const title = 'User Deactivated';
          const body = `${targetName} was deactivated`;
          const pushData = { screen: 'Users' };
          const userIds = await getAdminOnlyUserIds(updatedBy);
          for (const uid of userIds) {
            await createInAppNotification(
              uid,
              'user_deactivated',
              title,
              body,
              pushData
            );
          }
          await sendExpoPushNotification(tokens, title, body, pushData);
        }
      } else if (before.isActive === false && after.isActive === true) {
        const tokens = await getAdminOnlyTokens('userUpdates', updatedBy);
        if (tokens.length > 0) {
          const title = 'User Re-enabled';
          const body = `${targetName} was re-enabled`;
          const pushData = { screen: 'Users' };
          const userIds = await getAdminOnlyUserIds(updatedBy);
          for (const uid of userIds) {
            await createInAppNotification(
              uid,
              'user_enabled',
              title,
              body,
              pushData
            );
          }
          await sendExpoPushNotification(tokens, title, body, pushData);
        }
      } else if (before.role !== after.role) {
        const tokens = await getAdminOnlyTokens('userUpdates', updatedBy);
        if (tokens.length > 0) {
          const title = 'User Role Changed';
          const body = `${targetName} role changed to ${after.role}`;
          const pushData = { screen: 'Users' };
          const userIds = await getAdminOnlyUserIds(updatedBy);
          for (const uid of userIds) {
            await createInAppNotification(
              uid,
              'user_role_changed',
              title,
              body,
              pushData
            );
          }
          await sendExpoPushNotification(tokens, title, body, pushData);
        }
      }
    } catch (notifErr) {
      logger.error('Push failed for user update', { notifErr, userId });
    }
  }
);

/**
 * Firestore Trigger: Log Site Creation
 */
export const onSiteCreated = onDocumentCreated(
  'sites/{siteId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onSiteCreated: No data associated with the event');
      return;
    }

    const site = snapshot.data();
    const siteId = event.params.siteId;

    await createActivityLog({
      userId: site.createdBy ?? 'system',
      userName: site.createdByName ?? 'System',
      userRole: (site.createdByRole as string) ?? 'Admin',
      actionType: 'site_created',
      actionCategory: 'sites',
      targetType: 'site',
      targetId: siteId,
      targetDisplay: site.name ?? siteId,
      summary: `Site created: ${site.name ?? siteId}`,
      details: site.description ?? site.address ?? '',
      changes: [],
    });
  }
);

/**
 * Firestore Trigger: Log Site Updates
 */
export const onSiteUpdated = onDocumentUpdated(
  'sites/{siteId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const siteId = event.params.siteId;
    const changes: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }> = [];

    if (before.name !== after.name) {
      changes.push({ field: 'name', fieldLabel: 'Name', oldValue: before.name, newValue: after.name });
    }
    if (before.status !== after.status) {
      changes.push({ field: 'status', fieldLabel: 'Status', oldValue: before.status, newValue: after.status });
    }
    if (before.managerId !== after.managerId) {
      changes.push({
        field: 'managerId',
        fieldLabel: 'Manager',
        oldValue: before.managerName ?? before.managerId,
        newValue: after.managerName ?? after.managerId,
      });
    }

    if (changes.length === 0) {
      return;
    }

    const actionType = before.status !== after.status ? 'site_status_changed' : 'site_updated';
    const summary =
      actionType === 'site_status_changed'
        ? `Site status changed: ${after.name ?? siteId}`
        : `Site updated: ${after.name ?? siteId}`;

    await createActivityLog({
      userId: after.updatedBy ?? 'system',
      userName: after.updatedByName ?? 'System',
      userRole: (after.updatedByRole as string) ?? 'Admin',
      actionType,
      actionCategory: 'sites',
      targetType: 'site',
      targetId: siteId,
      targetDisplay: after.name ?? siteId,
      summary,
      details: '',
      changes,
    });
  }
);

/**
 * Firestore Trigger: Log Item Updates
 */
export const onItemUpdated = onDocumentUpdated(
  'items/{itemId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const itemId = event.params.itemId;
    const changes: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }> = [];

    const fieldsToCompare = [
      'name',
      'sku',
      'description',
      'categoryId',
      'categoryName',
      'type',
      'status',
      'totalQuantity',
      'centralStoreQuantity',
      'atSitesQuantity',
    ];
    const fieldLabelMap: Record<string, string> = {
      centralStoreQuantity: 'Central store quantity',
      atSitesQuantity: 'Quantity at sites',
      totalQuantity: 'Total quantity',
    };
    for (const field of fieldsToCompare) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        changes.push({
          field,
          fieldLabel: fieldLabelMap[field] ?? field.charAt(0).toUpperCase() + field.slice(1),
          oldValue: before[field],
          newValue: after[field],
        });
      }
    }

    if (changes.length === 0) {
      return;
    }

    await createActivityLog({
      userId: after.updatedBy ?? after.createdBy ?? 'system',
      userName: after.updatedByName ?? after.createdByName ?? 'System',
      userRole: (after.updatedByRole ?? after.createdByRole) as string ?? 'Admin',
      actionType: 'item_updated',
      actionCategory: 'inventory',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: `${after.name ?? 'Item'} (${after.sku ?? itemId})`,
      summary: `Updated item: ${after.name ?? 'Item'}`,
      details: `Modified ${changes.length} field(s)`,
      changes,
    });

    // Keep denormalized inventory location rows in sync with item master name/SKU
    try {
      if (before.name !== after.name || before.sku !== after.sku) {
        const invSnap = await db.collection('inventory').where('itemId', '==', itemId).get();
        const newName = (after.name as string | undefined) ?? '';
        const newSku = (after.sku as string | undefined) ?? '';
        const batchLimit = 500;
        let batch = db.batch();
        let opCount = 0;
        for (const doc of invSnap.docs) {
          batch.update(doc.ref, {
            itemName: newName,
            itemSku: newSku,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          opCount++;
          if (opCount >= batchLimit) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
          }
        }
        if (opCount > 0) {
          await batch.commit();
        }
      }
    } catch (syncErr) {
      logger.error('Inventory denormalized name/sku sync failed', { syncErr, itemId });
    }

    // Low stock / critical stock alert: notify when item JUST crossed threshold
    try {
      const centralStoreQtyBefore = (before.centralStoreQuantity ?? 0) as number;
      const centralStoreQtyAfter = (after.centralStoreQuantity ?? 0) as number;
      const minStockBefore = (before.minStockLevel ?? 0) as number;
      const minStockAfter = (after.minStockLevel ?? 0) as number;
      const criticalThreshold = Math.max(0, Math.floor(minStockAfter / 2));

      const centralStoreQuantityChanged = centralStoreQtyBefore !== centralStoreQtyAfter;
      const isNowLowStock = centralStoreQtyAfter <= minStockAfter;
      const isNowCritical = centralStoreQtyAfter <= criticalThreshold;
      const wasAboveMin = centralStoreQtyBefore > minStockBefore;
      const wasAboveCritical = centralStoreQtyBefore > criticalThreshold;

      const updatedBy = after.updatedBy as string | undefined;

      if (centralStoreQuantityChanged && wasAboveMin) {
        // Critical takes precedence over low stock
        const criticalCrossed = isNowCritical && wasAboveCritical;
        const lowCrossed = isNowLowStock && !criticalCrossed;

        if (criticalCrossed || lowCrossed) {
          const itemName = after.name ?? 'Item';
          const itemSku = after.sku ?? itemId;
          const pushData = { screen: 'ItemDetail', itemId };
          const tokens = await getAdminAndStoreInchargeTokens(
            'stockAlerts',
            updatedBy
          );
          const userIds = await getAdminAndStoreInchargeUserIds(updatedBy);

          if (criticalCrossed && tokens.length > 0) {
            const title = 'Stock Critical';
            const body = `${itemName} (${itemSku}) is critically low (${centralStoreQtyAfter} left)`;
            await sendExpoPushNotification(tokens, title, body, pushData);
            for (const uid of userIds) {
              await createInAppNotification(
                uid,
                'stock_critical_alert',
                title,
                body,
                pushData
              );
            }
          } else if (lowCrossed && tokens.length > 0) {
            const title = 'Low Stock Alert';
            const body = `${itemName} (${itemSku}) is below minimum level (${centralStoreQtyAfter}/${minStockAfter})`;
            await sendExpoPushNotification(tokens, title, body, pushData);
            for (const uid of userIds) {
              await createInAppNotification(
                uid,
                'low_stock_alert',
                title,
                body,
                pushData
              );
            }
          }
        }
      }
    } catch (notifErr) {
      logger.error('Low stock notification failed', { notifErr, itemId });
    }
  }
);

/**
 * Firestore Trigger: Log Custom Item Creation
 */
export const onSteelMasterCreated = onDocumentCreated(
  'steelMaster/{steelMasterId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onSteelMasterCreated: No data associated with the event');
      return;
    }

    const steel = snapshot.data();
    const steelMasterId = event.params.steelMasterId;

    await createActivityLog({
      userId: steel.createdBy ?? 'system',
      userName: steel.createdByName ?? 'System',
      userRole: (steel.createdByRole as string) ?? 'Admin',
      actionType: 'steel_master_created',
      actionCategory: 'inventory',
      targetType: 'item',
      targetId: steelMasterId,
      targetDisplay: steel.name ?? steelMasterId,
      summary: `Custom item created: ${steel.name ?? steelMasterId}`,
      details: `Weight: ${steel.weightPerMeter ?? 0} kg/m`,
      changes: [],
    });
  }
);

/**
 * Firestore Trigger: Log Custom Item Updates
 */
export const onSteelMasterUpdated = onDocumentUpdated(
  'steelMaster/{steelMasterId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const steelMasterId = event.params.steelMasterId;
    const changes: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }> = [];

    const fieldsToCompare = ['name', 'weightPerMeter', 'defaultLength', 'hsnCode', 'isActive'];
    for (const field of fieldsToCompare) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        changes.push({
          field,
          fieldLabel: field.charAt(0).toUpperCase() + field.slice(1),
          oldValue: before[field],
          newValue: after[field],
        });
      }
    }

    if (changes.length === 0) {
      return;
    }

    await createActivityLog({
      userId: after.updatedBy ?? 'system',
      userName: after.updatedByName ?? 'System',
      userRole: (after.updatedByRole as string) ?? 'Admin',
      actionType: 'steel_master_updated',
      actionCategory: 'inventory',
      targetType: 'item',
      targetId: steelMasterId,
      targetDisplay: after.name ?? steelMasterId,
      summary: `Custom item updated: ${after.name ?? steelMasterId}`,
      details: `Modified ${changes.length} field(s)`,
      changes,
    });
  }
);

/**
 * Tombstone: catalog item removed (audit / admin feed; item doc no longer exists).
 */
export const onItemDeleted = onDocumentDeleted('items/{itemId}', async (event) => {
  const snap = event.data;
  if (!snap) {
    return;
  }
  const d = snap.data();
  const itemId = event.params.itemId;
  const name = typeof d.name === 'string' ? d.name : 'Item';
  const sku = typeof d.sku === 'string' ? d.sku : '';
  const display = sku ? `${name} (${sku})` : name;
  const uid =
    typeof d.updatedBy === 'string'
      ? d.updatedBy
      : typeof d.createdBy === 'string'
        ? d.createdBy
        : 'system';
  const uname =
    typeof d.updatedByName === 'string'
      ? d.updatedByName
      : typeof d.createdByName === 'string'
        ? d.createdByName
        : 'System';

  const delChanges: ActivityChangeEntry[] = [];
  const lastCentral = d.centralStoreQuantity;
  if (typeof lastCentral === 'number' && !Number.isNaN(lastCentral)) {
    delChanges.push({
      field: 'contextCentralStore',
      fieldLabel: 'Last recorded central store total (before delete)',
      oldValue: lastCentral,
      newValue: lastCentral,
    });
  }

  await createActivityLog({
    userId: uid,
    userName: uname,
    userRole: (d.updatedByRole as string) ?? (d.createdByRole as string) ?? 'Admin',
    actionType: 'item_deleted',
    actionCategory: 'inventory',
    targetType: 'item',
    targetId: itemId,
    targetDisplay: display,
    summary: `Catalog item deleted: ${name}`,
    details: sku ? `SKU: ${sku}` : '',
    changes: delChanges,
  });
});

/**
 * Tombstone: custom steel spec removed.
 */
export const onSteelMasterDeleted = onDocumentDeleted('steelMaster/{steelMasterId}', async (event) => {
  const snap = event.data;
  if (!snap) {
    return;
  }
  const d = snap.data();
  const steelMasterId = event.params.steelMasterId;
  const name = typeof d.name === 'string' ? d.name : steelMasterId;
  const uid =
    typeof d.updatedBy === 'string'
      ? d.updatedBy
      : typeof d.createdBy === 'string'
        ? d.createdBy
        : 'system';
  const uname =
    typeof d.updatedByName === 'string'
      ? d.updatedByName
      : typeof d.createdByName === 'string'
        ? d.createdByName
        : 'System';

  await createActivityLog({
    userId: uid,
    userName: uname,
    userRole: (d.updatedByRole as string) ?? (d.createdByRole as string) ?? 'Admin',
    actionType: 'steel_master_deleted',
    actionCategory: 'inventory',
    targetType: 'item',
    targetId: steelMasterId,
    targetDisplay: name,
    summary: `Custom item deleted: ${name}`,
    details: '',
    changes: [],
  });
});

/**
 * Firestore Trigger: Log Maintenance Updates
 * Triggered when a maintenance document is updated (status changes or update notes)
 */
export const onMaintenanceUpdated = onDocumentUpdated(
  'maintenance/{maintenanceId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const maintenanceId = event.params.maintenanceId;

    // Log status changes
    if (before.status !== after.status) {
      let actionType = 'maintenance_updated';
      let summary = 'Maintenance status changed';

      if (after.status === 'returned') {
        actionType = 'maintenance_returned';
        summary = `Returned ${after.returnedQuantity ?? after.quantity ?? 0} ${after.itemName ?? 'items'} from maintenance`;
      } else if (after.status === 'written_off') {
        actionType = 'item_written_off';
        summary = `Written off ${after.itemName ?? 'item'} (${after.writeOffReason ?? 'N/A'})`;
      }

      await createActivityLog({
        userId: after.addedBy ?? 'unknown',
        userName: after.addedByName ?? 'Unknown',
        userRole: 'StoreIncharge',
        actionType,
        actionCategory: 'maintenance',
        targetType: 'maintenance',
        targetId: maintenanceId,
        targetDisplay: `${after.itemName ?? 'Item'} (${after.quantity ?? 0} units)`,
        summary,
        details: after.repairSummary ?? after.writeOffExplanation ?? '',
        changes: [
          {
            field: 'status',
            fieldLabel: 'Status',
            oldValue: before.status,
            newValue: after.status,
          },
        ],
      });

      if (after.status === 'returned') {
        await logMaintenanceItemScopedMirror(after, maintenanceId, 'returned');
      } else if (after.status === 'written_off') {
        await logMaintenanceItemScopedMirror(after, maintenanceId, 'written_off');
      }

      try {
        const afterUpdates = Array.isArray(after.updates) ? after.updates : [];
        const lastUpdate = afterUpdates[afterUpdates.length - 1];
        const actor = lastUpdate && typeof lastUpdate === 'object' && lastUpdate?.addedBy
          ? String(lastUpdate.addedBy)
          : undefined;
        const tokens = await getAdminAndStoreInchargeTokens(
          'maintenanceAlerts',
          actor
        );
        if (tokens.length > 0) {
          const pushData = { screen: 'MaintenanceDetail', maintenanceId };
          const userIds = await getAdminAndStoreInchargeUserIds(actor);
          if (after.status === 'returned') {
            const quantity = after.returnedQuantity ?? after.quantity ?? 0;
            const itemName = after.itemName ?? 'item';
            const title = 'Items Returned from Maintenance';
            const body = `${quantity} ${itemName} returned from maintenance`;
            for (const uid of userIds) {
              await createInAppNotification(uid, 'maintenance_returned', title, body, pushData);
            }
            await sendExpoPushNotification(tokens, title, body, pushData);
          } else if (after.status === 'written_off') {
            const itemName = after.itemName ?? 'item';
            const title = 'Item Written Off';
            const body = `${itemName} written off`;
            for (const uid of userIds) {
              await createInAppNotification(uid, 'maintenance_written_off', title, body, pushData);
            }
            await sendExpoPushNotification(tokens, title, body, pushData);
          }
        }
      } catch (notifErr) {
        logger.error('Push failed for maintenance status change', { notifErr, maintenanceId });
      }
      return;
    }

    // Log when update note added (updates array grew)
    const beforeUpdates = Array.isArray(before.updates) ? before.updates : [];
    const afterUpdates = Array.isArray(after.updates) ? after.updates : [];
    if (afterUpdates.length > beforeUpdates.length) {
      const latestNote = afterUpdates[afterUpdates.length - 1];
      const noteText = typeof latestNote === 'object' && latestNote?.note
        ? String(latestNote.note)
        : 'Update note added';

      await createActivityLog({
        userId: (latestNote as { addedBy?: string })?.addedBy ?? after.addedBy ?? 'unknown',
        userName: (latestNote as { addedByName?: string })?.addedByName ?? after.addedByName ?? 'Unknown',
        userRole: 'StoreIncharge',
        actionType: 'maintenance_updated',
        actionCategory: 'maintenance',
        targetType: 'maintenance',
        targetId: maintenanceId,
        targetDisplay: `${after.itemName ?? 'Item'} (${after.quantity ?? 0} units)`,
        summary: `Maintenance update: ${after.itemName ?? 'Item'}`,
        details: noteText,
        changes: [
          {
            field: 'updates',
            fieldLabel: 'Update Note',
            oldValue: beforeUpdates.length,
            newValue: afterUpdates.length,
          },
        ],
      });
    }
  }
);

/**
 * Firestore Trigger: Log Purchase Order Creation
 */
export const onPurchaseOrderCreated = onDocumentCreated(
  'purchaseOrders/{poId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onPurchaseOrderCreated: No data associated with the event');
      return;
    }

    const po = snapshot.data();
    const poId = event.params.poId;
    const itemsCount = Array.isArray(po.items) ? po.items.length : 0;

    await createActivityLog({
      userId: po.createdBy ?? 'system',
      userName: po.createdByName ?? 'System',
      userRole: (po.createdByRole as string) ?? 'Admin',
      actionType: 'po_created',
      actionCategory: 'purchase_orders',
      targetType: 'purchase_order',
      targetId: poId,
      targetDisplay: po.poNumber ?? `PO-${poId}`,
      summary: `Created PO: ${po.poNumber ?? poId}`,
      details: `PO for ${po.vendorName ?? 'vendor'}, ${itemsCount} items, ₹${po.totalAmount ?? 0}`,
      changes: [],
    });

    await logPoCreatedPendingLineItemsForItemHistory(po, poId);

    if (po.status === 'pending_approval') {
      try {
        const rawAssigned = po.assignedToAdminId;
        const assignedToAdminId =
          typeof rawAssigned === 'string' && rawAssigned.trim().length > 0
            ? rawAssigned.trim()
            : undefined;

        if (!assignedToAdminId) {
          logger.error('PO pending approval but assignedToAdminId missing or invalid', {
            poId,
            rawAssigned: rawAssigned ?? 'missing',
          });
          return;
        }

        const tokens = await getUserPushTokens(assignedToAdminId, 'purchaseOrderUpdates');
        const userIds = [assignedToAdminId];
        logger.info('PO pending approval: notifying assigned admin only', {
          poId,
          assignedToAdminId,
          tokenCount: tokens.length,
        });

        if (tokens.length > 0 || userIds.length > 0) {
          const title = 'New PO Pending Approval';
          const body = `${po.createdByName ?? 'Someone'} submitted PO ${po.poNumber ?? poId} for approval`;
          const pushData = { screen: 'ApprovePO', poId };
          for (const uid of userIds) {
            await createInAppNotification(uid, 'po_pending_approval', title, body, pushData);
          }
          if (tokens.length > 0) {
            await sendExpoPushNotification(tokens, title, body, pushData);
          }
        }
      } catch (notifErr) {
        logger.error('Push failed for new PO', { notifErr, poId });
      }
    }
  }
);

/**
 * Firestore Trigger: Notify Admin when Store Incharge creates inventory update request
 * Triggered when a new document is created in inventoryUpdateRequests collection
 */
export const onInventoryUpdateRequestCreated = onDocumentCreated(
  'inventoryUpdateRequests/{requestId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onInventoryUpdateRequestCreated: No data associated with the event');
      return;
    }

    const request = snapshot.data();
    const requestId = event.params.requestId;
    const requestedByName = request.requestedByName ?? 'Store Incharge';
    const reason = request.reason ?? 'Inventory update required';

    if (request.status === 'pending') {
      try {
        const requestedBy = request.requestedBy as string | undefined;
        const tokens = await getAdminOnlyTokens(
          'inventoryUpdateRequestUpdates',
          requestedBy
        );
        if (tokens.length > 0) {
          const title = 'Inventory Update Request';
          const body = `${requestedByName} requested access to update inventory: ${reason}`;
          const pushData = { screen: 'InventoryUpdateRequests', requestId };
          const userIds = await getAdminOnlyUserIds(requestedBy);
          for (const uid of userIds) {
            await createInAppNotification(
              uid,
              'inventory_update_request_pending',
              title,
              body,
              pushData
            );
          }
          await sendExpoPushNotification(tokens, title, body, pushData);
        }
      } catch (notifErr) {
        logger.error('Push failed for inventory update request', {
          notifErr,
          requestId,
        });
      }
    }
  }
);

/**
 * Firestore Trigger: Notify Store Incharge when Admin approves/rejects inventory update request
 */
export const onInventoryUpdateRequestUpdated = onDocumentUpdated(
  'inventoryUpdateRequests/{requestId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === after.status) {
      return;
    }

    const requestId = event.params.requestId;
    const requestedBy = after.requestedBy as string | undefined;
    const approvedBy = after.approvedBy as string | undefined;

    if (after.status === 'approved') {
      try {
        if (requestedBy && requestedBy !== approvedBy) {
          const tokens = await getUserPushTokens(
            requestedBy,
            'inventoryUpdateRequestUpdates'
          );
          if (tokens.length > 0) {
            const title = 'Inventory Update Access Approved';
            const body = `Your request to update inventory has been approved. Access expires in the app.`;
            const pushData = { screen: 'InventoryUpdateRequests', requestId };
            await createInAppNotification(
              requestedBy,
              'inventory_update_request_approved',
              title,
              body,
              pushData
            );
            await sendExpoPushNotification(tokens, title, body, pushData);
          }
        }
      } catch (notifErr) {
        logger.error('Push failed for inventory update request approved', {
          notifErr,
          requestId,
        });
      }
    } else if (after.status === 'rejected') {
      try {
        if (requestedBy && requestedBy !== approvedBy) {
          const tokens = await getUserPushTokens(
            requestedBy,
            'inventoryUpdateRequestUpdates'
          );
          if (tokens.length > 0) {
            const reason = after.rejectionReason ?? 'Rejected by Admin';
            const title = 'Inventory Update Request Rejected';
            const body = `Your request was rejected: ${reason}`;
            const pushData = { screen: 'InventoryUpdateRequests', requestId };
            await createInAppNotification(
              requestedBy,
              'inventory_update_request_rejected',
              title,
              body,
              pushData
            );
            await sendExpoPushNotification(tokens, title, body, pushData);
          }
        }
      } catch (notifErr) {
        logger.error('Push failed for inventory update request rejected', {
          notifErr,
          requestId,
        });
      }
    }
  }
);

/**
 * Firestore Trigger: Log Purchase Order Updates (status changes)
 */
export const onPurchaseOrderUpdated = onDocumentUpdated(
  'purchaseOrders/{poId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const poId = event.params.poId;
    await logPoReceiptDeltasForItemHistory(before, after, poId);
    await logPoSubmittedLineItemsForItemHistory(before, after, poId);
    await logPoApprovedLineItemsForItemHistory(before, after, poId);

    if (before.status === after.status) {
      return;
    }

    const poNum = after.poNumber ?? poId;

    if (before.status === 'draft' && after.status === 'pending_approval') {
      try {
        const rawAssigned = after.assignedToAdminId;
        const assignedToAdminId =
          typeof rawAssigned === 'string' && rawAssigned.trim().length > 0
            ? rawAssigned.trim()
            : undefined;

        if (!assignedToAdminId) {
          logger.error('PO submitted from draft but assignedToAdminId missing or invalid', {
            poId,
            rawAssigned: rawAssigned ?? 'missing',
          });
          return;
        }

        const tokens = await getUserPushTokens(assignedToAdminId, 'purchaseOrderUpdates');
        const userIds = [assignedToAdminId];
        logger.info('PO submitted from draft: notifying assigned admin only', {
          poId,
          assignedToAdminId,
          tokenCount: tokens.length,
        });

        if (tokens.length > 0 || userIds.length > 0) {
          const title = 'New PO Pending Approval';
          const body = `${after.createdByName ?? 'Someone'} submitted PO ${poNum} for approval`;
          const pushData = { screen: 'ApprovePO' as const, poId };
          for (const uid of userIds) {
            await createInAppNotification(uid, 'po_pending_approval', title, body, pushData);
          }
          if (tokens.length > 0) {
            await sendExpoPushNotification(tokens, title, body, pushData);
          }
        }
      } catch (notifErr) {
        logger.error('Push failed for PO submitted from draft', { notifErr, poId });
      }
      return;
    }

    const statusActionMap: Record<string, string> = {
      approved: 'po_approved',
      rejected: 'po_rejected',
      received: 'po_received',
    };
    const actionType = statusActionMap[after.status];
    if (!actionType) {
      return;
    }

    const targetDisplay = poNum;

    let userId: string;
    let userName: string;
    let userRole: string;
    let summary: string;

    if (after.status === 'received') {
      userId = after.receivedBy ?? 'system';
      userName = after.receivedByName ?? 'System';
      userRole = 'StoreIncharge';
      summary = `Received PO: ${targetDisplay}`;
    } else if (after.status === 'approved') {
      userId = after.reviewedBy ?? after.createdBy ?? 'system';
      userName = after.reviewedByName ?? after.createdByName ?? 'System';
      userRole = 'Admin';
      summary = `Approved PO: ${targetDisplay}`;
    } else {
      // after.status === 'rejected'
      userId = after.reviewedBy ?? after.createdBy ?? 'system';
      userName = after.reviewedByName ?? after.createdByName ?? 'System';
      userRole = 'Admin';
      summary = `Rejected PO: ${targetDisplay}`;
    }

    await createActivityLog({
      userId,
      userName,
      userRole,
      actionType,
      actionCategory: 'purchase_orders',
      targetType: 'purchase_order',
      targetId: poId,
      targetDisplay,
      summary,
      details: after.rejectionReason ?? after.adminComments ?? '',
      changes: [
        {
          field: 'status',
          fieldLabel: 'Status',
          oldValue: before.status,
          newValue: after.status,
        },
      ],
    });

    // Push notifications for PO status changes
    try {
      const createdBy = after.createdBy as string | undefined;
      const reviewedBy = after.reviewedBy as string | undefined;
      const receivedBy = after.receivedBy as string | undefined;

      if (after.status === 'approved') {
        if (createdBy && createdBy !== reviewedBy) {
          const pushData = { screen: 'ApprovePO' as const, poId };
          const creatorTokens = await getUserPushTokens(createdBy, 'purchaseOrderUpdates');
          if (creatorTokens.length > 0) {
            await createInAppNotification(
              createdBy,
              'po_approved',
              'PO Approved',
              `Your PO ${targetDisplay} has been approved.`,
              pushData
            );
            await sendExpoPushNotification(
              creatorTokens,
              'PO Approved',
              `Your PO ${targetDisplay} has been approved.`,
              pushData
            );
          }
        }
      } else if (after.status === 'rejected') {
        if (createdBy && createdBy !== reviewedBy) {
          const reviewedByName = (after.reviewedByName as string | undefined)?.trim();
          const rejectorLabel = reviewedByName || 'an admin';
          const body = `Your PO ${targetDisplay} was rejected by ${rejectorLabel}.`;
          const pushData = { screen: 'ApprovePO' as const, poId };
          const creatorTokens = await getUserPushTokens(createdBy, 'purchaseOrderUpdates');
          if (creatorTokens.length > 0) {
            await createInAppNotification(
              createdBy,
              'po_rejected',
              'PO Rejected',
              body,
              pushData
            );
            await sendExpoPushNotification(
              creatorTokens,
              'PO Rejected',
              body,
              pushData
            );
          }
        }
      } else if (after.status === 'received') {
        const pushData = { screen: 'ReceivePO' as const, poId };
        const tokens = await getAdminAndStoreInchargeTokens(
          'purchaseOrderUpdates',
          receivedBy
        );
        if (tokens.length > 0) {
          const userIds = await getAdminAndStoreInchargeUserIds(receivedBy);
          for (const uid of userIds) {
            await createInAppNotification(
              uid,
              'po_received',
              'PO Received',
              `PO ${targetDisplay} has been received.`,
              pushData
            );
          }
          await sendExpoPushNotification(
            tokens,
            'PO Received',
            `PO ${targetDisplay} has been received.`,
            pushData
          );
        }
      }
    } catch (notifErr) {
      logger.error('Push notification failed for PO', { notifErr, poId });
    }
  }
);

/**
 * Firestore Trigger: Log Vendor Creation
 */
export const onVendorCreated = onDocumentCreated(
  'vendors/{vendorId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('onVendorCreated: No data associated with the event');
      return;
    }

    const vendor = snapshot.data();
    const vendorId = event.params.vendorId;

    await createActivityLog({
      userId: 'system',
      userName: 'System',
      userRole: 'Admin',
      actionType: 'vendor_created',
      actionCategory: 'vendors',
      targetType: 'vendor',
      targetId: vendorId,
      targetDisplay: vendor.name ?? vendorId,
      summary: `Created vendor: ${vendor.name ?? vendorId}`,
      details: `${vendor.category ?? ''}, ${vendor.contactPerson ?? ''}`.trim() || 'New vendor added',
      changes: [],
    });
  }
);

/**
 * Firestore Trigger: Log Vendor Updates
 * Only logs when user-editable fields change (excludes poCount, lastPoDate, updatedAt)
 */
export const onVendorUpdated = onDocumentUpdated(
  'vendors/{vendorId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const vendorId = event.params.vendorId;
    const userEditableFields = ['name', 'contactPerson', 'phone', 'email', 'address', 'status'];
    const changes: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }> = [];

    for (const field of userEditableFields) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        changes.push({
          field,
          fieldLabel: field.charAt(0).toUpperCase() + field.slice(1),
          oldValue: before[field],
          newValue: after[field],
        });
      }
    }

    if (changes.length === 0) {
      return;
    }

    await createActivityLog({
      userId: 'system',
      userName: 'System',
      userRole: 'Admin',
      actionType: 'vendor_updated',
      actionCategory: 'vendors',
      targetType: 'vendor',
      targetId: vendorId,
      targetDisplay: after.name ?? vendorId,
      summary: `Updated vendor: ${after.name ?? vendorId}`,
      details: `Modified ${changes.length} field(s)`,
      changes,
    });
  }
);

/**
 * Callable Function: Log Authentication Event
 * Called from client on login/logout/login_failed - does not block auth on failure
 * login_failed does not require auth (user failed to authenticate)
 */
export const logAuthEvent = onCall(async (request) => {
  try {
    // Extract and strictly sanitize only expected fields to prevent log poisoning
    const rawData = (request.data != null && typeof request.data === 'object' && !Array.isArray(request.data))
      ? request.data as Record<string, unknown>
      : {};

    const sanitizeStr = (val: unknown, maxLength: number): string | undefined => {
      if (typeof val !== 'string') return undefined;
      return val.substring(0, maxLength);
    };

    const actionType = sanitizeStr(rawData.actionType, 50);
    const userName = sanitizeStr(rawData.userName, 100);
    const userRole = sanitizeStr(rawData.userRole, 50);
    const details = sanitizeStr(rawData.details, 1000);
    const email = sanitizeStr(rawData.email, 255);
    const deviceInfo = sanitizeStr(rawData.deviceInfo, 500);
    const appVersion = sanitizeStr(rawData.appVersion, 50);

    const validTypes = ['user_login', 'user_logout', 'login_failed'];
    if (!actionType || !validTypes.includes(actionType)) {
      throw new HttpsError(
        'invalid-argument',
        'actionType must be user_login, user_logout, or login_failed'
      );
    }

    // Ensure unauthenticated users can only log 'login_failed'
    if (!request.auth && actionType !== 'login_failed') {
      throw new HttpsError(
        'unauthenticated',
        'Unauthenticated users can only log login_failed events'
      );
    }

    // login_failed: user is not authenticated - use email as identifier
    if (actionType === 'login_failed') {
      await createActivityLog(
        {
          userId: 'unknown',
          userName: email ?? 'Unknown',
          userRole: 'Unassigned',
          actionType: 'login_failed',
          actionCategory: 'authentication',
          targetType: 'user',
          targetId: 'unknown',
          targetDisplay: email ?? 'Unknown',
          summary: 'Login failed',
          details: details ?? '',
          changes: [],
          deviceInfo: deviceInfo ?? undefined,
          ipAddress: request.rawRequest?.ip ?? undefined,
          appVersion: appVersion ?? undefined,
        },
        { throwOnError: true }
      );
      return { success: true };
    }

    // user_login, user_logout: require authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to log auth event'
      );
    }

    // Use optional chaining - token.name/token.email may be absent in some auth providers
    const displayName =
      request.auth.token?.name ??
      request.auth.token?.email ??
      'Unknown';

    await createActivityLog(
      {
        userId: request.auth.uid,
        userName: userName ?? displayName,
        userRole: userRole ?? 'Unassigned',
        actionType,
        actionCategory: 'authentication',
        targetType: 'user',
        targetId: request.auth.uid,
        targetDisplay: userName ?? displayName,
        summary:
          actionType === 'user_login' ? 'Logged in' : 'Logged out',
        details: details ?? '',
        changes: [],
        deviceInfo: deviceInfo ?? undefined,
        ipAddress: request.rawRequest?.ip ?? undefined,
        appVersion: appVersion ?? undefined,
      },
      { throwOnError: true }
    );

    return { success: true };
  } catch (err) {
    // HttpsError is intentional (validation/auth) - rethrow as-is so client gets proper CORS response
    if (err instanceof HttpsError) {
      throw err;
    }
    // Log unhandled errors for debugging; rethrow as HttpsError so client gets CORS headers
    logger.error('logAuthEvent failed', { error: err, stack: err instanceof Error ? err.stack : undefined });
    throw new HttpsError(
      'internal',
      err instanceof Error ? err.message : 'An unexpected error occurred'
    );
  }
});

/**
 * Callable Function: Log Password Change
 * Called from client after successful password update - requires auth
 */
export const logPasswordChanged = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to log password change'
    );
  }

  const displayName =
    request.auth.token.name ??
    request.auth.token.email ??
    'Unknown';

  await createActivityLog({
    userId: request.auth.uid,
    userName: displayName,
    userRole: (request.data?.userRole as string) ?? 'Unassigned',
    actionType: 'password_changed',
    actionCategory: 'authentication',
    targetType: 'user',
    targetId: request.auth.uid,
    targetDisplay: displayName,
    summary: 'Password changed',
    details: '',
    changes: [],
    deviceInfo: request.data?.deviceInfo ?? undefined,
    appVersion: request.data?.appVersion ?? undefined,
  });

  return { success: true };
});

/**
 * Sanitize a value for Firestore - rejects NaN and Infinity.
 * Firestore throws "internal" when given NaN/Infinity.
 */
function sanitizeNumberForFirestore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return n;
}

/**
 * Callable Function: Log Quantity Adjustment
 * Called from client after successful manual inventory adjustment
 */
export const logQuantityAdjusted = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to log quantity adjustment'
      );
    }

    const data = request.data ?? {};
    const {
      itemId,
      itemName,
      itemSku,
      locationId,
      locationName,
      type,
      quantity,
      reason,
      notes,
      oldQuantity,
      newQuantity,
      userName,
      userRole,
    } = data;

    if (
      !itemId ||
      itemName == null ||
      itemSku == null ||
      !locationId ||
      !locationName ||
      !type ||
      quantity == null ||
      reason == null ||
      notes == null ||
      oldQuantity == null ||
      newQuantity == null
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields: itemId, itemName, itemSku, locationId, locationName, type, quantity, reason, notes, oldQuantity, newQuantity'
      );
    }

    if (type !== 'add' && type !== 'remove' && type !== 'set') {
      throw new HttpsError(
        'invalid-argument',
        'type must be "add", "remove", or "set"'
      );
    }

    // Sanitize numbers - Firestore rejects NaN/Infinity and throws "internal"
    const safeOldQty = sanitizeNumberForFirestore(oldQuantity);
    const safeNewQty = sanitizeNumberForFirestore(newQuantity);
    const safeQty = sanitizeNumberForFirestore(quantity);

    // For type "set", convert to add/remove for summary display
    const effectiveType = type === 'set'
      ? (safeNewQty >= safeOldQty ? 'add' : 'remove')
      : type;
    const effectiveQty = type === 'set'
      ? Math.abs(safeNewQty - safeOldQty)
      : safeQty;

    const displayName =
      request.auth.token.name ??
      request.auth.token.email ??
      'Unknown';

    const sign = effectiveType === 'add' ? '+' : '-';
    const summary = `Adjusted quantity: ${safeOldQty}→${safeNewQty} (${sign}${effectiveQty})`;
    const details = `${String(reason)}${notes ? `. ${String(notes)}` : ''}`;

    const baseChanges: ActivityChangeEntry[] = [
      {
        field: 'locationName',
        fieldLabel: 'Location',
        oldValue: String(locationName),
        newValue: String(locationName),
      },
      {
        field: 'quantity',
        fieldLabel: 'Quantity',
        oldValue: safeOldQty,
        newValue: safeNewQty,
      },
    ];
    const changes = await ensureCentralStoreContextInChanges(
      baseChanges,
      String(itemId)
    );

    await createActivityLog({
      userId: request.auth.uid,
      userName: (userName as string) ?? displayName,
      userRole: (userRole as string) ?? 'Unassigned',
      actionType: 'quantity_adjusted',
      actionCategory: 'inventory',
      targetType: 'item',
      targetId: String(itemId),
      targetDisplay: `${String(itemName)} (${String(itemSku)})`,
      summary,
      details,
      changes,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error('logQuantityAdjusted failed', { error });
    // Return success so client does not surface error - main adjustment already succeeded
    return { success: true };
  }
});

function inventoryRequestAccessScopeLine(accessScopes: unknown): string {
  if (!Array.isArray(accessScopes) || accessScopes.length === 0) return '';
  const labels: Record<string, string> = {
    central_store: 'Central stock adjustments',
    maintenance_writeoff: 'Maintenance write-off',
  };
  const parts = accessScopes.map((s) => labels[String(s)] ?? String(s));
  return `Access scope: ${parts.join(', ')}`;
}

function appendInventoryRequestScopeToDetails(
  base: string,
  accessScopes: unknown
): string {
  const line = inventoryRequestAccessScopeLine(accessScopes);
  if (!line) return base;
  return base ? `${base}\n${line}` : line;
}

/**
 * Callable Function: Log Inventory Update Request Event
 * Called from client after create/approve/reject of inventory update request.
 * actionType: inventory_update_request_created | inventory_update_request_approved | inventory_update_request_rejected | inventory_update_request_revoked | inventory_update_request_restored
 */
export const logInventoryUpdateRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to log inventory update request event'
    );
  }

  const data = request.data ?? {};
  const { actionType, requestId, targetDisplay, ...rest } = data;

  const validTypes = [
    'inventory_update_request_created',
    'inventory_update_request_approved',
    'inventory_update_request_rejected',
    'inventory_update_request_revoked',
    'inventory_update_request_restored',
  ];
  if (!actionType || !validTypes.includes(actionType)) {
    throw new HttpsError(
      'invalid-argument',
      'actionType must be one of: inventory_update_request_created, inventory_update_request_approved, inventory_update_request_rejected, inventory_update_request_revoked, inventory_update_request_restored'
    );
  }

  if (!requestId || !targetDisplay) {
    throw new HttpsError(
      'invalid-argument',
      'requestId and targetDisplay are required'
    );
  }

  const displayName =
    request.auth.token.name ??
    request.auth.token.email ??
    'Unknown';

  let userId: string;
  let userName: string;
  let userRole: string;
  let summary: string;
  let details: string;
  const changes: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }> = [];

  if (actionType === 'inventory_update_request_created') {
    userId = rest.requestedBy ?? request.auth.uid;
    userName = rest.requestedByName ?? displayName;
    userRole = rest.requestedByRole ?? 'StoreIncharge';
    summary = `Requested inventory update access: ${targetDisplay}`;
    details = appendInventoryRequestScopeToDetails(
      typeof rest.reason === 'string' ? rest.reason : '',
      rest.accessScopes
    );
  } else if (actionType === 'inventory_update_request_approved') {
    userId = rest.approvedBy ?? request.auth.uid;
    userName = rest.approvedByName ?? displayName;
    userRole = 'Admin';
    summary = `Approved inventory update request: ${targetDisplay}`;
    details = appendInventoryRequestScopeToDetails(
      rest.expiresInHours != null
        ? `Access expires in ${rest.expiresInHours} hours`
        : '',
      rest.accessScopes
    );
    changes.push({
      field: 'status',
      fieldLabel: 'Status',
      oldValue: 'pending',
      newValue: 'approved',
    });
  } else if (actionType === 'inventory_update_request_rejected') {
    userId = rest.approvedBy ?? request.auth.uid;
    userName = rest.approvedByName ?? displayName;
    userRole = 'Admin';
    summary = `Rejected inventory update request: ${targetDisplay}`;
    details = appendInventoryRequestScopeToDetails(
      typeof rest.rejectionReason === 'string' ? rest.rejectionReason : '',
      rest.accessScopes
    );
    changes.push({
      field: 'status',
      fieldLabel: 'Status',
      oldValue: 'pending',
      newValue: 'rejected',
    });
  } else if (actionType === 'inventory_update_request_revoked') {
    userId = request.auth.uid;
    userName = displayName;
    userRole = 'Admin';
    summary = `Revoked inventory update access: ${targetDisplay}`;
    details = 'Store Incharge access revoked by Admin';
    changes.push({
      field: 'accessRevoked',
      fieldLabel: 'Access Revoked',
      oldValue: false,
      newValue: true,
    });
  } else {
    userId = request.auth.uid;
    userName = displayName;
    userRole = 'Admin';
    summary = `Restored inventory update access: ${targetDisplay}`;
    details = 'Store Incharge access restored by Admin';
    changes.push({
      field: 'accessRevoked',
      fieldLabel: 'Access Revoked',
      oldValue: true,
      newValue: false,
    });
  }

  await createActivityLog({
    userId,
    userName,
    userRole,
    actionType,
    actionCategory: 'inventory',
    targetType: 'inventory_update_request',
    targetId: requestId,
    targetDisplay,
    summary,
    details,
    changes,
  });

  return { success: true };
});

/**
 * Callable: log vehicle fuel assignment (central store consumption to a vehicle).
 * Single audit entry for item history; stock was already updated via client adjustQuantity.
 */
export const logVehicleFuelAssigned = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to log vehicle fuel assignment'
      );
    }

    const data = request.data ?? {};
    const {
      itemId,
      itemName,
      itemSku,
      vehicleId,
      vehicleNumber,
      quantityLiters,
      oldCentralQuantity,
      newCentralQuantity,
      referenceSiteId,
      referenceSiteName,
      reason,
      notes,
      assignmentId,
      userName,
      userRole,
    } = data;

    if (
      !itemId ||
      itemName == null ||
      itemSku == null ||
      !vehicleId ||
      vehicleNumber == null ||
      quantityLiters == null ||
      oldCentralQuantity == null ||
      newCentralQuantity == null
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields for vehicle fuel log'
      );
    }

    const safeQty = sanitizeNumberForFirestore(quantityLiters);
    const safeOld = sanitizeNumberForFirestore(oldCentralQuantity);
    const safeNew = sanitizeNumberForFirestore(newCentralQuantity);

    const displayName =
      request.auth.token.name ??
      request.auth.token.email ??
      'Unknown';

    const siteLine =
      referenceSiteId && referenceSiteName
        ? ` Reference site: ${referenceSiteName}.`
        : '';
    const summary = `Fuel to vehicle ${String(vehicleNumber)}: ${safeQty} L (central ${safeOld}→${safeNew})`;
    const detailsParts = [
      `Assignment: ${assignmentId ? String(assignmentId) : 'n/a'}`,
      reason ? `Reason: ${String(reason)}` : '',
      notes ? `Notes: ${String(notes)}` : '',
      siteLine.trim(),
    ].filter(Boolean);
    const details = detailsParts.join('. ');

    const baseChanges: ActivityChangeEntry[] = [
      {
        field: 'locationName',
        fieldLabel: 'Location',
        oldValue: 'Central Store',
        newValue: 'Central Store',
      },
      {
        field: 'quantity',
        fieldLabel: 'Quantity at central store',
        oldValue: safeOld,
        newValue: safeNew,
      },
      {
        field: 'vehicleNumber',
        fieldLabel: 'Vehicle',
        oldValue: '',
        newValue: String(vehicleNumber),
      },
      {
        field: 'quantityLiters',
        fieldLabel: 'Liters assigned',
        oldValue: 0,
        newValue: safeQty,
      },
    ];

    const changes = await ensureCentralStoreContextInChanges(
      baseChanges,
      String(itemId)
    );

    await createActivityLog({
      userId: request.auth.uid,
      userName: (userName as string) ?? displayName,
      userRole: (userRole as string) ?? 'Unassigned',
      actionType: 'vehicle_fuel_assigned',
      actionCategory: 'inventory',
      targetType: 'item',
      targetId: String(itemId),
      targetDisplay: `${String(itemName)} (${String(itemSku)})`,
      summary,
      details,
      changes,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error('logVehicleFuelAssigned failed', { error });
    return { success: true };
  }
});

/** Scheduled Firestore backup — exports daily to GCS. See docs/FIREBASE_BACKUP_IMPLEMENTATION.md */
export { scheduledFirestoreBackup } from './scheduledBackup';
