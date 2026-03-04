# Firestore Pagination – Reference

## Asset Manager Context

This project uses:
- **Firebase Web SDK** (firebase v12+)
- **Redux Toolkit** for state
- **Firestore collections**: items, inventory, requests, purchaseOrders, maintenance, activityLogs

**Inventory pagination** (implemented): `listItemsPaginated`, `getItemsCount`, `fetchItemsPaginated`, `loadMoreItems`. Uses shared `buildItemsQueryConstraints()`.

**Activity logs**: `activityLogService.listActivityLogs` + `loadMoreActivityLogs` (cursor-based).

---

## Complete Service Example: Items with Count

```typescript
// inventoryService.ts - use shared buildQueryConstraints for DRY

const buildItemsQueryConstraints = (filters?: ItemFilters): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];
  if (filters?.categoryId) constraints.push(where('categoryId', '==', filters.categoryId));
  if (filters?.type) constraints.push(where('type', '==', filters.type));
  if (filters?.status) constraints.push(where('status', '==', filters.status));
  constraints.push(orderBy('name', 'asc'));
  return constraints;
};

export async function listItemsPaginated(
  filters: ItemFilters | undefined,
  pageSize: number,
  lastDoc?: DocumentSnapshot
): Promise<{ items: Item[]; lastDoc: DocumentSnapshot | null }> {
  const constraints = buildItemsQueryConstraints(filters);
  if (lastDoc) constraints.push(startAfter(lastDoc));
  constraints.push(limit(pageSize));

  const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
  const snapshot = await getDocsFromServer(q);
  const items = snapshot.docs.map((d) => firestoreItemToItem({ id: d.id, ...d.data() } as FirestoreItem));
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { items, lastDoc: newLastDoc };
}

export async function getItemsCount(filters: ItemFilters | undefined): Promise<number> {
  const constraints = buildItemsQueryConstraints(filters);
  const q = query(collection(db, ITEMS_COLLECTION), ...constraints);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
```

---

## Slice Reducer Handlers

```typescript
// inventorySlice - paginated state additions

.addCase(fetchItemsPaginated.fulfilled, (state, action) => {
  state.items = action.payload.items;
  state.totalCount = action.payload.totalCount;
  state.lastDoc = action.payload.lastDoc;
  state.hasMore = action.payload.items.length >= PAGE_SIZE;
  state.loading = false;
})

.addCase(loadMoreItems.fulfilled, (state, action) => {
  state.items = [...state.items, ...action.payload.items];
  state.lastDoc = action.payload.lastDoc;
  state.hasMore = action.payload.items.length >= PAGE_SIZE;
  state.loadingMore = false;
})
```

---

## Initial Load: Avoid Empty State Flash

On first render, `items` is empty and `loading` may be false until the thunk dispatches pending. Avoid showing "No Items" briefly before the loader:

```tsx
const isInitialOrRefetching = allItems.length === 0 && totalCount === null && !error;
if (isInitialOrRefetching || (isLoading && allItems.length === 0)) {
  return <FullScreenLoader />;
}
```

`totalCount === null` means no fetch has completed yet.

---

## Search + Pagination: Display Logic

When search is client-side (e.g., name/SKU match):

1. **Total count**: From `getCountFromServer` with Firestore filters only. Represents "all items matching filters."
2. **Displayed items**: Apply search to `items` in a selector: `items.filter(...)`.
3. **UI text**:
   - "Total inventory: 100" (from `totalCount`)
   - "Showing 10 of 100" (loaded page size; total unchanged)
   - "8 match your search" (optional: `filteredItems.length` after search)

```tsx
// CentralStoreInventoryScreen - paginated version
<View>
  <Text>Total inventory: {totalCount ?? '—'}</Text>
  <Text>Showing {filteredItems.length} of {totalCount ?? 0}</Text>
  {searchQuery && (
    <Text>{filteredItems.length} match "{searchQuery}"</Text>
  )}
</View>
```

---

## Filters: Firestore vs Client-Side

| Filter | Where | Notes |
|--------|-------|-------|
| categoryId, type, status | Firestore | In `buildQueryConstraints`; affects count + list |
| lowStockOnly | Client | `centralStoreQuantity <= minStockLevel`; no index; filter in selector/useMemo |
| Search (name, sku, description, categoryName) | Client | `selectItemsBySearchQuery`; filter loaded items |

**lowStockOnly**: Cannot push to Firestore without a `centralStoreQuantity` index. Use client-side only; total count stays "all Firestore-filtered items."

---

## Requests Collection Example

```typescript
// requestService.ts

export async function getRequestsCount(filters: RequestFilters): Promise<number> {
  const constraints: QueryConstraint[] = [];
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.siteId) constraints.push(where('siteId', '==', filters.siteId));
  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, 'requests'), ...constraints);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
```

---

## Index Requirements

For `getCountFromServer`, the query must be indexable. Add composite indexes for **each filter combination** used in queries:

```json
// firestore.indexes.json - items collection
{ "collectionGroup": "items", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "name", "order": "ASCENDING" }] },
{ "collectionGroup": "items", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "categoryId", "order": "ASCENDING" }, { "fieldPath": "name", "order": "ASCENDING" }] },
{ "collectionGroup": "items", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "type", "order": "ASCENDING" }, { "fieldPath": "name", "order": "ASCENDING" }] },
{ "collectionGroup": "items", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "status", "order": "ASCENDING" }, { "fieldPath": "name", "order": "ASCENDING" }] },
{ "collectionGroup": "items", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "categoryId", "order": "ASCENDING" }, { "fieldPath": "type", "order": "ASCENDING" }, { "fieldPath": "name", "order": "ASCENDING" }] },
{ "collectionGroup": "items", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "categoryId", "order": "ASCENDING" }, { "fieldPath": "type", "order": "ASCENDING" }, { "fieldPath": "status", "order": "ASCENDING" }, { "fieldPath": "name", "order": "ASCENDING" }] }
```

Firestore will suggest index URLs in error messages when a query fails.

---

## Redux Store Config (Serialization)

Add to `store` middleware `serializableCheck`:

```typescript
ignoredActions: ['inventory/fetchItemsPaginated/fulfilled', 'inventory/loadMoreItems/fulfilled'],
ignoredPaths: ['inventory.lastDoc'],
```

---

## Jest: Firebase Mocks

Firebase ESM breaks Jest. Add to `package.json`:

```json
"setupFiles": ["<rootDir>/jest/mocks/firebase.js"],
"moduleNameMapper": { "^.*config/firebase$": "<rootDir>/config/__mocks__/firebase.ts" }
```

`jest/mocks/firebase.js` mocks `firebase/firestore` (getDocs, getCountFromServer return `{ docs: [], size: 0 }` and `{ data: () => ({ count: 0 }) }`). Tests that override `firebase/firestore` must mock `getDocs` with `.mockResolvedValue({ docs: [], size: 0, empty: true, forEach: () => {} })`.
