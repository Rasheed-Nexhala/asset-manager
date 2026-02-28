import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DashboardScreen } from '../DashboardScreen';
import authReducer from '../../store/slices/authSlice';
import sitesReducer from '../../store/slices/sitesSlice';
import inventoryReducer from '../../store/slices/inventorySlice';
import requestsReducer from '../../store/slices/requestsSlice';
import steelMasterReducer from '../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../store/slices/maintenanceSlice';
import activityLogReducer from '../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../store';

const mockNavigate = jest.fn();
const mockGetParentNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    getParent: () => ({ getParent: () => ({ navigate: mockGetParentNavigate }), navigate: mockGetParentNavigate }),
  }),
  useIsFocused: () => true,
  useFocusEffect: (cb: () => void | (() => void)) => {
    const cleanup = cb();
    return () => { if (typeof cleanup === 'function') cleanup(); };
  },
}));

jest.mock('../../services/firebase/notificationService', () => ({
  getUnreadCount: jest.fn().mockResolvedValue(0),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetParentNavigate.mockClear();
    mockTriggerRefresh.mockClear();
  });

  it('renders Dashboard header', () => {
    renderWithStore(<DashboardScreen />, {
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

    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders Profile button and navigates on press', () => {
    renderWithStore(<DashboardScreen />, {
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

    fireEvent.press(screen.getByRole('button', { name: 'Profile' }));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
  });

  it('renders Users button for Admin', () => {
    renderWithStore(<DashboardScreen />, {
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

    expect(screen.getByRole('button', { name: 'Users' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Users' }));
    expect(mockNavigate).toHaveBeenCalledWith('Users');
  });

  it('does not render Users button for SiteManager', () => {
    renderWithStore(<DashboardScreen />, {
      auth: {
        user: { uid: 'sm-1', email: 'sm@example.com', displayName: 'Site Manager' },
        userRole: { role: 'SiteManager' as const, isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      sites: {
        sites: [{ id: 'site-1', name: 'Site A', managerId: 'sm-1', status: 'active', address: '', createdAt: '', updatedAt: '' }],
        searchQuery: '',
        selectedSiteId: null,
        isLoading: false,
        error: null,
      },
    });

    expect(screen.queryByRole('button', { name: 'Users' })).toBeNull();
  });

  it('renders DashboardGreeting with user display name', () => {
    renderWithStore(<DashboardScreen />, {
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

    expect(screen.getByText(/Admin User/)).toBeTruthy();
  });

  it('shows activity log error when present', () => {
    renderWithStore(<DashboardScreen />, {
      auth: {
        user: mockAdminUser,
        userRole: mockAdminRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      activityLog: {
        logs: [],
        myRecentActivity: [],
        filters: null,
        loading: false,
        error: 'Activity log failed to load',
        loadMoreLoading: false,
        lastDoc: null,
      },
    });

    expect(screen.getByText('Activity log failed to load')).toBeTruthy();
  });

  it('shows dashboard data error when requests error present', () => {
    renderWithStore(<DashboardScreen />, {
      auth: {
        user: mockAdminUser,
        userRole: mockAdminRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      requests: {
        requests: [],
        myRequests: [],
        filters: null,
        selectedRequestId: null,
        loading: false,
        error: 'Failed to load requests',
      },
    });

    expect(screen.getByText('Some data failed to load')).toBeTruthy();
  });

  it('renders My Recent Activity for unassigned role', () => {
    renderWithStore(<DashboardScreen />, {
      auth: {
        user: mockAdminUser,
        userRole: null,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
    });

    expect(screen.getByRole('button', { name: 'View all activity' })).toBeTruthy();
  });
});
