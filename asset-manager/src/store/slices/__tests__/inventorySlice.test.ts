jest.mock('../../thunks/inventoryThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchItems: createAsyncThunk('inventory/fetchItems', async () => []),
    fetchItemsPaginated: createAsyncThunk('inventory/fetchItemsPaginated', async () => ({ items: [], totalCount: 0, lastDoc: null })),
    loadMoreItems: createAsyncThunk('inventory/loadMoreItems', async () => ({ items: [], lastDoc: null })),
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
  categoryId: 'cat1',
  categoryName: 'Steel',
  totalQuantity: 100,
  minStockLevel: 10,
} as import('../../types/inventory').Item;

const lowStockItem = {
  id: 'item2',
  name: 'Low Stock Item',
  sku: 'SKU-002',
  categoryId: 'cat2',
  categoryName: 'Tools',
  totalQuantity: 5,
  minStockLevel: 10,
} as import('../../types/inventory').Item;

const uncategorizedItem = {
  id: 'item3',
  name: 'Uncategorized Item',
  sku: 'SKU-003',
  categoryId: null,
  categoryName: null,
  totalQuantity: 25,
  minStockLevel: 8,
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
    totalCount: null,
    lastDoc: null,
    hasMore: false,
    loadingMore: false,
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

  it('setItems handles uncategorized items correctly', () => {
    const state = inventoryReducer(
      initialState,
      setItems([mockItem, uncategorizedItem, lowStockItem])
    );
    expect(state.items).toHaveLength(3);
    
    // Verify uncategorized item is included with null categoryId
    const uncatItem = state.items.find(item => item.id === 'item3');
    expect(uncatItem?.categoryId).toBeNull();
    expect(uncatItem?.categoryName).toBeNull();
    
    // Low stock detection should still work for uncategorized items
    expect(state.lowStockItemIds).toContain('item2');
    expect(state.lowStockItemIds).not.toContain('item1');
    expect(state.lowStockItemIds).not.toContain('item3');
  });

  it('updateItemInState handles category changes including null', () => {
    const withItems = inventoryReducer(initialState, setItems([mockItem]));
    
    // Update item to remove category (make it uncategorized)
    const updated = { ...mockItem, categoryId: null, categoryName: null };
    const state = inventoryReducer(withItems, updateItemInState(updated));
    
    const updatedItem = state.items.find(item => item.id === 'item1');
    expect(updatedItem?.categoryId).toBeNull();
    expect(updatedItem?.categoryName).toBeNull();
  });

  it('addItem handles uncategorized items', () => {
    const state = inventoryReducer(initialState, addItem(uncategorizedItem));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('item3');
    expect(state.items[0].categoryId).toBeNull();
    expect(state.items[0].categoryName).toBeNull();
  });
});
