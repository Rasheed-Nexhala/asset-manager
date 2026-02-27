import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MyRequestsScreen } from '../MyRequestsScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Request } from '../../../types/request';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubscribe = jest.fn();
let mockRequestsToReturn: Request[] | null = null;
jest.mock('../../../services/firebase/requestService', () => ({
  requestService: {
    subscribeToRequests: jest.fn((_opts: unknown, callback: (requests: Request[]) => void) => {
      if (mockRequestsToReturn !== null) {
        callback(mockRequestsToReturn);
      }
      return mockUnsubscribe;
    }),
  },
}));

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
    fetchSites: createAsyncThunk('sites/fetchSites', async () => []),
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

const mockSiteManagerUser = {
  uid: 'sm-1',
  email: 'sm@example.com',
  displayName: 'Site Manager',
};

const mockSiteManagerRole = {
  role: 'SiteManager' as const,
  isActive: true,
  permissions: [],
};

const mockSite = {
  id: 'site-1',
  name: 'Site A',
  managerId: 'sm-1',
  status: 'active' as const,
  address: '123 Main St',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    id: 'req-1',
    requestNumber: 'REQ-2025-0001',
    siteId: 'site-1',
    siteName: 'Site A',
    requestedBy: 'sm-1',
    requestedByName: 'Site Manager',
    status: 'pending',
    priority: 'high',
    purpose: 'Construction',
    items: [],
    processedBy: null,
    processedByName: null,
    processedAt: null,
    storeNotes: null,
    rejectionReason: null,
    rejectionComments: null,
    transferredAt: null,
    transferredBy: null,
    transferredByName: null,
    receivedBy: null,
    receivedByName: null,
    returnHistory: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  }) as Request;

describe('MyRequestsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUnsubscribe.mockClear();
    mockRequestsToReturn = [];
  });

  it('renders My Requests header', () => {
    renderWithStore(<MyRequestsScreen />, {
      auth: {
        user: mockSiteManagerUser,
        userRole: mockSiteManagerRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      requests: {
        requests: [],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    expect(screen.getByText('My Requests')).toBeTruthy();
  });

  it('renders all tabs', () => {
    renderWithStore(<MyRequestsScreen />, {
      auth: {
        user: mockSiteManagerUser,
        userRole: mockSiteManagerRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      requests: {
        requests: [],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    expect(screen.getByRole('tab', { name: 'All tab' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Pending tab' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Approved tab' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Rejected tab' })).toBeTruthy();
  });

  it('shows empty state when no requests', () => {
    renderWithStore(<MyRequestsScreen />, {
      auth: {
        user: mockSiteManagerUser,
        userRole: mockSiteManagerRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      sites: {
        sites: [mockSite],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
      requests: {
        requests: [],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    expect(screen.getByText('No Requests Yet')).toBeTruthy();
    expect(screen.getByText('Create your first request to get started.')).toBeTruthy();
  });

  it('shows Create new request button for SiteManager with assigned site', () => {
    renderWithStore(<MyRequestsScreen />, {
      auth: {
        user: mockSiteManagerUser,
        userRole: mockSiteManagerRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      sites: {
        sites: [mockSite],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
      requests: {
        requests: [],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    expect(screen.getAllByRole('button', { name: 'Create new request' }).length).toBeGreaterThan(0);
  });

  it('navigates to CreateRequest when Create button pressed', () => {
    renderWithStore(<MyRequestsScreen />, {
      auth: {
        user: mockSiteManagerUser,
        userRole: mockSiteManagerRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      sites: {
        sites: [mockSite],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
      requests: {
        requests: [],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    const createButtons = screen.getAllByRole('button', { name: 'Create new request' });
    fireEvent.press(createButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('CreateRequest', { siteId: 'site-1' });
  });

  it('shows loading state when loading and no requests', () => {
    mockRequestsToReturn = null;
    renderWithStore(<MyRequestsScreen />, {
      auth: {
        user: mockSiteManagerUser,
        userRole: mockSiteManagerRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      requests: {
        requests: [],
        myRequests: [],
        selectedRequest: null,
        loading: true,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    expect(screen.getByText('Loading your requests...')).toBeTruthy();
  });

  it('renders request list when requests exist', () => {
    mockRequestsToReturn = null;
    const mockRequest = createMockRequest();

    renderWithStore(<MyRequestsScreen />, {
      auth: {
        user: mockSiteManagerUser,
        userRole: mockSiteManagerRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      requests: {
        requests: [],
        myRequests: [mockRequest],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    expect(screen.getByText('REQ-2025-0001')).toBeTruthy();
  });

  it('switches tab when tab pressed', () => {
    renderWithStore(<MyRequestsScreen />, {
      auth: {
        user: mockSiteManagerUser,
        userRole: mockSiteManagerRole,
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
      requests: {
        requests: [],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    fireEvent.press(screen.getByRole('tab', { name: 'Pending tab' }));
    expect(screen.getByRole('tab', { name: 'Pending tab' })).toBeTruthy();
  });
});
