# Inventory Item Deletion — Implementation Plan

**Feature:** Expose item deletion in UI with pre-delete validation, confirmation dialog, and proper cleanup.

**Target:** CIAMS Asset Manager (React Native + Firestore)

---

## 1. Delete Rules Summary

| Condition | Allow Delete? |
|-----------|---------------|
| `totalQuantity === 0` | ✅ Yes (no stock anywhere) |
| `atSitesQuantity === 0` AND `inMaintenanceQuantity === 0` | ✅ Yes (all stock in central store — "added by mistake" case) |
| `atSitesQuantity > 0` OR `inMaintenanceQuantity > 0` | ❌ No |
| Item in draft PO | ❌ No |
| Item in pending/approved request | ❌ No |
| Item in active maintenance (`pending` or `partial_return`) | ❌ No |

**Who can delete:** Admin and Store Incharge (same as edit — `canEditItem`)

---

## 2. File-by-File Changes

### 2.1 New Service: `checkCanDeleteItem`

**File:** `src/services/firebase/inventoryDeletionService.ts` (NEW)

**Purpose:** Pre-delete validation — checks stock rules and related document references.

**Add:**
- `ItemDeletionBlockReason` interface
- `checkCanDeleteItem(itemId: string, item: { totalQuantity: number; atSitesQuantity: number; inMaintenanceQuantity: number })` function

**Logic:**
1. **Stock check:** If `atSitesQuantity > 0` OR `inMaintenanceQuantity > 0` → block with reason.
2. **Draft POs:** Query `purchaseOrders` where `status == 'draft'` and `items` array contains `itemId`. Return `draftPoNumbers`.
3. **Pending/approved requests:** Query `requests` where `status in ['pending','approved']` and `items` array contains element with `itemId`. Return `pendingRequestNumbers`.
4. **Active maintenance:** Query `maintenance` where `status in ['pending','partial_return']` and `itemId == itemId`. Return `activeMaintenanceIds`.
5. If any block found → `{ canDelete: false, reason, ... }`. Else → `{ canDelete: true }`.

**Firestore queries (exact):**

```typescript
// Draft POs — purchaseOrders collection
// Firestore does not support array-contains on nested fields. Options:
// A) Query all draft POs, filter in memory for items containing itemId
// B) Add items.itemIds subcollection or map — not ideal
// Recommended: getDocs where status=='draft', then filter docs where items.some(i => i.itemId === itemId)

// Pending/approved requests — requests collection
// Same: getDocs where status in ['pending','approved'], filter where items.some(i => i.itemId === itemId)

// Active maintenance — maintenance collection
// Direct: where('itemId','==',itemId).where('status','in',['pending','partial_return'])
// Note: Firestore 'in' limited to 10 values; we have 2, so OK.
```

**Export:** Add to `src/services/firebase/index.ts` if such a barrel exists, or import directly where needed.

---

### 2.2 Update `deleteItem` in `inventoryService.ts`

**File:** `src/services/firebase/inventoryService.ts`

**Change:** Replace stock check (lines 1032–1035) with:

```typescript
// Allow when: totalQuantity === 0 OR (atSitesQuantity === 0 AND inMaintenanceQuantity === 0)
const totalQty = itemData.totalQuantity || 0;
const atSites = itemData.atSitesQuantity || 0;
const inMaint = itemData.inMaintenanceQuantity || 0;
const hasStockAtSitesOrMaint = atSites > 0 || inMaint > 0;
if (hasStockAtSitesOrMaint) {
  throw new Error('Cannot delete item with stock at sites or in maintenance. Reduce stock to zero or move all to central store first.');
}
```

**Optional (defense-in-depth):** Call `checkCanDeleteItem` inside `deleteItem` before the transaction. If `!canDelete`, throw with `reason`. This adds server-side validation but requires importing the new service and passing item data. **Recommendation:** Keep client-only for UX (client checks first, shows clear message); server-side stock check is sufficient for safety.

---

### 2.3 ItemDetailScreen — Delete Button and Flow

**File:** `src/screens/Inventory/ItemDetailScreen.tsx`

**Add:**
1. Import: `deleteItem` from `inventoryThunks`, `checkCanDeleteItem` from `inventoryDeletionService`.
2. State: `[isDeleting, setIsDeleting]` (optional, for loading state on delete button).
3. Compute: `canDeleteItem = canEditItem && (item.totalQuantity === 0 || (item.atSitesQuantity === 0 && item.inMaintenanceQuantity === 0))` — show Delete button only when this is true.
4. Handler: `handleDeletePress`:
   - Call `checkCanDeleteItem(itemId, item)`.
   - If `!result.canDelete` → `Alert.alert('Cannot Delete', result.reason)`.
   - If `result.canDelete` → show confirmation `Alert.alert`, then `dispatch(deleteItem(itemId))`, on success navigate back and show success.
5. UI: Add "Delete Item" button (e.g. in a danger-styled card at bottom, or in header as secondary action). Use CIAMS design: `border-[#DC2626]`, `text-[#DC2626]`, `bg-[#DC2626]/15` for danger.

**Confirmation dialog text:**
```
Title: "Delete Item"
Message: "Delete [Item Name]? This cannot be undone. Historical POs and maintenance records will keep the item name for reference."
Buttons: Cancel (cancel), Delete (destructive, onPress: execute delete)
```

**Placement:** Add a "Danger Zone" card at bottom of ScrollView (after adjustment section), with Delete button. Only visible when `canDeleteItem`.

---

### 2.4 Redux — Already Handled

**File:** `src/store/slices/inventorySlice.ts`

**No change needed.** `deleteItem.fulfilled` already:
- Removes item from `state.items`
- Removes from `state.lowStockItemIds`
- Cleans `state.inventoryByLocation` entries for this item

**File:** `src/store/thunks/inventoryThunks.ts`

**No change needed.** `deleteItem` thunk exists and calls `deleteItemService`.

---

### 2.5 Firestore Index

**File:** `firestore.indexes.json`

**Add:** Composite index for maintenance query (itemId + status):
```json
{
  "collectionGroup": "maintenance",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "itemId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

### 2.6 Firestore Rules

**File:** `firestore.rules`

**No change needed.** Items delete rule already:
```
allow delete: if hasInventoryAccess();
```
`hasInventoryAccess()` = Admin or Store Incharge. No additional rules required.

---

## 3. New Functions / APIs

| Function | Location | Purpose |
|----------|----------|---------|
| `checkCanDeleteItem(itemId, item)` | `inventoryDeletionService.ts` | Pre-delete validation: stock + draft POs + pending requests + active maintenance |

**Interface:**
```typescript
export interface ItemDeletionBlockReason {
  canDelete: boolean;
  reason?: string;
  draftPoNumbers?: string[];
  pendingRequestNumbers?: string[];
  activeMaintenanceIds?: string[];
}
```

**Error messages (when blocking):**
- Stock: `"Cannot delete: item has stock at sites or in maintenance. Reduce stock to zero or move all to central store first."`
- Draft PO: `"Cannot delete: item is in draft PO(s): [PO-2025-0012, ...]. Remove from draft PO first or delete the PO."`
- Pending request: `"Cannot delete: item is in pending/approved request(s): [REQ-2025-0045, ...]. Complete or reject the request first."`
- Active maintenance: `"Cannot delete: item is in active maintenance record(s). Return or write off the maintenance record first."`

---

## 4. Firestore Queries (Detailed)

### 4.1 Draft POs

- **Collection:** `purchaseOrders`
- **Query:** `where('status','==','draft')` — get all draft POs
- **Filter in memory:** `doc.data().items?.some((i: any) => i.itemId === itemId)`
- **Return:** `poNumber` for each matching PO

### 4.2 Pending/Approved Requests

- **Collection:** `requests`
- **Query:** Two queries (or one with `in`): `where('status','in',['pending','approved'])`
- **Filter in memory:** `doc.data().items?.some((i: any) => i.itemId === itemId)`
- **Return:** `requestNumber` for each matching request

### 4.3 Active Maintenance

- **Collection:** `maintenance`
- **Query:** `where('itemId','==',itemId).where('status','in',['pending','partial_return'])`
- **Composite index:** Required. Add to `firestore.indexes.json` (no existing maintenance index for itemId+status):
```json
{
  "collectionGroup": "maintenance",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "itemId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```
- **Return:** `id` for each matching maintenance record (or a user-friendly identifier if available)

---

## 5. UI Component Structure

### ItemDetailScreen Layout (after changes)

```
ScreenLayout
├── ScreenHeader (title, back, rightAction: Edit)
├── ScrollView
│   ├── Image Section
│   ├── Name + StockStatusBadge
│   ├── Basic Information Card
│   ├── Stock Distribution Card
│   ├── Adjustment Section (Add/Reduce/Enter Stock)
│   ├── Request Access Banner (conditional)
│   └── Danger Zone Card (NEW — only when canDeleteItem)
│       ├── Text: "Delete this item permanently"
│       └── TouchableOpacity "Delete Item" (danger style)
├── InventoryAdjustmentModal
└── RequestInventoryAccessModal
```

### Confirmation Flow

- Use `Alert.alert` (consistent with EditRequestScreen, CreatePOScreen, WriteOffScreen).
- No new Modal component needed for confirmation — Alert is sufficient per CIAMS patterns.

### Delete Button Styling (CIAMS)

```tsx
<TouchableOpacity
  className="border border-[#DC2626] rounded-[10px] h-[50px] items-center justify-center"
  onPress={handleDeletePress}
>
  <Text className="text-[15px] font-semibold text-[#DC2626]">Delete Item</Text>
</TouchableOpacity>
```

---

## 6. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Item in `partial_return` maintenance | Block — status in `['pending','partial_return']` query |
| Item in multiple draft POs | Block — return all `draftPoNumbers`, show in message |
| Item in multiple pending requests | Block — return all `pendingRequestNumbers`, show in message |
| SKU uniqueness after delete | Already handled: `deleteItem` deletes `skus/{sku}` doc, so SKU becomes available |
| Firestore rules for item delete | Already allow `hasInventoryAccess()` — no change |
| Redux state cleanup after delete | Already in `deleteItem.fulfilled` — removes item, lowStockItemIds, inventoryByLocation |
| Navigation after delete | On success: `navigation.goBack()` and optional success Alert |
| Real-time subscription | `subscribeItemById` will stop when item is deleted (document removed). Component may unmount on navigate back before that. No extra cleanup needed. |

---

## 7. Test Cases to Add

### 7.1 `checkCanDeleteItem` (unit)

**File:** `src/services/firebase/__tests__/inventoryDeletionService.test.ts` (NEW)

- `checkCanDeleteItem` returns `canDelete: true` when item has totalQuantity 0 and no related docs
- `checkCanDeleteItem` returns `canDelete: true` when atSitesQuantity 0, inMaintenanceQuantity 0, totalQuantity > 0 (mock no related docs)
- `checkCanDeleteItem` returns `canDelete: false` when atSitesQuantity > 0
- `checkCanDeleteItem` returns `canDelete: false` when inMaintenanceQuantity > 0
- `checkCanDeleteItem` returns `canDelete: false` with draftPoNumbers when item in draft PO
- `checkCanDeleteItem` returns `canDelete: false` with pendingRequestNumbers when item in pending request
- `checkCanDeleteItem` returns `canDelete: false` with activeMaintenanceIds when item in pending maintenance
- `checkCanDeleteItem` returns `canDelete: false` when item in partial_return maintenance

### 7.2 ItemDetailScreen (component)

**File:** `src/screens/Inventory/__tests__/ItemDetailScreen.test.tsx`

- Delete button is visible when user is Admin and item has totalQuantity 0
- Delete button is visible when user is Store Incharge and item has totalQuantity 0
- Delete button is NOT visible when user is Site Manager
- Delete button is NOT visible when item has atSitesQuantity > 0
- Delete button is NOT visible when item has inMaintenanceQuantity > 0
- Delete button press: when checkCanDeleteItem returns block, shows Alert with reason
- Delete button press: when checkCanDeleteItem returns canDelete, shows confirmation Alert
- Delete confirmation: on Confirm, dispatches deleteItem and navigates back on success

### 7.3 `deleteItem` service (optional)

**File:** `src/services/firebase/__tests__/inventoryService.test.ts` (if exists)

- `deleteItem` throws when atSitesQuantity > 0
- `deleteItem` throws when inMaintenanceQuantity > 0
- `deleteItem` succeeds when totalQuantity 0
- `deleteItem` succeeds when atSitesQuantity 0 and inMaintenanceQuantity 0 (even if totalQuantity > 0)

---

## 8. Order of Implementation Steps

1. **Add Firestore index** to `firestore.indexes.json` for maintenance (itemId + status). Deploy with `firebase deploy --only firestore:indexes` if needed.
2. **Create `inventoryDeletionService.ts`** with `checkCanDeleteItem` and Firestore queries.
3. **Update `deleteItem` in `inventoryService.ts`** — change stock check to allow `atSitesQuantity === 0 && inMaintenanceQuantity === 0`.
4. **Update `ItemDetailScreen.tsx`** — add Delete button, `handleDeletePress`, confirmation flow, Danger Zone card.
5. **Add unit tests** for `checkCanDeleteItem`.
6. **Add/update ItemDetailScreen tests** for delete button visibility and flow.
7. **Manual QA** — verify delete works, blocks correctly, and Redux/Firestore stay consistent.

---

## 9. Dependencies

- No new npm packages.
- Uses existing: `@react-navigation`, `react-native` Alert, Firestore `getDocs`/`query`/`where`, Redux `dispatch`.

---

## 10. Rollback

If issues arise:
- Remove Delete button and handler from ItemDetailScreen.
- Revert `deleteItem` stock check to original (`totalQuantity > 0`).
- Remove or disable `inventoryDeletionService.ts` (no other code depends on it if only used by ItemDetailScreen).
