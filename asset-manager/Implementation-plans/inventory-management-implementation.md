# Inventory Management – Implementation Plan

## 1. Feature Overview

**What we're building:** A two-tier inventory system with (1) **Central Store Inventory** (main warehouse) and (2) **Site Inventories** (per-site stock). Items are either **consumable** (single-use, no return) or **non-consumable** (returnable). There are no prices on items (prices only in POs). Quantity adjustments require a mandatory reason and notes; low-stock alerts trigger when available quantity is at or below the minimum level.

**User roles:** **Admin** and **Store Incharge** manage central store and see all inventory; **Site Manager** sees only their site’s inventory and other sites’ inventory (read-only). Site Managers cannot see central store inventory.

---

## 2. Step-by-Step Implementation

### Step 1: Firebase Setup

**Firestore collections to create/use:**

| Collection               | Purpose |
|--------------------------|--------|
| `items`                  | Item master (name, SKU, category, type, unit, minStockLevel, status, denormalized stock totals). |
| `inventory`              | Location-level stock (itemId, locationId, locationType, locationName, quantity). |
| `categories`             | Item categories (name). |
| `inventoryAdjustments`   | Audit log for every quantity change (itemId, locationId, type add/remove, quantityBefore/After, reason, notes, adjustedBy, createdAt). |

**Security rules** – file: `firestore.rules`

- **items:** Read/write only if user is Admin or Store Incharge.
- **inventory:** Read if Admin/Store Incharge (all), or if Site Manager and document’s `locationType == 'site'` (so Site Managers never see `store` or `maintenance`). Write only Admin/Store Incharge.
- **categories:** Read/write only Admin/Store Incharge.
- **inventoryAdjustments:** Read Admin/Store Incharge; create only Admin/Store Incharge (no update/delete).

Use helper functions (e.g. `isAdmin()`, `isStoreIncharge()`, `isSiteManager()`) that read from a `userRoles` or similar document based on `request.auth.uid`.

**Storage:** Ensure `storage.rules` allow authenticated Store Incharge/Admin to upload item images (e.g. under `itemImages/{itemId}`).

---

### Step 2: Service Layer

**File:** `src/services/firebase/inventoryService.ts` (create)

| Method | Purpose |
|--------|--------|
| `listItems(filters?)` | List items (central store); optional filters: category, type, lowStockOnly. |
| `getItemById(id)` | Get single item by ID. |
| `createItem(item)` | Create item + initial inventory record (e.g. locationId `store`). |
| `updateItem(id, payload)` | Update item (no type change after first transaction). |
| `adjustQuantity(itemId, locationId, type, quantity, reason, notes)` | Add/remove stock, write to `inventory` and append to `inventoryAdjustments`. |
| `subscribeItems(callback)` | Real-time listener on `items` for central store. |
| `subscribeInventoryByLocation(locationId, callback)` | Real-time listener on `inventory` where `locationId` matches. |
| `getInventoryByLocation(locationId)` | One-time read of inventory for a location. |

**File:** `src/services/firebase/categoryService.ts` (create)

| Method | Purpose |
|--------|--------|
| `listCategories()` | List all categories. |
| `createCategory(name)` | Add category (unique name). |
| `updateCategory(id, name)` | Update category name. |
| `deleteCategory(id)` | Delete category (only if no items reference it, or handle in rules). |

**Optional:** `src/services/firebase/storageService.ts` – upload item image, return URL; use in create/update item flow.

---

### Step 3: Redux State Management

**File:** `src/store/slices/inventorySlice.ts` (create)

- **State shape:** `items: Item[]`, `categories: Category[]`, `inventoryByLocation: Record<string, InventoryEntry[]>`, `lowStockItemIds: string[]`, `loading`, `error`.
- **Actions:** e.g. `setItems`, `setCategories`, `setInventoryForLocation`, `setLowStockItemIds`, `setLoading`, `setError`, `clearError`.
- **Async thunks (in same file or `src/store/thunks/inventoryThunks.ts`):**  
  - `fetchItems`, `fetchCategories`, `createItem`, `updateItem`, `adjustQuantity`, `fetchInventoryByLocation`.  
  Thunks call the inventory/category (and optional storage) services and dispatch the above actions.

**File:** `src/store/selectors/inventorySelectors.ts` (create)

- Selectors: filtered items (by category, type, low stock), item by id, categories list, inventory for a location, low-stock count. Use memoization (e.g. `createSelector` from Reselect) where useful.

**Integration:** In `src/store/index.ts`, add `inventoryReducer` and any thunk middleware if not already present.

---

### Step 4: Components

Reuse or extend from `src/components/` where possible.

| Component | File path | Purpose |
|-----------|-----------|--------|
| **ItemCard** (or reuse/extend list item) | `src/components/Inventory/ItemCard.tsx` | Central store list row: image, name, SKU, type, stock (total/available/sites/maintenance), low-stock badge. |
| **ItemForm** | `src/components/Inventory/ItemForm.tsx` | Form for add/edit: name, SKU, description, category picker, type (consumable/non-consumable), unit, initial quantity, min stock level, status, image upload. No price field. |
| **CategorySelector** | `src/components/Inventory/CategorySelector.tsx` or inside ItemForm | Dropdown + “Add new category” (modal or inline). |
| **AdjustmentForm** | `src/components/Inventory/AdjustmentForm.tsx` | Adjustment type (add/remove), quantity, reason dropdown, notes; show current and new quantity. |
| **StockStatusBadge** | `src/components/Inventory/StockStatusBadge.tsx` | Visual “Adequate” / “Low stock” (and optional “Discontinued”). |
| **InventoryListItem** (site view) | `src/components/Inventory/InventoryListItem.tsx` | Compact row for site inventory: image, name, quantity, type, received date if available. |

Use existing layout (e.g. `ScreenLayout`), `FormField`, and CIAMS design system (NativeWind) for consistency.

---

### Step 5: Screens

Follow CIAMS design system and existing patterns (e.g. `ScreenLayout`, headers).

| Screen | File path | UI elements |
|--------|-----------|-------------|
| **Central Store Inventory** | `src/screens/Inventory/CentralStoreInventoryScreen.tsx` | Header with “Add” button; search; filters (category, type, stock: all / low stock); list of ItemCards; footer: total count and low-stock count. |
| **Add/Edit Item** | `src/screens/Inventory/AddEditItemScreen.tsx` | Back + title “Add New Item” or “Edit Item”; ItemForm; Save. Validate unique SKU, required fields, no price. |
| **Item Detail** | `src/screens/Inventory/ItemDetailScreen.tsx` | Image, name, SKU, type, category, unit; stock distribution (total, central, per site, maintenance); min level and status; recent activity (from adjustments); actions: Adjust Quantity, Maintenance (if applicable). |
| **Quantity Adjustment** | `src/screens/Inventory/QuantityAdjustmentScreen.tsx` | Item name and current quantity; AdjustmentForm; confirm button. Prevent negative stock. |
| **My Site Inventory** (Site Manager) | `src/screens/Inventory/MySiteInventoryScreen.tsx` | Title “My Inventory – [Site Name]”; search; list of site items (InventoryListItem); actions: New Request, Return Items; section “View other sites” with list of sites and nav to read-only site inventory. |
| **Other Site Inventory** (read-only) | `src/screens/Inventory/OtherSiteInventoryScreen.tsx` | Back; “Site X Inventory – Read-only”; manager and contact; list of items (read-only); info banner: “Need these items? Contact Store Incharge to coordinate transfer.” |

No screen shows central store to Site Managers. Dashboard can show low-stock alerts for Store Incharge/Admin (link to central inventory or item).

---

### Step 6: Navigation Integration

**File:** `src/navigation/InventoryStackNavigator.tsx` (create or update)

- **Central store stack (Store Incharge/Admin):** CentralStoreInventory → AddEditItem, ItemDetail, QuantityAdjustment (and CategoryManagement if you add it).
- **Site manager stack:** MySiteInventory → OtherSiteInventory (read-only). No route to Central Store.
- Use role (from Redux or auth selectors) to show either central store root or “My Inventory” root for the Inventory tab.

**File:** `src/navigation/BottomTabNavigator.tsx`

- Ensure Inventory tab uses `InventoryStackNavigator` and is visible to Admin, Store Incharge, and Site Manager (with different initial screen by role if needed).

**File:** `src/screens/index.ts`

- Export all new/updated inventory screens.

---

## 3. Implementation Checklist

- [ ] **Step 1:** Firebase setup (Firestore collections, security rules, storage rules for item images).
- [ ] **Step 2:** Service layer (`inventoryService.ts`, `categoryService.ts`, optional `storageService.ts`).
- [ ] **Step 3:** Redux (inventorySlice, thunks, inventorySelectors, store integration).
- [ ] **Step 4:** Components (ItemCard, ItemForm, CategorySelector, AdjustmentForm, StockStatusBadge, InventoryListItem).
- [ ] **Step 5:** Screens (Central Store, Add/Edit Item, Item Detail, Quantity Adjustment, My Site Inventory, Other Site Inventory).
- [ ] **Step 6:** Navigation (InventoryStackNavigator, BottomTabNavigator, screen exports).

Each step is intended to be completable in one focused session.
