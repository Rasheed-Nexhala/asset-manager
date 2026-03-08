# Firebase Disaster Recovery Guide
## CIAMS Asset Manager

---

## Is the backup setup enough?

For a construction inventory app like CIAMS — yes, this is very solid.

| Risk | Covered? |
|------|----------|
| Accidental data deletion | Yes |
| Someone corrupts data | Yes |
| Firebase outage | Partial (backups are still on Google infra) |
| Ransomware / account hack | Partial (backups in same GCP project — see note below) |
| Developer mistake (bad deploy) | Yes |
| Phone/device lost | Yes (cloud data unaffected) |

**The one gap:** Both your live data and backups are in the same Google Cloud project. If your GCP account is compromised, both could be at risk. The extra step for maximum safety is to **download a weekly Auth export to a local computer**:

```bash
firebase auth:export users-backup-$(date +%Y%m%d).json \
  --format=json \
  --project=asset-management-system-622c2
```

---

## How the backup system works

Every day at 2 AM (Asia/Kolkata), the `scheduledFirestoreBackup` Cloud Function runs and creates three backups:

```
Every day at 2 AM
        │
        ▼
┌─────────────────────────────────────┐
│       scheduledFirestoreBackup      │
│        (Cloud Function)             │
└─────────────────────────────────────┘
        │
        ├── 1. FIRESTORE EXPORT
        │      Reads all documents in Firestore
        │      Writes snapshot to GCS bucket
        │      gs://...backups/firestore/YYYY-MM-DD/
        │
        ├── 2. AUTH EXPORT
        │      Lists all user accounts
        │      Writes JSON file to GCS
        │      gs://...backups/auth/YYYY-MM-DD.json
        │
        └── 3. STORAGE BACKUP
               Copies every file from your app's storage bucket
               to the backup bucket
               gs://...backups/storage/YYYY-MM-DD/


Separately — Firebase built-in (Option C):
        │
        ▼
Firestore → Firebase-managed backup (14-day rolling window)
            Accessible from: Firebase Console → Firestore → Backups tab
```

This gives you **two independent Firestore snapshots** every day, plus Auth and Storage.

---

## What is your worst-case data loss?

With daily backups at 2 AM, the maximum you can ever lose is **24 hours of data** — whatever was entered between the last backup and the moment of disaster. For a site app with 5–20 users, this is very acceptable.

---

## How to recover — step by step

### Before you start

1. **Stop writes** — Ask users to pause activity, or take the app offline temporarily.
2. **Choose a restore date** — Pick the backup closest to before the data loss.
3. **Check available backups**:

```bash
gsutil ls gs://asset-management-system-622c2-backups/firestore/
gsutil ls gs://asset-management-system-622c2-backups/auth/
gsutil ls gs://asset-management-system-622c2-backups/storage/
```

---

### Scenario 1: Someone accidentally deleted items or requests

Restore only the affected collections (safe — leaves everything else untouched):

```bash
gcloud firestore import gs://asset-management-system-622c2-backups/firestore/YYYY-MM-DD \
  --collection-ids=items,inventory \
  --project=asset-management-system-622c2
```

Replace `YYYY-MM-DD` with the date of the backup you want (e.g. `2026-03-07`).

---

### Scenario 2: A bug corrupted a large amount of data

1. Stop the app or advise users not to make changes.
2. Fix the bug in code.
3. Full Firestore restore:

```bash
gcloud firestore import gs://asset-management-system-622c2-backups/firestore/YYYY-MM-DD \
  --project=asset-management-system-622c2
```

4. Re-deploy the fixed code.
5. Resume app.

---

### Scenario 3: User accounts were deleted

```bash
# Download the Auth backup
gsutil cp gs://asset-management-system-622c2-backups/auth/YYYY-MM-DD.json ./

# Re-import users
firebase auth:import YYYY-MM-DD.json --project=asset-management-system-622c2
```

> **Note:** Email/password users will need to reset their password after restore.
> Google/OAuth login users are unaffected and will work normally.

---

### Scenario 4: Files or documents lost from Storage

```bash
gsutil -m rsync -r \
  gs://asset-management-system-622c2-backups/storage/YYYY-MM-DD \
  gs://asset-management-system-622c2.appspot.com
```

> **Warning:** This overwrites existing files with the same path. Use only when needed.

---

### Scenario 5: Total disaster — everything is gone

Restore in this exact order:

**Step 1 — Auth** (so users can log in again):
```bash
gsutil cp gs://asset-management-system-622c2-backups/auth/YYYY-MM-DD.json ./
firebase auth:import YYYY-MM-DD.json --project=asset-management-system-622c2
```

**Step 2 — Firestore** (so all data is back):
```bash
gcloud firestore import gs://asset-management-system-622c2-backups/firestore/YYYY-MM-DD \
  --project=asset-management-system-622c2
```

**Step 3 — Storage** (so all files and documents are back):
```bash
gsutil -m rsync -r \
  gs://asset-management-system-622c2-backups/storage/YYYY-MM-DD \
  gs://asset-management-system-622c2.appspot.com
```

**Step 4 — Rules and indexes** (already in git, re-deploy if needed):
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

### Scenario 6: Restore from Firebase built-in backup (Option C)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project **asset-management-system-622c2**
3. Open **Firestore Database** → **Backups** tab
4. Select a backup date/time
5. Click **Restore**
6. Choose:
   - **New database** — safe, no overwrite, recommended first step to verify
   - **Overwrite existing** — replaces your live database

---

## Monitor backup progress

Check if a Firestore import/export is still running:

```bash
gcloud firestore operations list --project=asset-management-system-622c2
```

---

## Full summary

| What you have | What it protects |
|---|---|
| Firebase built-in (Option C) | Firestore — 14-day rolling window, one-click restore |
| Cloud Function daily backup | Firestore + Auth + Storage in your own GCS bucket |
| Git (`firestore.rules`, `firestore.indexes.json`) | Security rules and database structure |
| **Max data loss possible** | **24 hours** |

---

## Key project details

| Item | Value |
|------|-------|
| Project ID | `asset-management-system-622c2` |
| Backup bucket | `gs://asset-management-system-622c2-backups` |
| Firestore region | `eur3` (Europe) |
| Backup schedule | Daily at 2 AM Asia/Kolkata |
| Backup function | `scheduledFirestoreBackup` |
| Firestore backup path | `gs://...backups/firestore/YYYY-MM-DD/` |
| Auth backup path | `gs://...backups/auth/YYYY-MM-DD.json` |
| Storage backup path | `gs://...backups/storage/YYYY-MM-DD/` |
