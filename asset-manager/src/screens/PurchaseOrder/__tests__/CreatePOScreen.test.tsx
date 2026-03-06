/**
 * CreatePOScreen — Create/Edit PO form
 * Tests: render create form, vendor/item selectors, validation, back button.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CreatePOScreen } from '../CreatePOScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Item } from '../../../types/inventory';
import type { Vendor } from '../../../types/vendor';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('../../../utils/poPdfUtils', () => ({
  printPurchaseOrder: jest.fn().mockResolvedValue(undefined),
  buildDraftPOForPrint: jest.fn().mockReturnValue({}),
}));

const mockSubscribeToVendors = jest.fn();
const mockCreateVendor = jest.fn();
const mockGetPOById = jest.fn();

jest.mock('../../../services/firebase/vendorService', () => ({
  subscribeToVendors: (cb: (v: Vendor[]) => void) => {
    mockSubscribeToVendors(cb);
    return () => {};
  },
  createVendor: (...args: unknown[]) => mockCreateVendor(...args),
}));

jest.mock('../../../services/firebase/purchaseOrderService', () => ({
  getPOById: (...args: unknown[]) => mockGetPOById(...args),
}));

let mockCreatePOResolve: (value: string) => void;
let mockUpdatePOResolve: (value: unknown) => void;

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
  return {
    createPO: createAsyncThunk(
      'purchaseOrders/createPO',
      async () =>
        new Promise<string>((resolve) => {
          mockCreatePOResolve = resolve;
        })
    ),
    updatePO: createAsyncThunk(
      'purchaseOrders/updatePO',
      async () =>
        new Promise<unknown>((resolve) => {
          mockUpdatePOResolve = resolve;
        })
    ),
    deletePO: createAsyncThunk('purchaseOrders/deletePO', async () => 'po1'),
    approvePO: createAsyncThunk('purchaseOrders/approve', async () => {}),
    rejectPO: createAsyncThunk('purchaseOrders/reject', async () => {}),
    markPOOrdered: createAsyncThunk('purchaseOrders/markOrdered', async () => {}),
    receivePO: createAsyncThunk('purchaseOrders/receive', async () => {}),
    fetchPurchaseOrdersPaginated: createAsyncThunk('purchaseOrders/fetchPaginated', async () => ({ orders: [], totalCount: 0, lastDoc: null, pageSize: 15 })),
    loadMorePurchaseOrders: createAsyncThunk('purchaseOrders/loadMore', async () => ({ orders: [], lastDoc: null, pageSize: 15 })),
  };
});

const mockVendors: Vendor[] = [
  {
    id: 'v1',
    name: 'ABC Suppliers',
    contactPerson: 'John',
    phone: '+91 9876543210',
    email: 'abc@test.com',
    address: '123 Vendor St',
    category: 'other',
    status: 'active',
  },
];

const mockItems: Item[] = [
  {
    id: 'item1',
    name: 'Steel Bar',
    sku: 'SKU-001',
    categoryId: 'cat1',
    categoryName: 'Steel',
    type: 'non_consumable',
    unit: 'piece',
    minStockLevel: 10,
    status: 'active',
    totalQuantity: 50,
    centralStoreQuantity: 30,
    atSitesQuantity: 15,
    inMaintenanceQuantity: 5,
  } as Item,
];

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
    userRole: null,
    isLoading: false,
    isRoleLoading: false,
    authInitialized: false,
    error: null,
    isAuthenticated: true,
  },
  inventory: {
    items: mockItems,
    categories: [],
    inventoryByLocation: {},
    lowStockItemIds: [],
    filters: null,
    loading: false,
    error: null,
    errorTimestamp: null,
  },
  purchaseOrders: {
    purchaseOrders: [],
    selectedPO: null,
    vendors: mockVendors,
    loading: false,
    error: null,
    filters: { status: 'all' },
  },
};

describe('CreatePOScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
    mockSubscribeToVendors.mockImplementation((cb: (v: Vendor[]) => void) => {
      cb([]);
    });
  });

  it('renders create form when no poId (new PO)', () => {
    renderWithStore(<CreatePOScreen />, defaultPreloadedState);

    expect(screen.getByText('New Purchase Order')).toBeTruthy();
    expect(screen.getByText('VENDOR')).toBeTruthy();
    expect(screen.getByText('ITEMS')).toBeTruthy();
    expect(screen.getByText('SUMMARY')).toBeTruthy();
    expect(screen.getByText('Justification')).toBeTruthy();
    expect(screen.getByText('Save Draft')).toBeTruthy();
    expect(screen.getByText('Submit for Approval')).toBeTruthy();
  });

  it('shows vendor selector and item selector buttons', () => {
    renderWithStore(<CreatePOScreen />, defaultPreloadedState);

    expect(screen.getByText('Select Saved Vendor')).toBeTruthy();
    expect(screen.getByText('Add New')).toBeTruthy();
    expect(screen.getByText('Manage')).toBeTruthy();
    expect(screen.getByText('Add')).toBeTruthy();
  });

  it('validation: submit without vendor shows error', () => {
    renderWithStore(<CreatePOScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByText('Submit for Approval'));

    expect(screen.getByText('Vendor name is required')).toBeTruthy();
    expect(screen.getByText('Contact number is required')).toBeTruthy();
  });

  it('validation: submit without items shows error', () => {
    renderWithStore(<CreatePOScreen />, defaultPreloadedState);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. ABC Building Supplies'), 'Test Vendor');
    fireEvent.changeText(screen.getByPlaceholderText('+91-'), '+91 1234567890');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Cement stock below minimum'), 'Stock low');

    fireEvent.press(screen.getByText('Submit for Approval'));

    expect(screen.getByText('At least one item is required')).toBeTruthy();
  });

  it('back button calls goBack', () => {
    renderWithStore(<CreatePOScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
