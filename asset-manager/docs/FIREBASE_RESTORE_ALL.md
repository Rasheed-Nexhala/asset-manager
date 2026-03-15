# Firebase Full Restore Guide
## Restore Firestore, Auth, and Storage in One Go

Use this when you have lost data and need to restore from a daily backup.

---

## Prerequisites

- Backup date (e.g. `2026-03-15`) from your daily 2 AM backups
- `gcloud` and `firebase` CLI installed and authenticated
- Project: `asset-management-system-622c2`

---

## Restore Script

Save as `scripts/restore-all.sh`:

```bash
#!/bin/bash
# Restore Firestore, Auth, and Storage from backup
# Usage: ./restore-all.sh YYYY-MM-DD

set -e
DATE=${1:? "Usage: ./restore-all.sh YYYY-MM-DD"}
BUCKET="gs://asset-management-system-622c2-backups-us"
PROJECT="asset-management-system-622c2"

echo "=== Restoring from backup: $DATE ==="

# 1. Auth (users can log in again)
echo "1/3 Restoring Auth..."
gcloud storage cp "$BUCKET/auth/$DATE.json" ./auth-restore.json
firebase auth:import ./auth-restore.json --project=$PROJECT
echo "Auth done."

# 2. Firestore (all data)
echo "2/3 Restoring Firestore..."
gcloud firestore import "$BUCKET/firestore/$DATE" --project=$PROJECT
echo "Firestore import started (runs in background). Check: gcloud firestore operations list --project=$PROJECT"

# 3. Storage (files)
echo "3/3 Restoring Storage..."
gcloud storage -m rsync -r "$BUCKET/storage/$DATE/" gs://asset-management-system-622c2.firebasestorage.app
echo "Storage done."

echo "=== Restore complete for $DATE ==="
```

---

## How to Use

```bash
# Make it executable (once)
chmod +x scripts/restore-all.sh

# Restore from a specific backup date
./scripts/restore-all.sh 2026-03-15
```

---

## What It Does

| Step | Component | Command |
|------|-----------|---------|
| 1 | Auth | Download backup → `firebase auth:import` |
| 2 | Firestore | `gcloud firestore import` |
| 3 | Storage | `gcloud storage rsync` |

---

## Notes

1. **Auth backup location** — The automated backup saves to `auth/YYYY-MM-DD.json` in the bucket. If that path doesn't exist, you'll need an Auth export from `firebase auth:export` and upload it to the bucket first.

2. **Firestore import** — Runs asynchronously. Check status with:
   ```bash
   gcloud firestore operations list --project=asset-management-system-622c2
   ```

3. **Storage bucket** — If your Storage bucket name differs, update the `gs://asset-management-system-622c2.firebasestorage.app` line in the script.

---

## Quick Reference

| Backup date | Restore command |
|-------------|-----------------|
| 2026-03-15 | `./scripts/restore-all.sh 2026-03-15` |
| 2026-03-14 | `./scripts/restore-all.sh 2026-03-14` |

---

## Before You Restore

1. **Stop writes** — Pause the app or ask users not to make changes.
2. **Choose a restore date** — Pick the backup closest to before the data loss.
3. **Verify backups exist**:
   ```bash
   gcloud storage ls gs://asset-management-system-622c2-backups-us/firestore/
   gcloud storage ls gs://asset-management-system-622c2-backups-us/auth/
   gcloud storage ls gs://asset-management-system-622c2-backups-us/storage/
   ```

---

## Related Docs

- [FIREBASE_DISASTER_RECOVERY.md](./FIREBASE_DISASTER_RECOVERY.md) — Full disaster recovery guide
- [FIREBASE_BACKUP_IMPLEMENTATION.md](./FIREBASE_BACKUP_IMPLEMENTATION.md) — Backup setup
