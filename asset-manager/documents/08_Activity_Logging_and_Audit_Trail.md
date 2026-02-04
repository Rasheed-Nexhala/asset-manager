# CIAMS - Activity Logging & Audit Trail
## Module 7: Immutable System Activity Tracking

---

## Feature Description

Comprehensive, **immutable** logging of all system activities. **Only Admin can view logs** - cannot be edited or deleted by anyone.

---

## Logged Events

- Authentication (login/logout/failed)
- User management (create/update/disable)
- Site management (create/update)
- Inventory (add/update/adjust)
- Requests (create/edit/approve/reject/transfer/return)
- POs (create/approve/reject/receive)
- Maintenance (add/return/write-off)

---

## User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-7.1 | As an **Admin**, I want to view complete activity logs for audit purposes | High |
| US-7.2 | As an **Admin**, I want to filter logs by user, action, and date | High |
| US-7.3 | As an **Admin**, I want to export logs for compliance | Medium |
| US-7.4 | As a **User**, I want to see my own recent activity | Low |

---

## Screen Designs

### Activity Log Screen (Admin Only)

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

### Log Detail Screen

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

### My Recent Activity (All Users)

```
┌─────────────────────────────────┐
│ 📋 My Recent Activity          │
├─────────────────────────────────┤
│ LAST 10 ACTIONS                │
│ ┌─────────────────────────────┐ │
│ │ ✅ Request Approved           │ │
│ │ Today at 3:15 PM            │ │
│ │ REQ-0043                    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ✏️ Request Edited             │ │
│ │ Today at 2:45 PM            │ │
│ │ REQ-0045                    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 📦 PO Created                 │ │
│ │ Yesterday at 4:20 PM        │ │
│ │ PO-0018                     │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Showing last 10 of 156 actions │
└─────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-7.1: Log Creation
- Every significant action logged automatically
- Server timestamps (cannot manipulate)
- User identity from auth token

### AC-7.2: Log Access
- **Only Admin can view full logs**
- Other users see only own recent activity (last 10)

### AC-7.3: Immutability
- **Logs CANNOT be edited or deleted**
- No delete operation exists
- Even Admin cannot modify

### AC-7.4: Export
- CSV export
- Respects filters
- Max 1000 records per export

---

## Data Model

### activityLogs Collection

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

## API Endpoints

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| listLogs | GET | Admin | Activity logs |
| exportLogs | GET | Admin | Export CSV |
| getMyActivity | GET | All | Own recent activity |

---

## Logged Action Types

### Authentication
- `user_login` - Successful login
- `user_logout` - User logged out
- `login_failed` - Failed login attempt
- `password_changed` - Password updated

### User Management
- `user_created` - New user account created
- `user_updated` - User details modified
- `user_disabled` - User account disabled
- `user_enabled` - User account re-enabled

### Site Management
- `site_created` - New site added
- `site_updated` - Site details modified
- `site_status_changed` - Site activated/deactivated

### Inventory
- `item_created` - New item added
- `item_updated` - Item details modified
- `quantity_adjusted` - Manual quantity adjustment
- `item_transferred` - Item moved between locations

### Requests
- `request_created` - New request submitted
- `request_edited` - Request modified
- `request_approved` - Request approved
- `request_rejected` - Request rejected
- `request_transferred` - Items transferred to site
- `items_returned` - Items returned from site
- `request_cancelled` - Request cancelled by site manager

### Purchase Orders
- `po_created` - New PO created
- `po_approved` - PO approved by admin
- `po_rejected` - PO rejected by admin
- `po_received` - PO marked as received
- `po_ordered` - PO sent to vendor

### Maintenance
- `maintenance_added` - Item moved to maintenance
- `maintenance_returned` - Item returned from maintenance
- `item_written_off` - Item permanently written off
- `maintenance_updated` - Maintenance status updated

### Vendors
- `vendor_created` - New vendor added
- `vendor_updated` - Vendor details modified

---

## Log Entry Examples

### Request Edit Log
```javascript
{
  timestamp: "2025-01-20T14:45:00Z",
  userId: "store_123",
  userName: "Rajesh Kumar",
  userRole: "store_incharge",
  actionType: "request_edit",
  actionCategory: "requests",
  targetType: "request",
  targetId: "req_2025_0045",
  targetDisplay: "REQ-2025-0045",
  summary: "Edited request: Cement qty 25→20",
  details: "Reduced cement quantity due to available stock",
  changes: [
    {
      field: "items[1].quantityRequested",
      fieldLabel: "Cement Bags Quantity",
      oldValue: 25,
      newValue: 20
    }
  ]
}
```

### PO Approval Log
```javascript
{
  timestamp: "2025-01-20T15:30:00Z",
  userId: "admin_001",
  userName: "Company Owner",
  userRole: "admin",
  actionType: "po_approved",
  actionCategory: "purchase_orders",
  targetType: "purchase_order",
  targetId: "po_2025_0018",
  targetDisplay: "PO-2025-0018",
  summary: "Approved PO for ₹79,650",
  details: "Approved purchase order from ABC Building Supplies",
  changes: [
    {
      field: "status",
      fieldLabel: "Status",
      oldValue: "pending_approval",
      newValue: "approved"
    }
  ]
}
```

### Quantity Adjustment Log
```javascript
{
  timestamp: "2025-01-20T16:00:00Z",
  userId: "store_123",
  userName: "Rajesh Kumar",
  userRole: "store_incharge",
  actionType: "quantity_adjusted",
  actionCategory: "inventory",
  targetType: "item",
  targetId: "item_001",
  targetDisplay: "Power Drill (Bosch)",
  summary: "Adjusted quantity: 12→10 (-2)",
  details: "Physical count correction - found 2 items missing during inspection",
  changes: [
    {
      field: "centralStoreQuantity",
      fieldLabel: "Central Store Quantity",
      oldValue: 12,
      newValue: 10
    }
  ]
}
```

---

## Export Format (CSV)

```csv
Timestamp,User,Role,Action,Target,Summary,Details
2025-01-20 16:00:00,Rajesh Kumar,Store Incharge,Quantity Adjusted,Power Drill (Bosch),"Adjusted quantity: 12→10",Physical count correction
2025-01-20 15:30:00,Company Owner,Admin,PO Approved,PO-2025-0018,"Approved PO for ₹79,650",Approved purchase order from ABC Building Supplies
2025-01-20 14:45:00,Rajesh Kumar,Store Incharge,Request Edited,REQ-2025-0045,"Edited request: Cement qty 25→20",Reduced cement quantity due to available stock
```

---

## Business Rules

- All logs created server-side (cannot be manipulated)
- Server timestamps used (not client device time)
- User identity from authenticated session
- Logs are immutable - no updates or deletes
- Admin-only access to full logs
- Regular users see only their own recent 10 actions
- Export limited to 1000 records per request
- Filters applied before export
- Device info and IP captured for security audit
- Change tracking shows before/after values
- All significant actions logged automatically

---

## Security Firestore Rules

```javascript
// Activity Logs Collection
match /activityLogs/{logId} {
  // No client writes allowed - only Cloud Functions
  allow write: if false;

  // Admin can read all logs
  allow read: if request.auth != null &&
                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

  // Users can read only their own logs
  allow read: if request.auth != null &&
                 resource.data.userId == request.auth.uid;
}
```

---

## Use Cases

### Use Case 1: Admin Investigates Inventory Discrepancy
1. Admin receives report of missing items
2. Opens Activity Log
3. Filters by item SKU and date range
4. Reviews all quantity adjustments
5. Identifies manual adjustment by Store Incharge
6. Views detailed log entry with reason
7. Verifies legitimacy with Store Incharge

### Use Case 2: Compliance Audit Export
1. External auditor requests activity records
2. Admin navigates to Activity Log
3. Sets date range for audit period
4. Applies filters for relevant actions
5. Clicks "Export"
6. System generates CSV with max 1000 records
7. Admin downloads and shares with auditor

### Use Case 3: User Reviews Own Activity
1. Store Incharge wants to verify completed tasks
2. Opens "My Recent Activity"
3. Sees last 10 actions performed
4. Confirms all requests processed
5. No access to other users' activities
