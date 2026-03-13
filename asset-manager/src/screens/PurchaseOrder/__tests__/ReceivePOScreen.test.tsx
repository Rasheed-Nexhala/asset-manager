/**
 * Receive PO flow
 * Tests loading, error, form render, submit receivePO, back button.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ReceivePOScreen } from '../ReceivePOScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { PurchaseOrder } from '../../../types/purchaseOrder';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: { poId: 'po1' } }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../utils/poPdfUtils', () => ({
  printPurchaseOrder: jest.fn().mockResolvedValue(undefined),
}));

let mockGetPOByIdResolve: (po: PurchaseOrder | null) => void;
let mockReceivePOResolve: () => void;

jest.mock('../../../services/firebase/purchaseOrderService', () => ({
  getPOById: jest.fn(() =>
    new Promise<PurchaseOrder | null>((resolve) => {
      mockGetPOByIdResolve = resolve;
    })
  ),
  subscribeToPurchaseOrders: jest.fn(() => () => {}),
}));

jest.mock('../../../services/firebase/storageService', () => ({
  uploadPOInvoice: jest.fn().mockResolvedValue({
    url: 'https://example.com/invoice.jpg',
    fileName: 'invoice.jpg',
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://test.jpg', fileName: 'invoice.jpg' }],
  }),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: 'DateTimePicker',
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
    fetchMyActivityPaginated: createAsyncThunk('activityLog/fetchMyActivityPaginated', async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })),
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({ logs: [], lastDoc: null, pageSize: 10 })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
  };
});
jest.mock('../../../store/thunks/purchaseOrderThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  const receivePOThunk = createAsyncThunk(
    'purchaseOrders/receive',
    async () =>
      new Promise<unknown>((resolve) => {
        mockReceivePOResolve = resolve as () => void;
      })
  );
  return {
    approvePO: createAsyncThunk('purchaseOrders/approve', async () => null),
    rejectPO: createAsyncThunk('purchaseOrders/reject', async () => null),
    markPOOrdered: createAsyncThunk('purchaseOrders/markOrdered', async () => null),
    createPurchaseOrder: createAsyncThunk('purchaseOrders/create', async () => null),
    updatePurchaseOrder: createAsyncThunk('purchaseOrders/update', async () => null),
    receivePO: receivePOThunk,
  };
});

const createMockPO = (overrides: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  id: 'po1',
  poNumber: 'PO-2024-001',
  vendorId: 'v1',
  vendorName: 'ABC Suppliers',
  vendorContact: '+91 9876543210',
  items: [
    {
      itemId: 'item1',
      itemName: 'Steel Bar',
      itemSku: 'SKU-001',
      isExistingItem: true,
      quantity: 10,
      unitPrice: 500,
      amount: 5000,
      gstPercentage: 18,
      receivedQuantity: null,
    },
  ],
  subtotal: 5000,
  gstPercentage: 18,
  gstAmount: 900,
  totalAmount: 5900,
  justification: 'Site requirement',
  expectedDeliveryDate: null,
  documents: [],
  status: 'approved',
  createdBy: 'u1',
  createdByName: 'Store User',
  createdAt: '2024-01-15T10:00:00Z',
  reviewedBy: null,
  reviewedByName: null,
  reviewedAt: null,
  adminComments: null,
  rejectionReason: null,
  receivedAt: null,
  receivedBy: null,
  receivedByName: null,
  receivedNotes: null,
  updatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
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

describe('ReceivePOScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
  });

  it('shows loading state initially', () => {
    renderWithStore(<ReceivePOScreen />, defaultPreloadedState);

    expect(screen.getByText('Loading purchase order...')).toBeTruthy();
  });

  it('shows error when getPOById returns null', async () => {
    renderWithStore(<ReceivePOScreen />, defaultPreloadedState);

    mockGetPOByIdResolve!(null);

    await waitFor(() => {
      expect(screen.getByText('Could not load purchase order')).toBeTruthy();
      expect(screen.getByText('Purchase order not found')).toBeTruthy();
    });

    expect(screen.getByText('Go Back')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('renders form with PO items when PO loads', async () => {
    renderWithStore(<ReceivePOScreen />, defaultPreloadedState);

    mockGetPOByIdResolve!(createMockPO());

    await waitFor(() => {
      expect(screen.getByText(/Receive PO-2024-001/)).toBeTruthy();
    });

    expect(screen.getByText('ABC Suppliers')).toBeTruthy();
    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText('ITEMS TO RECEIVE')).toBeTruthy();
    expect(screen.getByText(/Partial or excess delivery is allowed/)).toBeTruthy();
    expect(screen.getByText(/Invoice\/Bill/)).toBeTruthy();
    expect(screen.getByText('Received Date')).toBeTruthy();
    expect(screen.getByText('Notes (Optional)')).toBeTruthy();
    expect(screen.getByText('CONFIRM & UPDATE INVENTORY')).toBeTruthy();
  });

  it('submit dispatches receivePO thunk and shows success Alert', async () => {
    renderWithStore(<ReceivePOScreen />, defaultPreloadedState);

    mockGetPOByIdResolve!(createMockPO());

    await waitFor(() => {
      expect(screen.getByText('Steel Bar')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Upload invoice' }));

    await waitFor(() => {
      expect(screen.getByText('invoice.jpg')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('CONFIRM & UPDATE INVENTORY'));

    mockReceivePOResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Purchase order received. Inventory updated.',
        expect.any(Array)
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('back button calls goBack', async () => {
    renderWithStore(<ReceivePOScreen />, defaultPreloadedState);

    mockGetPOByIdResolve!(createMockPO());

    await waitFor(() => {
      expect(screen.getByText('Steel Bar')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
