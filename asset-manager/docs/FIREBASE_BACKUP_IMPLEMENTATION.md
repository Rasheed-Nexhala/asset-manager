# Firebase Backup Implementation Guide
## Option C + Option A: Built-in Backups + Scheduled Cloud Function

This guide walks you through implementing **both** Firebase's native daily backups (Option C) and a custom scheduled Cloud Function (Option A) for maximum data protection.

---

## Overview

| Component | What It Does | When It Runs |
|-----------|--------------|--------------|
| **Option C** (Firebase Console) | Native Firestore daily backups | Automatic, managed by Firebase |
| **Option A** (Cloud Function) | Firestore + Auth + Storage export to GCS | Daily at 2 AM (configurable) |

**Option A now backs up:**
- **Firestore** — all collections → `gs://PROJECT-backups-us/firestore/YYYY-MM-DD/`
- **Auth** — all users (JSON) → `gs://PROJECT-backups-us/auth/YYYY-MM-DD.json`
- **Storage** — all files from default bucket → `gs://PROJECT-backups-us/storage/YYYY-MM-DD/`

Together they give you:
- **Redundancy**: Two independent backup systems for Firestore
- **Full coverage**: Firestore, Auth, and Storage in one daily run
- **Simplicity**: One-click enable for Option C

---

# Part 1: Option C — Enable Firebase Built-in Daily Backups

## Step 1.1: Upgrade to Blaze Plan (if needed)

Firebase's native daily backups require the **Blaze (pay-as-you-go)** plan.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **asset-management-system-622c2**
3. Click the **gear icon** → **Usage and billing**
4. Click **Modify plan** → Select **Blaze**
5. Add a billing account (you get free tier allowances; backups may stay within free limits for small projects)

## Step 1.2: Enable Daily Backups in Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click the **Backups** tab
3. Click **Enable** (or **Get started**)
4. Configure:
   - **Retention**: Up to 14 days (choose based on your needs)
   - **Time**: Select when backups run (e.g. 2:00 AM)
   - **Timezone**: Asia/Kolkata (or your preference)

5. Click **Enable** and confirm

**Done.** Firebase will now create automatic daily Firestore backups. No code required.

---

# Part 2: Option A — Scheduled Cloud Function Backup

## Step 2.1: Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: **asset-management-system-622c2**
3. Enable these APIs:
   - **Cloud Firestore API** (usually already on)
   - **Cloud Storage API**
   - **Cloud Scheduler API** (used by Firebase scheduled functions)

   Or run:
   ```bash
   gcloud services enable firestore.googleapis.com storage.googleapis.com cloudscheduler.googleapis.com --project=asset-management-system-622c2
   ```

## Step 2.2: Create a GCS Bucket for Backups

**Important:** Firestore export requires the bucket to be in a US region (`us`, `us-central1`, etc.). European buckets will fail with `INVALID_ARGUMENT`.

```bash
# Create bucket in us-central1 (required for Firestore export)
gcloud storage buckets create gs://asset-management-system-622c2-backups-us \
  --location=us-central1 \
  --project=asset-management-system-622c2
```

**If you already have the bucket:** Skip to Step 2.3 to grant IAM permissions, then deploy.

## Step 2.3: Grant Firestore Export Permissions

The Cloud Function's service account and the Firestore service need access to the bucket.

**A. Grant the Cloud Function service account permission to start exports:**
```bash
gcloud projects add-iam-policy-binding asset-management-system-622c2 \
  --member="serviceAccount:asset-management-system-622c2@appspot.gserviceaccount.com" \
  --role="roles/datastore.importExportAdmin"
```

**B. Grant the Cloud Function service account Storage Admin on the bucket:**
```bash
gcloud storage buckets add-iam-policy-binding gs://asset-management-system-622c2-backups-us \
  --member="serviceAccount:asset-management-system-622c2@appspot.gserviceaccount.com" \
  --role="roles/storage.admin" \
  --project=asset-management-system-622c2
```

**C. Grant the Firestore service account write access to the bucket** (Firestore writes the export files):

First get your project number:
```bash
gcloud projects describe asset-management-system-622c2 --format="value(projectNumber)"
```

Then (replace `PROJECT_NUMBER` with the output):
```bash
gcloud projects add-iam-policy-binding asset-management-system-622c2 \
  --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-firestore.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

## Step 2.4: Deploy the Scheduled Backup Function

The scheduled backup function is in `functions/src/scheduledBackup.ts`. It runs daily at 2 AM (Asia/Kolkata) and exports **Firestore, Auth, and Storage** to your backup bucket.

```bash
cd functions   # from project root
npm install
npm run build
firebase deploy --only functions:scheduledFirestoreBackup
```

## Step 2.5: Verify the Backup

1. **Trigger manually** (optional): In [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler), find the job for `scheduledFirestoreBackup` and click **Run now**
2. **Check logs**: Firebase Console → Functions → Logs, or [Cloud Logging](https://console.cloud.google.com/logs)
3. **Check bucket**: After a few minutes, verify all three backup types:
   - Firestore: `gs://...-backups-us/firestore/YYYY-MM-DD/`
   - Auth: `gs://...-backups-us/auth/YYYY-MM-DD.json`
   - Storage: `gs://...-backups-us/storage/YYYY-MM-DD/`

```bash
# List all backups
gcloud storage ls gs://asset-management-system-622c2-backups-us/firestore/
gcloud storage ls gs://asset-management-system-622c2-backups-us/auth/
gcloud storage ls gs://asset-management-system-622c2-backups-us/storage/
```

---

# Restore Process

## Restore Firestore from Option A Backup

```bash
# Restore from a specific date
gcloud firestore import gs://asset-management-system-622c2-backups-us/firestore/2025-03-08 \
  --project=asset-management-system-622c2

# Restore specific collections only
gcloud firestore import gs://asset-management-system-622c2-backups-us/firestore/2025-03-08 \
  --collection-ids=users,items,inventory,requests,purchaseOrders,vendors,sites \
  --project=asset-management-system-622c2
```

## Restore from Option C (Firebase Console)

1. Go to Firestore Database → **Backups** tab
2. Select a backup point in time
3. Follow the restore wizard (creates a new database or overwrites — use with caution)

## Restore Auth from Option A Backup

First, download the Auth backup from GCS:

```bash
# Download the backup file
gcloud storage cp gs://asset-management-system-622c2-backups-us/auth/2025-03-08.json ./

# Import users (replaces existing users with same UID)
firebase auth:import 2025-03-08.json --project=asset-management-system-622c2
```

**Note:** The Auth export does not include password hashes (for security). Email/password users will need to reset their password after restore. OAuth users (Google, etc.) will work normally.

## Restore Storage from Option A Backup

```bash
# Restore all files from a backup date
gcloud storage -m rsync -r gs://asset-management-system-622c2-backups-us/storage/2025-03-08 \
  gs://asset-management-system-622c2.appspot.com
```

**Warning:** This overwrites existing files with the same path. Use with caution.

---

# Summary Checklist

- [ ] **Option C**: Blaze plan enabled, Daily Backups turned on in Firestore
- [ ] **Option A**: APIs enabled, backup bucket created, IAM permissions set
- [ ] **Option A**: `scheduledFirestoreBackup` function deployed
- [ ] **Verify**: Run Cloud Scheduler job manually, confirm Firestore + Auth + Storage in bucket
- [ ] **Rules & Indexes**: Already in git (`firestore.rules`, `firestore.indexes.json`) — keep committing changes

---

# Cost Notes

- **Option C**: Part of Blaze plan; retention affects storage cost
- **Option A**: Cloud Scheduler (3 free jobs/account), Cloud Function invocations (free tier), GCS storage (low cost for backups)
- Firestore export: 1 read per document (not shown in console metrics)
