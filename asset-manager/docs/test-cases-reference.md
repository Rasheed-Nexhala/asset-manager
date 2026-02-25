# CIAMS Asset Manager — Complete Test Cases Reference

> **Generated:** Comprehensive documentation of all test suites and individual test cases in the asset-manager project.  
> **Total test files:** ~91

---

## Table of Contents

1. [Level 1 — Utilities](#level-1--utilities)
2. [Level 2 — Redux Slices](#level-2--redux-slices)
3. [Level 3 — Selectors](#level-3--selectors)
4. [Level 4 — Hooks](#level-4--hooks)
5. [Level 5 — Pure UI Components](#level-5--pure-ui-components)
6. [Level 6 — Form Components](#level-6--form-components)
7. [Level 7 — Screens](#level-7--screens)
8. [Level 8 — Integration & Workflows](#level-8--integration--workflows)

---

## Level 1 — Utilities

**Pure functions. No mocking. Fastest feedback.**

### `src/utils/__tests__/authValidation.test.ts`

| Suite | Test Case |
|-------|-----------|
| **authValidation** | |
| ↳ validateEmail | `returns true for valid email` |
| | `returns false for empty or whitespace email` |
| | `returns false for invalid email formats` |
| | `trims whitespace before validating` |
| ↳ validateLoginForm | `returns no errors for valid values` |
| | `returns email error when email is empty` |
| | `returns email error when email is invalid` |
| | `returns password error when password is empty` |
| | `returns password error when password is too short` |
| ↳ validateSignupForm | `returns no errors for valid values with matching passwords` |
| | `returns name error when name is empty` |
| | `returns confirmPassword error when confirmPassword is empty` |
| | `returns confirmPassword error when passwords do not match` |
| | `inherits login form errors (email, password)` |

---

### `src/utils/__tests__/weightConversionUtils.test.ts`

| Suite | Test Case |
|-------|-----------|
| **weightConversionUtils** | |
| ↳ TON_TO_KG | `equals 1000` |
| ↳ tonToKg | `converts ton to kg` |
| ↳ isWeightBasedItem | `returns true when weightPerMeter is positive` |
| | `returns false when weightPerMeter is missing or zero` |
| ↳ isWeightViewSupported | `returns true when both weightPerMeter and lengthPerPiece are positive` |
| | `returns false when lengthPerPiece is missing or zero` |
| ↳ piecesToKg | `calculates weight from pieces` |
| | `returns 0 when weightPerMeter or lengthPerPiece is <= 0` |
| ↳ kgToPieces | `returns exact pieces when kg divides evenly` |
| | `returns inexact with suggestions when kg does not divide evenly` |
| | `returns zero pieces when weightPerPiece is 0` |
| ↳ getConversionErrorMessage | `returns empty string when conversion is exact` |
| | `returns message with suggestions when conversion is inexact` |
| ↳ calculateTotalWeight | `calculates total weight` |
| ↳ formatWeight | `formats in Kg unit` |
| | `formats in Ton when unit is Ton (MT) and kg >= 1000` |
| | `formats in Kg when unit is Ton but kg < 1000` |

---

### `src/utils/__tests__/skuGenerationUtils.test.ts`

| Suite | Test Case |
|-------|-----------|
| **skuGenerationUtils** | |
| ↳ getNextSkuSuffix | `should return 1 when no existing SKUs with prefix` |
| | `should return next suffix when existing SKUs exist` |
| | `should return 2 when only 721699-001 exists` |
| | `should handle non-sequential suffixes and return max + 1` |
| | `should return 1 for empty or invalid prefix` |
| ↳ generateSkuFromHsn | `should generate SKU with 001 suffix when no existing SKUs` |
| | `should generate SKU with incremented suffix when existing SKUs` |
| | `should sanitize HSN code by removing non-alphanumeric chars` |
| | `should throw when HSN code is empty` |
| | `should throw when HSN code is only whitespace` |
| | `should pad suffix with leading zeros` |
| ↳ validateSku | `should return valid for correct SKU` |
| | `should return invalid for empty or missing SKU` |
| | `should return invalid for SKU that is too long` |
| | `should return invalid for SKU with invalid characters` |

---

### `src/utils/__tests__/dateSerialization.test.ts`

| Suite | Test Case |
|-------|-----------|
| **dateSerialization** | |
| ↳ dateToIso | `converts Date to ISO string` |
| | `returns string unchanged when input is string` |
| | `returns null for null or undefined` |
| ↳ isoToDate | `converts ISO string to Date` |
| | `returns Date unchanged when input is Date` |
| | `returns null for null or undefined` |
| | `returns null for invalid ISO string` |
| ↳ filtersToStore | `converts Date filters to ISO strings` |
| | `preserves other filter fields` |
| ↳ filtersToUI | `converts ISO string filters to Date` |
| | `preserves other filter fields` |

---

### `src/utils/__tests__/locationUtils.test.ts`

| Suite | Test Case |
|-------|-----------|
| **locationUtils** | |
| ↳ getLocationId | `returns "store" for store location type` |
| | `returns "site_<id>" for site with id` |
| | `returns empty string for site without id` |
| | `returns "maintenance" for maintenance location type` |
| ↳ getLocationTypeFromId | `returns "store" for store id` |
| | `returns "site" for site_ prefixed id` |
| | `returns "maintenance" for maintenance id` |
| | `returns null for unknown id` |

---

### `src/utils/__tests__/requestUtils.test.ts`

| Suite | Test Case |
|-------|-----------|
| **requestUtils** | |
| ↳ getReturnHistoryForDisplay | `returns returnHistory when present` |
| | `returns legacy format when status is returned and returnItems exist` |
| | `returns null when no return history` |

---

### `src/utils/__tests__/csvExport.test.ts`

| Suite | Test Case |
|-------|-----------|
| **csvExport** | |
| ↳ saveCsvAndShare | `writes CSV and shares when document directory is available` |
| | `uses default filename when not provided` |

---

### `src/utils/__tests__/poPdfUtils.test.ts`

| Suite | Test Case |
|-------|-----------|
| **poPdfUtils** | |
| ↳ generatePOHtml | `generates HTML for a purchase order` |
| | `escapes HTML in item names` |
| ↳ buildDraftPOForPrint | `builds PO object from form data` |
| | `uses default DRAFT when poNumber not provided` |

---

### `src/utils/__tests__/firebaseUtils.test.ts`

| Suite | Test Case |
|-------|-----------|
| **firebaseUtils** | |
| ↳ timestampToISOString | `should convert Firebase Timestamp to ISO string` |
| | `should handle null/undefined timestamps with fallback to current time` |
| | `should handle Date objects` |
| ↳ isoStringToDate | `should convert ISO string back to Date object` |
| | `should handle null strings` |
| ↳ serializeDocumentSnapshot | `should serialize a DocumentSnapshot` |
| | `should handle null or non-existent documents` |

---

## Level 2 — Redux Slices

**State transitions in isolation. No UI.**

### `src/store/slices/__tests__/authSlice.test.ts`

| Suite | Test Case |
|-------|-----------|
| **authSlice** | `has correct initial state` |
| | `setUser sets user and isAuthenticated when user is provided` |
| | `setUser clears user and isAuthenticated when user is null` |
| | `setUserRole sets userRole and clears isRoleLoading` |
| | `clearError clears error` |
| | `setLoading sets isLoading` |
| | `signInUser.pending sets isLoading and clears error` |
| | `signInUser.fulfilled sets user and isAuthenticated` |
| | `signInUser.rejected clears user and isAuthenticated` |
| | `signOutUser.fulfilled clears user and role` |

---

### `src/store/slices/__tests__/inventorySlice.test.ts`

| Suite | Test Case |
|-------|-----------|
| **inventorySlice** | `has correct initial state` |
| | `setItems sets items and updates lowStockItemIds` |
| | `setCategories sets categories` |
| | `setInventoryForLocation sets inventory for location` |
| | `setLowStockItemIds sets lowStockItemIds` |
| | `setLoading sets loading` |
| | `setError sets error and errorTimestamp` |
| | `setFilters sets filters` |
| | `clearError clears error` |
| | `updateItemInState updates existing item` |
| | `addItem appends item` |
| | `clearInventoryForLocation removes location` |

---

### `src/store/slices/__tests__/requestsSlice.test.ts`

| Suite | Test Case |
|-------|-----------|
| **requestsSlice** | `has correct initial state` |
| | `setRequests sets requests and excludes drafts` |
| | `setMyRequests sets myRequests with deduplication` |
| | `setSelectedRequest sets selectedRequest` |
| | `setFilters merges filters` |
| | `clearFilters resets filters` |
| | `setLoading sets loading` |
| | `setError sets error and clears loading` |
| | `clearError clears error` |
| | `clearRequests resets all` |

---

### `src/store/slices/__tests__/purchaseOrderSlice.test.ts`

| Suite | Test Case |
|-------|-----------|
| **purchaseOrderSlice** | `has correct initial state` |
| | `setPurchaseOrders sets purchaseOrders with deduplication` |
| | `setSelectedPO sets selectedPO` |
| | `setVendors sets vendors with deduplication` |
| | `addOrUpdatePO adds new PO` |
| | `addOrUpdatePO updates existing PO` |
| | `addOrUpdatePO updates selectedPO when it matches` |
| | `setFilters merges filters` |
| | `setLoading sets loading` |
| | `setError sets error and clears loading` |
| | `clearError clears error` |
| | `clearPurchaseOrders resets all` |

---

### `src/store/slices/__tests__/sitesSlice.test.ts`

| Suite | Test Case |
|-------|-----------|
| **sitesSlice** | `has correct initial state` |
| | `setSites sets sites` |
| | `addSite appends site` |
| | `updateSiteInState updates existing site` |
| | `setSearchQuery sets searchQuery` |
| | `setLoading sets isLoading` |
| | `setError sets error` |
| | `clearError clears error` |
| | `fetchSites.fulfilled sets sites` |

---

### `src/store/slices/__tests__/steelMasterSlice.test.ts`

| Suite | Test Case |
|-------|-----------|
| **steelMasterSlice** | `has correct initial state` |
| | `setSteelMasters sets steelMasters` |
| | `setSelectedSteelMaster sets selectedSteelMaster` |
| | `addSteelMaster adds new steel master` |
| | `addSteelMaster does not add duplicate` |
| | `updateSteelMasterInState updates existing` |
| | `removeSteelMaster removes by id` |
| | `removeSteelMaster clears selectedSteelMaster when it matches` |
| | `clearSteelMasterError clears error` |
| | `clearSteelMasters resets all` |

---

### `src/store/slices/__tests__/maintenanceSlice.test.ts`

| Suite | Test Case |
|-------|-----------|
| **maintenanceSlice** | `has correct initial state` |
| | `setMaintenanceRecords sets records and clears loading` |
| | `setSelectedMaintenance sets selectedMaintenance` |
| | `addMaintenanceRecord prepends record` |
| | `updateMaintenanceInState updates existing record` |
| | `updateMaintenanceInState updates selectedMaintenance when it matches` |
| | `removeMaintenanceRecord removes by id` |
| | `setFilters sets filters` |
| | `clearFilters resets filters` |
| | `setLoading sets loading` |
| | `setError sets error` |
| | `clearError clears error` |

---

### `src/store/slices/__tests__/activityLogSlice.test.ts`

| Suite | Test Case |
|-------|-----------|
| **activityLogSlice** | `has correct initial state` |
| | `setFilters merges filters` |
| | `clearFilters resets filters and logs` |
| | `setLoading sets loading` |
| | `setMyActivityLoading sets myActivityLoading` |
| | `setError sets error and clears loading states` |
| | `clearError clears error` |
| | `clearActivityLogs resets all` |
| | `updateLogsFromSnapshot sets logs` |
| | `updateMyActivityFromSnapshot sets myRecentActivity` |
| | `fetchActivityLogs.fulfilled sets logs` |
| | `fetchMyRecentActivity.fulfilled sets myRecentActivity` |

---

## Level 3 — Selectors

**Pure functions that read from state.**

### `src/store/selectors/__tests__/authSelectors.test.ts`

| Suite | Test Case |
|-------|-----------|
| **authSelectors** | `selectUserId returns uid when user exists` |
| | `selectUserId returns null when no user` |
| | `selectIsAdmin returns true for Admin role` |
| | `selectIsAdmin returns false for other roles` |
| | `selectIsStoreIncharge returns true for StoreIncharge` |
| | `selectIsSiteManager returns true for SiteManager` |
| | `selectUserDisplayName returns displayName when present` |
| | `selectUserDisplayName falls back to email` |
| | `selectUserRole returns userRole` |
| | `selectAuthError returns error` |
| | `selectIsAuthenticated returns isAuthenticated` |

---

### `src/store/selectors/__tests__/inventorySelectors.test.ts`

| Suite | Test Case |
|-------|-----------|
| **inventorySelectors** | `selectAllItems returns items` |
| | `selectItemsLoading returns loading state` |
| | `selectInventoryError returns error` |
| | `selectItemById finds item by id` |
| | `selectItemById returns null when not found` |
| | `selectAllCategories returns categories` |
| | `selectLowStockItems returns items in lowStockItemIds` |
| | `selectLowStockCount returns count of low stock ids` |
| | `selectInventoryByLocation returns inventory for location` |
| | `selectInventoryByLocation returns empty array for unknown location` |
| | `selectEmptyInventory returns stable empty array` |
| | `selectActiveItems filters active items` |
| | `selectDiscontinuedItems filters discontinued items` |
| | `selectConsumableItems filters consumable type` |
| | `selectNonConsumableItems filters non_consumable type` |
| | `selectFilteredItems returns all items when no filters` |
| | `selectFilteredItems filters by categoryId` |
| | `selectFilteredItems filters by type` |
| | `selectFilteredItems filters by status` |
| | `selectItemsBySearchQuery returns items matching name` |
| | `selectItemsBySearchQuery returns items matching sku` |
| | `selectItemsBySearchQuery returns all items when search is empty` |
| | `selectFilteredAndSearchedItems intersects filtered and searched` |
| | `selectTotalItemsCount returns item count` |
| | `selectActiveItemsCount returns active item count` |
| | `selectItemsByCategory returns items in category` |
| | `selectCategoryById finds category` |
| | `selectCategoryById returns null when not found` |

---

### `src/store/selectors/__tests__/requestSelectors.test.ts`

| Suite | Test Case |
|-------|-----------|
| **requestSelectors** | `selectAllRequests returns requests` |
| | `selectMyRequests returns myRequests` |
| | `selectSelectedRequest returns selectedRequest` |
| | `selectRequestsFilters returns filters` |
| | `selectRequestById finds request from requests` |
| | `selectRequestById finds request from myRequests` |
| | `selectFilteredRequests filters by status` |
| | `selectPendingRequestsCount returns count of pending` |
| | `selectHighPriorityPendingCount returns count of high priority pending` |

---

### `src/store/selectors/__tests__/purchaseOrderSelectors.test.ts`

| Suite | Test Case |
|-------|-----------|
| **purchaseOrderSelectors** | `selectPurchaseOrders returns purchase orders` |
| | `selectSelectedPO returns selected PO` |
| | `selectVendors returns vendors` |
| | `selectPurchaseOrderLoading returns loading state` |
| | `selectPurchaseOrderError returns error` |
| | `selectPurchaseOrderFilters returns filters` |
| | `selectFilteredPurchaseOrders returns all when status is all` |
| | `selectFilteredPurchaseOrders filters by status` |
| | `selectPendingApprovalCount returns count of pending_approval POs` |
| | `selectPOById finds PO from purchaseOrders` |
| | `selectPOById finds PO from selectedPO` |
| | `selectPOById returns null when not found` |

---

### `src/store/selectors/__tests__/sitesSelectors.test.ts`

| Suite | Test Case |
|-------|-----------|
| **sitesSelectors** | `selectAllSites returns sites` |
| | `selectSitesLoading returns loading state` |
| | `selectSitesError returns error` |
| | `selectSearchQuery returns search query` |
| | `selectActiveSites filters active sites` |
| | `selectInactiveSites filters inactive sites` |
| | `selectSiteById finds site` |
| | `selectSiteById returns null when not found` |
| | `selectFilteredSites returns all when search is empty` |
| | `selectFilteredSites filters by name` |
| | `selectFilteredSites filters by address` |
| | `selectFilteredActiveSites returns only active from filtered` |
| | `selectAssignedSiteIdForUser returns site id when managerId matches` |
| | `selectAssignedSiteIdForUser returns null when no match` |
| | `selectAssignedSiteIdForUser returns null when userId is null` |

---

### `src/store/selectors/__tests__/steelMasterSelectors.test.ts`

| Suite | Test Case |
|-------|-----------|
| **steelMasterSelectors** | `selectAllSteelMasters returns steel masters` |
| | `selectActiveSteelMasters filters active only` |
| | `selectSteelMasterById finds master` |
| | `selectSteelMasterById returns null when not found` |
| | `selectSteelMasterLoading returns loading state` |
| | `selectSteelMasterError returns error` |
| | `selectSelectedSteelMaster returns selected` |

---

### `src/store/selectors/__tests__/maintenanceSelectors.test.ts`

| Suite | Test Case |
|-------|-----------|
| **maintenanceSelectors** | `selectMaintenanceRecords returns records` |
| | `selectSelectedMaintenance returns selected` |
| | `selectMaintenanceLoading returns loading state` |
| | `selectMaintenanceError returns error` |
| | `selectMaintenanceFilters returns filters` |
| | `selectActiveMaintenanceRecords filters pending and partial_return` |
| | `selectWrittenOffRecords filters written_off` |
| | `selectReturnedRecords filters returned` |
| | `selectMaintenanceHistory returns returned and written_off` |
| | `selectMaintenanceByItemId filters by itemId` |
| | `selectFilteredMaintenanceRecords returns all when status is all` |
| | `selectFilteredMaintenanceRecords filters by status` |
| | `selectMaintenanceStats returns correct counts` |
| | `selectMaintenanceByStatus filters by status` |
| | `selectMaintenanceById finds record` |
| | `selectMaintenanceById returns null when not found` |

---

### `src/store/selectors/__tests__/activityLogSelectors.test.ts`

| Suite | Test Case |
|-------|-----------|
| **activityLogSelectors** | `selectActivityLogs returns logs` |
| | `selectMyRecentActivity returns my recent activity` |
| | `selectMyRecentActivitySorted returns sorted by timestamp desc` |
| | `selectActivityLogFilters returns filters` |
| | `selectActivityLogLoading returns loading state` |
| | `selectActivityLogLoadingMore returns loadingMore state` |
| | `selectActivityLogExportLoading returns exportLoading state` |
| | `selectMyActivityLoading returns myActivityLoading state` |
| | `selectActivityLogError returns error` |
| | `selectHasMoreLogs returns hasMore` |
| | `selectLogsByCategory filters by category` |
| | `selectLogsByUser filters by userId` |
| | `selectActivityLogStats returns total and byCategory` |

---

## Level 4 — Hooks

**Light mocking. Test logic.**

### `src/hooks/__tests__/useWeightViewPreference.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **useWeightViewPreference** | `throws when used outside WeightViewPreferenceProvider` |
| | `defaults to pieces when no stored value` |
| | `restores kg from AsyncStorage` |
| | `toggleViewMode switches pieces to kg and persists` |
| | `setViewMode updates mode and persists` |

---

### `src/hooks/__tests__/useInventoryError.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **useInventoryError** | `returns error from Redux state` |
| | `returns null when no error` |
| | `dispatches clearError after autoClearMs` |
| | `dispatches clearError on unmount` |

---

### `src/hooks/__tests__/useAuth.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **useAuth** | `starts with loading true and user null` |
| | `sets loading false and user null when callback fires with null` |
| | `sets user when callback fires with mock user` |
| | `updates user when callback fires again (e.g. sign out)` |
| | `calls unsubscribe on unmount` |

---

### `src/hooks/__tests__/useAuthStateSync.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **useAuthStateSync** | `dispatches setUser when auth callback fires with user` |
| | `dispatches setUser null when auth callback fires with null` |
| | `calls unsubscribe on unmount` |

---

### `src/hooks/__tests__/useUserRoleSync.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **useUserRoleSync** | `dispatches setUserRole null and setRoleLoading false when userId is null` |
| | `subscribes and dispatches setUserRole when callback fires` |
| | `calls unsubscribe on unmount when userId was set` |
| | `does not call subscribeToUserRole when userId is null` |

---

### `src/hooks/__tests__/useManagerValidationSync.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **useManagerValidationSync** | `does not subscribe when user is not authenticated` |
| | `does not subscribe when user is not admin` |
| | `subscribes when user is authenticated admin with role loaded` |
| | `calls unsubscribe on unmount` |
| | `triggers cleanup when SiteManager is deactivated` |

---

### `src/hooks/__tests__/useDashboardSubscriptions.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **useDashboardSubscriptions** | `returns isInitialLoad true and does not subscribe when userId is null` |
| | `returns early when role is null` |
| | `returns early when isVisible is false` |
| | `subscribes for Admin role and sets isInitialLoad false when callback fires` |
| | `triggerRefresh toggles isRefreshing` |
| | `calls all unsubscribes on unmount for Admin` |
| | `subscribes for SiteManager with assignedSiteId` |

---

## Level 5 — Pure UI Components

**Props-only components. Mock icons only.**

### `src/components/__tests__/FormField.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **FormField** | `renders label and value` |
| | `shows required asterisk when required` |
| | `shows error message when error is set` |
| | `calls onChangeText when text changes` |
| | `uses accessibilityLabel for input` |

---

### `src/components/__tests__/AuthLogo.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **AuthLogo** | `renders without crashing` |
| | `uses custom accessibility label when provided` |
| | `renders with custom width` |

---

### `src/components/Requests/__tests__/RequestCard.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **RequestCard** | `renders request number and site name` |
| | `renders item count` |
| | `calls onPress when pressed` |
| | `shows availability indicator when showAvailability is true and sufficient` |
| | `shows insufficient stock when showAvailability is true and not sufficient` |
| | `renders status badge` |

---

### `src/components/Requests/__tests__/RequestStatusBadge.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **RequestStatusBadge** | `renders Draft for draft status` |
| | `renders Pending for pending status` |
| | `renders Approved for approved status` |
| | `renders Rejected for rejected status` |
| | `renders Transferred for transferred status` |
| | `renders Partially Returned for partially_returned status` |
| | `renders Returned for returned status` |
| | `renders Cancelled for cancelled status` |
| | `renders unknown status as raw value when status is not in config` |

---

### `src/components/Requests/__tests__/PrioritySelector.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **PrioritySelector** | `renders all priority options` |
| | `calls onChange when priority is selected` |
| | `shows error message when error prop is provided` |

---

### `src/components/Inventory/__tests__/ItemCard.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **ItemCard** | `renders item name and SKU` |
| | `renders Non-Consumable badge for non_consumable type` |
| | `renders Consumable badge for consumable type` |
| | `shows Low Stock badge when quantity at or below minStockLevel` |
| | `does not show Low Stock badge when quantity above minStockLevel` |
| | `calls onPress when pressed` |
| | `renders stock quantities` |

---

### `src/components/Inventory/__tests__/StockStatusBadge.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **StockStatusBadge** | `renders Adequate for adequate status` |
| | `renders Low Stock for low_stock status` |
| | `renders Discontinued for discontinued status` |

---

### `src/components/Sites/__tests__/SiteCard.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **SiteCard** | `renders site name and address` |
| | `renders manager name` |
| | `shows Not Assigned when no manager` |
| | `shows Active badge for active site` |
| | `shows Inactive badge for inactive site` |
| | `calls onPress when pressed` |
| | `renders description when provided` |
| | `renders contact number when provided` |

---

### `src/components/PurchaseOrder/__tests__/POCard.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **POCard** | `renders PO number and vendor name` |
| | `renders item count` |
| | `renders status badge` |
| | `renders formatted total amount` |
| | `calls onPress when pressed` |
| | `handles empty items array` |

---

### `src/components/Dashboard/DashboardGreeting.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **DashboardGreeting** | `renders correctly for Admin` |
| | `renders correctly for Site Manager with site name` |
| | `renders correctly for Site Manager without site name` |
| | `renders correctly for StoreIncharge` |
| | `renders correctly for Unassigned role` |

---

## Level 6 — Form Components

**Components with Redux or complex callbacks.**

### `src/components/__tests__/UpdatePasswordForm.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **UpdatePasswordForm** | `renders all password fields and submit button` |
| | `shows validation error when current password is empty` |
| | `shows validation error when new password is too short` |
| | `shows validation error when passwords do not match` |
| | `shows validation error when new password same as current` |
| | `calls authService and onSuccess when validation passes` |
| | `calls onError and shows error when auth fails` |

---

### `src/components/Sites/__tests__/SiteForm.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **SiteForm** | `renders all form fields` |
| | `displays initial data when provided` |
| | `calls onSubmit with form data when valid` |
| | `shows validation errors for empty required fields` |
| | `shows error when site name is too short` |
| | `uses custom submit button label` |
| | `disables submit when isLoading` |
| | `switches to active status when Active button pressed` |

---

### `src/components/PurchaseOrder/__tests__/VendorForm.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **VendorForm** | `renders all form fields` |
| | `calls onChange when vendor name changes` |
| | `calls onChange when phone changes` |
| | `displays initial values` |
| | `displays error messages` |

---

### `src/components/Inventory/__tests__/SteelMasterForm.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **SteelMasterForm** | `returns null when not visible` |
| | `renders create mode title when visible` |
| | `renders edit mode title when in edit mode` |
| | `prefills form in edit mode` |
| | `calls onCancel when close button pressed` |
| | `calls onCancel when Cancel button pressed` |
| | `shows validation errors when submitting empty form` |
| | `calls onSubmit with valid data in create mode` |
| | `displays error prop when provided` |
| | `disables buttons when loading` |

---

### `src/components/Requests/__tests__/ItemSelectorModal.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **ItemSelectorModal** | `renders nothing when not visible` |
| | `renders modal with items when visible` |
| | `filters items by search query` |
| | `calls onClose when Cancel is pressed` |
| | `calls onSelect with selected items when Add is pressed` |
| | `excludes items in excludeItemIds` |
| | `shows loading state when loading and no items` |

---

## Level 7 — Screens

**Full screen tests. Mock navigation, Firebase, subscriptions.**

### Authentication

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/Authentication/__tests__/LoginScreen.test.tsx` | **LoginScreen** | `renders welcome text and form fields` |
| | | `shows validation errors for empty form` |
| | | `accepts valid email and password and submits without validation errors` |
| | | `displays auth error from Redux state` |
| | | `shows loading state when isLoading` |
| | | `renders sign up link when onGoToSignup provided` |
| | | `does not render sign up link when onGoToSignup not provided` |
| `src/screens/Authentication/__tests__/SignupScreen.test.tsx` | **SignupScreen** | `renders header text and form fields` |
| | | `shows validation errors for empty form` |
| | | `shows password mismatch when passwords do not match` |
| | | `accepts valid form and submits without validation errors` |
| | | `displays auth error from Redux state` |
| | | `shows loading state when isLoading` |
| | | `renders login link when onGoToLogin provided` |
| | | `does not render login link when onGoToLogin not provided` |
| `src/screens/Authentication/__tests__/AuthFlowScreen.test.tsx` | **AuthFlowScreen** | `renders LoginScreen by default` |
| | | `click "Sign up" link shows SignupScreen` |
| | | `click "Log in" link on SignupScreen shows LoginScreen again` |

---

### Dashboard & Loading

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/__tests__/DashboardScreen.test.tsx` | **DashboardScreen** | `renders Dashboard header` |
| | | `renders Profile button and navigates on press` |
| | | `renders Users button for Admin` |
| | | `does not render Users button for SiteManager` |
| | | `renders DashboardGreeting with user display name` |
| | | `shows activity log error when present` |
| | | `shows dashboard data error when requests error present` |
| | | `renders My Recent Activity for unassigned role` |
| `src/screens/__tests__/LoadingScreen.test.tsx` | **LoadingScreen** | `renders default "Loading..." message` |
| | | `renders custom message when passed as prop` |
| | | `renders ActivityIndicator` |

---

### Users

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/Users/__tests__/ProfileScreen.test.tsx` | **ProfileScreen** | `renders profile header and user info` |
| | | `shows Unassigned when role is null` |
| | | `shows Inactive when user role is not active` |
| | | `calls goBack when back button is pressed` |
| | | `dispatches signOut when Sign out is pressed` |
| | | `shows loading state on Sign out button when isLoading` |
| | | `renders Update Password button when showPasswordUpdate is true` |
| `src/screens/Users/__tests__/UsersScreen.test.tsx` | **UsersScreen** | `renders header "Users" and Users component` |
| | | `shows loading overlay when Users reports loading and no data` |
| | | `hides loading when Users reports data received` |
| | | `back button calls goBack` |
| `src/screens/Users/__tests__/UpdatePasswordScreen.test.tsx` | **UpdatePasswordScreen** | `renders header and UpdatePasswordForm` |
| | | `back button calls goBack` |
| | | `form success triggers handleSuccess which eventually calls goBack` |
| | | `uses navigation prop when passed for testing` |

---

### Requests

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/Requests/__tests__/MyRequestsScreen.test.tsx` | **MyRequestsScreen** | `renders My Requests header` |
| | | `renders all tabs` |
| | | `shows empty state when no requests` |
| | | `shows Create new request button for SiteManager with assigned site` |
| | | `navigates to CreateRequest when Create button pressed` |
| | | `shows loading state when loading and no requests` |
| | | `renders request list when requests exist` |
| | | `switches tab when tab pressed` |
| `src/screens/Requests/__tests__/RequestQueueScreen.test.tsx` | **RequestQueueScreen** | `renders Request Queue header` |
| | | `shows loading state when loading and no requests` |
| | | `shows empty state when no requests and filters are all` |
| | | `shows filter-adjusted message when filters are applied` |
| | | `renders site and status filter chips` |
| | | `dispatches setFilters when filters are pressed` |
| | | `renders request list when requests exist` |
| | | `navigates to ProcessRequest when request card pressed` |
| | | `renders priority sections` |
| `src/screens/Requests/__tests__/CreateRequestScreen.test.tsx` | **CreateRequestScreen** | `renders screen with site name and empty items state` |
| | | `opens ItemSelectorModal when Add items is pressed` |
| | | `adds selected items to list when confirming in modal` |
| | | `shows validation error when submitting without items` |
| | | `submits request and navigates back on success` |
| | | `saves draft and navigates back on success` |
| | | `shows error alert when createRequest rejects` |
| | | `disables submit buttons while submitting` |
| `src/screens/Requests/__tests__/ProcessRequestScreen.test.tsx` | **ProcessRequestScreen** | `shows loading when request not loaded` |
| | | `renders request items when request in store` |
| | | `back button calls goBack` |
| | | `approve button dispatches approveRequest when StoreIncharge and all sufficient` |
| `src/screens/Requests/__tests__/EditRequestScreen.test.tsx` | **EditRequestScreen** | `shows loading initially` |
| | | `renders form when draft request loads` |
| | | `non-draft request shows Alert and goBack` |
| | | `Save Draft dispatches editRequest` |
| | | `Submit Request dispatches submitDraftRequest` |
| | | `Back button calls goBack` |
| `src/screens/Requests/__tests__/ConfirmTransferScreen.test.tsx` | **ConfirmTransferScreen** | `shows loading initially` |
| | | `renders form when approved request loads` |
| | | `non-approved request shows Alert and goBack` |
| | | `validation: receivedBy required` |
| | | `submit dispatches transferRequest and success Alert` |
| | | `back button calls goBack` |
| `src/screens/Requests/__tests__/RejectRequestScreen.test.tsx` | **RejectRequestScreen** | `shows loading state initially` |
| | | `renders form with request number when request loads` |
| | | `validation: submit without reason shows error` |
| | | `select reason and add comments, submit dispatches rejectRequest` |
| | | `success Alert OK calls goBack` |
| `src/screens/Requests/__tests__/ReturnItemsScreen.test.tsx` | **ReturnItemsScreen** | `shows loading state initially` |
| | | `shows error and goes back when request status is not transferable` |
| | | `shows no returnable items when only consumables` |
| | | `renders items to return when request has non-consumables with remaining qty` |
| | | `selects item, sets quantity and condition, submits successfully` |
| | | `shows validation error when submitting without selection` |
| | | `shows all items returned when none have remaining qty` |

---

### Sites

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/Sites/__tests__/SiteManagementScreen.test.tsx` | **SiteManagementScreen** | `renders Site Management header` |
| | | `renders Add new site button in header` |
| | | `navigates to AddSite when Add button pressed` |
| | | `shows empty state when no sites` |
| | | `shows search-adjusted message when no sites match search` |
| | | `renders search input` |
| | | `dispatches setSearchQuery when search input changes` |
| | | `renders site list when sites exist` |
| | | `renders active and inactive sections` |
| | | `navigates to EditSite when site card pressed` |
| | | `shows error state when fetchSites rejects` |
| | | `shows loading state when fetchSites is pending` |
| `src/screens/Sites/__tests__/AddSiteScreen.test.tsx` | **AddSiteScreen** | `renders header "Add New Site" and SiteForm` |
| | | `Cancel button calls goBack` |
| | | `Submit with valid data dispatches createSite and goBack` |
| | | `Error banner shows when selectSitesError has value` |
| | | `Back button calls goBack` |
| `src/screens/Sites/__tests__/EditSiteScreen.test.tsx` | **EditSiteScreen** | `shows loading when fetching site` |
| | | `renders form with site data when loaded` |
| | | `Submit dispatches updateSite and goBack` |
| | | `Back button calls goBack` |

---

### Inventory

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/Inventory/__tests__/CentralStoreInventoryScreen.test.tsx` | **CentralStoreInventoryScreen** | `renders Central Store header` |
| | | `renders Add new item button for admin` |
| | | `navigates to AddEditItem when Add button pressed` |
| | | `navigates to SteelMaster when Steel Master button pressed` |
| | | `renders search input` |
| | | `shows empty state when no items` |
| | | `shows Add First Item button when empty` |
| | | `renders item list when items exist` |
| | | `navigates to ItemDetail when item pressed` |
| | | `shows loading state when fetchItems is pending` |
| | | `shows error state when fetchItems rejects` |
| | | `toggles filters when filter button pressed` |
| | | `renders Maintenance button for admin` |
| `src/screens/Inventory/__tests__/MySiteInventoryScreen.test.tsx` | **MySiteInventoryScreen** | `shows loading when sites loading` |
| | | `shows No Site Assigned when user has no assigned site` |
| | | `renders inventory when user has assigned site` |
| | | `search filters items` |
| | | `View other sites opens modal` |
| | | `Back button calls goBack` |
| | | `Selecting a site in modal navigates to OtherSiteInventory` |
| `src/screens/Inventory/__tests__/OtherSiteInventoryScreen.test.tsx` | **OtherSiteInventoryScreen** | `shows loading when site loading` |
| | | `shows error when site not found` |
| | | `renders site name and inventory when loaded` |
| | | `back button calls goBack` |
| `src/screens/Inventory/__tests__/ItemDetailScreen.test.tsx` | **ItemDetailScreen** | `shows loading when item not in store` |
| | | `renders item details when item in store (name, SKU, stock)` |
| | | `edit button navigates to AddEditItem with itemId` |
| | | `add stock opens StockEntryModal` |
| | | `back button calls goBack` |
| `src/screens/Inventory/__tests__/AddEditItemScreen.test.tsx` | **AddEditItemScreen** | `renders create form when no itemId` |
| | | `shows loading when itemId and fetching` |
| | | `renders form with item data when editing` |
| | | `validation: submit without required fields shows error` |
| | | `submit create dispatches createItem` |
| | | `back button calls goBack` |
| `src/screens/Inventory/__tests__/CategoryManagementScreen.test.tsx` | **CategoryManagementScreen** | `renders header and add button` |
| | | `renders category list when categories in store` |
| | | `search filters categories` |
| | | `Add category opens modal and creates` |
| | | `Edit category opens modal` |
| | | `Back button calls goBack` |
| `src/screens/Inventory/__tests__/SteelMasterScreen.test.tsx` | **SteelMasterScreen** | `shows loading when loading and no data` |
| | | `renders steel master list when data in store` |
| | | `Add button shows form` |
| | | `Edit button opens form with master data` |
| | | `Back button calls goBack` |
| | | `pull-to-refresh works` |

---

### Purchase Orders

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/PurchaseOrder/__tests__/PurchaseOrderListScreen.test.tsx` | **PurchaseOrderListScreen** | `renders Purchase Orders header` |
| | | `renders New button in header` |
| | | `navigates to CreatePO when New button pressed` |
| | | `shows loading state when loading and no orders` |
| | | `shows empty state when no orders` |
| | | `shows filter-adjusted message when filters applied` |
| | | `renders status filter chips` |
| | | `dispatches setFilters when filter chip pressed` |
| | | `renders PO list when orders exist` |
| | | `navigates to ApprovePO when pending_approval PO pressed` |
| | | `navigates to CreatePO when draft PO pressed` |
| | | `shows subscription error when subscription fails` |
| | | `shows Create Purchase Order button when empty` |
| `src/screens/PurchaseOrder/__tests__/CreatePOScreen.test.tsx` | **CreatePOScreen** | `renders create form when no poId (new PO)` |
| | | `shows vendor selector and item selector buttons` |
| | | `validation: submit without vendor shows error` |
| | | `validation: submit without items shows error` |
| | | `back button calls goBack` |
| `src/screens/PurchaseOrder/__tests__/ApprovePOScreen.test.tsx` | **ApprovePOScreen** | `shows loading state initially` |
| | | `shows error state when getPOById fails` |
| | | `renders PO details when loaded (admin, pending_approval)` |
| | | `approves PO and navigates back on success` |
| | | `shows reject form when Reject pressed, then rejects on confirm` |
| `src/screens/PurchaseOrder/__tests__/ReceivePOScreen.test.tsx` | **ReceivePOScreen** | `shows loading state initially` |
| | | `shows error when getPOById returns null` |
| | | `renders form with PO items when PO loads` |
| | | `submit dispatches receivePO thunk and shows success Alert` |
| | | `back button calls goBack` |
| `src/screens/PurchaseOrder/__tests__/VendorManagementScreen.test.tsx` | **VendorManagementScreen** | `renders header and add button` |
| | | `renders vendor list when vendors in store (preload)` |
| | | `renders vendor list when subscription callback provides vendors` |
| | | `search filters vendors` |
| | | `Add button navigates to AddVendor with empty params` |
| | | `Vendor card press navigates to AddVendor with vendorId` |
| | | `Back button calls goBack` |
| `src/screens/PurchaseOrder/__tests__/AddVendorScreen.test.tsx` | **AddVendorScreen** | `renders empty form when no vendorId (new vendor)` |
| | | `shows loading when vendorId and fetching` |
| | | `renders form with vendor data when editing (mock getVendorById)` |
| | | `validation: submit without name shows error` |
| | | `submit create dispatches createVendor and goBack` |
| | | `back button calls goBack` |

---

### Maintenance

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/Maintenance/__tests__/MaintenanceDashboardScreen.test.tsx` | **MaintenanceDashboardScreen** | `shows loading when loading and no data` |
| | | `renders active tab with maintenance cards when data in store` |
| | | `switch to history tab shows history records` |
| | | `add button navigates to AddToMaintenance` |
| | | `card press navigates to MaintenanceDetail with maintenanceId` |
| | | `pull-to-refresh works` |
| `src/screens/Maintenance/__tests__/MaintenanceDetailScreen.test.tsx` | **MaintenanceDetailScreen** | `shows loading when maintenance not loaded` |
| | | `renders maintenance details when in store (item name, SKU, status)` |
| | | `Return button navigates to ReturnFromMaintenance when status allows` |
| | | `Write-off button navigates to WriteOff when status allows` |
| | | `Back button calls goBack` |
| `src/screens/Maintenance/__tests__/AddToMaintenanceScreen.test.tsx` | **AddToMaintenanceScreen** | `renders form with item selector and add button` |
| | | `shows validation error when submitting without selection` |
| | | `selects item, sets issue type and description, submits successfully` |
| | | `does not submit when description is too short` |
| `src/screens/Maintenance/__tests__/ReturnFromMaintenanceScreen.test.tsx` | **ReturnFromMaintenanceScreen** | `shows loading state when maintenance is null` |
| | | `renders form with item info when maintenance is in store` |
| | | `increment/decrement quantity buttons work and respect bounds` |
| | | `validation: submit without repair summary shows error` |
| | | `validation: repair summary < 10 chars shows error` |
| | | `submit with valid data dispatches returnFromMaintenanceThunk and shows success Alert` |
| | | `success Alert OK calls navigation.goBack` |
| `src/screens/Maintenance/__tests__/WriteOffScreen.test.tsx` | **WriteOffScreen** | `shows loading state when maintenance is null` |
| | | `renders form with item info when maintenance is in store` |
| | | `increment/decrement quantity buttons work` |
| | | `validation: submit without reason shows error` |
| | | `validation: submit without explanation or < 20 chars shows error` |
| | | `select reason via WriteOffReasonSelector` |
| | | `fill form, submit - triggers confirmation Alert; on Confirm dispatches writeOffItemThunk and shows success Alert` |

---

### Activity Log

| File | Suite | Test Cases |
|------|-------|------------|
| `src/screens/ActivityLog/__tests__/ActivityLogScreen.test.tsx` | **ActivityLogScreen** | `renders Activity Log header` |
| | | `renders Export button in header` |
| | | `shows export loading state when exportLoading` |
| | | `shows loading state when loading and no logs` |
| | | `shows empty state when no logs and no filters` |
| | | `shows filter-adjusted empty state when filters applied` |
| | | `renders Open filters button` |
| | | `shows All Logs when no filters applied` |
| | | `shows Filters Applied when filters applied` |
| | | `renders Clear filters button when filters applied` |
| | | `dispatches clearFilters when Clear filters pressed` |
| | | `renders error banner when error present` |
| | | `renders log list when logs exist` |
| | | `opens filter modal when Open filters pressed` |
| | | `shows log list with loading more state when loadingMore` |
| `src/screens/ActivityLog/__tests__/MyActivityScreen.test.tsx` | **MyActivityScreen** | `shows loading when loading and no data` |
| | | `renders activity list when data in store` |
| | | `card press opens detail modal` |
| | | `pull-to-refresh works` |
| | | `subscribes to real-time activity on mount when userId present` |
| | | `does not subscribe when userId is null` |

---

## Level 8 — Integration & Workflows

**Multi-step flows, modals, async behavior.**

### `src/__tests__/integration/LoginToDashboard.test.tsx`

| Suite | Test Case |
|-------|-----------|
| **LoginToDashboard Integration** | `shows Main/Dashboard when isAuthenticated=true and isRoleLoading=false` |
| | `shows Auth/Login when isAuthenticated=false` |
| | `shows Loading screen when isAuthenticated=true and isRoleLoading=true` |

---

## Summary Statistics

| Category | Test Files | Approx. Test Cases |
|----------|------------|---------------------|
| **Utilities** | 9 | ~90 |
| **Redux Slices** | 8 | ~75 |
| **Selectors** | 8 | ~120 |
| **Hooks** | 7 | ~30 |
| **Components** | 16 | ~95 |
| **Screens** | 37 | ~280 |
| **Integration** | 1 | 3 |
| **Total** | ~91 | ~693 |

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage

# Specific test file
npm test -- RequestCard

# Specific suite
npm test -- --testNamePattern="CreateRequestScreen"
```

---

*Last updated: Generated from codebase analysis.*
