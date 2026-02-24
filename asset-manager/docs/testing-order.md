# Asset Manager — Testing Order (Easy → Difficult)

Follow this order when adding tests to the CIAMS Asset Manager app. Start with the easiest, most isolated tests and progress to complex, integration-style tests.

---

## Level 1 — Utilities (Easiest)

**No mocking. Pure functions. Fastest feedback.**

| File | Test File | What to Test |
|------|-----------|--------------|
| `src/utils/authValidation.ts` | `authValidation.test.ts` | `validateEmail`, `validateLoginForm`, `validateSignupForm` — edge cases, empty inputs, invalid formats |
| `src/utils/weightConversionUtils.ts` | `weightConversionUtils.test.ts` | KG ↔ pieces conversion, steel weight math |
| `src/utils/skuGenerationUtils.ts` | `skuGenerationUtils.test.ts` | SKU format, HSN-based generation, auto-increment |
| `src/utils/dateSerialization.ts` | `dateSerialization.test.ts` | Firestore timestamp handling, ISO string conversion |
| `src/utils/locationUtils.ts` | `locationUtils.test.ts` | `getLocationId` for store vs site |
| `src/utils/requestUtils.ts` | `requestUtils.test.ts` | Request-related helpers |
| `src/utils/csvExport.ts` | `csvExport.test.ts` | CSV generation, escaping |

---

## Level 2 — Redux Slices

**No UI. Test state transitions in isolation.**

| File | Test File | What to Test |
|------|-----------|--------------|
| `src/store/slices/authSlice.ts` | `authSlice.test.ts` | Initial state, `setUser`, `setUserRole`, `clearError`, thunk cases (pending/fulfilled/rejected) |
| `src/store/slices/inventorySlice.ts` | `inventorySlice.test.ts` | `setItems`, `setCategories`, `setInventoryForLocation`, filters |
| `src/store/slices/requestsSlice.ts` | `requestsSlice.test.ts` | `setRequests`, `setMyRequests`, `setFilters`, `setSelectedRequest` |
| `src/store/slices/purchaseOrderSlice.ts` | `purchaseOrderSlice.test.ts` | `setPurchaseOrders`, `setVendors`, `setFilters` |
| `src/store/slices/sitesSlice.ts` | `sitesSlice.test.ts` | `setSites`, `setSearchQuery` |
| `src/store/slices/steelMasterSlice.ts` | `steelMasterSlice.test.ts` | `setSteelMasters`, `clearError` |
| `src/store/slices/maintenanceSlice.ts` | `maintenanceSlice.test.ts` | `setMaintenanceRecords`, `updateMaintenanceInState` |
| `src/store/slices/activityLogSlice.ts` | `activityLogSlice.test.ts` | `setLogs`, `setMyRecentActivity`, `setFilters`, `loadMore` |

---

## Level 3 — Selectors

**Pure functions that read from state. No side effects.**

| File | Test File | What to Test |
|------|-----------|--------------|
| `src/store/selectors/authSelectors.ts` | `authSelectors.test.ts` | `selectUserId`, `selectIsAdmin`, `selectIsStoreIncharge`, `selectIsSiteManager`, `selectUserDisplayName` |
| `src/store/selectors/inventorySelectors.ts` | `inventorySelectors.test.ts` | `selectAllItems`, `selectLowStockItems`, `selectInventoryByLocation` |
| `src/store/selectors/requestSelectors.ts` | `requestSelectors.test.ts` | `selectAllRequests`, `selectMyRequests`, filtered lists |
| `src/store/selectors/purchaseOrderSelectors.ts` | `purchaseOrderSelectors.test.ts` | `selectPurchaseOrders`, `selectVendors` |
| `src/store/selectors/sitesSelectors.ts` | `sitesSelectors.test.ts` | `selectAllSites`, `selectSiteById`, `selectAssignedSiteIdForUser` |

---

## Level 4 — Hooks (Light Mocking)

**Mock AsyncStorage, Firebase, or external deps. Test logic.**

| File | Test File | Mocks Needed | What to Test |
|------|-----------|--------------|--------------|
| `src/hooks/useWeightViewPreference.ts` | `useWeightViewPreference.test.ts` | AsyncStorage | Default view, toggle KG/pieces |
| `src/hooks/useInventoryError.ts` | `useInventoryError.test.ts` | Minimal | Error handling logic |
| `src/hooks/useAuth.ts` | `useAuth.test.ts` | Firebase Auth | User/loading state (mock `onAuthStateChanged`) |
| `src/hooks/useAuthStateSync.ts` | `useAuthStateSync.test.ts` | Firebase Auth, Redux | Sync behavior |
| `src/hooks/useUserRoleSync.ts` | `useUserRoleSync.test.ts` | Firebase Firestore, Redux | Role sync |
| `src/hooks/useManagerValidationSync.ts` | `useManagerValidationSync.test.ts` | Firebase, Redux | Validation sync |
| `src/hooks/useDashboardSubscriptions.ts` | `useDashboardSubscriptions.test.ts` | Firebase services | Subscription setup (complex) |

---

## Level 5 — Pure UI Components (No Redux)

**Props-only components. Mock icons only.**

| File | Test File | testID to Add | What to Test |
|------|-----------|--------------|--------------|
| `src/components/Requests/RequestCard.tsx` | `RequestCard.test.tsx` | — (use `accessibilityLabel`) | Request number, site, item count, onPress, priority emoji, availability text |
| `src/components/Requests/RequestStatusBadge.tsx` | `RequestStatusBadge.test.tsx` | `status-badge` | Correct text/color per status |
| `src/components/Requests/PrioritySelector.tsx` | `PrioritySelector.test.tsx` | `priority-high`, etc. | Selection, onChange |
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
| `SignupScreen.tsx` | `SignupScreen.test.tsx` | authThunks | Validation, password match, submit |
| `ProfileScreen.tsx` | `ProfileScreen.test.tsx` | navigation | User info display, sign out |
| `DashboardScreen.tsx` | `DashboardScreen.test.tsx` | useDashboardSubscriptions, navigation | Role-based widgets, pull-to-refresh |
| `MyRequestsScreen.tsx` | `MyRequestsScreen.test.tsx` | navigation | List render, tabs, create button |
| `RequestQueueScreen.tsx` | `RequestQueueScreen.test.tsx` | navigation | Priority sections, filters |
| `SiteManagementScreen.tsx` | `SiteManagementScreen.test.tsx` | navigation | List, search, add button |
| `CentralStoreInventoryScreen.tsx` | `CentralStoreInventoryScreen.test.tsx` | navigation | List, search, filters |
| `PurchaseOrderListScreen.tsx` | `PurchaseOrderListScreen.test.tsx` | navigation | List, status filters |
| `ActivityLogScreen.tsx` | `ActivityLogScreen.test.tsx` | navigation | Filters, export, pagination |

---

## Level 8 — Complex Workflows (Hardest)

**Multi-step flows, modals, async behavior.**

| Flow | Test Approach |
|------|---------------|
| Create Request → Item Selector → Submit | Render CreateRequestScreen, fill form, open modal, select items, submit, assert navigation/dispatch |
| PO Approval flow | Mock PO data, render ApprovePOScreen, approve/reject, assert state |
| Return Items flow | Mock request with items, render ReturnItemsScreen, select items, set quantities, submit |
| Add to Maintenance → Return/Write-off | Mock maintenance record, test status transitions |
| Login → Dashboard (integration) | Mock Firebase auth success, render App or auth flow, assert navigation to Dashboard |

---

## Summary Checklist

- [ ] Level 1: All utility tests passing
- [ ] Level 2: All Redux slice tests passing
- [ ] Level 3: Selector tests (optional but valuable)
- [ ] Level 4: Key hooks tested
- [ ] Level 5: Core UI components tested
- [ ] Level 6: Form components tested
- [ ] Level 7: Main screens tested
- [ ] Level 8: Critical workflows covered

---

## Running Tests

```bash
npm test                    # Run once
npm run test:watch          # Watch mode
npm test -- --coverage      # With coverage report
npm test -- RequestCard     # Run specific test file
```
