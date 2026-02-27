# Manual Test Cases — Asset Manager

> **Project:** Nexhala Asset Manager
> **Platform:** React Native (iOS & Android)
> **Prepared by:** QA Team
> **Roles covered:** Admin · StoreIncharge · SiteManager · Unassigned

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Authentication](#2-authentication)
3. [Role-Based Access Control](#3-role-based-access-control)
4. [Dashboard](#4-dashboard)
5. [Inventory — Central Store (Admin / StoreIncharge)](#5-inventory--central-store-admin--storeincharge)
6. [Inventory — Site View (SiteManager)](#6-inventory--site-view-sitemanager)
7. [Steel Master](#7-steel-master)
8. [Categories](#8-categories)
9. [Requests — Create & Manage (SiteManager)](#9-requests--create--manage-sitemanager)
10. [Requests — Process & Transfer (Admin / StoreIncharge)](#10-requests--process--transfer-admin--storeincharge)
11. [Return Items (SiteManager)](#11-return-items-sitemanager)
12. [Purchase Orders — Create & Edit](#12-purchase-orders--create--edit)
13. [Purchase Orders — Approve / Reject (Admin)](#13-purchase-orders--approve--reject-admin)
14. [Purchase Orders — Receive (Admin / StoreIncharge)](#14-purchase-orders--receive-admin--storeincharge)
15. [Vendor Management](#15-vendor-management)
16. [Maintenance — Add to Maintenance](#16-maintenance--add-to-maintenance)
17. [Maintenance — Return from Maintenance](#17-maintenance--return-from-maintenance)
18. [Maintenance — Write Off](#18-maintenance--write-off)
19. [Sites Management (Admin)](#19-sites-management-admin)
20. [User Management (Admin)](#20-user-management-admin)
21. [Profile & Password](#21-profile--password)
22. [Activity Log (Admin)](#22-activity-log-admin)
23. [My Activity (All Roles)](#23-my-activity-all-roles)
24. [Navigation & Tab Bar](#24-navigation--tab-bar)
25. [Real-Time Sync & Offline Behaviour](#25-real-time-sync--offline-behaviour)
26. [Cross-Feature Business Rules](#26-cross-feature-business-rules)
27. [Edge Cases & Negative Tests](#27-edge-cases--negative-tests)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `TC-XXX-NNN` | Test Case ID |
| **Pre:** | Preconditions |
| **Steps:** | Test steps |
| **Expected:** | Expected result |
| ✅ | Pass |
| ❌ | Fail |

---

## 1. Test Environment Setup

### TC-ENV-001 — Fresh install on iOS
**Pre:** App not previously installed.
**Steps:** Install via Expo Go / TestFlight → Launch app.
**Expected:** Splash screen shows → redirected to Login screen; no crash.

### TC-ENV-002 — Fresh install on Android
**Pre:** App not previously installed on Android device.
**Steps:** Install APK → Launch app.
**Expected:** Splash screen shows → redirected to Login screen; no crash.

### TC-ENV-003 — App resume from background
**Pre:** User is logged in.
**Steps:** Send app to background → wait 30 seconds → resume.
**Expected:** App resumes to same screen; session still valid; no re-login required.

### TC-ENV-004 — App killed and relaunched (session persistence)
**Pre:** User is logged in.
**Steps:** Force-close app → relaunch.
**Expected:** User is taken directly to Dashboard (session persisted), not to Login.

### TC-ENV-005 — App killed and relaunched (expired session)
**Pre:** User's Firebase token has expired (simulate by changing device clock).
**Steps:** Relaunch app.
**Expected:** User is redirected to Login screen.

---

## 2. Authentication

### TC-AUTH-001 — Successful login with valid credentials
**Pre:** Registered user account with assigned role exists.
**Steps:**
1. Open app → Login screen.
2. Enter valid email and password.
3. Tap **Login**.
**Expected:** Loading indicator shown → navigated to Dashboard; greeting shows user name and role.

### TC-AUTH-002 — Login with wrong password
**Pre:** Valid email exists in the system.
**Steps:**
1. Enter correct email + incorrect password.
2. Tap **Login**.
**Expected:** Error message shown (e.g., "Invalid email or password"); user stays on Login screen.

### TC-AUTH-003 — Login with non-existent email
**Pre:** None.
**Steps:**
1. Enter an email that is not registered.
2. Enter any password → Tap **Login**.
**Expected:** Error message: "Invalid email or password"; user stays on Login.

### TC-AUTH-004 — Login with empty email
**Pre:** None.
**Steps:**
1. Leave email blank; enter password → Tap **Login**.
**Expected:** Inline validation error: "Email is required" or similar; no API call made.

### TC-AUTH-005 — Login with empty password
**Pre:** None.
**Steps:**
1. Enter valid email; leave password blank → Tap **Login**.
**Expected:** Inline validation error: "Password is required"; no API call made.

### TC-AUTH-006 — Login with invalid email format
**Pre:** None.
**Steps:**
1. Enter "notanemail" as email; any password → Tap **Login**.
**Expected:** Inline validation error: "Invalid email format"; no API call made.

### TC-AUTH-007 — Login with short password (under minimum)
**Pre:** None.
**Steps:**
1. Enter valid email; enter "12345" (< 6 chars) as password → Tap **Login**.
**Expected:** Inline validation error: "Password must be at least 6 characters".

### TC-AUTH-008 — Successful signup
**Pre:** Email not already registered.
**Steps:**
1. Tap **Sign Up** on Login screen.
2. Enter full name, valid email, password (≥ 6 chars), matching confirm password.
3. Tap **Create Account**.
**Expected:** Account created → user logged in → role is "Unassigned" → Dashboard shows limited access message or Unassigned state.

### TC-AUTH-009 — Signup with already registered email
**Pre:** Email already exists in system.
**Steps:**
1. Go to Signup → enter duplicate email + valid password.
2. Tap **Create Account**.
**Expected:** Error message: "Email already in use" or similar.

### TC-AUTH-010 — Signup with mismatched passwords
**Pre:** None.
**Steps:**
1. Go to Signup → enter valid email, password "Password1", confirm password "Password2".
2. Tap **Create Account**.
**Expected:** Inline error: "Passwords do not match".

### TC-AUTH-011 — Signup with empty name
**Pre:** None.
**Steps:**
1. Leave name blank; fill other fields → Tap **Create Account**.
**Expected:** Inline error: "Name is required".

### TC-AUTH-012 — Signup with weak password
**Pre:** None.
**Steps:**
1. Enter name, email, password "123" → Tap **Create Account**.
**Expected:** Inline error: "Password must be at least 6 characters".

### TC-AUTH-013 — Logout
**Pre:** User is logged in.
**Steps:**
1. Navigate to Profile screen.
2. Tap **Logout**.
3. Confirm if prompted.
**Expected:** Navigated to Login screen; all Redux state cleared; session ended.

### TC-AUTH-014 — Failed login is activity-logged
**Pre:** Admin account exists.
**Steps:**
1. Enter correct email + wrong password → Tap **Login** (fail).
2. Log in as Admin.
3. Navigate to Activity Log → search for "login_failed".
**Expected:** A `login_failed` entry appears for the attempted email.

### TC-AUTH-015 — Successful login is activity-logged
**Pre:** Activity Log accessible as Admin.
**Steps:**
1. Log in as any user.
2. Log in as Admin → check Activity Log.
**Expected:** A `user_login` entry appears for the user who just logged in.

### TC-AUTH-016 — Login button shows loading state
**Pre:** Valid credentials ready.
**Steps:**
1. Tap **Login** with valid credentials.
**Expected:** Login button shows spinner/loading state while authenticating; button is disabled to prevent double-tap.

---

## 3. Role-Based Access Control

### TC-RBAC-001 — Admin sees all tabs
**Pre:** Logged in as Admin.
**Steps:** Observe bottom tab bar.
**Expected:** Tabs visible: Dashboard, Inventory, Requests, Purchase Orders, Sites.

### TC-RBAC-002 — StoreIncharge sees correct tabs
**Pre:** Logged in as StoreIncharge.
**Steps:** Observe bottom tab bar.
**Expected:** Tabs visible: Dashboard, Inventory, Requests, Purchase Orders. **No** Sites tab.

### TC-RBAC-003 — SiteManager sees correct tabs
**Pre:** Logged in as SiteManager (assigned to a site).
**Steps:** Observe bottom tab bar.
**Expected:** Tabs visible: Dashboard, Inventory, Requests. **No** Purchase Orders or Sites tabs.

### TC-RBAC-004 — Unassigned user sees no module tabs
**Pre:** Logged in as Unassigned user.
**Steps:** Observe bottom tab bar.
**Expected:** Only Dashboard tab visible (or limited state message); no Inventory/Requests/etc.

### TC-RBAC-005 — Admin can access User Management
**Pre:** Logged in as Admin.
**Steps:** Go to Dashboard → tap Users icon or navigate to Users screen.
**Expected:** User management screen loads with list of all users.

### TC-RBAC-006 — StoreIncharge cannot access User Management
**Pre:** Logged in as StoreIncharge.
**Steps:** Attempt to navigate to Users screen (if entry point visible).
**Expected:** Option is not visible or navigating shows "Unauthorized" / access denied.

### TC-RBAC-007 — SiteManager sees site inventory only
**Pre:** Logged in as SiteManager assigned to Site A.
**Steps:** Navigate to Inventory tab.
**Expected:** Shows **My Site Inventory** (Site A items only), not Central Store inventory.

### TC-RBAC-008 — SiteManager can view other sites (read-only)
**Pre:** Logged in as SiteManager.
**Steps:** Navigate to Inventory → find "Other Sites" option → tap.
**Expected:** Can browse other sites' inventory but no Add/Edit/Delete buttons visible.

### TC-RBAC-009 — StoreIncharge can access Central Store Inventory
**Pre:** Logged in as StoreIncharge.
**Steps:** Navigate to Inventory tab.
**Expected:** Central Store Inventory screen loads; Add Item button visible.

### TC-RBAC-010 — SiteManager cannot create Purchase Orders
**Pre:** Logged in as SiteManager.
**Steps:** Observe tab bar.
**Expected:** No Purchase Orders tab visible. Navigation to PO screens is not possible.

### TC-RBAC-011 — Admin can approve Purchase Orders
**Pre:** Logged in as Admin; at least one PO in `pending_approval` status.
**Steps:** Navigate to Purchase Orders → select pending PO → tap **Approve**.
**Expected:** Approve PO screen loads; approve action available.

### TC-RBAC-012 — StoreIncharge cannot approve Purchase Orders
**Pre:** Logged in as StoreIncharge; PO in `pending_approval` status.
**Steps:** Navigate to Purchase Orders → select pending PO.
**Expected:** Approve button is **not** visible; no approval action available.

### TC-RBAC-013 — Role change takes effect immediately
**Pre:** User A is logged in as SiteManager. Admin has both accounts open (or can switch).
**Steps:**
1. Admin changes User A's role to StoreIncharge.
2. User A's app (without restarting) — wait for real-time sync.
**Expected:** User A's tab bar updates to show Purchase Orders tab; Inventory now shows Central Store.

---

## 4. Dashboard

### TC-DASH-001 — Dashboard loads for Admin
**Pre:** Logged in as Admin; some data exists (items, requests, sites).
**Steps:** Navigate to Dashboard tab.
**Expected:** Greeting with name and role; quick stats (total items, sites, pending requests); low stock widget; recent activity; pending requests widget.

### TC-DASH-002 — Dashboard loads for StoreIncharge
**Pre:** Logged in as StoreIncharge.
**Steps:** Navigate to Dashboard tab.
**Expected:** Role-appropriate widgets visible; no Sites management widget; pending requests widget shows.

### TC-DASH-003 — Dashboard loads for SiteManager
**Pre:** Logged in as SiteManager.
**Steps:** Navigate to Dashboard tab.
**Expected:** Site-specific stats visible; no central store stats; pending transfer requests visible.

### TC-DASH-004 — Low stock alert widget shows correct count
**Pre:** At least 2 items below minimum stock level.
**Steps:** Navigate to Dashboard → observe low stock widget.
**Expected:** Correct count of low-stock items shown; tapping widget navigates to filtered inventory list.

### TC-DASH-005 — Pending requests widget
**Pre:** At least 1 pending request.
**Steps:** Navigate to Dashboard → observe pending requests widget.
**Expected:** Count of pending requests shown correctly; tapping navigates to Requests queue.

### TC-DASH-006 — Recent activity feed
**Pre:** Some activity has occurred.
**Steps:** Navigate to Dashboard → scroll to recent activity section.
**Expected:** Last N activity items shown in chronological order (newest first).

### TC-DASH-007 — Pull-to-refresh updates data
**Pre:** Logged in; another device/user creates a new item.
**Steps:** Pull down on Dashboard screen.
**Expected:** Loading indicator shows → dashboard stats update to reflect latest data.

### TC-DASH-008 — Dashboard greeting shows correct user name
**Pre:** User's display name is set.
**Steps:** Log in → observe Dashboard.
**Expected:** Greeting matches the logged-in user's display name and role label.

---

## 5. Inventory — Central Store (Admin / StoreIncharge)

### TC-INV-001 — View Central Store Inventory list
**Pre:** Logged in as Admin or StoreIncharge; items exist.
**Steps:** Navigate to Inventory tab.
**Expected:** List of all items with name, SKU, category, total quantity, stock status badge.

### TC-INV-002 — Search items by name
**Pre:** Items exist.
**Steps:** Tap search bar → type partial item name (e.g., "Cem").
**Expected:** List filters in real-time to show only matching items.

### TC-INV-003 — Search items by SKU
**Pre:** Items exist with SKUs.
**Steps:** Tap search bar → type a known SKU.
**Expected:** Matching item(s) shown in list.

### TC-INV-004 — Filter items by category
**Pre:** Items exist in multiple categories.
**Steps:** Tap filter → select a specific category → apply.
**Expected:** Only items in that category shown.

### TC-INV-005 — Filter items by type (consumable / non-consumable)
**Pre:** Both item types exist.
**Steps:** Tap filter → select "Consumable".
**Expected:** Only consumable items listed.

### TC-INV-006 — Filter items by stock level (low stock)
**Pre:** Some items below minimum stock level.
**Steps:** Tap filter → select "Low Stock".
**Expected:** Only items at or below minimum stock level shown.

### TC-INV-007 — Sort items
**Pre:** Multiple items exist.
**Steps:** Tap sort → select "Name A–Z".
**Expected:** Items sorted alphabetically by name ascending.

### TC-INV-008 — Low stock count badge on tab/header
**Pre:** At least 1 item below minimum stock.
**Steps:** Navigate to Inventory tab.
**Expected:** Badge showing low-stock count visible on tab or header.

### TC-INV-009 — Create new item (non-consumable)
**Pre:** Logged in as Admin; categories exist.
**Steps:**
1. Tap **+ Add Item**.
2. Fill in: Name "Test Drill", SKU "DRL-001", Category (select), Type = Non-consumable, Unit = "piece", Min Stock = 5, Initial Qty = 10.
3. Tap **Save**.
**Expected:** Item created; appears in inventory list with quantity 10 in Central Store.

### TC-INV-010 — Create new item (consumable)
**Pre:** Logged in as Admin or StoreIncharge.
**Steps:**
1. Tap **+ Add Item** → fill in same fields but Type = Consumable.
2. Tap **Save**.
**Expected:** Item created; listed with consumable badge/indicator.

### TC-INV-011 — Create item with duplicate SKU
**Pre:** Item with SKU "DRL-001" already exists.
**Steps:**
1. Tap **+ Add Item** → enter SKU "DRL-001" + other valid fields.
2. Tap **Save**.
**Expected:** Error: "SKU already exists" or similar; item is not created.

### TC-INV-012 — Create item with missing required fields
**Pre:** Add Item screen open.
**Steps:**
1. Leave Name blank → Tap **Save**.
**Expected:** Inline validation error: "Name is required"; form not submitted.

### TC-INV-013 — Create item with image upload
**Pre:** Add Item screen open.
**Steps:**
1. Fill in valid item data.
2. Tap image upload area → select a photo from device.
3. Tap **Save**.
**Expected:** Image uploaded to Firebase Storage; item shows thumbnail in list.

### TC-INV-014 — Edit existing item name and description
**Pre:** Item "Test Drill" exists.
**Steps:**
1. Tap item → tap **Edit**.
2. Change Name to "Test Drill v2" and update description.
3. Tap **Save**.
**Expected:** Item updated; list shows new name; activity log records `item_updated`.

### TC-INV-015 — Edit item minimum stock level
**Pre:** Item exists with min stock = 5.
**Steps:**
1. Edit item → change Min Stock to 20.
2. Save.
**Expected:** Min stock updated; if current qty < 20, low-stock badge appears.

### TC-INV-016 — Cannot change item type after first transaction
**Pre:** Item has been used in a request or PO.
**Steps:**
1. Edit item → try to change Type from Non-consumable to Consumable.
**Expected:** Type field is disabled/read-only; change not allowed.

### TC-INV-017 — View Item Detail screen
**Pre:** Item exists with inventory entries.
**Steps:** Tap an item in list.
**Expected:** Detail screen shows: full info, stock breakdown by location (Central, at Sites, in Maintenance), image, edit button.

### TC-INV-018 — Item detail shows correct stock breakdown
**Pre:** Item has: 10 in Central, 5 at Site A, 2 in Maintenance.
**Steps:** Open Item Detail.
**Expected:** Central Store: 10, At Sites: 5, In Maintenance: 2, Total: 17.

### TC-INV-019 — Adjust quantity (increase)
**Pre:** Item with quantity 10 in Central Store.
**Steps:**
1. Open Item Detail → Adjust Quantity.
2. Enter +5 adjustment with reason.
3. Confirm.
**Expected:** Central Store quantity increases to 15; activity log records `quantity_adjusted`.

### TC-INV-020 — Adjust quantity (decrease)
**Pre:** Item with quantity 15 in Central Store.
**Steps:**
1. Open Item Detail → Adjust Quantity.
2. Enter -5 adjustment with reason.
3. Confirm.
**Expected:** Central Store quantity decreases to 10.

### TC-INV-021 — Adjust quantity below zero
**Pre:** Item with quantity 5.
**Steps:**
1. Adjust Quantity → enter -10.
**Expected:** Error: "Quantity cannot go below 0"; adjustment rejected.

### TC-INV-022 — Delete item (soft delete / deactivate)
**Pre:** Item exists with no active transactions.
**Steps:**
1. Long-press or use menu on item → tap **Delete/Deactivate**.
2. Confirm prompt.
**Expected:** Item removed from active list (or marked discontinued); activity logged.

### TC-INV-023 — Cannot delete item with active transactions
**Pre:** Item has pending request or active maintenance.
**Steps:**
1. Try to delete item.
**Expected:** Error: "Cannot delete item with active transactions"; item not deleted.

### TC-INV-024 — Weight-based item creation
**Pre:** Steel master items exist.
**Steps:**
1. Add Item → toggle "Weight-based" → enter Weight per Meter and Default Length.
2. Link to a Steel Master item.
3. Save.
**Expected:** Item saved with weight config; item detail shows kg/m and length.

### TC-INV-025 — Real-time inventory update across users
**Pre:** Two sessions: Admin A and StoreIncharge B both on Inventory screen.
**Steps:**
1. Admin A adjusts quantity of an item.
**Expected:** StoreIncharge B's list updates automatically without manual refresh.

---

## 6. Inventory — Site View (SiteManager)

### TC-SITE-INV-001 — View My Site Inventory
**Pre:** Logged in as SiteManager assigned to Site A; items transferred to Site A.
**Steps:** Navigate to Inventory tab.
**Expected:** My Site Inventory loads showing items at Site A only.

### TC-SITE-INV-002 — Search items in site inventory
**Pre:** Site inventory has items.
**Steps:** Type in search bar.
**Expected:** List filters to matching items at this site.

### TC-SITE-INV-003 — View item detail from site inventory
**Pre:** Site inventory has items.
**Steps:** Tap an item.
**Expected:** Item detail shows stock breakdown; no edit/delete buttons; can view full info.

### TC-SITE-INV-004 — View Other Sites' Inventory
**Pre:** Other sites have items.
**Steps:** Navigate to Inventory → tap "Other Sites".
**Expected:** Can browse other sites' inventory in read-only mode.

### TC-SITE-INV-005 — Site inventory shows only site-specific quantities
**Pre:** Item has 10 in Central, 3 at Site A.
**Steps:** Log in as Site A Manager → open item detail.
**Expected:** Shows 3 units at Site A; may show total but site-specific count is prominent.

---

## 7. Steel Master

### TC-STEEL-001 — View Steel Master list
**Pre:** Logged in as Admin or StoreIncharge; steel master records exist.
**Steps:** Navigate to Inventory → Steel Master section.
**Expected:** List of steel master items with name, weight/meter, default length, HSN code, status.

### TC-STEEL-002 — Create new Steel Master item
**Pre:** Logged in as Admin or StoreIncharge.
**Steps:**
1. Tap **+ Add Steel Master**.
2. Enter Name "MS Angle 50x50", Weight/Meter = 5.8, Default Length = 6, HSN = "7216".
3. Tap **Save**.
**Expected:** Steel master item created; appears in list; activity logged (`steel_master_created`).

### TC-STEEL-003 — Create Steel Master with missing required fields
**Pre:** Add Steel Master form open.
**Steps:** Leave Name blank → Tap **Save**.
**Expected:** Inline validation error; form not submitted.

### TC-STEEL-004 — Edit Steel Master item
**Pre:** Steel master item "MS Angle 50x50" exists.
**Steps:**
1. Tap item → tap **Edit**.
2. Change weight/meter from 5.8 to 6.0.
3. Save.
**Expected:** Updated; activity log records `steel_master_updated`.

### TC-STEEL-005 — Deactivate Steel Master item
**Pre:** Active steel master item exists.
**Steps:**
1. Edit item → toggle Status to **Inactive**.
2. Save.
**Expected:** Item marked inactive; not available for linking in new items.

### TC-STEEL-006 — Delete Steel Master item
**Pre:** Steel master item not linked to any inventory item.
**Steps:**
1. Tap item → tap **Delete** → Confirm.
**Expected:** Item removed from list.

### TC-STEEL-007 — Cannot delete Steel Master linked to inventory item
**Pre:** Steel master is linked to active inventory item.
**Steps:**
1. Try to delete linked steel master item.
**Expected:** Error: "Cannot delete — linked to existing item(s)".

---

## 8. Categories

### TC-CAT-001 — Create new category
**Pre:** Logged in as Admin or StoreIncharge.
**Steps:**
1. Navigate to Add Item → Category field → tap "Add Category".
2. Enter "Power Tools" → Confirm.
**Expected:** Category created; available in dropdown for items.

### TC-CAT-002 — Rename a category
**Pre:** Category exists.
**Steps:**
1. Access category management → edit category name.
2. Save.
**Expected:** Category name updated; existing items linked to it retain association.

### TC-CAT-003 — Delete unused category
**Pre:** Category exists with no items.
**Steps:** Delete category → Confirm.
**Expected:** Category removed from list.

### TC-CAT-004 — Cannot delete category with items
**Pre:** Category has linked items.
**Steps:** Try to delete category.
**Expected:** Error: "Category has items; cannot delete".

---

## 9. Requests — Create & Manage (SiteManager)

### TC-REQ-001 — View My Requests list
**Pre:** Logged in as SiteManager; requests exist.
**Steps:** Navigate to Requests tab.
**Expected:** My Requests screen shows list of own requests with status badges and request numbers.

### TC-REQ-002 — Filter requests by status tab
**Pre:** Requests in multiple statuses exist.
**Steps:** Tap "Pending" status tab.
**Expected:** Only pending requests shown.

### TC-REQ-003 — Search requests
**Pre:** Multiple requests exist.
**Steps:** Type request number or item name in search bar.
**Expected:** Matching requests shown.

### TC-REQ-004 — Create new request (basic)
**Pre:** Logged in as SiteManager; items with stock > 0 exist.
**Steps:**
1. Tap **+ Create Request**.
2. Select item(s), enter quantities.
3. Set Priority = Medium, add Purpose.
4. Tap **Submit**.
**Expected:** Request created with status "Pending"; request number generated (REQ-YYYY-NNNN); appears in My Requests list.

### TC-REQ-005 — Create request with high priority
**Pre:** Items with stock exist.
**Steps:**
1. Create request → set Priority = High.
2. Submit.
**Expected:** Request has High priority badge; appears prominently in StoreIncharge/Admin queue with high-priority indicator.

### TC-REQ-006 — Create request and save as draft
**Pre:** Create Request screen open.
**Steps:**
1. Fill in items and quantities.
2. Tap **Save as Draft** (instead of Submit).
**Expected:** Request saved with status "Draft"; does not appear in pending queue for StoreIncharge.

### TC-REQ-007 — Submit a draft request
**Pre:** Draft request exists.
**Steps:**
1. Open draft request from My Requests.
2. Tap **Submit**.
**Expected:** Status changes from "Draft" to "Pending"; visible in StoreIncharge/Admin queue.

### TC-REQ-008 — Create request with zero quantity
**Pre:** Create Request screen.
**Steps:**
1. Add item → enter quantity 0 → Tap Submit.
**Expected:** Inline error: "Quantity must be greater than 0".

### TC-REQ-009 — Create request exceeding available stock
**Pre:** Item has only 5 units in Central Store.
**Steps:**
1. Create request → enter quantity 100 for that item.
2. Tap Submit.
**Expected:** Warning shown: "Requested quantity exceeds available stock" (soft warning or hard block, per business rule).

### TC-REQ-010 — Create request with no items
**Pre:** Create Request screen open.
**Steps:**
1. Don't add any items → Tap Submit.
**Expected:** Error: "Please add at least one item".

### TC-REQ-011 — Edit a draft request
**Pre:** Draft request exists.
**Steps:**
1. Open draft request → Tap **Edit**.
2. Change quantity of an item.
3. Save.
**Expected:** Request updated; changes reflected in list.

### TC-REQ-012 — Edit a pending request
**Pre:** Pending (not yet processed) request exists.
**Steps:**
1. Open pending request → Tap **Edit**.
2. Modify items/quantities.
3. Save.
**Expected:** Request updated; status remains Pending; activity log records `request_edited`.

### TC-REQ-013 — Cancel a draft request
**Pre:** Draft request exists.
**Steps:**
1. Open draft → Tap **Cancel Request** → Confirm.
**Expected:** Request status changes to "Cancelled"; no longer in active queue.

### TC-REQ-014 — Cannot cancel an approved request
**Pre:** Approved request exists.
**Steps:**
1. Open approved request → look for Cancel option.
**Expected:** Cancel option not available or shows error if attempted.

### TC-REQ-015 — Request number format validation
**Pre:** New request submitted.
**Steps:** Check request number format.
**Expected:** Format is REQ-YYYY-NNNN (e.g., REQ-2025-0001) where YYYY = current year.

### TC-REQ-016 — Request counter increments
**Pre:** Last request was REQ-2025-0005.
**Steps:** Create new request → Submit.
**Expected:** New request number is REQ-2025-0006.

---

## 10. Requests — Process & Transfer (Admin / StoreIncharge)

### TC-PROC-001 — View Request Queue
**Pre:** Logged in as Admin or StoreIncharge; pending requests exist.
**Steps:** Navigate to Requests tab.
**Expected:** Request Queue shows all pending requests from all sites; request cards show number, site, item count, priority.

### TC-PROC-002 — High priority badge on Requests tab
**Pre:** At least 1 high-priority pending request.
**Steps:** Observe Requests tab in tab bar.
**Expected:** Badge on tab showing count of high-priority pending requests.

### TC-PROC-003 — Filter request queue by status
**Pre:** Requests in various statuses exist.
**Steps:** Filter by "Approved" status.
**Expected:** Only approved requests shown.

### TC-PROC-004 — Filter request queue by site
**Pre:** Requests from multiple sites.
**Steps:** Filter by "Site A".
**Expected:** Only requests from Site A shown.

### TC-PROC-005 — Process (approve) a request with full quantities
**Pre:** Pending request with item qty 10; stock available ≥ 10.
**Steps:**
1. Open pending request → Tap **Process/Approve**.
2. Quantities default to requested amounts.
3. Add store notes → Tap **Approve**.
**Expected:** Request status changes to "Approved"; activity log: `request_approved`.

### TC-PROC-006 — Approve request with partial quantities
**Pre:** Pending request for 10 units; only 5 in stock.
**Steps:**
1. Open request → Approve with quantity = 5 (partial).
2. Confirm.
**Expected:** Request approved with partial quantities; SiteManager sees approved quantity as 5.

### TC-PROC-007 — Reject a request with reason
**Pre:** Pending request exists.
**Steps:**
1. Open request → Tap **Reject**.
2. Select reason: "Items not required".
3. Add comment → Confirm rejection.
**Expected:** Status changes to "Rejected"; rejection reason and comments stored; activity log: `request_rejected`.

### TC-PROC-008 — Reject without selecting reason
**Pre:** Reject Request screen open.
**Steps:**
1. Don't select a rejection reason → Tap Confirm.
**Expected:** Inline error: "Rejection reason is required".

### TC-PROC-009 — Transfer approved items to site
**Pre:** Request in "Approved" status.
**Steps:**
1. Open approved request → Tap **Confirm Transfer**.
2. Confirm receiver name.
3. Tap **Transfer**.
**Expected:** Status changes to "Transferred"; Central Store qty decreases; Site inventory increases; activity log: `request_transferred`.

### TC-PROC-010 — Transfer updates inventory correctly
**Pre:** Item has 20 in Central Store; request for 5 approved and transferred to Site A.
**Steps:** After transfer, check inventory.
**Expected:** Central Store shows 15; Site A shows 5 (or +5 if existing).

### TC-PROC-011 — Cannot transfer same request twice
**Pre:** Request already in "Transferred" status.
**Steps:**
1. Open transferred request → try to tap Transfer again.
**Expected:** Transfer button not visible or disabled; no duplicate transfer possible.

---

## 11. Return Items (SiteManager)

### TC-RET-001 — Return all items from a transferred request (full return)
**Pre:** Logged in as SiteManager; transferred request exists with non-consumable items.
**Steps:**
1. Open transferred request from My Requests → Tap **Return Items**.
2. Enter full return quantities for all items.
3. Set condition = "Good" for all.
4. Add return notes → Tap **Submit Return**.
**Expected:** Request status changes to "Returned"; Central Store inventory increases; activity log: `items_returned`.

### TC-RET-002 — Partial return
**Pre:** Transferred request with 5 units of item.
**Steps:**
1. Return Items screen → enter quantity 3 (out of 5).
2. Submit.
**Expected:** 3 items returned to Central Store; request status changes to "Partially Returned"; 2 still at site.

### TC-RET-003 — Return items with "Needs Maintenance" condition
**Pre:** Transferred request exists.
**Steps:**
1. Return Items → set item condition to "Needs Maintenance".
2. Submit return.
**Expected:** Items returned; system prompts or auto-creates maintenance record for those items.

### TC-RET-004 — Return items with "Damaged" condition
**Pre:** Transferred request exists.
**Steps:**
1. Return Items → set condition to "Damaged".
2. Submit return.
**Expected:** Items returned with damaged flag; maintenance record may be created; inventory updated.

### TC-RET-005 — Cannot return more than transferred quantity
**Pre:** 5 units transferred.
**Steps:**
1. Return Items → enter quantity 10 for item.
**Expected:** Validation error: "Cannot return more than transferred quantity (5)".

### TC-RET-006 — Cannot return consumable items
**Pre:** Transferred request contains consumable items.
**Steps:**
1. Open Return Items screen.
**Expected:** Consumable items are not listed for return (or marked as not returnable).

### TC-RET-007 — Second partial return
**Pre:** Request in "Partially Returned" status; 2 items still at site.
**Steps:**
1. Open partially-returned request → Tap **Return Remaining**.
2. Enter quantity 2 → Submit.
**Expected:** All items returned; status changes to "Returned"; return history shows 2 separate return events.

### TC-RET-008 — Return history is preserved
**Pre:** Multiple returns made on same request.
**Steps:** Open request detail → view return history section.
**Expected:** Each return event listed with date, returned by, quantities, and conditions.

---

## 12. Purchase Orders — Create & Edit

### TC-PO-001 — View Purchase Orders list
**Pre:** Logged in as Admin or StoreIncharge; POs exist.
**Steps:** Navigate to Purchase Orders tab.
**Expected:** List of POs with PO number, vendor, total amount, status badge, item count.

### TC-PO-002 — Filter POs by status
**Pre:** POs in multiple statuses exist.
**Steps:** Filter by "Approved".
**Expected:** Only approved POs shown.

### TC-PO-003 — Search POs by number
**Pre:** PO with number "PO-2025-001" exists.
**Steps:** Type "PO-2025-001" in search.
**Expected:** Matching PO shown.

### TC-PO-004 — Create new Purchase Order (basic)
**Pre:** Vendors exist; items exist.
**Steps:**
1. Tap **+ Create PO**.
2. Select vendor from dropdown.
3. Add item: select item, qty = 10, unit price = 500, GST = 18%.
4. Add justification.
5. Tap **Submit for Approval**.
**Expected:** PO created with status "Pending Approval"; PO number generated; activity log: `po_created`.

### TC-PO-005 — Create PO and save as draft
**Pre:** Create PO screen open.
**Steps:**
1. Fill in vendor and items.
2. Tap **Save as Draft**.
**Expected:** PO saved with status "Draft"; not visible in approval queue.

### TC-PO-006 — Create PO with new vendor inline
**Pre:** No vendor exists for required supplier.
**Steps:**
1. Create PO → Vendor field → tap "Add New Vendor".
2. Fill vendor details → Save.
3. Select newly created vendor → complete PO.
**Expected:** Vendor created and linked; PO saved successfully.

### TC-PO-007 — GST calculation is correct
**Pre:** Create PO screen; item qty = 10, unit price = 1000, GST = 18%.
**Steps:** Check auto-calculated totals.
**Expected:** Subtotal = 10,000; GST = 1,800; Total = 11,800.

### TC-PO-008 — Multiple items in one PO
**Pre:** Create PO screen.
**Steps:**
1. Add 3 different items with different quantities and prices.
**Expected:** Grand total = sum of all items' amounts + GST; calculation is correct.

### TC-PO-009 — Create PO without selecting vendor
**Pre:** Create PO screen.
**Steps:**
1. Add items but leave vendor blank → Tap Submit.
**Expected:** Validation error: "Vendor is required".

### TC-PO-010 — Create PO without adding items
**Pre:** Create PO screen.
**Steps:**
1. Select vendor, add justification, no items → Tap Submit.
**Expected:** Validation error: "Please add at least one item".

### TC-PO-011 — Edit a draft PO
**Pre:** Draft PO exists.
**Steps:**
1. Open draft PO → Tap **Edit**.
2. Change item quantity.
3. Save.
**Expected:** PO updated; totals recalculated.

### TC-PO-012 — Cannot edit an approved PO
**Pre:** Approved PO exists.
**Steps:**
1. Open approved PO → look for Edit button.
**Expected:** Edit button not visible or disabled for approved/received POs.

### TC-PO-013 — Upload supporting document to PO
**Pre:** Create PO screen.
**Steps:**
1. Tap document upload area → select a PDF/image.
**Expected:** Document uploaded; filename shown; PO saves with document attached.

### TC-PO-014 — PDF preview/print functionality
**Pre:** PO exists with items.
**Steps:**
1. Open PO → Tap **Preview PDF**.
**Expected:** PDF generated showing PO details (vendor, items, totals, signatures area).

---

## 13. Purchase Orders — Approve / Reject (Admin)

### TC-APPO-001 — Admin sees pending approval badge on PO tab
**Pre:** At least 1 PO in "pending_approval" status.
**Steps:** Observe Purchase Orders tab.
**Expected:** Badge showing count of pending approvals visible on tab.

### TC-APPO-002 — Admin approves a PO
**Pre:** PO in "pending_approval" status.
**Steps:**
1. Navigate to PO → Tap **Approve**.
2. Add admin comments.
3. Confirm.
**Expected:** PO status changes to "Approved"; activity log: `po_approved`; StoreIncharge can now receive it.

### TC-APPO-003 — Admin rejects a PO with reason
**Pre:** PO in "pending_approval" status.
**Steps:**
1. Open PO → Tap **Reject**.
2. Enter rejection reason.
3. Confirm.
**Expected:** PO status changes to "Rejected"; reason stored; activity log: `po_rejected`.

### TC-APPO-004 — StoreIncharge cannot see Approve button
**Pre:** Logged in as StoreIncharge; PO in pending_approval.
**Steps:** Open pending approval PO.
**Expected:** No Approve/Reject buttons visible.

### TC-APPO-005 — Mark PO as Ordered
**Pre:** Approved PO exists; logged in as Admin or StoreIncharge.
**Steps:**
1. Open approved PO → Tap **Mark as Ordered**.
**Expected:** PO status changes to "Ordered"; activity log: `po_ordered`.

---

## 14. Purchase Orders — Receive (Admin / StoreIncharge)

### TC-RECV-001 — Receive a PO (full receipt)
**Pre:** PO in "Approved" or "Ordered" status; items in PO.
**Steps:**
1. Open PO → Tap **Receive PO**.
2. Enter received quantities (matching ordered quantities).
3. Add received date and notes.
4. Confirm.
**Expected:** PO status changes to "Received"; items added to Central Store inventory; activity log: `po_received`.

### TC-RECV-002 — Receive PO adds items to inventory
**Pre:** Item "Cement Bags" has 50 in store; PO has 100 bags.
**Steps:** Receive PO with 100 bags.
**Expected:** Inventory for "Cement Bags" increases to 150 in Central Store.

### TC-RECV-003 — Receive PO with partial quantities
**Pre:** PO ordered 100 items; only 80 arrived.
**Steps:**
1. Receive PO → enter received qty = 80.
**Expected:** 80 items added to inventory; PO notes shortage of 20; PO status = Received (with partial note).

### TC-RECV-004 — Upload invoice/document on receipt
**Pre:** Receive PO screen.
**Steps:**
1. During receipt, tap document upload → upload invoice image.
**Expected:** Document attached to PO record; accessible from PO detail.

### TC-RECV-005 — Received by name is auto-filled
**Pre:** Receive PO screen.
**Steps:** Observe "Received By" field.
**Expected:** Field pre-filled with logged-in user's name; cannot be changed.

---

## 15. Vendor Management

### TC-VEN-001 — View Vendor list
**Pre:** Logged in as Admin or StoreIncharge; vendors exist.
**Steps:** Navigate to Purchase Orders → Vendors.
**Expected:** Vendor list with name, contact, phone, GSTIN, PO count, status.

### TC-VEN-002 — Create new vendor
**Pre:** Vendor Management screen.
**Steps:**
1. Tap **+ Add Vendor**.
2. Fill: Name "Sunrise Steel", Contact "Ravi Kumar", Phone "9876543210", GSTIN "27XXXXX".
3. Save.
**Expected:** Vendor created; appears in list; activity log: `vendor_created`.

### TC-VEN-003 — Create vendor with missing required fields
**Pre:** Add Vendor screen.
**Steps:**
1. Leave Name blank → Tap Save.
**Expected:** Validation error: "Vendor name is required".

### TC-VEN-004 — Edit vendor details
**Pre:** Vendor exists.
**Steps:**
1. Open vendor → Tap **Edit** → update phone number → Save.
**Expected:** Vendor updated; activity log: `vendor_updated`.

### TC-VEN-005 — Deactivate vendor
**Pre:** Active vendor exists.
**Steps:**
1. Edit vendor → toggle Status to "Inactive" → Save.
**Expected:** Vendor marked inactive; not available in PO vendor dropdown.

### TC-VEN-006 — Search vendors
**Pre:** Multiple vendors exist.
**Steps:** Type vendor name in search bar.
**Expected:** Filtered list shows matching vendors.

### TC-VEN-007 — Vendor PO count updates after PO creation
**Pre:** Vendor has PO count = 2.
**Steps:**
1. Create new PO for same vendor.
**Expected:** Vendor PO count increments to 3; last PO date updates.

---

## 16. Maintenance — Add to Maintenance

### TC-MAINT-001 — View Maintenance Dashboard
**Pre:** Logged in as Admin or StoreIncharge; maintenance records exist.
**Steps:** Navigate to Inventory → Maintenance.
**Expected:** Two tabs: Active (pending, partial_return) and History (returned, written_off); cards show item, status, issue type, days in maintenance.

### TC-MAINT-002 — Add item to maintenance (manual)
**Pre:** Items in inventory.
**Steps:**
1. Tap **+ Add to Maintenance**.
2. Select item, enter quantity = 2.
3. Set Issue Type = "Physical Damage", add description.
4. Tap **Submit**.
**Expected:** Maintenance record created with status "Pending"; item moved from Central Store to In Maintenance; activity log: `maintenance_added`.

### TC-MAINT-003 — Add to maintenance with photo upload
**Pre:** Add to Maintenance screen.
**Steps:**
1. Fill in item, issue type.
2. Tap photo upload → select 2 photos.
3. Submit.
**Expected:** Photos uploaded; maintenance record shows photo gallery.

### TC-MAINT-004 — Add maintenance with missing required fields
**Pre:** Add to Maintenance screen.
**Steps:**
1. Leave issue description blank → Submit.
**Expected:** Validation error (if description is required); form not submitted.

### TC-MAINT-005 — Add maintenance quantity > available stock
**Pre:** Item has 3 units in Central Store.
**Steps:**
1. Add to Maintenance → enter quantity = 10.
**Expected:** Error: "Quantity exceeds available stock (3)".

### TC-MAINT-006 — Maintenance from item return (auto-linked)
**Pre:** SiteManager returned items with condition "Needs Maintenance".
**Steps:** Check Maintenance Dashboard.
**Expected:** Auto-created maintenance record linked to the return with source request ID stored.

### TC-MAINT-007 — View Maintenance Detail
**Pre:** Active maintenance record exists.
**Steps:** Tap maintenance record.
**Expected:** Full details: item info, issue type/description, photos, status, timeline updates, action buttons.

### TC-MAINT-008 — Add maintenance update note
**Pre:** Maintenance record in "Pending" status.
**Steps:**
1. Open record → tap **Add Update**.
2. Enter note "Sent to service center" → Confirm.
**Expected:** Update note added with timestamp and user name; visible in timeline.

### TC-MAINT-009 — Days in maintenance counter
**Pre:** Maintenance record created 5 days ago.
**Steps:** View maintenance card.
**Expected:** Shows "5 days" or "5d" indicator.

---

## 17. Maintenance — Return from Maintenance

### TC-MAINT-RET-001 — Return all items from maintenance (full)
**Pre:** Maintenance record with 3 items in "Pending" status.
**Steps:**
1. Open record → Tap **Return from Maintenance**.
2. Enter return qty = 3.
3. Add repair summary, cost, repaired by.
4. Submit.
**Expected:** Items returned to Central Store; maintenance status = "Returned"; activity log: `maintenance_returned`.

### TC-MAINT-RET-002 — Partial return from maintenance
**Pre:** Maintenance record with 5 items.
**Steps:**
1. Return from Maintenance → enter qty = 3.
2. Submit.
**Expected:** 3 items returned to Central Store; maintenance status = "Partial Return"; 2 still in maintenance.

### TC-MAINT-RET-003 — Cannot return more than quantity in maintenance
**Pre:** Maintenance record has 3 units.
**Steps:**
1. Return from Maintenance → enter qty = 10.
**Expected:** Validation error: "Cannot return more than 3".

### TC-MAINT-RET-004 — Repair summary is required on return
**Pre:** Return from Maintenance screen.
**Steps:**
1. Leave repair summary blank → Submit.
**Expected:** Validation error: "Repair summary is required" (if required field).

### TC-MAINT-RET-005 — Inventory updates correctly after return
**Pre:** Item has 10 in Central Store; 3 in maintenance.
**Steps:** Return 3 from maintenance.
**Expected:** Central Store increases to 13; In Maintenance decreases to 0.

---

## 18. Maintenance — Write Off

### TC-WRITEOFF-001 — Write off item from maintenance
**Pre:** Maintenance record in "Pending" status.
**Steps:**
1. Open record → Tap **Write Off**.
2. Enter quantity to write off.
3. Select reason: "Beyond Repair".
4. Add explanation → Confirm.
**Expected:** Items removed permanently from inventory; maintenance status = "Written Off"; activity log: `item_written_off`.

### TC-WRITEOFF-002 — Write off partial quantity
**Pre:** Maintenance record with 5 items.
**Steps:**
1. Write Off → enter qty = 2 (write off 2, keep 3 in maintenance).
2. Confirm.
**Expected:** 2 items removed from inventory; 3 remain in maintenance (status = Partial Return or Pending).

### TC-WRITEOFF-003 — Write off requires reason
**Pre:** Write Off screen.
**Steps:**
1. Leave reason unselected → Confirm.
**Expected:** Validation error: "Write-off reason is required".

### TC-WRITEOFF-004 — Write-off is irreversible
**Pre:** Item written off.
**Steps:**
1. Check maintenance history and inventory.
**Expected:** Item quantity permanently reduced; no "undo" option available; written-off record in Maintenance History tab.

### TC-WRITEOFF-005 — Cannot write off more than in maintenance
**Pre:** 3 units in maintenance.
**Steps:**
1. Write Off → enter qty = 10.
**Expected:** Error: "Cannot write off more than quantity in maintenance (3)".

---

## 19. Sites Management (Admin)

### TC-SITES-001 — View Sites list
**Pre:** Logged in as Admin; sites exist.
**Steps:** Navigate to Sites tab.
**Expected:** List of sites with name, address, manager name, status badge.

### TC-SITES-002 — Create new site
**Pre:** Logged in as Admin.
**Steps:**
1. Tap **+ Add Site**.
2. Enter Name "Sunrise Project", Address "123 Main St", Contact "9876543210".
3. Optionally assign manager.
4. Tap **Save**.
**Expected:** Site created; appears in list with "Active" status; activity log: `site_created`.

### TC-SITES-003 — Create site with duplicate name
**Pre:** Site "Sunrise Project" already exists.
**Steps:**
1. Create site with same name "Sunrise Project".
**Expected:** Error: "Site name already exists".

### TC-SITES-004 — Create site with missing required fields
**Pre:** Add Site screen.
**Steps:**
1. Leave Name blank → Save.
**Expected:** Validation error: "Site name is required".

### TC-SITES-005 — Edit site details
**Pre:** Site exists.
**Steps:**
1. Open site → Tap **Edit** → change address → Save.
**Expected:** Site updated; activity log: `site_updated`.

### TC-SITES-006 — Assign manager to site
**Pre:** Site exists without manager; SiteManager user exists without assignment.
**Steps:**
1. Edit site → select manager from dropdown → Save.
**Expected:** Manager assigned; user's app now shows this site as their site.

### TC-SITES-007 — Reassign manager from one site to another
**Pre:** Manager assigned to Site A.
**Steps:**
1. Edit Site B → assign same manager.
**Expected:** Manager reassigned to Site B; Site A no longer has that manager.

### TC-SITES-008 — Deactivate a site
**Pre:** Active site exists.
**Steps:**
1. Edit site → toggle Status to "Inactive" → Save.
**Expected:** Site marked inactive; activity log: `site_status_changed`; site not available for new requests.

### TC-SITES-009 — Search sites
**Pre:** Multiple sites exist.
**Steps:** Type site name in search bar.
**Expected:** Matching sites shown.

### TC-SITES-010 — StoreIncharge cannot access Sites tab
**Pre:** Logged in as StoreIncharge.
**Steps:** Observe tab bar.
**Expected:** Sites tab not visible.

---

## 20. User Management (Admin)

### TC-USERS-001 — View all users
**Pre:** Logged in as Admin; multiple users exist.
**Steps:** Navigate to Dashboard → Users screen.
**Expected:** List of all users with name, email, role, status.

### TC-USERS-002 — Assign role to Unassigned user
**Pre:** New user with role "Unassigned" exists.
**Steps:**
1. Open user → tap **Assign Role**.
2. Select "SiteManager" → Confirm.
**Expected:** User role updated to SiteManager; activity log: `user_updated`; user's app updates navigation immediately.

### TC-USERS-003 — Change user role from SiteManager to StoreIncharge
**Pre:** User has role SiteManager.
**Steps:**
1. Open user → change role to StoreIncharge.
2. Confirm.
**Expected:** Role updated; user's navigation changes; site assignment removed if applicable.

### TC-USERS-004 — Disable a user account
**Pre:** Active user exists.
**Steps:**
1. Open user → Tap **Disable** → Confirm.
**Expected:** User account disabled; user cannot log in; activity log: `user_disabled`.

### TC-USERS-005 — Enable a disabled user
**Pre:** Disabled user exists.
**Steps:**
1. Open disabled user → Tap **Enable** → Confirm.
**Expected:** Account re-enabled; user can log in again; activity log: `user_enabled`.

### TC-USERS-006 — Admin cannot disable own account
**Pre:** Logged in as Admin.
**Steps:**
1. Navigate to own profile in Users list → try to disable.
**Expected:** Disable option not available or blocked; cannot self-disable.

### TC-USERS-007 — Search users by name or email
**Pre:** Multiple users exist.
**Steps:** Type name or email in search bar.
**Expected:** Filtered list shows matching users.

---

## 21. Profile & Password

### TC-PROF-001 — View profile details
**Pre:** Any authenticated user.
**Steps:** Navigate to Dashboard → Profile icon/screen.
**Expected:** Shows display name, email, role, profile photo (if set).

### TC-PROF-002 — Update display name
**Pre:** Logged in; Profile screen open.
**Steps:**
1. Tap **Edit Name** → change to "New Name" → Save.
**Expected:** Name updated; greeting on Dashboard reflects new name; activity log: `user_updated`.

### TC-PROF-003 — Change password successfully
**Pre:** Logged in; Profile screen.
**Steps:**
1. Tap **Change Password**.
2. Enter current password (for re-authentication).
3. Enter new password (≥ 6 chars) and confirm.
4. Tap **Update Password**.
**Expected:** Password changed; success confirmation; activity log: `password_changed`.

### TC-PROF-004 — Change password with wrong current password
**Pre:** Change Password screen.
**Steps:**
1. Enter wrong current password → new password → Tap Update.
**Expected:** Error: "Current password is incorrect"; password not changed.

### TC-PROF-005 — Change password with mismatched new passwords
**Pre:** Change Password screen.
**Steps:**
1. Enter correct current password → new "Password1" → confirm "Password2".
**Expected:** Validation error: "Passwords do not match".

### TC-PROF-006 — Change password with weak new password
**Pre:** Change Password screen.
**Steps:**
1. Enter valid current password → new password "123".
**Expected:** Validation error: "Password must be at least 6 characters".

---

## 22. Activity Log (Admin)

### TC-ACTLOG-001 — View all activity logs
**Pre:** Logged in as Admin; activity has occurred.
**Steps:** Navigate to Dashboard → Activity Log.
**Expected:** List of all system activities in reverse-chronological order; each entry shows: user name, role, action, target, summary, timestamp.

### TC-ACTLOG-002 — Filter by user
**Pre:** Multiple users have performed actions.
**Steps:** Filter by specific user name.
**Expected:** Only that user's activities shown.

### TC-ACTLOG-003 — Filter by action category
**Pre:** Activities in multiple categories exist.
**Steps:** Filter by "inventory" category.
**Expected:** Only inventory-related actions shown (item_created, item_updated, quantity_adjusted, etc.).

### TC-ACTLOG-004 — Filter by action type
**Pre:** Various action types exist.
**Steps:** Filter by "request_approved".
**Expected:** Only request approval events shown.

### TC-ACTLOG-005 — Filter by date range
**Pre:** Activities span multiple days.
**Steps:** Set start date = today, end date = today.
**Expected:** Only today's activities shown.

### TC-ACTLOG-006 — Search activity log
**Pre:** Request number "REQ-2025-0010" in logs.
**Steps:** Search "REQ-2025-0010".
**Expected:** Matching log entries shown.

### TC-ACTLOG-007 — View activity detail with before/after values
**Pre:** Item was edited (name changed).
**Steps:**
1. Open activity log entry for item edit.
**Expected:** Shows changed fields with old value → new value (e.g., "Name: Old Name → New Name").

### TC-ACTLOG-008 — Export activity logs to CSV
**Pre:** Logged in as Admin.
**Steps:**
1. Apply any filters → Tap **Export to CSV**.
**Expected:** CSV file generated/downloaded with all filtered log entries.

### TC-ACTLOG-009 — Pagination / infinite scroll
**Pre:** More than N log entries exist (where N = page size).
**Steps:** Scroll to bottom of activity log list.
**Expected:** More entries loaded automatically (infinite scroll) or pagination controls appear.

### TC-ACTLOG-010 — Non-Admin cannot access full Activity Log
**Pre:** Logged in as StoreIncharge.
**Steps:** Look for Activity Log navigation.
**Expected:** Full Activity Log not accessible; only My Activity is available.

---

## 23. My Activity (All Roles)

### TC-MYACT-001 — View own activity
**Pre:** Logged in user has performed actions.
**Steps:** Navigate to Dashboard → My Activity.
**Expected:** Chronological list of own actions; shows action type, target, summary, timestamp.

### TC-MYACT-002 — My Activity shows only own actions
**Pre:** Multiple users have performed actions.
**Steps:** View My Activity.
**Expected:** Only the logged-in user's actions appear; no other users' actions visible.

### TC-MYACT-003 — My Activity real-time update
**Pre:** User performs an action.
**Steps:** Perform an action → navigate to My Activity.
**Expected:** The new action appears at top of list.

---

## 24. Navigation & Tab Bar

### TC-NAV-001 — Tab navigation persists state
**Pre:** User is on filtered inventory list.
**Steps:**
1. Switch to Requests tab.
2. Switch back to Inventory tab.
**Expected:** Inventory screen retains filter/scroll position.

### TC-NAV-002 — Back button works in nested screens
**Pre:** User navigated: Inventory → Item Detail → Edit Item.
**Steps:** Tap back button/gesture.
**Expected:** Returns to Item Detail; tapping back again returns to Inventory list.

### TC-NAV-003 — Deep navigation — Maintenance within Inventory
**Pre:** User on Inventory → Maintenance → Maintenance Detail.
**Steps:** Use back navigation.
**Expected:** Correctly navigates back through the stack without jumps or crashes.

### TC-NAV-004 — Modal screens (e.g., Update Password) dismiss correctly
**Pre:** Update Password modal open.
**Steps:**
1. Tap outside modal / tap Cancel.
**Expected:** Modal dismisses; returns to previous screen without losing state.

### TC-NAV-005 — Request number deep-link from notification (if applicable)
**Pre:** Push notification for a pending request.
**Steps:** Tap notification.
**Expected:** App opens and navigates directly to the specific request screen.

---

## 25. Real-Time Sync & Offline Behaviour

### TC-SYNC-001 — Real-time item update visible to all logged-in users
**Pre:** Two devices logged in; one as Admin, one as StoreIncharge.
**Steps:**
1. Admin creates a new item.
**Expected:** StoreIncharge's inventory list updates automatically within a few seconds.

### TC-SYNC-002 — Real-time request status update
**Pre:** SiteManager submitted request; StoreIncharge has queue open.
**Steps:**
1. SiteManager submits request.
**Expected:** StoreIncharge's request queue shows the new request within seconds.

### TC-SYNC-003 — App handles intermittent connectivity
**Pre:** Device connected.
**Steps:**
1. Turn off WiFi/data.
2. Try to perform an action (create item).
**Expected:** Informative error: "No internet connection"; action not silently lost.

### TC-SYNC-004 — App reconnects and syncs after connectivity restored
**Pre:** App was offline; connection restored.
**Steps:**
1. Restore connectivity.
2. Navigate to any data screen.
**Expected:** Data refreshes to show latest state without manual refresh.

### TC-SYNC-005 — Site count badge updates in real time
**Pre:** No pending high-priority requests.
**Steps:**
1. On another device, create high-priority request.
**Expected:** Badge count on Requests tab updates for Admin/StoreIncharge without page refresh.

---

## 26. Cross-Feature Business Rules

### TC-BIZ-001 — Receiving a PO increases Central Store inventory
**Pre:** Item "Cement" has 50 units; PO for 100 units approved and received.
**Steps:** Receive PO → check inventory.
**Expected:** Cement inventory = 150 in Central Store.

### TC-BIZ-002 — Transferring request decreases Central Store, increases site
**Pre:** Item "Drill" has 20 in Central Store; request for 5 approved and transferred to Site A.
**Steps:** Transfer → check inventory.
**Expected:** Central Store = 15; Site A = 5 (or +5 if pre-existing).

### TC-BIZ-003 — Returning items increases Central Store
**Pre:** 5 Drills at Site A returned in good condition.
**Steps:** Return items → check inventory.
**Expected:** Central Store increases by 5; Site A decreases by 5.

### TC-BIZ-004 — Items damaged on return and added to maintenance
**Pre:** 2 Drills returned as "Needs Maintenance".
**Steps:** Return → check Maintenance Dashboard.
**Expected:** Those 2 Drills appear in Maintenance (not added back to Central Store until returned from maintenance).

### TC-BIZ-005 — Write-off permanently reduces total quantity
**Pre:** Item "Mixer" total = 10; 2 in maintenance, 2 written off.
**Steps:** Write off 2 → check inventory.
**Expected:** Total = 8 (not 10); Written off count tracks separately.

### TC-BIZ-006 — Low-stock alert triggers correctly
**Pre:** Item minimum stock = 10; current stock = 11.
**Steps:**
1. Reduce stock to 10 (via adjustment or request transfer).
**Expected:** Item appears in low-stock widget on Dashboard; low-stock badge updates.

### TC-BIZ-007 — Request counter resets at new year
**Pre:** Last request of the year was REQ-2025-9999.
**Steps:** Submit first request of 2026.
**Expected:** New request number is REQ-2026-0001.

### TC-BIZ-008 — Consumable items show no Return option
**Pre:** Transferred request contains consumable items.
**Steps:** SiteManager opens transferred request → attempt return.
**Expected:** Consumable items excluded from return flow.

### TC-BIZ-009 — Non-consumable type cannot be changed after use
**Pre:** Non-consumable item has been transferred.
**Steps:** Try to edit item type.
**Expected:** Type field is read-only/disabled.

### TC-BIZ-010 — Rejected request remains in "Rejected" status
**Pre:** Request rejected by StoreIncharge.
**Steps:**
1. SiteManager views rejected request.
**Expected:** Status = "Rejected"; rejection reason and comments visible; no resubmit option (new request must be created).

---

## 27. Edge Cases & Negative Tests

### TC-EDGE-001 — Very long item name
**Pre:** Add Item screen.
**Steps:**
1. Enter 200-character name → Save.
**Expected:** Either: name accepted and displayed truncated, or validation error with max-length message.

### TC-EDGE-002 — Special characters in item name
**Pre:** Add Item screen.
**Steps:**
1. Enter name with special chars: `<script>alert(1)</script>` → Save.
**Expected:** Item saved with literal text (HTML not interpreted); no XSS vulnerability.

### TC-EDGE-003 — Very large quantity numbers
**Pre:** Adjust Quantity screen.
**Steps:**
1. Enter quantity 9999999 → Save.
**Expected:** Accepted (if within business limits) or error with max value message.

### TC-EDGE-004 — Simultaneous PO approval by two Admins
**Pre:** Two Admins open same pending PO simultaneously.
**Steps:**
1. Admin A approves PO.
2. Admin B also approves same PO simultaneously.
**Expected:** Only one approval processed; second Admin sees already-updated status; no duplicate approval.

### TC-EDGE-005 — Request with items out of stock at time of processing
**Pre:** Request pending for item with 5 units; between creation and processing, stock drops to 0.
**Steps:**
1. Process request → try to approve full qty.
**Expected:** Warning/error shown: "Insufficient stock"; StoreIncharge must approve partial qty or reject.

### TC-EDGE-006 — Delete category used by items
**Pre:** Category "Power Tools" has items linked.
**Steps:** Try to delete "Power Tools" category.
**Expected:** Error: "Cannot delete category with existing items".

### TC-EDGE-007 — SKU with spaces or special characters
**Pre:** Add Item screen.
**Steps:**
1. Enter SKU "DRL 001" (with space) → Save.
**Expected:** Either error: "SKU cannot contain spaces" or spaces auto-trimmed.

### TC-EDGE-008 — Vendor GSTIN format validation
**Pre:** Add Vendor screen.
**Steps:**
1. Enter invalid GSTIN "12345" → Save.
**Expected:** Validation error: "Invalid GSTIN format" (15-char alphanumeric required).

### TC-EDGE-009 — PO with zero quantity item
**Pre:** Create PO screen.
**Steps:**
1. Add item → enter quantity 0 → Submit.
**Expected:** Validation error: "Quantity must be at least 1".

### TC-EDGE-010 — Request submitted by SiteManager not assigned to any site
**Pre:** SiteManager user without a site assignment.
**Steps:**
1. Try to create a request.
**Expected:** Error or block: "No site assigned to your account. Contact Admin".

### TC-EDGE-011 — Upload oversized image
**Pre:** Add Item screen; image > 5MB.
**Steps:** Try to upload a 10MB image.
**Expected:** Error: "Image too large; maximum size is X MB".

### TC-EDGE-012 — Firebase offline: creating item
**Pre:** Device has no internet; logged-in state may be cached.
**Steps:**
1. Turn off internet → try to create item.
**Expected:** Clear error: "Unable to connect. Please check your internet connection."

### TC-EDGE-013 — Rapid repeated taps on Submit button
**Pre:** Create Request screen; form valid.
**Steps:**
1. Tap Submit button rapidly 5 times.
**Expected:** Only one request created; duplicate prevention in place (button disabled after first tap).

### TC-EDGE-014 — Logout during active operation
**Pre:** User is on Create Item form with partial data.
**Steps:**
1. Force logout from another device / session expires.
**Expected:** User redirected to Login; partial form data lost; no partial write to Firestore.

### TC-EDGE-015 — Navigate back on multi-step form
**Pre:** User on step 2 of Create Request.
**Steps:** Tap back button.
**Expected:** Navigates to step 1 or prompts "Discard changes?"; no unintended submission.

### TC-EDGE-016 — Activity log captures all required fields
**Pre:** Admin performs any CRUD action.
**Steps:** Check Activity Log entry.
**Expected:** Each entry has: userId, userName, userRole, actionType, actionCategory, targetType, targetId, targetDisplay, summary, timestamp.

### TC-EDGE-017 — Expired Firebase token mid-session
**Pre:** User logged in; Firebase token expires.
**Steps:**
1. Perform an action requiring auth (create item).
**Expected:** App automatically refreshes token and completes action, OR redirects to login gracefully without data loss error.

### TC-EDGE-018 — Two SiteManagers assigned to same site
**Pre:** Site A has Manager X.
**Steps:**
1. Admin assigns Manager Y to Site A as well (if system allows).
**Expected:** System either prevents duplicate assignment or handles gracefully (only one manager active).

### TC-EDGE-019 — Site with no inventory should show empty state
**Pre:** New site created with no inventory transfers.
**Steps:** SiteManager assigned to new site → Navigate to Inventory.
**Expected:** Empty state shown: "No items at this site yet" or similar message; no error/crash.

### TC-EDGE-020 — Request created for inactive site
**Pre:** Site A deactivated.
**Steps:**
1. SiteManager assigned to Site A tries to create request.
**Expected:** Error: "This site is inactive. Contact Admin." or site not selectable.

---

## Appendix A — Test Data Setup Checklist

Before starting manual testing, ensure the following data is in place:

- [ ] At least 4 user accounts: Admin, StoreIncharge, SiteManager (assigned), Unassigned
- [ ] At least 3 categories (e.g., Power Tools, Building Materials, Safety Equipment)
- [ ] At least 10 inventory items (mix of consumable and non-consumable, some weight-based)
- [ ] At least 2 active sites (Site A, Site B)
- [ ] SiteManager assigned to Site A
- [ ] At least 2 vendors
- [ ] At least 1 steel master record
- [ ] Some items with stock < minimum stock (to test low-stock alerts)
- [ ] At least 1 request in each status: Draft, Pending, Approved, Transferred, Partially Returned
- [ ] At least 1 PO in each status: Draft, Pending Approval, Approved, Received
- [ ] At least 1 maintenance record (Active) and 1 (History)

---

## Appendix B — Test Execution Tracker

| TC ID | Test Case Name | Role | Priority | Status | Notes |
|-------|----------------|------|----------|--------|-------|
| TC-AUTH-001 | Successful login | Any | High | | |
| TC-AUTH-008 | Successful signup | Any | High | | |
| TC-AUTH-013 | Logout | Any | High | | |
| TC-RBAC-001 | Admin tabs | Admin | High | | |
| TC-RBAC-002 | StoreIncharge tabs | StoreIncharge | High | | |
| TC-RBAC-003 | SiteManager tabs | SiteManager | High | | |
| TC-INV-009 | Create item | Admin | High | | |
| TC-INV-017 | View item detail | Admin | High | | |
| TC-REQ-004 | Create request | SiteManager | High | | |
| TC-REQ-006 | Save draft request | SiteManager | Medium | | |
| TC-PROC-005 | Approve request | StoreIncharge | High | | |
| TC-PROC-009 | Transfer items | StoreIncharge | High | | |
| TC-RET-001 | Full return | SiteManager | High | | |
| TC-RET-002 | Partial return | SiteManager | High | | |
| TC-PO-004 | Create PO | StoreIncharge | High | | |
| TC-APPO-002 | Approve PO | Admin | High | | |
| TC-RECV-001 | Receive PO | StoreIncharge | High | | |
| TC-MAINT-002 | Add to maintenance | StoreIncharge | High | | |
| TC-MAINT-RET-001 | Return from maintenance | StoreIncharge | High | | |
| TC-WRITEOFF-001 | Write off item | StoreIncharge | High | | |
| TC-SITES-002 | Create site | Admin | High | | |
| TC-USERS-002 | Assign role | Admin | High | | |
| TC-BIZ-001 | PO receipt updates inventory | StoreIncharge | High | | |
| TC-BIZ-002 | Transfer updates inventory | StoreIncharge | High | | |

---

*Total Test Cases: ~220+*
*Coverage: Authentication · RBAC · Dashboard · Inventory · Requests · Purchase Orders · Vendors · Maintenance · Sites · Users · Profile · Activity Log · Real-time Sync · Business Rules · Edge Cases*
