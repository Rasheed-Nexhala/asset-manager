# Browser Alert/Confirm Replacement Checklist

Replace all `alert()`, `confirm()`, `window.alert`, `window.confirm` with CIAMS design-system popups.

## Shared Components

- **Toast** (`useToast`) – Success, error, info messages (non-blocking, auto-dismiss)
- **ConfirmationModal** (`useConfirm`) – Yes/No dialogs (blocking)

**Status: All replacements completed.**

---

## Checklist by File

### Purchase Order Pages

| File | Line | Type | Message/Context | Status |
| `ReceivePOPage.tsx` | 98 | alert | Failed to print | ✅ |
| `ReceivePOPage.tsx` | 118 | alert | Upload failed | ✅ |
| `ReceivePOPage.tsx` | 134 | alert | (multi-line) | ✅ |
| `ReceivePOPage.tsx` | 146 | alert | (multi-line) | ✅ |
| `ReceivePOPage.tsx` | 181 | alert | Purchase order received. Inventory updated. | ✅ |
| `ReceivePOPage.tsx` | 184 | alert | Failed to receive PO | ✅ |
| `ApprovePOPage.tsx` | 103 | alert | Failed to print | ✅ |
| `ApprovePOPage.tsx` | 125 | alert | (multi-line) | ✅ |
| `ApprovePOPage.tsx` | 148 | alert | Purchase order approved. | ✅ |
| `ApprovePOPage.tsx` | 177 | alert | Purchase order rejected. | ✅ |
| `ApprovePOPage.tsx` | 191 | alert | Purchase order marked as ordered. | ✅ |
| `CreatePOPage.tsx` | 281 | alert | User information is missing | ✅ |
| `CreatePOPage.tsx` | 289 | alert | Vendor name and contact are required | ✅ |
| `CreatePOPage.tsx` | 294 | alert | At least one item is required | ✅ |
| `CreatePOPage.tsx` | 310 | alert | (multi-line) | ✅ |
| `CreatePOPage.tsx` | 385 | confirm | Print? | ✅ |
| `CreatePOPage.tsx` | 390 | alert | Failed to print | ✅ |
| `CreatePOPage.tsx` | 438 | confirm | Delete draft? | ✅ |
| `CreatePOPage.tsx` | 444 | alert | Draft deleted | ✅ |
| `CreatePOPage.tsx` | 448 | alert | Failed to delete draft | ✅ |
| `CreatePOPage.tsx` | 455 | alert | P.O. No. is required to print. | ✅ |
| `CreatePOPage.tsx` | 459 | alert | Vendor name and contact required to print. | ✅ |
| `CreatePOPage.tsx` | 463 | alert | Add at least one item to print. | ✅ |
| `CreatePOPage.tsx` | 485 | alert | Failed to print | ✅ |

### Request Pages

| File | Line | Type | Message/Context | Status |
|------|------|------|-----------------|--------|
| `ConfirmTransferPage.tsx` | 50 | alert | Only Admin and Store Incharge can confirm | ✅ |
| `ConfirmTransferPage.tsx` | 63 | alert | Only approved requests can be transferred | ✅ |
| `ConfirmTransferPage.tsx` | 69 | alert | Failed to load request details | ✅ |
| `ConfirmTransferPage.tsx` | 106 | alert | Transfer confirmed successfully | ✅ |
| `ConfirmTransferPage.tsx` | 109 | alert | (error) | ✅ |
| `RejectRequestPage.tsx` | 80 | alert | Request rejected | ✅ |
| `RejectRequestPage.tsx` | 83 | alert | (error) | ✅ |
| `EditRequestPage.tsx` | 74 | alert | Only draft requests can be edited | ✅ |
| `EditRequestPage.tsx` | 80 | alert | Failed to load request | ✅ |
| `EditRequestPage.tsx` | 138 | confirm | Delete draft? | ✅ |
| `EditRequestPage.tsx` | 143 | alert | Draft deleted | ✅ |
| `EditRequestPage.tsx` | 146 | alert | (error) | ✅ |
| `EditRequestPage.tsx` | 183 | alert | (error) | ✅ |
| `EditRequestPage.tsx` | 188 | alert | (error) | ✅ |
| `CreateSiteTransferPage.tsx` | 139 | alert | (error) | ✅ |
| `CreateSiteTransferPage.tsx` | 144 | alert | (error) | ✅ |
| `CreateRequestPage.tsx` | 88 | alert | Missing required user or site information | ✅ |
| `CreateRequestPage.tsx` | 131 | alert | (error) | ✅ |
| `CreateRequestPage.tsx` | 136 | alert | (error) | ✅ |
| `ProcessRequestPage.tsx` | 277 | alert | (error) | ✅ |
| `ProcessRequestPage.tsx` | 295 | alert | (error) | ✅ |
| `ReturnItemsPage.tsx` | 119 | alert | (error) | ✅ |
| `ReturnItemsPage.tsx` | 127 | alert | Failed to load request | ✅ |
| `ReturnItemsPage.tsx` | 185 | alert | Items returned successfully | ✅ |
| `ReturnItemsPage.tsx` | 188 | alert | (error) | ✅ |

### Inventory Pages

| File | Line | Type | Message/Context | Status |
|------|------|------|-----------------|--------|
| `ItemDetailPage.tsx` | 186 | alert | Request Submitted | ✅ |
| `ItemDetailPage.tsx` | 206 | alert | Cannot delete (reason) | ✅ |
| `ItemDetailPage.tsx` | 210 | confirm | Delete item? | ✅ |
| `ItemDetailPage.tsx` | 217 | alert | Item deleted | ✅ |
| `ItemDetailPage.tsx` | 220 | alert | Failed to delete item | ✅ |
| `CategoryManagementPage.tsx` | 67 | alert | (error) | ✅ |
| `CategoryManagementPage.tsx` | 73 | confirm | Delete category? | ✅ |
| `CategoryManagementPage.tsx` | 80 | alert | (error) | ✅ |
| `CategoryManagementPage.tsx` | 91 | alert | Please enter a category name | ✅ |
| `CategoryManagementPage.tsx` | 95 | alert | Category name must be 50 chars or less | ✅ |
| `CategoryManagementPage.tsx` | 104 | alert | Failed to create category | ✅ |
| `OtherSiteInventoryPage.tsx` | 108 | alert | Need to be assigned to a site | ✅ |
| `OtherSiteInventoryPage.tsx` | 112 | alert | (error) | ✅ |
| `SteelMasterPage.tsx` | 54 | confirm | Deactivate steel master? | ✅ |
| `SteelMasterPage.tsx` | 60 | alert | Failed to deactivate | ✅ |
| `AddEditItemPage.tsx` | 152 | alert | Duplicate SKU | ✅ |
| `InventoryUpdateRequestsPage.tsx` | 68 | alert | Failed to approve request | ✅ |
| `InventoryUpdateRequestsPage.tsx` | 94 | alert | Failed to reject request | ✅ |
| `InventoryUpdateRequestsPage.tsx` | 115 | alert | Failed to update access | ✅ |

### Vendor & Components

| File | Line | Type | Message/Context | Status |
|------|------|------|-----------------|--------|
| `VendorManagementPage.tsx` | 139 | alert | Vendor updated | ✅ |
| `VendorManagementPage.tsx` | 149 | alert | Vendor added | ✅ |
| `VendorManagementPage.tsx` | 153 | alert | Failed to save vendor | ✅ |
| `VendorManagementPage.tsx` | 166 | confirm | Delete vendor? | ✅ |
| `VendorManagementPage.tsx` | 170 | alert | Vendor deleted | ✅ |
| `VendorManagementPage.tsx` | 172 | alert | Failed to delete vendor | ✅ |
| `QuickMoveToMaintenanceButton.tsx` | 37 | alert | User information not available | ✅ |
| `QuickMoveToMaintenanceButton.tsx` | 41 | confirm | Move to maintenance? | ✅ |
| `QuickMoveToMaintenanceButton.tsx` | 67 | alert | Item moved to maintenance successfully | ✅ |
| `QuickMoveToMaintenanceButton.tsx` | 70 | alert | (error) | ✅ |

---

## Summary

- **Total occurrences**: ~65
- **alert**: ~52
- **confirm**: ~8
- **Files affected**: 17
