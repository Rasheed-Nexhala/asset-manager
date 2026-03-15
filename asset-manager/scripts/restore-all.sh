#!/bin/bash
# Restore Firestore, Auth, and Storage from backup
# Usage: ./scripts/restore-all.sh YYYY-MM-DD
# See docs/FIREBASE_RESTORE_ALL.md for full guide

set -e
DATE=${1:? "Usage: ./scripts/restore-all.sh YYYY-MM-DD"}
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
