# CIAMS - Overview and Architecture
## Construction Inventory & Asset Management System

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

## Executive Summary

### Product Overview

**Product Name:** CIAMS (Construction Inventory & Asset Management System)

**Purpose:** An internal mobile application for a construction company to manage inventory flow between a central warehouse (store) and multiple construction sites, with complete tracking, purchase order management, maintenance tracking, and audit trails.

**Target Users:**
- **Admin** - Company management/owner with full system control
- **Store Incharge** - Warehouse manager handling central inventory
- **Site Managers** - On-site supervisors managing site-specific inventory

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React Native (Expo) |
| Backend | Firebase Cloud Functions |
| Database | Cloud Firestore |
| Authentication | Firebase Auth |
| File Storage | Firebase Cloud Storage |
| Notifications | Firebase Cloud Messaging (FCM) |

### Key Features Summary

- Multi-location inventory management (Central Store + Multiple Sites)
- Item categorization (Consumable / Non-Consumable)
- Request workflow with priority levels (High/Medium/Low)
- **No partial fulfillment** - requests wait until full stock available
- Purchase Order management with PDF generation
- Maintenance module for damaged items
- Vendor management (save and reuse)
- Complete audit trail (immutable logs)
- Role-based access control

### Key Business Rules

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

## User Roles & Permissions Matrix

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

## Technical Architecture

### Why Cloud Functions for APIs

Using Cloud Functions instead of direct Firestore writes:

1. **Race Condition Prevention** - Transactions
2. **Business Logic Enforcement** - Server-side validation
3. **Security** - Hide database structure
4. **Audit Logging** - Centralized logging point
5. **Atomic Operations** - Inventory updates

### Database Choice: Firestore

| Aspect | Why Firestore |
|--------|---------------|
| Data Model | Documents/Collections fit our structure |
| Queries | Complex queries with indexing |
| Offline | Excellent offline support |
| Scalability | Auto-scales |
| Real-time | Real-time updates for dashboards |

---

## Development Phases

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
