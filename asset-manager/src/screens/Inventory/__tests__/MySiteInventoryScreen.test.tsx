jest.mock('firebase/auth', () => ({ User: function User() {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
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
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MySiteInventoryScreen } from '../MySiteInventoryScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Site } from '../../../types/sites';
import type { Item, InventoryEntry } from '../../../types/inventory';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const cleanup = cb();
    return () => { if (typeof cleanup === 'function') cleanup(); };
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubscribe = jest.fn();
let mockSitesToReturn: Site[] | null = null;
jest.mock('../../../services/firebase/siteService', () => ({
  subscribeToSites: jest.fn((callback: (sites: Site[]) => void) => {
    if (mockSitesToReturn !== null) {
      callback(mockSitesToReturn);
    }
    return mockUnsubscribe;
  }),
  getSites: jest.fn().mockResolvedValue([]),
  getSite: jest.fn().mockResolvedValue(null),
}));

let mockFetchSitesResult: Site[] | 'reject' | 'pending' = [];
let mockFetchInventoryResult: { locationId: string; inventory: InventoryEntry[] } | 'reject' | 'pending' = { locationId: '', inventory: [] };
const mockUnsubscribeInventory = jest.fn();

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
    fetchSites: createAsyncThunk(
      'sites/fetchSites',
      async (_, { rejectWithValue }) => {
        if (mockFetchSitesResult === 'reject') {
          return rejectWithValue('Failed to fetch sites');
        }
        if (mockFetchSitesResult === 'pending') {
          await new Promise(() => {});
        }
        return (mockFetchSitesResult as Site[]) ?? [];
      }
    ),
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
    fetchInventoryByLocation: createAsyncThunk('inventory/fetchInventoryByLocation', async () => ({ locationId: '', inventory: [] })),
    fetchCategories: createAsyncThunk('inventory/fetchCategories', async () => []),
    createCategory: createAsyncThunk('inventory/createCategory', async () => null),
    updateCategory: createAsyncThunk('inventory/updateCategory', async () => null),
    deleteCategory: createAsyncThunk('inventory/deleteCategory', async () => null),
  };
});
jest.mock('../../../services/firebase/inventoryService', () => ({
  subscribeInventoryByLocation: jest.fn((_locationId: string, callback: (inventory: InventoryEntry[]) => void) => {
    const result = mockFetchInventoryResult;
    if (result !== 'reject' && result !== 'pending' && typeof result === 'object') {
      callback(result.inventory || []);
    } else {
      callback([]);
    }
    return mockUnsubscribeInventory;
  }),
  getInventoryByLocation: jest.fn().mockImplementation(() => {
    const result = mockFetchInventoryResult;
    if (result !== 'reject' && result !== 'pending' && typeof result === 'object') {
      return Promise.resolve(result.inventory || []);
    }
    return Promise.resolve([]);
  }),
}));
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

const USER_ID = 'user-site-manager-1';
const SITE_ID = 'site-1';
const SITE_LOCATION_ID = `site_${SITE_ID}`;

const mockUser = { uid: USER_ID, email: 'manager@test.com', displayName: 'Site Manager' };
const mockRole = { role: 'SiteManager' as const, isActive: true, permissions: [] };

const mockUserSite: Site = {
  id: SITE_ID,
  name: 'Main Construction Site',
  address: '123 Build St',
  status: 'active',
  managerId: USER_ID,
  managerName: 'Site Manager',
  createdAt: null,
  updatedAt: null,
};

const mockOtherSite: Site = {
  id: 'site-2',
  name: 'Other Site',
  address: '456 Other Ave',
  status: 'active',
  managerId: null,
  managerName: null,
  createdAt: null,
  updatedAt: null,
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
  id: 'inv-1',
  itemId: 'item-1',
  itemName: 'Steel Rod 12mm',
  itemSku: 'STL-001',
  locationId: SITE_LOCATION_ID,
  locationType: 'site',
  locationName: 'Main Construction Site',
  quantity: 25,
  updatedAt: '2025-01-01T12:00:00Z',
};

const defaultAuthState = {
  user: mockUser,
  userRole: mockRole,
  isAuthenticated: true,
  isLoading: false,
  isRoleLoading: false,
  authInitialized: false,
  error: null,
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

describe('MySiteInventoryScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockUnsubscribe.mockClear();
    mockUnsubscribeInventory.mockClear();
    mockSitesToReturn = null;
    mockFetchSitesResult = [];
    mockFetchInventoryResult = { locationId: SITE_LOCATION_ID, inventory: [] };
  });

  it('shows loading when sites loading', async () => {
    mockFetchSitesResult = 'pending';
    mockSitesToReturn = null;

    renderWithStore(<MySiteInventoryScreen />, {
      auth: defaultAuthState,
      sites: { sites: [], isLoading: true, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByText('Loading site information...')).toBeTruthy();
    });
    expect(screen.getByLabelText('Loading site information')).toBeTruthy();
  });

  it('shows No Site Assigned when user has no assigned site', async () => {
    mockFetchSitesResult = [mockOtherSite];
    mockSitesToReturn = [mockOtherSite];

    renderWithStore(<MySiteInventoryScreen />, {
      auth: defaultAuthState,
      sites: { sites: [mockOtherSite], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
      inventory: defaultInventoryState,
    });

    await waitFor(() => {
      expect(screen.getByText('No Site Assigned')).toBeTruthy();
    });
    expect(screen.getByText(/You haven't been assigned to a site yet/)).toBeTruthy();
  });

  it('renders inventory when user has assigned site', async () => {
    mockFetchSitesResult = [mockUserSite, mockOtherSite];
    mockSitesToReturn = [mockUserSite, mockOtherSite];
    mockFetchInventoryResult = { locationId: SITE_LOCATION_ID, inventory: [mockInventoryEntry] };

    renderWithStore(<MySiteInventoryScreen />, {
      auth: defaultAuthState,
      sites: { sites: [mockUserSite, mockOtherSite], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
      inventory: {
        ...defaultInventoryState,
        items: [mockItem],
        inventoryByLocation: { [SITE_LOCATION_ID]: [mockInventoryEntry] },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Steel Rod 12mm')).toBeTruthy();
    });
    expect(screen.getByText(/STL-001/)).toBeTruthy();
  });

  it('search filters items', async () => {
    mockFetchSitesResult = [mockUserSite];
    mockSitesToReturn = [mockUserSite];
    mockFetchInventoryResult = { locationId: SITE_LOCATION_ID, inventory: [mockInventoryEntry] };

    renderWithStore(<MySiteInventoryScreen />, {
      auth: defaultAuthState,
      sites: { sites: [mockUserSite], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
      inventory: {
        ...defaultInventoryState,
        items: [mockItem],
        inventoryByLocation: { [SITE_LOCATION_ID]: [mockInventoryEntry] },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Steel Rod 12mm')).toBeTruthy();
    });

    const searchInput = screen.getByLabelText('Search inventory items');
    fireEvent.changeText(searchInput, 'Steel Rod');
    expect(screen.getByText('Steel Rod 12mm')).toBeTruthy();

    fireEvent.changeText(searchInput, 'nonexistent-xyz');
    await waitFor(() => {
      expect(screen.getByText('No Items Found')).toBeTruthy();
    });
  });

  it('View other sites opens modal', async () => {
    mockFetchSitesResult = [mockUserSite, mockOtherSite];
    mockSitesToReturn = [mockUserSite, mockOtherSite];
    mockFetchInventoryResult = { locationId: SITE_LOCATION_ID, inventory: [] };

    renderWithStore(<MySiteInventoryScreen />, {
      auth: defaultAuthState,
      sites: { sites: [mockUserSite, mockOtherSite], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
      inventory: {
        ...defaultInventoryState,
        inventoryByLocation: { [SITE_LOCATION_ID]: [] },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('View Other Sites')).toBeTruthy();
    });

    const viewOtherSitesButtons = screen.getAllByLabelText('View inventory at other sites');
    fireEvent.press(viewOtherSitesButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Other Sites')).toBeTruthy();
    });
    expect(screen.getByText('Other Site')).toBeTruthy();
  });

  it('Back button calls goBack', async () => {
    mockFetchSitesResult = [mockUserSite];
    mockSitesToReturn = [mockUserSite];
    mockFetchInventoryResult = { locationId: SITE_LOCATION_ID, inventory: [] };

    renderWithStore(<MySiteInventoryScreen />, {
      auth: defaultAuthState,
      sites: { sites: [mockUserSite], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
      inventory: {
        ...defaultInventoryState,
        inventoryByLocation: { [SITE_LOCATION_ID]: [] },
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'My Inventory' })).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Selecting a site in modal navigates to OtherSiteInventory', async () => {
    mockFetchSitesResult = [mockUserSite, mockOtherSite];
    mockSitesToReturn = [mockUserSite, mockOtherSite];
    mockFetchInventoryResult = { locationId: SITE_LOCATION_ID, inventory: [] };

    renderWithStore(<MySiteInventoryScreen />, {
      auth: defaultAuthState,
      sites: { sites: [mockUserSite, mockOtherSite], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
      inventory: {
        ...defaultInventoryState,
        inventoryByLocation: { [SITE_LOCATION_ID]: [] },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('View Other Sites')).toBeTruthy();
    });

    const viewOtherSitesButtons = screen.getAllByLabelText('View inventory at other sites');
    fireEvent.press(viewOtherSitesButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Other Sites')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('View inventory for Other Site'));
    expect(mockNavigate).toHaveBeenCalledWith('OtherSiteInventory', { siteId: 'site-2' });
  });
});
