# CIAMS - Request Management
## Module 4: Site-to-Store Request Workflow

---

## Feature Description

Site Managers request items from Central Store. Store Incharge processes requests.

**Key Business Rules:**
- Only Site Managers create requests
- **NO PARTIAL FULFILLMENT** - if 3 drills needed but only 2 available, request stays pending until all items available
- Store Incharge can **EDIT ANY REQUEST** (quantities, items, priority)
- Store Incharge can approve or reject with reasons
- **Three priority levels: High, Medium, Low**
- **No return due dates** - returns happen when work complete

---

## Request Status Flow

```
DRAFT ──► PENDING ──► APPROVED ──► TRANSFERRED ──► RETURNED
              │                                   (non-cons)
              ▼
          REJECTED

          CANCELLED (by Site Manager before processing)
```

---

## User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-4.1 | As a **Site Manager**, I want to create requests with priority | High |
| US-4.2 | As a **Store Incharge**, I want to see requests sorted by priority | High |
| US-4.3 | As a **Store Incharge**, I want to approve only when ALL items available | High |
| US-4.4 | As a **Store Incharge**, I want to reject with reason | High |
| US-4.5 | As a **Store Incharge**, I want to edit ANY request | High |
| US-4.6 | As a **Site Manager**, I want to return non-consumable items | High |

---

## Screen Designs

### Create Request (Site Manager)

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

### Request Queue (Store Incharge)

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

### Process Request (Store Incharge)

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

### Edit Request (Store Incharge)

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

### Reject Request Screen

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

### Confirm Transfer Screen

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

### Return Items Screen (Site Manager)

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

---

## Acceptance Criteria

### AC-4.1: Request Creation
- Site Manager creates requests for their site only
- Priority mandatory (High/Medium/Low)
- At least one item required

### AC-4.2: No Partial Fulfillment
- **Approve button disabled until ALL items have sufficient stock**
- Clear indication of which items are insufficient
- Request stays pending until stock available or edited

### AC-4.3: Request Editing
- Store Incharge can edit ANY request (any status except rejected/cancelled)
- Can change quantities, add/remove items, change priority
- Edit reason mandatory
- All edits logged

### AC-4.4: Approval
- Only possible when ALL items sufficient
- Items reserved on approval

### AC-4.5: Transfer
- Confirms physical handover
- Updates inventories atomically
- Notification to Site Manager

### AC-4.6: Rejection
- Reason mandatory
- Comments mandatory
- Notification to Site Manager

### AC-4.7: Return
- Only non-consumable items
- Condition selection required
- Items marked "needs maintenance" or "damaged" go to maintenance
- **No return due date** - returns when work complete

---

## Data Model

### requests Collection

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

---

## API Endpoints

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| createRequest | POST | Site Mgr | Create request |
| editRequest | PUT | Store/Admin | Edit any request |
| approveRequest | POST | Store/Admin | Approve |
| rejectRequest | POST | Store/Admin | Reject |
| transferRequest | POST | Store/Admin | Confirm transfer |
| returnItems | POST | Site Mgr | Return items |
| listRequests | GET | All | List (filtered by role) |

---

## Use Cases

### Use Case 1: Site Manager Creates Request
1. Navigates to "New Request"
2. Selects priority (High/Medium/Low)
3. Adds items with quantities
4. Enters purpose/notes
5. Submits request
6. System validates and creates request
7. Store Incharge receives notification

### Use Case 2: Store Incharge Processes Request (All Items Available)
1. Views request queue
2. Opens high-priority request
3. System checks all items have sufficient stock
4. All items show "Sufficient" status
5. Approve button enabled
6. Clicks approve
7. Request marked as approved
8. Site Manager receives notification

### Use Case 3: Store Incharge Edits Request (Insufficient Stock)
1. Opens request with insufficient items
2. Approve button disabled
3. Clicks "Edit Request"
4. Reduces quantity of cement from 25 to 20
5. Enters reason: "Reduced to available stock"
6. Saves changes
7. Edit logged in history
8. Approve button now enabled
9. Site Manager receives notification of edit

### Use Case 4: Site Manager Returns Items
1. Work completed on foundation
2. Navigates to "Return Items"
3. Selects non-consumable items (drills)
4. Sets return quantity
5. Selects condition (Good/Needs Maintenance/Damaged)
6. Adds notes
7. Submits return
8. If "Good" - returns to central store
9. If "Needs Maintenance" or "Damaged" - goes to maintenance module

---

## Business Rules

- **No partial fulfillment** - request stays pending until ALL items available
- Store Incharge has full edit rights on any request
- Priority affects queue sorting (High → Medium → Low)
- Consumable items cannot be returned
- No return due dates - returns happen when work complete
- All edits logged with reason and timestamp
- Transfer is atomic operation updating both inventories
