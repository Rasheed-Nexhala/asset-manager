import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Item, Category, InventoryEntry, ItemFilters } from '../../types/inventory';
import {
  fetchItems,
  fetchItemById,
  createItem,
  updateItem,
  adjustQuantity,
  fetchInventoryByLocation,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../store/thunks/inventoryThunks';

interface InventoryState {
  items: Item[];
  categories: Category[];
  inventoryByLocation: Record<string, InventoryEntry[]>; // Key: locationId, Value: inventory entries
  lowStockItemIds: string[]; // IDs of items at or below minimum stock level
  loading: boolean;
  error: string | null;
  filters: ItemFilters | null; // Current filters applied to items list
}

const initialState: InventoryState = {
  items: [],
  categories: [],
  inventoryByLocation: {},
  lowStockItemIds: [],
  loading: false,
  error: null,
  filters: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<Item[]>) => {
      state.items = action.payload;
      // Update low stock item IDs whenever items change
      state.lowStockItemIds = action.payload
        .filter((item) => item.totalQuantity <= item.minStockLevel)
        .map((item) => item.id);
    },
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    setInventoryForLocation: (
      state,
      action: PayloadAction<{ locationId: string; inventory: InventoryEntry[] }>
    ) => {
      state.inventoryByLocation[action.payload.locationId] = action.payload.inventory;
    },
    setLowStockItemIds: (state, action: PayloadAction<string[]>) => {
      state.lowStockItemIds = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setFilters: (state, action: PayloadAction<ItemFilters | null>) => {
      state.filters = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Update a single item in the items array (useful for real-time updates)
    updateItemInState: (state, action: PayloadAction<Item>) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
        // Update low stock item IDs
        state.lowStockItemIds = state.items
          .filter((item) => item.totalQuantity <= item.minStockLevel)
          .map((item) => item.id);
      }
    },
    // Add a new item to the items array
    addItem: (state, action: PayloadAction<Item>) => {
      state.items.push(action.payload);
      // Update low stock item IDs
      if (action.payload.totalQuantity <= action.payload.minStockLevel) {
        state.lowStockItemIds.push(action.payload.id);
      }
    },
    // Clear inventory for a location (useful when location is removed or user logs out)
    clearInventoryForLocation: (state, action: PayloadAction<string>) => {
      delete state.inventoryByLocation[action.payload];
    },
    // Clear all inventory data (useful on logout)
    clearInventory: (state) => {
      state.items = [];
      state.categories = [];
      state.inventoryByLocation = {};
      state.lowStockItemIds = [];
      state.filters = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch items
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        // Update low stock item IDs
        state.lowStockItemIds = action.payload
          .filter((item) => item.totalQuantity <= item.minStockLevel)
          .map((item) => item.id);
        state.error = null;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch item by ID
      .addCase(fetchItemById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItemById.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const index = state.items.findIndex((item) => item.id === action.payload!.id);
          if (index !== -1) {
            state.items[index] = action.payload;
          } else {
            state.items.push(action.payload);
          }
          // Update low stock item IDs
          state.lowStockItemIds = state.items
            .filter((item) => item.totalQuantity <= item.minStockLevel)
            .map((item) => item.id);
        }
        state.error = null;
      })
      .addCase(fetchItemById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create item
      .addCase(createItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createItem.fulfilled, (state) => {
        state.loading = false;
        // Don't manually add the item here - the real-time listener will handle it
        // to avoid duplicate entries when subscribeItems triggers
        state.error = null;
      })
      .addCase(createItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update item
      .addCase(updateItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateItem.fulfilled, (state) => {
        state.loading = false;
        // Don't manually update the item here - the real-time listener will handle it
        // to ensure consistency and avoid race conditions
        state.error = null;
      })
      .addCase(updateItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Adjust quantity
      .addCase(adjustQuantity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adjustQuantity.fulfilled, (state) => {
        state.loading = false;
        // Don't manually update here - real-time listeners will handle updates
        state.error = null;
      })
      .addCase(adjustQuantity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch inventory by location
      .addCase(fetchInventoryByLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryByLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryByLocation[action.payload.locationId] = action.payload.inventory;
        state.error = null;
      })
      .addCase(fetchInventoryByLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create category
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state) => {
        state.loading = false;
        // Don't manually add the category here - the real-time listener will handle it
        state.error = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update category
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state) => {
        state.loading = false;
        // Don't manually update the category here - the real-time listener will handle it
        state.error = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete category
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state) => {
        state.loading = false;
        // Don't manually remove the category here - the real-time listener will handle it
        state.error = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setItems,
  setCategories,
  setInventoryForLocation,
  setLowStockItemIds,
  setLoading,
  setError,
  setFilters,
  clearError,
  updateItemInState,
  addItem,
  clearInventoryForLocation,
  clearInventory,
} = inventorySlice.actions;

export { fetchItems, fetchItemById, createItem, updateItem, adjustQuantity, fetchInventoryByLocation, fetchCategories, createCategory, updateCategory, deleteCategory } from '../../store/thunks/inventoryThunks';

export default inventorySlice.reducer;
