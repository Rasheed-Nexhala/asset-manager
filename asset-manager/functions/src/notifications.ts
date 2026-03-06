/**
 * CIAMS - Push Notification Helpers
 *
 * Expo push notification sending and token resolution for Cloud Functions.
 */

import Expo from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// Ensure Firebase app is initialized before using Firestore (notifications may load before index.ts runs)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export type NotificationPrefType =
  | 'requestUpdates'
  | 'stockAlerts'
  | 'maintenanceAlerts'
  | 'purchaseOrderUpdates'
  | 'userUpdates';

/**
 * Sends push notifications via Expo Push Service.
 * Filters invalid tokens, chunks messages, and logs delivery errors.
 */
export async function sendExpoPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (tokens.length === 0) return;

  const expo = new Expo();
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  const messages = valid.map((t) => ({
    to: t,
    sound: 'default' as const,
    title,
    body,
    data: data ?? {},
    channelId: 'default', // Android notification channel; ignored on iOS
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        logger.error('Expo push notification error', {
          token: chunk[i]?.to,
          message: ticket.message,
          details: ticket.details,
        });
      }
    }
  }
}

/**
 * Returns Expo push tokens for a user, respecting their notification preferences.
 * Returns [] if user has disabled this notification type or has no tokens.
 */
export async function getUserPushTokens(
  userId: string,
  type: NotificationPrefType
): Promise<string[]> {
  const doc = await db.collection('users').doc(userId).get();
  const data = doc.data();
  const tokens = (data?.expoPushTokens ?? []) as string[];
  const prefs = (data?.notificationPrefs ?? {}) as Record<string, boolean>;

  if (prefs[type] === false || tokens.length === 0) return [];
  return tokens;
}

/**
 * Returns deduplicated Expo push tokens for all active Admin and StoreIncharge users
 * who have enabled the given notification type.
 */
export async function getAdminAndStoreInchargeTokens(
  type: NotificationPrefType
): Promise<string[]> {
  const snapshot = await db
    .collection('users')
    .where('isActive', '==', true)
    .get();

  const all: string[] = [];
  for (const doc of snapshot.docs) {
    const role = doc.data()?.role as string | undefined;
    if (role === 'Admin' || role === 'StoreIncharge') {
      const tokens = await getUserPushTokens(doc.id, type);
      all.push(...tokens);
    }
  }
  return [...new Set(all)];
}

/**
 * Returns user IDs of active Admin and StoreIncharge users (for in-app notifications).
 */
export async function getAdminAndStoreInchargeUserIds(): Promise<string[]> {
  const snapshot = await db
    .collection('users')
    .where('isActive', '==', true)
    .get();

  const ids: string[] = [];
  for (const doc of snapshot.docs) {
    const role = doc.data()?.role as string | undefined;
    if (role === 'Admin' || role === 'StoreIncharge') {
      ids.push(doc.id);
    }
  }
  return ids;
}

/**
 * Creates an in-app notification document for the Notification Center.
 * Only Cloud Functions can create (client create/delete denied in rules).
 */
export async function createInAppNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  await db.collection('notifications').doc(userId).collection('items').add({
    type,
    title,
    body,
    read: false,
    data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
