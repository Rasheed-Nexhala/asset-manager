# Missing Activity Logs Implementation Plan

**Created:** 2025-02-22  
**Scope:** Add missing activity logs for Purchase Orders, Vendors, quantity_adjusted, and clarify item_transferred.

---

## Constraints (Non-Negotiable)

- **All logs MUST be created server-side** (Cloud Functions only)
- **No client writes** to `activityLogs` collection
- **Follow existing patterns:** `createActivityLog` helper, Firestore triggers, callable functions

---

## 1. Purchase Orders (collection: `purchaseOrders`)

### 1.1 PO Status Values and Action Type Mapping

| PO Status (Firestore) | Action Type | When |
|-----------------------|-------------|------|
| `draft` | — | Initial creation (draft) |
| `pending_approval` | — | Submitted for approval |
| `approved` | `po_approved` | Admin approves |
| `rejected` | `po_rejected` | Admin rejects |
| `ordered` | `po_ordered` | Admin/Store Incharge marks as sent to vendor |
| `received` | `po_received` | Store Incharge receives goods |

**Status flow:** `draft` → `pending_approval` → `approved` → `ordered` → `received`  
**Alternative:** `pending_approval` → `rejected`

### 1.2 Triggers to Add

#### A. `onDocumentCreated('purchaseOrders/{poId}')` → `po_created`

- **When:** New PO document created
- **User:** `createdBy`, `createdByName`, `createdByRole` (or `system` if missing)
- **Summary:** `Created PO: {poNumber}`
- **Details:** `PO for {vendorName}, {items.length} items, ₹{totalAmount}`
- **Target:** `targetType: 'purchase_order'`, `targetId: poId`, `targetDisplay: poNumber`

#### B. `onDocumentUpdated('purchaseOrders/{poId}')` → Status-based logs

- **When:** `before.status !== after.status`
- **Action mapping:**
  - `after.status === 'approved'` → `po_approved`
  - `after.status === 'rejected'` → `po_rejected`
  - `after.status === 'ordered'` → `po_ordered`
  - `after.status === 'received'` → `po_received`
- **User:** `reviewedBy`/`reviewedByName` for approve/reject; `receivedBy`/`receivedByName` for receive; `updatedBy` or `createdBy` for ordered
- **Summary examples:**
  - `po_approved`: `Approved PO: {poNumber}`
  - `po_rejected`: `Rejected PO: {poNumber}`
  - `po_ordered`: `Marked PO as ordered: {poNumber}`
  - `po_received`: `Received PO: {poNumber}`
- **Changes:** `{ field: 'status', fieldLabel: 'Status', oldValue: before.status, newValue: after.status }`

**Note:** Do NOT log when status changes from `draft` → `pending_approval` (that's a submit, not a distinct action type in the spec). Only log the four status transitions above.

### 1.3 File to Modify

| File | Change |
|------|--------|
| `asset-manager/functions/src/index.ts` | Add `onPurchaseOrderCreated`, `onPurchaseOrderUpdated` |

---

## 2. Vendors (collection: `vendors`)

### 2.1 Triggers to Add

#### A. `onDocumentCreated('vendors/{vendorId}')` → `vendor_created`

- **When:** New vendor document created
- **User:** `createdBy`/`createdByName` (if present) or `system`
- **Summary:** `Created vendor: {name}`
- **Details:** `{category}, {contactPerson}`
- **Target:** `targetType: 'vendor'`, `targetId: vendorId`, `targetDisplay: name`

**Note:** Vendor schema may not have `createdBy`; check `vendorService.createVendor`. If absent, use `system` / `System` / `Admin`.

#### B. `onDocumentUpdated('vendors/{vendorId}')` → `vendor_updated`

- **When:** Vendor document updated
- **Fields to track in `changes` array:**

| Field | Field Label | Notes |
|-------|-------------|-------|
| `name` | Name | |
| `contactPerson` | Contact Person | |
| `phone` | Phone | |
| `email` | Email | |
| `address` | Address | |
| `gstin` | GSTIN | |
| `category` | Category | |
| `status` | Status | active/inactive |

**Exclude from changes:** `poCount`, `lastPoDate`, `createdAt`, `updatedAt` (system-managed)

**Important:** `incrementVendorPoCount` and `updateVendorLastPoDate` also update the vendor doc (when POs are created/received). Only log `vendor_updated` when **user-editable** fields change (`name`, `contactPerson`, `phone`, `email`, `address`, `gstin`, `category`, `status`). If only `poCount`, `lastPoDate`, or `updatedAt` changed, **do not log** (skip the trigger).

- **User:** `updatedBy`/`updatedByName` (if present) or `system`
- **Summary:** `Updated vendor: {name}`
- **Details:** `Modified {changes.length} field(s)`

**Note:** Vendor schema may not have `updatedBy`; check `vendorService` update. If absent, use `system`.

### 2.2 File to Modify

| File | Change |
|------|--------|
| `asset-manager/functions/src/index.ts` | Add `onVendorCreated`, `onVendorUpdated` |

### 2.3 Vendor Schema Check

From `src/types/vendor.ts` and `vendorService.ts`:
- `FirestoreVendor` has: `id`, `name`, `contactPerson`, `phone`, `email`, `address`, `gstin`, `category`, `poCount`, `lastPoDate`, `status`, `createdAt`, `updatedAt`
- **No `createdBy` or `updatedBy`** in the type. Use `system` for both triggers until/unless those fields are added.

---

## 3. quantity_adjusted (inventory)

### 3.1 Context

- **Source:** `inventoryService.adjustQuantity()` — client-side Firestore transaction
- **Writes to:** `inventory` collection (and item denormalized totals)
- **Does NOT write to:** `inventoryAdjustments` (mentioned in rules but not used in current implementation)

**Other operations that update `inventory`:**
- `receivePO` — adds stock when PO is received
- `transferRequest` — moves stock store → site
- `returnItems` — moves stock site → store/maintenance

### 3.2 Options

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A** | Firestore trigger on `inventory/{inventoryId}` | Automatic, no client change | **Cannot distinguish** manual adjustment from PO receive, transfer, or return. Would log duplicates/incorrect action types. |
| **B** | Callable `logQuantityAdjusted` called by client after `adjustQuantity` succeeds | Clear intent, only manual adjustments logged | Requires client to call function; if call fails, log may be missing (but main op succeeded). |

### 3.3 Recommendation: **Option B — Callable Function**

**Rationale:**
1. **Intent clarity:** Only manual adjustments via `adjustQuantity` should produce `quantity_adjusted`. PO receive, transfer, and return have their own logs (`po_received`, `request_transferred`, `items_returned`).
2. **No ambiguity:** A trigger on `inventory` cannot know the source of the change.
3. **Consistency:** Matches existing callable pattern (`logAuthEvent`, `logPasswordChanged`).
4. **Client change is minimal:** One line in `inventoryThunks.adjustQuantity` after success: call `logQuantityAdjusted` with `adjustmentData` and user info.

### 3.4 Implementation

#### Cloud Function: `logQuantityAdjusted`

- **Type:** `onCall` (callable)
- **Auth:** Required
- **Input:** `{ itemId, itemName, itemSku, locationId, locationName, type, quantity, reason, notes, oldQuantity, newQuantity }`
- **Behavior:** Call `createActivityLog` with:
  - `actionType: 'quantity_adjusted'`
  - `actionCategory: 'inventory'`
  - `targetType: 'item'`
  - `targetId: itemId`
  - `targetDisplay: {itemName} ({itemSku})`
  - `summary: Adjusted quantity: {oldQuantity}→{newQuantity} ({type === 'add' ? '+' : '-'}{quantity})`
  - `details: {reason}. {notes}`
  - `changes: [{ field: 'quantity', fieldLabel: 'Quantity', oldValue: oldQuantity, newValue: newQuantity }]`

#### Client Change

- **File:** `asset-manager/src/store/thunks/inventoryThunks.ts`
- **Change:** After `adjustQuantityService(adjustmentData)` succeeds, call `logQuantityAdjusted` (via Firebase `httpsCallable`) with the adjustment payload. Use `getState()` for user info.
- **File:** `asset-manager/src/services/firebase/activityLogService.ts` or new `logQuantityAdjusted` wrapper — add a function that calls the callable. Or call directly from thunk via `getFunctions`, `httpsCallable`.

**Note:** Client does NOT write to `activityLogs`; it only invokes the callable. The callable creates the log server-side.

### 3.5 Files to Modify

| File | Change |
|------|--------|
| `asset-manager/functions/src/index.ts` | Add `logQuantityAdjusted` callable |
| `asset-manager/src/store/thunks/inventoryThunks.ts` | After `adjustQuantity` success, call `logQuantityAdjusted` |
| `asset-manager/src/services/firebase/*` | Add `logQuantityAdjusted` callable wrapper (or use existing Firebase call pattern) |

---

## 4. item_transferred

### 4.1 Clarification

- **`request_transferred`:** Already implemented. Fired when a request's status changes to `transferred` (Store Incharge confirms physical transfer of items to site). Logged by `onRequestUpdated` trigger.
- **`item_transferred`:** Spec says "Item moved between locations" — implies a **direct transfer** between locations (e.g., store → site, or site A → site B) **without** going through a request.

### 4.2 Does Direct Transfer Exist?

**Finding:** No. The only transfer flow in CIAMS is:
- **Request flow:** Create request → Approve → Transfer (Store Incharge confirms) → `request_transferred` is logged.

There is **no** "direct transfer between locations" feature (e.g., admin moving stock from store to site without a request).

### 4.3 Recommendation

1. **Defer `item_transferred`** until a direct-transfer feature is built.
2. **Document:** `item_transferred` is reserved for future "direct location-to-location transfer" (e.g., store → site, site → site) that does not go through the request workflow.
3. **Keep** `item_transferred` in `activityLogConfig` and `ActionType` for UI consistency, but no server-side log will be created until the feature exists.
4. **Alternative:** If product owner confirms that `item_transferred` and `request_transferred` are the same concept, we could alias: when `request_transferred` fires, also log an `item_transferred` for each item. This would be redundant and is **not recommended** — keep them distinct.

---

## 5. Implementation Order

| Phase | Scope | Effort | Dependencies |
|-------|-------|--------|--------------|
| **Phase 1** | PO + Vendors triggers | Low | None |
| **Phase 2** | quantity_adjusted callable + client integration | Medium | None |
| **Phase 3** | item_transferred | N/A | Deferred until direct-transfer feature exists |

**Suggested order:**
1. **Phase 1a:** Purchase Order triggers (`onPurchaseOrderCreated`, `onPurchaseOrderUpdated`)
2. **Phase 1b:** Vendor triggers (`onVendorCreated`, `onVendorUpdated`)
3. **Phase 2:** `logQuantityAdjusted` callable + client call from `adjustQuantity` thunk

---

## 6. Files to Modify (Summary)

| File | Phase | Change |
|-----|-------|--------|
| `asset-manager/functions/src/index.ts` | 1a, 1b, 2 | Add PO triggers, Vendor triggers, `logQuantityAdjusted` callable |
| `asset-manager/src/store/thunks/inventoryThunks.ts` | 2 | Call `logQuantityAdjusted` after `adjustQuantity` succeeds |
| `asset-manager/src/services/firebase/*` | 2 | Add `logQuantityAdjusted` callable wrapper (e.g., in `activityLogService.ts` or new `callableService.ts`) |

**No changes needed:**
- `activityLogConfig.ts` — PO, vendor, quantity_adjusted, item_transferred already defined
- `activityLog.ts` types — action types already defined
- Firestore rules — `activityLogs` already writable by Cloud Functions (admin)

---

## 7. Code-Level Guidance

### 7.1 PO Created Trigger (Pseudocode)

```ts
export const onPurchaseOrderCreated = onDocumentCreated(
  'purchaseOrders/{poId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const po = snapshot.data();
    const poId = event.params.poId;
    const itemsCount = Array.isArray(po.items) ? po.items.length : 0;
    await createActivityLog({
      userId: po.createdBy ?? 'system',
      userName: po.createdByName ?? 'System',
      userRole: (po.createdByRole as string) ?? 'Admin',
      actionType: 'po_created',
      actionCategory: 'purchase_orders',
      targetType: 'purchase_order',
      targetId: poId,
      targetDisplay: po.poNumber ?? `PO-${poId}`,
      summary: `Created PO: ${po.poNumber ?? poId}`,
      details: `PO for ${po.vendorName ?? 'vendor'}, ${itemsCount} items, ₹${po.totalAmount ?? 0}`,
      changes: [],
    });
  }
);
```

### 7.2 PO Updated Trigger (Status-Change Logic)

```ts
// Only log when status changes to approved, rejected, ordered, received
if (before.status !== after.status) {
  const statusActionMap: Record<string, string> = {
    approved: 'po_approved',
    rejected: 'po_rejected',
    ordered: 'po_ordered',
    received: 'po_received',
  };
  const actionType = statusActionMap[after.status];
  if (!actionType) return; // e.g. draft→pending_approval: no log

  const userId = after.status === 'received'
    ? (after.receivedBy ?? 'system')
    : (after.reviewedBy ?? after.createdBy ?? 'system');
  const userName = after.status === 'received'
    ? (after.receivedByName ?? 'System')
    : (after.reviewedByName ?? after.createdByName ?? 'System');
  // ... createActivityLog
}
```

### 7.3 Vendor Triggers

- Follow `onSiteCreated` / `onSiteUpdated` pattern.
- For `onVendorUpdated`, compare: `name`, `contactPerson`, `phone`, `email`, `address`, `gstin`, `category`, `status`.
- Skip if `changes.length === 0`.

### 7.4 logQuantityAdjusted Callable

- Validate required fields: `itemId`, `itemName`, `itemSku`, `locationId`, `locationName`, `type`, `quantity`, `reason`, `notes`, `oldQuantity`, `newQuantity`.
- Validate `type` is `'add'` or `'remove'`.
- Use `request.auth.uid`, `request.auth.token.name` for user if not passed.

---

## 8. Export and Deployment

Ensure new Cloud Functions are exported in `functions/src/index.ts`:

```ts
export {
  onPurchaseOrderCreated,
  onPurchaseOrderUpdated,
  onVendorCreated,
  onVendorUpdated,
  logQuantityAdjusted,
  // ... existing exports
};
```

Deploy: `firebase deploy --only functions`

---

## 9. Testing Checklist

- [ ] Create PO (draft or pending_approval) → `po_created` log
- [ ] Approve PO → `po_approved` log
- [ ] Reject PO → `po_rejected` log
- [ ] Mark PO ordered → `po_ordered` log
- [ ] Receive PO → `po_received` log
- [ ] Create vendor → `vendor_created` log
- [ ] Update vendor (change name, phone, etc.) → `vendor_updated` log with correct changes
- [ ] Manual quantity adjustment → `quantity_adjusted` log (via callable)
- [ ] Verify PO receive does NOT create `quantity_adjusted`
- [ ] Verify request transfer does NOT create `quantity_adjusted`
