import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { VendorManagementScreen } from '../VendorManagementScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Vendor } from '../../../types/vendor';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubscribe = jest.fn();
let mockVendorsToReturn: Vendor[] | null = null;
jest.mock('../../../services/firebase/vendorService', () => ({
  subscribeToVendors: jest.fn((callback: (vendors: Vendor[]) => void) => {
    if (mockVendorsToReturn !== null) {
      callback(mockVendorsToReturn);
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

const createMockVendor = (overrides: Partial<Vendor> = {}): Vendor =>
  ({
    id: 'v1',
    name: 'Steel Suppliers Ltd',
    contactPerson: 'John Doe',
    phone: '9876543210',
    email: 'john@steel.com',
    address: '123 Industrial Ave',
    gstin: '29ABCDE1234F1Z5',
    category: 'Steel',
    poCount: 5,
    lastPoDate: '2025-01-15',
    status: 'active',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-15',
    ...overrides,
  }) as Vendor;

const defaultPurchaseOrderState = {
  purchaseOrders: [],
  vendors: [],
  selectedPO: null,
  loading: false,
  error: null,
  filters: { status: 'all' },
};

describe('VendorManagementScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockUnsubscribe.mockClear();
    mockVendorsToReturn = null;
  });

  it('renders header and add button', () => {
    renderWithStore(<VendorManagementScreen />, {
      purchaseOrders: defaultPurchaseOrderState,
    });

    expect(screen.getByText('Saved Vendors')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });

  it('renders vendor list when vendors in store (preload)', () => {
    mockVendorsToReturn = null;
    const vendor1 = createMockVendor({ id: 'v1', name: 'Steel Suppliers Ltd' });
    const vendor2 = createMockVendor({ id: 'v2', name: 'Hardware Plus' });

    renderWithStore(<VendorManagementScreen />, {
      purchaseOrders: {
        ...defaultPurchaseOrderState,
        vendors: [vendor1, vendor2],
      },
    });

    expect(screen.getByText('Steel Suppliers Ltd')).toBeTruthy();
    expect(screen.getByText('Hardware Plus')).toBeTruthy();
    expect(screen.getByText('Total Vendors: 2')).toBeTruthy();
  });

  it('renders vendor list when subscription callback provides vendors', async () => {
    const vendor1 = createMockVendor({ id: 'v1', name: 'Steel Suppliers Ltd' });
    mockVendorsToReturn = [vendor1];

    renderWithStore(<VendorManagementScreen />, {
      purchaseOrders: defaultPurchaseOrderState,
    });

    await waitFor(() => {
      expect(screen.getByText('Steel Suppliers Ltd')).toBeTruthy();
    });
    expect(screen.getByText('Total Vendors: 1')).toBeTruthy();
  });

  it('search filters vendors', () => {
    mockVendorsToReturn = null;
    const vendor1 = createMockVendor({ id: 'v1', name: 'Steel Suppliers Ltd', category: 'Steel', phone: '9876543210' });
    const vendor2 = createMockVendor({ id: 'v2', name: 'Hardware Plus', category: 'Hardware', phone: '1234567890' });

    renderWithStore(<VendorManagementScreen />, {
      purchaseOrders: {
        ...defaultPurchaseOrderState,
        vendors: [vendor1, vendor2],
      },
    });

    expect(screen.getByText('Steel Suppliers Ltd')).toBeTruthy();
    expect(screen.getByText('Hardware Plus')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Search vendors...'), 'Steel');

    expect(screen.getByText('Steel Suppliers Ltd')).toBeTruthy();
    expect(screen.queryByText('Hardware Plus')).toBeNull();
    expect(screen.getByText('Total Vendors: 1')).toBeTruthy();
  });

  it('Add button navigates to AddVendor with empty params', () => {
    renderWithStore(<VendorManagementScreen />, {
      purchaseOrders: defaultPurchaseOrderState,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(mockNavigate).toHaveBeenCalledWith('AddVendor', {});
  });

  it('Vendor card press navigates to AddVendor with vendorId', () => {
    mockVendorsToReturn = null;
    const vendor = createMockVendor({ id: 'v1', name: 'Steel Suppliers Ltd' });

    renderWithStore(<VendorManagementScreen />, {
      purchaseOrders: {
        ...defaultPurchaseOrderState,
        vendors: [vendor],
      },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Vendor Steel Suppliers Ltd' }));
    expect(mockNavigate).toHaveBeenCalledWith('AddVendor', { vendorId: 'v1' });
  });

  it('Back button calls goBack', () => {
    renderWithStore(<VendorManagementScreen />, {
      purchaseOrders: defaultPurchaseOrderState,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
