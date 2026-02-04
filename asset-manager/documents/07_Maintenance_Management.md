# CIAMS - Maintenance Management
## Module 6: Damaged Item Tracking and Repair

---

## Feature Description

Dedicated section for damaged items. Items in maintenance are removed from available inventory.

**Key Rules:**
- Only Admin and Store Incharge manage maintenance
- Items removed from available stock
- Can return to inventory when fixed
- Can write off if unrepairable

---

## User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-6.1 | As a **Store Incharge**, I want to move damaged items to maintenance | High |
| US-6.2 | As a **Store Incharge**, I want to return items when fixed | High |
| US-6.3 | As a **Store Incharge**, I want to write off unrepairable items | Medium |

---

## Screen Designs

### Maintenance Dashboard

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

### Add to Maintenance Screen

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

### Return from Maintenance Screen

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

### Write Off Screen

```
┌─────────────────────────────────┐
│ ← Write Off Item               │
├─────────────────────────────────┤
│ Item: Concrete Mixer           │
│ In Maintenance: 1              │
├─────────────────────────────────┤
│ Write Off Quantity *           │
│ ┌───────────────────────────┐  │
│ │ [-]    1    [+]           │  │
│ └───────────────────────────┘  │
│                                │
│ Reason for Write Off *         │
│ ┌───────────────────────────┐  │
│ │ Select Reason          ▼  │  │
│ └───────────────────────────┘  │
│ • Beyond Repair                │
│ • High Repair Cost             │
│ • Obsolete                     │
│ • Lost/Stolen                  │
│ • Other                        │
│                                │
│ Detailed Explanation *         │
│ ┌───────────────────────────┐  │
│ │ Motor damaged beyond      │  │
│ │ repair. Repair cost       │  │
│ │ exceeds replacement cost. │  │
│ └───────────────────────────┘  │
│                                │
│ ┌───────────────────────────┐  │
│ │      CONFIRM WRITE OFF    │  │
│ └───────────────────────────┘  │
│                                │
│ ⚠️ This permanently reduces     │
│ total inventory. Cannot undo.  │
└─────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-6.1: Add to Maintenance
- Only non-consumable items
- Quantity cannot exceed available
- Issue description mandatory
- Removes from available inventory immediately

### AC-6.2: Return from Maintenance
- Repair summary mandatory
- Adds back to central store
- Logged in activity

### AC-6.3: Write Off
- Reason mandatory
- Permanently reduces total quantity
- Cannot be undone
- Fully logged

---

## Data Model

### maintenance Collection

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

---

## API Endpoints

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| addToMaintenance | POST | Store/Admin | Add item |
| returnFromMaint | POST | Store/Admin | Return item |
| writeOff | POST | Store/Admin | Write off |
| listMaintenance | GET | Store/Admin | List items |
| addMaintenanceUpdate | POST | Store/Admin | Add status update |

---

## Use Cases

### Use Case 1: Site Manager Reports Damaged Item
1. Site Manager returns drill marked as "Damaged"
2. Return workflow routes item to maintenance
3. System creates maintenance record
4. Removes quantity from available inventory
5. Store Incharge notified
6. Item appears in maintenance dashboard

### Use Case 2: Store Incharge Adds Item to Maintenance
1. Discovers damage during inspection
2. Navigates to "Add to Maintenance"
3. Selects affected item (Power Drill)
4. Enters quantity (2)
5. Selects issue type (Motor/Electrical)
6. Adds description and photos
7. Submits
8. System:
   - Removes 2 from central store available
   - Adds 2 to maintenance quantity
   - Creates maintenance record
   - Logs activity

### Use Case 3: Store Incharge Returns Repaired Item
1. Receives repaired drills from service center
2. Opens maintenance record
3. Clicks "Return to Inventory"
4. Enters repair summary
5. Adds repair cost (₹2,500)
6. Notes service center name
7. Confirms return
8. System:
   - Adds 2 back to central store
   - Removes 2 from maintenance
   - Updates total quantity
   - Logs activity with repair details

### Use Case 4: Store Incharge Writes Off Unrepairable Item
1. Service center reports mixer beyond repair
2. Opens maintenance record
3. Clicks "Write Off"
4. Selects reason "Beyond Repair"
5. Adds detailed explanation
6. Confirms write off
7. System shows warning (cannot be undone)
8. Confirms again
9. System:
   - Permanently reduces total quantity by 1
   - Removes from maintenance
   - Marks maintenance record as written off
   - Logs activity

---

## Business Rules

- Only non-consumable items can go to maintenance
- Items in maintenance removed from available stock
- Repair costs tracked for financial records
- Write offs are permanent and cannot be undone
- All maintenance actions fully logged
- Photos optional but recommended for documentation
- Site Managers cannot directly access maintenance module
- Items can be returned from maintenance partially (e.g., 2 sent, 1 returned, 1 still under repair)

---

## Maintenance Workflows

### From Site Return
```
Site Manager Returns Item (Damaged)
              ↓
    Automatic Maintenance Entry
              ↓
    Store Incharge Reviews
              ↓
        Decide Action
         ↙          ↘
    Repair          Write Off
       ↓
  Return to Store
```

### Direct Addition
```
Store Incharge Discovers Damage
              ↓
    Manually Add to Maintenance
              ↓
    Send for Repair / Assess
              ↓
        Decide Action
         ↙          ↘
    Repair          Write Off
       ↓
  Return to Store
```

---

## Status Definitions

| Status | Description |
|--------|-------------|
| pending | Just added, assessment needed |
| under_repair | Sent to service center or being repaired |
| ready | Repaired and ready to return |
| returned | Returned to central store |
| written_off | Permanently removed from inventory |
