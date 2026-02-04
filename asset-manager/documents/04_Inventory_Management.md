# CIAMS - Inventory Management
## Module 3: Multi-Location Inventory Tracking

---

## Feature Description

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

---

## User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-3.1 | As a **Store Incharge**, I want to add items with details and images | High |
| US-3.2 | As a **Store Incharge**, I want to categorize items as consumable/non-consumable | High |
| US-3.3 | As a **Store Incharge**, I want to set minimum stock levels for alerts | High |
| US-3.4 | As a **Store Incharge**, I want to adjust quantities with mandatory reason | High |
| US-3.5 | As a **Site Manager**, I want to view my site's inventory | High |
| US-3.6 | As a **Site Manager**, I want to view other sites' inventory (read-only) | High |
| US-3.7 | As a **Store Incharge**, I want low stock alerts to raise POs proactively | Medium |

---

## Screen Designs

### Central Store Inventory (Store Incharge/Admin)

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

### Add/Edit Item Screen

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

### Item Detail Screen

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

### Quantity Adjustment Screen

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

### Site Manager - My Inventory

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

### Other Site Inventory (Read-Only)

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

---

## Acceptance Criteria

### AC-3.1: Item Management
- Item name and SKU mandatory and unique
- Item type cannot change after first transaction
- **No price field on items**
- Image optional but recommended

### AC-3.2: Inventory Visibility
- Store Incharge: sees central inventory
- **Site Manager: CANNOT see central store**
- Site Manager: sees own site + other sites (read-only)
- Admin: sees everything

### AC-3.3: Stock Tracking (Non-Consumable)
- Total = Central + Sites + Maintenance
- Shows distribution across locations

### AC-3.4: Stock Tracking (Consumable)
- Once transferred, considered "consumed"
- No return expected

### AC-3.5: Low Stock Alerts
- Triggers when available ≤ minimum level
- **Not when reaches zero** (proactive alerts)
- Visible on dashboard and inventory list

### AC-3.6: Quantity Adjustment
- Reason mandatory
- Notes mandatory
- Logged with before/after values
- Cannot go negative

---

## Data Models

### items Collection

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

### inventory Collection

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

---

## API Endpoints

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| createItem | POST | Store/Admin | Add new item |
| updateItem | PUT | Store/Admin | Update item |
| adjustQuantity | POST | Store/Admin | Adjust with reason |
| listItems | GET | Store/Admin | List central inventory |
| getInventory | GET | All | Get by location |

---

## Use Cases

### Use Case 1: Store Incharge Adds New Item
1. Navigates to Central Store Inventory
2. Clicks "Add Item"
3. Fills in item details (name, SKU, category, type, unit)
4. Uploads optional image
5. Sets initial quantity and minimum stock level
6. Saves item
7. System creates item and inventory record

### Use Case 2: Stock Falls Below Minimum
1. Request fulfilled reduces central store quantity
2. System checks if quantity ≤ minimum level
3. Triggers low stock alert
4. Alert appears on Store Incharge dashboard
5. Store Incharge creates PO to restock

### Use Case 3: Site Manager Views Other Site Inventory
1. Site Manager navigates to "View Other Sites"
2. Selects Site B
3. Views read-only list of items at Site B
4. Sees contact info to coordinate potential transfer
5. Cannot modify or request directly

---

## Business Rules

- No prices stored on items (only in POs)
- Item type (consumable/non-consumable) cannot change after first transaction
- Site Managers have NO access to central store inventory
- Low stock alerts trigger at minimum level, not zero
- Quantity adjustments require mandatory reason and notes
- All quantity changes fully logged for audit trail
