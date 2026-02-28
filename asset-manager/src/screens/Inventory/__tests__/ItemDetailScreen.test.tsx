/**
 * ItemDetailScreen — Item detail view with stock, edit, add stock
 * Tests: loading when item not in store, renders item details, edit navigates, add stock opens modal, back button.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { ItemDetailScreen } from '../ItemDetailScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Item } from '../../../types/inventory';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

let mockRouteParams: { itemId?: string } = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

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
    subscribeToActivityLogsRealtime: () => () => {},
    subscribeToMyRecentActivityRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
    unsubscribeFromMyRecentActivity: () => () => {},
  };
});

const mockItem: Item = {
  id: 'i1',
  name: 'Steel Bar 12mm',
  sku: 'SKU-001',
  categoryId: 'cat1',
  categoryName: 'Steel',
  type: 'consumable',
  unit: 'Pcs',
  minStockLevel: 10,
  status: 'active',
  totalQuantity: 50,
  centralStoreQuantity: 30,
  atSitesQuantity: 15,
  inMaintenanceQuantity: 5,
};

const defaultPreloadedState: Partial<RootState> = {
  auth: {
    user: { uid: 'user1', email: 'user@test.com', displayName: 'Test User' } as import('firebase/auth').User,
    userRole: null,
    isLoading: false,
    isRoleLoading: false,
    authInitialized: false,
    error: null,
    isAuthenticated: true,
  },
  inventory: {
    items: [],
    categories: [],
    inventoryByLocation: {},
    lowStockItemIds: [],
    loading: false,
    error: null,
    errorTimestamp: null,
    filters: null,
  },
};

function renderWithStore(ui: React.ReactElement, preloadedState: Partial<RootState> = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      sites: sitesReducer,
      inventory: inventoryReducer,
      requests: requestsReducer,
      steelMaster: steelMasterReducer,
      maintenance: maintenanceReducer,
      activityLog: activityLogReducer,
      purchaseOrders: purchaseOrderReducer,
    } as Record<string, React.Reducer<unknown, { type: string }>>,
    preloadedState: { ...defaultPreloadedState, ...preloadedState } as Partial<RootState>,
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <WeightViewPreferenceProvider>{ui}</WeightViewPreferenceProvider>
      </Provider>
    ),
  };
}

describe('ItemDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { itemId: 'i1' };
  });

  it('shows loading when item not in store', () => {
    mockRouteParams = { itemId: 'i1' };
    renderWithStore(<ItemDetailScreen />, {
      inventory: {
        items: [],
        categories: [],
        inventoryByLocation: {},
        lowStockItemIds: [],
        loading: true,
        error: null,
        errorTimestamp: null,
        filters: null,
      },
    });

    expect(screen.getByText('Loading item details...')).toBeTruthy();
    expect(screen.getByText('Item Details')).toBeTruthy();
  });

  it('renders item details when item in store (name, SKU, stock)', () => {
    mockRouteParams = { itemId: 'i1' };
    renderWithStore(<ItemDetailScreen />, {
      inventory: {
        items: [mockItem],
        categories: [],
        inventoryByLocation: {},
        lowStockItemIds: [],
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: null,
      },
    });

    expect(screen.getByText('Steel Bar 12mm')).toBeTruthy();
    expect(screen.getByText(/SKU: SKU-001/)).toBeTruthy();
    expect(screen.getByText('Basic Information')).toBeTruthy();
    expect(screen.getByText('Stock Distribution')).toBeTruthy();
    expect(screen.getByText('Total Stock')).toBeTruthy();
    expect(screen.getByText('Central Store')).toBeTruthy();
  });

  it('edit button navigates to AddEditItem with itemId', () => {
    mockRouteParams = { itemId: 'i1' };
    renderWithStore(<ItemDetailScreen />, {
      inventory: {
        items: [mockItem],
        categories: [],
        inventoryByLocation: {},
        lowStockItemIds: [],
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: null,
      },
    });

    const editButtons = screen.getAllByRole('button', { name: 'Edit item' });
    fireEvent.press(editButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('AddEditItem', { itemId: 'i1' });
  });

  it('add stock opens StockEntryModal', () => {
    mockRouteParams = { itemId: 'i1' };
    renderWithStore(<ItemDetailScreen />, {
      inventory: {
        items: [mockItem],
        categories: [],
        inventoryByLocation: {},
        lowStockItemIds: [],
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: null,
      },
    });

    const addStockButtons = screen.getAllByRole('button', { name: 'Add stock' });
    fireEvent.press(addStockButtons[0]);

    expect(screen.getByLabelText('Amount input')).toBeTruthy();
  });

  it('back button calls goBack', () => {
    mockRouteParams = { itemId: 'i1' };
    renderWithStore(<ItemDetailScreen />, {
      inventory: {
        items: [mockItem],
        categories: [],
        inventoryByLocation: {},
        lowStockItemIds: [],
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: null,
      },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
