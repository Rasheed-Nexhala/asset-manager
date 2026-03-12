import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FlatList } from 'react-native';
import { MyActivityScreen } from '../MyActivityScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { ActivityLog } from '../../../types/activityLog';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

// Firebase mocks (components barrel imports authService, userRoleService, etc.)
jest.mock('firebase/auth', () => ({ User: function User() {} }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({})),
}));
jest.mock('../../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
}));
jest.mock('../../../services/firebase/authService', () => ({
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  sendPasswordResetEmail: jest.fn(),
  updatePassword: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
}));
jest.mock('../../../services/firebase/userRoleService', () => ({
  getUserRole: jest.fn().mockResolvedValue(null),
  subscribeToUserRole: jest.fn(() => jest.fn()),
  subscribeToAllUsers: jest.fn(() => jest.fn()),
  updateUserRole: jest.fn().mockResolvedValue(undefined),
  updateUserActiveStatus: jest.fn().mockResolvedValue(undefined),
  getAllUsers: jest.fn().mockResolvedValue([]),
  setUserRole: jest.fn().mockResolvedValue(undefined),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
    getParent: () => ({ navigate: jest.fn() }),
  }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../store/thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk('auth/signIn', async () => ({ uid: 'mock' })),
    signOutUser: createAsyncThunk('auth/signOut', async () => null),
    signUpUser: createAsyncThunk('auth/signUp', async () => ({ uid: 'mock' })),
    deleteAccountUser: createAsyncThunk('auth/deleteAccount', async () => null),
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
const mockFetchMyActivityPaginated = jest.fn();
jest.mock('../../../store/thunks/activityLogThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  const fetchMyActivityPaginatedThunk = createAsyncThunk(
    'activityLog/fetchMyActivityPaginated',
    async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })
  );
  const wrapped = (userId: string) => {
    mockFetchMyActivityPaginated(userId);
    return fetchMyActivityPaginatedThunk(userId);
  };
  Object.assign(wrapped, fetchMyActivityPaginatedThunk);
  return {
    fetchActivityLogs: createAsyncThunk('activityLog/fetch', async () => ({ logs: [], lastDoc: null })),
    loadMoreActivityLogs: createAsyncThunk('activityLog/loadMore', async () => ({ logs: [], lastDoc: null })),
    fetchMyActivityPaginated: wrapped,
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({ logs: [], lastDoc: null, pageSize: 10 })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
  };
});
jest.mock('../../../store/thunks/purchaseOrderThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    createPurchaseOrder: createAsyncThunk('po/create', async () => null),
    updatePurchaseOrder: createAsyncThunk('po/update', async () => null),
    approvePurchaseOrder: createAsyncThunk('po/approve', async () => null),
    rejectPurchaseOrder: createAsyncThunk('po/reject', async () => null),
    receivePurchaseOrder: createAsyncThunk('po/receive', async () => null),
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

const defaultActivityLogState = {
  logs: [],
  hasMore: true,
  lastDoc: null,
  myRecentActivity: [] as ActivityLog[],
  myActivityTotalCount: null as number | null,
  myActivityLastDoc: null,
  myActivityHasMore: false,
  myActivityLoadingMore: false,
  filters: {
    startDate: null,
    endDate: null,
    userId: null,
    actionCategory: 'all' as const,
    actionType: 'all' as const,
    searchQuery: '',
  },
  loading: false,
  loadingMore: false,
  exportLoading: false,
  myActivityLoading: false,
  error: null,
  errorTimestamp: null,
};

const defaultAuthState = {
  user: null as { uid: string; email?: string; displayName?: string } | null,
  userRole: null,
  isAuthenticated: false,
  isLoading: false,
  isRoleLoading: false,
  authInitialized: false,
  error: null,
};

const createMockLog = (overrides: Partial<ActivityLog> = {}): ActivityLog =>
  ({
    id: 'log-1',
    timestamp: new Date().toISOString(),
    userId: 'u1',
    userName: 'Admin User',
    userRole: 'Admin',
    actionType: 'request_created',
    actionCategory: 'requests',
    targetType: 'request',
    targetId: 'req-1',
    targetDisplay: 'REQ-2025-0045',
    summary: 'Created request',
    details: '',
    changes: [],
    ...overrides,
  }) as ActivityLog;

describe('MyActivityScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchMyActivityPaginated.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows loading when loading and no data', () => {
    renderWithStore(<MyActivityScreen />, {
      auth: {
        ...defaultAuthState,
        user: { uid: 'user-123' },
        isAuthenticated: true,
      },
      activityLog: {
        ...defaultActivityLogState,
        myRecentActivity: [],
        myActivityLoading: true,
      },
    });

    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.getByLabelText('Loading recent activity')).toBeTruthy();
  });

  it('renders activity list when data in store', () => {
    const mockLog = createMockLog({ id: 'log-1', userName: 'Jane Doe', targetDisplay: 'REQ-2025-0099' });

    renderWithStore(<MyActivityScreen />, {
      auth: {
        ...defaultAuthState,
        user: { uid: 'user-123' },
        isAuthenticated: true,
      },
      activityLog: {
        ...defaultActivityLogState,
        myRecentActivity: [mockLog],
        myActivityTotalCount: 1,
        myActivityLoading: false,
      },
    });

    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('REQ-2025-0099')).toBeTruthy();
    expect(screen.getByText('Request Created')).toBeTruthy();
  });

  it('card press opens detail modal', () => {
    const mockLog = createMockLog({ id: 'log-1', summary: 'Created transfer request' });

    renderWithStore(<MyActivityScreen />, {
      auth: {
        ...defaultAuthState,
        user: { uid: 'user-123' },
        isAuthenticated: true,
      },
      activityLog: {
        ...defaultActivityLogState,
        myRecentActivity: [mockLog],
        myActivityTotalCount: 1,
        myActivityLoading: false,
      },
    });

    const card = screen.getByLabelText(/Activity:.*Created transfer request.*Tap for details/);
    fireEvent.press(card);

    expect(screen.getByText('Summary')).toBeTruthy();
    expect(screen.getByText('Created transfer request')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('pull-to-refresh works', () => {
    const mockLog = createMockLog();

    renderWithStore(<MyActivityScreen />, {
      auth: {
        ...defaultAuthState,
        user: { uid: 'user-123' },
        isAuthenticated: true,
      },
      activityLog: {
        ...defaultActivityLogState,
        myRecentActivity: [mockLog],
        myActivityTotalCount: 1,
        myActivityLoading: false,
      },
    });

    const lists = screen.UNSAFE_getAllByType(FlatList);
    const list = lists[0] as React.ReactElement<{ refreshControl?: React.ReactElement }>;
    const refreshControl = list.props.refreshControl;

    expect(refreshControl).toBeTruthy();
    expect(refreshControl?.props.onRefresh).toBeDefined();

    act(() => {
      refreshControl?.props.onRefresh?.();
    });

    expect(mockFetchMyActivityPaginated).toHaveBeenCalledWith('user-123');
  });

  it('fetches activity on mount when userId present', () => {
    renderWithStore(<MyActivityScreen />, {
      auth: {
        ...defaultAuthState,
        user: { uid: 'user-456' },
        isAuthenticated: true,
      },
      activityLog: {
        ...defaultActivityLogState,
        myRecentActivity: [],
        myActivityLoading: false,
      },
    });

    expect(mockFetchMyActivityPaginated).toHaveBeenCalledWith('user-456');
  });

  it('does not fetch when userId is null', () => {
    renderWithStore(<MyActivityScreen />, {
      auth: {
        ...defaultAuthState,
        user: null,
        isAuthenticated: false,
      },
      activityLog: defaultActivityLogState,
    });

    expect(mockFetchMyActivityPaginated).not.toHaveBeenCalled();
  });
});
