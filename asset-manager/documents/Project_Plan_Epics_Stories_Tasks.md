# CIAMS Project Plan: Epics, Stories, and Tasks

**Technology Stack:** React Native (Expo), Firebase Web SDK (Firestore, Cloud Functions, Auth, Storage, Messaging)
**Version:** 2.0
**Last Updated:** 2026-02-03

---

## 📅 Phase 1: Foundation (Weeks 1-2)

### 🚀 Epic 1: Project Infrastructure & Setup
**Goal:** Initialize the project environment and CI/CD pipeline.

*   **Story 1.1: Project Initialization**
    *   **Task:** Initialize React Native Expo project with TypeScript. ✅ 
    *   **Task:** Set up folder structure (components, screens, services, hooks, types). ✅ 
    *   **Task:** Set up React Navigation (Stack and Tab navigators). 

*   **Story 1.2: Firebase & Backend Setup**
    *   **Task:** Create Firebase Project (CIAMS).
    *   **Task:** Initialize Cloud Functions environment (TypeScript).
    *   **Task:** Set up Cloud Firestore (databases).
    *   **Task:** Set up Cloud Storage (buckets).
    *   **Task:** Integrate Firebase Web SDK into the app.

---

### 🔐 Epic 2: Authentication & Role-Based Access
**Goal:** Secure system access where only Admin creates users.

*   **Story 2.1: Authentication Logic (Cloud Functions)**
    *   **Task:** Implement `createUser` Cloud Function (Admin only).
        *   *Check:* Must accept email, temp password, role, and optional site ID.
    *   **Task:** Implement `changePassword` Cloud Function.
    *   **Task:** Create Firestore Trigger: On user creation, create a document in `users` collection.
    *   **Task:** Implement logic to lock account after 5 failed attempts.

*   **Story 2.2: Login Screen & Flow**
    *   **Task:** Build Login UI (Email, Password, Visibility Toggle).
    *   **Task:** Integrate Firebase Auth `signInWithEmailAndPassword`.
    *   **Task:** Handle "Change Password Required" flag (force navigation to Change Password screen).
    *   **Task:** Implement Session Persistence (up to 30 days).

*   **Story 2.3: Security Rules (Foundation)**
    *   **Task:** Write basic Firestore Security Rules (User can read own profile; Admin can read all).
    *   **Task:** Protect `users` collection from client-side writes.

---

### 👥 Epic 3: User Management (Admin Only)
**Goal:** Admin manages system users.

*   **Story 3.1: User Management Dashboard**
    *   **Task:** Build accessible List View of all users.
    *   **Task:** Implement filtering (by Role, Status).
    *   **Task:** Implement search functionality.

*   **Story 3.2: Create & Edit Users**
    *   **Task:** Build "Add User" form (Name, Email, Role, Site Assignment for Site Managers).
    *   **Task:** Build "Edit User" functionality (Disable/Enable account).
    *   **Task:** *Validation:* Ensure Site Manager cannot be created without a Site assignment.

---

### 🏗️ Epic 4: Site Management
**Goal:** Manage construction sites to track inventory locations.

*   **Story 4.1: Site Management (CRUD)**
    *   **Task:** Build Site List Screen (Active vs Inactive).
    *   **Task:** Build "Add Site" form (Name, Location, Manager assignment).
    *   **Task:** Implement Cloud Function `createSite` and `updateSite` to ensure data consistency.
    *   **Task:** *Constraint:* Validate Site Name uniqueness.

---

## 📦 Phase 2: Inventory Management (Weeks 2-3)

### 🏭 Epic 5: Central Store Inventory
**Goal:** Store Incharge manages the master inventory.

*   **Story 5.1: Item Master Data**
    *   **Task:** Define `items` schema in Firestore.
    *   **Task:** Build "Add Item" Screen (Name, SKU, Type: Consumable/Non-consumable, Min Stock, Image Upload).
    *   **Task:** Implement Image Upload to Firebase Storage.
    *   **Task:** *Constraint:* "Item Type" cannot be changed after creation.

*   **Story 5.2: Central Inventory View**
    *   **Task:** Build Inventory List Screen with filters (Category, Low Stock).
    *   **Task:** Display "Distribution" view (Central vs Sites).
    *   **Task:** Implement specific Firestore Rules: **Site Managers CANNOT see central inventory.**

*   **Story 5.3: Quantity Adjustments**
    *   **Task:** Build "Adjust Quantity" Modal.
    *   **Task:** Implement `adjustQuantity` Cloud Function (Transactional).
    *   **Task:** Require "Reason" and "Notes" for every adjustment.

---

### 🗺️ Epic 6: Site Inventory & Visibility
**Goal:** Site Managers manage their own stock and view others.

*   **Story 6.1: My Site Inventory**
    *   **Task:** Build "My Inventory" screen for Site Managers.
    *   **Task:** Filter inventory by logged-in user's assigned `siteId`.

*   **Story 6.2: Universal Site Visibility**
    *   **Task:** Build "Other Sites" list view.
    *   **Task:** Create "Read-Only" inventory view for non-assigned sites.
    *   **Task:** Display Contact Info for Site Manager of that site to facilitate offline communication.

---

## 🚚 Phase 3: Request Management (Weeks 3-4)

### 📋 Epic 7: Request Workflow
**Goal:** Handle the flow of items from Store to Sites.

*   **Story 7.1: Create Request (Site Manager)**
    *   **Task:** Build Request Creation Form.
    *   **Task:** Implement Item Selection (Multiple items).
    *   **Task:** Select Priority (High/Medium/Low).
    *   **Task:** *Constraint:* Site Manager does NOT see available quantities in Store.

*   **Story 7.2: Request Queue (Store Incharge)**
    *   **Task:** Build Request List sorted by Priority (High -> Low).
    *   **Task:** Implement "Insufficient Stock" visual indicators.
    *   **Task:** *Logic:* **Disable "Approve" button if ANY item in request has insufficient stock (No partial fulfillment).**

*   **Story 7.3: Request Editing (Store Incharge)**
    *   **Task:** Enable "Edit Request" mode for Store Incharge.
    *   **Task:** Allow modifying quantities or removing items.
    *   **Task:** Log invalid/removed items in request history.

*   **Story 7.4: Approval & Transfer (Atomic)**
    *   **Task:** Create `approveRequest` Cloud Function (reserves stock).
    *   **Task:** Create `transferRequest` Cloud Function.
    *   **Task:** *Transaction:* Atomically decrement Central Store, increment Site Inventory, update Request Status.

*   **Story 7.5: Returns (Non-Consumables)**
    *   **Task:** Build "Return Items" screen.
    *   **Task:** Allow selecting Condition (Good/Damaged).
    *   **Task:** *Logic:* If "Damaged", auto-route to **Maintenance Module**.

---

## 💰 Phase 4: Purchase Order Management (Weeks 4-5)

### 🧾 Epic 8: Purchase Orders (PO)
**Goal:** Restock central inventory.

*   **Story 8.1: Vendor Management**
    *   **Task:** Create `vendors` collection.
    *   **Task:** Build Add/Edit/List Vendor screens.
    *   **Task:** Implement "Save Vendor" checkbox during PO creation.

*   **Story 8.2: Create PO**
    *   **Task:** Build PO Creation Screen (Admin & Store Incharge).
    *   **Task:** **Manual Price Entry:** Allow user to input price PER ITEM (prices not stored in Item master).
    *   **Task:** Auto-calculate GST and Totals.

*   **Story 8.3: PO Approval (Admin Only)**
    *   **Task:** Build PO Review Screen.
    *   **Task:** Implement Access Control: Only Admin can set status to `APPROVED`.
    *   **Task:** Add optional Admin Comments.

*   **Story 8.4: PO Receipt & Inventory Update**
    *   **Task:** Build "Receive PO" Screen.
    *   **Task:** Allow partial quantity inputs (what actually arrived).
    *   **Task:** Require Invoice Upload (PDF/Image).
    *   **Task:** Create `receivePO` Cloud Function: Update `purchaseOrders` status AND increment `inventory` in one transaction.

---

## 🔧 Phase 5: Maintenance & Auditing (Weeks 5-6)

### 🛠️ Epic 9: Maintenance Module
**Goal:** Track damaged assets.

*   **Story 9.1: Activity & tracking**
    *   **Task:** Build Maintenance Dashboard (Under Repair, Written Off, Ready).
    *   **Task:** Implement `addToMaintenance` Cloud Function (Removes from Available Stock).

*   **Story 9.2: Resolution**
    *   **Task:** Implement "Return to Inventory" flow (Item fixed, add back to stock).
    *   **Task:** Implement "Write Off" flow (Item scrapped, permanently removed count).

### 📜 Epic 10: Activity Logging (Immutable)
**Goal:** Security and Accountability.

*   **Story 10.1: Universal Logger**
    *   **Task:** Create specific utility function in Cloud Functions to log ALL actions to `activityLogs`.
    *   **Task:** Ensure Server Timestamp is used.

*   **Story 10.2: Admin Log Viewer**
    *   **Task:** Build Log Viewer Screen (Admin Only).
    *   **Task:** Implement Filters (User, Action Type, Date Range).
    *   **Task:** Implement "Export to CSV" feature.

---

## 📊 Phase 6: Polish & Dashboard (Weeks 6-7)

### 📈 Epic 11: Dashboards
**Goal:** Role-specific home screens.

*   **Story 11.1: Admin Dashboard**
    *   **Task:** Display System-wide stats (Total Value, Total Sites, Pending POs).
    *   **Task:** "Needs Attention" widget.

*   **Story 11.2: Store Incharge Dashboard**
    *   **Task:** Display Pending Requests (High Priority), Low Stock Alerts.

*   **Story 11.3: Site Manager Dashboard**
    *   **Task:** Display My Inventory Summary, My Pending Requests.

### 🔔 Epic 12: Notifications
**Goal:** Real-time updates.

*   **Story 12.1: Cloud Messaging**
    *   **Task:** set up FCM Trigger for:
        *   New Request -> Store Incharge.
        *   Request Approved -> Site Manager.
        *   Low Stock -> Store Incharge.
        *   PO Pending -> Admin.

---

## ✅ Development Checklist for Rules Compliance
*   [ ] **Rule 1:** Verified Site Manager has rules protecting `inventory` (central) read access.
*   [ ] **Rule 2:** Only Admin role has `approvePO` permission in Cloud Function.
*   [ ] **Rule 3:** User creation flow does not email password; UI prompts for manual sharing.
*   [ ] **Rule 4:** `items` collection has NO price field; `purchaseOrders` items have price field.
*   [ ] **Rule 5:** Return flow DOES NOT check for due dates.
*   [ ] **Rule 6:** `approveRequest` UI disabled if `available < requested` for ANY item.
*   [ ] **Rule 8:** Store Incharge dashboard has "Edit" button for Requests.
*   [ ] **Rule 14:** `receivePO` function includes `inventory.increment()`.
