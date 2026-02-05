# CIAMS - Comprehensive Project Plan (Jira Backlog)

**Project:** Construction Inventory & Asset Management System (CIAMS)
**Version:** 2.0
**Tech Stack:**
- **Frontend:** React Native (Expo), TypeScript, NativeWind, Redux Toolkit (RTK) + RTK Query
- **Backend:** Firebase (Firestore, Cloud Functions, Auth, Storage, Messaging)
- **Testing:** Jest, React Native Testing Library (RNTL)

---

## 🚀 Epic 1: Project Infrastructure & Foundation
**Goal:** Initialize the project environment, set up the development workflow, and foundation for the app.

### Story 1.1: Project Initialization & Configuration
**Description:** Initialize the Expo project with TypeScript and set up the directory structure and code quality tools.
**Acceptance Criteria:**
- App runs on iOS and Android simulators.
- Folder structure follows best practices (features/components/hooks).
- ESLint and Prettier are enforcing code style.
- NativeWind is configured and working.

**Tasks:**
- [ ] **Frontend:** Initialize Expo app: `npx create-expo-app -t expo-template-blank-typescript`
- [ ] **Frontend:** Install and configure NativeWind (Tailwind CSS for RN) and update `babel.config.js`.
- [ ] **Frontend:** Set up absolute imports in `tsconfig.json` (e.g., `@/components`, `@/features`).
- [ ] **Frontend:** Configure ESLint, Prettier, and Husky for pre-commit linting.
- [ ] **Frontend:** Set up Redux Toolkit & RTK Query `store.ts` and `Provider`.
- [ ] **Frontend:** Set up React Navigation (Stack + Tab) container and types.

### Story 1.2: Firebase Project Integration
**Description:** Create the Firebase project and integrate it with the React Native app and detailed backend setup.
**Acceptance Criteria:**
- Firebase project created with Blaz plan (for Functions).
- App connects to Firebase.
- Cloud Functions environment initialized.

**Tasks:**
- [ ] **Backend:** Create Firebase Project "CIAMS" in Firebase Console.
- [ ] **Backend:** Initialize Cloud Functions with TypeScript: `firebase init functions`.
- [ ] **Backend:** specific generic `firebase-admin` setup in functions `index.ts`.
- [ ] **Frontend:** Install `react-native-firebase` (or Firebase JS SDK if Expo Go preferred initially, but RNFirebase recommended for native builds). *Decision: Use Expo compatible SDK if using Expo Go, or Prebuild for RNFirebase.* (Assuming Expo Go friendly initially: `firebase` JS SDK).
- [ ] **Frontend:** Create `src/config/firebase.ts` and export initialized app/auth/db/storage instances.

---

## 🔐 Epic 2: Authentication & User Management (Module 1)
**Goal:** Implement secure role-based access control where Admin manages all user access.

### Story 2.1: Authentication Backend (Cloud Functions)
**Description:** Implement backend logic for user creation and role management. Direct signup is disabled.
**Acceptance Criteria:**
- `createUser` function creates Auth user AND Firestore document.
- `createUser` restricts access to Admins only.
- Custom claims or Firestore roles used for permission checking.

**Tasks:**
- [ ] **Backend:** Create `createUser` Cloud Function (accepts email, temp password, role, siteId).
- [ ] **Backend:** Implement validation: Check if requestor is Admin.
- [ ] **Backend:** Implement validation: Ensure Site Manager requests have `siteId`.
- [ ] **Backend:** Implement `onUserCreate` Firestore trigger (if not handling everything in the HTTP function) to create the user document in `users` collection.
- [ ] **Backend:** Implement `changePassword` Cloud Function.
- [ ] **Backend:** Test functions using Firebase Emulators.

### Story 2.2: Login UI & Integration
**Description:** Build the Login screen with email/password authentication.
**Acceptance Criteria:**
- User can log in with email/temp password.
- Toggle visibility for password.
- Error handling for invalid credentials.
- Persist session.

**Tasks:**
- [ ] **Frontend:** Create `LoginScreen` layout using NativeWind.
- [ ] **Frontend:** specific `useAuth` hook integrating with Redux `authSlice`.
- [ ] **Frontend:** Call `signInWithEmailAndPassword`.
- [ ] **Frontend:** Handle "Force Change Password" flow if flag is set.
- [ ] **Test:** Write unit test for `LoginScreen` interactions.

### Story 2.3: User Management (Admin UI)
**Description:** Admin needs to view, create, and manage users.
**Acceptance Criteria:**
- Admin can list all users.
- Admin can filter by Role and Status.
- Admin can create a new user (which calls the Cloud Function).
- Admin can disable users.

**Tasks:**
- [ ] **Frontend:** Create `UserListScreen` with `FlatList`.
- [ ] **Frontend:** Create `UserFilter` component (BottomSheet or Modal).
- [ ] **Frontend:** Create `AddUserScreen` form with validation (Formik/React Hook Form + Zod).
- [ ] **Frontend:** Implement RTK Query generic `usersApi` (`listUsers`, `createUser` mutation).
- [ ] **Backend:** Implement `listUsers` and `updateUser` Cloud Functions or strictly controlled Firestore reads.

---

## 🏗️ Epic 3: Site Management (Module 2)
**Goal:** Manage construction sites to track inventory locations.

### Story 3.1: Site Backend & Data Model
**Description:** specific `sites` and constraints.
**Acceptance Criteria:**
- Firestore `sites` collection created.
- `createSite` function ensures unique names.

**Tasks:**
- [ ] **Backend:** Define `sites` schema (name, location, managerId [denormalized name]).
- [ ] **Backend:** Implement `createSite` Cloud Function.
- [ ] **Backend:** Implement `updateSite` Cloud Function.

### Story 3.2: Site Management UI
**Description:** UI for Admin to manage sites.
**Acceptance Criteria:**
- List active vs inactive sites.
- Add/Edit Site details.

**Tasks:**
- [ ] **Frontend:** Create `SiteListScreen`.
- [ ] **Frontend:** Create `AddSiteScreen`.
- [ ] **Frontend:** Integrate `sitesApi` in RTK Query.
- [ ] **Frontend:** *UI Detail:* Show "Assigned Manager" with a link/badge.

---

## 🏭 Epic 4: Inventory Management (Module 3)
**Goal:** Two-tier inventory system (Central Store + Sites) with consumable/non-consumable tracking.

### Story 4.1: Item Master Management (Store Incharge)
**Description:** Manage the catalog of items in the Central Store.
**Acceptance Criteria:**
- Create Item with image, SKU, category.
- **Rule:** No Price field.
- **Rule:** Type (Consumable/Non) is immutable after creation.

**Tasks:**
- [ ] **Backend:** Define `items` schema.
- [ ] **Backend:** Implement `createItem` Cloud Function.
- [ ] **Frontend:** Create `InventoryListScreen` for Central Store (Search, Filter by Category).
- [ ] **Frontend:** Create `AddItemScreen` with Image Picker (Expo Image Picker).
- [ ] **Frontend:** Implement Image Upload logic (`useImageUpload` hook -> Firebase Storage).

### Story 4.2: Inventory Visibility Rules
**Description:** Enforce strict visibility: Store sees all, Site Manager sees own + others (read-only), but NOT Central.
**Acceptance Criteria:**
- Site Manager query for "Central Store" returns permission denied or empty.
- Site Manager can see "My Site Inventory".

**Tasks:**
- [ ] **Backend:** Write Firestore Security Rules for `inventory` and `items` collections.
    - `match /inventory/{id} { allow read: if isStoreIncharge() || (isSiteManager() && resource.data.locationType == 'site'); }`
- [ ] **Frontend:** Implement `MyInventoryScreen` filtering by `user.siteId`.
- [ ] **Frontend:** Implement `OtherSitesInventoryScreen` (Read-only list).

### Story 4.3: Stock Adjustments & Low Stock
**Description:** Adjust stock levels with mandatory reasons and track low stock.
**Acceptance Criteria:**
- Adjustment requires Reason + Note.
- Low stock visual indicator (Yellow/Red) when `qty <= minStock`.

**Tasks:**
- [ ] **Backend:** Implement `adjustQuantity` Cloud Function (Transaction: Update Inventory + Log Activity).
- [ ] **Frontend:** Create `AdjustQuantityModal` component.
- [ ] **Frontend:** *UI Detail:* Add "Low Stock" badge/filter in Inventory List.

---

## 🚚 Epic 5: Request Management (Module 4)
**Goal:** Workflow for moving items from Store to Sites.

### Story 5.1: Create Request (Site Manager)
**Description:** Site Managers request items for their site.
**Acceptance Criteria:**
- Select items (multi-select).
- Set Priority (High/Med/Low).
- **Rule:** User cannot see available store functionality.

**Tasks:**
- [ ] **Frontend:** Create `CreateRequestScreen`.
- [ ] **Frontend:** *Component:* Item Selector (Search specific items).
- [ ] **Frontend:** Request Cart state management (Redux local state).
- [ ] **Backend:** Implement `createRequest` Cloud Function.

### Story 5.2: Request Processing (Store Incharge)
**Description:** Store Incharge reviews, edits, and approves requests.
**Acceptance Criteria:**
- Queue sorted by Priority (High first).
- **Rule:** "Approve" disabled if insufficient stock.
- **Rule:** Store Incharge can Edit Quantity.

**Tasks:**
- [ ] **Frontend:** Create `RequestQueueScreen` (Tabs: Pending, Approved, etc.).
- [ ] **Frontend:** Create `RequestDetailScreen`.
- [ ] **Frontend:** Implement "Insufficient Stock" logic (Compare Requested vs Available from `items` query).
- [ ] **Backend:** Implement `editRequest` Cloud Function.
- [ ] **Backend:** Implement `approveRequest` Cloud Function (Status update only).

### Story 5.3: Transfer Execution (Atomic)
**Description:** Finalize the transfer of physical goods, updating inventory levels atomically.
**Acceptance Criteria:**
- Updates Central Store (Decrement).
- Updates Site Inventory (Increment).
- Updates Request Status -> Transferred.
- Atomic Transaction.

**Tasks:**
- [ ] **Backend:** Implement `transferRequest` Cloud Function using **Firestore Transaction**.
- [ ] **Backend:** *Logic:* Re-verify stock levels inside transaction before commit.

### Story 5.4: Returns (Non-Consumables)
**Description:** Return items from Site to Store (e.g., after use).
**Acceptance Criteria:**
- Only Non-Consumables.
- Selection of Condition (Good/Damaged).

**Tasks:**
- [ ] **Frontend:** Create `ReturnItemsScreen` (List My Non-Consumables).
- [ ] **Backend:** Implement `returnItems` Cloud Function.
- [ ] **Backend:** *Logic:* If "Damaged", auto-move to `maintenance` collection? (Or just flag for review).

---

## 💰 Epic 6: Purchase Orders (Module 5)
**Goal:** Restock Central Inventory from Vendors.

### Story 6.1: Vendor Management
**Description:** Manage vendor database for reuse.
**Acceptance Criteria:**
- Add/Edit Vendor.
- Save Vendor from PO screen.

**Tasks:**
- [ ] **Frontend:** Create `VendorListScreen`.
- [ ] **Backend:** CRUD endpoints for `vendors`.

### Story 6.2: Create Purchase Order
**Description:** Create a PO to buy items.
**Acceptance Criteria:**
- **Rule:** Manual Price Entry per item (Prices not in Item Master).
- Auto-calculate GST/Total.
- "Save Vendor" option.

**Tasks:**
- [ ] **Frontend:** Create `CreatePOScreen`.
- [ ] **Frontend:** PO Item Row Component (Qty * Price input).
- [ ] **Backend:** Implement `createPO` Cloud Function.

### Story 6.3: PO Approval (Admin Only) & Receipt
**Description:** Admin approves PO, Store Incharge receives it.
**Acceptance Criteria:**
- Only Admin can Approve.
- Receipt updates Inventory.

**Tasks:**
- [ ] **Backend:** Implement `approvePO` (Admin check).
- [ ] **Frontend:** Create `ReceivePOScreen` with Invoice Upload.
- [ ] **Backend:** Implement `receivePO` Cloud Function (**Transaction**: Update PO Status + Increment Inventory + Update Item Item Weighted Avg Price if needed/or just History).

---

## 🛠️ Epic 7: Maintenance & Logging (Modules 6 & 7)
**Goal:** Track damaged assets and maintain strict audit trails.

### Story 7.1: Maintenance Workflow
**Description:** Track items that are broken/under repair.
**Acceptance Criteria:**
- Items in maintenance are NOT available in inventory.
- Track Issue Type and Cost.

**Tasks:**
- [ ] **Frontend:** Create `MaintenanceDashboard`.
- [ ] **Backend:** `addToMaintenance` Function (Decrements Available, Creates Maint Record).
- [ ] **Backend:** `returnFromMaintenance` Function (Increments Available, Closes Maint Record).

### Story 7.2: Immutable Activity Logs
**Description:** Log every significant action for audit.
**Acceptance Criteria:**
- Logs cannot be deleted/edited.
- Only Admin views full logs.

**Tasks:**
- [ ] **Backend:** Create shared helper `logActivity(userId, action, details)` use in all Cloud Functions.
- [ ] **Backend:** Firestore Security Rule: `activityLogs` is `read: verifyAdmin`, `write: false`.
- [ ] **Frontend:** Create `ActivityLogScreen` with Filters (User, Date, Action).

---

## 📊 Epic 8: Dashboards & Polish (Phase 6)
**Goal:** User-specific dashboards and final polish.

### Story 8.1: Role-Based Dashboards
**Description:** First screen user sees after login.
**Acceptance Criteria:**
- Admin: Quick Stats, Attention needed.
- Store: Pending Requests, Low Stock.
- Site: My Inventory Summary.

**Tasks:**
- [ ] **Frontend:** Create `AdminDashboard` component.
- [ ] **Frontend:** Create `StoreDashboard` component.
- [ ] **Frontend:** Create `SiteDashboard` component.
- [ ] **Frontend:** Integrate Dashboard API (Aggregated stats or multi-query).

### Story 8.2: Testing & Optimization
**Description:** Ensure app is robust.
**Tasks:**
- [ ] **Test:** Write Integration tests for Request Flow using RNTL.
- [ ] **DevOps:** Setup CI pipeline (GitHub Actions) to run Tests and Lint.
- [ ] **Polish:** Implement Loading States (Skeletons) for all lists.
- [ ] **Polish:** Verify NativeWind Dark/Light mode support (if required).
