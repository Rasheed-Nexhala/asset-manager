import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';
const EAS_PROJECT_ID = '1b6e5a32-1289-48e1-a3a8-bab8fff5d5fd';

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

function toErrorText(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function isPermissionError(errorText: string): boolean {
  const normalized = errorText.toLowerCase();
  return (
    normalized.includes('permission') ||
    normalized.includes('denied') ||
    normalized.includes('not authorized')
  );
}

function isTransientNetworkError(errorText: string): boolean {
  const normalized = errorText.toLowerCase();
  return (
    normalized.includes('network') ||
    normalized.includes('unavailable') ||
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('failed to fetch')
  );
}

function isUnsupportedDeviceError(errorText: string): boolean {
  const normalized = errorText.toLowerCase();
  return (
    normalized.includes('play services') ||
    normalized.includes('fcm') ||
    normalized.includes('not available on this device') ||
    normalized.includes('not supported')
  );
}

function classifyPushTokenError(error: unknown): PushTokenRegistrationError {
  if (error instanceof PushTokenRegistrationError) {
    return error;
  }
  const errorText = toErrorText(error);
  if (isPermissionError(errorText)) {
    return new PushTokenRegistrationError('permission_denied', errorText, error);
  }
  if (isTransientNetworkError(errorText)) {
    return new PushTokenRegistrationError('network_transient', errorText, error);
  }
  if (isUnsupportedDeviceError(errorText)) {
    return new PushTokenRegistrationError('unsupported_device', errorText, error);
  }
  return new PushTokenRegistrationError('unknown', errorText, error);
}

export function isTransientPushTokenError(error: unknown): boolean {
  return (
    error instanceof PushTokenRegistrationError &&
    error.code === 'network_transient'
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    if (!(await requestNotificationPermissions())) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    return data;
  } catch (error) {
    throw classifyPushTokenError(error);
  }
}

export async function registerPushToken(userId: string): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;
    const userRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(userRef);
    const tokens: string[] = snap.data()?.expoPushTokens ?? [];
    if (tokens.includes(token)) {
      await updateDoc(userRef, { tokensUpdatedAt: serverTimestamp() });
      return;
    }
    await updateDoc(userRef, {
      expoPushTokens: arrayUnion(token),
      tokensUpdatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof PushTokenRegistrationError) {
      throw error;
    }
    throw new PushTokenRegistrationError(
      'firebase_write_failed',
      toErrorText(error),
      error
    );
  }
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
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem))
    );
  });
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
  const snap = await getDocs(query(ref, where('read', '==', false)));
  return snap.size;
}
