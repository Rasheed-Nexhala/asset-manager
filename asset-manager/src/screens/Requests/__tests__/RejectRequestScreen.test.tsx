/**
 * Reject Request flow
 * Tests loading state, form render, validation, submit with rejectRequest thunk, success Alert goBack.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { RejectRequestScreen } from '../RejectRequestScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack, canGoBack: () => true }),
  useRoute: () => ({ params: { requestId: 'req1' } }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockGetRequestByIdResolve: (r: { requestNumber: string } | null) => void;
let mockRejectRequestResolve: () => void;
let mockRejectRequestReject: (err: unknown) => void;

jest.mock('../../../services/firebase/requestService', () => ({
  requestService: {
    getRequestById: jest.fn(() =>
      new Promise<{ requestNumber: string } | null>((resolve) => {
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
jest.mock('../../../store/thunks/requestThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    createRequest: createAsyncThunk('requests/createRequest', async () => null),
    editRequest: createAsyncThunk('requests/editRequest', async () => null),
    rejectRequest: createAsyncThunk(
      'requests/rejectRequest',
      async () =>
        new Promise<unknown>((resolve, reject) => {
          mockRejectRequestResolve = resolve;
          mockRejectRequestReject = reject;
        })
    ),
    processRequest: createAsyncThunk('requests/processRequest', async () => null),
    confirmTransfer: createAsyncThunk('requests/confirmTransfer', async () => null),
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

describe('RejectRequestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
  });

  it('shows loading state initially', () => {
    renderWithStore(<RejectRequestScreen />, defaultPreloadedState);

    expect(screen.getByText('Loading request...')).toBeTruthy();
  });

  it('renders form with request number when request loads', async () => {
    renderWithStore(<RejectRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!({ requestNumber: 'REQ-001' });

    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeTruthy();
    });

    expect(screen.getByText('Rejecting request')).toBeTruthy();
    expect(screen.getByText(/Rejection Reason/)).toBeTruthy();
    expect(screen.getByText('Insufficient Stock')).toBeTruthy();
    expect(screen.getByText('Duplicate Request')).toBeTruthy();
    expect(screen.getByText('Items Not Required')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
    expect(screen.getByPlaceholderText('Provide details for the rejection...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeTruthy();
  });

  it('validation: submit without reason shows error', async () => {
    renderWithStore(<RejectRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!({ requestNumber: 'REQ-001' });

    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Confirm rejection' }));

    expect(screen.getByText('Rejection reason is required')).toBeTruthy();
  });

  it('submit with reason only (no comments) dispatches rejectRequest', async () => {
    renderWithStore(<RejectRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!({ requestNumber: 'REQ-001' });

    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Rejection reason: Insufficient Stock'));
    fireEvent.press(screen.getByRole('button', { name: 'Confirm rejection' }));

    mockRejectRequestResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Request rejected', expect.any(Array));
    });
  });

  it('select reason and add comments, submit dispatches rejectRequest', async () => {
    renderWithStore(<RejectRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!({ requestNumber: 'REQ-001' });

    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Rejection reason: Insufficient Stock'));
    fireEvent.changeText(screen.getByPlaceholderText('Provide details for the rejection...'), 'Out of stock');

    fireEvent.press(screen.getByRole('button', { name: 'Confirm rejection' }));

    mockRejectRequestResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Request rejected', expect.any(Array));
    });
  });

  it('success Alert OK calls goBack', async () => {
    renderWithStore(<RejectRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!({ requestNumber: 'REQ-001' });

    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Rejection reason: Duplicate Request'));
    fireEvent.changeText(screen.getByPlaceholderText('Provide details for the rejection...'), 'Duplicate of REQ-002');

    fireEvent.press(screen.getByRole('button', { name: 'Confirm rejection' }));

    mockRejectRequestResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Request rejected', expect.any(Array));
    });

    expect(mockGoBack).toHaveBeenCalled();
  });
});
