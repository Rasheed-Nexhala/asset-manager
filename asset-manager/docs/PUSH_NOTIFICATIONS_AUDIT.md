# Push Notifications — Full Project Audit

**Question:** After uploading the FCM key and running `eas build --platform android --profile production`, will notifications work? Or is something else needed?

---

## Executive Summary

**Yes, notifications should work** after you:

1. Upload the FCM V1 service account key to EAS
2. Run `eas build --platform android --profile production`
3. Install the new build on a **physical Android device**
4. Log in and grant notification permissions
5. Ensure Cloud Functions are deployed

The codebase is wired correctly. A few optional improvements and one deployment check are noted below.

---

## End-to-End Flow (Verified)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. CLIENT (App)                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • App.tsx calls usePushTokenRegistration(userId) when user is logged in         │
│ • usePushTokenRegistration runs on mount + when app returns to foreground        │
│ • registerPushToken(userId) → getExpoPushToken() → updateDoc(users/{id})         │
│ • getExpoPushToken requires: physical device, granted permissions, FCM in build  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 2. FIRESTORE                                                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • users/{userId}.expoPushTokens: string[]                                        │
│ • Firestore rules allow users to update own expoPushTokens ✓                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 3. CLOUD FUNCTIONS (Firestore triggers)                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • onRequestCreated, onRequestUpdated, onPOUpdated, etc.                         │
│ • getUserPushTokens(userId, type) / getAdminAndStoreInchargeTokens(type)         │
│ • sendExpoPushNotification(tokens, title, body, data)                             │
│ • Uses expo-server-sdk → Expo Push API → FCM (Android)                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 4. EXPO PUSH SERVICE → FCM → DEVICE                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • EAS FCM V1 credentials used by Expo to deliver to FCM                          │
│ • channelId: null → Expo uses "Default" channel (auto-created) ✓                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Checklist — What's Already Done

| Item | Status | Location |
|------|--------|----------|
| `googleServicesFile` in app.json | ✅ | `app.json` |
| `expo-notifications` plugin | ✅ | `app.json` |
| `expo-notifications` package | ✅ | `package.json` |
| Token registration on login | ✅ | `App.tsx` → `usePushTokenRegistration` |
| Token re-registration on foreground | ✅ | `usePushTokenRegistration.ts` |
| Firestore rules for expoPushTokens | ✅ | `firestore.rules` |
| Cloud Functions send pushes | ✅ | `functions/src/index.ts`, `notifications.ts` |
| Deep link on notification tap | ✅ | `RootNavigator.tsx` |
| Notification handler (alert, sound, etc.) | ✅ | `notificationService.ts` |
| notificationPrefs default (opt-out) | ✅ | `prefs[type] === false` only filters when explicitly false |

---

## What You Must Do (External / One-Time)

| Step | Action | Status |
|------|--------|--------|
| 1 | Upload FCM V1 service account key to EAS | ⏳ You're doing this |
| 2 | Run `eas build --platform android --profile production` | ⏳ After step 1 |
| 3 | Install new build on **physical Android device** (not emulator) | ⏳ |
| 4 | Log in and grant notification permissions when prompted | ⏳ |
| 5 | Deploy Cloud Functions if not already: `firebase deploy --only functions` | ⏳ Verify |

---

## Important Conditions

### 1. Physical Device Required
`getExpoPushToken()` returns `null` on simulators/emulators. You must test on a real Android device.

### 2. User Must Be Logged In
`usePushTokenRegistration(userId)` only runs when `userId` is non-null. Tokens are stored per user.

### 3. Permissions Must Be Granted
If the user denies notification permissions, `getExpoPushToken()` returns `null` and no token is stored.

### 4. Cloud Functions Must Be Deployed
Firestore triggers (onRequestCreated, onRequestUpdated, etc.) live in Cloud Functions. If they're not deployed, no push will be sent. Verify with:
```bash
cd functions && firebase deploy --only functions
```

---

## Optional Improvements (Not Blocking)

| Improvement | Benefit |
|-------------|---------|
| Add `setNotificationChannelAsync('default', {...})` before `getExpoPushToken()` on Android | More control over channel; Expo already creates "Default" if channelId is null, so this is optional |
| Add `channelId: 'default'` to `sendExpoPushNotification` payload | Explicit channel; current behavior uses Expo default |
| Add push receipt checking in Cloud Functions | Detect `DeviceNotRegistered` and remove stale tokens from Firestore |

---

## Verification Steps (After Build)

1. Install the new APK on a physical Android device.
2. Log in to the app.
3. Grant notification permissions when prompted.
4. In Firestore Console: `users/{yourUserId}` → confirm `expoPushTokens` has at least one token (e.g. `ExponentPushToken[xxx]`).
5. Trigger a notification (e.g. create a request as Site Manager, approve it as Admin).
6. Confirm the push appears on the device.
7. Tap the notification and confirm deep link works (e.g. opens ProcessRequest screen).

---

## Summary

| Question | Answer |
|----------|--------|
| Will notifications work after FCM key + build? | **Yes**, if you use a physical device, grant permissions, and Cloud Functions are deployed |
| Is any code change required? | **No** — the flow is complete |
| What could still block? | Emulator testing, denied permissions, Cloud Functions not deployed |
