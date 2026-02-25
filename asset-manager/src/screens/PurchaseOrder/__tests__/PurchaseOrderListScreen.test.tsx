import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PurchaseOrderListScreen } from '../PurchaseOrderListScreen';
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
let mockPOsToReturn: PurchaseOrder[] | null = null;
let mockPOError: Error | null = null;
jest.mock('../../../services/firebase/purchaseOrderService', () => ({
  subscribeToPurchaseOrders: jest.fn((
    callback: (orders: PurchaseOrder[], error?: Error) => void,
    _statusFilter?: string
  ) => {
    if (mockPOError) {
      callback([], mockPOError);
    } else if (mockPOsToReturn !== null) {
      callback(mockPOsToReturn, undefined);
    }
    return mockUnsubscribe;
  }),
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

const createMockPO = (overrides: Partial<PurchaseOrder> = {}): PurchaseOrder =>
  ({
    id: 'po-1',
    poNumber: 'PO-2025-0001',
    vendorId: 'v1',
    vendorName: 'Steel Suppliers Ltd',
    vendorContact: '1234567890',
    items: [],
    subtotal: 10000,
    gstPercentage: 18,
    gstAmount: 1800,
    totalAmount: 11800,
    justification: 'Construction',
    expectedDeliveryDate: null,
    documents: [],
    status: 'pending_approval',
    createdBy: 'u1',
    createdByName: 'Admin',
    createdAt: '2025-01-01',
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    adminComments: null,
    rejectionReason: null,
    receivedAt: null,
    receivedBy: null,
    receivedByName: null,
    receivedNotes: null,
    updatedAt: '2025-01-01',
    ...overrides,
  }) as PurchaseOrder;

const defaultPOState = {
  purchaseOrders: [],
  vendors: [],
  selectedPO: null,
  loading: false,
  error: null,
  filters: { status: 'all' },
};

describe('PurchaseOrderListScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUnsubscribe.mockClear();
    mockPOsToReturn = [];
    mockPOError = null;
  });

  it('renders Purchase Orders header', () => {
    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: defaultPOState,
    });

    expect(screen.getByText('Purchase Orders')).toBeTruthy();
  });

  it('renders New button in header', () => {
    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: defaultPOState,
    });

    expect(screen.getByRole('button', { name: 'New' })).toBeTruthy();
  });

  it('navigates to CreatePO when New button pressed', () => {
    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: defaultPOState,
    });

    fireEvent.press(screen.getByRole('button', { name: 'New' }));
    expect(mockNavigate).toHaveBeenCalledWith('CreatePO', {});
  });

  it('shows loading state when loading and no orders', () => {
    mockPOsToReturn = null;
    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: {
        ...defaultPOState,
        loading: true,
      },
    });

    expect(screen.getByText('Loading purchase orders...')).toBeTruthy();
  });

  it('shows empty state when no orders', () => {
    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: defaultPOState,
    });

    expect(screen.getByText('No Purchase Orders')).toBeTruthy();
    expect(screen.getByText('Create your first purchase order to get started.')).toBeTruthy();
  });

  it('shows filter-adjusted message when filters applied', () => {
    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: {
        ...defaultPOState,
        filters: { status: 'pending_approval' },
      },
    });

    expect(screen.getByText('No Purchase Orders')).toBeTruthy();
    expect(screen.getByText('Try adjusting your filters to see more orders.')).toBeTruthy();
  });

  it('renders status filter chips', () => {
    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: defaultPOState,
    });

    expect(screen.getByText('Status:')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by all statuses' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by pending approval' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by approved' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter by draft' })).toBeTruthy();
  });

  it('dispatches setFilters when filter chip pressed', () => {
    const { store } = renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: defaultPOState,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Filter by pending approval' }));
    expect(store.getState().purchaseOrders.filters.status).toBe('pending_approval');
  });

  it('renders PO list when orders exist', () => {
    mockPOsToReturn = null;
    const mockPO = createMockPO();

    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: {
        ...defaultPOState,
        purchaseOrders: [mockPO],
      },
    });

    expect(screen.getByText('PO-2025-0001')).toBeTruthy();
    expect(screen.getByText('Steel Suppliers Ltd')).toBeTruthy();
  });

  it('navigates to ApprovePO when pending_approval PO pressed', () => {
    mockPOsToReturn = null;
    const mockPO = createMockPO({ status: 'pending_approval' });

    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: {
        ...defaultPOState,
        purchaseOrders: [mockPO],
      },
    });

    fireEvent.press(screen.getByText('PO-2025-0001'));
    expect(mockNavigate).toHaveBeenCalledWith('ApprovePO', { poId: 'po-1' });
  });

  it('navigates to CreatePO when draft PO pressed', () => {
    mockPOsToReturn = null;
    const mockPO = createMockPO({ status: 'draft' });

    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: {
        ...defaultPOState,
        purchaseOrders: [mockPO],
      },
    });

    fireEvent.press(screen.getByText('PO-2025-0001'));
    expect(mockNavigate).toHaveBeenCalledWith('CreatePO', { poId: 'po-1' });
  });

  it('shows subscription error when subscription fails', async () => {
    mockPOError = new Error('Failed to load purchase orders');

    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: defaultPOState,
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to load purchase orders')).toBeTruthy();
    });
    expect(screen.getByText('Could not load purchase orders')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('shows Create Purchase Order button when empty', () => {
    renderWithStore(<PurchaseOrderListScreen />, {
      purchaseOrders: defaultPOState,
    });

    expect(screen.getByText('Create Purchase Order')).toBeTruthy();
  });
});
