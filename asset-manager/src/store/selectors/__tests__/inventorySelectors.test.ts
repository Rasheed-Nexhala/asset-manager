import {
  selectAllItems,
  selectItemsLoading,
  selectInventoryError,
  selectItemById,
  selectAllCategories,
  selectLowStockItems,
  selectLowStockItemIds,
  selectLowStockCount,
  selectInventoryByLocation,
  selectEmptyInventory,
  selectActiveItems,
  selectDiscontinuedItems,
  selectConsumableItems,
  selectNonConsumableItems,
  selectFilteredItems,
  selectItemsBySearchQuery,
  selectFilteredAndSearchedItems,
  selectTotalItemsCount,
  selectActiveItemsCount,
  selectItemsByCategory,
  selectCategoryById,
} from '../inventorySelectors';
import type { RootState } from '../../index';
import type { Item, Category, InventoryEntry } from '../../../types/inventory';

const baseAuth = {
  user: null,
  userRole: null,
  isAuthenticated: false,
  isLoading: false,
  isRoleLoading: false,
  error: null,
};
const baseSites = {
  sites: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  validationLoading: false,
  lastValidationAt: null,
};
const baseRequests = {
  requests: [],
  myRequests: [],
  selectedRequest: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: { status: 'all', priority: 'all', siteId: 'all' },
};
const baseSteelMaster = { steelMasters: [], selectedSteelMaster: null, loading: false, error: null };
const baseMaintenance = {
  maintenanceRecords: [],
  selectedMaintenance: null,
  filters: {},
  loading: false,
  error: null,
};
const baseActivityLog = {
  logs: [],
  hasMore: true,
  lastDoc: null,
  myRecentActivity: [],
  filters: {},
  loading: false,
  loadingMore: false,
  exportLoading: false,
  myActivityLoading: false,
  error: null,
  errorTimestamp: null,
};
const basePurchaseOrders = {
  purchaseOrders: [],
  selectedPO: null,
  vendors: [],
  loading: false,
  error: null,
  filters: { status: 'all' },
};

const createMockState = (inventory: Partial<RootState['inventory']>): RootState =>
  ({
    auth: baseAuth,
    sites: baseSites,
    inventory: {
      items: [],
      categories: [],
      inventoryByLocation: {},
      lowStockItemIds: [],
      loading: false,
      error: null,
      errorTimestamp: null,
      filters: null,
      ...inventory,
    },
    requests: baseRequests,
    steelMaster: baseSteelMaster,
    maintenance: baseMaintenance,
    activityLog: baseActivityLog,
    purchaseOrders: basePurchaseOrders,
  }) as RootState;

const mockItem = (
  id: string,
  overrides: Partial<Item> = {}
): Item =>
  ({
    id,
    name: `Item ${id}`,
    sku: `SKU-${id}`,
    categoryId: 'cat1',
    categoryName: 'Category 1',
    type: 'non_consumable',
    unit: 'piece',
    minStockLevel: 5,
    status: 'active',
    totalQuantity: 10,
    centralStoreQuantity: 5,
    atSitesQuantity: 3,
    inMaintenanceQuantity: 2,
    ...overrides,
  }) as Item;

const mockCategory = (id: string, name: string): Category => ({
  id,
  name,
  createdAt: '2024-01-01T00:00:00Z',
});

const mockInventoryEntry = (id: string, itemId: string, quantity: number): InventoryEntry => ({
  id,
  itemId,
  itemName: `Item ${itemId}`,
  itemSku: `SKU-${itemId}`,
  locationId: 'store',
  locationType: 'store',
  locationName: 'Central Store',
  quantity,
  updatedAt: '2024-01-01T00:00:00Z',
});

describe('inventorySelectors', () => {
  it('selectAllItems returns items', () => {
    const items = [mockItem('1'), mockItem('2')];
    const state = createMockState({ items });
    expect(selectAllItems(state)).toEqual(items);
  });

  it('selectItemsLoading returns loading state', () => {
    const state = createMockState({ loading: true });
    expect(selectItemsLoading(state)).toBe(true);
  });

  it('selectInventoryError returns error', () => {
    const state = createMockState({ error: 'Fetch failed' });
    expect(selectInventoryError(state)).toBe('Fetch failed');
  });

  it('selectItemById finds item by id', () => {
    const item = mockItem('item1');
    const state = createMockState({ items: [item, mockItem('item2')] });
    const selector = selectItemById('item1');
    expect(selector(state)).toEqual(item);
  });

  it('selectItemById returns null when not found', () => {
    const state = createMockState({ items: [mockItem('item1')] });
    const selector = selectItemById('missing');
    expect(selector(state)).toBeNull();
  });

  it('selectAllCategories returns categories', () => {
    const categories = [mockCategory('cat1', 'Steel'), mockCategory('cat2', 'Tools')];
    const state = createMockState({ categories });
    expect(selectAllCategories(state)).toEqual(categories);
  });

  it('selectLowStockItems returns items in lowStockItemIds', () => {
    const lowItem = mockItem('low1', { totalQuantity: 2, minStockLevel: 5 });
    const okItem = mockItem('ok1', { totalQuantity: 10, minStockLevel: 5 });
    const state = createMockState({
      items: [lowItem, okItem],
      lowStockItemIds: ['low1'],
    });
    expect(selectLowStockItems(state)).toEqual([lowItem]);
  });

  it('selectLowStockCount returns count of low stock ids', () => {
    const state = createMockState({ lowStockItemIds: ['a', 'b', 'c'] });
    expect(selectLowStockCount(state)).toBe(3);
  });

  it('selectInventoryByLocation returns inventory for location', () => {
    const entries = [
      mockInventoryEntry('e1', 'item1', 5),
      mockInventoryEntry('e2', 'item2', 3),
    ];
    const state = createMockState({
      inventoryByLocation: { site_001: entries },
    });
    const selector = selectInventoryByLocation('site_001');
    expect(selector(state)).toEqual(entries);
  });

  it('selectInventoryByLocation returns empty array for unknown location', () => {
    const state = createMockState({ inventoryByLocation: {} });
    const selector = selectInventoryByLocation('unknown');
    expect(selector(state)).toEqual([]);
  });

  it('selectEmptyInventory returns stable empty array', () => {
    const state = createMockState({});
    expect(selectEmptyInventory(state)).toEqual([]);
  });

  it('selectActiveItems filters active items', () => {
    const active = mockItem('1', { status: 'active' });
    const discontinued = mockItem('2', { status: 'discontinued' });
    const state = createMockState({ items: [active, discontinued] });
    expect(selectActiveItems(state)).toEqual([active]);
  });

  it('selectDiscontinuedItems filters discontinued items', () => {
    const discontinued = mockItem('2', { status: 'discontinued' });
    const state = createMockState({ items: [mockItem('1'), discontinued] });
    expect(selectDiscontinuedItems(state)).toEqual([discontinued]);
  });

  it('selectConsumableItems filters consumable type', () => {
    const consumable = mockItem('1', { type: 'consumable' });
    const state = createMockState({ items: [consumable, mockItem('2')] });
    expect(selectConsumableItems(state)).toEqual([consumable]);
  });

  it('selectNonConsumableItems filters non_consumable type', () => {
    const nonConsumable = mockItem('1', { type: 'non_consumable' });
    const state = createMockState({ items: [nonConsumable, mockItem('2', { type: 'consumable' })] });
    expect(selectNonConsumableItems(state)).toEqual([nonConsumable]);
  });

  it('selectFilteredItems returns all items when no filters', () => {
    const items = [mockItem('1'), mockItem('2')];
    const state = createMockState({ items, filters: null });
    expect(selectFilteredItems(state)).toEqual(items);
  });

  it('selectFilteredItems filters by categoryId', () => {
    const items = [
      mockItem('1', { categoryId: 'cat1' }),
      mockItem('2', { categoryId: 'cat2' }),
    ];
    const state = createMockState({
      items,
      filters: { categoryId: 'cat1' },
    });
    expect(selectFilteredItems(state)).toHaveLength(1);
    expect(selectFilteredItems(state)[0].categoryId).toBe('cat1');
  });

  it('selectFilteredItems filters by type', () => {
    const items = [
      mockItem('1', { type: 'consumable' }),
      mockItem('2', { type: 'non_consumable' }),
    ];
    const state = createMockState({
      items,
      filters: { type: 'consumable' },
    });
    expect(selectFilteredItems(state)).toHaveLength(1);
    expect(selectFilteredItems(state)[0].type).toBe('consumable');
  });

  it('selectFilteredItems filters by status', () => {
    const items = [
      mockItem('1', { status: 'active' }),
      mockItem('2', { status: 'discontinued' }),
    ];
    const state = createMockState({
      items,
      filters: { status: 'discontinued' },
    });
    expect(selectFilteredItems(state)).toHaveLength(1);
    expect(selectFilteredItems(state)[0].status).toBe('discontinued');
  });

  it('selectItemsBySearchQuery returns items matching name', () => {
    const items = [
      mockItem('1', { name: 'Steel Bar' }),
      mockItem('2', { name: 'Concrete Mix' }),
    ];
    const state = createMockState({ items });
    const result = selectItemsBySearchQuery(state, 'steel');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Steel Bar');
  });

  it('selectItemsBySearchQuery returns items matching sku', () => {
    const items = [
      mockItem('1', { sku: 'STL-001' }),
      mockItem('2', { sku: 'CON-001' }),
    ];
    const state = createMockState({ items });
    const result = selectItemsBySearchQuery(state, 'STL');
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe('STL-001');
  });

  it('selectItemsBySearchQuery returns all items when search is empty', () => {
    const items = [mockItem('1'), mockItem('2')];
    const state = createMockState({ items });
    expect(selectItemsBySearchQuery(state, '')).toEqual(items);
    expect(selectItemsBySearchQuery(state, '   ')).toEqual(items);
  });

  it('selectFilteredAndSearchedItems intersects filtered and searched', () => {
    const items = [
      mockItem('1', { name: 'Steel Bar', categoryId: 'cat1' }),
      mockItem('2', { name: 'Steel Rod', categoryId: 'cat2' }),
      mockItem('3', { name: 'Concrete Mix', categoryId: 'cat1' }),
    ];
    const state = createMockState({
      items,
      filters: { categoryId: 'cat1' },
    });
    const result = selectFilteredAndSearchedItems(state, 'steel');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Steel Bar');
  });

  it('selectTotalItemsCount returns item count', () => {
    const state = createMockState({ items: [mockItem('1'), mockItem('2')] });
    expect(selectTotalItemsCount(state)).toBe(2);
  });

  it('selectActiveItemsCount returns active item count', () => {
    const items = [
      mockItem('1', { status: 'active' }),
      mockItem('2', { status: 'active' }),
      mockItem('3', { status: 'discontinued' }),
    ];
    const state = createMockState({ items });
    expect(selectActiveItemsCount(state)).toBe(2);
  });

  it('selectItemsByCategory returns items in category', () => {
    const items = [
      mockItem('1', { categoryId: 'cat1' }),
      mockItem('2', { categoryId: 'cat2' }),
      mockItem('3', { categoryId: 'cat1' }),
    ];
    const state = createMockState({ items });
    const selector = selectItemsByCategory('cat1');
    const result = selector(state);
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.categoryId === 'cat1')).toBe(true);
  });

  it('selectCategoryById finds category', () => {
    const categories = [mockCategory('cat1', 'Steel'), mockCategory('cat2', 'Tools')];
    const state = createMockState({ categories });
    const selector = selectCategoryById('cat2');
    expect(selector(state)).toEqual({ id: 'cat2', name: 'Tools', createdAt: '2024-01-01T00:00:00Z' });
  });

  it('selectCategoryById returns null when not found', () => {
    const state = createMockState({ categories: [mockCategory('cat1', 'Steel')] });
    const selector = selectCategoryById('missing');
    expect(selector(state)).toBeNull();
  });
});
