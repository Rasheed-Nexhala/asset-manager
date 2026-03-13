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
import {
  sendExpoPushNotification,
  getUserPushTokens,
  getAdminAndStoreInchargeTokens,
  getAdminAndStoreInchargeUserIds,
  getAdminOnlyTokens,
  getAdminOnlyUserIds,
  createInAppNotification,
} from './notifications';

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

    if (request.status === 'pending') {
      try {
        const requestedBy = request.requestedBy as string | undefined;
        const tokens = await getAdminAndStoreInchargeTokens(
          'requestUpdates',
          requestedBy
        );
        if (tokens.length > 0) {
          const title = 'New Request';
          const body = `${request.requestedByName ?? 'Someone'} submitted request ${request.requestNumber ?? requestId}`;
          const pushData = { screen: 'RequestQueue', requestId };
          const userIds = await getAdminAndStoreInchargeUserIds(requestedBy);
          for (const uid of userIds) {
            await createInAppNotification(uid, 'new_request', title, body, pushData);
          }
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
          const tokens = await getAdminAndStoreInchargeTokens(
            'requestUpdates',
            processedBy
          );
          if (tokens.length > 0) {
            const userIds = await getAdminAndStoreInchargeUserIds(processedBy);
            for (const uid of userIds) {
              await createInAppNotification(
                uid,
                'items_returned',
                'Items Returned',
                `Items returned for request ${requestNumber}.`,
                pushData
              );
            }
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
    ];
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

    if (po.status === 'pending_approval') {
      try {
        const createdBy = po.createdBy as string | undefined;
        const tokens = await getAdminAndStoreInchargeTokens(
          'purchaseOrderUpdates',
          createdBy
        );
        if (tokens.length > 0) {
          const title = 'New PO Pending Approval';
          const body = `${po.createdByName ?? 'Someone'} submitted PO ${po.poNumber ?? poId} for approval`;
          const pushData = { screen: 'ApprovePO', poId };
          const userIds = await getAdminAndStoreInchargeUserIds(createdBy);
          for (const uid of userIds) {
            await createInAppNotification(uid, 'po_pending_approval', title, body, pushData);
          }
          await sendExpoPushNotification(tokens, title, body, pushData);
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

    if (before.status === after.status) {
      return;
    }

    const poId = event.params.poId;
    const poNum = after.poNumber ?? poId;

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
          const pushData = { screen: 'ApprovePO' as const, poId };
          const creatorTokens = await getUserPushTokens(createdBy, 'purchaseOrderUpdates');
          if (creatorTokens.length > 0) {
            await createInAppNotification(
              createdBy,
              'po_rejected',
              'PO Rejected',
              `Your PO ${targetDisplay} was rejected.`,
              pushData
            );
            await sendExpoPushNotification(
              creatorTokens,
              'PO Rejected',
              `Your PO ${targetDisplay} was rejected.`,
              pushData
            );
          }
        }
      } else if (after.status === 'ordered') {
        const pushData = { screen: 'PurchaseOrderList' as const, poId };
        const tokens = await getAdminAndStoreInchargeTokens(
          'purchaseOrderUpdates',
          createdBy
        );
        if (tokens.length > 0) {
          const userIds = await getAdminAndStoreInchargeUserIds(createdBy);
          for (const uid of userIds) {
            await createInAppNotification(
              uid,
              'po_ordered',
              'PO Marked as Ordered',
              `PO ${targetDisplay} has been marked as ordered.`,
              pushData
            );
          }
          await sendExpoPushNotification(
            tokens,
            'PO Marked as Ordered',
            `PO ${targetDisplay} has been marked as ordered.`,
            pushData
          );
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
  // Extract and strictly sanitize only expected fields to prevent log poisoning
  const rawData = request.data ?? {};
  
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
      changes: [
        {
          field: 'quantity',
          fieldLabel: 'Quantity',
          oldValue: safeOldQty,
          newValue: safeNewQty,
        },
      ],
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
    details = rest.reason ?? '';
  } else if (actionType === 'inventory_update_request_approved') {
    userId = rest.approvedBy ?? request.auth.uid;
    userName = rest.approvedByName ?? displayName;
    userRole = 'Admin';
    summary = `Approved inventory update request: ${targetDisplay}`;
    details = rest.expiresInHours != null ? `Access expires in ${rest.expiresInHours} hours` : '';
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
    details = rest.rejectionReason ?? '';
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

/** Scheduled Firestore backup — exports daily to GCS. See docs/FIREBASE_BACKUP_IMPLEMENTATION.md */
export { scheduledFirestoreBackup } from './scheduledBackup';
