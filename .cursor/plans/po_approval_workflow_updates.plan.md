---
name: ""
overview: ""
todos: []
isProject: false
---

# PO Approval Workflow Updates

## Overview

Two changes to the Purchase Order approval workflow:

1. **Optional signed PO upload** – Admin can approve without uploading a signed PDF; admin name is still recorded in "approved by". Store incharge can print and sign later when receiving.
2. **Remove ordered status** – Simplified flow: approved → receive directly. "Mark as Ordered" step removed; store incharge receives from approved status.

---

## 1. Optional Signed PO Upload

### Changes

- **purchaseOrderService.ts** (RN + web): Removed `signedPdfUrl` requirement from `approvePO`. Admin name (`reviewedBy`, `reviewedByName`) still recorded.
- **ApprovePOScreen.tsx** (RN): Approve button always enabled; upload section labeled "OPTIONAL".
- **ApprovePOPage.tsx** (web): Same UI updates.
- **ApprovePOScreen.test.tsx**: Updated expectations; approve works without signed doc.

### New Flow

```
Admin reviews PO → Approve (no upload required) → Admin name in "approved by"
Store incharge: print → sign offline → receive when goods arrive
```

---

## 2. Remove Ordered Status

### Rationale

- `ordered` was an extra step between approval and receipt.
- Store incharge can receive directly from `approved` when goods arrive.
- Simpler flow with fewer statuses.

### Changes


| Area                | Change                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Types**           | `ordered` kept in type for backward compat with existing Firestore docs; documented as legacy |
| **Service**         | Removed `markPOOrdered`, `ensureCanMarkOrdered`                                               |
| **Thunks**          | Removed `markPOOrdered` thunk                                                                 |
| **ApprovePOScreen** | Removed "Mark as Ordered" section; kept read-only view for legacy `ordered` POs               |
| **ApprovePOPage**   | Same                                                                                          |
| **Store index**     | Removed `markPOOrdered/fulfilled` from serializable ignore                                    |
| **Cloud Functions** | Removed `ordered` branch and from `statusActionMap`                                           |
| **Tests**           | Removed Mark as Ordered tests from ApprovePOScreen                                            |


### New Status Flow

```
DRAFT → PENDING_APPROVAL → APPROVED → RECEIVED
                ↓
           REJECTED
```

### Backward Compatibility

- `ordered` remains in `PurchaseOrderStatus` for existing Firestore documents.
- Receive flow still accepts `approved`, `ordered`, `partially_received`.
- POStatusBadge still displays "Ordered" for legacy POs.
- Approve screens show "This PO can be received from the list" for legacy `ordered` POs.

---

## Files Modified

### Optional Signed Upload

- `asset-manager/src/services/firebase/purchaseOrderService.ts`
- `asset-manager-web/src/services/firebase/purchaseOrderService.ts`
- `asset-manager/src/screens/PurchaseOrder/ApprovePOScreen.tsx`
- `asset-manager-web/src/pages/purchaseOrder/ApprovePOPage.tsx`
- `asset-manager/src/screens/PurchaseOrder/__tests__/ApprovePOScreen.test.tsx`

### Remove Ordered Status

- `asset-manager/src/types/purchaseOrder.ts`
- `asset-manager-web/src/types/purchaseOrder.ts`
- `asset-manager/src/services/firebase/purchaseOrderService.ts`
- `asset-manager-web/src/services/firebase/purchaseOrderService.ts`
- `asset-manager/src/store/thunks/purchaseOrderThunks.ts`
- `asset-manager-web/src/store/thunks/purchaseOrderThunks.ts`
- `asset-manager/src/screens/PurchaseOrder/ApprovePOScreen.tsx`
- `asset-manager-web/src/pages/purchaseOrder/ApprovePOPage.tsx`
- `asset-manager/src/store/index.ts`
- `asset-manager-web/src/store/index.ts`
- `asset-manager/functions/src/index.ts`
- `asset-manager/src/screens/PurchaseOrder/__tests__/ApprovePOScreen.test.tsx`

