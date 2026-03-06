import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('firebase/auth', () => ({ User: function User() {} }));

let mockSignOutShouldReject = false;
jest.mock('../../store/thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk('auth/signIn', async () => ({ uid: 'mock' })),
    signOutUser: createAsyncThunk(
      'auth/signOut',
      async (_, { rejectWithValue }) => {
        if (mockSignOutShouldReject) {
          return rejectWithValue('Network error');
        }
        return null;
      }
    ),
    signUpUser: createAsyncThunk('auth/signUp', async () => ({ uid: 'mock' })),
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

const mockUnsubscribe = jest.fn();
let roleCallback: ((role: unknown) => void) | null = null;

jest.mock('../../services/firebase/userRoleService', () => ({
  subscribeToUserRole: jest.fn((userId: string, callback: (role: unknown) => void) => {
    roleCallback = callback;
    return mockUnsubscribe;
  }),
}));

import { useUserRoleSync } from '../useUserRoleSync';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import requestsReducer from '../../store/slices/requestsSlice';
import steelMasterReducer from '../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../store/slices/maintenanceSlice';
import activityLogReducer from '../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../store';

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

function wrapper({ children }: { children: React.ReactNode }) {
  const store = createStore();
  return React.createElement(Provider, { store }, children);
}

describe('useUserRoleSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    roleCallback = null;
    mockSignOutShouldReject = false;
  });

  it('dispatches setUserRole null and setRoleLoading false when userId is null', async () => {
    const store = createStore();
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    renderHook(() => useUserRoleSync(null), { wrapper: customWrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(store.getState().auth.userRole).toBeNull();
    expect(store.getState().auth.isRoleLoading).toBe(false);
  });

  it('subscribes and dispatches setUserRole when callback fires', async () => {
    const store = createStore();
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    const mockRole = { role: 'Admin' as const, isActive: true, permissions: [] };

    renderHook(() => useUserRoleSync('user-123'), { wrapper: customWrapper });

    await act(async () => {
      roleCallback?.(mockRole);
      await Promise.resolve();
    });

    expect(store.getState().auth.userRole).toEqual(mockRole);
    expect(store.getState().auth.isRoleLoading).toBe(false);
  });

  it('calls unsubscribe on unmount when userId was set', () => {
    const { unmount } = renderHook(() => useUserRoleSync('user-123'), { wrapper });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not call subscribeToUserRole when userId is null', () => {
    const { subscribeToUserRole } = require('../../services/firebase/userRoleService');

    renderHook(() => useUserRoleSync(null), { wrapper });

    expect(subscribeToUserRole).not.toHaveBeenCalled();
  });

  it('dispatches signOutUser when user becomes inactive', async () => {
    const store = createStore({
      auth: {
        user: { uid: 'user-123' } as any,
        userRole: { role: 'SiteManager', isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
    });
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    renderHook(() => useUserRoleSync('user-123'), { wrapper: customWrapper });

    await act(async () => {
      roleCallback?.({ role: 'SiteManager', isActive: false, permissions: [] });
      await Promise.resolve();
      await Promise.resolve();
    });

    // signOutUser thunk was dispatched; mock resolves to null and clears auth
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.user).toBeNull();
  });

  it('clears user and sets error when signOutUser fails after retry', async () => {
    mockSignOutShouldReject = true;
    const store = createStore({
      auth: {
        user: { uid: 'user-123' } as any,
        userRole: { role: 'SiteManager', isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
    });
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    renderHook(() => useUserRoleSync('user-123'), { wrapper: customWrapper });

    await act(async () => {
      roleCallback?.({ role: 'SiteManager', isActive: false, permissions: [] });
      // Allow performAutoLogout to run (try, retry, then setUser + setError)
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.error).toBe(
      'Something went wrong during sign out. Please try again.'
    );
  });
});
