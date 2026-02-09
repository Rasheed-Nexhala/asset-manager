---
name: Inventory Management Implementation
overview: Implement a two-tier inventory system with central store and site-level inventories, supporting consumable and non-consumable items with role-based visibility controls.
todos:
  - id: firestore-setup
    content: Create Firestore collections (items, inventory, categories, inventoryAdjustments) with security rules
    status: completed
  - id: storage-rules
    content: Update Cloud Storage rules for item image uploads
    status: completed
  - id: types
    content: Create TypeScript type definitions in src/types/inventory.ts
    status: completed
  - id: storage-service
    content: Create storageService.ts for image upload/download operations
    status: completed
  - id: category-service
    content: Create categoryService.ts for category CRUD operations
    status: completed
  - id: inventory-service
    content: Create inventoryService.ts for item and inventory operations with real-time subscriptions
    status: completed
  - id: inventory-slice
    content: Create inventorySlice.ts with state shape, actions, and reducers
    status: completed
  - id: inventory-thunks
    content: Create inventoryThunks.ts with async operations (createItem, updateItem, adjustQuantity)
    status: completed
  - id: inventory-selectors
    content: Create inventorySelectors.ts with memoized selectors for filtering and derived state
    status: in_progress
  - id: store-integration
    content: Integrate inventory reducer in src/store/index.ts
    status: pending
  - id: reusable-components
    content: Create reusable components (ItemCard, InventoryListItem, CategorySelector, ItemForm, AdjustmentForm, StockStatusBadge)
    status: pending
  - id: inventory-screens
    content: Create inventory screens (CentralStoreInventory, MySiteInventory, ItemDetail, AddEditItem, QuantityAdjustment, OtherSiteInventory)
    status: pending
  - id: navigation-setup
    content: Create InventoryStackNavigator and update BottomTabNavigator to add Inventory tab
    status: pending
  - id: realtime-sync
    content: Create inventory sync hooks (useInventorySync, useSiteInventorySync) and integrate in App.tsx
    status: pending
  - id: dashboard-alerts
    content: Update DashboardScreen to display low stock alerts
    status: pending
  - id: testing-polish
    content: Add unit tests, error handling, loading states, and accessibility improvements
    status: pending
isProject: false
---

# Inventory Management Implementation Plan

## Feature Overview

Two-tier inventory system:

- **Central Store Inventory**: Main warehouse accessible only by Admin & Store Incharge
- **Site Inventories**: Per-site inventory populated via fulfilled requests
- **Item Types**: Consumable (single-use, cannot return) and Non-Consumable (returnable)
- **Key Constraint**: Site Managers CANNOT see central store inventory but CAN see other sites' inventories (read-only)

---

## Phase 1: Data & Backend Setup

### 1.1 Firestore Collections

Create two new collections with the following structures:

`**items` Collection** (Central item master):

```
- name: string (required, unique)
- sku: string (required, unique)
- description?: string
- categoryId: string
- categoryName: string (denormalized)
- type: "consumable" | "non_consumable"
- unit: string (piece, bag, set, etc.)
- imageUrl?: string
- minStockLevel: number
- status: "active" | "discontinued"
- totalQuantity: number (denormalized)
- centralStoreQuantity: number (denormalized)
- atSitesQuantity: number (denormalized)
- inMaintenanceQuantity: number (denormalized)
- createdAt: Timestamp
- updatedAt: Timestamp
```

`**inventory` Collection** (Location-based stock tracking):

```
- itemId: string (reference to items)
- itemName: string (denormalized)
- itemSku: string (denormalized)
- locationId: string ("store" | "site_001" | "maintenance")
- locationType: "store" | "site" | "maintenance"
- locationName: string
- quantity: number
- updatedAt: Timestamp
```

`**categories` Collection** (Item categories):

```
- name: string (unique)
- createdAt: Timestamp
```

`**inventoryAdjustments` Collection** (Audit trail):

```
- itemId: string
- itemName: string
- locationId: string
- locationType: string
- type: "add" | "remove"
- quantityBefore: number
- quantityAfter: number
- quantityChanged: number
- reason: string
- notes: string
- adjustedBy: string (userId)
- adjustedByName: string
- createdAt: Timestamp
```

### 1.2 Firestore Security Rules

Update `firestore.rules` to enforce role-based access:

```javascript
// Items collection - only Admin and Store Incharge can read/write
match /items/{itemId} {
  allow read: if isAdmin() || isStoreIncharge();
  allow write: if isAdmin() || isStoreIncharge();
}

// Inventory collection - complex read rules
match /inventory/{inventoryId} {
  allow read: if (
    (isAdmin() || isStoreIncharge()) || // Admin and Store Incharge see everything
    (isSiteManager() && get(/databases/$(database)/documents/inventory/$(inventoryId)).data.locationType == 'site') // Site Managers only see site inventories
  );
  allow write: if isAdmin() || isStoreIncharge();
}

// Categories collection
match /categories/{categoryId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin() || isStoreIncharge();
}

// Inventory adjustments - read-only audit log
match /inventoryAdjustments/{adjustmentId} {
  allow read: if isAdmin() || isStoreIncharge();
  allow write: if false; // Only via Cloud Functions
}
```

### 1.3 Cloud Storage Rules

Update `storage.rules` for item images:

```javascript
match /items/{itemId}/{fileName} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    (request.resource.size < 5 * 1024 * 1024) && // 5MB limit
    request.resource.contentType.matches('image/.*');
}
```

---

## Phase 2: Services Layer

### 2.1 Create Storage Service

**New file**: `src/services/firebase/storageService.ts`

Implement methods:

- `uploadItemImage(file: File | Blob, itemId: string): Promise<string>` - Upload image to `/items/{itemId}/` and return download URL
- `deleteItemImage(imageUrl: string): Promise<void>` - Delete image by URL
- `getImageReference(imageUrl: string): StorageReference` - Get reference from URL

### 2.2 Create Inventory Service

**New file**: `src/services/firebase/inventoryService.ts`

Implement methods:

- `createItem(itemData: CreateItemData): Promise<string>` - Create item with initial inventory
- `updateItem(itemId: string, updates: Partial<ItemData>): Promise<void>` - Update item details
- `getItem(itemId: string): Promise<Item>` - Get single item
- `getItems(): Promise<Item[]>` - Get all items (for Store Incharge/Admin)
- `subscribeToItems(callback: (items: Item[]) => void): Unsubscribe` - Real-time items subscription
- `adjustQuantity(adjustmentData: AdjustmentData): Promise<void>` - Adjust stock with reason (creates adjustment log)
- `getInventoryByLocation(locationId: string): Promise<InventoryItem[]>` - Get inventory for specific location
- `subscribeToSiteInventory(siteId: string, callback): Unsubscribe` - Subscribe to site inventory
- `subscribeToAllSiteInventories(callback): Unsubscribe` - Subscribe to all site inventories (for Site Manager viewing other sites)

### 2.3 Create Category Service

**New file**: `src/services/firebase/categoryService.ts`

Implement methods:

- `createCategory(name: string): Promise<string>` - Create new category
- `getCategories(): Promise<Category[]>` - Get all categories
- `subscribeToCategories(callback): Unsubscribe` - Real-time categories subscription

---

## Phase 3: Redux State Management

### 3.1 Create Inventory Slice

**New file**: `src/store/slices/inventorySlice.ts`

State shape:

```typescript
{
  items: Item[];
  categories: Category[];
  siteInventories: Record<string, InventoryItem[]>;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterCategory: string | null;
  filterType: 'all' | 'consumable' | 'non_consumable';
  filterStock: 'all' | 'low_stock';
}
```

Actions:

- `setItems(items)`, `addItem(item)`, `updateItemInState(item)`
- `setCategories(categories)`, `addCategory(category)`
- `setSiteInventory({ siteId, items })`
- `setLoading(loading)`, `setError(error)`, `clearError()`
- `setSearchQuery(query)`, `setFilterCategory(categoryId)`, `setFilterType(type)`, `setFilterStock(filter)`

### 3.2 Create Inventory Thunks

**New file**: `src/store/thunks/inventoryThunks.ts`

Async thunks:

- `fetchItems()` - Fetch all items
- `fetchCategories()` - Fetch categories
- `createItem(itemData)` - Create new item
- `updateItem({ itemId, updates })` - Update item
- `adjustItemQuantity(adjustmentData)` - Adjust stock
- `fetchSiteInventory(siteId)` - Fetch inventory for specific site

### 3.3 Create Inventory Selectors

**New file**: `src/store/selectors/inventorySelectors.ts`

Memoized selectors:

- `selectAllItems` - All items
- `selectFilteredItems` - Items filtered by search, category, type, stock level
- `selectCategories` - All categories
- `selectLowStockItems` - Items below minimum level
- `selectItemById(itemId)` - Single item by ID
- `selectSiteInventory(siteId)` - Inventory for specific site
- `selectInventoryLoading` - Loading state
- `selectInventoryError` - Error state

---

## Phase 4: Type Definitions

**New file**: `src/types/inventory.ts`

```typescript
export type ItemType = 'consumable' | 'non_consumable';
export type ItemStatus = 'active' | 'discontinued';
export type LocationType = 'store' | 'site' | 'maintenance';
export type AdjustmentType = 'add' | 'remove';

export interface Item {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  type: ItemType;
  unit: string;
  imageUrl?: string;
  minStockLevel: number;
  status: ItemStatus;
  totalQuantity: number;
  centralStoreQuantity: number;
  atSitesQuantity: number;
  inMaintenanceQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  locationId: string;
  locationType: LocationType;
  locationName: string;
  quantity: number;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  createdAt: Date;
}

export interface CreateItemData {
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  type: ItemType;
  unit: string;
  imageFile?: File | Blob;
  initialQuantity: number;
  minStockLevel: number;
}

export interface AdjustmentData {
  itemId: string;
  itemName: string;
  locationId: string;
  locationType: LocationType;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  notes: string;
}
```

---

## Phase 5: Component Development

### 5.1 Reusable Components to Create

`**src/components/Inventory/ItemCard.tsx**`

- Purpose: Display item in list with image, SKU, type, stock status
- Props: `item: Item`, `onPress?: () => void`
- Design: Similar to SiteCard with image thumbnail, badge for type, low stock indicator

`**src/components/Inventory/ItemForm.tsx**`

- Purpose: Multi-field form for add/edit item
- Props: `initialData?: Partial<CreateItemData>`, `onSubmit`, `isLoading`, `submitButtonLabel`
- Features: Image picker, category selector, type radio buttons, unit dropdown, validation

`**src/components/Inventory/CategorySelector.tsx**`

- Purpose: Dropdown selector with modal picker for categories
- Props: `value: string | null`, `onChange`, `error?`
- Features: Modal with FlatList, "Add New Category" button

`**src/components/Inventory/AdjustmentForm.tsx**`

- Purpose: Form for quantity adjustment with reason
- Props: `item: Item`, `locationId: string`, `onSubmit`, `onCancel`
- Fields: Adjustment type (add/remove), quantity, reason dropdown, notes textarea

`**src/components/Inventory/StockStatusBadge.tsx**`

- Purpose: Visual indicator for stock status
- Props: `currentStock: number`, `minStockLevel: number`
- Displays: "Low Stock" (amber), "Adequate Stock" (green), or "Out of Stock" (red)

`**src/components/Inventory/InventoryListItem.tsx**`

- Purpose: Compact list item for site inventory view
- Props: `inventoryItem: InventoryItem`, `onPress?`
- Design: Horizontal layout with image, name, quantity, type badge

### 5.2 Reusable Components to Use

From existing codebase:

- `FormField` - For all text inputs
- `ScreenHeader` - For screen titles with add/edit buttons
- `ScreenLayout` - Wrap all screens with safe area and keyboard handling

---

## Phase 6: Screen Development

### 6.1 Central Store Inventory Screen

**New file**: `src/screens/Inventory/CentralStoreInventoryScreen.tsx`

Access: Admin & Store Incharge only

Features:

- Header with "Add Item" button (`ScreenHeader`)
- Search bar (updates `searchQuery` in Redux)
- Filter section: Category dropdown, Type chips, Stock status chips
- FlatList with `ItemCard` components
- Summary footer: "Total: X items | Low: Y ⚠️"
- Pull-to-refresh
- Empty state: "No items found. Add your first item."

Navigation:

- Tap item → Navigate to `ItemDetailScreen`
- Tap "+" → Navigate to `AddItemScreen`

### 6.2 Add/Edit Item Screen

**New file**: `src/screens/Inventory/AddEditItemScreen.tsx`

Access: Admin & Store Incharge only

Features:

- Modal presentation (`presentation: 'card'`)
- Uses `ItemForm` component
- Image picker with preview
- Category selector with "Add New" option
- Type radio buttons (non-consumable/consumable)
- Unit dropdown (piece, bag, set, box, etc.)
- Initial quantity and minimum stock level inputs
- Status toggle (Active/Discontinued) - only on edit
- Save button dispatches `createItem` or `updateItem` thunk

Validation:

- Name required, SKU required and unique
- Category required
- Type required (cannot change after first transaction - enforce in service)
- Initial quantity must be ≥ 0
- Min stock level must be ≥ 0

### 6.3 Item Detail Screen

**New file**: `src/screens/Inventory/ItemDetailScreen.tsx`

Access: Admin & Store Incharge only

Features:

- Header with "Edit" button
- Image display (full width)
- Item details: SKU, Type, Category, Unit
- Stock distribution section: Total, Central Store, At Sites (breakdown), In Maintenance
- Stock status indicator (Low Stock/Adequate/Out of Stock)
- Recent activity log (last 5 adjustments)
- "View Full History" button
- Action buttons: "Adjust Quantity", "Maintenance" (if non-consumable)

Navigation:

- "Edit" → Navigate to `AddEditItemScreen` with item data
- "Adjust Quantity" → Open modal with `AdjustmentForm`

### 6.4 Quantity Adjustment Screen/Modal

**New file**: `src/screens/Inventory/QuantityAdjustmentScreen.tsx`

Access: Admin & Store Incharge only

Features:

- Modal presentation
- Shows item name and current quantity
- Adjustment type radio buttons (Add/Remove)
- Quantity input (updates new quantity preview)
- Reason dropdown: Physical Count Correction, Lost/Stolen, Damaged, Other
- Notes textarea (required)
- Confirm button dispatches `adjustItemQuantity` thunk

Validation:

- Quantity must be > 0
- Cannot remove more than available
- Reason and notes required

### 6.5 Site Manager - My Inventory Screen

**New file**: `src/screens/Inventory/MySiteInventoryScreen.tsx`

Access: Site Manager only

Features:

- Header: "My Inventory - {Site Name}"
- Search bar
- FlatList with `InventoryListItem` components
- Shows only items at current site
- Grouped by type: "My Items (X)"
- Action buttons: "New Request" (placeholder), "Return Items" (placeholder)
- "View Other Sites" section with list of sites

Navigation:

- Tap site → Navigate to `OtherSiteInventoryScreen`

### 6.6 Other Site Inventory Screen (Read-Only)

**New file**: `src/screens/Inventory/OtherSiteInventoryScreen.tsx`

Access: Site Manager only

Features:

- Header with lock icon and "Read-only" label
- Manager name and contact info section
- FlatList with `InventoryListItem` components (read-only)
- Info banner: "Need these items? Contact Store Incharge to coordinate transfer."
- No action buttons

---

## Phase 7: Navigation Integration

### 7.1 Update Bottom Tab Navigator

**File to modify**: `src/navigation/BottomTabNavigator.tsx`

Add Inventory tab:

```tsx
<Tab.Screen 
  name="Inventory" 
  component={InventoryStackNavigator}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="cube-outline" size={size} color={color} />
    ),
  }}
/>
```

Conditional rendering:

- Admin & Store Incharge see: Users, Dashboard, Sites, **Inventory**
- Site Manager sees: Users, Dashboard, **Inventory** (only MySiteInventory)

### 7.2 Create Inventory Stack Navigator

**New file**: `src/navigation/InventoryStackNavigator.tsx`

```typescript
type InventoryStackParamList = {
  CentralStoreInventory: undefined;
  MySiteInventory: undefined;
  ItemDetail: { itemId: string };
  AddItem: undefined;
  EditItem: { itemId: string };
  QuantityAdjustment: { itemId: string; locationId: string };
  OtherSiteInventory: { siteId: string };
};

const Stack = createStackNavigator<InventoryStackParamList>();

export function InventoryStackNavigator() {
  const userRole = useAppSelector(selectUserRoleType);
  const isSiteManager = userRole === 'SiteManager';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isSiteManager ? (
        <Stack.Screen name="MySiteInventory" component={MySiteInventoryScreen} />
      ) : (
        <Stack.Screen name="CentralStoreInventory" component={CentralStoreInventoryScreen} />
      )}
      <Stack.Screen 
        name="ItemDetail" 
        component={ItemDetailScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen 
        name="AddItem" 
        component={AddEditItemScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="EditItem" 
        component={AddEditItemScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="QuantityAdjustment" 
        component={QuantityAdjustmentScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="OtherSiteInventory" 
        component={OtherSiteInventoryScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
}
```

---

## Phase 8: Real-time Subscriptions

### 8.1 Create Inventory Sync Hook

**New file**: `src/hooks/useInventorySync.ts`

```typescript
export function useInventorySync() {
  const dispatch = useAppDispatch();
  const userRole = useAppSelector(selectUserRoleType);
  const isStoreInchargeOrAdmin = userRole === 'Admin' || userRole === 'StoreIncharge';

  useEffect(() => {
    if (!isStoreInchargeOrAdmin) return;

    // Subscribe to items collection
    const unsubscribeItems = subscribeToItems((items) => {
      dispatch(setItems(items));
    });

    // Subscribe to categories
    const unsubscribeCategories = subscribeToCategories((categories) => {
      dispatch(setCategories(categories));
    });

    return () => {
      unsubscribeItems();
      unsubscribeCategories();
    };
  }, [dispatch, isStoreInchargeOrAdmin]);
}
```

Use in `App.tsx`:

```tsx
useAuthStateSync();
useUserRoleSync(user?.uid);
useManagerValidationSync();
useInventorySync(); // Add this
```

### 8.2 Create Site Inventory Sync Hook

**New file**: `src/hooks/useSiteInventorySync.ts`

```typescript
export function useSiteInventorySync(siteId: string) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!siteId) return;

    const unsubscribe = subscribeToSiteInventory(siteId, (items) => {
      dispatch(setSiteInventory({ siteId, items }));
    });

    return () => unsubscribe();
  }, [dispatch, siteId]);
}
```

Use in Site Manager screens.

---

## Phase 9: Low Stock Alerts

### 9.1 Update Dashboard Screen

**File to modify**: `src/screens/DashboardScreen.tsx`

Add Low Stock alert card:

```tsx
const lowStockItems = useAppSelector(selectLowStockItems);

{lowStockItems.length > 0 && (
  <TouchableOpacity 
    className="bg-[#D97706]/15 border border-[#D97706]/20 rounded-[10px] p-4 mb-3"
    onPress={() => navigation.navigate('Inventory', { 
      screen: 'CentralStoreInventory',
      params: { filter: 'low_stock' }
    })}
  >
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <Ionicons name="warning" size={32} color="#D97706" />
        <View>
          <Text className="text-[17px] font-semibold text-[#0F172A]">
            Low Stock Alert
          </Text>
          <Text className="text-[13px] text-[#64748B]">
            {lowStockItems.length} items below minimum level
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#64748B" />
    </View>
  </TouchableOpacity>
)}
```

---

## Phase 10: Polish & Testing

### 10.1 Error Handling

Add error handling for:

- Network failures (show retry button)
- Validation errors (field-level error messages)
- Duplicate SKU errors
- Permission errors (redirect to appropriate screen)

### 10.2 Loading States

Implement loading states for:

- Initial data fetch (full-screen spinner)
- Form submission (button loading state)
- Image upload (progress indicator)
- Pull-to-refresh

### 10.3 Optimistic Updates

Consider optimistic updates for:

- Item creation (add to list immediately, rollback on error)
- Quantity adjustment (update stock display immediately)

### 10.4 Accessibility

Ensure:

- All interactive elements have `accessibilityLabel`
- Error messages use `accessibilityLiveRegion="assertive"`
- Success messages use `accessibilityLiveRegion="polite"`
- Minimum 48px touch targets

### 10.5 Unit Tests

Create tests for:

- `inventoryService.ts` - All CRUD operations
- `inventorySlice.ts` - Reducers and actions
- `inventorySelectors.ts` - Memoized selectors
- `ItemForm.tsx` - Form validation
- `ItemCard.tsx` - Rendering and interactions

---

## Implementation Order

### Step 1: Foundation (Backend)

1. Define Firestore collections and security rules
2. Update Storage rules for item images
3. Create TypeScript type definitions (`src/types/inventory.ts`)

### Step 2: Services Layer

1. Create `storageService.ts` for image uploads
2. Create `categoryService.ts` for category management
3. Create `inventoryService.ts` for item and inventory operations

### Step 3: State Management

1. Create `inventorySlice.ts` with state shape and reducers
2. Create `inventoryThunks.ts` with async operations
3. Create `inventorySelectors.ts` with memoized selectors
4. Integrate inventory reducer in `src/store/index.ts`

### Step 4: Reusable Components (Bottom-Up)

1. Create `StockStatusBadge.tsx`
2. Create `ItemCard.tsx`
3. Create `InventoryListItem.tsx`
4. Create `CategorySelector.tsx`
5. Create `ItemForm.tsx`
6. Create `AdjustmentForm.tsx`

### Step 5: Screens (Feature-Complete)

1. Create `CentralStoreInventoryScreen.tsx` (list view with filters)
2. Create `AddEditItemScreen.tsx` (form screen)
3. Create `ItemDetailScreen.tsx` (detail view)
4. Create `QuantityAdjustmentScreen.tsx` (modal)
5. Create `MySiteInventoryScreen.tsx` (Site Manager view)
6. Create `OtherSiteInventoryScreen.tsx` (read-only view)

### Step 6: Navigation

1. Create `InventoryStackNavigator.tsx`
2. Update `BottomTabNavigator.tsx` to add Inventory tab

### Step 7: Real-time Sync

1. Create `useInventorySync.ts` hook
2. Create `useSiteInventorySync.ts` hook
3. Integrate hooks in `App.tsx`

### Step 8: Dashboard Integration

1. Update `DashboardScreen.tsx` to show low stock alerts

### Step 9: Testing & Polish

1. Add unit tests for services, Redux, components
2. Add error handling and loading states
3. Test role-based access controls
4. Test real-time updates

---

## Existing Code Utilization

### Services

- Use **[src/services/firebase/authService.ts](src/services/firebase/authService.ts)** for authentication checks
- Use **[src/services/firebase/siteService.ts](src/services/firebase/siteService.ts)** as reference for Firestore patterns
- Follow timestamp serialization patterns from **[src/utils/firebaseUtils.ts](src/utils/firebaseUtils.ts)**

### Redux

- Follow **[src/store/slices/sitesSlice.ts](src/store/slices/sitesSlice.ts)** pattern for inventory slice
- Use **[src/store/selectors/authSelectors.ts](src/store/selectors/authSelectors.ts)** for role checks
- Follow **[src/store/thunks/sitesThunks.ts](src/store/thunks/sitesThunks.ts)** pattern for async operations

### Components

- Use **[src/components/FormField.tsx](src/components/FormField.tsx)** for all text inputs
- Use **[src/components/ScreenHeader.tsx](src/components/ScreenHeader.tsx)** for screen headers
- Use **[src/components/layout/ScreenLayout.tsx](src/components/layout/ScreenLayout.tsx)** for screen wrappers
- Follow **[src/components/Sites/SiteCard.tsx](src/components/Sites/SiteCard.tsx)** pattern for `ItemCard`
- Follow **[src/components/Sites/SiteForm.tsx](src/components/Sites/SiteForm.tsx)** pattern for `ItemForm`

### Navigation

- Use **[src/navigation/SiteStackNavigator.tsx](src/navigation/SiteStackNavigator.tsx)** as template for `InventoryStackNavigator`
- Follow conditional rendering pattern from **[src/navigation/BottomTabNavigator.tsx](src/navigation/BottomTabNavigator.tsx)**

### Hooks

- Follow **[src/hooks/useUserRoleSync.ts](src/hooks/useUserRoleSync.ts)** pattern for real-time sync hooks

---

## Considerations

### Security

- Enforce role-based access in Firestore rules (Site Managers CANNOT read `/items` collection)
- Validate item type immutability (cannot change after first transaction)
- Audit trail for all quantity adjustments

### Performance

- Use real-time subscriptions for items and categories
- Denormalize frequently accessed data (categoryName, stock quantities)
- Use memoized selectors for filtered lists
- Implement pull-to-refresh for manual data refresh

### Edge Cases

- Handle SKU uniqueness validation
- Prevent negative stock quantities
- Handle image upload failures gracefully
- Handle concurrent adjustments (use Firestore transactions)

### Future Enhancements

- Barcode scanning for SKU entry
- Bulk import/export functionality
- Advanced reporting and analytics
- Predictive stock alerts based on usage patterns

---

## Architecture Diagram

```
User Interaction
      ↓
Screens (CentralStoreInventory, MySiteInventory, ItemDetail, etc.)
      ↓
Redux Store (inventorySlice)
      ↓
Thunks (createItem, adjustQuantity, etc.)
      ↓
Service Layer (inventoryService, storageService, categoryService)
      ↓
Firebase (Firestore, Storage)
```

Role-based navigation flow:

```
Admin/StoreIncharge → CentralStoreInventory → ItemDetail → Edit/Adjust
SiteManager → MySiteInventory → OtherSiteInventory (read-only)
```

