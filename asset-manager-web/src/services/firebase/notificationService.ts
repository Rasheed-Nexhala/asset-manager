/**
 * Notification service - Web version
 * Push token registration is stubbed for web (FCM Web Push can be added later).
 * Firestore notification subscription and read count work identically.
 */
import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
  where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';

export type PushTokenErrorCode =
  | 'unsupported_device'
  | 'permission_denied'
  | 'network_transient'
  | 'firebase_write_failed'
  | 'unknown';

export class PushTokenRegistrationError extends Error {
  code: PushTokenErrorCode;
  cause?: unknown;

  constructor(code: PushTokenErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'PushTokenRegistrationError';
    this.code = code;
    this.cause = cause;
  }
}

export function isTransientPushTokenError(error: unknown): boolean {
  return (
    error instanceof PushTokenRegistrationError &&
    error.code === 'network_transient'
  );
}

/** Web: Push permissions not applicable - stub returns false */
export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}

/** Web: Expo push token not used - stub returns null */
export async function getExpoPushToken(): Promise<string | null> {
  return null;
}

/** Web: Push token registration no-op (FCM Web Push can be added later) */
export async function registerPushToken(_userId: string): Promise<void> {
  // No-op on web - FCM Web Push can be implemented later
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: unknown;
}

export function subscribeToNotifications(
  userId: string,
  cb: (items: NotificationItem[]) => void
): () => void {
  const ref = collection(db, NOTIFICATIONS_COLLECTION, userId, 'items');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem)));
    },
    (error) => {
      console.error('Notification subscription error:', error);
      cb([]);
    }
  );
}

export async function markNotificationRead(
  userId: string,
  itemId: string
): Promise<void> {
  await updateDoc(
    doc(db, NOTIFICATIONS_COLLECTION, userId, 'items', itemId),
    { read: true }
  );
}

export async function getUnreadCount(userId: string): Promise<number> {
  const ref = collection(db, NOTIFICATIONS_COLLECTION, userId, 'items');
  const snap = await getCountFromServer(query(ref, where('read', '==', false)));
  return snap.data().count;
}
