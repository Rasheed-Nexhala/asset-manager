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
import inventoryUpdateRequestReducer from '../../../store/slices/inventoryUpdateRequestSlice';
import type { RootState } from '../../../store';
import type { Item } from '../../../types/inventory';
import type { AuthState } from '../../../types/auth';

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
  useFocusEffect: (cb: () => void | (() => void)) => {
    const cleanup = cb();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  },
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
    deleteAccountUser: createAsyncThunk('auth/deleteAccount', async () => null),
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
jest.mock('../../../services/firebase/inventoryService', () => ({
  subscribeItemById: jest.fn(() => () => {}),
  subscribeInventoryByItemId: jest.fn(() => () => {}),
  getItemById: jest.fn(),
  listItems: jest.fn(),
}));
jest.mock('../../../services/firebase/inventoryDeletionService', () => ({
  checkCanDeleteItem: jest.fn().mockResolvedValue({ canDelete: true }),
}));
jest.mock('../../../store/thunks/inventoryUpdateRequestThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    createInventoryUpdateRequest: createAsyncThunk('inventoryUpdateRequest/create', async () => null),
    approveInventoryUpdateRequest: createAsyncThunk('inventoryUpdateRequest/approve', async () => null),
    rejectInventoryUpdateRequest: createAsyncThunk('inventoryUpdateRequest/reject', async () => null),
    fetchPendingRequests: createAsyncThunk('inventoryUpdateRequest/fetchPending', async () => []),
    fetchMyActiveAccess: createAsyncThunk('inventoryUpdateRequest/fetchMyAccess', async () => null),
  };
});
jest.mock('../../../store/thunks/activityLogThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchActivityLogs: createAsyncThunk('activityLog/fetch', async () => ({ logs: [], lastDoc: null })),
    loadMoreActivityLogs: createAsyncThunk('activityLog/loadMore', async () => ({ logs: [], lastDoc: null })),
    fetchMyActivityPaginated: createAsyncThunk('activityLog/fetchMyActivityPaginated', async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })),
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({ logs: [], lastDoc: null, pageSize: 10 })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
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
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockUncategorizedItem: Item = {
  id: 'i2',
  name: 'Uncategorized Tool',
  sku: 'SKU-002',
  categoryId: null,
  categoryName: null,
  type: 'non_consumable',
  unit: 'piece',
  minStockLevel: 5,
  status: 'active',
  totalQuantity: 20,
  centralStoreQuantity: 12,
  atSitesQuantity: 6,
  inMaintenanceQuantity: 2,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** Item with all stock in central store - deletable */
const mockDeletableItem: Item = {
  id: 'i3',
  name: 'Deletable Item',
  sku: 'SKU-003',
  categoryId: 'cat1',
  categoryName: 'Steel',
  type: 'consumable',
  unit: 'Pcs',
  minStockLevel: 0,
  status: 'active',
  totalQuantity: 10,
  centralStoreQuantity: 10,
  atSitesQuantity: 0,
  inMaintenanceQuantity: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const defaultAuthState: AuthState = {
  user: { uid: 'user1', email: 'user@test.com', displayName: 'Test User' } as import('firebase/auth').User,
  userRole: null,
  isLoading: false,
  isRoleLoading: false,
  authInitialized: false,
  error: null,
  isAuthenticated: true,
};

const baseInventoryState: RootState['inventory'] = {
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

const defaultPreloadedState: Partial<RootState> = {
  auth: defaultAuthState,
  inventory: baseInventoryState,
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
      inventoryUpdateRequest: inventoryUpdateRequestReducer,
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
      inventory: { ...baseInventoryState, loading: true },
    });

    expect(screen.getByText('Loading item details...')).toBeTruthy();
    expect(screen.getByText('Item Details')).toBeTruthy();
  });

  it('renders item details when item in store (name, SKU, stock)', () => {
    mockRouteParams = { itemId: 'i1' };
    renderWithStore(<ItemDetailScreen />, {
      inventory: { ...baseInventoryState, items: [mockItem] },
    });

    expect(screen.getByText('Steel Bar 12mm')).toBeTruthy();
    expect(screen.getByText(/SKU: SKU-001/)).toBeTruthy();
    expect(screen.getByText('Basic Information')).toBeTruthy();
    expect(screen.getByText('Stock Distribution')).toBeTruthy();
    expect(screen.getByText('Total Stock')).toBeTruthy();
    expect(screen.getByText('Central Store')).toBeTruthy();
  });

  it('edit button navigates to AddEditItem with itemId when user can edit (Admin/StoreIncharge)', () => {
    mockRouteParams = { itemId: 'i1' };
    const storeInchargeAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'StoreIncharge' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: storeInchargeAuth,
      inventory: { ...baseInventoryState, items: [mockItem] },
    });

    const editButtons = screen.getAllByRole('button', { name: 'Edit item' });
    fireEvent.press(editButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('AddEditItem', { itemId: 'i1' });
  });

  it('add stock opens StockEntryModal when user is Admin', () => {
    mockRouteParams = { itemId: 'i1' };
    const adminAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'Admin' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: adminAuth,
      inventory: { ...baseInventoryState, items: [mockItem] },
    });

    const addStockButtons = screen.getAllByRole('button', { name: 'Add stock' });
    fireEvent.press(addStockButtons[0]);

    expect(screen.getByLabelText('Amount input')).toBeTruthy();
  });

  it('Add Stock button is hidden when user is StoreIncharge', () => {
    mockRouteParams = { itemId: 'i1' };
    const storeInchargeAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'StoreIncharge' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: storeInchargeAuth,
      inventory: { ...baseInventoryState, items: [mockItem] },
    });

    expect(screen.queryByRole('button', { name: 'Add stock' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Edit item' }).length).toBeGreaterThan(0);
  });

  it('back button calls goBack', () => {
    mockRouteParams = { itemId: 'i1' };
    const storeInchargeAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'StoreIncharge' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: storeInchargeAuth,
      inventory: { ...baseInventoryState, items: [mockItem] },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Edit, Add Stock, and Stock Level section are hidden when user is Site Manager (view-only)', () => {
    mockRouteParams = { itemId: 'i1' };
    const siteManagerAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'SiteManager' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: siteManagerAuth,
      inventory: { ...baseInventoryState, items: [mockItem] },
    });

    expect(screen.queryByRole('button', { name: 'Edit item' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add stock' })).toBeNull();
    expect(screen.queryByText('Stock Level & Status')).toBeNull();
    expect(screen.getByText('Steel Bar 12mm')).toBeTruthy();
  });

  it('renders uncategorized item details correctly', () => {
    mockRouteParams = { itemId: 'i2' };
    renderWithStore(<ItemDetailScreen />, {
      inventory: { ...baseInventoryState, items: [mockUncategorizedItem] },
    });

    expect(screen.getByText('Uncategorized Tool')).toBeTruthy();
    expect(screen.getByText(/SKU: SKU-002/)).toBeTruthy();
    expect(screen.getByText('Basic Information')).toBeTruthy();
    expect(screen.getByText('Stock Distribution')).toBeTruthy();
    expect(screen.getByText('Total Stock')).toBeTruthy();
    expect(screen.getByText('Central Store')).toBeTruthy();
  });

  it('edit button works for uncategorized items', () => {
    mockRouteParams = { itemId: 'i2' };
    const adminAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'Admin' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: adminAuth,
      inventory: { ...baseInventoryState, items: [mockUncategorizedItem] },
    });

    const editButtons = screen.getAllByRole('button', { name: 'Edit item' });
    fireEvent.press(editButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('AddEditItem', { itemId: 'i2' });
  });

  it('add stock works for uncategorized items', () => {
    mockRouteParams = { itemId: 'i2' };
    const adminAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'Admin' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: adminAuth,
      inventory: { ...baseInventoryState, items: [mockUncategorizedItem] },
    });

    const addStockButtons = screen.getAllByRole('button', { name: 'Add stock' });
    fireEvent.press(addStockButtons[0]);

    expect(screen.getByLabelText('Amount input')).toBeTruthy();
  });

  it('Delete button is visible when Admin and item has no stock at sites or maintenance', () => {
    mockRouteParams = { itemId: 'i3' };
    const adminAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'Admin' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: adminAuth,
      inventory: { ...baseInventoryState, items: [mockDeletableItem] },
    });

    expect(screen.getByText('Danger Zone')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete item' })).toBeTruthy();
  });

  it('Delete button is NOT visible when item has stock at sites', () => {
    mockRouteParams = { itemId: 'i1' };
    const adminAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'Admin' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: adminAuth,
      inventory: { ...baseInventoryState, items: [mockItem] },
    });

    expect(screen.queryByText('Danger Zone')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete item' })).toBeNull();
  });

  it('Delete button is NOT visible when user is Site Manager', () => {
    mockRouteParams = { itemId: 'i3' };
    const siteManagerAuth: AuthState = {
      ...defaultAuthState,
      userRole: { role: 'SiteManager' as const, isActive: true, permissions: [] },
    };
    renderWithStore(<ItemDetailScreen />, {
      auth: siteManagerAuth,
      inventory: { ...baseInventoryState, items: [mockDeletableItem] },
    });

    expect(screen.queryByText('Danger Zone')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete item' })).toBeNull();
  });
});
