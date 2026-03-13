/**
 * OtherSiteInventoryScreen — Read-only view of inventory at another site
 * Tests: loading when site loading, error when site not found, site name and inventory when loaded, back button.
 */
jest.mock('firebase/auth', () => ({ User: function User() {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
}));
jest.mock('../../../../config/firebase', () => ({
  auth: {},
  db: {},
}));
jest.mock('../../../services/firebase/authService', () => ({
  updatePassword: jest.fn().mockResolvedValue(undefined),
  reauthenticateWithPassword: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { OtherSiteInventoryScreen } from '../OtherSiteInventoryScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Item, InventoryEntry } from '../../../types/inventory';
import type { Site } from '../../../types/sites';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack, canGoBack: mockCanGoBack }),
  useRoute: () => ({ params: { siteId: 's1' } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockGetSiteResult: Site | null | 'pending' = null;
jest.mock('../../../services/firebase/siteService', () => ({
  getSite: jest.fn(async (siteId: string) => {
    if (mockGetSiteResult === 'pending') {
      await new Promise(() => {});
    }
    return mockGetSiteResult === 'pending' ? undefined : mockGetSiteResult;
  }),
  subscribeToSites: jest.fn(() => () => {}),
}));

const mockNavigateToCreateSiteTransferRequest = jest.fn();
jest.mock('../../../navigation/navigationUtils', () => ({
  navigateToProcessRequest: jest.fn(),
  navigateToCreateSiteTransferRequest: (...args: unknown[]) =>
    mockNavigateToCreateSiteTransferRequest(...args),
}));

let mockFetchInventoryResult: InventoryEntry[] | 'reject' | 'pending' = [];
let mockFetchItemsResult: Item[] | 'reject' | 'pending' = [];
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
    fetchItems: createAsyncThunk('inventory/fetchItems', async (_, { rejectWithValue }) => {
      if (mockFetchItemsResult === 'reject') {
        return rejectWithValue('Failed to load items');
      }
      if (mockFetchItemsResult === 'pending') {
        await new Promise(() => {});
      }
      return (mockFetchItemsResult as Item[]) ?? [];
    }),
    fetchItemsPaginated: createAsyncThunk('inventory/fetchItemsPaginated', async () => ({ items: [], totalCount: 0, lastDoc: null })),
    loadMoreItems: createAsyncThunk('inventory/loadMoreItems', async () => ({ items: [], lastDoc: null })),
    fetchCategories: createAsyncThunk('inventory/fetchCategories', async () => []),
    fetchItemById: createAsyncThunk('inventory/fetchItemById', async () => null),
    createItem: createAsyncThunk('inventory/createItem', async () => null),
    updateItem: createAsyncThunk('inventory/updateItem', async () => null),
    deleteItem: createAsyncThunk('inventory/deleteItem', async () => null),
    adjustQuantity: createAsyncThunk('inventory/adjustQuantity', async () => null),
    fetchInventoryByLocation: createAsyncThunk('inventory/fetchByLocation', async (_, { rejectWithValue }) => {
      if (mockFetchInventoryResult === 'reject') {
        return rejectWithValue('Failed to load inventory');
      }
      if (mockFetchInventoryResult === 'pending') {
        await new Promise(() => {});
      }
      return (mockFetchInventoryResult as InventoryEntry[]) ?? [];
    }),
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
    fetchMyActivityPaginated: createAsyncThunk('activityLog/fetchMyActivityPaginated', async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })),
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({ logs: [], lastDoc: null, pageSize: 10 })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
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

const mockSite: Site = {
  id: 's1',
  name: 'North Site',
  address: '123 North St',
  contactNumber: '+1234567890',
  managerName: 'John Manager',
  status: 'active',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

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

const mockInventoryEntry: InventoryEntry = {
  id: 'entry-1',
  itemId: 'item-1',
  itemName: 'Steel Rod 12mm',
  itemSku: 'STL-001',
  locationId: 'site_s1',
  locationType: 'site',
  locationName: 'North Site',
  quantity: 10,
  updatedAt: '2025-01-01',
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
  totalCount: null,
  lastDoc: null,
  hasMore: false,
  loadingMore: false,
};

describe('OtherSiteInventoryScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockCanGoBack.mockReturnValue(true);
    mockGetSiteResult = null;
    mockFetchInventoryResult = [];
    mockFetchItemsResult = [];
  });

  it('shows loading when site loading', async () => {
    mockGetSiteResult = 'pending';

    renderWithStore(<OtherSiteInventoryScreen />, {
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByText('Loading site inventory...')).toBeTruthy();
    });
    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.getByLabelText('Loading site inventory')).toBeTruthy();
  });

  it('shows error when site not found', async () => {
    mockGetSiteResult = null;

    renderWithStore(<OtherSiteInventoryScreen />, {
      inventory: { ...defaultInventoryState, loading: false },
    });

    await waitFor(() => {
      expect(screen.getByText('Site not found')).toBeTruthy();
    });
    expect(screen.getByText('Error Loading Data')).toBeTruthy();
  });

  it('renders site name and inventory when loaded', async () => {
    mockGetSiteResult = mockSite;

    const preloadedInventory = {
      ...defaultInventoryState,
      items: [mockItem],
      inventoryByLocation: { site_s1: [mockInventoryEntry] },
      loading: false,
      error: null,
    };

    renderWithStore(<OtherSiteInventoryScreen />, {
      inventory: preloadedInventory,
    });

    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'North Site Inventory' })).toBeTruthy();
    });
    expect(screen.getByText('Steel Rod 12mm')).toBeTruthy();
    expect(screen.getByText('Need these items? Contact Store Incharge to coordinate transfer.')).toBeTruthy();
  });

  it('back button calls goBack', async () => {
    mockGetSiteResult = mockSite;

    const preloadedInventory = {
      ...defaultInventoryState,
      items: [mockItem],
      inventoryByLocation: { site_s1: [mockInventoryEntry] },
      loading: false,
      error: null,
    };

    renderWithStore(<OtherSiteInventoryScreen />, {
      inventory: preloadedInventory,
    });

    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'North Site Inventory' })).toBeTruthy();
    });

    const backButton = screen.getByRole('button', { name: 'Go back' });
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows Request Transfer button and calls navigateToCreateSiteTransferRequest when Site Manager has assigned site', async () => {
    mockGetSiteResult = mockSite;

    const siteManagerUser = {
      uid: 'sm1',
      email: 'sm@test.com',
      displayName: 'Site Manager',
    } as import('firebase/auth').User;

    const mySite: Site = {
      id: 's2',
      name: 'My Site',
      address: '456 South St',
      contactNumber: null,
      managerId: 'sm1',
      managerName: 'Site Manager',
      status: 'active',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    const preloadedInventory = {
      ...defaultInventoryState,
      items: [mockItem],
      inventoryByLocation: { site_s1: [mockInventoryEntry] },
      loading: false,
      error: null,
    };

    renderWithStore(<OtherSiteInventoryScreen />, {
      auth: {
        user: siteManagerUser,
        userRole: { role: 'SiteManager', isActive: true, permissions: [] },
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
        isAuthenticated: true,
      },
      sites: {
        sites: [{ ...mockSite, managerId: 'other' }, mySite],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
      inventory: preloadedInventory,
    });

    await waitFor(() => {
      expect(screen.getByText('Steel Rod 12mm')).toBeTruthy();
    });

    const requestTransferButton = screen.getByText('Request Transfer');
    expect(requestTransferButton).toBeTruthy();

    fireEvent.press(requestTransferButton);

    expect(mockNavigateToCreateSiteTransferRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceSiteId: 's1',
        sourceSiteName: 'North Site',
        destinationSiteId: 's2',
        destinationSiteName: 'My Site',
        preselectedItem: expect.objectContaining({
          itemId: 'item-1',
          itemName: 'Steel Rod 12mm',
          itemSku: 'STL-001',
          availableQty: 10,
        }),
      })
    );
  });

  it('shows site transfer banner when Site Manager has assigned site', async () => {
    mockGetSiteResult = mockSite;

    const siteManagerUser = {
      uid: 'sm1',
      email: 'sm@test.com',
      displayName: 'Site Manager',
    } as import('firebase/auth').User;

    const mySite: Site = {
      id: 's2',
      name: 'My Site',
      address: '456 South St',
      contactNumber: null,
      managerId: 'sm1',
      managerName: 'Site Manager',
      status: 'active',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    const preloadedInventory = {
      ...defaultInventoryState,
      items: [mockItem],
      inventoryByLocation: { site_s1: [mockInventoryEntry] },
      loading: false,
      error: null,
    };

    renderWithStore(<OtherSiteInventoryScreen />, {
      auth: {
        user: siteManagerUser,
        userRole: { role: 'SiteManager', isActive: true, permissions: [] },
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
        isAuthenticated: true,
      },
      sites: {
        sites: [{ ...mockSite, managerId: 'other' }, mySite],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
      inventory: preloadedInventory,
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Tap "Request Transfer" on any item to move it from this site to My Site/)
      ).toBeTruthy();
    });
  });
});
