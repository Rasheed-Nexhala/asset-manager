/**
 * ProcessRequestScreen — Process/approve request flow
 * Tests loading state, request items display, back button, approve flow.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { ProcessRequestScreen } from '../ProcessRequestScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Request, RequestItem } from '../../../types/request';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
    replace: mockReplace,
    canGoBack: () => true,
  }),
  useRoute: () => ({ params: { requestId: 'req1' } }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockSubscribeCallback: ((request: Request | null) => void) | null = null;
let mockSubscribeOnError: ((error: Error) => void) | null = null;

jest.mock('../../../services/firebase/requestService', () => ({
  requestService: {
    getRequestById: jest.fn(),
    subscribeToRequest: jest.fn(
      (requestId: string, callback: (request: Request | null) => void, onError?: (error: Error) => void) => {
        mockSubscribeCallback = callback;
        mockSubscribeOnError = onError ?? null;
        return () => {
          mockSubscribeCallback = null;
          mockSubscribeOnError = null;
        };
      }
    ),
    subscribeToRequests: jest.fn(() => () => {}),
    checkItemsAvailability: jest.fn().mockResolvedValue([
      { itemId: 'item1', itemName: 'Steel Bar', requested: 5, available: 10, sufficient: true },
    ]),
  },
}));

let mockApproveRequestResolve: () => void;
let mockApproveRequestReject: (err: unknown) => void;

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
jest.mock('../../../store/thunks/requestThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    createRequest: createAsyncThunk('requests/createRequest', async () => null),
    editRequest: createAsyncThunk('requests/editRequest', async () => null),
    rejectRequest: createAsyncThunk('requests/rejectRequest', async () => null),
    processRequest: createAsyncThunk('requests/processRequest', async () => null),
    confirmTransfer: createAsyncThunk('requests/confirmTransfer', async () => null),
    approveRequest: createAsyncThunk(
      'requests/approveRequest',
      async () =>
        new Promise<void>((resolve, reject) => {
          mockApproveRequestResolve = resolve;
          mockApproveRequestReject = reject;
        })
    ),
    returnItems: createAsyncThunk('requests/returnItems', async () => null),
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
    approvePO: createAsyncThunk('purchaseOrders/approve', async () => null),
    rejectPO: createAsyncThunk('purchaseOrders/reject', async () => null),
    markPOOrdered: createAsyncThunk('purchaseOrders/markOrdered', async () => null),
    createPurchaseOrder: createAsyncThunk('purchaseOrders/create', async () => null),
    updatePurchaseOrder: createAsyncThunk('purchaseOrders/update', async () => null),
    receivePO: createAsyncThunk('purchaseOrders/receive', async () => null),
  };
});

const createMockRequestItem = (overrides: Partial<RequestItem> = {}): RequestItem => ({
  itemId: 'item1',
  itemName: 'Steel Bar',
  itemSku: 'SKU-001',
  itemType: 'consumable',
  categoryId: 'cat1',
  categoryName: 'Steel',
  quantityRequested: 5,
  quantityApproved: 0,
  quantityReturned: 0,
  status: 'pending',
  ...overrides,
});

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    id: 'req1',
    requestNumber: 'REQ-2025-0001',
    siteId: 'site1',
    siteName: 'Site A',
    requestedBy: 'u1',
    requestedByName: 'User One',
    status: 'pending',
    priority: 'medium',
    purpose: 'Site work',
    items: [createMockRequestItem()],
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
    returnHistory: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  } as Request);

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
    ...render(
      <Provider store={store}>
        <WeightViewPreferenceProvider>{ui}</WeightViewPreferenceProvider>
      </Provider>
    ),
  };
}

const defaultPreloadedState: Partial<RootState> = {
  auth: {
    user: { uid: 'store1', email: 'store@test.com', displayName: 'Store Incharge' } as import('firebase/auth').User,
    userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
    isLoading: false,
    isRoleLoading: false,
    authInitialized: false,
    error: null,
    isAuthenticated: true,
  },
};

describe('ProcessRequestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeCallback = null;
    mockSubscribeOnError = null;
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
  });

  it('shows loading when request not loaded', () => {
    renderWithStore(<ProcessRequestScreen />, defaultPreloadedState);

    expect(screen.getByText('Loading request...')).toBeTruthy();
  });

  it('renders request items when request in store', async () => {
    const mockRequest = createMockRequest();
    renderWithStore(<ProcessRequestScreen />, {
      ...defaultPreloadedState,
      requests: {
        requests: [mockRequest],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    mockSubscribeCallback?.(mockRequest);

    await waitFor(() => {
      expect(screen.getByText('REQ-2025-0001')).toBeTruthy();
    });

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText('Items')).toBeTruthy();
  });

  it('back button calls goBack', async () => {
    const mockRequest = createMockRequest();
    renderWithStore(<ProcessRequestScreen />, {
      ...defaultPreloadedState,
      requests: {
        requests: [mockRequest],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    mockSubscribeCallback?.(mockRequest);

    await waitFor(() => {
      expect(screen.getByText('Steel Bar')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('approve button dispatches approveRequest when StoreIncharge and all sufficient', async () => {
    const mockRequest = createMockRequest();
    renderWithStore(<ProcessRequestScreen />, {
      ...defaultPreloadedState,
      requests: {
        requests: [mockRequest],
        myRequests: [],
        selectedRequest: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all', priority: 'all', siteId: 'all' },
      },
    });

    mockSubscribeCallback?.(mockRequest);

    await waitFor(() => {
      expect(screen.getByText('Steel Bar')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Approve request' })).toBeTruthy();
    });

    const approveButton = screen.getByRole('button', { name: 'Approve request' });
    expect(approveButton).toBeTruthy();
    fireEvent.press(approveButton);

    mockApproveRequestResolve!();

    await waitFor(() => {
      // No success modal; UI updates via subscription
      expect(Alert.alert).not.toHaveBeenCalledWith('Success', expect.any(String));
    });

    // User stays on ProcessRequest; Confirm Transfer button appears below
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
