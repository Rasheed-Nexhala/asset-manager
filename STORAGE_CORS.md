# Firebase Storage CORS Setup

This document describes the CORS configuration for the Firebase Storage bucket used by the asset-manager project.

## Configuration File

- **Location:** `cors.json` (project root)
- **Bucket:** `gs://asset-management-system-622c2.firebasestorage.app`

## Apply CORS Configuration

To apply or update the CORS settings on the Storage bucket:

```bash
gsutil cors set cors.json gs://asset-management-system-622c2.firebasestorage.app
```

If `gsutil` is not available, use gcloud:

```bash
gcloud storage buckets update gs://asset-management-system-622c2.firebasestorage.app --cors-file=cors.json
```

## Current Configuration

The CORS config allows GET requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative dev port)

`maxAgeSeconds` is set to 3600 (1 hour) for preflight caching.
