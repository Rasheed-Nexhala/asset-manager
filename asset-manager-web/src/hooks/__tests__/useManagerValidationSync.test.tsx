import React from 'react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockCapturedCleanupManagerIds: string[] = [];

vi.mock('../../store/thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk('auth/signIn', async () => ({ uid: 'mock' })),
    signOutUser: createAsyncThunk('auth/signOut', async () => null),
    signUpUser: createAsyncThunk('auth/signUp', async () => ({ uid: 'mock' })),
    deleteAccountUser: createAsyncThunk('auth/deleteAccount', async () => null),
  };
});
vi.mock('../../store/thunks/sitesThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSites: createAsyncThunk('sites/fetchSites', async () => []),
    createSite: createAsyncThunk('sites/createSite', async () => null),
    updateSite: createAsyncThunk('sites/updateSite', async () => null),
  };
});
vi.mock('../../store/thunks/managerValidationThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    cleanupManagerAssignments: createAsyncThunk(
      'managerValidation/cleanup',
      async (managerId: string) => {
        mockCapturedCleanupManagerIds.push(managerId);
        return { sitesUpdated: 0, managerId };
      }
    ),
    validateAllManagerAssignments: createAsyncThunk(
      'managerValidation/validateAll',
      async () => ({ sitesUpdated: 0, managersCleaned: [] })
    ),
  };
});
vi.mock('../../store/thunks/inventoryThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchItems: createAsyncThunk('inventory/fetchItems', async () => []),
    fetchItemsPaginated: createAsyncThunk('inventory/fetchItemsPaginated', async () => ({
      items: [],
      totalCount: 0,
      lastDoc: null,
    })),
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
vi.mock('../../store/thunks/steelMasterThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSteelMasters: createAsyncThunk('steelMaster/fetch', async () => []),
    fetchSteelMasterById: createAsyncThunk('steelMaster/fetchById', async () => null),
    createSteelMaster: createAsyncThunk('steelMaster/create', async () => null),
    updateSteelMaster: createAsyncThunk('steelMaster/update', async () => null),
    deleteSteelMaster: createAsyncThunk('steelMaster/delete', async () => null),
  };
});
vi.mock('../../store/thunks/maintenanceThunks', () => {
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
vi.mock('../../store/thunks/activityLogThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchActivityLogs: createAsyncThunk('activityLog/fetch', async () => ({ logs: [], lastDoc: null })),
    loadMoreActivityLogs: createAsyncThunk('activityLog/loadMore', async () => ({ logs: [], lastDoc: null })),
    fetchMyActivityPaginated: createAsyncThunk(
      'activityLog/fetchMyActivityPaginated',
      async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })
    ),
    loadMoreMyActivity: createAsyncThunk(
      'activityLog/loadMoreMyActivity',
      async () => ({ logs: [], lastDoc: null, pageSize: 10 })
    ),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => {},
    unsubscribeFromActivityLogs: () => {},
  };
});

const mockUnsubscribe = vi.fn();
let usersCallback: ((users: { id: string; role: string; isActive: boolean }[]) => void) | null = null;

vi.mock('../../services/firebase/userRoleService', () => ({
  subscribeToSiteManagers: vi.fn(
    (callback: (users: { id: string; role: string; isActive: boolean }[]) => void) => {
      usersCallback = callback;
      return mockUnsubscribe;
    }
  ),
}));

import { useManagerValidationSync } from '../useManagerValidationSync';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import requestsReducer from '../../store/slices/requestsSlice';
import steelMasterReducer from '../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../store/slices/maintenanceSlice';
import activityLogReducer from '../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../store/slices/purchaseOrderSlice';
import inventoryUpdateRequestReducer from '../../store/slices/inventoryUpdateRequestSlice';
import type { RootState } from '../../store';

const rootReducer = combineReducers({
  auth: authReducer,
  sites: sitesReducer,
  inventory: inventoryReducer,
  requests: requestsReducer,
  steelMaster: steelMasterReducer,
  maintenance: maintenanceReducer,
  activityLog: activityLogReducer,
  purchaseOrders: purchaseOrderReducer,
  inventoryUpdateRequest: inventoryUpdateRequestReducer,
});

function createStore(preloadedState: Partial<RootState> = {}) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as Partial<RootState>,
  });
}

function createWrapper(preloadedState: Partial<RootState> = {}) {
  const store = createStore(preloadedState);
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  };
}

describe('useManagerValidationSync', () => {
  const mockUser = { uid: 'admin-1', email: 'admin@test.com' };
  const adminRole = { role: 'Admin' as const, isActive: true, permissions: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    usersCallback = null;
    mockCapturedCleanupManagerIds.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not subscribe when user is not authenticated', async () => {
    const { subscribeToSiteManagers } = await import('../../services/firebase/userRoleService');
    const wrapper = createWrapper({
      auth: {
        user: null,
        userRole: null,
        isAuthenticated: false,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
    });

    renderHook(() => useManagerValidationSync(), { wrapper });

    expect(subscribeToSiteManagers).not.toHaveBeenCalled();
  });

  it('does not subscribe when user is not admin', async () => {
    const { subscribeToSiteManagers } = await import('../../services/firebase/userRoleService');
    const wrapper = createWrapper({
      auth: {
        user: mockUser as unknown as import('firebase/auth').User,
        userRole: { role: 'SiteManager' as const, isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
    });

    renderHook(() => useManagerValidationSync(), { wrapper });

    expect(subscribeToSiteManagers).not.toHaveBeenCalled();
  });

  it('subscribes when user is authenticated admin with role loaded', async () => {
    const { subscribeToSiteManagers } = await import('../../services/firebase/userRoleService');
    const wrapper = createWrapper({
      auth: {
        user: mockUser as unknown as import('firebase/auth').User,
        userRole: adminRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
    });

    renderHook(() => useManagerValidationSync(), { wrapper });

    expect(subscribeToSiteManagers).toHaveBeenCalledTimes(1);
  });

  it('calls unsubscribe on unmount', () => {
    const wrapper = createWrapper({
      auth: {
        user: mockUser as unknown as import('firebase/auth').User,
        userRole: adminRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
    });

    const { unmount } = renderHook(() => useManagerValidationSync(), { wrapper });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('triggers cleanup when SiteManager is deactivated', async () => {
    vi.useFakeTimers();
    const wrapper = createWrapper({
      auth: {
        user: mockUser as unknown as import('firebase/auth').User,
        userRole: adminRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
    });

    renderHook(() => useManagerValidationSync(), { wrapper });

    await act(async () => {
      usersCallback?.([{ id: 'm1', role: 'SiteManager', isActive: true }]);
      await Promise.resolve();
    });

    await act(async () => {
      usersCallback?.([{ id: 'm1', role: 'SiteManager', isActive: false }]);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    expect(mockCapturedCleanupManagerIds).toContain('m1');
  });
});
