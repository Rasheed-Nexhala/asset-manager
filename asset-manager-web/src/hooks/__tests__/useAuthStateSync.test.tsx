import React from 'react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

/** inventorySlice imports inventoryService → firebase; spread real firebase/auth so initializeAuth exists */
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return {
    ...actual,
    User: class User {},
  };
});

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
    cleanupManagerAssignments: createAsyncThunk('managerValidation/cleanup', async () => ({
      sitesUpdated: 0,
      managerId: 'm1',
    })),
    validateAllManagerAssignments: createAsyncThunk('managerValidation/validateAll', async () => ({
      sitesUpdated: 0,
      managersCleaned: [],
    })),
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
vi.mock('../../store/thunks/requestThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchRequestsPaginated: createAsyncThunk('requests/fetchPaginated', async () => ({
      requests: [],
      totalCount: 0,
      lastDoc: null,
    })),
    loadMoreRequests: createAsyncThunk('requests/loadMore', async () => ({ requests: [], lastDoc: null })),
    fetchMyRequestsPaginated: createAsyncThunk('requests/fetchMyPaginated', async () => ({
      requests: [],
      totalCount: 0,
      lastDoc: null,
    })),
    loadMoreMyRequests: createAsyncThunk('requests/loadMoreMy', async () => ({ requests: [], lastDoc: null })),
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
    fetchActivityLogs: createAsyncThunk('activityLog/fetchLogs', async () => ({
      logs: [],
      lastDoc: null,
      totalCount: 0,
      pageSize: 10,
    })),
    loadMoreActivityLogs: createAsyncThunk('activityLog/loadMore', async () => ({
      logs: [],
      lastDoc: null,
      pageSize: 10,
    })),
    fetchMyActivityPaginated: createAsyncThunk('activityLog/fetchMyActivityPaginated', async () => ({
      logs: [],
      totalCount: 0,
      lastDoc: null,
      pageSize: 10,
    })),
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({
      logs: [],
      lastDoc: null,
      pageSize: 10,
    })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => {},
    unsubscribeFromActivityLogs: () => {},
  };
});

const mockUnsubscribe = vi.fn();
let authCallback: ((user: unknown) => void) | null = null;

vi.mock('../../services/firebase/authService', () => ({
  subscribeToAuthState: vi.fn((callback: (user: unknown) => void) => {
    authCallback = callback;
    return mockUnsubscribe;
  }),
  signOutOnly: vi.fn().mockResolvedValue(undefined),
  INACTIVE_ACCOUNT_MESSAGE: 'Your account is deactivated, please contact admin.',
}));

vi.mock('../../services/firebase/userRoleService', () => ({
  getUserRole: vi.fn().mockResolvedValue({ role: 'Admin', isActive: true, permissions: [] }),
}));

import { useAuthStateSync } from '../useAuthStateSync';
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

function wrapper({ children }: { children: React.ReactNode }) {
  const store = createStore();
  return React.createElement(Provider, { store }, children);
}

describe('useAuthStateSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const { getUserRole } = await import('../../services/firebase/userRoleService');
    vi.mocked(getUserRole).mockResolvedValueOnce({
      role: 'Admin',
      isActive: false,
      permissions: [],
    });

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
    const { getUserRole } = await import('../../services/firebase/userRoleService');

    let resolveGetUserRole!: (value: unknown) => void;
    vi.mocked(getUserRole).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGetUserRole = resolve;
      })
    );

    const store = createStore();
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children);

    const { unmount } = renderHook(() => useAuthStateSync(), { wrapper: customWrapper });

    const mockUser = { uid: 'user-123', email: 'test@example.com' };

    act(() => {
      authCallback?.(mockUser);
    });

    unmount();

    await act(async () => {
      resolveGetUserRole({ role: 'Admin', isActive: true, permissions: [] });
      await Promise.resolve();
    });

    expect(store.getState().auth.user).toBeNull();
  });
});
