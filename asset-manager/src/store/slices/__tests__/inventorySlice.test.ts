jest.mock('../../thunks/inventoryThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchItems: createAsyncThunk('inventory/fetchItems', async () => []),
    fetchItemById: createAsyncThunk('inventory/fetchItemById', async () => null),
    createItem: createAsyncThunk('inventory/createItem', async () => null),
    updateItem: createAsyncThunk('inventory/updateItem', async () => null),
    deleteItem: createAsyncThunk('inventory/deleteItem', async () => null),
    adjustQuantity: createAsyncThunk('inventory/adjustQuantity', async () => null),
    fetchInventoryByLocation: createAsyncThunk('inventory/fetchByLocation', async () => []),
    fetchCategories: createAsyncThunk('inventory/fetchCategories', async () => []),
    createCategory: createAsyncThunk('inventory/createCategory', async () => null),
    updateCategory: createAsyncThunk('inventory/updateCategory', async () => null),
    deleteCategory: createAsyncThunk('inventory/deleteCategory', async () => null),
  };
});

import inventoryReducer, {
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
} from '../inventorySlice';

const mockItem = {
  id: 'item1',
  name: 'Steel Bar',
  sku: 'SKU-001',
  totalQuantity: 100,
  minStockLevel: 10,
} as import('../../types/inventory').Item;

const lowStockItem = {
  id: 'item2',
  name: 'Low Stock Item',
  sku: 'SKU-002',
  totalQuantity: 5,
  minStockLevel: 10,
} as import('../../types/inventory').Item;

describe('inventorySlice', () => {
  const initialState = {
    items: [],
    categories: [],
    inventoryByLocation: {},
    lowStockItemIds: [],
    loading: false,
    error: null,
    errorTimestamp: null,
    filters: null,
  };

  it('has correct initial state', () => {
    expect(inventoryReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setItems sets items and updates lowStockItemIds', () => {
    const state = inventoryReducer(
      initialState,
      setItems([mockItem, lowStockItem])
    );
    expect(state.items).toHaveLength(2);
    expect(state.lowStockItemIds).toContain('item2');
    expect(state.lowStockItemIds).not.toContain('item1');
  });

  it('setCategories sets categories', () => {
    const cats = [{ id: 'c1', name: 'Steel' }];
    const state = inventoryReducer(initialState, setCategories(cats as never[]));
    expect(state.categories).toEqual(cats);
  });

  it('setInventoryForLocation sets inventory for location', () => {
    const state = inventoryReducer(
      initialState,
      setInventoryForLocation({ locationId: 'site_1', inventory: [] })
    );
    expect(state.inventoryByLocation['site_1']).toEqual([]);
  });

  it('setLowStockItemIds sets lowStockItemIds', () => {
    const state = inventoryReducer(
      initialState,
      setLowStockItemIds(['item1', 'item2'])
    );
    expect(state.lowStockItemIds).toEqual(['item1', 'item2']);
  });

  it('setLoading sets loading', () => {
    const state = inventoryReducer(initialState, setLoading(true));
    expect(state.loading).toBe(true);
  });

  it('setError sets error and errorTimestamp', () => {
    const state = inventoryReducer(initialState, setError('Failed'));
    expect(state.error).toBe('Failed');
    expect(state.errorTimestamp).toBeTruthy();
  });

  it('setFilters sets filters', () => {
    const filters = { searchQuery: 'steel', categoryId: null };
    const state = inventoryReducer(initialState, setFilters(filters as never));
    expect(state.filters).toEqual(filters);
  });

  it('clearError clears error', () => {
    const withError = inventoryReducer(initialState, setError('Error'));
    const state = inventoryReducer(withError, clearError());
    expect(state.error).toBe(null);
  });

  it('updateItemInState updates existing item', () => {
    const withItems = inventoryReducer(initialState, setItems([mockItem]));
    const updated = { ...mockItem, name: 'Steel Bar Updated' };
    const state = inventoryReducer(withItems, updateItemInState(updated));
    expect(state.items[0].name).toBe('Steel Bar Updated');
  });

  it('addItem appends item', () => {
    const state = inventoryReducer(initialState, addItem(mockItem));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('item1');
  });

  it('clearInventoryForLocation removes location', () => {
    const withLoc = inventoryReducer(
      initialState,
      setInventoryForLocation({ locationId: 'site_1', inventory: [] })
    );
    const state = inventoryReducer(withLoc, clearInventoryForLocation('site_1'));
    expect(state.inventoryByLocation['site_1']).toBeUndefined();
  });
});
