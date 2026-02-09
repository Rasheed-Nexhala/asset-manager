import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Item, Category, InventoryEntry, ItemType, ItemStatus } from '../../types/inventory';

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

export const selectItemsFilters = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.filters
);

// Item by ID selector (factory function for dynamic selection)
export const selectItemById = (itemId: string) =>
  createSelector(
    [selectAllItems],
    (items) => items.find((item) => item.id === itemId) || null
  );

// Filtered items selectors
export const selectItemsByCategory = (categoryId: string) =>
  createSelector(
    [selectAllItems],
    (items) => items.filter((item) => item.categoryId === categoryId)
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

// Low stock selectors
export const selectLowStockItemIds = createSelector(
  [selectInventoryState],
  (inventoryState) => inventoryState.lowStockItemIds
);

export const selectLowStockItems = createSelector(
  [selectAllItems, selectLowStockItemIds],
  (items, lowStockIds) => items.filter((item) => lowStockIds.includes(item.id))
);

export const selectLowStockCount = createSelector(
  [selectLowStockItemIds],
  (lowStockIds) => lowStockIds.length
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

export const selectCategoryById = (categoryId: string) =>
  createSelector(
    [selectAllCategories],
    (categories) => categories.find((cat) => cat.id === categoryId) || null
  );

// Inventory by location selectors
export const selectInventoryByLocation = (locationId: string) =>
  createSelector(
    [selectInventoryState],
    (inventoryState) => inventoryState.inventoryByLocation[locationId] || []
  );

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
    if (filters.categoryId) {
      filtered = filtered.filter((item) => item.categoryId === filters.categoryId);
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
      filtered = filtered.filter(
        (item) => item.totalQuantity <= item.minStockLevel
      );
    }

    return filtered;
  }
);

export const selectFilteredLowStockItems = createSelector(
  [selectFilteredItems, selectLowStockItemIds],
  (filteredItems, lowStockIds) =>
    filteredItems.filter((item) => lowStockIds.includes(item.id))
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
        item.name.toLowerCase().includes(lowerQuery) ||
        item.sku.toLowerCase().includes(lowerQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
        item.categoryName.toLowerCase().includes(lowerQuery)
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
          item.name.toLowerCase().includes(lowerQuery) ||
          item.sku.toLowerCase().includes(lowerQuery) ||
          (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
          item.categoryName.toLowerCase().includes(lowerQuery)
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
