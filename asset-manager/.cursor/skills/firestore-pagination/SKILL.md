---
name: firestore-pagination
description: Implements Firestore pagination with total count, search, and filters for React Native apps. Use when adding pagination to Firestore lists, implementing "load more" with accurate total counts (e.g., "Total: 100" while showing 10 at a time), or combining server-side filters with client-side search.
---

# Firestore Pagination with Total Count

## Overview

Firestore does not support offset-based pagination. Use **cursor-based pagination** with `limit()` and `startAfter(lastDoc)`. For total count, use `getCountFromServer()` separately—never derive total from loaded items length.

**Key principle**: Total count (e.g., 100) and displayed items (e.g., 10) are separate concerns. Total comes from a count query; displayed items come from a paginated data query.

---

## 1. Service Layer: Paginated Query + Count

### Shared constraints helper (DRY)

```typescript
// Exclude client-side filters (e.g. lowStockOnly) — those are applied in memory
const buildQueryConstraints = (filters?: ItemFilters): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];
  if (filters?.categoryId) constraints.push(where('categoryId', '==', filters.categoryId));
  if (filters?.type) constraints.push(where('type', '==', filters.type));
  if (filters?.status) constraints.push(where('status', '==', filters.status));
  constraints.push(orderBy('name', 'asc'));
  return constraints;
};
```

### Paginated list query

```typescript
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocsFromServer, DocumentSnapshot, QueryConstraint,
} from 'firebase/firestore';

export async function listItemsPaginated(
  filters: ItemFilters | undefined,
  pageSize: number,
  lastDoc?: DocumentSnapshot
): Promise<{ items: Item[]; lastDoc: DocumentSnapshot | null }> {
  const constraints = buildQueryConstraints(filters);
  if (lastDoc) constraints.push(startAfter(lastDoc));
  constraints.push(limit(pageSize));

  const q = query(collection(db, 'items'), ...constraints);
  const snapshot = await getDocsFromServer(q);
  const items = snapshot.docs.map(docToItem);
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { items, lastDoc: newLastDoc };
}
```

### Total count query (same constraints, no limit/startAfter)

```typescript
import { getCountFromServer } from 'firebase/firestore';

export async function getItemsCount(filters: ItemFilters | undefined): Promise<number> {
  const constraints = buildQueryConstraints(filters);
  const q = query(collection(db, 'items'), ...constraints);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
```

**Important**: The count query must use the **exact same** `where` and `orderBy` as the list query. Do not add `limit` or `startAfter` to the count query.

---

## 2. Search and Filters

| Approach | Where | Implementation |
|----------|-------|----------------|
| **Firestore filters** | Server | categoryId, type, status, siteId → `where()` in query |
| **Client-side filters** | Client | lowStockOnly, computed fields → filter loaded items in selector/useMemo |
| **Client-side search** | Client | name, sku, description, categoryName → `items.filter()` in selector |
| **SKU prefix search** | Server | `where('sku','>=',prefix)`, `where('sku','<=',prefix+'\uf8ff')` |
| **Algolia/TypeSense** | External | Full-text at scale; sync Firestore → search index |

**DRY constraints**: Extract a `buildQueryConstraints(filters)` helper used by both `listItemsPaginated` and `getItemsCount`. Exclude client-side filters (e.g. `lowStockOnly`) from this helper—they are applied in memory after fetch.

**Total count with search**: Count query uses Firestore filters only. Display: "Showing X of Y" where X = loaded (after search/lowStock), Y = totalCount from server.

---

## 3. Redux Slice Structure

```typescript
interface PaginatedState {
  items: Item[];
  totalCount: number | null;  // From getCountFromServer
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  filters: ItemFilters;
}
```

- `totalCount`: Server count; never use `items.length` for total.
- `hasMore`: `items.length >= pageSize` after each fetch—if fewer than pageSize returned, no more pages.
- `lastDoc`: Store as `unknown` (DocumentSnapshot is non-serializable); add to Redux `ignoredPaths` for serializableCheck.

---

## 4. Thunks: Initial Load + Load More

```typescript
// Initial load: fetch count + first page in parallel
export const fetchItemsPaginated = createAsyncThunk(
  'inventory/fetchPaginated',
  async (_, { getState }) => {
    const { filters } = (getState() as RootState).inventory;
    const [countResult, listResult] = await Promise.all([
      getItemsCount(filters),
      listItemsPaginated(filters, PAGE_SIZE),
    ]);
    return {
      items: listResult.items,
      totalCount: countResult,
      lastDoc: listResult.lastDoc,
    };
  }
);

// Load more: only fetch next page; early return if no cursor
export const loadMoreItems = createAsyncThunk(
  'inventory/loadMore',
  async (_, { getState }) => {
    const { filters, lastDoc } = (getState() as RootState).inventory;
    if (!lastDoc) return { items: [], lastDoc: null };
    const { items, lastDoc: newLastDoc } = await listItemsPaginated(filters, PAGE_SIZE, lastDoc);
    return { items, lastDoc: newLastDoc };
  }
);
```

---

## 5. UI Display Patterns

### Initial load: avoid flash of empty state

On first render (before `useEffect` runs), `items` is empty and `loading` may still be false. Showing empty state ("No Items") then briefly switching to loader is poor UX. Use `totalCount === null` as a signal that no fetch has completed yet:

```tsx
// Show loader when we have no items and haven't received a count yet
const isInitialOrRefetching = allItems.length === 0 && totalCount === null && !error;
if (isInitialOrRefetching || (isLoading && allItems.length === 0)) {
  return <FullScreenLoader />;
}
```

- `totalCount === null` → never fetched or filters just changed; show loader.
- `totalCount === 0` → fetched and truly empty; show empty state.

### Total count (always from server)

```tsx
// Correct: totalCount from Redux (getCountFromServer)
<Text>Total inventory: {totalCount ?? '—'}</Text>

// Wrong: filteredItems.length only shows loaded count
<Text>Total: {filteredItems.length}</Text>  // ❌
```

### Showing loaded vs total

```tsx
{totalCount != null && (
  <Text>
    Showing {filteredItems.length} of {totalCount}
  </Text>
)}
```

### Load more button / infinite scroll

```tsx
<FlatList
  data={filteredItems}
  onEndReached={hasMore && !loadingMore ? handleLoadMore : undefined}
  onEndReachedThreshold={0.5}
  ListFooterComponent={
    loadingMore ? <ActivityIndicator /> : hasMore ? <LoadMoreButton /> : null
  }
/>
```

---

## 6. Firestore Indexes

Composite indexes are required for filtered + ordered queries. Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "items",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "categoryId", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
}
```

Run `firebase deploy --only firestore:indexes` after adding indexes.

---

## 7. Real-Time vs Paginated

| Mode | Use Case | Total Count |
|------|----------|-------------|
| **Real-time** (`onSnapshot`) | Small lists, live updates | Run `getCountFromServer` once on mount; refresh on filter change |
| **Paginated** (`getDocsFromServer`) | Large lists, load more | Fetch count on initial load; optionally refresh on pull-to-refresh |

For real-time + pagination: use `onSnapshot` with `limit(pageSize)` and `startAfter` for "load more"; run count query separately.

---

## 8. Filter Sync (Screen → Redux)

When the screen uses local filter state (e.g. category, type, stock level), sync to Redux before fetch:

```tsx
const toItemFilters = (localFilters) => ({
  categoryId: localFilters.categoryId,
  type: localFilters.type,
  lowStockOnly: localFilters.stock === 'low_stock',  // client-side only
});

useEffect(() => {
  dispatch(setFilters(toItemFilters(filters)));
  dispatch(fetchItemsPaginated());
}, [dispatch, filters]);
```

`setFilters` should reset pagination: `items = []`, `totalCount = null`, `lastDoc = null`, `hasMore = false`.

---

## 9. Jest Testing

Firebase uses ESM; Jest cannot parse it. Add global mocks:

- **`jest/mocks/firebase.js`** in `setupFiles`: mock `firebase/firestore`, `firebase/storage`, `firebase/auth` with `getDocs`, `getCountFromServer` returning `{ docs: [], size: 0 }` and `{ data: () => ({ count: 0 }) }`.
- **`config/__mocks__/firebase.ts`** + `moduleNameMapper` for `config/firebase`.
- Tests that override `firebase/firestore` must have `getDocs: jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true, forEach: () => {} })` so `snap.size` works.

---

## 10. Checklist

- [ ] Shared `buildQueryConstraints()` for list + count; exclude client-side filters
- [ ] Count query uses same `where` and `orderBy` as list query
- [ ] Total displayed from `totalCount` (Redux), not `items.length`
- [ ] `hasMore` = `items.length >= pageSize` after each fetch
- [ ] `lastDoc` in Redux `ignoredPaths`; add `fetchItemsPaginated/fulfilled`, `loadMoreItems/fulfilled` to `ignoredActions`
- [ ] Composite indexes for all filter + order combinations
- [ ] Search + lowStockOnly: client-side; total reflects Firestore filters only
- [ ] Reset pagination when filters change (`setFilters`)
- [ ] Show loader when `items.length === 0 && totalCount === null` to avoid flash of empty state on initial load

---

## Additional Resources

- For detailed code examples and migration from full-load to paginated, see [reference.md](reference.md)
