# CIAMS Asset Manager — Complete Application Documentation

> **Construction Inventory & Asset Management System (CIAMS)**  
> A React Native mobile application for managing construction assets, inventory, requests, purchase orders, and maintenance across multiple sites.

**Version:** 4.0.0  
**Last Updated:** March 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Configuration](#5-configuration)
6. [App Boot Flow](#6-app-boot-flow)
7. [Navigation & Screens](#7-navigation--screens)
8. [State Management](#8-state-management)
9. [Firebase & Backend](#9-firebase--backend)
10. [Core Features](#10-core-features)
11. [User Roles & Permissions](#11-user-roles--permissions)
12. [Business Logic Flows](#12-business-logic-flows)
13. [UI Components & Design System](#13-ui-components--design-system)
14. [Testing](#14-testing)
15. [Build & Deployment](#15-build--deployment)
16. [Key Files Reference](#16-key-files-reference)

---

## 1. Overview

### 1.1 Purpose

CIAMS Asset Manager is a field-ready mobile application designed for construction and industrial environments. It enables:

- **Central Store Management** — Admin and Store Incharge manage inventory at the main warehouse
- **Site-Level Inventory** — Site Managers view and request items for their assigned sites
- **Request Workflow** — Site Managers create requests; Store Incharge/Admin approve, transfer, or reject
- **Purchase Orders** — Create, approve, and receive purchase orders with vendor management
- **Maintenance Tracking** — Add items to maintenance, return, or write off
- **Activity Audit** — Server-side activity logging for compliance and traceability
- **Push Notifications** — Real-time alerts for requests, POs, maintenance, and stock alerts

### 1.2 Target Users

| Role | Description |
|------|-------------|
| **Admin** | Full system access: users, sites, inventory, requests, POs, maintenance |
| **Store Incharge** | Central store operations: inventory, requests, POs, maintenance |
| **Site Manager** | Site-specific: view inventory, create requests, return items |
| **Unassigned** | Limited access until role is assigned by Admin |

---

## 2. Project Structure

```
asset-manager/
├── index.ts                    # Entry point (registerRootComponent)
├── App.tsx                     # Root component with providers
├── global.css                  # Tailwind/NativeWind base styles
├── app.json                    # Expo app config
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── eas.json                    # EAS Build config
├── firebase.json               # Firebase project config
├── firestore.indexes.json
├── firestore.rules
├── storage.rules
├── google-services.json        # Android Firebase config
│
├── config/
│   └── firebase.ts             # Firebase SDK initialization
│
├── functions/                  # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts            # Firestore triggers, callable functions
│   │   └── notifications.ts    # Push notification helpers
│   └── package.json
│
├── scripts/
│   └── patch-expo-dev-menu.js
│
├── assets/                     # Icons, splash, favicon
│
├── src/
│   ├── components/             # Feature-specific components
│   │   ├── Dashboard/
│   │   ├── Inventory/
│   │   ├── Requests/
│   │   ├── PurchaseOrder/
│   │   ├── Maintenance/
│   │   ├── Sites/
│   │   ├── ActivityLog/
│   │   ├── Users/
│   │   ├── UserProfile/
│   │   └── layout/
│   │
│   ├── screens/                # Screen components
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   ├── Inventory/
│   │   ├── Requests/
│   │   ├── PurchaseOrder/
│   │   ├── Maintenance/
│   │   ├── Sites/
│   │   ├── Users/
│   │   └── Notifications/
│   │
│   ├── navigation/             # React Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── BottomTabNavigator.tsx
│   │   └── *StackNavigator.tsx
│   │
│   ├── store/                  # Redux store
│   │   ├── index.ts
│   │   ├── hooks.ts
│   │   ├── slices/
│   │   ├── thunks/
│   │   └── selectors/
│   │
│   ├── services/firebase/      # Firebase services
│   │   ├── authService.ts
│   │   ├── userRoleService.ts
│   │   ├── inventoryService.ts
│   │   ├── requestService.ts
│   │   ├── siteService.ts
│   │   ├── purchaseOrderService.ts
│   │   ├── maintenanceService.ts
│   │   ├── activityLogService.ts
│   │   ├── notificationService.ts
│   │   └── ...
│   │
│   ├── hooks/                  # Custom hooks
│   ├── types/                  # TypeScript interfaces
│   ├── constants/
│   ├── utils/
│   └── assets/
│
├── Implementation-plans/       # Implementation documentation
│   ├── REQUEST_MANAGEMENT_IMPLEMENTATION_PLAN.md
│   ├── inventory-management-implementation.md
│   ├── PUSH_NOTIFICATIONS_IMPLEMENTATION_PLAN.md
│   └── PUSH_NOTIFICATIONS_STEP_BY_STEP.md
│
├── android/                    # Native Android (Expo prebuild)
└── MANUAL_TEST_CASES.md        # Manual test scenarios
```

---

## 3. Tech Stack

### 3.1 Core Technologies

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React Native | 0.81.5 |
| Runtime | Expo SDK | 54 |
| Language | TypeScript | 5.9 |
| UI Styling | NativeWind (Tailwind for RN) | 4.2.1 |
| State Management | Redux Toolkit | 2.11 |
| Navigation | React Navigation | 7 |
| Backend | Firebase Web SDK | 12.9 |

### 3.2 Main Dependencies

| Purpose | Packages |
|---------|----------|
| **Expo** | expo, expo-dev-client, expo-splash-screen, expo-notifications, expo-image-picker, expo-print, expo-sharing, expo-file-system, expo-build-properties |
| **Navigation** | @react-navigation/native, @react-navigation/stack, @react-navigation/bottom-tabs |
| **State** | @reduxjs/toolkit, react-redux |
| **Firebase** | firebase (Web SDK) |
| **UI** | nativewind, tailwindcss, react-native-gesture-handler, react-native-reanimated, react-native-safe-area-context, react-native-screens |
| **Storage** | @react-native-async-storage/async-storage |
| **Other** | @react-native-community/datetimepicker |

### 3.3 Dev Dependencies

- **Testing:** Jest 29, @testing-library/react-native, @testing-library/jest-native, jest-expo
- **Build:** babel-preset-expo, patch-package
- **Types:** @types/jest, @types/react, typescript

---

## 4. Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Native App                          │
├─────────────────────────────────────────────────────────────────┤
│  Screens (UI)  ←→  Redux Store  ←→  Firebase Services            │
│       ↑                  ↑                    ↑                  │
│       │                  │                    │                  │
│  Navigation         Slices/Thunks         Firestore/Auth         │
│  Components         Selectors             Storage/Functions      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase Backend                              │
│  Auth │ Firestore │ Storage │ Cloud Functions                    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Key Patterns

- **Functional components** with hooks throughout
- **Feature-based** folder structure (components/screens grouped by feature)
- **Firestore subscriptions** for real-time data (no polling)
- **Async thunks** for mutations; subscriptions keep Redux in sync
- **TypeScript** for types and interfaces
- **NativeWind** for styling via `className`

---

## 5. Configuration

### 5.1 Expo (app.json)

| Property | Value |
|----------|-------|
| Name | asset-manager |
| Version | 4.0.0 |
| Orientation | portrait |
| New Architecture | Enabled |
| iOS Bundle ID | com.ibf.assetmanager |
| Android Package | com.ibf.assetmanager |
| EAS Project ID | 1b6e5a32-1289-48e1-a3a8-bab8fff5d5fd |
| Plugins | expo-notifications |

### 5.2 Build Tools

- **Babel:** `babel-preset-expo`, `nativewind/babel`
- **Metro:** Expo default + NativeWind via `withNativeWind(config, { input: './global.css' })`
- **Tailwind:** `nativewind/preset`, content includes `./src/**/*.{js,jsx,ts,tsx}`

### 5.3 Scripts

| Script | Command |
|--------|---------|
| start | expo start |
| android | expo run:android |
| ios | expo run:ios |
| web | expo start --web |
| test | jest --watchman=false |
| postinstall | patch-package && node scripts/patch-expo-dev-menu.js |

---

## 6. App Boot Flow

```
1. index.ts
   └─ registerRootComponent(App)

2. App.tsx
   ├─ Import global.css, config/firebase
   ├─ Wrap in: Provider (Redux), SafeAreaProvider, WeightViewPreferenceProvider
   └─ AppContent
      ├─ useAuthStateSync()        → Firebase auth → setUser
      ├─ useUserRoleSync(userId)   → Firestore role → setUserRole
      ├─ useManagerValidationSync() → Admin only, site manager validation
      ├─ usePushTokenRegistration(userId)
      ├─ Hold splash until authInitialized
      └─ RootNavigator

3. RootNavigator
   ├─ !isAuthenticated     → AuthFlowScreen (Login/Signup)
   ├─ isRoleLoading        → LoadingScreen
   └─ isAuthenticated      → MainStackNavigator (Tabs + UpdatePassword, NotificationCenter)
```

---

## 7. Navigation & Screens

### 7.1 Root Navigator States

| Route | Component | Condition |
|-------|-----------|-----------|
| Auth | AuthFlowScreen | Not authenticated |
| Loading | LoadingScreen | Authenticated, role loading |
| Main | MainStackNavigator | Authenticated, role loaded |

### 7.2 Bottom Tab Navigator (Role-Based)

| Tab | Visible To | Initial Screen |
|-----|------------|----------------|
| Dashboard | All | DashboardHome |
| Inventory | Admin, StoreIncharge, SiteManager | CentralStoreInventory or MySiteInventory |
| Requests | Admin, StoreIncharge, SiteManager | RequestQueue or MyRequests |
| Purchase Orders | Admin, StoreIncharge | PurchaseOrderList |
| Sites | Admin only | SiteManagement |

**Tab Bar:** Primary `#1E40AF`, inactive `#64748B`, badges for high-priority requests and pending PO approvals.

### 7.3 Stack Navigators & Screens

#### Dashboard Stack
- DashboardHome, ActivityLog (Admin), MyActivity, Profile, Users (Admin)

#### Inventory Stack
- CentralStoreInventory, MySiteInventory, OtherSiteInventory, AddEditItem, ItemDetail, SteelMaster, Maintenance (nested), CategoryManagement

#### Request Stack
- RequestQueue, MyRequests, CreateRequest, ProcessRequest, EditRequest, RejectRequest, ConfirmTransfer, ReturnItems

#### Purchase Order Stack
- PurchaseOrderList, CreatePO, VendorManagement, AddVendor, ApprovePO, ReceivePO

#### Maintenance Stack
- MaintenanceDashboard, AddToMaintenance, MaintenanceDetail, ReturnFromMaintenance, WriteOff

#### Site Stack
- SiteManagement, AddSite, EditSite

### 7.4 Deep Linking (Push Notifications)

Notification payloads map to screens:

| Payload Screen | Target | Params |
|----------------|--------|--------|
| ProcessRequest | ProcessRequest | requestId |
| RequestQueue | RequestQueue | — |
| ApprovePO, ReceivePO | ApprovePO/ReceivePO | poId |
| PurchaseOrderList | PurchaseOrderList | — |
| MaintenanceDetail, Maintenance | MaintenanceDetail | maintenanceId |
| ItemDetail | ItemDetail | itemId |
| Users | Users (via Dashboard) | — |

---

## 8. State Management

### 8.1 Redux Store Slices

| Slice | Purpose |
|-------|---------|
| auth | User, role, isAuthenticated, isLoading, isRoleLoading, authInitialized, error |
| sites | Sites, manager assignments, validation state |
| inventory | Items, categories, inventoryByLocation, lowStockItemIds, filters |
| requests | Requests, myRequests, selectedRequest, filters |
| steelMaster | Steel master records |
| maintenance | Maintenance records, filters |
| activityLog | Logs, myRecentActivity, hasMore, filters |
| purchaseOrders | Purchase orders, vendors, filters |

### 8.2 Data Fetching

- **No RTK Query** — Uses `createAsyncThunk` + Firebase services
- **Real-time subscriptions** via Firestore listeners
- **useDashboardSubscriptions** — Role-based subscriptions for dashboard data
- **Thunks** — Auth, inventory, sites, requests, POs, maintenance, activity log, steel master, manager validation

### 8.3 Custom Hooks

| Hook | Purpose |
|------|---------|
| useAuthStateSync | Sync Firebase auth to Redux |
| useUserRoleSync | Sync user role from Firestore to Redux |
| useDashboardSubscriptions | Role-based Firestore subscriptions |
| useManagerValidationSync | Admin: validate site manager assignments |
| usePushTokenRegistration | Register push token on foreground |
| useWeightViewPreference | Pcs vs Kg preference (AsyncStorage) |
| useInventoryError | Auto-clear inventory error after 5s |

### 8.4 Persistence

- **Redux:** No redux-persist
- **AsyncStorage:** Weight view preference (`@ciams_weight_view_preference`)
- **Firebase Auth:** Persists auth state internally

---

## 9. Firebase & Backend

### 9.1 Firebase Configuration

**File:** `config/firebase.ts`

- **Project:** asset-management-system-622c2
- **Region:** Firestore in eur3
- **SDK:** Firebase Web SDK (not React Native Firebase)

**Services:** Auth, Firestore, Storage, Functions

### 9.2 Firestore Collections

| Collection | Purpose |
|------------|---------|
| users | User profile, role, expoPushTokens, notificationPrefs |
| sites | Site master data |
| items | Item master (SKU, category, etc.) |
| inventory | Stock by location |
| categories | Item categories |
| steelMaster | Steel specifications |
| requests | Site Manager requests |
| requestCounters | Request number sequence (REQ-YYYY-NNNN) |
| maintenance | Maintenance records |
| purchaseOrders | Purchase orders |
| poCounters | PO number sequence |
| vendors | Vendors |
| activityLogs | Audit trail |
| inventoryAdjustments | Quantity adjustment audit |
| notifications/{userId}/items | In-app notifications |

### 9.3 Storage Paths

| Path | Purpose |
|------|---------|
| itemImages/{itemId}/{fileName} | Item images |
| maintenancePhotos/{maintenanceId}/{fileName} | Maintenance photos |
| poInvoices/{poId}/{fileName} | PO invoices |

**Limits:** 5MB per file; images: jpeg, png, webp, gif; PO invoices: PDF + images.

### 9.4 Cloud Functions

**Runtime:** Node.js 24

#### Callable Functions
- `logAuthEvent` — Log login/logout/login_failed
- `logPasswordChanged` — Log password change
- `logQuantityAdjusted` — Log manual inventory adjustment

#### Firestore Triggers (Activity Logging + Notifications)

| Collection | Events | Actions |
|------------|--------|---------|
| items | onCreate, onUpdate | Log, low-stock alerts |
| requests | onCreate, onUpdate | Log, notify Admin/StoreIncharge or requestor |
| maintenance | onCreate, onUpdate | Log, notify |
| users | onCreate, onUpdate | Log, notify |
| sites | onCreate, onUpdate | Log |
| steelMaster | onCreate, onUpdate | Log |
| purchaseOrders | onCreate, onUpdate | Log, notify |
| vendors | onCreate, onUpdate | Log |

### 9.5 Notification Service

- **Client:** expo-notifications, Expo push tokens stored in `users/{userId}/expoPushTokens`
- **Server:** expo-server-sdk in Cloud Functions
- **In-app:** `notifications/{userId}/items` subcollection
- **Preferences:** requestUpdates, stockAlerts, maintenanceAlerts, purchaseOrderUpdates, userUpdates

---

## 10. Core Features

### 10.1 Asset & Inventory Management

- **Two-tier:** Central Store (Admin/Store Incharge) + Site Inventories (Site Manager)
- **Item types:** Consumable (single-use), Non-consumable (returnable)
- **CRUD:** Name, SKU, category, type, unit, minStockLevel, image
- **Adjustments:** Mandatory reason and notes
- **Low-stock alerts:** When quantity ≤ minStockLevel
- **Categories & Steel Master** management

### 10.2 Request Management

**Lifecycle:** DRAFT → PENDING → APPROVED → TRANSFERRED → RETURNED  
**Alternate:** REJECTED, CANCELLED

- **Flow:** Site Manager creates → Store Incharge/Admin processes
- **No partial fulfillment**
- **Priorities:** High, Medium, Low
- **Returns:** Non-consumable only
- **Request number:** REQ-YYYY-NNNN

### 10.3 Purchase Orders

**Flow:** Create → Approve/Reject (Admin) → Mark Ordered → Receive

- Create PO with line items
- Admin approval/rejection
- Receive with quantity confirmation
- Invoice upload
- Vendor management

### 10.4 Maintenance

- Add to Maintenance (from inventory)
- Return from Maintenance (to inventory)
- Write Off (remove from maintenance)
- Photos and notes on records

### 10.5 Sites Management (Admin)

- Create, edit, delete sites
- Assign Site Manager to site
- Manager validation and cleanup

### 10.6 User Management (Admin)

- List users, assign roles, edit permissions
- Update password
- Active/inactive status

### 10.7 Activity Log & Notifications

- **Activity log:** Server-side audit trail (Cloud Functions)
- **Notifications:** Expo Push + in-app with deep links
- **Notification center:** Per-user list with read/unread

---

## 11. User Roles & Permissions

### 11.1 Roles

| Role | Description |
|------|-------------|
| Admin | Full access |
| StoreIncharge | Central store, inventory, requests, POs, maintenance |
| SiteManager | Own site inventory, create requests, return items |
| Unassigned | Limited until role assigned |

### 11.2 Permissions

| Permission | Purpose |
|------------|---------|
| canCreateUser | Create new users |
| canDeleteUser | Delete users |
| canEditUser | Edit user details |
| canManageInventory | Manage central store inventory |
| canApproveOrders | Approve purchase orders |
| canGenerateReports | Generate reports |
| canManageAssets | Manage assets |

### 11.3 Tab Visibility

| Tab | Admin | StoreIncharge | SiteManager |
|-----|:-----:|:-------------:|:-----------:|
| Dashboard | ✓ | ✓ | ✓ |
| Inventory | ✓ | ✓ | ✓ |
| Requests | ✓ | ✓ | ✓ |
| Purchase Orders | ✓ | ✓ | ✗ |
| Sites | ✓ | ✗ | ✗ |

---

## 12. Business Logic Flows

### 12.1 Request Flow

1. **Site Manager** creates request (draft or submit) → `pending`
2. **Store Incharge** processes → Approve (if stock) or Reject
3. **Transfer** → Store Incharge confirms with "Received By"
4. **Return** (non-consumable) → Site Manager returns with condition

### 12.2 Inventory Flow

- **Admin/Store Incharge:** Central Store → Add/Edit/Adjust → Maintenance
- **Site Manager:** My Site Inventory → Other Site (read-only) → Request items

### 12.3 Purchase Order Flow

1. Create PO (Store Incharge)
2. Admin approves or rejects
3. Mark as ordered
4. Receive with quantities and invoice

### 12.4 Authentication Flow

1. Auth state listener → Firebase Auth
2. `user` set → `userRole` loaded from Firestore `users/{userId}`
3. LoadingScreen → MainStackNavigator when role loaded

---

## 13. UI Components & Design System

### 13.1 CIAMS Design System

- **Industrial clarity:** High contrast, 48px touch targets, readable in bright light
- **Color palette:** Primary `#1E40AF`, success `#16A34A`, warning `#D97706`, danger `#DC2626`, neutral `#64748B`, background `#F8FAFC`
- **Typography:** Display (32px), screen title (22px), section (17px), card (15px), body (15px), caption (13px), badge (12px)
- **Spacing:** 4px base; screen padding `px-4`, card padding `p-4`

### 13.2 Component Categories

| Category | Examples |
|----------|----------|
| Layout | ScreenLayout, ScreenHeader |
| Forms | FormField, ItemForm, VendorForm, SiteForm, SteelMasterForm |
| Selectors | CategorySelector, UnitSelector, SteelMasterSelector, VendorSelector, SiteManagerSelector, PrioritySelector |
| Cards | ItemCard, POCard, RequestCard, MaintenanceCard, SiteCard, VendorCard |
| Badges | POStatusBadge, RequestStatusBadge, StockStatusBadge, MaintenanceStatusBadge |
| Modals | StockEntryModal, CategoryEditModal, POItemSelectorModal, ItemSelectorModal |
| Dashboard | QuickStatsRow, PendingRequestsWidget, LowStockAlertWidget, DashboardGreeting |

### 13.3 Styling

- **Primary:** NativeWind (Tailwind) via `className`
- **Secondary:** StyleSheet for edge cases (e.g. ScrollView contentContainerStyle)
- **Common patterns:** Card `bg-white rounded-[10px] p-4 border border-[#E2E8F0]`, primary button `bg-[#1E40AF] rounded-[10px] h-[50px]`

---

## 14. Testing

### 14.1 Stack

- **Framework:** Jest + React Native Testing Library
- **Config:** jest-expo preset, jest.setup.js
- **Mocks:** AsyncStorage, @expo/vector-icons, Firebase services

### 14.2 Test Layout

```
src/
├── __tests__/integration/LoginToDashboard.test.tsx
├── screens/**/__tests__/*.test.tsx     (40+ screen tests)
├── components/**/__tests__/*.test.tsx (15+ component tests)
├── store/slices/__tests__/*.test.ts    (8 slice tests)
├── store/selectors/__tests__/*.test.ts (7 selector tests)
├── hooks/__tests__/*.test.tsx          (8 hook tests)
└── utils/__tests__/*.test.ts           (8 utility tests)
```

### 14.3 Coverage (Approximate)

| Metric | Coverage |
|--------|----------|
| Statements | ~49% |
| Branches | ~41% |
| Functions | ~52% |
| Lines | ~50% |

### 14.4 Manual Tests

`MANUAL_TEST_CASES.md` — 27 sections covering Auth, RBAC, Dashboard, Inventory, Requests, POs, Maintenance, Sites, Users, etc.

---

## 15. Build & Deployment

### 15.1 EAS Build (eas.json)

- **development:** developmentClient: true, distribution: internal
- **preview:** distribution: internal
- **production:** default config

### 15.2 Android

- Namespace: com.ibf.assetmanager
- Hermes enabled
- Debug keystore for signing

### 15.3 Firebase Emulators

Configured in firebase.json: auth, functions, firestore, storage, UI (commented out for production).

---

## 16. Key Files Reference

| Purpose | Path |
|---------|------|
| Entry point | index.ts |
| Root component | App.tsx |
| Root navigation | src/navigation/RootNavigator.tsx |
| Tab navigator | src/navigation/BottomTabNavigator.tsx |
| Redux store | src/store/index.ts |
| Auth slice | src/store/slices/authSlice.ts |
| Auth selectors | src/store/selectors/authSelectors.ts |
| Firebase config | config/firebase.ts |
| Cloud Functions | functions/src/index.ts |
| Notification helpers | functions/src/notifications.ts |
| Firestore rules | firestore.rules |
| Storage rules | storage.rules |
| Implementation plans | Implementation-plans/ |
| Manual tests | MANUAL_TEST_CASES.md |

---

## Appendix: TypeScript Types

| Type File | Main Entities |
|-----------|---------------|
| auth.ts | AuthState, SignUpCredentials, SignInCredentials |
| roles.ts | UserRole, UserRoleData, Permission, UserListItem |
| inventory.ts | FirestoreItem, Item, InventoryEntry, Category, CreateItemData |
| request.ts | Request, RequestItem, RequestStatus, CreateRequestData |
| maintenance.ts | Maintenance, AddToMaintenanceData, IssueType, WriteOffReason |
| purchaseOrder.ts | PurchaseOrder, PurchaseOrderItem, CreatePurchaseOrderData |
| vendor.ts | Vendor, CreateVendorData |
| sites.ts | Site, CreateSiteData |
| steelMaster.ts | SteelMaster |
| activityLog.ts | ActivityLog, ActionType, ActionCategory |

---

*This document was generated from comprehensive exploration of the CIAMS Asset Manager codebase.*
