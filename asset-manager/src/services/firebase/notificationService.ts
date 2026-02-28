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
  if (!(await requestNotificationPermissions())) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
  return data;
}

export async function registerPushToken(userId: string): Promise<void> {
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
