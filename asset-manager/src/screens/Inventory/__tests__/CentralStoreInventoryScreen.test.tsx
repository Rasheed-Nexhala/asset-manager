import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CentralStoreInventoryScreen } from '../CentralStoreInventoryScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Item, Category } from '../../../types/inventory';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubItems = jest.fn();
const mockUnsubCategories = jest.fn();
let mockItemsToReturn: Item[] | null = null;
let mockCategoriesToReturn: Category[] | null = null;
jest.mock('../../../services/firebase/inventoryService', () => ({
  subscribeItems: jest.fn((callback: (items: Item[]) => void) => {
    if (mockItemsToReturn !== null) {
      callback(mockItemsToReturn);
    }
    return mockUnsubItems;
  }),
}));
jest.mock('../../../services/firebase/categoryService', () => ({
  subscribeCategories: jest.fn((callback: (categories: Category[]) => void) => {
    if (mockCategoriesToReturn !== null) {
      callback(mockCategoriesToReturn);
    }
    return mockUnsubCategories;
  }),
}));

let mockFetchItemsResult: Item[] | 'reject' | 'pending' = [];
let mockFetchCategoriesResult: Category[] | 'reject' | 'pending' = [];
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
    fetchItems: createAsyncThunk('inventory/fetchItems', async (_, { rejectWithValue }) => {
      if (mockFetchItemsResult === 'reject') {
        return rejectWithValue('Failed to load items');
      }
      if (mockFetchItemsResult === 'pending') {
        await new Promise(() => {});
      }
      return (mockFetchItemsResult as Item[]) ?? [];
    }),
    fetchCategories: createAsyncThunk('inventory/fetchCategories', async (_, { rejectWithValue }) => {
      if (mockFetchCategoriesResult === 'reject') {
        return rejectWithValue('Failed to load categories');
      }
      if (mockFetchCategoriesResult === 'pending') {
        await new Promise(() => {});
      }
      return (mockFetchCategoriesResult as Category[]) ?? [];
    }),
    fetchItemById: createAsyncThunk('inventory/fetchItemById', async () => null),
    createItem: createAsyncThunk('inventory/createItem', async () => null),
    updateItem: createAsyncThunk('inventory/updateItem', async () => null),
    deleteItem: createAsyncThunk('inventory/deleteItem', async () => null),
    adjustQuantity: createAsyncThunk('inventory/adjustQuantity', async () => null),
    fetchInventoryByLocation: createAsyncThunk('inventory/fetchByLocation', async () => []),
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
    preloadedState: preloadedState as Partial<RootState>,
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

const mockAdminUser = { uid: 'admin-1', email: 'admin@test.com', displayName: 'Admin' };
const mockAdminRole = { role: 'Admin' as const, isActive: true, permissions: [] };

const mockItem: Item = {
  id: 'item-1',
  name: 'Steel Rod 12mm',
  sku: 'STL-001',
  categoryId: 'cat-1',
  categoryName: 'Steel',
  type: 'consumable',
  unit: 'piece',
  minStockLevel: 10,
  status: 'active',
  totalQuantity: 50,
  centralStoreQuantity: 50,
  atSitesQuantity: 0,
  inMaintenanceQuantity: 0,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Steel',
  createdAt: '2025-01-01',
};

const defaultInventoryState = {
  items: [],
  categories: [],
  inventoryByLocation: {},
  lowStockItemIds: [],
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: null,
};

describe('CentralStoreInventoryScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUnsubItems.mockClear();
    mockUnsubCategories.mockClear();
    mockItemsToReturn = null;
    mockCategoriesToReturn = null;
    mockFetchItemsResult = [];
    mockFetchCategoriesResult = [];
  });

  it('renders Central Store header', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'Central Store' })).toBeTruthy();
    });
  });

  it('renders Add new item button for admin', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add new item' })).toBeTruthy();
    });
  });

  it('navigates to AddEditItem when Add button pressed', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Add new item' }).length).toBeGreaterThan(0);
    });
    fireEvent.press(screen.getAllByRole('button', { name: 'Add new item' })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('AddEditItem');
  });

  it('navigates to SteelMaster when Steel Master button pressed', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Steel Master' })).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Steel Master' }));
    expect(mockNavigate).toHaveBeenCalledWith('SteelMaster');
  });

  it('renders search input', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByRole('search', { name: 'Search items' })).toBeTruthy();
    });
  });

  it('shows empty state when no items', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByText('No Items Yet')).toBeTruthy();
    });
    expect(screen.getByText('Get started by adding your first inventory item.')).toBeTruthy();
  });

  it('shows Add First Item button when empty', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add new item' })).toBeTruthy();
    });
  });

  it('renders item list when items exist', async () => {
    mockItemsToReturn = [mockItem];
    mockCategoriesToReturn = [mockCategory];
    mockFetchItemsResult = 'pending';
    mockFetchCategoriesResult = 'pending';

    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByText('Steel Rod 12mm')).toBeTruthy();
    });
    expect(screen.getByText(/SKU: STL-001/)).toBeTruthy();
  });

  it('navigates to ItemDetail when item pressed', async () => {
    mockItemsToReturn = [mockItem];
    mockCategoriesToReturn = [mockCategory];
    mockFetchItemsResult = 'pending';
    mockFetchCategoriesResult = 'pending';

    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByText('Steel Rod 12mm')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Steel Rod 12mm'));
    expect(mockNavigate).toHaveBeenCalledWith('ItemDetail', { itemId: 'item-1' });
  });

  it('shows loading state when fetchItems is pending', async () => {
    mockFetchItemsResult = 'pending';
    mockFetchCategoriesResult = 'pending';

    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByText('Loading items...')).toBeTruthy();
    });
  });

  it('shows error state when fetchItems rejects', async () => {
    mockFetchItemsResult = 'reject';
    mockFetchCategoriesResult = 'pending';

    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeTruthy();
    });
    expect(screen.getByText('Failed to load items')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry loading items' })).toBeTruthy();
  });

  it('toggles filters when filter button pressed', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle filters' })).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Toggle filters' }));
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('Stock Level')).toBeTruthy();
  });

  it('renders Maintenance button for admin', async () => {
    renderWithStore(<CentralStoreInventoryScreen />, {
      auth: { user: mockAdminUser, userRole: mockAdminRole, isAuthenticated: true, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Maintenance' })).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Maintenance' }));
    expect(mockNavigate).toHaveBeenCalledWith('Maintenance');
  });
});
