# CIAMS - Purchase Order Management
## Module 5: PO Lifecycle and Vendor Management

---

## Feature Description

PO lifecycle for restocking central inventory.

**Key Business Rules:**
- **Both Store Incharge AND Admin can create POs**
- **Only Admin can approve/reject POs**
- **No budget checks** - Admin uses discretion
- **Prices manually entered** per item in PO
- **Vendors can be saved** for reuse
- PO generates PDF
- **On receipt, inventory updates directly from PO**

---

## PO Status Flow

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

---

## User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US-5.1 | As a **Store Incharge**, I want to create POs when stock low | High |
| US-5.2 | As an **Admin**, I want to create POs directly | High |
| US-5.3 | As a **Store Incharge**, I want to enter prices per item manually | High |
| US-5.4 | As a **Store Incharge**, I want to save vendors for reuse | High |
| US-5.5 | As an **Admin**, I want to approve/reject POs at my discretion | High |
| US-5.6 | As a **Store Incharge**, I want to mark PO received and update inventory | High |

---

## Screen Designs

### Create PO Screen

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

### Vendor Management Screen

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

### Add Vendor Screen

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

### Admin PO Approval Screen

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

### Receive PO & Update Inventory Screen

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

---

## Acceptance Criteria

### AC-5.1: PO Creation
- Both Admin and Store Incharge can create
- Vendor details mandatory
- At least one item required
- **Prices manually entered per item**
- GST auto-calculated
- Justification mandatory

### AC-5.2: Vendor Management
- Vendors saved for reuse
- Name and phone mandatory
- Can select saved vendor or enter new

### AC-5.3: Admin Approval
- **Only Admin can approve/reject**
- **No budget checks** - discretionary
- Comments optional
- Rejection requires reason

### AC-5.4: PO Receipt
- Received quantities can differ (partial delivery)
- Invoice attachment required
- **Inventory updates directly on confirmation**
- Atomic transaction for consistency

---

## Data Models

### purchaseOrders Collection

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

### vendors Collection

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

---

## API Endpoints

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| createPO | POST | Store/Admin | Create PO |
| approvePO | POST | Admin | Approve PO |
| rejectPO | POST | Admin | Reject PO |
| receivePO | POST | Store/Admin | Mark received |
| generatePdf | GET | Store/Admin | Generate PDF |
| createVendor | POST | Store/Admin | Add vendor |
| updateVendor | PUT | Store/Admin | Update vendor |
| listVendors | GET | Store/Admin | List vendors |

---

## Use Cases

### Use Case 1: Store Incharge Creates PO from Low Stock Alert
1. Receives low stock alert for cement
2. Navigates to "Create PO"
3. Selects saved vendor "ABC Building Supplies"
4. Adds cement item, enters quantity (100) and unit price (₹350)
5. System calculates subtotal, GST, total
6. Enters justification: "Stock below minimum"
7. Sets expected delivery date
8. Submits for approval
9. Admin receives notification

### Use Case 2: Admin Reviews and Approves PO
1. Receives notification of new PO
2. Opens PO for review
3. Checks current stock levels
4. Reviews justification
5. Verifies pricing seems reasonable
6. Adds optional comment
7. Approves PO
8. Store Incharge receives notification
9. PO status changes to "Approved"

### Use Case 3: Store Incharge Receives PO
1. Delivery arrives from vendor
2. Opens approved PO
3. Verifies received quantities match order
4. Uploads invoice document (required)
5. Confirms receipt date
6. System shows inventory update preview
7. Confirms receipt
8. System atomically updates:
   - Central store inventory increases
   - Item quantities updated
   - PO marked as received
9. Low stock alerts cleared if applicable

### Use Case 4: Admin Creates New Vendor During PO
1. Creating PO for new supplier
2. Clicks "Add New Vendor"
3. Fills in vendor details
4. Checks "Save for future use"
5. Vendor added to system
6. Auto-populated in current PO
7. Available for future POs

---

## Business Rules

- Both Admin and Store Incharge can create POs
- Only Admin can approve/reject POs
- No budget checks - Admin uses discretion
- Prices manually entered per item (not stored on items)
- Vendors saved and reusable
- PO receipt directly updates inventory in atomic transaction
- Invoice attachment mandatory on receipt
- Partial deliveries supported
- PDF generation for printing/sharing
