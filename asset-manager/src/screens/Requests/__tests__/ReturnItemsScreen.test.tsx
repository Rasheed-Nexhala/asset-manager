/**
 * Level 8 — Return Items flow
 * Tests select items, set quantities/condition, submit return.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { ReturnItemsScreen } from '../ReturnItemsScreen';
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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack, canGoBack: () => true }),
  useRoute: () => ({ params: { requestId: 'req-123' } }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockGetRequestByIdResolve: (r: Request | null) => void;
let mockReturnItemsResolve: () => void;
let mockReturnItemsReject: (err: unknown) => void;

jest.mock('../../../services/firebase/requestService', () => ({
  requestService: {
    getRequestById: jest.fn(() =>
      new Promise<Request | null>((resolve) => {
        mockGetRequestByIdResolve = resolve;
      })
    ),
    subscribeToRequests: jest.fn(() => () => {}),
  },
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
jest.mock('../../../store/thunks/requestThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    createRequest: createAsyncThunk('requests/createRequest', async () => null),
    editRequest: createAsyncThunk('requests/editRequest', async () => null),
    rejectRequest: createAsyncThunk('requests/rejectRequest', async () => null),
    processRequest: createAsyncThunk('requests/processRequest', async () => null),
    confirmTransfer: createAsyncThunk('requests/confirmTransfer', async () => null),
    returnItems: createAsyncThunk(
      'requests/returnItems',
      async () =>
        new Promise<void>((resolve, reject) => {
          mockReturnItemsResolve = resolve;
          mockReturnItemsReject = reject;
        })
    ),
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
  itemType: 'non_consumable',
  categoryId: 'cat1',
  categoryName: 'Steel',
  quantityRequested: 5,
  quantityApproved: 5,
  quantityReturned: 0,
  status: 'transferred',
  ...overrides,
});

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    id: 'req-123',
    requestNumber: 'REQ-2025-0001',
    siteId: 'site1',
    siteName: 'Site A',
    requestedBy: 'u1',
    requestedByName: 'User One',
    status: 'transferred',
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
    user: { uid: 'user1', email: 'user@test.com', displayName: 'Test User' } as import('firebase/auth').User,
    userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
    isLoading: false,
    isRoleLoading: false,
    authInitialized: false,
    error: null,
    isAuthenticated: true,
  },
};

describe('ReturnItemsScreen — Return Items flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
  });

  it('shows loading state initially', () => {
    renderWithStore(<ReturnItemsScreen />, defaultPreloadedState);

    expect(screen.getByText('Loading request...')).toBeTruthy();
  });

  it('shows error and goes back when request status is not transferable', async () => {
    renderWithStore(<ReturnItemsScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(createMockRequest({ status: 'pending' }));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Only transferred or partially returned requests have items that can be returned',
        expect.any(Array)
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows no returnable items when only consumables', async () => {
    renderWithStore(<ReturnItemsScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(
      createMockRequest({
        status: 'transferred',
        items: [createMockRequestItem({ itemType: 'consumable', quantityApproved: 5, quantityReturned: 0 })],
      })
    );

    await waitFor(() => {
      expect(screen.getByText('No Returnable Items')).toBeTruthy();
    });

    expect(screen.getByText(/This request only contains consumable items/)).toBeTruthy();
    expect(screen.getByText('Go Back')).toBeTruthy();
  });

  it('renders items to return when request has non-consumables with remaining qty', async () => {
    renderWithStore(<ReturnItemsScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(createMockRequest());

    await waitFor(() => {
      expect(screen.getByText('Select Items to Return')).toBeTruthy();
    });

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText('Submit Return')).toBeTruthy();
  });

  it('selects item, sets quantity and condition, submits successfully', async () => {
    renderWithStore(<ReturnItemsScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(createMockRequest());

    await waitFor(() => {
      expect(screen.getByText('Steel Bar')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Steel Bar'));

    expect(screen.getByText('Quantity to return')).toBeTruthy();
    expect(screen.getByText('Condition')).toBeTruthy();
    expect(screen.getByText('Good')).toBeTruthy();

    fireEvent.press(screen.getByText('Damaged'));

    fireEvent.press(screen.getByRole('button', { name: 'Submit return' }));

    mockReturnItemsResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Items returned successfully', expect.any(Array));
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows validation error when submitting without selection', async () => {
    renderWithStore(<ReturnItemsScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(createMockRequest());

    await waitFor(() => {
      expect(screen.getByText('Submit Return')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Submit return' }));

    expect(screen.getByText('At least one item must be selected')).toBeTruthy();
  });

  it('shows all items returned when none have remaining qty', async () => {
    renderWithStore(<ReturnItemsScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(
      createMockRequest({
        status: 'partially_returned',
        items: [createMockRequestItem({ quantityApproved: 5, quantityReturned: 5 })],
      })
    );

    await waitFor(() => {
      expect(screen.getByText('All Items Returned')).toBeTruthy();
    });

    expect(screen.getByText(/have been returned to the central store/)).toBeTruthy();
  });
});
