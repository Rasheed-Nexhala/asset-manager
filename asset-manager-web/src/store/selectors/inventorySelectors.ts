import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Item, Category, InventoryEntry, ItemType, ItemStatus } from '../../types/inventory';
import { isLowStock } from '../../utils/inventoryUtils';

/** Stable empty array reference - prevents unnecessary rerenders when location has no inventory */
const EMPTY_INVENTORY: InventoryEntry[] = [];

// Base selectors
const selectInventoryState = (state: RootState) => state.inventory;

// Items selectors
export const selectAllItems = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.items
);

export const selectItemsLoading = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.loading
);

export const selectItemsError = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.error
);

/** Alias for selectItemsError - same error state used for both items and categories */
export const selectInventoryError = selectItemsError;

export const selectItemsFilters = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.filters
);

// Pagination selectors
export const selectItemsTotalCount = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.totalCount
);

export const selectItemsHasMore = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.hasMore
);

export const selectItemsLoadingMore = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.loadingMore
);

// Item by ID selector (factory function for dynamic selection)
export const selectItemById = (itemId: string) =>
  createSelector(
    [selectAllItems],
    (items) => items.find((item) => item.id === itemId) || null
  );

// Filtered items selectors
export const selectItemsByCategory = (categoryId: string | null) =>
  createSelector(
    [selectAllItems],
    (items) => {
      if (categoryId === null || categoryId === 'uncategorized') {
        // Return items with no category (null, undefined, or empty string)
        return items.filter((item) => !item.categoryId || item.categoryId === null);
      }
      // Return items with the specific category ID
      return items.filter((item) => item.categoryId === categoryId);
    }
  );

export const selectItemsByType = (type: ItemType) =>
  createSelector(
    [selectAllItems],
    (items) => items.filter((item) => item.type === type)
  );

export const selectItemsByStatus = (status: ItemStatus) =>
  createSelector(
    [selectAllItems],
    (items) => items.filter((item) => item.status === status)
  );

export const selectActiveItems = createSelector(
  [selectAllItems],
  (items) => items.filter((item) => item.status === 'active')
);

export const selectDiscontinuedItems = createSelector(
  [selectAllItems],
  (items) => items.filter((item) => item.status === 'discontinued')
);

export const selectConsumableItems = createSelector(
  [selectAllItems],
  (items) => items.filter((item) => item.type === 'consumable')
);

export const selectNonConsumableItems = createSelector(
  [selectAllItems],
  (items) => items.filter((item) => item.type === 'non_consumable')
);

// Uncategorized items selector
export const selectUncategorizedItems = createSelector(
  [selectAllItems],
  (items) => items.filter((item) => !item.categoryId || item.categoryId === null)
);

// Low stock selectors
export const selectLowStockItemIds = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.lowStockItemIds
);

/** Derives low-stock items directly from items (single source of truth) */
export const selectLowStockItems = createSelector(
  [selectAllItems],
  (items) => items.filter((item) => isLowStock(item))
);

export const selectLowStockCount = createSelector(
  [selectLowStockItems],
  (lowStockItems) => lowStockItems.length
);

// Categories selectors
export const selectAllCategories = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.categories
);

export const selectCategoriesLoading = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.loading
);

export const selectCategoryById = (categoryId: string | null | undefined) =>
  createSelector(
    [selectAllCategories],
    (categories) => {
      if (!categoryId) return null;
      return categories.find((cat) => cat.id === categoryId) || null;
    }
  );

// Inventory by location selectors
export const selectInventoryByLocation = (locationId: string) =>
  createSelector(
    [selectInventoryState],
    (inventoryState) => inventoryState.inventoryByLocation[locationId] ?? EMPTY_INVENTORY
  );

/** Stable selector that always returns empty inventory - use when no site is assigned */
export const selectEmptyInventory = (_state: RootState) => EMPTY_INVENTORY;

export const selectAllInventoryByLocation = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.inventoryByLocation
);

// Combined/complex selectors
export const selectFilteredItems = createSelector(
  [selectAllItems, selectItemsFilters],
  (items, filters) => {
    if (!filters) {
      return items;
    }

    let filtered = items;

    // Filter by category
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === null || filters.categoryId === 'uncategorized') {
        // Show only items with no category
        filtered = filtered.filter((item) => !item.categoryId || item.categoryId === null);
      } else {
        // Show items with the specific category ID
        filtered = filtered.filter((item) => item.categoryId === filters.categoryId);
      }
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter((item) => item.type === filters.type);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    // Filter by low stock (must be applied last as it depends on totalQuantity)
    if (filters.lowStockOnly) {
      filtered = filtered.filter((item) => isLowStock(item));
    }

    return filtered;
  }
);

export const selectFilteredLowStockItems = createSelector(
  [selectFilteredItems],
  (filteredItems) => filteredItems.filter((item) => isLowStock(item))
);

// Base search query selector
const selectSearchQuery = (state: RootState, searchQuery: string) => searchQuery;

// Optimized search functionality with proper memoization
export const selectItemsBySearchQuery = createSelector(
  [selectAllItems, selectSearchQuery],
  (items, searchQuery) => {
    const trimmedQuery = searchQuery?.trim() || '';
    
    if (!trimmedQuery) {
      return items;
    }

    const lowerQuery = trimmedQuery.toLowerCase();
      return items.filter(
        (item) =>
          (item.name ?? '').toLowerCase().includes(lowerQuery) ||
          (item.sku ?? '').toLowerCase().includes(lowerQuery) ||
          (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(lowerQuery))
      );
  }
);

// Legacy factory function for backward compatibility (deprecated)
export const selectItemsBySearchQueryFactory = (searchQuery: string) =>
  createSelector(
    [selectAllItems],
    (items) => {
      const trimmedQuery = searchQuery?.trim() || '';
      
      if (!trimmedQuery) {
        return items;
      }

      const lowerQuery = trimmedQuery.toLowerCase();
      return items.filter(
        (item) =>
          (item.name ?? '').toLowerCase().includes(lowerQuery) ||
          (item.sku ?? '').toLowerCase().includes(lowerQuery) ||
          (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(lowerQuery))
      );
    }
  );

// Combined search and filters with proper memoization
export const selectFilteredAndSearchedItems = createSelector(
  [selectFilteredItems, selectItemsBySearchQuery],
  (filteredItems, searchedItems) => {
    // If both arrays are the same reference (no search applied), return filtered items
    if (filteredItems === searchedItems) {
      return filteredItems;
    }
    
    // Intersection of filtered and searched items
    const filteredIds = new Set(filteredItems.map((item) => item.id));
    return searchedItems.filter((item) => filteredIds.has(item.id));
  }
);

// Statistics selectors
export const selectTotalItemsCount = createSelector(
  [selectAllItems],
  (items) => items.length
);

export const selectActiveItemsCount = createSelector(
  [selectActiveItems],
  (activeItems) => activeItems.length
);

export const selectConsumableItemsCount = createSelector(
  [selectConsumableItems],
  (consumableItems) => consumableItems.length
);

export const selectNonConsumableItemsCount = createSelector(
  [selectNonConsumableItems],
  (nonConsumableItems) => nonConsumableItems.length
);

export const selectTotalCategoriesCount = createSelector(
  [selectAllCategories],
  (categories) => categories.length
);

// Inventory statistics for a location
export const selectInventoryStatsForLocation = (locationId: string) =>
  createSelector(
    [selectInventoryByLocation(locationId)],
    (inventory) => {
      const totalItems = inventory.length;
      const totalQuantity = inventory.reduce((sum, entry) => sum + entry.quantity, 0);
      const consumableCount = inventory.filter(
        (entry) => {
          // Note: This requires item data. For now, we'll need to combine with item selectors
          // This is a simplified version - you may need to enhance this based on your needs
          return true; // Placeholder - would need item type from items array
        }
      ).length;

      return {
        totalItems,
        totalQuantity,
        consumableCount,
      };
    }
  );
