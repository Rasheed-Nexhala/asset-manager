/**
 * Login → Dashboard Integration Test
 *
 * Tests that RootNavigator correctly shows the right screen based on auth state:
 * - Auth/Login when not authenticated
 * - Loading when authenticated but role still loading
 * - Main/Dashboard when authenticated and role loaded
 */
jest.mock('firebase/auth', () => ({ User: function User() {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => ({})),
  Timestamp: { now: jest.fn() },
  writeBatch: jest.fn(),
  Unsubscribe: jest.fn(),
}));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
  default: {},
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureStore } from '@reduxjs/toolkit';
import { RootNavigator } from '../../navigation/RootNavigator';
import { WeightViewPreferenceProvider } from '../../hooks/useWeightViewPreference';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import requestsReducer from '../../store/slices/requestsSlice';
import steelMasterReducer from '../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../store/slices/maintenanceSlice';
import activityLogReducer from '../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../store';

jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default
);

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

jest.mock('../../services/firebase/authService', () => ({
  reauthenticateAndUpdatePassword: jest.fn(),
  logPasswordChanged: jest.fn(),
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock('../../services/firebase/userRoleService', () => ({
  getUserRole: jest.fn().mockResolvedValue(null),
  subscribeToUserRole: jest.fn(() => jest.fn()),
  subscribeToAllUsers: jest.fn(() => jest.fn()),
  getAllUsers: jest.fn().mockResolvedValue([]),
  updateUserRole: jest.fn().mockResolvedValue(undefined),
  updateUserActiveStatus: jest.fn().mockResolvedValue(undefined),
  createDefaultUserDocument: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/firebase/siteService', () => ({
  getSite: jest.fn().mockResolvedValue(null),
  subscribeToSites: jest.fn(() => jest.fn()),
  createSite: jest.fn().mockResolvedValue('mock-id'),
  updateSite: jest.fn().mockResolvedValue(undefined),
  findSiteByManagerId: jest.fn().mockResolvedValue(null),
}));

const mockTriggerRefresh = jest.fn();
jest.mock('../../hooks/useDashboardSubscriptions', () => ({
  useDashboardSubscriptions: () => ({
    isInitialLoad: false,
    isRefreshing: false,
    triggerRefresh: mockTriggerRefresh,
  }),
}));

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
    fetchMyRecentActivity: createAsyncThunk('activityLog/fetchMy', async () => []),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    subscribeToMyRecentActivityRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
    unsubscribeFromMyRecentActivity: () => () => {},
  };
});

const mockAdminUser = {
  uid: 'admin-1',
  email: 'admin@example.com',
  displayName: 'Admin User',
};

const mockAdminRole = {
  role: 'Admin' as const,
  isActive: true,
  permissions: ['manage_users', 'approve_requests'],
};

function renderWithProviders(
  ui: React.ReactElement,
  preloadedState: Partial<RootState> = {}
) {
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
        <SafeAreaProvider>
          <WeightViewPreferenceProvider>{ui}</WeightViewPreferenceProvider>
        </SafeAreaProvider>
      </Provider>
    ),
  };
}

describe('LoginToDashboard Integration', () => {
  it('shows Main/Dashboard when isAuthenticated=true and isRoleLoading=false', async () => {
    renderWithProviders(<RootNavigator />, {
      auth: {
        user: mockAdminUser,
        userRole: mockAdminRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
    });

    await waitFor(() => {
      const dashboards = screen.getAllByText('Dashboard');
      expect(dashboards.length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Admin User/)).toBeTruthy();
  });

  it('shows Auth/Login when isAuthenticated=false', async () => {
    renderWithProviders(<RootNavigator />, {
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

    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeTruthy();
    });
    expect(screen.getByText('Enter your email and password to continue.')).toBeTruthy();
  });

  it('shows Loading screen when isAuthenticated=true and isRoleLoading=true', async () => {
    renderWithProviders(<RootNavigator />, {
      auth: {
        user: mockAdminUser,
        userRole: null,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: true,
        authInitialized: false,
        error: null,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeTruthy();
    });
  });
});
