import React from 'react';
import { Text } from 'react-native';

jest.mock('firebase/auth', () => ({ User: function User() {} }));

jest.mock('../../store/thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk('auth/signIn', async () => ({ uid: 'mock' })),
    signOutUser: createAsyncThunk('auth/signOut', async () => null),
    signUpUser: createAsyncThunk('auth/signUp', async () => ({ uid: 'mock' })),
    deleteAccountUser: createAsyncThunk('auth/deleteAccount', async () => null),
  };
});
jest.mock('../../store/thunks/sitesThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSites: createAsyncThunk('sites/fetchSites', async () => []),
    createSite: createAsyncThunk('sites/createSite', async () => null),
    updateSite: createAsyncThunk('sites/updateSite', async () => null),
  };
});
jest.mock('../../store/thunks/managerValidationThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    cleanupManagerAssignments: createAsyncThunk('managerValidation/cleanup', async () => ({ sitesUpdated: 0, managerId: 'm1' })),
    validateAllManagerAssignments: createAsyncThunk('managerValidation/validateAll', async () => ({ sitesUpdated: 0, managersCleaned: [] })),
  };
});
jest.mock('../../store/thunks/inventoryThunks', () => {
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
jest.mock('../../store/thunks/steelMasterThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSteelMasters: createAsyncThunk('steelMaster/fetch', async () => []),
    fetchSteelMasterById: createAsyncThunk('steelMaster/fetchById', async () => null),
    createSteelMaster: createAsyncThunk('steelMaster/create', async () => null),
    updateSteelMaster: createAsyncThunk('steelMaster/update', async () => null),
    deleteSteelMaster: createAsyncThunk('steelMaster/delete', async () => null),
  };
});
jest.mock('../../store/thunks/maintenanceThunks', () => {
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
jest.mock('../../store/thunks/activityLogThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchActivityLogs: createAsyncThunk('activityLog/fetch', async () => ({ logs: [], lastDoc: null })),
    loadMoreActivityLogs: createAsyncThunk('activityLog/loadMore', async () => ({ logs: [], lastDoc: null })),
    fetchMyActivityPaginated: createAsyncThunk('activityLog/fetchMyActivityPaginated', async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })),
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({ logs: [], lastDoc: null, pageSize: 10 })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => {},
    unsubscribeFromActivityLogs: () => {},
  };
});

import { render, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import requestsReducer from '../../store/slices/requestsSlice';
import steelMasterReducer from '../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../store/slices/maintenanceSlice';
import activityLogReducer from '../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../store/slices/purchaseOrderSlice';

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
    },
    preloadedState: preloadedState as Partial<RootState>,
  });
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}
import { useInventoryError } from '../useInventoryError';
import type { RootState } from '../../store';

function TestConsumer({ autoClearMs = 5000 }: { autoClearMs?: number }) {
  const error = useInventoryError(autoClearMs);
  return <Text testID="error-display">{error ?? 'no-error'}</Text>;
}

const basePreloadedState: Partial<RootState> = {
  auth: { user: null, userRole: null, isAuthenticated: false, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
  sites: {
    sites: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    validationLoading: false,
    lastValidationAt: null,
    activeManagedSiteId: null,
  },
  inventory: { items: [], categories: [], inventoryByLocation: {}, lowStockItemIds: [], loading: false, error: null, errorTimestamp: null, filters: null },
  requests: { requests: [], myRequests: [], selectedRequest: null, loading: false, error: null, errorTimestamp: null, filters: { status: 'all', priority: 'all', siteId: 'all' } },
  steelMaster: { steelMasters: [], selectedSteelMaster: null, loading: false, error: null },
  maintenance: { maintenanceRecords: [], selectedMaintenance: null, filters: {}, loading: false, error: null },
  activityLog: { logs: [], hasMore: true, lastDoc: null, myRecentActivity: [], filters: {}, loading: false, loadingMore: false, exportLoading: false, myActivityLoading: false, error: null, errorTimestamp: null },
  purchaseOrders: { purchaseOrders: [], selectedPO: null, vendors: [], loading: false, error: null, filters: { status: 'all' } },
};

describe('useInventoryError', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns error from Redux state', () => {
    const { getByTestId } = renderWithStore(<TestConsumer />, {
      ...basePreloadedState,
      inventory: {
        ...basePreloadedState.inventory!,
        error: 'Fetch failed',
      },
    });
    expect(getByTestId('error-display')).toHaveTextContent('Fetch failed');
  });

  it('returns null when no error', () => {
    const { getByTestId } = renderWithStore(<TestConsumer />, basePreloadedState);
    expect(getByTestId('error-display')).toHaveTextContent('no-error');
  });

  it('dispatches clearError after autoClearMs', () => {
    const { store } = renderWithStore(<TestConsumer autoClearMs={3000} />, {
      ...basePreloadedState,
      inventory: {
        ...basePreloadedState.inventory!,
        error: 'Test error',
      },
    });

    expect(store.getState().inventory.error).toBe('Test error');

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(store.getState().inventory.error).toBeNull();
  });

  it('dispatches clearError on unmount', () => {
    const { store, unmount } = renderWithStore(<TestConsumer />, {
      ...basePreloadedState,
      inventory: {
        ...basePreloadedState.inventory!,
        error: 'Stale error',
      },
    });

    expect(store.getState().inventory.error).toBe('Stale error');

    unmount();

    expect(store.getState().inventory.error).toBeNull();
  });
});
