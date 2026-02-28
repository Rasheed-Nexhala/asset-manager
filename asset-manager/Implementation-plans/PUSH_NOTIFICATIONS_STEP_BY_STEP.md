# Push Notifications — Step-by-Step Implementation Plan

**Goal:** Implement push notifications for request events without breaking existing code.  
**Stack:** Expo Notifications + Firebase Cloud Functions + Firestore.

Each step is **atomic** — complete and verify before proceeding.

---

## Prerequisites

- Physical device (push does not work in Expo Go)
- EAS project ID: `1b6e5a32-1289-48e1-a3a8-bab8fff5d5fd`
- Dev build: `npx expo run:ios` or `npx expo run:android`

---

## Phase 1: Token Registration (App-Side)

### Step 1.1 — Install expo-notifications

```bash
npx expo install expo-notifications
```

**Verify:** `package.json` includes `expo-notifications`. App still starts.

---

### Step 1.2 — Add expo-notifications plugin to app.json

**File:** `app.json`

Add `plugins` to the `expo` object (merge with existing keys):

```json
"plugins": [
  "expo-notifications"
]
```

**Note:** If `expo-build-properties` or other plugins exist, append to the array.

**Verify:** `npx expo prebuild` runs without errors (optional check).

---

### Step 1.3 — Create notificationService.ts (token only)

**File:** `src/services/firebase/notificationService.ts` (new file)

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, updateDoc, arrayUnion, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const USERS_COLLECTION = 'users';
const EAS_PROJECT_ID = '1b6e5a32-1289-48e1-a3a8-bab8fff5d5fd';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
```

**Verify:** File compiles. No imports from this file yet.

---

### Step 1.4 — Update Firestore rules for users

**File:** `firestore.rules`

Add helper and adjust `users` rules:

```
function onlyUpdatingOwnTokenFields() {
  return request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(['expoPushTokens', 'notificationPrefs', 'tokensUpdatedAt', 'updatedAt']);
}

match /users/{userId} {
  allow get: if isAuthenticated() && (isAdmin() || request.auth.uid == userId);
  allow list: if isAuthenticated() && isAdmin();
  allow create, delete: if isAuthenticated() && isUserActive() && isAdmin();
  allow update: if isAuthenticated() && (
    (isUserActive() && isAdmin()) ||
    (request.auth.uid == userId && onlyUpdatingOwnTokenFields())
  );
}
```

**Verify:** `firebase deploy --only firestore:rules` succeeds.

---

### Step 1.5 — Create usePushTokenRegistration hook

**File:** `src/hooks/usePushTokenRegistration.ts` (new file)

```typescript
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { registerPushToken } from '../services/firebase/notificationService';

export function usePushTokenRegistration(userId: string | null): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!userId) return;
    registerPushToken(userId);
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        registerPushToken(userId);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [userId]);
}
```

**Verify:** File compiles.

---

### Step 1.6 — Integrate hook in App.tsx

**File:** `App.tsx`

Add import:

```typescript
import { usePushTokenRegistration } from './src/hooks/usePushTokenRegistration';
```

In `AppContent`, after `useManagerValidationSync();` add:

```typescript
usePushTokenRegistration(userId);
```

**Verify:** App runs. Login and confirm no errors. Check Firestore `users/{uid}` for `expoPushTokens` (requires dev build + physical device).

---

## Phase 2: Cloud Functions (Push on Request Events)

### Step 2.1 — Install expo-server-sdk in functions

```bash
cd functions && npm install expo-server-sdk && npm run build
```

**Verify:** `functions/lib/` builds. No changes to existing functions yet.

---

### Step 2.2 — Create notifications helper

**File:** `functions/src/notifications.ts` (new file)

```typescript
import Expo from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const db = admin.firestore();

export async function sendExpoPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (tokens.length === 0) return;
  const expo = new Expo();
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (valid.length === 0) return;

  const messages = valid.map((t) => ({ to: t, sound: 'default' as const, title, body, data: data ?? {} }));
  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.forEach((r, i) => {
        if (r.status === 'error') logger.warn('Push error', { token: valid[i], message: r.message });
      });
    } catch (e) {
      logger.error('Push send failed', { error: e });
    }
  }
}

export async function getUserPushTokens(
  userId: string,
  type: 'requestUpdates' | 'stockAlerts' | 'maintenanceAlerts' | 'purchaseOrderUpdates'
): Promise<string[]> {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return [];
  const d = doc.data();
  const tokens: string[] = d?.expoPushTokens ?? [];
  const prefs = d?.notificationPrefs ?? {};
  if (prefs[type] === false || tokens.length === 0) return [];
  return tokens;
}

export async function getAdminAndStoreInchargeTokens(
  type: 'requestUpdates' | 'stockAlerts' | 'maintenanceAlerts' | 'purchaseOrderUpdates'
): Promise<string[]> {
  const snap = await db.collection('users').where('isActive', '==', true).get();
  const all: string[] = [];
  for (const d of snap.docs) {
    const role = d.data().role;
    if (role !== 'Admin' && role !== 'StoreIncharge') continue;
    all.push(...(await getUserPushTokens(d.id, type)));
  }
  return [...new Set(all)];
}
```

**Verify:** `npm run build` in `functions/` succeeds.

---

### Step 2.3 — Add push logic to onRequestUpdated

**File:** `functions/src/index.ts`

Add at top (after existing imports):

```typescript
import {
  sendExpoPushNotification,
  getUserPushTokens,
  getAdminAndStoreInchargeTokens,
} from './notifications';
```

Inside `onRequestUpdated`, **after** the `createActivityLog` call for status changes (around line 175, before `return;`), add:

```typescript
const requestNumber = after.requestNumber ?? requestId;
try {
  if (after.status === 'approved') {
    const tokens = await getUserPushTokens(after.requestedBy, 'requestUpdates');
    if (tokens.length > 0) {
      await sendExpoPushNotification(tokens, 'Request Approved',
        `Your request ${requestNumber} has been approved.`,
        { screen: 'ProcessRequest', requestId });
    }
  } else if (after.status === 'rejected') {
    const tokens = await getUserPushTokens(after.requestedBy, 'requestUpdates');
    if (tokens.length > 0) {
      await sendExpoPushNotification(tokens, 'Request Rejected',
        `Your request ${requestNumber} was rejected.`,
        { screen: 'ProcessRequest', requestId });
    }
  } else if (after.status === 'transferred') {
    const tokens = await getUserPushTokens(after.requestedBy, 'requestUpdates');
    if (tokens.length > 0) {
      await sendExpoPushNotification(tokens, 'Items Transferred',
        `Items for request ${requestNumber} have been transferred.`,
        { screen: 'ProcessRequest', requestId });
    }
  } else if (after.status === 'returned' || after.status === 'partially_returned') {
    const tokens = await getAdminAndStoreInchargeTokens('requestUpdates');
    if (tokens.length > 0) {
      await sendExpoPushNotification(tokens, 'Items Returned',
        `Items returned for request ${requestNumber}.`,
        { screen: 'ProcessRequest', requestId });
    }
  }
} catch (notifErr) {
  logger.error('Push notification failed', { notifErr, requestId });
}
```

**Verify:** `npm run build` in `functions/` succeeds.

---

### Step 2.4 — Add push logic to onRequestCreated

**File:** `functions/src/index.ts`

Inside `onRequestCreated`, **after** `createActivityLog` (around line 116), add:

```typescript
if (request.status === 'pending') {
  try {
    const tokens = await getAdminAndStoreInchargeTokens('requestUpdates');
    if (tokens.length > 0) {
      await sendExpoPushNotification(tokens, 'New Request',
        `${request.requestedByName ?? 'Someone'} submitted request ${request.requestNumber ?? requestId}`,
        { screen: 'RequestQueue', requestId });
    }
  } catch (notifErr) {
    logger.error('Push failed for new request', { notifErr, requestId });
  }
}
```

**Verify:** `npm run build` in `functions/`. Deploy: `firebase deploy --only functions`.

---

## Phase 3: In-App Notification Center (Optional)

### Step 3.1 — Add notifications Firestore rules

**File:** `firestore.rules`

Append:

```
match /notifications/{userId}/items/{itemId} {
  allow read, update: if isAuthenticated() && request.auth.uid == userId;
  allow create, delete: if false;
}
```

**Verify:** `firebase deploy --only firestore:rules`.

---

### Step 3.2 — Extend Cloud Functions to write notification docs

**File:** `functions/src/notifications.ts`

Add (ensure `admin` is imported at top):

```typescript
export async function createInAppNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  await db.collection('notifications').doc(userId).collection('items').add({
    type, title, body, read: false, data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

**Note:** `db` is from `admin.firestore()`; add `import * as admin from 'firebase-admin'` if not present.

Call `createInAppNotification` for each target user **before** `sendExpoPushNotification` in the triggers (optional; enables in-app list).

---

### Step 3.3 — Add notification read helpers to notificationService.ts

**File:** `src/services/firebase/notificationService.ts`

Add:

```typescript
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, getDocs, where } from 'firebase/firestore';

const NOTIFICATIONS_COLLECTION = 'notifications';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: unknown;
}

export function subscribeToNotifications(userId: string, cb: (items: NotificationItem[]) => void): () => void {
  const ref = collection(db, NOTIFICATIONS_COLLECTION, userId, 'items');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NotificationItem[]);
  });
}

export async function markNotificationRead(userId: string, itemId: string): Promise<void> {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, userId, 'items', itemId), { read: true });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const ref = collection(db, NOTIFICATIONS_COLLECTION, userId, 'items');
  const snap = await getDocs(query(ref, where('read', '==', false)));
  return snap.size;
}
```

---

### Step 3.4 — Create NotificationCenterScreen

**File:** `src/screens/Notifications/NotificationCenterScreen.tsx` (new file)

- Use `ScreenHeader` with `showBack`, `onBackPress`
- Use `subscribeToNotifications` in `useEffect`
- Render FlatList of notifications (CIAMS card style: `bg-white rounded-[10px] p-4 border border-[#E2E8F0]`)
- On press: `markNotificationRead`, then `navigation.navigate('Requests', { screen: 'ProcessRequest', params: { requestId } })` if `data.requestId` exists, else `RequestQueue`

---

### Step 3.5 — Add NotificationCenter to MainStack

**File:** `src/navigation/RootNavigator.tsx`

Import `NotificationCenterScreen`, add to `MainStack.Navigator`:

```tsx
<MainStack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ presentation: 'card' }} />
```

---

### Step 3.6 — Add notification bell to DashboardScreen

**File:** `src/screens/DashboardScreen.tsx`

Add `rightAction` to `ScreenHeader` with `icon: 'notifications-outline'`, `onPress: () => navigation.navigate('NotificationCenter')`. Use `useState` + `subscribeToNotifications` or `getUnreadCount` for badge.

---

### Step 3.7 — Handle notification tap (deep link)

**File:** `RootNavigator.tsx`

Create `navigationRef` and pass to `NavigationContainer ref={navigationRef}`. Add `useEffect` with `Notifications.addNotificationResponseReceivedListener`; on `data.screen === 'ProcessRequest'` and `data.requestId`, navigate:

```ts
navigationRef.current?.navigate('Tabs', {
  screen: 'Requests',
  params: { screen: 'ProcessRequest', params: { requestId: data.requestId } },
});
```

---

## Phase 4: Firestore Index (If Needed)

If `subscribeToNotifications` fails with "index required", create composite index:

- Collection: `notifications/{userId}/items`
- Fields: `createdAt` (Descending)
- Query scope: Collection

---

## Verification Checklist

| Step | Verify |
|------|--------|
| 1.1 | `expo-notifications` in package.json |
| 1.2 | `npx expo prebuild` succeeds |
| 1.3–1.5 | No TypeScript errors |
| 1.6 | App runs; no runtime errors |
| 2.1–2.4 | `functions` build + deploy succeed |
| 3.x | NotificationCenter opens; list loads; tap navigates |

---

## Rollback (If Needed)

- **Step 1.6:** Remove `usePushTokenRegistration(userId)` and import from `App.tsx`
- **Step 2.3–2.4:** Remove push logic from `onRequestUpdated` and `onRequestCreated`; remove `notifications.ts` and its import
- **Step 1.4:** Revert Firestore rules to original `users` block

---

## Screen Mapping for Deep Links

| data.screen | Navigation target |
|-------------|-------------------|
| `ProcessRequest` | `Requests` tab → `ProcessRequest` with `requestId` |
| `RequestQueue` | `Requests` tab → `RequestQueue` |
