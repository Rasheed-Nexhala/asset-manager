#!/usr/bin/env bash
# Copy asset-manager-web production build into hosting-dist/ (inside Firebase project dir).
# Required because firebase deploy rejects public folders outside the project directory.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIST="$ROOT/../asset-manager-web/dist"
DEST="$ROOT/hosting-dist"
if [[ ! -d "$WEB_DIST" ]]; then
  echo "ERROR: $WEB_DIST not found. Run: cd asset-manager-web && npm run build"
  exit 1
fi
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$WEB_DIST/." "$DEST/"
echo "Synced web build to $DEST"
