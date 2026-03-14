import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('firebase/auth', () => ({ User: function User() {} }));

jest.mock('../../utils/nonCriticalTask', () => ({
  runNonCriticalTask: jest.fn().mockResolvedValue(undefined),
}));

const mockUnsubSites = jest.fn();
const mockUnsubCategories = jest.fn();
const mockUnsubInventory = jest.fn();

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

jest.mock('../../services/firebase/inventoryService', () => ({
  subscribeInventoryByLocation: jest.fn(() => mockUnsubInventory),
  getInventoryByLocation: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../services/firebase/siteService', () => ({
  subscribeToSites: jest.fn(() => mockUnsubSites),
}));
jest.mock('../../services/firebase/categoryService', () => ({
  subscribeCategories: jest.fn(() => mockUnsubCategories),
}));

import { useDashboardSubscriptions } from '../useDashboardSubscriptions';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import requestsReducer from '../../store/slices/requestsSlice';
import steelMasterReducer from '../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../store/slices/maintenanceSlice';
import activityLogReducer from '../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../store/slices/purchaseOrderSlice';

function createStore() {
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
  });
}

function createWrapper() {
  const store = createStore();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store, children });
  };
}

describe('useDashboardSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isInitialLoad true and does not subscribe when userId is null', () => {
    const { subscribeToSites } = require('../../services/firebase/siteService');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useDashboardSubscriptions({
          userId: null,
          role: 'Admin',
          assignedSiteId: null,
          isVisible: true,
        }),
      { wrapper }
    );

    expect(result.current.isInitialLoad).toBe(true);
    expect(result.current.isRefreshing).toBe(false);

    expect(subscribeToSites).not.toHaveBeenCalled();
  });

  it('returns early when role is null', () => {
    const { subscribeToSites } = require('../../services/firebase/siteService');
    const wrapper = createWrapper();
    renderHook(
      () =>
        useDashboardSubscriptions({
          userId: 'user-1',
          role: null,
          assignedSiteId: null,
          isVisible: true,
        }),
      { wrapper }
    );

    expect(subscribeToSites).not.toHaveBeenCalled();
  });

  it('returns early when isVisible is false', () => {
    const { subscribeToSites } = require('../../services/firebase/siteService');
    const wrapper = createWrapper();
    renderHook(
      () =>
        useDashboardSubscriptions({
          userId: 'user-1',
          role: 'Admin',
          assignedSiteId: null,
          isVisible: false,
        }),
      { wrapper }
    );

    expect(subscribeToSites).not.toHaveBeenCalled();
  });

  it('subscribes for Admin role and sets isInitialLoad false when callback fires', async () => {
    const { subscribeToSites } = require('../../services/firebase/siteService');
    let sitesCallback: ((sites: unknown[]) => void) | null = null;
    subscribeToSites.mockImplementation((cb: (sites: unknown[]) => void) => {
      sitesCallback = cb;
      return mockUnsubSites;
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useDashboardSubscriptions({
          userId: 'user-1',
          role: 'Admin',
          assignedSiteId: null,
          isVisible: true,
        }),
      { wrapper }
    );

    expect(result.current.isInitialLoad).toBe(true);

    await act(async () => {
      sitesCallback?.([]);
      await Promise.resolve();
    });

    expect(result.current.isInitialLoad).toBe(false);
  });

  it('triggerRefresh toggles isRefreshing', async () => {
    jest.useFakeTimers();
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useDashboardSubscriptions({
          userId: 'user-1',
          role: 'Admin',
          assignedSiteId: null,
          isVisible: true,
        }),
      { wrapper }
    );

    act(() => {
      result.current.triggerRefresh();
    });
    expect(result.current.isRefreshing).toBe(true);

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(result.current.isRefreshing).toBe(false);

    jest.useRealTimers();
  });

  it('triggerRefresh re-subscribes to fetch fresh data', () => {
    const { subscribeToSites } = require('../../services/firebase/siteService');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useDashboardSubscriptions({
          userId: 'user-1',
          role: 'Admin',
          assignedSiteId: null,
          isVisible: true,
        }),
      { wrapper }
    );

    expect(subscribeToSites).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.triggerRefresh();
    });

    // Effect re-runs: cleanup unsubscribes, then new subscriptions
    expect(mockUnsubSites).toHaveBeenCalledTimes(1);
    expect(subscribeToSites).toHaveBeenCalledTimes(2);
  });

  it('calls all unsubscribes on unmount for Admin', () => {
    const wrapper = createWrapper();
    const { unmount } = renderHook(
      () =>
        useDashboardSubscriptions({
          userId: 'user-1',
          role: 'Admin',
          assignedSiteId: null,
          isVisible: true,
        }),
      { wrapper }
    );

    unmount();

    expect(mockUnsubSites).toHaveBeenCalledTimes(1);
    expect(mockUnsubCategories).toHaveBeenCalledTimes(1);
  });

  it('subscribes for SiteManager with assignedSiteId', async () => {
    const { subscribeInventoryByLocation } = require('../../services/firebase/inventoryService');
    const wrapper = createWrapper();
    renderHook(
      () =>
        useDashboardSubscriptions({
          userId: 'user-1',
          role: 'SiteManager',
          assignedSiteId: 'site-1',
          isVisible: true,
        }),
      { wrapper }
    );

    expect(subscribeInventoryByLocation).toHaveBeenCalledWith(
      'site_site-1',
      expect.any(Function)
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
