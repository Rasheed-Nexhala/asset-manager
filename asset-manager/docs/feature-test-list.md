# CIAMS Asset Manager — Complete Feature Test List

This document maps ALL features, functions, components, screens, Redux slices, hooks, and utilities in the `src/` directory with their test targets.

---

## Level 1 — Utilities (Easiest)

**No mocking. Pure functions. Fastest feedback.**

| File | Test File | What to Test |
|------|-----------|--------------|
| `src/utils/authValidation.ts` | `authValidation.test.ts` | `validateEmail`, `validateLoginForm`, `validateSignupForm` — edge cases, empty inputs, invalid formats, password mismatch |
| `src/utils/weightConversionUtils.ts` | `weightConversionUtils.test.ts` | KG ↔ pieces conversion, steel weight math, `isWeightViewSupported` |
| `src/utils/skuGenerationUtils.ts` | `skuGenerationUtils.test.ts` | SKU format, HSN-based generation, auto-increment |
| `src/utils/dateSerialization.ts` | `dateSerialization.test.ts` | `timestampToISOString`, `isoStringToDate`, `serializeDocumentSnapshot`, `deserializeDocumentSnapshot` — Firestore timestamp handling, ISO string conversion, null/undefined handling |
| `src/utils/locationUtils.ts` | `locationUtils.test.ts` | `getLocationId` for store vs site |
| `src/utils/requestUtils.ts` | `requestUtils.test.ts` | Request-related helpers |
| `src/utils/csvExport.ts` | `csvExport.test.ts` | CSV generation, escaping, data formatting |
| `src/utils/poPdfUtils.ts` | `poPdfUtils.test.ts` | `generatePOHtml`, `buildDraftPOForPrint`, `printPurchaseOrder`, `escapeHtml` — HTML generation, PDF formatting, currency formatting, date formatting |

---

## Level 2 — Redux Slices

**No UI. Test state transitions in isolation.**

| File | Test File | What to Test |
|------|-----------|--------------|
| `src/store/slices/authSlice.ts` | `authSlice.test.ts` | Initial state, `setUser`, `setUserRole`, `clearError`, thunk cases (pending/fulfilled/rejected) |
| `src/store/slices/inventorySlice.ts` | `inventorySlice.test.ts` | `setItems`, `setCategories`, `setInventoryForLocation`, filters, `updateItemInState`, `removeItemFromState` |
| `src/store/slices/requestsSlice.ts` | `requestsSlice.test.ts` | `setRequests`, `setMyRequests`, `setFilters`, `setSelectedRequest`, `updateRequestInState` |
| `src/store/slices/purchaseOrderSlice.ts` | `purchaseOrderSlice.test.ts` | `setPurchaseOrders`, `setVendors`, `setFilters`, `setSelectedPO`, `updatePOInState` |
| `src/store/slices/sitesSlice.ts` | `sitesSlice.test.ts` | `setSites`, `setSearchQuery`, `setSelectedSite`, `updateSiteInState` |
| `src/store/slices/steelMasterSlice.ts` | `steelMasterSlice.test.ts` | `setSteelMasters`, `clearError`, `setSelectedSteelMaster`, `setLoading` |
| `src/store/slices/maintenanceSlice.ts` | `maintenanceSlice.test.ts` | `setMaintenanceRecords`, `updateMaintenanceInState`, `setSelectedMaintenance`, `setFilters`, `setLoading`, `setError`, thunk cases |
| `src/store/slices/activityLogSlice.ts` | `activityLogSlice.test.ts` | `setLogs`, `setMyRecentActivity`, `setFilters`, `loadMore`, `setLoading`, `setError` |

---

## Level 3 — Selectors

**Pure functions that read from state. No side effects.**

| File | Test File | What to Test |
|------|-----------|--------------|
| `src/store/selectors/authSelectors.ts` | `authSelectors.test.ts` | `selectUserId`, `selectIsAdmin`, `selectIsStoreIncharge`, `selectIsSiteManager`, `selectUserDisplayName`, `selectUserRole`, `selectAuthError` |
| `src/store/selectors/inventorySelectors.ts` | `inventorySelectors.test.ts` | `selectAllItems`, `selectLowStockItems`, `selectInventoryByLocation`, `selectItemById`, `selectCategories`, `selectInventoryLoading`, `selectInventoryError` |
| `src/store/selectors/requestSelectors.ts` | `requestSelectors.test.ts` | `selectAllRequests`, `selectMyRequests`, filtered lists, `selectRequestById`, `selectRequestFilters`, `selectSelectedRequest` |
| `src/store/selectors/purchaseOrderSelectors.ts` | `purchaseOrderSelectors.test.ts` | `selectPurchaseOrders`, `selectVendors`, `selectPOById`, `selectPOFilters`, `selectSelectedPO`, `selectPOLoading`, `selectPOError` |
| `src/store/selectors/sitesSelectors.ts` | `sitesSelectors.test.ts` | `selectAllSites`, `selectSiteById`, `selectAssignedSiteIdForUser`, `selectSitesSearchQuery`, `selectSelectedSite`, `selectSitesLoading` |
| `src/store/selectors/steelMasterSelectors.ts` | `steelMasterSelectors.test.ts` | `selectAllSteelMasters`, `selectActiveSteelMasters`, `selectSteelMasterById`, `selectSteelMasterLoading`, `selectSteelMasterError`, `selectSelectedSteelMaster` |
| `src/store/selectors/maintenanceSelectors.ts` | `maintenanceSelectors.test.ts` | `selectMaintenanceRecords`, `selectActiveMaintenanceRecords`, `selectWrittenOffRecords`, `selectReturnedRecords`, `selectMaintenanceHistory`, `selectMaintenanceByItemId`, `selectFilteredMaintenanceRecords`, `selectMaintenanceStats`, `selectMaintenanceByStatus`, `selectMaintenanceById`, `selectSelectedMaintenance`, `selectMaintenanceLoading`, `selectMaintenanceError` |
| `src/store/selectors/activityLogSelectors.ts` | `activityLogSelectors.test.ts` | `selectActivityLogs`, `selectMyRecentActivity`, `selectActivityLogFilters`, `selectActivityLogLoading`, `selectActivityLogError`, filtered lists |

---

## Level 4 — Hooks (Light Mocking)

**Mock AsyncStorage, Firebase, or external deps. Test logic.**

| File | Test File | Mocks Needed | What to Test |
|------|-----------|--------------|--------------|
| `src/hooks/useWeightViewPreference.ts` | `useWeightViewPreference.test.ts` | AsyncStorage | Default view, toggle KG/pieces, persistence |
| `src/hooks/useInventoryError.ts` | `useInventoryError.test.ts` | Minimal | Error handling logic, error state management |
| `src/hooks/useAuth.ts` | `useAuth.test.ts` | Firebase Auth | User/loading state (mock `onAuthStateChanged`), sign in/out, error handling |
| `src/hooks/useAuthStateSync.ts` | `useAuthStateSync.test.ts` | Firebase Auth, Redux | Sync behavior, state updates, cleanup |
| `src/hooks/useUserRoleSync.ts` | `useUserRoleSync.test.ts` | Firebase Firestore, Redux | Role sync, role updates, error handling |
| `src/hooks/useManagerValidationSync.ts` | `useManagerValidationSync.test.ts` | Firebase, Redux | Validation sync, manager validation state |
| `src/hooks/useDashboardSubscriptions.ts` | `useDashboardSubscriptions.test.ts` | Firebase services (Firestore, Auth) | Subscription setup, real-time updates, cleanup, error handling (complex) |

---

## Level 5 — Pure UI Components (No Redux)

**Props-only components. Mock icons only.**

| File | Test File | testID to Add | What to Test |
|------|-----------|--------------|--------------|
| `src/components/Requests/RequestCard.tsx` | `RequestCard.test.tsx` | `request-card` | Request number, site, item count, onPress, priority emoji, availability text, date formatting |
| `src/components/Requests/RequestStatusBadge.tsx` | `RequestStatusBadge.test.tsx` | `status-badge` | Correct text/color per status (draft, pending, approved, rejected, transferred, completed) |
| `src/components/Requests/PrioritySelector.tsx` | `PrioritySelector.test.tsx` | `priority-high`, etc. | Selection, onChange, current selection display |
| `src/components/Inventory/ItemCard.tsx` | `ItemCard.test.tsx` | `item-card` | Name, SKU, stock, low stock badge |
| `src/components/Inventory/StockStatusBadge.tsx` | `StockStatusBadge.test.tsx` | `stock-badge` | adequate/low_stock/discontinued |
| `src/components/Sites/SiteCard.tsx` | `SiteCard.test.tsx` | `site-card` | Name, address, manager |
| `src/components/PurchaseOrders/POCard.tsx` | `POCard.test.tsx` | `po-card` | PO number, vendor, status |
| `src/components/Dashboard/DashboardGreeting.tsx` | `DashboardGreeting.test.tsx` | `greeting-text` | Role-based greeting |
| `src/components/FormField.tsx` | `FormField.test.tsx` | — | Label, value, error display, onChangeText |
| `src/components/AuthLogo.tsx` | `AuthLogo.test.tsx` | — | Renders without crashing |

---

## Level 6 — Form Components (Redux or Callbacks)

**Components that use Redux or complex callbacks.**

| File | Test File | Mocks | What to Test |
|------|-----------|-------|--------------|
| `src/components/User/UpdatePasswordForm.tsx` | `UpdatePasswordForm.test.tsx` | — | Validation, submit callback |
| `src/components/Sites/SiteForm.tsx` | `SiteForm.test.tsx` | — | Fields, validation, onSubmit |
| `src/components/PurchaseOrders/VendorForm.tsx` | `VendorForm.test.tsx` | — | Fields, validation |
| `src/components/Inventory/SteelMasterForm.tsx` | `SteelMasterForm.test.tsx` | — | Fields, validation |
| `src/components/Requests/ItemSelectorModal.tsx` | `ItemSelectorModal.test.tsx` | Redux (inventory) | Item list, selection, onConfirm |

---

## Level 7 — Connected Screens (Redux + Navigation)

**Full screen tests. Mock navigation, Firebase, and subscriptions.**

| Screen | Test File | Key Mocks | What to Test |
|--------|-----------|-----------|--------------|
| `LoginScreen.tsx` | `LoginScreen.test.tsx` | authThunks, expo/vector-icons | Email/password validation, loading state, auth error display, onGoToSignup |
| `SignupScreen.tsx` | `SignupScreen.test.tsx` | authThunks, expo/vector-icons | Validation, password match, submit, auth error display, onGoToLogin |
| `ProfileScreen.tsx` | `ProfileScreen.test.tsx` | navigation | User info display, sign out |
| `DashboardScreen.tsx` | `DashboardScreen.test.tsx` | useDashboardSubscriptions, navigation | Role-based widgets, pull-to-refresh |
| `MyRequestsScreen.tsx` | `MyRequestsScreen.test.tsx` | navigation | List render, tabs, create button |
| `RequestQueueScreen.tsx` | `RequestQueueScreen.test.tsx` | navigation, requestService | Priority sections, filters, loading, empty state, navigation |
| `SiteManagementScreen.tsx` | `SiteManagementScreen.test.tsx` | navigation, siteService, sitesThunks | List, search, add button, loading, error, edit navigation |
| `CentralStoreInventoryScreen.tsx` | `CentralStoreInventoryScreen.test.tsx` | navigation, inventoryService, categoryService, inventoryThunks | List, search, filters, loading, error, item navigation |
| `PurchaseOrderListScreen.tsx` | `PurchaseOrderListScreen.test.tsx` | navigation, purchaseOrderService | List, status filters, loading, empty state, subscription error |
| `ActivityLogScreen.tsx` | `ActivityLogScreen.test.tsx` | activityLogThunks | Header, Export, loading/empty states, filters, clear filters, error, log list, filter modal, loading more |
| `ReceivePOScreen.tsx` | `ReceivePOScreen.test.tsx` | getPOById, receivePO, ImagePicker | Loading, error, form, submit |
| `CreatePOScreen.tsx` | `CreatePOScreen.test.tsx` | vendorService, purchaseOrderThunks | Create form, validation, submit |
| `RejectRequestScreen.tsx` | `RejectRequestScreen.test.tsx` | requestService, rejectRequest | Loading, form, validation, submit |
| `ProcessRequestScreen.tsx` | `ProcessRequestScreen.test.tsx` | requestService, approveRequest | Loading, request items, approve |
| `EditRequestScreen.tsx` | `EditRequestScreen.test.tsx` | requestService, editRequest | Draft edit, save, submit |
| `ConfirmTransferScreen.tsx` | `ConfirmTransferScreen.test.tsx` | requestService, transferRequest | Loading, form, validation, submit |
| `MaintenanceDashboardScreen.tsx` | `MaintenanceDashboardScreen.test.tsx` | subscribeToMaintenance | Tabs, list, add, card press |
| `MaintenanceDetailScreen.tsx` | `MaintenanceDetailScreen.test.tsx` | subscribeToMaintenanceById | Details, Return, Write-off nav |
| `VendorManagementScreen.tsx` | `VendorManagementScreen.test.tsx` | subscribeToVendors | List, search, add, edit nav |
| `AddVendorScreen.tsx` | `AddVendorScreen.test.tsx` | getVendorById, createVendor | Create/edit form, validation |
| `SteelMasterScreen.tsx` | `SteelMasterScreen.test.tsx` | steelMasterThunks | List, add/edit form |
| `AddEditItemScreen.tsx` | `AddEditItemScreen.test.tsx` | inventoryThunks | Create/edit form, validation |
| `ItemDetailScreen.tsx` | `ItemDetailScreen.test.tsx` | inventoryThunks | Details, edit, add stock |
| `CategoryManagementScreen.tsx` | `CategoryManagementScreen.test.tsx` | subscribeCategories | List, search, add/edit |
| `OtherSiteInventoryScreen.tsx` | `OtherSiteInventoryScreen.test.tsx` | getSite, fetchInventoryByLocation | Loading, site info, inventory |
| `MySiteInventoryScreen.tsx` | `MySiteInventoryScreen.test.tsx` | subscribeToSites | User site inventory, search, other sites |
| `AddSiteScreen.tsx` | `AddSiteScreen.test.tsx` | createSite | Form, validation, submit |
| `EditSiteScreen.tsx` | `EditSiteScreen.test.tsx` | getSite, updateSite | Loading, form, submit |
| `UsersScreen.tsx` | `UsersScreen.test.tsx` | subscribeToAllUsers | Loading, user list |
| `UpdatePasswordScreen.tsx` | `UpdatePasswordScreen.test.tsx` | UpdatePasswordForm | Form, success, goBack |
| `MyActivityScreen.tsx` | `MyActivityScreen.test.tsx` | subscribeToMyRecentActivityRealtime | Loading, list, detail modal |
| `AuthFlowScreen.tsx` | `AuthFlowScreen.test.tsx` | authThunks | Login/Signup toggle |
| `LoadingScreen.tsx` | `LoadingScreen.test.tsx` | — | Message, ActivityIndicator |

---

## Level 8 — Complex Workflows (Hardest)

**Multi-step flows, modals, async behavior.**

| Flow | Test File | Key Mocks | What to Test |
|------|-----------|-----------|--------------|
| Create Request → Item Selector → Submit | `CreateRequestScreen.test.tsx` | requestThunks, Alert, navigation | Site name, empty items, open modal, select items, validation, submit success, save draft, error alert, disabled while submitting |
| PO Approval flow | `ApprovePOScreen.test.tsx` | getPOById, purchaseOrderThunks, Alert | Loading, error, PO details, approve, reject form, reject confirm, validation, mark ordered, read-only rejected |
| Return Items flow | `ReturnItemsScreen.test.tsx` | requestService.getRequestById, requestThunks.returnItems | Loading, error status, consumables only, items list, select/quantity/condition, submit, validation, all returned |
| Add to Maintenance → Return/Write-off | `AddToMaintenanceScreen.test.tsx` | maintenanceThunks, ImagePicker | Form render, item select, issue type, description validation, submit success |
| Return from Maintenance | `ReturnFromMaintenanceScreen.test.tsx` | maintenanceThunks, Alert | Loading, form render, quantity +/- , repair summary validation, submit success |
| Write Off Item | `WriteOffScreen.test.tsx` | maintenanceThunks, WriteOffReasonSelector, Alert | Loading, form render, quantity +/- , reason/explanation validation, confirmation flow, submit success |
| Login → Dashboard (integration) | `LoginToDashboard.test.tsx` | Redux preloadedState | Auth/Main/Loading screens based on isAuthenticated and isRoleLoading |

---

## Summary Checklist

- [x] Level 1: All utility tests passing (authValidation, weightConversionUtils, skuGenerationUtils, dateSerialization, locationUtils, requestUtils, csvExport, poPdfUtils)
- [x] Level 2: Redux slice tests (all 8 slices)
- [x] Level 3: Selector tests (authSelectors, requestSelectors, inventorySelectors, purchaseOrderSelectors, sitesSelectors, steelMasterSelectors, maintenanceSelectors, activityLogSelectors)
- [x] Level 4: Hooks (useWeightViewPreference, useInventoryError, useAuth, useAuthStateSync, useUserRoleSync, useManagerValidationSync, useDashboardSubscriptions)
- [x] Level 5: Component tests (DashboardGreeting, RequestCard, FormField, RequestStatusBadge, StockStatusBadge, AuthLogo, PrioritySelector, SiteCard, POCard, ItemCard)
- [x] Level 4: Key hooks tested
- [x] Level 6: Form components (VendorForm, UpdatePasswordForm, SteelMasterForm, SiteForm, ItemSelectorModal)
- [x] Level 7: Main screens tested (LoginScreen, SignupScreen, ProfileScreen, DashboardScreen, MyRequestsScreen, RequestQueueScreen, SiteManagementScreen, CentralStoreInventoryScreen, PurchaseOrderListScreen, ActivityLogScreen)
- [x] Level 8: Critical workflows covered (Create Request, PO Approval, Return Items, Add to Maintenance, Return from Maintenance, Write Off, Login → Dashboard)

---

## Running Tests

```bash
npm test                    # Run once
npm run test:watch          # Watch mode
npm test -- --coverage      # With coverage report
npm test -- RequestCard     # Run specific test file
```
