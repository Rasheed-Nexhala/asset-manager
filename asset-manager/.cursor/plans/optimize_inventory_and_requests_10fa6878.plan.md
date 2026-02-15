---
name: Optimize Inventory and Requests
overview: Comprehensive optimization plan separated into SAFE and BREAKING changes to fix edge cases, remove unused code, extract duplicate logic, improve error handling, and enhance performance across Inventory and Request modules. Uses parallel subagents for efficient implementation.
todos:
  - id: safe-phase1-utilities
    content: "[SAFE] Create shared utility files (exact logic preservation)"
    status: pending
  - id: safe-phase2-performance
    content: "[SAFE] Add React.memo, useMemo, useCallback optimizations"
    status: pending
  - id: safe-phase3-remove-unused
    content: "[SAFE] Remove confirmed unused code"
    status: pending
  - id: safe-phase4-extract-duplicate
    content: "[SAFE] Extract duplicate logic to shared components/hooks"
    status: pending
  - id: safe-phase5-typescript
    content: "[SAFE] Fix TypeScript issues and improve exports"
    status: pending
  - id: breaking-phase1-additive-safety
    content: "[BREAKING-LOW] Add null checks, error handlers, loading states (non-disruptive)"
    status: pending
  - id: breaking-phase2-validation
    content: "[BREAKING-MEDIUM] Add stricter validation with backward compatibility"
    status: pending
  - id: breaking-phase3-bug-fixes
    content: "[BREAKING-HIGH] Fix bugs that change behavior (requires testing)"
    status: pending
isProject: false
---

# Inventory & Requests Optimization Plan

## ⚠️ REVISED: Safe vs Breaking Changes Strategy

This plan is now organized into **SAFE** (non-breaking) and **BREAKING** (potentially breaking) phases to minimize risk. Each phase will use **multiple parallel subagents** for efficient implementation.

## Overview

Comprehensive optimization addressing edge cases, unused code, duplicate logic, missing error handling, and performance issues across Inventory and Requests modules while preserving existing functionality.

---

## 🔵 SAFE REFACTORING (No Breaking Changes)

---

## SAFE Phase 1: Extract Shared Utilities & Constants

**Risk Level:** 🟢 SAFE - Exact logic preservation, no behavior changes
**Parallel Implementation:** 5 subagents (one per utility/constant file)
**Estimated Time:** 2-3 hours

### Create Shared Utility Files

**Implementation Strategy:** Use 5 parallel subagents, each creating one utility file

**Subagent 1: Date Utilities**
**1.1 Create `src/utils/dateUtils.ts**`

- Extract `formatDate` function (currently duplicated in 4+ files)
- **CRITICAL:** Keep EXACT same logic - no validation changes
- Handle both Firestore Timestamps and ISO strings (existing behavior)
- Only add null/undefined checks with same fallback behavior
- Files to extract from: `ReturnItemsScreen.tsx`, `ProcessRequestScreen.tsx`, `RequestCard.tsx`
- **Test:** Ensure formatted dates match exactly with existing output

**Subagent 2: Weight Utilities**
**1.2 Create `src/utils/weightUtils.ts**`

- Extract weight calculation logic (duplicated across 6+ components)
- Extract weight-based item checks
- **CRITICAL:** Replace hardcoded `/1000` with `TON_TO_KG = 1000` constant (same value)
- Files to extract from: `ItemForm.tsx`, `WeightDisplay.tsx`, `RequestItemCard.tsx`, `StockEntryModal.tsx`
- **Test:** Verify all weight calculations produce identical results

**Subagent 3: Inventory Utilities**
**1.3 Create `src/utils/inventoryUtils.ts**`

- Extract deduplication logic (duplicated in `OtherSiteInventoryScreen.tsx` and `MySiteInventoryScreen.tsx`)
- Extract low stock calculation logic (keep existing `<=` comparison)
- Extract pluralization utility (simple singul ar/plural logic)
- **CRITICAL:** Keep exact same deduplication algorithm (Map-based)
- Files affected: Multiple inventory screens
- **Test:** Verify deduplicated arrays have same items in same order

**Subagent 4: Request Constants**
**1.4 Create `src/constants/requestConstants.ts**`

- Extract priority configuration (duplicated in `RequestCard.tsx` and `PrioritySelector.tsx`)
- Extract status configuration from `RequestStatusBadge.tsx`
- **CRITICAL:** Copy exact object structures, colors, labels
- Add proper TypeScript types (non-breaking)
- Files affected: `RequestCard.tsx`, `PrioritySelector.tsx`, `RequestStatusBadge.tsx`
- **Test:** Visual regression test - ensure UI looks identical

**Subagent 5: Validation Utilities**
**1.5 Create `src/utils/validationUtils.ts**`

- Extract form validation logic (duplicated in 3+ request screens)
- **CRITICAL:** Keep exact same validation rules - no stricter validation
- Extract SKU validation (existing pattern only)
- Extract category name validation (existing trim + length check)
- Files to extract from: `CreateRequestScreen.tsx`, `EditRequestScreen.tsx`, `CategoryManagementScreen.tsx`
- **Test:** Ensure same inputs pass/fail as before

---

## Phase 2: Fix Edge Cases & Add Error Handling

### 2.1 Services Layer

`**src/services/firebase/requestService.ts**`

- Line 888-894: Add null check for `createdAt` timestamp before calling `toMillis()`
- Lines 42-72: Add better error handling in `generateRequestNumber` fallback
- Lines 553-593: Improve error messages in `returnItems` retry logic to distinguish transient vs permanent failures

`**src/services/firebase/inventoryService.ts**`

- Lines 218-237: Add validation that `sku` parameter is not empty string before querying
- Lines 463-568: Add validation for negative quantity in `adjustQuantity`
- Lines 656-660: Handle case where `locationId` or `locationType` is null/undefined

`**src/services/firebase/steelMasterService.ts**`

- Lines 62-88: Validate `activeOnly` parameter type
- Lines 116-135: Add HSN code format validation in `createSteelMaster`

### 2.2 Selectors

`**src/store/selectors/inventorySelectors.ts**`

- Lines 169-187: Add null checks for `searchQuery` parameter
- Lines 253-273: Fix placeholder logic in `selectInventoryStatsForLocation` that always returns `true`

`**src/store/selectors/requestSelectors.ts**`

- Lines 21-25: Add fallback for malformed `updatedAt` objects in `getUpdatedAtMs`
- Lines 132-138: Add similar null handling for `getCreatedAtMs`

### 2.3 Components

**Inventory Components:**

`CategoryEditModal.tsx`:

- Line 59: Add trim before max length validation
- Lines 42-49: Fix useEffect dependency to use `category?.id` instead of full object
- Line 68: Display caught errors to user instead of just console.error

`SteelMasterForm.tsx`:

- Lines 66-67: Improve parseFloat handling for empty strings
- Line 73: Add HSN code format validation (alphanumeric + dashes)
- Lines 61-77: Memoize `validate` function with `useCallback`

`StockEntryModal.tsx`:

- Line 106: Remove unsafe non-null assertion, add proper validation
- Line 93: Validate `notes` is not just whitespace
- Lines 132-135: Improve error messages with specific error details

`ItemForm.tsx`:

- Lines 303-304: Replace hardcoded `/1000` with `TON_TO_KG` constant
- Line 168: Add check for `steelMasters.length === 0 && !loading` before fetching
- Line 369: Show user-friendly error message for image picker failures instead of just logging

**Request Components:**

`RequestStatusBadge.tsx`:

- Line 53: Add proper fallback handling when `status` is not in config
- Move `statusConfig` outside component or memoize to avoid recreation

`RequestItemCard.tsx`:

- Line 32: Validate `item.quantityRequested` is a valid number
- Line 67: Add `onError` handler for Image component
- Lines 35-37: Remove unnecessary `useEffect` for state sync

`ItemSelectorModal.tsx`:

- Lines 34-43: Add null checks for `item.name` and `item.sku` in filter
- Line 138: Add `onError` handler for Image component
- Line 29: Add error boundary handling for selector

### 2.4 Screens

**Inventory Screens:**

`OtherSiteInventoryScreen.tsx`:

- Line 37: Add early return with error state if `siteId` is undefined
- Lines 90-93: Display inventory fetch errors to user instead of just logging

`AddEditItemScreen.tsx`:

- Lines 156-159: Add error handling for orphan cleanup failures
- Line 124: Validate category is active, not just exists

`CentralStoreInventoryScreen.tsx`:

- Lines 84-88: Add validation that `minStockLevel` is positive
- Line 86: Add null check for `totalQuantity`
- Lines 106-112: Add error handling for subscription failures

`MySiteInventoryScreen.tsx`:

- Lines 72-81: Add handling for multiple sites with same managerId
- Lines 85-88: Add error handling for `fetchInventoryByLocation`
- Lines 62-68: Add error handling for subscription

`ItemDetailScreen.tsx`:

- Lines 96-98: Handle case where item is deleted between navigation and load
- Lines 400-409: Handle `minStockLevel === 0` in progress bar calculation (prevent division by zero)
- Line 194: Add error handler for image load failures

**Request Screens:**

`ReturnItemsScreen.tsx`:

- Lines 88-89: Add null check for `quantityApproved` before subtraction
- Line 198: Show error state instead of returning null
- Lines 82-111: Add `.catch()` for network errors in promise

`RejectRequestScreen.tsx`:

- Lines 64-69: Add proper error handling for failed request fetch
- Lines 82-88: Fix duplicate comments error setting bug

`RequestQueueScreen.tsx`:

- Lines 120-124: Handle case where `invItem` is undefined (deleted item)
- Line 172: Fix loading indicator logic for existing requests

`MyRequestsScreen.tsx`:

- Lines 84-88: Show user feedback when `currentSite` is null
- Lines 68-75: Add error handling for subscription failures

`ConfirmTransferScreen.tsx`:

- Lines 59-75: Add status change validation before showing transfer form
- Lines 59-75: Add `.catch()` for promise error handling

`EditRequestScreen.tsx`:

- Lines 78-94: Validate request status hasn't changed before showing edit form
- Lines 129-141: Add quantity validation (> 0 and within limits)
- Lines 78-94: Add `.catch()` for promise

`CreateRequestScreen.tsx`:

- Lines 66-71: Add error handling for failed `fetchSites()` and `fetchItems()`
- Lines 105-112: Add runtime validation for duplicate items

`ProcessRequestScreen.tsx`:

- Lines 110-117: Add fallback for timestamps without `toMillis()` method
- Lines 136-151: Log errors or show feedback instead of silent failure

---

## Phase 3: Remove Unused Code

### 3.1 Remove Unused Components

`**src/components/Requests/AvailabilityIndicator.tsx**`

- Lines 1-42: Component is completely unused
- **Action:** Delete file or integrate into `RequestCard.tsx` and `RequestItemCard.tsx`

### 3.2 Remove Unused State & Functions

`**src/screens/Requests/ConfirmTransferScreen.tsx**`

- Lines 52, 77-87: Remove unused `selectedItems` state and `toggleItem` function
- Remove associated checkbox UI (lines 168-211)

`**src/screens/Inventory/MySiteInventoryScreen.tsx**`

- Lines 294-297: Remove incomplete `onPress` handler or implement properly

`**src/screens/Requests/ProcessRequestScreen.tsx**`

- Lines 46-50: Remove unused `priorityConfig.color` property

`**src/screens/Inventory/CentralStoreInventoryScreen.tsx**`

- Lines 65-66: Remove unused `lowStockCount` and `totalItemsCount` variables

### 3.3 Remove Unused Code in Services

`**src/store/selectors/inventorySelectors.ts**`

- Lines 189-209: Mark `selectItemsBySearchQueryFactory` as deprecated (legacy pattern)

`**src/components/Inventory/ReturnItemsScreen.tsx**`

- Lines 76-78: Remove unnecessary `useCallback` wrapper for `nonConsumableItems`

---

## Phase 4: Performance Optimization

### 4.1 Add React.memo to List Components

Add `React.memo` to prevent unnecessary re-renders:

- `CategoryListItem.tsx`
- `InventoryListItem.tsx`
- `ItemCard.tsx`
- `RequestStatusBadge.tsx`
- `RequestItemCard.tsx`
- `RequestCard.tsx`
- `PrioritySelector.tsx`
- `AvailabilityIndicator.tsx` (if kept)

### 4.2 Add useMemo for Expensive Calculations

`**RequestItemCard.tsx`:**

- Lines 148-155: Memoize weight calculation with `useMemo`

`**RequestQueueScreen.tsx`:**

- Lines 120-124: Memoize `isAllSufficient` calculation with `useMemo`
- Line 121: Optimize O(n²) complexity by creating item lookup Map

`**ItemSelectorModal.tsx`:**

- Lines 34-43: Memoize `filteredItems` with `useMemo`
- Line 56: Memoize selected items array

`**CentralStoreInventoryScreen.tsx`:**

- Lines 69-71: Memoize inline selector usage
- Lines 94-98: Derive from `filteredItems` instead of recalculating

`**MySiteInventoryScreen.tsx`:**

- Lines 124-134: Add debouncing to search filter
- Line 301-306: Memoize steel items check

`**ProcessRequestScreen.tsx`:**

- Lines 291-302: Memoize item mapping

### 4.3 Add useCallback for Event Handlers

`**RequestItemCard.tsx`:**

- Lines 39-51: Wrap `handleIncrement`/`handleDecrement` in `useCallback`
- Line 53: Wrap `handleQuantityInput` in `useCallback`

`**ItemSelectorModal.tsx`:**

- Lines 114-161: Wrap `renderItem` in `useCallback`

`**SteelMasterScreen.tsx`:**

- Line 186: Wrap `renderCustomHeader` in `useCallback`

`**ItemForm.tsx`:**

- Lines 275-281: Review `updateField` dependency array

### 4.4 Move Static Data Outside Components

`**RequestStatusBadge.tsx`:**

- Lines 9-50: Move `statusConfig` outside component

`**RequestCard.tsx`:**

- Lines 14-18: Move `priorityConfig` outside (or use from constants file)

---

## Phase 5: Extract Duplicate Logic

### 5.1 Create Reusable Components

**Create `SearchBarComponent.tsx`:**

- Extract search bar pattern from:
  - `CentralStoreInventoryScreen.tsx` (lines 310-333)
  - `MySiteInventoryScreen.tsx` (lines 211-233)
  - `CategoryManagementScreen.tsx` (lines 276-297)

**Create `ImageWithPlaceholder.tsx`:**

- Extract image+placeholder pattern from:
  - `RequestItemCard.tsx` (lines 65-75)
  - `ItemSelectorModal.tsx` (lines 138-147)

**Create `WeightDisplayList.tsx`:**

- Extract repetitive WeightDisplay usage from:
  - `ItemCard.tsx` (lines 86-130)
  - `ItemDetailScreen.tsx` (lines 258-330)

### 5.2 Create Custom Hooks

**Create `useRequestRefresh.ts`:**

- Extract `handleRefresh` pattern from:
  - `MyRequestsScreen.tsx` (lines 77-81)
  - `RequestQueueScreen.tsx` (lines 94-98)

**Create `useDebounce.ts`:**

- For search input debouncing in multiple screens

### 5.3 Consolidate Logic Functions

**Split `ItemForm.tsx`:**

- Lines 286-350: Extract `handleUnitChange` to separate helper
- Lines 386-462: Split `validateForm` into smaller validators
- Lines 467-489: Remove `isFormValid`, use `validateForm` directly
- Lines 521-528: Extract conversion logic to utility

---

## Phase 6: Improve Code Structure

### 6.1 Fix TypeScript Issues

**Remove @ts-ignore comments:**

- `OtherSiteInventoryScreen.tsx` (line 131)
- `AddEditItemScreen.tsx` (lines 172, 237, 270)
- Fix navigation typing properly

### 6.2 Improve Export Consistency

`**src/components/Inventory/index.ts`:**

- Export all components or document internal-only components
- Missing exports: `CategoryListItem`, `CategoryEditModal`, `SteelMasterForm`, `UnitSelector`, `StockEntryModal`, `WeightDisplay`, `SteelMasterSelector`, `ViewModeToggle`, `InventoryListItem`

`**src/components/Requests/index.ts`:**

- Remove `AvailabilityIndicator` export if component is deleted

### 6.3 Split Large Components

`**ItemForm.tsx` (981 lines):**

- Extract weight-based item section to `WeightBasedItemFields.tsx`
- Extract steel master section to `SteelMasterFields.tsx`
- Extract stock level section to `StockLevelFields.tsx`

`**CategoryManagementScreen.tsx`:**

- Lines 331-405: Extract modal JSX to `CategoryModal.tsx`

`**ProcessRequestScreen.tsx`:**

- Lines 331-444: Extract return history rendering to `ReturnHistory.tsx`

---

## Phase 7: Testing & Validation

### 7.1 Add Input Validation

- Validate all numeric inputs are not negative
- Validate all text inputs are not just whitespace
- Validate dates are valid Firestore Timestamps or ISO strings
- Validate SKU format consistency

### 7.2 Add Error Boundaries

- Wrap selector usage in error boundaries
- Add fallback UI for subscription failures
- Add retry logic for transient errors

### 7.3 Add Loading States

- Add loading indicators for all async operations
- Prevent multiple simultaneous submissions
- Add optimistic UI updates where appropriate

---

## Implementation Order

1. **Phase 1** (Day 1-2): Create utility files and constants - enables other refactoring
2. **Phase 2.1-2.2** (Day 3-4): Fix critical edge cases in services and selectors
3. **Phase 3** (Day 5): Remove unused code - cleanup before optimization
4. **Phase 2.3-2.4** (Day 6-8): Fix edge cases in components and screens
5. **Phase 4** (Day 9-10): Performance optimization (memoization)
6. **Phase 5** (Day 11-12): Extract duplicate logic
7. **Phase 6** (Day 13-14): Improve code structure
8. **Phase 7** (Day 15): Testing and validation

---

## Risk Mitigation

- Test each phase thoroughly before moving to next
- Create feature branches for each major change
- Keep PRs small and focused
- Document breaking changes
- Update tests alongside code changes
- Monitor performance metrics after optimization

---

## Success Metrics

- Zero unused code remaining
- All edge cases handled with proper error messages
- All list components memoized
- Search operations debounced
- No duplicate logic across files
- All @ts-ignore comments removed
- 100% error handling coverage for async operations
- Performance improvement: 30%+ reduction in unnecessary re-renders

