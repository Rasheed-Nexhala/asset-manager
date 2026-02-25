import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ActivityLogScreen } from '../ActivityLogScreen';
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

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

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
  myRecentActivity: [],
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

describe('ActivityLogScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders Activity Log header', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: defaultActivityLogState,
    });

    expect(screen.getByText('Activity Log')).toBeTruthy();
  });

  it('renders Export button in header', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: defaultActivityLogState,
    });

    expect(screen.getByRole('button', { name: 'Export logs as CSV' })).toBeTruthy();
  });

  it('shows export loading state when exportLoading', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        exportLoading: true,
      },
    });

    expect(screen.getByRole('button', { name: /Exporting/ })).toBeTruthy();
  });

  it('shows loading state when loading and no logs', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        loading: true,
      },
    });

    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.getByLabelText('Loading activity logs')).toBeTruthy();
  });

  it('shows empty state when no logs and no filters', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: defaultActivityLogState,
    });

    expect(screen.getByText('No Activity Logs Yet')).toBeTruthy();
    expect(screen.getByText('Activity will appear here as users interact with the system')).toBeTruthy();
  });

  it('shows filter-adjusted empty state when filters applied', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        filters: {
          ...defaultActivityLogState.filters,
          actionCategory: 'requests',
        },
      },
    });

    expect(screen.getByText('No Logs Match Your Filters')).toBeTruthy();
    expect(screen.getByText('Try adjusting your filters to see more results')).toBeTruthy();
  });

  it('renders Open filters button', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: defaultActivityLogState,
    });

    expect(screen.getByRole('button', { name: 'Open filters' })).toBeTruthy();
  });

  it('shows All Logs when no filters applied', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: defaultActivityLogState,
    });

    expect(screen.getByText('All Logs')).toBeTruthy();
  });

  it('shows Filters Applied when filters applied', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        filters: {
          ...defaultActivityLogState.filters,
          actionCategory: 'requests',
        },
      },
    });

    expect(screen.getByText('Filters Applied')).toBeTruthy();
  });

  it('renders Clear filters button when filters applied', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        filters: {
          ...defaultActivityLogState.filters,
          actionCategory: 'requests',
        },
      },
    });

    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeTruthy();
  });

  it('dispatches clearFilters when Clear filters pressed', () => {
    const { store } = renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        filters: {
          ...defaultActivityLogState.filters,
          actionCategory: 'requests',
        },
      },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    expect(store.getState().activityLog.filters.actionCategory).toBe('all');
  });

  it('renders error banner when error present', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        error: 'Failed to load logs',
      },
    });

    expect(screen.getByText('Failed to load logs')).toBeTruthy();
  });

  it('renders log list when logs exist', () => {
    const mockLog = createMockLog();

    renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        logs: [mockLog],
      },
    });

    expect(screen.getByText('Admin User')).toBeTruthy();
    expect(screen.getByText('REQ-2025-0045')).toBeTruthy();
  });

  it('opens filter modal when Open filters pressed', () => {
    renderWithStore(<ActivityLogScreen />, {
      activityLog: defaultActivityLogState,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Open filters' }));
    expect(screen.getByText('Filter Logs')).toBeTruthy();
  });

  it('shows log list with loading more state when loadingMore', () => {
    const mockLog = createMockLog();

    renderWithStore(<ActivityLogScreen />, {
      activityLog: {
        ...defaultActivityLogState,
        logs: [mockLog],
        loadingMore: true,
      },
    });

    expect(screen.getByText('Admin User')).toBeTruthy();
    expect(screen.getByText('Request Created')).toBeTruthy();
  });
});
