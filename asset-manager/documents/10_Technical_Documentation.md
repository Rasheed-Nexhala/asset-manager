# CIAMS - Technical Documentation
## Data Models, APIs, and Implementation Details

---

## Table of Contents

1. Firebase Data Models
2. Cloud Functions API Endpoints
3. Security Rules
4. Race Condition Prevention
5. Critical Transactions

---

## 1. Firebase Data Models

### 1.1 users Collection

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
  fcmTokens: ["token1", "token2"]  // Multiple devices
}
```

**Indexes Required:**
- `email` (unique)
- `role` + `status`
- `assignedSiteId`

---

### 1.2 sites Collection

```javascript
{
  id: "site_001",
  name: "Site A - Greenfield",
  description: "Residential complex construction - Phase 1",
  address: "123 MG Road, Bangalore",
  contactNumber: "+91-9876543210",
  managerId: "user_abc123",
  managerName: "Amit Singh",      // Denormalized for performance
  status: "active",               // active|inactive
  itemCount: 45,                  // Denormalized - updated via Cloud Functions
  createdAt: Timestamp,
  createdBy: "admin_id",
  updatedAt: Timestamp
}
```

**Indexes Required:**
- `status`
- `managerId`

---

### 1.3 items Collection

```javascript
{
  id: "item_001",
  name: "Power Drill (Bosch)",
  sku: "PWR-DRL-001",
  description: "Bosch 750W impact drill with accessories",
  categoryId: "cat_001",
  categoryName: "Power Tools",    // Denormalized
  type: "non_consumable",         // consumable|non_consumable
  unit: "piece",                  // piece|kg|meter|liter|box
  imageUrl: "https://storage.googleapis.com/...",
  minStockLevel: 5,
  status: "active",               // active|discontinued

  // Stock tracking (denormalized for performance)
  totalQuantity: 15,
  centralStoreQuantity: 10,
  atSitesQuantity: 3,
  inMaintenanceQuantity: 2,

  createdAt: Timestamp,
  createdBy: "store_id",
  updatedAt: Timestamp
}
```

**Indexes Required:**
- `sku` (unique)
- `categoryId` + `status`
- `type` + `status`
- `status` + `centralStoreQuantity` (for low stock queries)

---

### 1.4 inventory Collection

```javascript
{
  id: "inv_001",
  itemId: "item_001",
  itemName: "Power Drill (Bosch)",  // Denormalized
  itemSku: "PWR-DRL-001",           // Denormalized
  locationId: "store",              // store|site_001|site_002|maintenance
  locationType: "store",            // store|site|maintenance
  locationName: "Central Store",    // Denormalized
  quantity: 10,
  updatedAt: Timestamp,
  updatedBy: "store_id"
}
```

**Indexes Required:**
- `itemId` + `locationId` (composite - unique)
- `locationId` + `locationType`
- `itemId`

---

### 1.5 requests Collection

```javascript
{
  id: "req_2025_0045",
  requestNumber: "REQ-2025-0045",
  siteId: "site_001",
  siteName: "Site A - Greenfield",
  requestedBy: "user_abc123",
  requestedByName: "Amit Singh",

  status: "pending",              // draft|pending|approved|rejected|transferred|returned|cancelled
  priority: "high",               // high|medium|low
  purpose: "Foundation work starting next week. Need drilling equipment.",

  items: [{
    itemId: "item_001",
    itemName: "Power Drill (Bosch)",
    itemSku: "PWR-DRL-001",
    itemType: "non_consumable",
    quantityRequested: 3,
    quantityApproved: 3,
    quantityReturned: 0,          // For non-consumables only
    status: "pending"             // pending|approved|transferred
  }],

  processedBy: null,              // Store Incharge user ID
  processedByName: null,
  processedAt: null,
  storeNotes: null,
  rejectionReason: null,
  rejectionComments: null,

  transferredAt: null,
  transferredBy: null,
  receivedByName: null,           // Person who received items

  returnedAt: null,
  returnedBy: null,

  editHistory: [{
    editedBy: "store_id",
    editedByName: "Rajesh Kumar",
    editedAt: Timestamp,
    reason: "Reduced quantity due to available stock",
    changes: [{
      field: "items[1].quantityRequested",
      fieldLabel: "Cement Bags Quantity",
      oldValue: 25,
      newValue: 20
    }]
  }],

  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes Required:**
- `status` + `priority` + `createdAt` (composite for queue sorting)
- `siteId` + `status`
- `requestedBy` + `status`

---

### 1.6 purchaseOrders Collection

```javascript
{
  id: "po_2025_0018",
  poNumber: "PO-2025-0018",
  status: "pending_approval",     // draft|pending_approval|approved|rejected|ordered|received

  vendorId: "vendor_001",
  vendorName: "ABC Building Supplies",
  vendorContact: "+91-9876543210",
  vendorEmail: "abc@vendor.com",
  vendorAddress: "123 Industrial Area, Bangalore",
  vendorGstin: "29ABCDE1234F1Z5",

  items: [{
    itemId: "item_002",
    itemName: "Cement Bags (50kg)",
    itemSku: "CEM-50KG-001",
    isExistingItem: true,         // false if new item
    quantity: 100,
    unitPrice: 350,               // Manually entered
    amount: 35000,
    receivedQuantity: null        // Filled when PO received
  }],

  subtotal: 67500,
  gstPercentage: 18,
  gstAmount: 12150,
  totalAmount: 79650,

  justification: "Cement stock below minimum level. Multiple pending high-priority requests.",
  expectedDeliveryDate: Timestamp,

  documents: [{
    type: "invoice",              // invoice|delivery_note|other
    fileName: "invoice_0015.pdf",
    fileUrl: "https://storage.googleapis.com/...",
    uploadedAt: Timestamp,
    uploadedBy: "store_id"
  }],

  pdfUrl: "https://storage.googleapis.com/.../po_0018.pdf",  // Generated PO PDF

  createdBy: "store_id",
  createdByName: "Rajesh Kumar",
  createdAt: Timestamp,

  reviewedBy: "admin_id",         // For approval/rejection
  reviewedByName: "Company Owner",
  reviewedAt: Timestamp,
  adminComments: "Approved - good pricing",

  orderedAt: null,                // When PO sent to vendor
  orderedBy: null,

  receivedAt: null,
  receivedBy: null,
  receivedNotes: null,

  updatedAt: Timestamp
}
```

**Indexes Required:**
- `status` + `createdAt`
- `vendorId`
- `createdBy`

---

### 1.7 vendors Collection

```javascript
{
  id: "vendor_001",
  name: "ABC Building Supplies",
  contactPerson: "Ramesh Kumar",
  phone: "+91-9876543210",
  email: "abc@vendor.com",
  address: "123 Industrial Area, Bangalore - 560001",
  gstin: "29ABCDE1234F1Z5",
  category: "building_materials",  // building_materials|tools|electrical|plumbing|other
  poCount: 12,                     // Denormalized
  lastPoDate: Timestamp,           // Denormalized
  status: "active",                // active|inactive
  createdAt: Timestamp,
  createdBy: "store_id"
}
```

**Indexes Required:**
- `status` + `name`
- `category`

---

### 1.8 maintenance Collection

```javascript
{
  id: "maint_001",
  itemId: "item_001",
  itemName: "Power Drill (Bosch)",
  itemSku: "PWR-DRL-001",
  quantity: 2,

  issueType: "motor_electrical",   // motor_electrical|physical_damage|wear_tear|missing_parts|other
  issueDescription: "Motor making grinding noise and overheating",
  reportedBy: "Site A - Amit Singh",
  photos: [{
    url: "https://storage.googleapis.com/...",
    uploadedAt: Timestamp
  }],

  status: "under_repair",          // pending|under_repair|ready|returned|written_off

  updates: [{
    note: "Sent to ABC Service Center for diagnosis",
    addedBy: "Rajesh Kumar",
    addedByRole: "store_incharge",
    addedAt: Timestamp
  }],

  returnedAt: null,
  returnedQuantity: null,
  repairSummary: null,
  repairCost: null,
  repairedBy: null,

  writtenOffAt: null,
  writeOffReason: null,
  writeOffComments: null,

  addedBy: "store_id",
  addedByName: "Rajesh Kumar",
  addedAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes Required:**
- `itemId` + `status`
- `status` + `addedAt`

---

### 1.9 activityLogs Collection

```javascript
{
  id: "log_001",
  timestamp: Timestamp,           // Server timestamp - immutable

  userId: "user_abc123",
  userName: "Rajesh Kumar",
  userRole: "store_incharge",

  actionType: "request_edit",
  actionCategory: "requests",     // auth|users|sites|inventory|requests|purchase_orders|maintenance|vendors

  targetType: "request",
  targetId: "req_2025_0045",
  targetDisplay: "REQ-2025-0045",

  summary: "Edited request: Cement qty 25→20",
  details: "Reduced cement quantity due to available stock",

  changes: [{
    field: "items[1].quantityRequested",
    fieldLabel: "Cement Bags Quantity",
    oldValue: 25,
    newValue: 20
  }],

  deviceInfo: "Samsung Galaxy S21",
  ipAddress: "192.168.1.xxx",     // Anonymized for privacy
  appVersion: "1.0.0"
}
```

**Indexes Required:**
- `timestamp` (descending)
- `userId` + `timestamp`
- `actionCategory` + `timestamp`
- `actionType` + `timestamp`

---

## 2. Cloud Functions API Endpoints

### 2.1 Critical APIs with Race Condition Prevention

All inventory-modifying operations use **Firestore Transactions** to prevent race conditions.

#### transferRequest

```javascript
exports.transferRequest = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) throw new Error('Unauthenticated');

  const { requestId } = data;

  return db.runTransaction(async (transaction) => {
    // 1. Read request
    const requestRef = db.collection('requests').doc(requestId);
    const requestDoc = await transaction.get(requestRef);

    // 2. Validate ALL items have sufficient stock
    for (const item of requestDoc.data().items) {
      const itemRef = db.collection('items').doc(item.itemId);
      const itemDoc = await transaction.get(itemRef);

      if (itemDoc.data().centralStoreQuantity < item.quantityApproved) {
        throw new Error(`Insufficient stock for ${item.itemName}`);
      }
    }

    // 3. Update all inventories atomically
    for (const item of requestDoc.data().items) {
      // Decrease central store
      const centralInvRef = db.collection('inventory')
        .where('itemId', '==', item.itemId)
        .where('locationId', '==', 'store');
      const centralInvDocs = await transaction.get(centralInvRef);

      transaction.update(centralInvDocs.docs[0].ref, {
        quantity: admin.firestore.FieldValue.increment(-item.quantityApproved)
      });

      // Increase site inventory
      const siteInvRef = db.collection('inventory')
        .where('itemId', '==', item.itemId)
        .where('locationId', '==', requestDoc.data().siteId);
      const siteInvDocs = await transaction.get(siteInvRef);

      if (siteInvDocs.empty) {
        // Create new inventory record
        const newInvRef = db.collection('inventory').doc();
        transaction.set(newInvRef, {
          itemId: item.itemId,
          itemName: item.itemName,
          itemSku: item.itemSku,
          locationId: requestDoc.data().siteId,
          locationType: 'site',
          locationName: requestDoc.data().siteName,
          quantity: item.quantityApproved,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        transaction.update(siteInvDocs.docs[0].ref, {
          quantity: admin.firestore.FieldValue.increment(item.quantityApproved)
        });
      }

      // Update item totals
      const itemRef = db.collection('items').doc(item.itemId);
      transaction.update(itemRef, {
        centralStoreQuantity: admin.firestore.FieldValue.increment(-item.quantityApproved),
        atSitesQuantity: admin.firestore.FieldValue.increment(item.quantityApproved)
      });
    }

    // 4. Update request status
    transaction.update(requestRef, {
      status: 'transferred',
      transferredAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredBy: context.auth.uid
    });

    // All or nothing - atomic
    return { success: true };
  });
});
```

#### receivePO

```javascript
exports.receivePO = functions.https.onCall(async (data, context) => {
  const { poId, receivedItems, documents } = data;

  return db.runTransaction(async (transaction) => {
    const poRef = db.collection('purchaseOrders').doc(poId);
    const poDoc = await transaction.get(poRef);

    // Update inventory for each received item
    for (const receivedItem of receivedItems) {
      const itemRef = db.collection('items').doc(receivedItem.itemId);

      // Increase central store quantity
      transaction.update(itemRef, {
        centralStoreQuantity: admin.firestore.FieldValue.increment(receivedItem.quantity),
        totalQuantity: admin.firestore.FieldValue.increment(receivedItem.quantity)
      });

      // Update central store inventory
      const invRef = db.collection('inventory')
        .where('itemId', '==', receivedItem.itemId)
        .where('locationId', '==', 'store');
      const invDocs = await transaction.get(invRef);

      transaction.update(invDocs.docs[0].ref, {
        quantity: admin.firestore.FieldValue.increment(receivedItem.quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Mark PO as received
    transaction.update(poRef, {
      status: 'received',
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      receivedBy: context.auth.uid,
      documents: documents
    });

    return { success: true };
  });
});
```

---

### 2.2 Complete API List

| Endpoint | Method | Access | Purpose | Transaction |
|----------|--------|--------|---------|-------------|
| **Auth** |
| changePassword | POST | All | Change own password | No |
| **Users** |
| createUser | POST | Admin | Create new user | No |
| updateUser | PUT | Admin | Update user/disable | No |
| listUsers | GET | Admin | List all users | No |
| **Sites** |
| createSite | POST | Admin | Create site | No |
| updateSite | PUT | Admin | Update site | No |
| listSites | GET | All | List sites | No |
| **Items** |
| createItem | POST | Store/Admin | Add new item | Yes |
| updateItem | PUT | Store/Admin | Update item | No |
| adjustQuantity | POST | Store/Admin | Adjust with reason | Yes |
| listItems | GET | Store/Admin | List central inventory | No |
| **Inventory** |
| getInventory | GET | All | Get by location | No |
| **Requests** |
| createRequest | POST | Site Mgr | Create request | No |
| editRequest | PUT | Store/Admin | Edit any request | No |
| approveRequest | POST | Store/Admin | Approve | Yes |
| rejectRequest | POST | Store/Admin | Reject | No |
| transferRequest | POST | Store/Admin | Confirm transfer | **Yes** |
| returnItems | POST | Site Mgr | Return items | Yes |
| listRequests | GET | All | List (filtered by role) | No |
| **POs** |
| createPO | POST | Store/Admin | Create PO | No |
| approvePO | POST | Admin | Approve PO | No |
| rejectPO | POST | Admin | Reject PO | No |
| receivePO | POST | Store/Admin | Mark received | **Yes** |
| generatePdf | GET | Store/Admin | Generate PDF | No |
| **Vendors** |
| createVendor | POST | Store/Admin | Add vendor | No |
| updateVendor | PUT | Store/Admin | Update vendor | No |
| listVendors | GET | Store/Admin | List vendors | No |
| **Maintenance** |
| addToMaintenance | POST | Store/Admin | Add item | Yes |
| returnFromMaint | POST | Store/Admin | Return item | Yes |
| writeOff | POST | Store/Admin | Write off | Yes |
| listMaintenance | GET | Store/Admin | List items | No |
| **Logs** |
| listLogs | GET | Admin | Activity logs | No |
| exportLogs | GET | Admin | Export CSV | No |

---

## 3. Security Rules

### 3.1 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }

    function isStoreIncharge() {
      return isAuthenticated() && getUserRole() == 'store_incharge';
    }

    function isSiteManager() {
      return isAuthenticated() && getUserRole() == 'site_manager';
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && (isAdmin() || request.auth.uid == userId);
      allow write: if false;  // Only via Cloud Functions
    }

    // Sites collection
    match /sites/{siteId} {
      allow read: if isAuthenticated();
      allow write: if false;  // Only via Cloud Functions
    }

    // Items collection
    match /items/{itemId} {
      // Site managers CANNOT read items (central store)
      allow read: if isAuthenticated() && (isAdmin() || isStoreIncharge());
      allow write: if false;  // Only via Cloud Functions
    }

    // Inventory collection
    match /inventory/{invId} {
      allow read: if isAuthenticated() &&
        (isAdmin() || isStoreIncharge() ||
         (isSiteManager() && resource.data.locationType == 'site'));
      allow write: if false;  // Only via Cloud Functions
    }

    // Requests collection
    match /requests/{requestId} {
      allow read: if isAuthenticated() &&
        (isAdmin() || isStoreIncharge() ||
         (isSiteManager() && resource.data.requestedBy == request.auth.uid));
      allow write: if false;  // Only via Cloud Functions
    }

    // Purchase Orders collection
    match /purchaseOrders/{poId} {
      allow read: if isAuthenticated() && (isAdmin() || isStoreIncharge());
      allow write: if false;  // Only via Cloud Functions
    }

    // Vendors collection
    match /vendors/{vendorId} {
      allow read: if isAuthenticated() && (isAdmin() || isStoreIncharge());
      allow write: if false;  // Only via Cloud Functions
    }

    // Maintenance collection
    match /maintenance/{maintId} {
      allow read: if isAuthenticated() && (isAdmin() || isStoreIncharge());
      allow write: if false;  // Only via Cloud Functions
    }

    // Activity Logs collection
    match /activityLogs/{logId} {
      allow write: if false;  // Only Cloud Functions can write
      allow read: if isAuthenticated() &&
        (isAdmin() || resource.data.userId == request.auth.uid);
    }
  }
}
```

---

## 4. Race Condition Prevention

### 4.1 Critical Scenarios

**Scenario 1: Concurrent Request Approvals**
- Two requests approved simultaneously for same items
- Without transaction: Both might succeed even if stock insufficient for both
- **Solution:** Firestore transaction validates total stock before all updates

**Scenario 2: Concurrent Quantity Adjustments**
- Store Incharge adjusts quantity while PO receipt happens
- Without transaction: Final quantity could be incorrect
- **Solution:** All quantity changes in transactions with read-modify-write pattern

**Scenario 3: Request Transfer During PO Receipt**
- Request being fulfilled while new stock arrives
- Without transaction: Stock count could be wrong
- **Solution:** Both operations use transactions that read current state first

---

## 5. Implementation Best Practices

### 5.1 Denormalization Strategy

**Why Denormalize:**
- Reduce read operations
- Faster dashboard loads
- Better offline support

**Denormalized Fields:**
- `siteName` in requests (from sites collection)
- `itemName`, `itemSku` in inventory (from items collection)
- `categoryName` in items (from categories collection)
- `managerName` in sites (from users collection)
- Stock counts in items (from inventory collection)

**Update Strategy:**
- Cloud Functions update denormalized data
- Use batched writes when updating multiple documents

### 5.2 Image Upload Strategy

```javascript
// 1. Client requests signed URL
const { signedUrl } = await getUploadUrl({ fileName, contentType });

// 2. Client uploads directly to Cloud Storage
await fetch(signedUrl, {
  method: 'PUT',
  body: imageBlob,
  headers: { 'Content-Type': contentType }
});

// 3. Client calls Cloud Function with file path
await updateItemImage({ itemId, imageUrl });
```

### 5.3 Offline Support

- Firestore offline persistence enabled
- Critical data cached on app launch
- Queue operations when offline
- Sync when connection restored
- Show offline indicator in UI

---

## 6. Performance Optimization

### 6.1 Indexes

All composite queries require indexes. Key indexes:
- `requests`: status + priority + createdAt
- `items`: status + centralStoreQuantity (low stock)
- `activityLogs`: userId + timestamp

### 6.2 Query Limits

- Dashboard queries limited to last 30 days
- Request lists limited to 50 per page
- Activity logs limited to 100 per page
- Use cursor-based pagination for all lists

### 6.3 Cloud Function Optimization

- Keep functions warm with scheduled pings
- Use connection pooling for database
- Cache reference data (categories, units)
- Minimize cold start impact

---

**End of Technical Documentation**
