# Construction Inventory & Asset Management System (CIAMS)
## Comprehensive Product Specification Document v2.0

---

## Document Information

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Last Updated | January 2025 |
| Status | Final |
| Platform | iOS & Android (React Native/Expo) |
| Backend | Firebase (Firestore + Cloud Functions) |

---

## Table of Contents

1. Executive Summary
2. User Roles & Permissions
3. Module 1: Authentication & User Management
4. Module 2: Site Management
5. Module 3: Inventory Management
6. Module 4: Request Management
7. Module 5: Purchase Order Management
8. Module 6: Maintenance Management
9. Module 7: Activity Logging & Audit Trail
10. Module 8: Dashboard & Notifications
11. Technical Architecture
12. Firebase Data Models
13. API Endpoints (Cloud Functions)
14. Security & Performance
15. Development Phases

---

## 1. Executive Summary

### 1.1 Product Overview

**Product Name:** CIAMS (Construction Inventory & Asset Management System)

**Purpose:** An internal mobile application for a construction company to manage inventory flow between a central warehouse (store) and multiple construction sites, with complete tracking, purchase order management, maintenance tracking, and audit trails.

**Target Users:**
- **Admin** - Company management/owner with full system control
- **Store Incharge** - Warehouse manager handling central inventory
- **Site Managers** - On-site supervisors managing site-specific inventory

### 1.2 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React Native (Expo) |
| Backend | Firebase Cloud Functions |
| Database | Cloud Firestore |
| Authentication | Firebase Auth |
| File Storage | Firebase Cloud Storage |
| Notifications | Firebase Cloud Messaging (FCM) |

### 1.3 Key Features Summary

- Multi-location inventory management (Central Store + Multiple Sites)
- Item categorization (Consumable / Non-Consumable)
- Request workflow with priority levels (High/Medium/Low)
- **No partial fulfillment** - requests wait until full stock available
- Purchase Order management with PDF generation
- Maintenance module for damaged items
- Vendor management (save and reuse)
- Complete audit trail (immutable logs)
- Role-based access control

### 1.4 Key Business Rules (Updated)

1. **Site Managers CANNOT see central store inventory** - only their site inventory
2. **Admin can create POs** - has complete control over everything
3. **Admin creates users with temp passwords** - communicates to users manually
4. **No prices stored on items** - prices only in POs (manually entered)
5. **No return due dates** - returns happen when work is complete
6. **No partial fulfillment** - if 3 drills requested but only 2 available, request stays pending
7. **Stock alerts trigger at minimum level** - not at zero
8. **Store Incharge can edit ANY request** - full edit capability
9. **Request priority: High/Medium/Low** - affects queue sorting
10. **Maintenance module** - for damaged items, separate from main inventory
11. **PO prices manually entered** - per item in each PO
12. **Vendor list saved** - for reuse in future POs
13. **No budget checks** - Admin approves POs at discretion
14. **PO receipt directly updates inventory** - seamless flow

---

## 2. User Roles & Permissions Matrix

| Feature | Admin | Store Incharge | Site Manager |
|---------|-------|----------------|--------------|
| **User Management** |
| Create/Edit/Disable Users | ✅ | ❌ | ❌ |
| View All Users | ✅ | ❌ | ❌ |
| **Site Management** |
| Create/Edit Sites | ✅ | ❌ | ❌ |
| View All Sites | ✅ | ✅ | ✅ (names only) |
| **Inventory - Central Store** |
| View Central Inventory | ✅ | ✅ | ❌ |
| Add/Edit Items | ✅ | ✅ | ❌ |
| Adjust Quantities | ✅ | ✅ | ❌ |
| **Inventory - Sites** |
| View Own Site Inventory | ✅ (all) | ✅ (all) | ✅ (own only) |
| View Other Sites Inventory | ✅ | ✅ | ✅ (read-only) |
| **Requests** |
| Create Request | ❌ | ❌ | ✅ |
| View All Requests | ✅ | ✅ | ✅ (own only) |
| Approve/Reject Request | ✅ | ✅ | ❌ |
| Edit Any Request | ✅ | ✅ | ❌ |
| **Purchase Orders** |
| Create PO | ✅ | ✅ | ❌ |
| Approve/Reject PO | ✅ | ❌ | ❌ |
| Mark PO Received | ✅ | ✅ | ❌ |
| View All POs | ✅ | ✅ | ❌ |
| **Maintenance** |
| Add Items to Maintenance | ✅ | ✅ | ❌ |
| Return from Maintenance | ✅ | ✅ | ❌ |
| View Maintenance Items | ✅ | ✅ | ❌ |
| **Vendors** |
| Add/Edit Vendors | ✅ | ✅ | ❌ |
| View Vendors | ✅ | ✅ | ❌ |
| **Logs & Audit** |
| View Complete Activity Logs | ✅ | ❌ | ❌ |
| View Own Activity | ✅ | ✅ | ✅ |

---

## 3. Module 1: Authentication & User Management

### 3.1 Feature Description

Secure authentication with role-based access. **Only Admin can create users** - no self-registration. Admin sets temporary password and communicates it to users manually (phone/in-person). Users can change password after first login.

### 3.2 User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-1.1 | As an **Admin**, I want to create user accounts with temporary passwords so that I can onboard employees | High |
| US-1.2 | As an **Admin**, I want to assign roles and sites to users so that they have appropriate access | High |
| US-1.3 | As a **User**, I want to log in with email and password so that I can access the system | High |
| US-1.4 | As a **User**, I want to change my password so that I can set a secure personal password | High |
| US-1.5 | As an **Admin**, I want to enable/disable user accounts so that I can control access | High |

### 3.3 Screen: Login

```
┌─────────────────────────────────┐
│                                 │
│         🏗️ CIAMS                │
│   Construction Inventory        │
│      Management System          │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Email                     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Password            👁️    │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │        LOGIN              │  │
│  └───────────────────────────┘  │
│                                 │
│       Forgot Password?          │
│                                 │
│  Version 1.0.0                  │
└─────────────────────────────────┘
```

### 3.4 Screen: User Management (Admin Only)

```
┌─────────────────────────────────┐
│ ← User Management         [+]  │
├─────────────────────────────────┤
│ 🔍 Search users...              │
├─────────────────────────────────┤
│ Filter: [All Roles ▼] [Status ▼]│
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 👤 Rajesh Kumar             │ │
│ │ Store Incharge              │ │
│ │ 🟢 Active                   │ │
│ │ Last login: Today, 9:00 AM  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 👤 Amit Singh               │ │
│ │ Site Manager • Site A       │ │
│ │ 🟢 Active                   │ │
│ │ Last login: Yesterday       │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 👤 Priya Sharma             │ │
│ │ Site Manager • Site B       │ │
│ │ 🔴 Disabled                 │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Total: 12 | Active: 10         │
└─────────────────────────────────┘
```

### 3.5 Screen: Add/Edit User

```
┌─────────────────────────────────┐
│ ← Add New User          [Save] │
├─────────────────────────────────┤
│                                 │
│ Full Name *                     │
│ ┌───────────────────────────┐   │
│ │                           │   │
│ └───────────────────────────┘   │
│                                 │
│ Email *                         │
│ ┌───────────────────────────┐   │
│ │                           │   │
│ └───────────────────────────┘   │
│                                 │
│ Phone Number *                  │
│ ┌───────────────────────────┐   │
│ │ +91                       │   │
│ └───────────────────────────┘   │
│                                 │
│ Temporary Password *            │
│ ┌───────────────────────────┐   │
│ │ ••••••••            👁️    │   │
│ └───────────────────────────┘   │
│ ℹ️ Share this with the user     │
│                                 │
│ Role *                          │
│ ○ Store Incharge                │
│ ○ Site Manager                  │
│                                 │
│ Assign to Site * (if Site Mgr)  │
│ ┌───────────────────────────┐   │
│ │ Select Site            ▼  │   │
│ └───────────────────────────┘   │
│                                 │
│ Status                          │
│ [🟢 Active] [🔴 Disabled]       │
│                                 │
│ ┌───────────────────────────┐   │
│ │      CREATE USER          │   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

### 3.6 Acceptance Criteria

**AC-1.1: User Creation**
- Admin can create users with unique email
- Temporary password minimum 8 characters
- Role selection mandatory
- Site assignment mandatory for Site Manager role
- System validates email format and uniqueness

**AC-1.2: User Login**
- Users login with email and password
- Failed login shows generic error (security)
- Account locks after 5 failed attempts for 15 minutes
- Session persists until logout or 30 days

**AC-1.3: Password Change**
- All users can change their own password
- Current password verification required
- New password minimum 8 characters

**AC-1.4: User Disable**
- Disabled users cannot log in
- Existing sessions invalidated
- User data preserved
- Can be re-enabled anytime

---

## 4. Module 2: Site Management

### 4.1 Feature Description

Admin creates and manages construction sites. Sites must exist before Site Managers can be assigned. Each site has its own inventory (populated via fulfilled requests).

### 4.2 User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-2.1 | As an **Admin**, I want to create sites before assigning managers | High |
| US-2.2 | As an **Admin**, I want to edit site details as projects evolve | Medium |
| US-2.3 | As an **Admin**, I want to mark sites inactive when projects complete | Medium |

### 4.3 Screen: Site Management

```
┌─────────────────────────────────┐
│ ← Site Management         [+]  │
├─────────────────────────────────┤
│ 🔍 Search sites...              │
├─────────────────────────────────┤
│ ACTIVE SITES (5)               │
│ ┌─────────────────────────────┐ │
│ │ 🏗️ Site A - Greenfield      │ │
│ │ Manager: Amit Singh         │ │
│ │ Location: MG Road, Bangalore│ │
│ │ Items: 45                   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🏗️ Site B - Highway Project │ │
│ │ Manager: Vikram Patel       │ │
│ │ Location: NH44, Hyderabad   │ │
│ │ Items: 32                   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🏗️ Site C - Metro Station   │ │
│ │ Manager: Not Assigned       │ │
│ │ Location: Whitefield        │ │
│ │ Items: 0                    │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ INACTIVE SITES (2)         [>] │
└─────────────────────────────────┘
```

### 4.4 Screen: Add/Edit Site

```
┌─────────────────────────────────┐
│ ← Add New Site          [Save] │
├─────────────────────────────────┤
│                                 │
│ Site Name *                     │
│ ┌───────────────────────────┐   │
│ │ Site A - Greenfield       │   │
│ └───────────────────────────┘   │
│                                 │
│ Project Description             │
│ ┌───────────────────────────┐   │
│ │ Residential complex       │   │
│ │ construction - Phase 1    │   │
│ └───────────────────────────┘   │
│                                 │
│ Location/Address *              │
│ ┌───────────────────────────┐   │
│ │ 123 MG Road, Bangalore    │   │
│ └───────────────────────────┘   │
│                                 │
│ Contact Number                  │
│ ┌───────────────────────────┐   │
│ │ +91-9876543210            │   │
│ └───────────────────────────┘   │
│                                 │
│ Site Manager (Optional)         │
│ ┌───────────────────────────┐   │
│ │ Select Manager         ▼  │   │
│ └───────────────────────────┘   │
│ ℹ️ Can be assigned later        │
│                                 │
│ Status                          │
│ [🟢 Active] [🔴 Inactive]       │
│                                 │
└─────────────────────────────────┘
```

### 4.5 Acceptance Criteria

**AC-2.1: Site Creation**
- Site name and location mandatory
- Site name must be unique
- Site can be created without manager
- New sites start with empty inventory

**AC-2.2: Site Assignment**
- Site Manager can only be assigned to one site
- When reassigning, removed from previous site

**AC-2.3: Site Status**
- Inactive sites don't appear in request dropdowns
- Inventory preserved when inactive
- Can be reactivated

---

## 5. Module 3: Inventory Management

### 5.1 Feature Description

Two-tier inventory system:
1. **Central Store Inventory** - Main warehouse (Admin & Store Incharge only)
2. **Site Inventories** - Per-site inventory (populated via fulfilled requests)

**Item Types:**
- **Consumable** - Single use, cannot be returned (cement, nails)
- **Non-Consumable** - Returnable (drills, scaffolding)

**Key Rules:**
- **Site Managers CANNOT see central store inventory**
- Site Managers CAN see other sites' inventory (read-only)
- **No prices stored on items** (prices only in POs)
- **No return due dates** (returns happen when work complete)
- Stock alerts at minimum level threshold

### 5.2 User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-3.1 | As a **Store Incharge**, I want to add items with details and images | High |
| US-3.2 | As a **Store Incharge**, I want to categorize items as consumable/non-consumable | High |
| US-3.3 | As a **Store Incharge**, I want to set minimum stock levels for alerts | High |
| US-3.4 | As a **Store Incharge**, I want to adjust quantities with mandatory reason | High |
| US-3.5 | As a **Site Manager**, I want to view my site's inventory | High |
| US-3.6 | As a **Site Manager**, I want to view other sites' inventory (read-only) | High |
| US-3.7 | As a **Store Incharge**, I want low stock alerts to raise POs proactively | Medium |

### 5.3 Screen: Central Store Inventory (Store Incharge/Admin)

```
┌─────────────────────────────────┐
│ 🏭 Central Store Inventory [+] │
├─────────────────────────────────┤
│ 🔍 Search items...              │
├─────────────────────────────────┤
│ Category: [All ▼]               │
│ Type: [All] [Consumable]        │
│       [Non-Consumable]          │
│ Stock: [All] [Low Stock ⚠️]     │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [IMG] Power Drill (Bosch)   │ │
│ │ SKU: PWR-DRL-001            │ │
│ │ Type: Non-Consumable        │ │
│ │ ───────────────────────     │ │
│ │ Total: 15 | Available: 10   │ │
│ │ At Sites: 3 | Maintenance: 2│ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Cement Bags (50kg)    │ │
│ │ SKU: CEM-50KG-001           │ │
│ │ Type: Consumable            │ │
│ │ ───────────────────────     │ │
│ │ Available: 30               │ │
│ │ ⚠️ Low Stock (Min: 50)       │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Total: 156 items | Low: 8 ⚠️    │
└─────────────────────────────────┘
```

### 5.4 Screen: Add/Edit Item

```
┌─────────────────────────────────┐
│ ← Add New Item          [Save] │
├─────────────────────────────────┤
│ ┌───────────────────────────┐   │
│ │      [+ Add Image]        │   │
│ └───────────────────────────┘   │
│                                 │
│ Item Name *                     │
│ ┌───────────────────────────┐   │
│ │ Power Drill (Bosch)       │   │
│ └───────────────────────────┘   │
│                                 │
│ SKU / Item Code *               │
│ ┌───────────────────────────┐   │
│ │ PWR-DRL-001               │   │
│ └───────────────────────────┘   │
│                                 │
│ Description                     │
│ ┌───────────────────────────┐   │
│ │ Bosch 750W impact drill   │   │
│ └───────────────────────────┘   │
│                                 │
│ Category *                      │
│ ┌───────────────────────────┐   │
│ │ Power Tools            ▼  │   │
│ └───────────────────────────┘   │
│ [+ Add New Category]            │
│                                 │
│ Item Type *                     │
│ ● Non-Consumable (Returnable)   │
│ ○ Consumable (Single use)       │
│                                 │
│ Unit of Measurement *           │
│ ┌───────────────────────────┐   │
│ │ Piece                  ▼  │   │
│ └───────────────────────────┘   │
│                                 │
│ Initial Quantity *              │
│ ┌───────────────────────────┐   │
│ │ 15                        │   │
│ └───────────────────────────┘   │
│                                 │
│ Minimum Stock Level *           │
│ ┌───────────────────────────┐   │
│ │ 5                         │   │
│ └───────────────────────────┘   │
│ ℹ️ Alert when stock falls below │
│                                 │
│ Status                          │
│ [🟢 Active] [🔴 Discontinued]   │
│                                 │
└─────────────────────────────────┘
```

**Note: NO PRICE FIELD** - Prices are only entered in POs

### 5.5 Screen: Item Detail

```
┌─────────────────────────────────┐
│ ← Power Drill (Bosch)   [Edit] │
├─────────────────────────────────┤
│ ┌───────────────────────────┐   │
│ │       [Item Image]        │   │
│ └───────────────────────────┘   │
│                                 │
│ SKU: PWR-DRL-001                │
│ Type: Non-Consumable            │
│ Category: Power Tools           │
│ Unit: Piece                     │
├─────────────────────────────────┤
│ 📊 STOCK DISTRIBUTION           │
│ ┌─────────────────────────────┐ │
│ │ Total Quantity      │  15  │ │
│ │ ─────────────────────────── │ │
│ │ Central Store       │  10  │ │
│ │ Site A              │   2  │ │
│ │ Site B              │   1  │ │
│ │ In Maintenance      │   2  │ │
│ └─────────────────────────────┘ │
│                                 │
│ Min Stock Level: 5              │
│ Status: 🟢 Adequate Stock       │
├─────────────────────────────────┤
│ 📜 RECENT ACTIVITY              │
│ • Transferred 2 to Site A       │
│   Jan 15 - Rajesh               │
│ • Added 5 from PO-0012          │
│   Jan 10 - Rajesh               │
│                                 │
│ [View Full History]             │
├─────────────────────────────────┤
│ [Adjust Quantity] [Maintenance] │
└─────────────────────────────────┘
```

### 5.6 Screen: Quantity Adjustment

```
┌─────────────────────────────────┐
│ ← Adjust Quantity              │
├─────────────────────────────────┤
│                                 │
│ Item: Power Drill (Bosch)       │
│ Current Quantity: 10            │
├─────────────────────────────────┤
│                                 │
│ Adjustment Type *               │
│ ○ Add Stock                     │
│ ● Remove Stock                  │
│                                 │
│ Quantity *                      │
│ ┌───────────────────────────┐   │
│ │ 2                         │   │
│ └───────────────────────────┘   │
│                                 │
│ New Quantity: 8                 │
│                                 │
│ Reason for Adjustment *         │
│ ┌───────────────────────────┐   │
│ │ Select Reason          ▼  │   │
│ └───────────────────────────┘   │
│ • Physical Count Correction     │
│ • Lost/Stolen                   │
│ • Other                         │
│                                 │
│ Additional Notes *              │
│ ┌───────────────────────────┐   │
│ │ Found 2 items missing     │   │
│ │ during physical check     │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌───────────────────────────┐   │
│ │     CONFIRM ADJUSTMENT    │   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

### 5.7 Screen: Site Manager - My Inventory

```
┌─────────────────────────────────┐
│ 🏗️ My Inventory - Site A       │
├─────────────────────────────────┤
│ 🔍 Search items...              │
├─────────────────────────────────┤
│ MY ITEMS (45)                   │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Power Drill (Bosch)   │ │
│ │ Quantity: 2                 │ │
│ │ Type: Non-Consumable        │ │
│ │ Received: Jan 15, 2025      │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Cement Bags (50kg)    │ │
│ │ Quantity: 25                │ │
│ │ Type: Consumable            │ │
│ │ Received: Jan 12, 2025      │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ACTIONS                        │
│ [New Request] [Return Items]   │
├─────────────────────────────────┤
│ VIEW OTHER SITES               │
│ ┌─────────────────────────────┐ │
│ │ Site B - 32 items       [>] │ │
│ │ Site C - 18 items       [>] │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Note: NO "View Central Store" option** - Site Managers cannot see central inventory

### 5.8 Screen: Other Site Inventory (Read-Only)

```
┌─────────────────────────────────┐
│ ← Site B Inventory   🔒Read-only│
├─────────────────────────────────┤
│ Manager: Vikram Patel           │
│ Contact: +91-9876543210         │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [IMG] Concrete Mixer        │ │
│ │ Quantity: 1                 │ │
│ │ Type: Non-Consumable        │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Scaffolding Set       │ │
│ │ Quantity: 3                 │ │
│ │ Type: Non-Consumable        │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ┌───────────────────────────┐   │
│ │ ℹ️ Need these items?        │   │
│ │ Contact Store Incharge to  │   │
│ │ coordinate transfer.       │   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

### 5.9 Acceptance Criteria

**AC-3.1: Item Management**
- Item name and SKU mandatory and unique
- Item type cannot change after first transaction
- **No price field on items**
- Image optional but recommended

**AC-3.2: Inventory Visibility**
- Store Incharge: sees central inventory
- **Site Manager: CANNOT see central store**
- Site Manager: sees own site + other sites (read-only)
- Admin: sees everything

**AC-3.3: Stock Tracking (Non-Consumable)**
- Total = Central + Sites + Maintenance
- Shows distribution across locations

**AC-3.4: Stock Tracking (Consumable)**
- Once transferred, considered "consumed"
- No return expected

**AC-3.5: Low Stock Alerts**
- Triggers when available ≤ minimum level
- **Not when reaches zero** (proactive alerts)
- Visible on dashboard and inventory list

**AC-3.6: Quantity Adjustment**
- Reason mandatory
- Notes mandatory
- Logged with before/after values
- Cannot go negative

---

## 6. Module 4: Request Management

### 6.1 Feature Description

Site Managers request items from Central Store. Store Incharge processes requests.

**Key Business Rules:**
- Only Site Managers create requests
- **NO PARTIAL FULFILLMENT** - if 3 drills needed but only 2 available, request stays pending until all items available
- Store Incharge can **EDIT ANY REQUEST** (quantities, items, priority)
- Store Incharge can approve or reject with reasons
- **Three priority levels: High, Medium, Low**
- **No return due dates** - returns happen when work complete

### 6.2 Request Status Flow

```
DRAFT ──► PENDING ──► APPROVED ──► TRANSFERRED ──► RETURNED
              │                                   (non-cons)
              ▼
          REJECTED
              
          CANCELLED (by Site Manager before processing)
```

### 6.3 User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-4.1 | As a **Site Manager**, I want to create requests with priority | High |
| US-4.2 | As a **Store Incharge**, I want to see requests sorted by priority | High |
| US-4.3 | As a **Store Incharge**, I want to approve only when ALL items available | High |
| US-4.4 | As a **Store Incharge**, I want to reject with reason | High |
| US-4.5 | As a **Store Incharge**, I want to edit ANY request | High |
| US-4.6 | As a **Site Manager**, I want to return non-consumable items | High |

### 6.4 Screen: Create Request (Site Manager)

```
┌─────────────────────────────────┐
│ ← New Request           [Send] │
├─────────────────────────────────┤
│ Request for: Site A            │
│ Date: Jan 20, 2025             │
├─────────────────────────────────┤
│ PRIORITY *                     │
│ [🔴 High] [🟡 Medium] [🟢 Low] │
├─────────────────────────────────┤
│ ITEMS                   [+ Add]│
│ ┌─────────────────────────────┐ │
│ │ [IMG] Power Drill (Bosch)   │ │
│ │ Type: Non-Consumable        │ │
│ │ Quantity: [-]  3  [+]  [🗑️] │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Cement Bags (50kg)    │ │
│ │ Type: Consumable            │ │
│ │ Quantity: [-]  25  [+] [🗑️] │ │
│ └─────────────────────────────┘ │
│                                │
│ [+ Add More Items]             │
├─────────────────────────────────┤
│ Purpose / Notes                │
│ ┌───────────────────────────┐  │
│ │ Foundation work starting  │  │
│ │ next week. Need drills.   │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ [Save Draft]  [Submit Request] │
└─────────────────────────────────┘
```

**Note: Site Manager does NOT see available quantities** - they just request what they need

### 6.5 Screen: Request Queue (Store Incharge)

```
┌─────────────────────────────────┐
│ 📋 Request Queue        [Filter]│
├─────────────────────────────────┤
│ Filter: [All Sites ▼]          │
│         [All Status ▼]         │
├─────────────────────────────────┤
│ 🔴 HIGH PRIORITY (2)            │
│ ┌─────────────────────────────┐ │
│ │ REQ-2025-0045     🔴 High   │ │
│ │ Site A - Amit Singh         │ │
│ │ 3 items | Jan 20, 2:30 PM   │ │
│ │ ⚠️ 1 item insufficient   [>] │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ REQ-2025-0043     🔴 High   │ │
│ │ Site C - Priya Sharma       │ │
│ │ 2 items | Jan 20, 11:00 AM  │ │
│ │ ✅ All items available   [>] │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 🟡 MEDIUM PRIORITY (3)      [>] │
├─────────────────────────────────┤
│ 🟢 LOW PRIORITY (5)         [>] │
├─────────────────────────────────┤
│ PROCESSED TODAY (8)         [>] │
└─────────────────────────────────┘
```

### 6.6 Screen: Process Request (Store Incharge)

```
┌─────────────────────────────────┐
│ ← REQ-2025-0045         [Edit] │
├─────────────────────────────────┤
│ 🔴 HIGH PRIORITY                │
│ Site A - Amit Singh            │
│ Submitted: Jan 20, 2:30 PM     │
│ Status: ⏳ PENDING              │
├─────────────────────────────────┤
│ Purpose:                       │
│ "Foundation work starting..."  │
├─────────────────────────────────┤
│ ITEMS REQUESTED                │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Power Drill (Bosch)   │ │
│ │ Requested: 3                │ │
│ │ Available: 10               │ │
│ │ ✅ Sufficient                │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Cement Bags (50kg)    │ │
│ │ Requested: 25               │ │
│ │ Available: 20               │ │
│ │ ❌ Insufficient (need 25)    │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ⚠️ CANNOT APPROVE               │
│ One or more items insufficient │
│                                │
│ Options:                       │
│ • Wait for PO (ETA: Jan 25)   │
│ • Edit request to reduce qty  │
│ • Reject with reason          │
├─────────────────────────────────┤
│ [Edit Request]                 │
│ [Reject with Reason]           │
│ [Approve] ← DISABLED           │
└─────────────────────────────────┘
```

### 6.7 Screen: Edit Request (Store Incharge)

```
┌─────────────────────────────────┐
│ ← Edit REQ-2025-0045    [Save] │
├─────────────────────────────────┤
│ Site A - Amit Singh            │
├─────────────────────────────────┤
│ PRIORITY                       │
│ [🔴 High] [🟡 Medium] [🟢 Low] │
├─────────────────────────────────┤
│ ITEMS                   [+ Add]│
│ ┌─────────────────────────────┐ │
│ │ [IMG] Power Drill (Bosch)   │ │
│ │ Original: 3 → New: 3        │ │
│ │ Available: 10          [🗑️] │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Cement Bags (50kg)    │ │
│ │ Original: 25 → New: 20      │ │
│ │ ⚠️ Reduced to available  [🗑️] │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Edit Reason *                  │
│ ┌───────────────────────────┐  │
│ │ Reduced cement to 20 due  │  │
│ │ to stock. Rest after PO.  │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ [Cancel]         [Save Changes]│
└─────────────────────────────────┘
```

### 6.8 Screen: Reject Request

```
┌─────────────────────────────────┐
│ ← Reject Request               │
├─────────────────────────────────┤
│ Request: REQ-2025-0045         │
│ Site: Site A                   │
├─────────────────────────────────┤
│ Rejection Reason *             │
│ ┌───────────────────────────┐  │
│ │ Select Reason          ▼  │  │
│ └───────────────────────────┘  │
│ • Insufficient Stock           │
│ • Duplicate Request            │
│ • Items Not Required           │
│ • Other                        │
│                                │
│ Additional Comments *          │
│ ┌───────────────────────────┐  │
│ │ Stock reserved for Site B │  │
│ │ urgent requirement.       │  │
│ └───────────────────────────┘  │
│                                │
│ ┌───────────────────────────┐  │
│ │     CONFIRM REJECTION     │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 6.9 Screen: Confirm Transfer

```
┌─────────────────────────────────┐
│ ← Confirm Transfer             │
├─────────────────────────────────┤
│ Request: REQ-2025-0043         │
│ Site: Site C                   │
│ Status: ✅ APPROVED             │
├─────────────────────────────────┤
│ ITEMS TO TRANSFER              │
│ ┌─────────────────────────────┐ │
│ │ ☑️ Safety Helmets      × 10  │ │
│ │ ☑️ Safety Vests        × 10  │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Received By                    │
│ ┌───────────────────────────┐  │
│ │ Priya Sharma              │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ ⚠️ This will update inventory:  │
│ • Central Store decreases      │
│ • Site C inventory increases   │
│                                │
│ ┌───────────────────────────┐  │
│ │    CONFIRM TRANSFER       │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 6.10 Screen: Return Items (Site Manager)

```
┌─────────────────────────────────┐
│ ← Return Items          [Submit│
├─────────────────────────────────┤
│ Returning to: Central Store    │
├─────────────────────────────────┤
│ SELECT ITEMS (Non-Consumable)  │
│ ┌─────────────────────────────┐ │
│ │ ☑️ Power Drill (Bosch)       │ │
│ │ At Site: 2                  │ │
│ │ Return Qty: [-]  2  [+]     │ │
│ │                             │ │
│ │ Condition *                 │ │
│ │ ○ Good - Working            │ │
│ │ ○ Needs Maintenance         │ │
│ │ ○ Damaged                   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Return Notes                   │
│ ┌───────────────────────────┐  │
│ │ Foundation work complete  │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ ┌───────────────────────────┐  │
│ │     SUBMIT RETURN         │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Note: NO return due date field** - returns happen when work is complete

### 6.11 Acceptance Criteria

**AC-4.1: Request Creation**
- Site Manager creates requests for their site only
- Priority mandatory (High/Medium/Low)
- At least one item required

**AC-4.2: No Partial Fulfillment**
- **Approve button disabled until ALL items have sufficient stock**
- Clear indication of which items are insufficient
- Request stays pending until stock available or edited

**AC-4.3: Request Editing**
- Store Incharge can edit ANY request (any status except rejected/cancelled)
- Can change quantities, add/remove items, change priority
- Edit reason mandatory
- All edits logged

**AC-4.4: Approval**
- Only possible when ALL items sufficient
- Items reserved on approval

**AC-4.5: Transfer**
- Confirms physical handover
- Updates inventories atomically
- Notification to Site Manager

**AC-4.6: Rejection**
- Reason mandatory
- Comments mandatory
- Notification to Site Manager

**AC-4.7: Return**
- Only non-consumable items
- Condition selection required
- Items marked "needs maintenance" or "damaged" go to maintenance
- **No return due date** - returns when work complete

---

## 7. Module 5: Purchase Order Management

### 7.1 Feature Description

PO lifecycle for restocking central inventory.

**Key Business Rules:**
- **Both Store Incharge AND Admin can create POs**
- **Only Admin can approve/reject POs**
- **No budget checks** - Admin uses discretion
- **Prices manually entered** per item in PO
- **Vendors can be saved** for reuse
- PO generates PDF
- **On receipt, inventory updates directly from PO**

### 7.2 PO Status Flow

```
DRAFT ──► PENDING ──► APPROVED ──► ORDERED ──► RECEIVED
          APPROVAL       │                    (inventory
              │          │                     updated)
              ▼          │
          REJECTED       │
                         │
                    (marked as ordered,
                     awaiting delivery)
```

### 7.3 User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-5.1 | As a **Store Incharge**, I want to create POs when stock low | High |
| US-5.2 | As an **Admin**, I want to create POs directly | High |
| US-5.3 | As a **Store Incharge**, I want to enter prices per item manually | High |
| US-5.4 | As a **Store Incharge**, I want to save vendors for reuse | High |
| US-5.5 | As an **Admin**, I want to approve/reject POs at my discretion | High |
| US-5.6 | As a **Store Incharge**, I want to mark PO received and update inventory | High |

### 7.4 Screen: Create PO

```
┌─────────────────────────────────┐
│ ← New Purchase Order    [Save] │
├─────────────────────────────────┤
│ PO Number: PO-2025-0019 (Auto) │
│ Date: Jan 20, 2025             │
├─────────────────────────────────┤
│ VENDOR                         │
│ ┌───────────────────────────┐  │
│ │ Select Saved Vendor    ▼  │  │
│ └───────────────────────────┘  │
│ [+ Add New Vendor]             │
│                                │
│ ─── OR Enter Manually ───      │
│                                │
│ Vendor Name *                  │
│ ┌───────────────────────────┐  │
│ │ ABC Building Supplies     │  │
│ └───────────────────────────┘  │
│                                │
│ Contact Number                 │
│ ┌───────────────────────────┐  │
│ │ +91-9876543210            │  │
│ └───────────────────────────┘  │
│                                │
│ ☑️ Save this vendor for future │
├─────────────────────────────────┤
│ ITEMS                   [+ Add]│
│ ┌─────────────────────────────┐ │
│ │ Cement Bags (50kg)          │ │
│ │ SKU: CEM-50KG-001           │ │
│ │ ───────────────────────     │ │
│ │ Quantity: [-] 100 [+]       │ │
│ │ Unit Price: ₹ [350]         │ │
│ │ Amount: ₹35,000        [🗑️] │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Power Drill (Bosch)         │ │
│ │ SKU: PWR-DRL-001            │ │
│ │ ───────────────────────     │ │
│ │ Quantity: [-] 5 [+]         │ │
│ │ Unit Price: ₹ [6,500]       │ │
│ │ Amount: ₹32,500        [🗑️] │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ SUMMARY                        │
│ Subtotal:          ₹67,500     │
│ GST (18%):         ₹12,150     │
│ Total:             ₹79,650     │
├─────────────────────────────────┤
│ Justification *                │
│ ┌───────────────────────────┐  │
│ │ Cement stock below min.   │  │
│ │ Multiple pending requests │  │
│ └───────────────────────────┘  │
│                                │
│ Expected Delivery              │
│ ┌───────────────────────────┐  │
│ │ Jan 25, 2025          📅  │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ [Save Draft] [Submit for Approval]│
└─────────────────────────────────┘
```

**Note: Prices are manually entered per item** - no system-stored prices

### 7.5 Screen: Vendor Management

```
┌─────────────────────────────────┐
│ ← Saved Vendors           [+]  │
├─────────────────────────────────┤
│ 🔍 Search vendors...            │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ ABC Building Supplies       │ │
│ │ Building Materials          │ │
│ │ 📞 +91-9876543210           │ │
│ │ POs: 12 | Last: Jan 15  [>] │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ XYZ Power Tools             │ │
│ │ Tools & Equipment           │ │
│ │ 📞 +91-9123456780           │ │
│ │ POs: 5 | Last: Dec 20   [>] │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Total Vendors: 15              │
└─────────────────────────────────┘
```

### 7.6 Screen: Add Vendor

```
┌─────────────────────────────────┐
│ ← Add Vendor            [Save] │
├─────────────────────────────────┤
│ Vendor Name *                  │
│ ┌───────────────────────────┐  │
│ │                           │  │
│ └───────────────────────────┘  │
│                                │
│ Contact Person                 │
│ ┌───────────────────────────┐  │
│ │                           │  │
│ └───────────────────────────┘  │
│                                │
│ Phone Number *                 │
│ ┌───────────────────────────┐  │
│ │ +91-                      │  │
│ └───────────────────────────┘  │
│                                │
│ Email                          │
│ ┌───────────────────────────┐  │
│ │                           │  │
│ └───────────────────────────┘  │
│                                │
│ Address                        │
│ ┌───────────────────────────┐  │
│ │                           │  │
│ └───────────────────────────┘  │
│                                │
│ GSTIN (Optional)               │
│ ┌───────────────────────────┐  │
│ │                           │  │
│ └───────────────────────────┘  │
│                                │
│ Category                       │
│ ┌───────────────────────────┐  │
│ │ Select Category        ▼  │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 7.7 Screen: Admin PO Approval

```
┌─────────────────────────────────┐
│ ← Review PO-2025-0018          │
├─────────────────────────────────┤
│ Submitted by: Rajesh Kumar     │
│ Date: Jan 20, 2025             │
│ Status: ⏳ PENDING APPROVAL     │
├─────────────────────────────────┤
│ VENDOR                         │
│ ABC Building Supplies          │
│ 📞 +91-9876543210              │
├─────────────────────────────────┤
│ ITEMS                          │
│ ┌─────────────────────────────┐ │
│ │ Cement Bags (50kg)          │ │
│ │ 100 × ₹350 = ₹35,000       │ │
│ │ Current Stock: 30 (Low ⚠️)   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Power Drill (Bosch)         │ │
│ │ 5 × ₹6,500 = ₹32,500       │ │
│ │ Current Stock: 10           │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Total:             ₹79,650     │
├─────────────────────────────────┤
│ Justification:                 │
│ "Cement stock below minimum.   │
│ Multiple pending requests."    │
├─────────────────────────────────┤
│ Comments (Optional)            │
│ ┌───────────────────────────┐  │
│ │ Negotiate for discount    │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ [Reject]            [Approve]  │
└─────────────────────────────────┘
```

**Note: No budget check** - Admin approves at discretion

### 7.8 Screen: Receive PO & Update Inventory

```
┌─────────────────────────────────┐
│ ← Receive PO-2025-0015         │
├─────────────────────────────────┤
│ Status: APPROVED → RECEIVING   │
│ Vendor: ABC Supplies           │
├─────────────────────────────────┤
│ ITEMS RECEIVED                 │
│ ┌─────────────────────────────┐ │
│ │ ☑️ Cement Bags (50kg)        │ │
│ │ Ordered: 100                │ │
│ │ Received: [100]             │ │
│ │ ✅ Full quantity            │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ☑️ Power Drill (Bosch)       │ │
│ │ Ordered: 5                  │ │
│ │ Received: [5]               │ │
│ │ ✅ Full quantity            │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ATTACH DOCUMENTS               │
│ Invoice/Bill *                 │
│ ┌─────────────────────────────┐ │
│ │ [+ Upload Invoice]          │ │
│ │ 📄 invoice_0015.pdf ✅       │ │
│ └─────────────────────────────┘ │
│                                │
│ Other Documents (Optional)     │
│ [+ Upload]                     │
├─────────────────────────────────┤
│ Received Date                  │
│ ┌───────────────────────────┐  │
│ │ Jan 25, 2025          📅  │  │
│ └───────────────────────────┘  │
├─────────────────────────────────┤
│ ⚠️ This will update inventory:  │
│ • Cement: 30 → 130 (+100)      │
│ • Power Drill: 10 → 15 (+5)    │
│                                │
│ ┌───────────────────────────┐  │
│ │  CONFIRM & UPDATE INVENTORY │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 7.9 Acceptance Criteria

**AC-5.1: PO Creation**
- Both Admin and Store Incharge can create
- Vendor details mandatory
- At least one item required
- **Prices manually entered per item**
- GST auto-calculated
- Justification mandatory

**AC-5.2: Vendor Management**
- Vendors saved for reuse
- Name and phone mandatory
- Can select saved vendor or enter new

**AC-5.3: Admin Approval**
- **Only Admin can approve/reject**
- **No budget checks** - discretionary
- Comments optional
- Rejection requires reason

**AC-5.4: PO Receipt**
- Received quantities can differ (partial delivery)
- Invoice attachment required
- **Inventory updates directly on confirmation**
- Atomic transaction for consistency

---

## 8. Module 6: Maintenance Management

### 8.1 Feature Description

Dedicated section for damaged items. Items in maintenance are removed from available inventory.

**Key Rules:**
- Only Admin and Store Incharge manage maintenance
- Items removed from available stock
- Can return to inventory when fixed
- Can write off if unrepairable

### 8.2 User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-6.1 | As a **Store Incharge**, I want to move damaged items to maintenance | High |
| US-6.2 | As a **Store Incharge**, I want to return items when fixed | High |
| US-6.3 | As a **Store Incharge**, I want to write off unrepairable items | Medium |

### 8.3 Screen: Maintenance Dashboard

```
┌─────────────────────────────────┐
│ 🔧 Maintenance           [+ Add]│
├─────────────────────────────────┤
│ IN MAINTENANCE (5 items)       │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Power Drill (Bosch)   │ │
│ │ Quantity: 2                 │ │
│ │ Issue: Motor malfunction    │ │
│ │ Added: Jan 18, 2025         │ │
│ │ Status: 🔄 Under Repair  [>]│ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Concrete Mixer        │ │
│ │ Quantity: 1                 │ │
│ │ Issue: Belt broken          │ │
│ │ Added: Jan 15, 2025         │ │
│ │ Status: ✅ Ready to Return[>]│ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ WRITTEN OFF (2 items)      [>] │
├─────────────────────────────────┤
│ [View History]                 │
└─────────────────────────────────┘
```

### 8.4 Screen: Add to Maintenance

```
┌─────────────────────────────────┐
│ ← Add to Maintenance    [Save] │
├─────────────────────────────────┤
│                                 │
│ Select Item *                  │
│ ┌───────────────────────────┐  │
│ │ Search items...        🔍  │  │
│ └───────────────────────────┘  │
│                                 │
│ Selected: Power Drill (Bosch)  │
│ Available: 10                  │
│                                 │
│ Quantity *                     │
│ ┌───────────────────────────┐  │
│ │ [-]    2    [+]           │  │
│ └───────────────────────────┘  │
│                                 │
│ Issue Type *                   │
│ ┌───────────────────────────┐  │
│ │ Select Issue           ▼  │  │
│ └───────────────────────────┘  │
│ • Motor/Electrical             │
│ • Physical Damage              │
│ • Wear and Tear                │
│ • Missing Parts                │
│ • Other                        │
│                                │
│ Description *                  │
│ ┌───────────────────────────┐  │
│ │ Motor making grinding     │  │
│ │ noise.                    │  │
│ └───────────────────────────┘  │
│                                │
│ Reported By                    │
│ ┌───────────────────────────┐  │
│ │ Site A - Amit Singh       │  │
│ └───────────────────────────┘  │
│                                │
│ Add Photos (Optional)          │
│ [+ Add Photo]                  │
│                                │
│ ┌───────────────────────────┐  │
│ │   MOVE TO MAINTENANCE     │  │
│ └───────────────────────────┘  │
│                                │
│ ⚠️ This removes from available  │
│ inventory                      │
└─────────────────────────────────┘
```

### 8.5 Screen: Return from Maintenance

```
┌─────────────────────────────────┐
│ ← Return to Inventory          │
├─────────────────────────────────┤
│ Item: Power Drill (Bosch)      │
│ In Maintenance: 2              │
├─────────────────────────────────┤
│ Return Quantity *              │
│ ┌───────────────────────────┐  │
│ │ [-]    2    [+]           │  │
│ └───────────────────────────┘  │
│                                │
│ Repair Summary *               │
│ ┌───────────────────────────┐  │
│ │ Motor replaced. Working   │  │
│ │ properly now.             │  │
│ └───────────────────────────┘  │
│                                │
│ Repair Cost (Optional)         │
│ ┌───────────────────────────┐  │
│ │ ₹ 2,500                   │  │
│ └───────────────────────────┘  │
│                                │
│ Repaired By                    │
│ ┌───────────────────────────┐  │
│ │ ABC Service Center        │  │
│ └───────────────────────────┘  │
│                                │
│ ┌───────────────────────────┐  │
│ │  RETURN TO INVENTORY      │  │
│ └───────────────────────────┘  │
│                                │
│ ⚠️ Adds back to central store   │
└─────────────────────────────────┘
```

### 8.6 Acceptance Criteria

**AC-6.1: Add to Maintenance**
- Only non-consumable items
- Quantity cannot exceed available
- Issue description mandatory
- Removes from available inventory immediately

**AC-6.2: Return from Maintenance**
- Repair summary mandatory
- Adds back to central store
- Logged in activity

**AC-6.3: Write Off**
- Reason mandatory
- Permanently reduces total quantity
- Cannot be undone
- Fully logged

---

## 9. Module 7: Activity Logging & Audit Trail

### 9.1 Feature Description

Comprehensive, **immutable** logging of all system activities. **Only Admin can view logs** - cannot be edited or deleted by anyone.

### 9.2 Logged Events

- Authentication (login/logout/failed)
- User management (create/update/disable)
- Site management (create/update)
- Inventory (add/update/adjust)
- Requests (create/edit/approve/reject/transfer/return)
- POs (create/approve/reject/receive)
- Maintenance (add/return/write-off)

### 9.3 Screen: Activity Log (Admin Only)

```
┌─────────────────────────────────┐
│ 📜 Activity Log         [Export]│
├─────────────────────────────────┤
│ FILTERS                        │
│ Date: [Jan 20 📅] to [Jan 20 📅]│
│ User: [All Users ▼]            │
│ Action: [All Actions ▼]        │
│ 🔍 Search...           [Apply] │
├─────────────────────────────────┤
│ TODAY - Jan 20, 2025           │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 📦 4:30 PM                   │ │
│ │ PO Received                 │ │
│ │ Rajesh Kumar                │ │
│ │ PO-0015 - Inventory updated │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ✅ 3:15 PM                   │ │
│ │ Request Approved            │ │
│ │ Rajesh Kumar                │ │
│ │ REQ-0043                    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ✏️ 2:45 PM                   │ │
│ │ Request Edited              │ │
│ │ Rajesh Kumar                │ │
│ │ REQ-0045: Cement 25→20      │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 📋 2:30 PM                   │ │
│ │ Request Created             │ │
│ │ Amit Singh                  │ │
│ │ REQ-0045 (High Priority)    │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [Load More]                    │
└─────────────────────────────────┘
```

### 9.4 Log Detail

```
┌─────────────────────────────────┐
│ ← Log Details                  │
├─────────────────────────────────┤
│ ✏️ Request Edited               │
│ Jan 20, 2025 at 2:45 PM        │
├─────────────────────────────────┤
│ ACTION                         │
│ Type: request_edit             │
│ User: Rajesh Kumar             │
│ Role: Store Incharge           │
│ Target: REQ-2025-0045          │
├─────────────────────────────────┤
│ CHANGES                        │
│ ┌─────────────────────────────┐ │
│ │ Field: Cement Bags Qty      │ │
│ │ Before: 25                  │ │
│ │ After:  20                  │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ REASON                         │
│ "Reduced due to current stock" │
├─────────────────────────────────┤
│ METADATA                       │
│ Device: Samsung Galaxy S21     │
│ IP: 192.168.1.xxx              │
│ App Version: 1.0.0             │
└─────────────────────────────────┘
```

### 9.5 Acceptance Criteria

**AC-7.1: Log Creation**
- Every significant action logged automatically
- Server timestamps (cannot manipulate)
- User identity from auth token

**AC-7.2: Log Access**
- **Only Admin can view full logs**
- Other users see only own recent activity (last 10)

**AC-7.3: Immutability**
- **Logs CANNOT be edited or deleted**
- No delete operation exists
- Even Admin cannot modify

**AC-7.4: Export**
- CSV export
- Respects filters
- Max 1000 records per export

---

## 10. Module 8: Dashboard & Notifications

### 10.1 Admin Dashboard

```
┌─────────────────────────────────┐
│ 👋 Hello, Admin                 │
│ Jan 20, 2025                   │
├─────────────────────────────────┤
│ QUICK STATS                    │
│ ┌───────┐ ┌───────┐ ┌───────┐  │
│ │  📦   │ │  📋   │ │  🏗️   │  │
│ │  156  │ │   3   │ │   5   │  │
│ │ Items │ │Pending│ │ Sites │  │
│ │       │ │  POs  │ │       │  │
│ └───────┘ └───────┘ └───────┘  │
├─────────────────────────────────┤
│ ⚠️ NEEDS ATTENTION              │
│ • 3 POs awaiting approval      │
│ • 8 items in maintenance       │
│ • 8 low stock alerts           │
├─────────────────────────────────┤
│ RECENT ACTIVITY                │
│ • PO-0018 submitted            │
│ • REQ-0045 created             │
│ [View All →]                   │
├─────────────────────────────────┤
│ [Users] [Sites] [POs] [Logs]   │
└─────────────────────────────────┘
```

### 10.2 Store Incharge Dashboard

```
┌─────────────────────────────────┐
│ 👋 Hello, Rajesh                │
│ Jan 20, 2025                   │
├─────────────────────────────────┤
│ ⚡ ACTION REQUIRED              │
│ • 5 Pending Requests (2 High)  │
│ • 1 PO Approved - Ready to order│
│ • 1 PO Awaiting Delivery       │
├─────────────────────────────────┤
│ 📦 INVENTORY ALERTS             │
│ • 8 Low Stock Items            │
│ • 5 Items in Maintenance       │
├─────────────────────────────────┤
│ TODAY'S SUMMARY                │
│ Requests Processed: 3          │
│ Items Transferred: 15          │
│ POs Created: 1                 │
├─────────────────────────────────┤
│ [Requests] [Inventory]         │
│ [New PO] [Maintenance]         │
└─────────────────────────────────┘
```

### 10.3 Site Manager Dashboard

```
┌─────────────────────────────────┐
│ 👋 Hello, Amit                  │
│ Site A - Greenfield            │
├─────────────────────────────────┤
│ 📦 MY INVENTORY                 │
│ Total: 45 items                │
│ Non-Consumables: 12            │
│ Consumables: 33                │
│ [View Inventory →]             │
├─────────────────────────────────┤
│ 📋 MY REQUESTS                  │
│ Pending: 2                     │
│ • REQ-0045 - Awaiting          │
│ • REQ-0046 - Awaiting          │
│ Recent Approved: REQ-0043      │
├─────────────────────────────────┤
│ 🔔 UPDATES                      │
│ • REQ-0045 edited by Store     │
│   "Cement qty reduced to 20"   │
├─────────────────────────────────┤
│ [New Request] [Return Items]   │
│ [View Other Sites]             │
└─────────────────────────────────┘
```

### 10.4 Push Notifications

| Event | Recipient | Message |
|-------|-----------|---------|
| New Request (High) | Store Incharge | "🔴 High priority: Site A - 3 items" |
| New Request (Med/Low) | Store Incharge | "📋 New request: Site A - 5 items" |
| Request Edited | Site Manager | "✏️ REQ-0045 modified by Store" |
| Request Approved | Site Manager | "✅ REQ-0043 approved!" |
| Request Rejected | Site Manager | "❌ REQ-0045 rejected" |
| PO Submitted | Admin | "📋 PO pending: ₹67,500" |
| PO Approved | Store Incharge | "✅ PO-0018 approved" |
| PO Rejected | Store Incharge | "❌ PO-0018 rejected" |
| Low Stock | Store Incharge | "⚠️ Cement below minimum" |

---

## 11. Technical Architecture

### 11.1 Why Cloud Functions for APIs

Using Cloud Functions instead of direct Firestore writes:

1. **Race Condition Prevention** - Transactions
2. **Business Logic Enforcement** - Server-side validation
3. **Security** - Hide database structure
4. **Audit Logging** - Centralized logging point
5. **Atomic Operations** - Inventory updates

### 11.2 Database Choice: Firestore

| Aspect | Why Firestore |
|--------|---------------|
| Data Model | Documents/Collections fit our structure |
| Queries | Complex queries with indexing |
| Offline | Excellent offline support |
| Scalability | Auto-scales |
| Real-time | Real-time updates for dashboards |

---

## 12. Firebase Data Models

### users
```javascript
{
  id: "user_abc123",
  email: "amit@company.com",
  fullName: "Amit Singh",
  phone: "+91-9876543210",
  role: "site_manager",        // admin|store_incharge|site_manager
  assignedSiteId: "site_001",  // null for admin/store_incharge
  status: "active",            // active|disabled
  mustChangePassword: true,
  createdAt: Timestamp,
  createdBy: "admin_id",
  lastLoginAt: Timestamp,
  fcmTokens: ["token1"]
}
```

### sites
```javascript
{
  id: "site_001",
  name: "Site A - Greenfield",
  description: "Residential complex",
  address: "123 MG Road, Bangalore",
  contactNumber: "+91-9876543210",
  managerId: "user_abc123",
  managerName: "Amit Singh",      // Denormalized
  status: "active",
  itemCount: 45,                  // Denormalized
  createdAt: Timestamp
}
```

### items
```javascript
{
  id: "item_001",
  name: "Power Drill (Bosch)",
  sku: "PWR-DRL-001",
  description: "Bosch 750W impact drill",
  categoryId: "cat_001",
  categoryName: "Power Tools",    // Denormalized
  type: "non_consumable",         // consumable|non_consumable
  unit: "piece",
  imageUrl: "https://...",
  minStockLevel: 5,
  status: "active",
  
  // Stock tracking (denormalized)
  totalQuantity: 15,
  centralStoreQuantity: 10,
  atSitesQuantity: 3,
  inMaintenanceQuantity: 2,
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### inventory
```javascript
{
  id: "inv_001",
  itemId: "item_001",
  itemName: "Power Drill (Bosch)",
  itemSku: "PWR-DRL-001",
  locationId: "store",            // store|site_001|maintenance
  locationType: "store",          // store|site|maintenance
  locationName: "Central Store",
  quantity: 10,
  updatedAt: Timestamp
}
```

### requests
```javascript
{
  id: "req_2025_0045",
  requestNumber: "REQ-2025-0045",
  siteId: "site_001",
  siteName: "Site A",
  requestedBy: "user_abc123",
  requestedByName: "Amit Singh",
  
  status: "pending",              // draft|pending|approved|rejected|transferred|returned|cancelled
  priority: "high",               // high|medium|low
  purpose: "Foundation work...",
  
  items: [{
    itemId: "item_001",
    itemName: "Power Drill (Bosch)",
    itemSku: "PWR-DRL-001",
    itemType: "non_consumable",
    quantityRequested: 3,
    quantityApproved: 3,
    quantityReturned: 0,
    status: "pending"
  }],
  
  processedBy: null,
  processedAt: null,
  storeNotes: null,
  rejectionReason: null,
  
  transferredAt: null,
  returnedAt: null,
  
  editHistory: [{
    editedBy: "store_id",
    editedByName: "Rajesh",
    editedAt: Timestamp,
    reason: "Reduced qty",
    changes: [{
      field: "items[1].quantityRequested",
      oldValue: 25,
      newValue: 20
    }]
  }],
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### purchaseOrders
```javascript
{
  id: "po_2025_0018",
  poNumber: "PO-2025-0018",
  status: "pending_approval",
  
  vendorId: "vendor_001",
  vendorName: "ABC Supplies",
  vendorContact: "+91-9876543210",
  vendorEmail: "abc@vendor.com",
  vendorAddress: "123 Industrial Area",
  
  items: [{
    itemId: "item_002",
    itemName: "Cement Bags (50kg)",
    itemSku: "CEM-50KG-001",
    isExistingItem: true,
    quantity: 100,
    unitPrice: 350,               // Manually entered
    amount: 35000,
    receivedQuantity: null
  }],
  
  subtotal: 67500,
  gstPercentage: 18,
  gstAmount: 12150,
  totalAmount: 79650,
  
  justification: "Cement below minimum...",
  expectedDeliveryDate: Timestamp,
  
  documents: [{
    type: "invoice",
    fileName: "invoice.pdf",
    fileUrl: "https://...",
    uploadedAt: Timestamp
  }],
  pdfUrl: "https://...",
  
  createdBy: "store_id",
  createdAt: Timestamp,
  reviewedBy: "admin_id",
  reviewedAt: Timestamp,
  adminComments: "Approved",
  
  receivedAt: null,
  receivedNotes: null,
  updatedAt: Timestamp
}
```

### vendors
```javascript
{
  id: "vendor_001",
  name: "ABC Building Supplies",
  contactPerson: "Ramesh",
  phone: "+91-9876543210",
  email: "abc@vendor.com",
  address: "123 Industrial Area",
  gstin: "XXXXXXXXXXXX",
  category: "building_materials",
  poCount: 12,
  lastPoDate: Timestamp,
  status: "active",
  createdAt: Timestamp
}
```

### maintenance
```javascript
{
  id: "maint_001",
  itemId: "item_001",
  itemName: "Power Drill (Bosch)",
  itemSku: "PWR-DRL-001",
  quantity: 2,
  
  issueType: "motor_electrical",
  issueDescription: "Motor grinding...",
  reportedBy: "Site A - Amit",
  photos: [{ url: "https://..." }],
  
  status: "under_repair",         // pending|under_repair|ready|returned|written_off
  
  updates: [{
    note: "Sent to service center",
    addedBy: "Rajesh",
    addedAt: Timestamp
  }],
  
  returnedAt: null,
  returnedQuantity: null,
  repairSummary: null,
  repairCost: null,
  
  writtenOffAt: null,
  writeOffReason: null,
  
  addedBy: "store_id",
  addedAt: Timestamp,
  updatedAt: Timestamp
}
```

### activityLogs
```javascript
{
  id: "log_001",
  timestamp: Timestamp,
  
  userId: "user_abc123",
  userName: "Rajesh Kumar",
  userRole: "store_incharge",
  
  actionType: "request_edit",
  actionCategory: "requests",
  
  targetType: "request",
  targetId: "req_2025_0045",
  targetDisplay: "REQ-2025-0045",
  
  summary: "Edited request: Cement qty 25→20",
  details: "Reduced due to stock",
  
  changes: [{
    field: "items[1].quantityRequested",
    fieldLabel: "Cement Bags Qty",
    oldValue: 25,
    newValue: 20
  }],
  
  deviceInfo: "Samsung Galaxy S21",
  ipAddress: "192.168.1.xxx",
  appVersion: "1.0.0"
}
```

---

## 13. API Endpoints (Cloud Functions)

### Critical APIs with Race Condition Prevention

#### transferRequest
```javascript
// Uses Firestore transaction to:
// 1. Validate ALL items have sufficient stock
// 2. Decrease central store quantity
// 3. Increase site inventory
// 4. Update item totals
// 5. Update request status
// All atomically - prevents race conditions
```

#### receivePO
```javascript
// Uses Firestore transaction to:
// 1. Update received quantities
// 2. Increase item quantities in central store
// 3. Create new items if needed
// 4. Mark PO as received
// All atomically
```

#### adjustItemQuantity
```javascript
// Uses Firestore transaction to:
// 1. Read current quantity
// 2. Validate new quantity >= 0
// 3. Update quantity
// 4. Log with before/after
// Prevents concurrent adjustments
```

### API List

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| **Auth** |
| changePassword | POST | All | Change own password |
| **Users** |
| createUser | POST | Admin | Create new user |
| updateUser | PUT | Admin | Update user/disable |
| listUsers | GET | Admin | List all users |
| **Sites** |
| createSite | POST | Admin | Create site |
| updateSite | PUT | Admin | Update site |
| listSites | GET | All | List sites |
| **Items** |
| createItem | POST | Store/Admin | Add new item |
| updateItem | PUT | Store/Admin | Update item |
| adjustQuantity | POST | Store/Admin | Adjust with reason |
| listItems | GET | Store/Admin | List central inventory |
| **Inventory** |
| getInventory | GET | All | Get by location |
| **Requests** |
| createRequest | POST | Site Mgr | Create request |
| editRequest | PUT | Store/Admin | Edit any request |
| approveRequest | POST | Store/Admin | Approve |
| rejectRequest | POST | Store/Admin | Reject |
| transferRequest | POST | Store/Admin | Confirm transfer |
| returnItems | POST | Site Mgr | Return items |
| listRequests | GET | All | List (filtered by role) |
| **POs** |
| createPO | POST | Store/Admin | Create PO |
| approvePO | POST | Admin | Approve PO |
| rejectPO | POST | Admin | Reject PO |
| receivePO | POST | Store/Admin | Mark received |
| generatePdf | GET | Store/Admin | Generate PDF |
| **Vendors** |
| createVendor | POST | Store/Admin | Add vendor |
| updateVendor | PUT | Store/Admin | Update vendor |
| listVendors | GET | Store/Admin | List vendors |
| **Maintenance** |
| addToMaintenance | POST | Store/Admin | Add item |
| returnFromMaint | POST | Store/Admin | Return item |
| writeOff | POST | Store/Admin | Write off |
| listMaintenance | GET | Store/Admin | List items |
| **Logs** |
| listLogs | GET | Admin | Activity logs |
| exportLogs | GET | Admin | Export CSV |

---

## 14. Security Rules Summary

```javascript
// Key principles:
// 1. All writes go through Cloud Functions (allow write: if false)
// 2. Reads are role-based
// 3. Site Managers cannot read central inventory items
// 4. Activity logs: Admin read only, no writes from client
```

---

## 15. Development Phases

### Phase 1: Foundation (Week 1-2)
- Project setup (Expo + Firebase)
- Authentication module
- User management
- Site management
- Navigation structure

### Phase 2: Inventory (Week 2-3)
- Item management
- Central store inventory
- Site inventory
- Cross-site viewing
- Quantity adjustment
- Low stock alerts

### Phase 3: Requests (Week 3-4)
- Request creation
- Request queue
- Edit functionality
- Approve/Reject
- Transfer confirmation
- Item returns

### Phase 4: POs (Week 4-5)
- PO creation
- Vendor management
- Admin approval
- PO receipt
- PDF generation

### Phase 5: Maintenance & Logging (Week 5-6)
- Maintenance module
- Activity logging
- Admin log viewer
- Export functionality
- Dashboard completion

### Phase 6: Polish & Testing (Week 6-7)
- Push notifications
- Performance optimization
- Bug fixes
- Device testing
- Documentation

### Phase 7: Deployment (Week 7-8)
- App Store submission
- Play Store submission
- Production setup
- User training
- Go-live

---

## Summary of Key Changes from Previous Version

1. ✅ Site Managers CANNOT see central store inventory
2. ✅ Admin can create POs (has complete control)
3. ✅ Admin creates users with temp password (manual communication)
4. ✅ No prices on items (prices only in POs, manually entered)
5. ✅ No return due dates (returns when work complete)
6. ✅ No partial fulfillment (request pending until all available)
7. ✅ Stock alerts at minimum level (not zero)
8. ✅ Store Incharge can edit ANY request
9. ✅ Priority: High/Medium/Low
10. ✅ Maintenance module for damaged items
11. ✅ PO prices manually added per item
12. ✅ Vendors saved for reuse
13. ✅ No budget checks (Admin discretion)
14. ✅ Race condition prevention via Cloud Functions transactions

---

**Document Version:** 2.0
**Last Updated:** January 2025
