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
} from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

/**
 * Helper: Create activity log document
 * Reusable log creator - handles errors gracefully to not block main operations
 */
async function createActivityLog(logData: {
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
}): Promise<void> {
  try {
    await db.collection('activityLogs').add({
      ...logData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error('Failed to create activity log', { error, logData });
    // Don't throw - logging failure should not block the main operation
  }
}

/**
 * Firestore Trigger: Log Item Creation
 * Triggered when a new document is created in items collection
 */
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
      changes: [],
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
      return;
    }

    // Log draft edits (status unchanged but items, priority, etc. changed)
    const changes: Array<{ field: string; fieldLabel: string; oldValue: unknown; newValue: unknown }> = [];
    if (JSON.stringify(before.items) !== JSON.stringify(after.items)) {
      changes.push({
        field: 'items',
        fieldLabel: 'Items',
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
      await createActivityLog({
        userId: after.requestedBy ?? 'unknown',
        userName: after.requestedByName ?? 'Unknown',
        userRole: 'SiteManager',
        actionType: 'request_edited',
        actionCategory: 'requests',
        targetType: 'request',
        targetId: requestId,
        targetDisplay: after.requestNumber ?? requestId,
        summary: `Edited request: ${after.requestNumber ?? requestId}`,
        details: after.storeNotes ?? '',
        changes,
      });
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

    const fieldsToCompare = ['name', 'sku', 'description', 'categoryId', 'categoryName', 'type', 'status'];
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
  }
);

/**
 * Firestore Trigger: Log Steel Master Creation
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
      summary: `Steel master created: ${steel.name ?? steelMasterId}`,
      details: `Weight: ${steel.weightPerMeter ?? 0} kg/m`,
      changes: [],
    });
  }
);

/**
 * Firestore Trigger: Log Steel Master Updates
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
      summary: `Steel master updated: ${after.name ?? steelMasterId}`,
      details: `Modified ${changes.length} field(s)`,
      changes,
    });
  }
);

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

    if (before.status === after.status) {
      return;
    }

    const statusActionMap: Record<string, string> = {
      approved: 'po_approved',
      rejected: 'po_rejected',
      ordered: 'po_ordered',
      received: 'po_received',
    };
    const actionType = statusActionMap[after.status];
    if (!actionType) {
      return;
    }

    const poId = event.params.poId;
    const targetDisplay = after.poNumber ?? poId;

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
    } else if (after.status === 'rejected') {
      userId = after.reviewedBy ?? after.createdBy ?? 'system';
      userName = after.reviewedByName ?? after.createdByName ?? 'System';
      userRole = 'Admin';
      summary = `Rejected PO: ${targetDisplay}`;
    } else {
      userId = after.createdBy ?? 'system';
      userName = after.createdByName ?? 'System';
      userRole = 'Admin';
      summary = `Marked PO as ordered: ${targetDisplay}`;
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
    const userEditableFields = ['name', 'contactPerson', 'phone', 'email', 'address', 'gstin', 'category', 'status'];
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
  const { actionType, userName, userRole, details, email, deviceInfo, appVersion } =
    request.data ?? {};

  const validTypes = ['user_login', 'user_logout', 'login_failed'];
  if (!actionType || !validTypes.includes(actionType)) {
    throw new HttpsError(
      'invalid-argument',
      'actionType must be user_login, user_logout, or login_failed'
    );
  }

  // login_failed: user is not authenticated - use email as identifier
  if (actionType === 'login_failed') {
    await createActivityLog({
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
    });
    return { success: true };
  }

  // user_login, user_logout: require authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to log auth event'
    );
  }

  const displayName =
    request.auth.token.name ??
    request.auth.token.email ??
    'Unknown';

  await createActivityLog({
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
  });

  return { success: true };
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
 * Callable Function: Log Quantity Adjustment
 * Called from client after successful manual inventory adjustment
 */
export const logQuantityAdjusted = onCall(async (request) => {
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

  if (type !== 'add' && type !== 'remove') {
    throw new HttpsError(
      'invalid-argument',
      'type must be "add" or "remove"'
    );
  }

  const displayName =
    request.auth.token.name ??
    request.auth.token.email ??
    'Unknown';

  const sign = type === 'add' ? '+' : '-';
  const summary = `Adjusted quantity: ${oldQuantity}→${newQuantity} (${sign}${quantity})`;
  const details = `${reason}${notes ? `. ${notes}` : ''}`;

  await createActivityLog({
    userId: request.auth.uid,
    userName: (userName as string) ?? displayName,
    userRole: (userRole as string) ?? 'Unassigned',
    actionType: 'quantity_adjusted',
    actionCategory: 'inventory',
    targetType: 'item',
    targetId: itemId,
    targetDisplay: `${itemName} (${itemSku})`,
    summary,
    details,
    changes: [
      {
        field: 'quantity',
        fieldLabel: 'Quantity',
        oldValue: oldQuantity,
        newValue: newQuantity,
      },
    ],
  });

  return { success: true };
});
