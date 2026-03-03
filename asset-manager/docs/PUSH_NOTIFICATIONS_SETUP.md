# Push Notifications (FCM) Setup Guide — Asset Manager

This guide walks you through enabling push notifications for the Android app. The code is already in place; these steps configure the **build-time and Firebase Console** setup.

---

## Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Your App       │────▶│  Expo Push API    │────▶│  FCM (Android)   │
│  (Expo token)   │     │  (expo-server-sdk)│     │  APNs (iOS)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                          │
        │                          │
        ▼                          ▼
┌─────────────────┐     ┌──────────────────┐
│  Firestore      │     │  Cloud Functions  │
│  (token store)  │     │  (send pushes)    │
└─────────────────┘     └──────────────────┘
```

**Current state:**
- ✅ Client code (`notificationService.ts`, `usePushTokenRegistration`)
- ✅ Cloud Functions (`notifications.ts`, `sendExpoPushNotification`)
- ✅ `google-services.json` linked in `app.json` (just added)
- ⏳ Firebase Console setup
- ⏳ EAS FCM credentials
- ⏳ Fresh Android build

---

## Step 1 — Enable Cloud Messaging in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select project **asset-management-system-622c2**
3. Go to **Project Settings** (gear icon) → **General**
4. Under **Your apps**, find **com.ibf.assetmanager** (Android)
5. If Cloud Messaging is not enabled:
   - Go to **Build** → **Cloud Messaging**
   - Enable **Cloud Messaging API** if prompted
6. Download a fresh `google-services.json`:
   - Project Settings → Your apps → Android app → **Download google-services.json**
7. Replace the file in your project root:
   ```bash
   # From project root (asset-manager/)
   cp ~/Downloads/google-services.json ./google-services.json
   ```

---

## Step 2 — Verify `app.json` (Already Done)

`googleServicesFile` has been added to `app.json`:

```json
"android": {
  "package": "com.ibf.assetmanager",
  "googleServicesFile": "./google-services.json",
  "versionCode": 4,
  ...
}
```

This tells the Expo build to embed FCM config into the APK.

---

## Step 3 — Configure FCM Credentials in EAS

Expo needs a **Firebase Service Account** to send pushes via FCM.

### 3a. Create a Service Account in Firebase

1. Firebase Console → **Project Settings** → **Service accounts**
2. Click **Generate new private key** → Confirm
3. Save the JSON file (e.g. `asset-manager-firebase-adminsdk.json`)
4. **Important:** This file contains secrets. Never commit it to git.

### 3b. Upload to EAS

From the project root:

```bash
cd /Applications/Nexhala/asset-manager/asset-manager
eas credentials
```

Then:

1. Select **Android**
2. Select your build profile (e.g. **production**)
3. Choose **Set up a Google Service Account Key for Push Notifications (FCM V1)**
4. When prompted, provide the path to the service account JSON:
   ```
   /path/to/asset-manager-firebase-adminsdk.json
   ```

EAS will store the credentials securely. You only need to do this once per project.

---

## Step 4 — Rebuild and Deploy the Android App

1. Build a new APK/AAB:
   ```bash
   eas build --platform android --profile production
   ```

2. Wait for the build to complete (EAS Dashboard or CLI).

3. Distribute the new build:
   - **Internal testing:** Use the build URL from EAS
   - **Play Store:** Upload the AAB to Google Play Console

4. **Users must install the new build.** Existing installs will not receive push notifications until they update.

---

## Step 5 — Verify End-to-End

1. Install the new APK on a physical Android device (emulators often have FCM issues).
2. Log in to the app.
3. Grant notification permissions when prompted.
4. Check Firestore:
   - Go to `users/{yourUserId}` and confirm `expoPushTokens` has at least one token.
5. Trigger a notification (e.g. create a request, approve a PO) and confirm it appears on the device.

---

## Troubleshooting

| Symptom | Possible cause | Fix |
|--------|----------------|------|
| `getExpoPushToken()` returns `null` | FCM not configured in build | Ensure `googleServicesFile` is set, rebuild |
| No token in Firestore | Permissions denied or simulator | Use physical device, grant permissions |
| Build fails with "google-services" error | Wrong path to `google-services.json` | Ensure path is `./google-services.json` from project root |
| Push not received | EAS FCM credentials missing | Run `eas credentials` and upload service account |

---

## Quick Checklist

- [ ] Cloud Messaging enabled in Firebase Console
- [ ] Fresh `google-services.json` downloaded and placed in project root
- [ ] `googleServicesFile` in `app.json` (done)
- [ ] Firebase Service Account created and JSON downloaded
- [ ] `eas credentials` run and FCM key uploaded
- [ ] `eas build --platform android --profile production` completed
- [ ] New build installed on test device
- [ ] Token visible in Firestore `users/{userId}.expoPushTokens`
- [ ] Test notification received

---

## Optional: Improve Notification UX

You can add these to `app.json` for better Android notifications:

```json
"plugins": [
  [
    "expo-notifications",
    {
      "icon": "./assets/notification-icon.png",
      "color": "#ffffff",
      "defaultChannel": "default",
      "sounds": []
    }
  ]
]
```

And in your app code, set a default channel (Android 8+):

```ts
import * as Notifications from 'expo-notifications';

await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.DEFAULT,
});
```

---

## Summary

| Step | Action | Where |
|------|--------|-------|
| 1 | Enable Cloud Messaging, download `google-services.json` | Firebase Console |
| 2 | `googleServicesFile` in `app.json` | ✅ Done |
| 3 | Create service account, run `eas credentials` | Firebase Console + Terminal |
| 4 | `eas build --platform android --profile production` | Terminal |
| 5 | Install new build, test | Device |

The code is correct. These steps complete the configuration so push notifications work end-to-end.
