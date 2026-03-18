# Feature Gap Analysis: asset-manager (Mobile) vs asset-manager-web

**Analysis Date:** March 18, 2025  
**Scope:** Features present in the React Native (Expo) mobile app that are missing, incomplete, or different in the React web app.

---

## Executive Summary

The web app (`asset-manager-web`) has achieved substantial feature parity with the mobile app (`asset-manager`). Most core flows—Auth, Requests, Inventory, Maintenance, Purchase Orders, Sites, Users, Activity Log—are implemented. The gaps fall into these categories:

1. **Platform-specific** – Push notifications, native PDF/share, camera, offline banner
2. **UX differences** – Full-screen vs modal patterns (item selection, vendor add)
3. **Display gaps** – PO documents (invoices) not shown on web
4. **Operational** – Sentry error tracking, add-vendor-from-PO flow

---

## 1. Notifications & Platform

| Feature | Mobile | Web | Status |
|--------|--------|-----|--------|
| **Push notifications** | ✅ expo-notifications, Cloud Functions | ❌ None | **MISSING** |
| **Deep links from notification tap** | ✅ Navigate to ProcessRequest, ApprovePO, ReceivePO, etc. | ❌ None | **MISSING** |
| **Cold-start handling** | ✅ `getLastNotificationResponseAsync` when app opened from notification | ❌ None | **MISSING** |
| **In-app notifications** | ✅ NotificationCenterScreen | ✅ NotificationCenterPage | Parity |
| **Unread badge** | ✅ Tab/header badge | ✅ TopHeader badge | Parity |
| **Mark read** | ✅ On tap | ✅ Same | Parity |

**Impact:** Web users do not receive push alerts and cannot jump directly to a request/PO from a notification.

---

## 2. Purchase Orders & Vendors

| Feature | Mobile | Web | Status |
|--------|--------|-----|--------|
| **Display of received documents (invoices/bills)** | ✅ `PODocumentCard` in ApprovePOScreen when status = received | ❌ Not shown in ApprovePOPage, ReceivePOPage, or PurchaseOrderDetailPage | **MISSING** |
| **Native PDF generation + share** | ✅ expo-print + expo-sharing (download/share) | ⚠️ `window.print()` only (user must "Save as PDF" manually) | **WEAKER** |
| **Add vendor from CreatePO** | ✅ "Add New" → AddVendorScreen → Save → back to CreatePO with updated list | ⚠️ "Add New" → `/vendors?add=1` → user leaves CreatePO, must navigate back manually | **WEAKER** |
| **Add Vendor screen** | ✅ Full-screen AddVendorScreen | ⚠️ Modal on VendorManagementPage | UX difference |
| **Item selector** | ✅ Full-screen SelectItemsScreen | ⚠️ ItemSelectorModal | UX difference |
| **PO reject** | ✅ Yes | ✅ Yes | Parity |
| **Vendor delete** | ❌ Not on mobile | ✅ Web has delete with confirmation | Web-only |

---

## 3. Maintenance

| Feature | Mobile | Web | Status |
|--------|--------|-----|--------|
| **SelectItemForMaintenance** | ✅ Full-screen SelectItemForMaintenanceScreen | ⚠️ Modal on AddToMaintenancePage | UX difference |
| **Image picker / camera** | ✅ expo-image-picker (library + crop, aspect ratio) | ⚠️ File input only (no camera, no in-browser editing) | **WEAKER** |
| **Pull-to-refresh** | ✅ RefreshControl on dashboard and item selector | ❌ No pull-to-refresh | **MISSING** |
| **Write-off role check** | ⚠️ No explicit check | ✅ `canWriteOff` (Admin/StoreIncharge) with Access Denied | Web better |
| **partially_returned_and_written_off status** | ❌ Not in statusConfig | ✅ Handled | Web better |
| **KPI summary** | ❌ No | ✅ Active, Pending, Returned, Written Off counts | Web-only |

---

## 4. Offline & Error Handling

| Feature | Mobile | Web | Status |
|--------|--------|-----|--------|
| **NoInternetScreen** | ✅ Full-screen overlay when offline | N/A | Platform-specific |
| **OfflineBanner** | N/A (uses NoInternetScreen) | ⚠️ Implemented but **not rendered** in AppLayout | **MISSING (unused)** |
| **Sentry error tracking** | ✅ @sentry/react-native | ❌ No Sentry on web | **MISSING** |
| **Network status** | ✅ @react-native-community/netinfo | ✅ navigator.onLine + events | Parity |

---

## 5. Inventory & Sites

| Feature | Mobile | Web | Status |
|--------|--------|-----|--------|
| **CategorySelectScreen** | ✅ Full-screen picker | ⚠️ CategoryPicker (inline dropdown) | UX difference |
| **SelectItemsScreen** | ✅ Full-screen for Requests/POs | ⚠️ ItemSelectorModal | UX difference |
| **Add/Edit Site** | ✅ Separate AddSiteScreen, EditSiteScreen | ⚠️ Modals on SitesPage | UX difference |
| **Other sites inventory** | ✅ SiteManager read-only | ✅ Same | Parity |
| **Inventory adjustments** | ✅ InventoryAdjustmentModal | ✅ Same | Parity |
| **Steel master, categories, update requests** | ✅ | ✅ | Parity |

---

## 6. Requests, Auth, Dashboard

| Feature | Mobile | Web | Status |
|--------|--------|-----|--------|
| **Create/Edit/Process/Reject/Return** | ✅ | ✅ | Parity |
| **Site transfer** | ✅ | ✅ | Parity |
| **Password reset** | ✅ | ✅ | Parity |
| **Inactive account handling** | ✅ | ✅ | Parity |
| **Role-based access** | ✅ | ✅ | Parity |

---

## 7. Summary: Features Missing or Weaker on Web

### Critical (user-facing gaps)

1. **Display of PO documents (invoices/bills)** – Received POs have documents in Firestore; mobile shows them via `PODocumentCard`; web does not display them anywhere.
2. **Push notifications** – No web push; users rely on in-app notifications only.
3. **Add vendor from CreatePO without leaving** – Mobile keeps user in CreatePO flow; web navigates away to VendorManagementPage.

### Important (UX / capability)

4. **PDF generation and share** – Mobile generates and shares PDF natively; web only offers print dialog.
5. **OfflineBanner** – Component exists but is not rendered; users get no visual feedback when offline.
6. **Maintenance photo capture** – Mobile supports camera + library + crop; web is file input only.
7. **Pull-to-refresh** – Mobile has it on maintenance and item selection; web does not.

### Operational

8. **Sentry error tracking** – No error monitoring on web.

### UX differences (not necessarily gaps)

- Full-screen vs modal for item selection, category selection, vendor add, site add/edit.
- Web has some enhancements: Maintenance KPI summary, PurchaseOrderDetailPage, Vendor delete, explicit write-off role check, `partially_returned_and_written_off` status.

---

## 8. Recommendations

| Priority | Action |
|----------|--------|
| High | Add PO documents display (PODocumentCard or equivalent) to ApprovePOPage, ReceivePOPage, and PurchaseOrderDetailPage when `po.documents` exists |
| High | Render `OfflineBanner` in AppLayout when `!navigator.onLine` |
| Medium | Add web push (FCM + service worker) for parity with mobile notifications |
| Medium | Improve add-vendor-from-CreatePO flow (e.g. inline modal or return-to-origin after save) |
| Medium | Add PDF download/share on web (e.g. jsPDF or similar) instead of relying on print |
| Low | Add Sentry (@sentry/react) for web error tracking |
| Low | Add pull-to-refresh where appropriate (maintenance list, item selector) |

---

*Generated from multi-agent exploration of asset-manager (React Native) and asset-manager-web (React + Vite).*
