---
name: ciams-dual-platform-context
description: Maps a CIAMS feature or domain to the correct files in BOTH React Native (asset-manager/) and web (asset-manager-web/) so the agent loads cross-platform context without the user picking folders. Use when the user mentions understanding, implementing, or debugging a feature across mobile and web, dual platform, parity, or names a domain like PO, purchase order, requests, inventory, maintenance, sites, auth, vendors, activity log, or notifications.
---

# CIAMS dual-platform context

This monorepo has **two apps** with parallel features:

| Package | Role | UI entry points |
|---------|------|-----------------|
| `asset-manager/` | React Native | `src/screens/`, `src/components/` |
| `asset-manager-web/` | Vite + React | `src/pages/`, `src/components/` |

Shared logic is intended to stay aligned: `src/types/`, `src/services/firebase/`, `src/store/`, `src/constants/`, `src/utils/`, `src/hooks/` (same relative paths under each package when the feature exists in both).

## When the user names a feature

1. **Normalize** their words to a **domain** in the table below (e.g. “PO”, “purchase order”, “vendor ledger” → **purchase-orders** or **vendors**).
2. **List paths** for **both** packages using the table + naming rules—do not assume only one app unless they say “mobile only” / “web only”.
3. **Prefer reading** paired files: same `types/*`, `services/firebase/*Service.ts`, and tests when present.
4. If a path might not exist, **verify** with a quick search (`grep` / glob) before claiming it.

## Naming rules (Screen ↔ Page)

- Mobile: `*Screen.tsx` under `screens/<Feature>/`.
- Web: `*Page.tsx` under `pages/<feature>/` (often camelCase folder names).
- Web **vendor** flows (vendor management, PO vendor ledger) often live under `pages/vendor/`, while mobile may keep them under `screens/PurchaseOrder/`.

## Domain → where to look

Use these as **anchors**; expand with `glob`/`grep` for screens/pages named after the feature.

| Domain | Mobile UI | Web UI | Shared (both packages, under `src/`) |
|--------|-----------|--------|----------------------------------------|
| Purchase orders | `screens/PurchaseOrder/`, `components/PurchaseOrder/` | `pages/purchaseOrder/`, `components/purchaseOrder/`, often `pages/vendor/` | `services/firebase/purchaseOrderService.ts`, `types/purchaseOrder.ts`, matching `utils/`, `store/` slices |
| Requests | `screens/Requests/`, `components/Requests/` | `pages/requests/`, `components/requests/` | `services/firebase/requestService.ts` (if present), `types/` for request models, `store/` |
| Inventory | `screens/Inventory/`, `screens/SelectItems/`, `components/Inventory/` | `pages/inventory/`, `components/inventory/` | matching `services/firebase/*`, `types/*` |
| Maintenance | `screens/Maintenance/`, `components/Maintenance/` | `pages/maintenance/`, `components/maintenance/` | matching services/types |
| Sites | `screens/Sites/`, `components/Sites/` | `pages/SitesPage.tsx` and related under `pages/`, `components/sites/` | matching services/types |
| Auth | `screens/Authentication/` | `pages/LoginPage.tsx`, `SignupPage.tsx`, `AuthCheckingPage.tsx`, `components/auth/` | `services/firebase/authService.ts`, auth-related `store/` |
| Users / profile | `screens/Users/` | `pages/UsersPage.tsx`, `ProfilePage.tsx`, etc. | user-related services/types/store |
| Activity log | `screens/ActivityLog/` | `pages/ActivityLogPage.tsx`, `pages/MyActivityPage.tsx`, `components/activityLog/` | matching services/types |
| Notifications | `screens/Notifications/` | `pages/NotificationCenterPage.tsx` (and related) | matching services/types |
| Navigation / routes | `navigation/*`, `RootNavigator.tsx` | `router.tsx` | — |

## What to output in chat

Give the user a **compact bundle** they can reuse:

1. **Domain** chosen and one-line rationale.
2. **Markdown bullet list** of **workspace-relative paths** (each path is clickable in Cursor). Group under **Mobile**, **Web**, **Shared logic**.
3. Optional: **one-line** note if web vs mobile folder names differ (e.g. vendor).

Do not dump entire file contents unless asked; links + short labels are enough for “understand” workflows.
