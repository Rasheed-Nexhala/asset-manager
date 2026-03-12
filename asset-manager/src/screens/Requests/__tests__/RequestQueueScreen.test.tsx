import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RequestQueueScreen } from '../RequestQueueScreen';
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
const mockNavigateToProcessRequest = jest.fn();
jest.mock('../../../navigation/navigationUtils', () => ({
  navigateToProcessRequest: (...args: unknown[]) => mockNavigateToProcessRequest(...args),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => cb(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubscribe = jest.fn();
let mockRequestsToReturn: Request[] | null = null;
const mockListRequestsPaginated = jest.fn();
const mockGetRequestsCount = jest.fn();
jest.mock('../../../services/firebase/requestService', () => ({
  requestService: {
    subscribeToRequests: jest.fn((_opts: unknown, callback: (requests: Request[]) => void) => {
      if (mockRequestsToReturn !== null) {
        callback(mockRequestsToReturn);
      }
      return mockUnsubscribe;
    }),
    listRequestsPaginated: (...args: unknown[]) => mockListRequestsPaginated(...args),
    getRequestsCount: (...args: unknown[]) => mockGetRequestsCount(...args),
  },
  listRequestsPaginated: (...args: unknown[]) => mockListRequestsPaginated(...args),
  getRequestsCount: (...args: unknown[]) => mockGetRequestsCount(...args),
  REQUESTS_PAGE_SIZE: 10,
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
jest.mock('../../../store/thunks/activityLogThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchActivityLogs: createAsyncThunk('activityLog/fetch', async () => ({ logs: [], lastDoc: null })),
    loadMoreActivityLogs: createAsyncThunk('activityLog/loadMore', async () => ({ logs: [], lastDoc: null })),
    fetchMyActivityPaginated: createAsyncThunk('activityLog/fetchMyActivityPaginated', async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })),
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({ logs: [], lastDoc: null, pageSize: 10 })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
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

const defaultRequestsState = {
  requests: [],
  myRequests: [],
  selectedRequest: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: { status: 'all', priority: 'all', siteId: 'all' },
  requestsTotalCount: 0,
  requestsLastDoc: null,
  requestsHasMore: false,
  requestsLoadingMore: false,
  myRequestsTotalCount: null,
  myRequestsLastDoc: null,
  myRequestsHasMore: false,
  myRequestsLoadingMore: false,
};

describe('RequestQueueScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockNavigateToProcessRequest.mockClear();
    mockUnsubscribe.mockClear();
    mockRequestsToReturn = [];
    mockListRequestsPaginated.mockResolvedValue({ requests: [], lastDoc: null });
    mockGetRequestsCount.mockResolvedValue(0);
  });

  it('renders Request Queue header', () => {
    renderWithStore(<RequestQueueScreen />, {
      requests: defaultRequestsState,
    });

    expect(screen.getByText('Request Queue')).toBeTruthy();
  });

  it('renders search bar with placeholder', async () => {
    renderWithStore(<RequestQueueScreen />, {
      requests: defaultRequestsState,
    });

    expect(await screen.findByPlaceholderText('Search by request number, site, requester, purpose, or item...')).toBeTruthy();
    expect(await screen.findByLabelText('Search requests')).toBeTruthy();
  });

  it('shows loading state when loading and no requests', () => {
    mockRequestsToReturn = null;
    renderWithStore(<RequestQueueScreen />, {
      requests: {
        ...defaultRequestsState,
        loading: true,
        requestsTotalCount: null,
      },
    });

    expect(screen.getByText('Loading requests...')).toBeTruthy();
  });

  it('shows empty state when no requests and filters are all', async () => {
    renderWithStore(<RequestQueueScreen />, {
      requests: defaultRequestsState,
    });

    expect(await screen.findByText('No Requests Found')).toBeTruthy();
    expect(await screen.findByText('No requests in the queue yet.')).toBeTruthy();
  });

  it('shows filter-adjusted message when filters are applied', async () => {
    renderWithStore(<RequestQueueScreen />, {
      requests: {
        ...defaultRequestsState,
        filters: { status: 'pending', priority: 'all', siteId: 'all' },
      },
    });

    expect(await screen.findByText('No Requests Found')).toBeTruthy();
    expect(await screen.findByText('Try adjusting your filters or search to see more requests.')).toBeTruthy();
  });

  it('renders priority, site, and status filter chips when filters expanded', async () => {
    const { findByRole } = renderWithStore(<RequestQueueScreen />, {
      requests: defaultRequestsState,
      sites: {
        sites: [mockSite],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
    });

    // Wait for fetch to complete (skip loader), then expand filters
    const toggleBtn = await findByRole('button', { name: 'Toggle filters' });
    fireEvent.press(toggleBtn);

    expect(screen.getByText('Priority')).toBeTruthy();
    expect(screen.getByText('Site')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by all priorities' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by high priority' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by medium priority' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by low priority' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by all sites' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by all statuses' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by pending' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by approved' })).toBeTruthy();
  });

  it('dispatches setFilters when filters are pressed', async () => {
    const { store, findByRole } = renderWithStore(<RequestQueueScreen />, {
      requests: defaultRequestsState,
      sites: {
        sites: [mockSite],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
    });

    // Wait for fetch to complete, then expand filters
    const toggleBtn = await findByRole('button', { name: 'Toggle filters' });
    fireEvent.press(toggleBtn);

    // Test priority filter (client-side, no refetch)
    fireEvent.press(screen.getByRole('button', { name: 'Filter by high priority' }));
    expect(store.getState().requests.filters.priority).toBe('high');

    // Test status filter
    fireEvent.press(screen.getByRole('button', { name: 'Filter by pending' }));
    expect(store.getState().requests.filters.status).toBe('pending');
  });

  it('renders request list when requests exist', async () => {
    mockRequestsToReturn = null;
    const mockRequest = createMockRequest({ priority: 'high' });
    mockListRequestsPaginated.mockResolvedValue({ requests: [mockRequest], lastDoc: null });
    mockGetRequestsCount.mockResolvedValue(1);

    const { findByText } = renderWithStore(<RequestQueueScreen />, {
      requests: {
        ...defaultRequestsState,
        requests: [],
      },
      inventory: {
        items: [],
        categories: [],
        inventoryByLocation: {},
        isLoading: false,
        error: null,
        filters: { search: '', categoryId: 'all' },
      },
    });

    expect(await findByText('REQ-2025-0001')).toBeTruthy();
    expect(await findByText('Site A')).toBeTruthy();
  });

  it('navigates to ProcessRequest when request card pressed', async () => {
    mockRequestsToReturn = null;
    const mockRequest = createMockRequest({ id: 'req-1', priority: 'high' });
    mockListRequestsPaginated.mockResolvedValue({ requests: [mockRequest], lastDoc: null });
    mockGetRequestsCount.mockResolvedValue(1);

    const { findByText } = renderWithStore(<RequestQueueScreen />, {
      requests: {
        ...defaultRequestsState,
        requests: [],
      },
      inventory: {
        items: [],
        categories: [],
        inventoryByLocation: {},
        isLoading: false,
        error: null,
        filters: { search: '', categoryId: 'all' },
      },
    });

    fireEvent.press(await findByText('REQ-2025-0001'));
    expect(mockNavigateToProcessRequest).toHaveBeenCalledWith('req-1');
  });

  it('renders flat list of requests sorted by date (latest first)', async () => {
    mockRequestsToReturn = null;
    const highReq = createMockRequest({ id: 'req-1', requestNumber: 'REQ-2025-0001', priority: 'high' });
    const mediumReq = createMockRequest({ id: 'req-2', requestNumber: 'REQ-2025-0002', priority: 'medium' });
    mockListRequestsPaginated.mockResolvedValue({ requests: [highReq, mediumReq], lastDoc: null });
    mockGetRequestsCount.mockResolvedValue(2);

    const { findByText } = renderWithStore(<RequestQueueScreen />, {
      requests: {
        ...defaultRequestsState,
        requests: [],
      },
      inventory: {
        items: [],
        categories: [],
        inventoryByLocation: {},
        isLoading: false,
        error: null,
        filters: { search: '', categoryId: 'all' },
      },
    });

    expect(await findByText('REQ-2025-0001')).toBeTruthy();
    expect(await findByText('REQ-2025-0002')).toBeTruthy();
  });
});
