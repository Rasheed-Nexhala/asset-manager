import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ItemSelectorModal } from '../ItemSelectorModal';
import type { RootState } from '../../../store';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { Item } from '../../../types/inventory';

jest.mock('../../../store/thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk('auth/signIn', async () => ({ uid: 'mock' })),
    signOutUser: createAsyncThunk('auth/signOut', async () => null),
    signUpUser: createAsyncThunk('auth/signUp', async () => ({ uid: 'mock' })),
  };
});
jest.mock('../../../store/thunks/sitesThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSites: createAsyncThunk('sites/fetchSites', async () => []),
    createSite: createAsyncThunk('sites/createSite', async () => null),
    updateSite: createAsyncThunk('sites/updateSite', async () => null),
  };
});
jest.mock('../../../store/thunks/managerValidationThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    cleanupManagerAssignments: createAsyncThunk('managerValidation/cleanup', async () => ({ sitesUpdated: 0, managerId: 'm1' })),
    validateAllManagerAssignments: createAsyncThunk('managerValidation/validateAll', async () => ({ sitesUpdated: 0, managersCleaned: [] })),
  };
});
jest.mock('../../../store/thunks/inventoryThunks', () => {
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
jest.mock('../../../store/thunks/steelMasterThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSteelMasters: createAsyncThunk('steelMaster/fetch', async () => []),
    fetchSteelMasterById: createAsyncThunk('steelMaster/fetchById', async () => null),
    createSteelMaster: createAsyncThunk('steelMaster/create', async () => null),
    updateSteelMaster: createAsyncThunk('steelMaster/update', async () => null),
    deleteSteelMaster: createAsyncThunk('steelMaster/delete', async () => null),
  };
});
jest.mock('../../../store/thunks/maintenanceThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchMaintenanceRecords: createAsyncThunk('maintenance/fetch', async () => []),
    fetchMaintenanceById: createAsyncThunk('maintenance/fetchById', async () => null),
    addToMaintenanceThunk: createAsyncThunk('maintenance/add', async () => null),
    returnFromMaintenanceThunk: createAsyncThunk('maintenance/return', async () => null),
    writeOffItemThunk: createAsyncThunk('maintenance/writeOff', async () => null),
    addMaintenanceUpdateThunk: createAsyncThunk('maintenance/update', async () => null),
  };
});
jest.mock('../../../store/thunks/activityLogThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchActivityLogs: createAsyncThunk('activityLog/fetch', async () => ({ logs: [], lastDoc: null })),
    loadMoreActivityLogs: createAsyncThunk('activityLog/loadMore', async () => ({ logs: [], lastDoc: null })),
    fetchMyRecentActivity: createAsyncThunk('activityLog/fetchMy', async () => []),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => {},
    subscribeToMyRecentActivityRealtime: () => {},
    unsubscribeFromActivityLogs: () => {},
    unsubscribeFromMyRecentActivity: () => {},
  };
});

const mockItems: Item[] = [
  {
    id: 'item1',
    name: 'Steel Bar',
    sku: 'SKU-001',
    categoryId: 'cat1',
    categoryName: 'Steel',
    type: 'non_consumable',
    unit: 'piece',
    minStockLevel: 10,
    status: 'active',
    totalQuantity: 50,
    centralStoreQuantity: 30,
    atSitesQuantity: 15,
    inMaintenanceQuantity: 5,
  } as Item,
  {
    id: 'item2',
    name: 'Cement Bag',
    sku: 'SKU-002',
    categoryId: 'cat2',
    categoryName: 'Building',
    type: 'consumable',
    unit: 'bag',
    minStockLevel: 20,
    status: 'active',
    totalQuantity: 100,
    centralStoreQuantity: 60,
    atSitesQuantity: 40,
    inMaintenanceQuantity: 0,
  } as Item,
];

function createStore(preloadedState: Partial<RootState> = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      sites: sitesReducer,
      inventory: inventoryReducer,
      requests: requestsReducer,
      steelMaster: steelMasterReducer,
      maintenance: maintenanceReducer,
      activityLog: activityLogReducer,
      purchaseOrders: purchaseOrderReducer,
    },
    preloadedState: preloadedState as Partial<RootState>,
  });
}

function renderWithStore(
  ui: React.ReactElement,
  preloadedState: Partial<RootState> = {}
) {
  const store = createStore(preloadedState);
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}

describe('ItemSelectorModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    renderWithStore(
      <ItemSelectorModal
        isVisible={false}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />,
      {
        inventory: {
          items: mockItems,
          categories: [],
          inventoryByLocation: {},
          lowStockItemIds: [],
          filters: null,
          loading: false,
          error: null,
          errorTimestamp: null,
        },
      }
    );

    expect(screen.queryByText('Select Items')).toBeNull();
  });

  it('renders modal with items when visible', () => {
    renderWithStore(
      <ItemSelectorModal
        isVisible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />,
      {
        inventory: {
          items: mockItems,
          categories: [],
          inventoryByLocation: {},
          lowStockItemIds: [],
          filters: null,
          loading: false,
          error: null,
          errorTimestamp: null,
        },
      }
    );

    expect(screen.getByText('Select Items')).toBeTruthy();
    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText('Cement Bag')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search items...')).toBeTruthy();
  });

  it('filters items by search query', () => {
    renderWithStore(
      <ItemSelectorModal
        isVisible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />,
      {
        inventory: {
          items: mockItems,
          categories: [],
          inventoryByLocation: {},
          lowStockItemIds: [],
          filters: null,
          loading: false,
          error: null,
          errorTimestamp: null,
        },
      }
    );

    fireEvent.changeText(screen.getByPlaceholderText('Search items...'), 'Steel');

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.queryByText('Cement Bag')).toBeNull();
  });

  it('calls onClose when Cancel is pressed', () => {
    renderWithStore(
      <ItemSelectorModal
        isVisible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />,
      {
        inventory: {
          items: mockItems,
          categories: [],
          inventoryByLocation: {},
          lowStockItemIds: [],
          filters: null,
          loading: false,
          error: null,
          errorTimestamp: null,
        },
      }
    );

    fireEvent.press(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with selected items when Add is pressed', () => {
    renderWithStore(
      <ItemSelectorModal
        isVisible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />,
      {
        inventory: {
          items: mockItems,
          categories: [],
          inventoryByLocation: {},
          lowStockItemIds: [],
          filters: null,
          loading: false,
          error: null,
          errorTimestamp: null,
        },
      }
    );

    fireEvent.press(screen.getByText('Steel Bar'));
    fireEvent.press(screen.getByText('Add (1)'));

    expect(mockOnSelect).toHaveBeenCalledWith([mockItems[0]]);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('excludes items in excludeItemIds', () => {
    renderWithStore(
      <ItemSelectorModal
        isVisible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        excludeItemIds={['item1']}
      />,
      {
        inventory: {
          items: mockItems,
          categories: [],
          inventoryByLocation: {},
          lowStockItemIds: [],
          filters: null,
          loading: false,
          error: null,
          errorTimestamp: null,
        },
      }
    );

    expect(screen.queryByText('Steel Bar')).toBeNull();
    expect(screen.getByText('Cement Bag')).toBeTruthy();
  });

  it('shows loading state when loading and no items', () => {
    renderWithStore(
      <ItemSelectorModal
        isVisible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />,
      {
        inventory: {
          items: [],
          categories: [],
          inventoryByLocation: {},
          lowStockItemIds: [],
          filters: null,
          loading: true,
          error: null,
          errorTimestamp: null,
        },
      }
    );

    expect(screen.getByText('Loading items...')).toBeTruthy();
  });
});
