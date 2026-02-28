# Push Notifications Implementation Plan

**Stack:** Expo + React Native + Firebase Web SDK + TypeScript  
**Approach:** Expo Notifications + Firebase Cloud Functions + Firestore

---

## Project Context (From Codebase Analysis)

| Component | Current State |
|-----------|----------------|
| **Firebase** | Web SDK in `config/firebase.ts` (auth, db, storage) |
| **Cloud Functions** | `functions/` with activity logging triggers (`onRequestCreated`, `onRequestUpdated`, etc.) |
| **User model** | `users/{userId}` with `role`, `isActive`, `permissions`, `email`, `displayName` |
| **Request schema** | `requests/{id}` with `requestedBy`, `status`, `requestNumber`, `processedBy`, etc. |
| **Roles** | Admin, StoreIncharge, SiteManager |
| **expo-device** | ✅ Already installed |
| **expo-notifications** | ❌ Not installed |
| **EAS** | Project ID in `app.json` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PUSH NOTIFICATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

  User Action (e.g., Request approved)
         │
         ▼
  Firestore document write (requests/{id})
         │
         ▼
  Cloud Function trigger (onDocumentUpdated)
         │
         ├── Fetch target user(s) from request data
         ├── Query users collection for expoPushTokens
         └── Call Expo Push API (expo-server-sdk-node)
         │
         ▼
  Expo Push Service → APNs (iOS) / FCM (Android)
         │
         ▼
  expo-notifications → Device receives push
```

---

## Phase 1: Token Registration Service (App-Side)

### Step 1.1: Install Dependencies

```bash
npx expo install expo-notifications expo-device
```

**Note:** `expo-device` is already in your `package.json`. Only `expo-notifications` needs to be added.

### Step 1.2: Configure app.json for Push Notifications

Add the following to `app.json` under `expo`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#1E40AF",
          "sounds": [],
          "defaultChannel": "default"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "useNextNotificationsApi": true
    }
  }
}
```

### Step 1.3: Create Firestore Schema for Tokens

**Path:** `users/{userId}` (extend existing document)

Add these fields to the user document (via `updateDoc` with `merge: true`):

```typescript
// New fields in users/{userId}
{
  expoPushTokens: string[];        // Array of Expo Push Tokens (ExponentPushToken[xxx])
  notificationPrefs?: {
    requestUpdates: boolean;       // Default: true
    stockAlerts: boolean;          // Default: true
    maintenanceAlerts: boolean;    // Default: true
    purchaseOrderUpdates: boolean; // Default: true
  };
  tokensUpdatedAt?: Timestamp;      // Last time tokens were refreshed
}
```

**Why array?** A user can have multiple devices (phone + tablet). Each device gets its own token.

### Step 1.4: Create `notificationService.ts`

**File:** `src/services/firebase/notificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const USERS_COLLECTION = 'users';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions (iOS/Android)
 * Returns true if granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Get Expo Push Token for this device
 * Returns null if permissions denied or not a physical device
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const projectId = '1b6e5a32-1289-48e1-a3a8-bab8fff5d5fd'; // From app.json extra.eas.projectId
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  return tokenData.data;
}

/**
 * Save Expo Push Token to Firestore for the current user
 * Call this on login and on app launch (tokens can refresh)
 */
export async function registerPushToken(userId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  const data = userSnap.data();
  const existingTokens: string[] = data?.expoPushTokens ?? [];

  if (existingTokens.includes(token)) {
    // Token already registered, just update timestamp
    await updateDoc(userRef, { tokensUpdatedAt: serverTimestamp() });
    return;
  }

  await updateDoc(userRef, {
    expoPushTokens: arrayUnion(token),
    tokensUpdatedAt: serverTimestamp(),
  });
}

/**
 * Remove push token on logout (optional - improves privacy)
 */
export async function removePushToken(userId: string, token: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    expoPushTokens: arrayRemove(token),
    tokensUpdatedAt: serverTimestamp(),
  });
}
```

### Step 1.5: Update Firestore Security Rules

Add write permission for users to update their own `expoPushTokens`:

**File:** `firestore.rules` — modify the `users/{userId}` block:

```
match /users/{userId} {
  // ... existing rules ...
  // Allow users to update their own expoPushTokens and notificationPrefs
  allow update: if isAuthenticated() && (
    (isAdmin() && isUserActive()) ||
    (request.auth.uid == userId && 
     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['expoPushTokens', 'notificationPrefs', 'tokensUpdatedAt', 'updatedAt']))
  );
}
```

**Note:** Your current rule is `allow create, update, delete: if isAuthenticated() && isUserActive() && isAdmin();` — so only Admins can update users. You need to add an exception for users updating their own token fields. A cleaner approach:

```
allow update: if isAuthenticated() && (
  (isUserActive() && isAdmin()) ||
  (request.auth.uid == userId && onlyUpdatingOwnTokenFields())
);

function onlyUpdatingOwnTokenFields() {
  return request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(['expoPushTokens', 'notificationPrefs', 'tokensUpdatedAt', 'updatedAt']);
}
```

### Step 1.6: Create `usePushTokenRegistration` Hook

**File:** `src/hooks/usePushTokenRegistration.ts`

```typescript
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { registerPushToken } from '../services/firebase/notificationService';

/**
 * Registers Expo Push Token to Firestore when user is logged in.
 * Re-registers on app launch and when app comes to foreground (tokens can refresh).
 */
export function usePushTokenRegistration(userId: string | null): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    const register = () => registerPushToken(userId);
    register(); // On mount / when userId changes

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        register(); // Token refresh when app comes to foreground
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [userId]);
}
```

### Step 1.7: Integrate Hook in App.tsx

**File:** `App.tsx`

```typescript
// Add import
import { usePushTokenRegistration } from './src/hooks/usePushTokenRegistration';

function AppContent() {
  useAuthStateSync();
  const userId = useAppSelector(selectUserId);
  const authInitialized = useAppSelector(selectAuthInitialized);
  useUserRoleSync(userId);
  useManagerValidationSync();
  usePushTokenRegistration(userId);  // <-- Add this line

  // ... rest
}
```

---

## Phase 2: Cloud Functions for Request Status Change Triggers

### Step 2.1: Install expo-server-sdk in Functions

```bash
cd functions
npm install expo-server-sdk
npm run build
```

### Step 2.2: Create Notification Helper in Cloud Functions

**File:** `functions/src/notifications.ts` (new file)

```typescript
import Expo from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const db = admin.firestore();

/**
 * Send push notification via Expo Push API
 * @param tokens - Array of Expo Push Tokens
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional data payload (e.g., { screen: 'RequestDetail', requestId: 'xxx' })
 */
export async function sendExpoPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (tokens.length === 0) return;

  const expo = new Expo();
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));

  if (validTokens.length === 0) {
    logger.warn('No valid Expo push tokens');
    return;
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default' as const,
    title,
    body,
    data: data ?? {},
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.forEach((receipt, i) => {
        if (receipt.status === 'error') {
          logger.warn('Push notification error', {
            token: validTokens[i],
            message: receipt.message,
          });
        }
      });
    } catch (error) {
      logger.error('Failed to send push notifications', { error, chunk });
    }
  }
}

/**
 * Get Expo Push Tokens for a user (respects notification prefs)
 */
export async function getUserPushTokens(
  userId: string,
  notificationType: 'requestUpdates' | 'stockAlerts' | 'maintenanceAlerts' | 'purchaseOrderUpdates'
): Promise<string[]> {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return [];

  const data = userDoc.data();
  const tokens: string[] = data?.expoPushTokens ?? [];
  const prefs = data?.notificationPrefs ?? {};
  const enabled = prefs[notificationType] !== false; // Default true

  if (!enabled || tokens.length === 0) return [];
  return tokens;
}

/**
 * Get push tokens for all users with role Admin or StoreIncharge
 */
export async function getAdminAndStoreInchargeTokens(
  notificationType: 'requestUpdates' | 'stockAlerts' | 'maintenanceAlerts' | 'purchaseOrderUpdates'
): Promise<string[]> {
  const snapshot = await db
    .collection('users')
    .where('isActive', '==', true)
    .get();

  const allTokens: string[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const role = data.role;
    if (role !== 'Admin' && role !== 'StoreIncharge') continue;
    const tokens = await getUserPushTokens(doc.id, notificationType);
    allTokens.push(...tokens);
  }
  return [...new Set(allTokens)]; // Dedupe
}
```

### Step 2.3: Add Push Notification Logic to `onRequestUpdated`

**File:** `functions/src/index.ts`

Add import at top:

```typescript
import {
  sendExpoPushNotification,
  getUserPushTokens,
  getAdminAndStoreInchargeTokens,
} from './notifications';
```

Inside the existing `onRequestUpdated` function, after the `createActivityLog` call for status changes, add:

```typescript
// Inside onRequestUpdated, after logging status change (around line 176)
// Add push notification logic:

if (before.status !== after.status) {
  // ... existing createActivityLog ...

  const requestId = event.params.requestId;
  const requestNumber = after.requestNumber ?? requestId;

  try {
    if (after.status === 'approved') {
      const tokens = await getUserPushTokens(after.requestedBy, 'requestUpdates');
      if (tokens.length > 0) {
        await sendExpoPushNotification(
          tokens,
          'Request Approved',
          `Your request ${requestNumber} has been approved.`,
          { screen: 'RequestDetail', requestId }
        );
      }
    } else if (after.status === 'rejected') {
      const tokens = await getUserPushTokens(after.requestedBy, 'requestUpdates');
      if (tokens.length > 0) {
        await sendExpoPushNotification(
          tokens,
          'Request Rejected',
          `Your request ${requestNumber} was rejected.`,
          { screen: 'RequestDetail', requestId }
        );
      }
    } else if (after.status === 'transferred') {
      const tokens = await getUserPushTokens(after.requestedBy, 'requestUpdates');
      if (tokens.length > 0) {
        await sendExpoPushNotification(
          tokens,
          'Items Transferred',
          `Items for request ${requestNumber} have been transferred.`,
          { screen: 'RequestDetail', requestId }
        );
      }
    } else if (after.status === 'returned' || after.status === 'partially_returned') {
      const tokens = await getAdminAndStoreInchargeTokens('requestUpdates');
      if (tokens.length > 0) {
        await sendExpoPushNotification(
          tokens,
          'Items Returned',
          `Items returned for request ${requestNumber}.`,
          { screen: 'RequestDetail', requestId }
        );
      }
    }
  } catch (notifError) {
    logger.error('Push notification failed', { notifError, requestId });
  }
  return;
}
```

### Step 2.4: Add Push Notification to `onRequestCreated`

Inside `onRequestCreated`, after `createActivityLog`:

```typescript
// Notify Admin and StoreIncharge of new request (only when status is 'pending', not draft)
if (request.status === 'pending') {
  try {
    const tokens = await getAdminAndStoreInchargeTokens('requestUpdates');
    if (tokens.length > 0) {
      await sendExpoPushNotification(
        tokens,
        'New Request',
        `${request.requestedByName ?? 'Someone'} submitted request ${request.requestNumber ?? requestId}`,
        { screen: 'RequestQueue', requestId }
      );
    }
  } catch (notifError) {
    logger.error('Push notification failed for new request', { notifError, requestId });
  }
}
```

---

## Phase 3: In-App Notification Center

### Step 3.1: Firestore Schema for In-App Notifications

**Collection:** `notifications/{userId}/items/{notificationId}`

```
notifications/
  {userId}/
    items/
      {notificationId}:
        type: 'request_approved' | 'request_rejected' | 'request_transferred' | 'new_request' | ...
        title: string
        body: string
        read: boolean
        data: { screen, requestId, ... }
        createdAt: Timestamp
```

### Step 3.2: Create Notification Item When Sending Push

In your Cloud Function, when sending a push, also write to `notifications/{userId}/items`:

```typescript
// In notifications.ts or in the trigger
async function createInAppNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  await db.collection('notifications').doc(userId).collection('items').add({
    type,
    title,
    body,
    read: false,
    data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

Call this before or after `sendExpoPushNotification` for each target user.

### Step 3.3: Create `notificationService` (App-Side) for Reading

**File:** `src/services/firebase/notificationService.ts` — add:

```typescript
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';

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

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: NotificationItem[]) => void
): () => void {
  const itemsRef = collection(db, NOTIFICATIONS_COLLECTION, userId, 'items');
  const q = query(itemsRef, orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as NotificationItem[];
    callback(items);
  });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, userId, 'items', notificationId), {
    read: true,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const itemsRef = collection(db, NOTIFICATIONS_COLLECTION, userId, 'items');
  const q = query(itemsRef, where('read', '==', false));
  const snapshot = await getDocs(q);
  return snapshot.size;
}
```

### Step 3.4: Create NotificationCenterScreen

**File:** `src/screens/Notifications/NotificationCenterScreen.tsx`

- List of notifications (from `subscribeToNotifications`)
- Mark as read on tap
- Navigate to `RequestDetail` or `RequestQueue` based on `data.screen` and `data.requestId`
- Use `ScreenHeader` with back button

### Step 3.5: Add Notification Bell to ScreenHeader / Dashboard

**Option A:** Add a global notification bell that appears in `ScreenHeader` when `rightAction` includes a bell.

**Option B:** Add bell to `DashboardScreen` header (or create a shared header component used by stack navigators).

**Example:** In `DashboardStackNavigator` or wherever the Dashboard header is:

```tsx
// In DashboardStackNavigator or similar
<Screen
  name="Dashboard"
  component={DashboardScreen}
  options={{
    headerRight: () => (
      <NotificationBellButton onPress={() => navigation.navigate('NotificationCenter')} />
    ),
  }}
/>
```

Create `NotificationBellButton` that:
- Subscribes to `getUnreadCount` (or uses a hook)
- Shows a badge with count when > 0
- Navigates to NotificationCenterScreen on press

### Step 3.6: Add NotificationCenterScreen to Navigation

In `RootNavigator.tsx` or `MainStackNavigator`, add:

```tsx
<MainStack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
```

And add a way to navigate (e.g., from Dashboard or a bell in the tab bar).

### Step 3.7: Handle Notification Tap (Deep Link)

In `App.tsx` or a root component, add:

```typescript
import * as Notifications from 'expo-notifications';

useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.screen === 'RequestDetail' && data?.requestId) {
      // Navigate to RequestDetailScreen with requestId
      // Use navigationRef or a global navigation service
    }
  });
  return () => subscription.remove();
}, []);
```

You'll need a `navigationRef` to navigate from outside React components. See [React Navigation - Navigating without navigation prop](https://reactnavigation.org/docs/navigating-without-navigation-prop/).

---

## Phase 4: Firestore Rules for Notifications

Add to `firestore.rules`:

```
match /notifications/{userId}/items/{itemId} {
  allow read, update: if isAuthenticated() && request.auth.uid == userId;
  allow create: if false;  // Only Cloud Functions create these
  allow delete: if false;
}
```

---

## Implementation Order Summary

| Phase | Steps | Estimated Effort |
|-------|-------|------------------|
| **1** | 1.1–1.7: Token registration | 2–3 hours |
| **2** | 2.1–2.4: Cloud Functions | 2–3 hours |
| **3** | 3.1–3.7: In-app center | 3–4 hours |
| **4** | Firestore rules | 15 min |

---

## Things to Watch Out For

1. **EAS build required** — Push notifications do not work in Expo Go. Use `npx expo run:ios` or `npx expo run:android` (you have `expo-dev-client`).
2. **iOS credentials** — Run `eas credentials` to configure APNs. EAS can manage keys automatically.
3. **Token refresh** — Tokens can change; `usePushTokenRegistration` re-registers on app foreground.
4. **Foreground handling** — `setNotificationHandler` is set in `notificationService.ts`; notifications show as banners when app is open.
5. **Expo Push Token format** — Must start with `ExponentPushToken[`; validate before sending.

---

## Notification Event Matrix (Final)

| Event | Who Gets Notified | Trigger Location |
|-------|-------------------|------------------|
| Request submitted (pending) | Admin, StoreIncharge | `onRequestCreated` |
| Request approved | Requesting SiteManager | `onRequestUpdated` |
| Request rejected | Requesting SiteManager | `onRequestUpdated` |
| Request transferred | Requesting SiteManager | `onRequestUpdated` |
| Items returned | Admin, StoreIncharge | `onRequestUpdated` |

*Future phases: Low stock, maintenance due, new PO — can use scheduled functions or similar triggers.*

---

## Next Steps

1. Implement Phase 1 (token registration).
2. Test with a physical device and EAS dev build.
3. Implement Phase 2 (Cloud Functions).
4. Deploy functions: `cd functions && npm run build && firebase deploy --only functions`
5. Implement Phase 3 (in-app center) when ready.
