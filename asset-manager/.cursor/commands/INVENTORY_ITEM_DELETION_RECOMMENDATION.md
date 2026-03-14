# Inventory Item Deletion — Synthesized Recommendation

**Context:** Debate between Agent A (Restrictive) and Agent B (Flexible) on inventory item deletion in CIAMS Asset Manager.

---

## Implementation Status (Completed)

The following has been implemented:

- **`inventoryDeletionService.ts`** — `checkCanDeleteItem()` with Firestore queries for draft POs, pending requests, active maintenance
- **`deleteItem`** — Stock check updated: allow when `atSitesQuantity === 0` AND `inMaintenanceQuantity === 0` (handles "added by mistake" case)
- **ItemDetailScreen** — Danger Zone card with Delete button, confirmation flow, `checkCanDeleteItem` integration
- **Firestore index** — `maintenance` (itemId + status) for active maintenance query
- **Tests** — `inventoryDeletionService.test.ts`, ItemDetailScreen delete visibility tests

---

## 1. Redundancy Resolution (Stock Check)

**Recommendation:** Use **`totalQuantity === 0` only**.

**Rationale:**  
`totalQuantity = centralStoreQuantity + atSitesQuantity + inMaintenanceQuantity`. If `totalQuantity === 0`, all three components must be 0. Checking `atSitesQuantity` and `inMaintenanceQuantity` separately is redundant.

**Implementation:** Current `deleteItem` in `inventoryService.ts` already uses this (line 1033). No change needed.

```typescript
// Current (correct)
if ((itemData.totalQuantity || 0) > 0) {
  throw new Error('Cannot delete item with active stock. Please reduce stock to zero first.');
}
```

---

## 2. WHO Can Delete (Roles)

**Recommendation:** **Admin and Store Incharge** — no extra confirmation for Store Incharge.

**Rationale:**
- Firestore rules already allow `hasInventoryAccess()` (Admin OR Store Incharge) for `items` delete.
- Store Incharge manages day-to-day inventory; blocking delete adds friction without clear benefit.
- If stricter control is needed later, add an optional "Admin approval for delete" flow rather than blocking Store Incharge entirely.

**Implementation:** No change. Firestore rules remain:

```
allow delete: if hasInventoryAccess();
```

---

## 3. WHAT Happens to Related Data (POs, Requests, Maintenance)

**Current behavior:**
- **POs, requests, maintenance** store **denormalized** data: `itemId`, `itemName`, `itemSku`, etc.
- **Display** of historical POs/requests/maintenance does **not** break — they show names/SKUs from the document.
- **Operations** that update inventory **do** require the item document:
  - **PO receive:** `transaction.get(itemRef)` → throws "Item X not found" if deleted.
  - **Request transfer:** Updates `itemRef` (denormalized totals) → fails if item deleted.
  - **Return from maintenance:** Updates `itemRef` → fails if item deleted.

**Recommendation:** **Block deletion** if the item is referenced in any document that may still need the item for operations.

| Related Document | Block Delete? | Reason |
|------------------|---------------|--------|
| Draft PO         | Yes           | User may submit/approve later; receive would fail |
| Pending/approved request | Yes   | Transfer would fail |
| Active maintenance (pending) | Yes | Return would fail |
| Received PO, transferred request, returned maintenance | No | Operations done; only display remains |

---

## 4. UI Exposure and Safeguards

**Recommendation:** **Expose delete in UI** with safeguards.

**Where:** Item detail screen (e.g. `ItemDetailScreen`) — show a "Delete Item" action for Admin/Store Incharge when `totalQuantity === 0`.

**Safeguards:**
1. **Confirmation dialog** — e.g. "Delete [Item Name]? This cannot be undone. Historical POs and maintenance records will keep the item name for reference."
2. **Pre-delete checks** — Before calling `deleteItem`, check:
   - Item in draft PO?
   - Item in pending/approved request?
   - Item in active maintenance (status `pending`)?
3. **Clear error messages** — If any check fails, show a specific message (e.g. "Cannot delete: item is in draft PO #PO-2025-0012" or "Item is in pending maintenance record").

**Implementation note:** `deleteItem` is implemented but **not exposed in UI** today. Add the delete action and the pre-delete checks.

---

## 5. Edge Cases — Summary

| Edge Case | Handling |
|-----------|----------|
| Item in draft PO | Block delete. Message: "Remove from draft PO first or delete the PO." |
| Item in pending request | Block delete. Message: "Complete or reject the request first." |
| Item in active maintenance | Block delete. Message: "Return or write off the maintenance record first." |
| Item in received PO | Allow delete. PO keeps denormalized name/SKU for display. |
| Item in transferred request | Allow delete. Same as above. |
| Item in returned maintenance | Allow delete. Same as above. |
| totalQuantity > 0 | Block delete. Message: "Reduce stock to zero first." |

---

## 6. Implementation Checklist

### A. Pre-delete validation service

Add a function (e.g. in `inventoryService.ts` or a new `inventoryDeletionService.ts`):

```typescript
export interface ItemDeletionBlockReason {
  canDelete: boolean;
  reason?: string;
  draftPoNumbers?: string[];
  pendingRequestNumbers?: string[];
  activeMaintenanceIds?: string[];
}

export async function checkCanDeleteItem(itemId: string): Promise<ItemDeletionBlockReason> {
  // 1. Query draft POs containing this itemId
  // 2. Query pending/approved requests containing this itemId
  // 3. Query maintenance records with status 'pending' and this itemId
  // Return { canDelete: false, ... } if any found
  // Return { canDelete: true } otherwise
}
```

### B. Update `deleteItem` (optional hardening)

Optionally call `checkCanDeleteItem` inside `deleteItem` before the transaction, for defense-in-depth. Or keep it client-only for simpler UX (client checks first, shows clear message).

### C. UI changes

1. **ItemDetailScreen:** Add "Delete Item" button (visible when `canEditItem` and `totalQuantity === 0`).
2. On press: call `checkCanDeleteItem(itemId)`.
3. If `canDelete: false`, show alert with `reason` and details.
4. If `canDelete: true`, show confirmation dialog, then `dispatch(deleteItem(itemId))`.

### D. Firestore queries for pre-delete check

- **Draft POs:** `purchase_orders` where `status == 'draft'` and `items` array contains element with `itemId == itemId`.
- **Pending requests:** `requests` where `status in ['pending','approved']` and `items` array contains `itemId`.
- **Active maintenance:** `maintenance` where `status == 'pending'` and `itemId == itemId`.

---

## 7. Summary

| Aspect | Recommendation |
|--------|----------------|
| Stock check | `totalQuantity === 0` only |
| Roles | Admin + Store Incharge (no extra confirmation) |
| Related data | Block if in draft PO, pending request, or active maintenance |
| UI | Expose delete on ItemDetailScreen with confirmation + pre-delete checks |
| Edge cases | Block with clear messages; allow delete when only historical references remain |
