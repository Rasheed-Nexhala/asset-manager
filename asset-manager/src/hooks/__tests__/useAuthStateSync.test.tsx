import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('firebase/auth', () => ({ User: function User() {} }));

jest.mock('../../store/thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk('auth/signIn', async () => ({ uid: 'mock' })),
    signOutUser: createAsyncThunk('auth/signOut', async () => null),
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
jest.mock('../../store/thunks/purchaseOrderThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchPurchaseOrders: createAsyncThunk('po/fetch', async () => []),
    fetchVendors: createAsyncThunk('po/fetchVendors', async () => []),
    createPurchaseOrder: createAsyncThunk('po/create', async () => null),
    updatePurchaseOrder: createAsyncThunk('po/update', async () => null),
    approvePurchaseOrder: createAsyncThunk('po/approve', async () => null),
    rejectPurchaseOrder: createAsyncThunk('po/reject', async () => null),
  };
});

import { useAuthStateSync } from '../useAuthStateSync';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import requestsReducer from '../../store/slices/requestsSlice';
import steelMasterReducer from '../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../store/slices/maintenanceSlice';
import activityLogReducer from '../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../store';

jest.mock('firebase/auth', () => ({ User: function User() {} }));

const mockUnsubscribe = jest.fn();
let authCallback: ((user: unknown) => void) | null = null;

jest.mock('../../services/firebase/authService', () => ({
  subscribeToAuthState: jest.fn((callback: (user: unknown) => void) => {
    authCallback = callback;
    return mockUnsubscribe;
  }),
  signOutOnly: jest.fn().mockResolvedValue(undefined),
  INACTIVE_ACCOUNT_MESSAGE: 'Your account is deactivated, please contact admin.',
}));

jest.mock('../../services/firebase/userRoleService', () => ({
  getUserRole: jest.fn().mockResolvedValue({ role: 'Admin', isActive: true, permissions: [] }),
}));

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

describe('useAuthStateSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authCallback = null;
  });

  it('dispatches setUser when auth callback fires with active user', async () => {
    const store = createStore();
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    renderHook(() => useAuthStateSync(), { wrapper: customWrapper });

    const mockUser = { uid: 'user-123', email: 'test@example.com' };

    await act(async () => {
      await authCallback?.(mockUser);
    });

    expect(store.getState().auth.user).toEqual(mockUser);
  });

  it('dispatches setUser null and setError when auth callback fires with inactive user', async () => {
    const { getUserRole } = require('../../services/firebase/userRoleService');
    (getUserRole as jest.Mock).mockResolvedValueOnce({ role: 'Admin', isActive: false, permissions: [] });

    const store = createStore();
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    renderHook(() => useAuthStateSync(), { wrapper: customWrapper });

    const mockUser = { uid: 'user-123', email: 'test@example.com' };

    await act(async () => {
      await authCallback?.(mockUser);
    });

    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.error).toBe('Your account is deactivated, please contact admin.');
  });

  it('dispatches setUser null when auth callback fires with null', async () => {
    const store = createStore({
      auth: {
        user: { uid: 'old', email: 'old@test.com' } as unknown as import('firebase/auth').User,
        userRole: null,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
    });
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    renderHook(() => useAuthStateSync(), { wrapper: customWrapper });

    await act(async () => {
      await authCallback?.(null);
    });

    expect(store.getState().auth.user).toBeNull();
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useAuthStateSync(), { wrapper });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch setUser after unmount (cancellation guard)', async () => {
    const { getUserRole } = require('../../services/firebase/userRoleService');

    // getUserRole resolves only after we manually trigger it — simulates slow network
    let resolveGetUserRole!: (value: unknown) => void;
    (getUserRole as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGetUserRole = resolve;
      })
    );

    const store = createStore();
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    const { unmount } = renderHook(() => useAuthStateSync(), { wrapper: customWrapper });

    const mockUser = { uid: 'user-123', email: 'test@example.com' };

    // Trigger auth callback — getUserRole is now in-flight
    act(() => {
      authCallback?.(mockUser);
    });

    // Unmount while getUserRole is still pending — sets cancelled = true
    unmount();

    // Now resolve the slow getUserRole — should be ignored due to cancellation
    await act(async () => {
      resolveGetUserRole({ role: 'Admin', isActive: true, permissions: [] });
      await Promise.resolve();
    });

    // State must remain at initial (no setUser dispatched after unmount)
    expect(store.getState().auth.user).toBeNull();
  });
});
