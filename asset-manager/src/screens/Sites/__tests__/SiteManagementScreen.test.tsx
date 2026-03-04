import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SiteManagementScreen } from '../SiteManagementScreen';
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

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubscribe = jest.fn();
let mockSitesToReturn: Site[] | null = null;
const defer = (fn: () => void) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    setTimeout(fn, 0);
  }
};
jest.mock('../../../services/firebase/siteService', () => ({
  subscribeToSites: jest.fn((callback: (sites: Site[]) => void) => {
    if (mockSitesToReturn !== null) {
      const sites = mockSitesToReturn;
      defer(() => {
        const { act } = require('@testing-library/react-native');
        act(() => {
          callback(sites);
        });
      });
    }
    return mockUnsubscribe;
  }),
}));

let mockFetchSitesResult: Site[] | 'reject' | 'pending' = [];
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
    fetchSites: createAsyncThunk('sites/fetchSites', async (_, { rejectWithValue }) => {
      await Promise.resolve(); // Defer to next microtask so resolution happens inside act
      if (mockFetchSitesResult === 'reject') {
        return rejectWithValue('Failed to load sites');
      }
      if (mockFetchSitesResult === 'pending') {
        await new Promise(() => {});
      }
      return mockFetchSitesResult as Site[];
    }),
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
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}

/** Renders and flushes async updates (fetchSites, subscribeToSites) inside act to avoid act warnings. */
async function renderWithStoreAndFlush(
  ui: React.ReactElement,
  preloadedState: Partial<RootState> = {}
) {
  const result = renderWithStore(ui, preloadedState);
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  return result;
}

const mockActiveSite: Site = {
  id: 'site-1',
  name: 'Site A',
  address: '123 Main St',
  status: 'active',
  managerId: 'm1',
  managerName: 'Manager One',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const mockInactiveSite: Site = {
  id: 'site-2',
  name: 'Site B',
  address: '456 Oak Ave',
  status: 'inactive',
  managerId: null,
  managerName: null,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const defaultSitesState = {
  sites: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  validationLoading: false,
  lastValidationAt: null,
};

describe('SiteManagementScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUnsubscribe.mockClear();
    mockSitesToReturn = [];
    mockFetchSitesResult = [];
  });

  it('renders Site Management header', async () => {
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    expect(screen.getByText('Site Management')).toBeTruthy();
  });

  it('renders Add new site button in header', async () => {
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    expect(screen.getAllByRole('button', { name: 'Add new site' }).length).toBeGreaterThan(0);
  });

  it('navigates to AddSite when Add button pressed', async () => {
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    fireEvent.press(screen.getAllByRole('button', { name: 'Add new site' })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('AddSite');
  });

  it('shows empty state when no sites', async () => {
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    expect(screen.getByText('No Sites Found')).toBeTruthy();
    expect(screen.getByText('Get started by creating your first site.')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Add new site' }).length).toBeGreaterThan(0);
  });

  it('shows search-adjusted message when no sites match search', async () => {
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: {
        ...defaultSitesState,
        searchQuery: 'nonexistent',
      },
    });

    expect(screen.getByText('No Sites Found')).toBeTruthy();
    expect(screen.getByText('No sites match your search. Try a different search term.')).toBeTruthy();
  });

  it('renders search input', async () => {
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    expect(screen.getByRole('search', { name: 'Search sites' })).toBeTruthy();
  });

  it('dispatches setSearchQuery when search input changes', async () => {
    const { store } = await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    fireEvent.changeText(screen.getByRole('search', { name: 'Search sites' }), 'Site A');
    expect(store.getState().sites.searchQuery).toBe('Site A');
  });

  it('renders site list when sites exist', async () => {
    mockSitesToReturn = null;
    mockFetchSitesResult = [mockActiveSite];
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    await waitFor(() => {
      expect(screen.getByText('Site A')).toBeTruthy();
      expect(screen.getByText('ACTIVE SITES (1)')).toBeTruthy();
    });
  });

  it('renders active and inactive sections', async () => {
    mockSitesToReturn = null;
    mockFetchSitesResult = [mockActiveSite, mockInactiveSite];
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    await waitFor(() => {
      expect(screen.getByText('Site A')).toBeTruthy();
      expect(screen.getByText('Site B')).toBeTruthy();
      expect(screen.getByText('ACTIVE SITES (1)')).toBeTruthy();
      expect(screen.getByText('INACTIVE SITES (1)')).toBeTruthy();
    });
  });

  it('navigates to EditSite when site card pressed', async () => {
    mockSitesToReturn = null;
    mockFetchSitesResult = [mockActiveSite];
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    await waitFor(() => {
      expect(screen.getByText('Site A')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Site A'));
    expect(mockNavigate).toHaveBeenCalledWith('EditSite', { siteId: 'site-1' });
  });

  it('shows error state when fetchSites rejects', async () => {
    mockFetchSitesResult = 'reject';
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeTruthy();
      expect(screen.getByText('Failed to load sites')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Retry loading sites' })).toBeTruthy();
    });
  });

  it('shows loading state when fetchSites is pending', async () => {
    mockFetchSitesResult = 'pending';
    mockSitesToReturn = null;
    await renderWithStoreAndFlush(<SiteManagementScreen />, {
      sites: defaultSitesState,
    });

    await waitFor(() => {
      expect(screen.getByText('Loading sites...')).toBeTruthy();
    });
  });
});
