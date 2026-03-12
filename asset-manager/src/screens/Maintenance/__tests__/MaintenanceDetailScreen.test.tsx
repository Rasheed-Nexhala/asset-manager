/**
 * MaintenanceDetailScreen tests
 * Tests loading state, maintenance details render, Return/Write-off navigation, back button.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MaintenanceDetailScreen } from '../MaintenanceDetailScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Maintenance } from '../../../types/maintenance';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { maintenanceId: 'm1' } }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubscribe = jest.fn();
jest.mock('../../../services/firebase/maintenanceService', () => ({
  subscribeToMaintenanceById: jest.fn(() => mockUnsubscribe),
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
  return {
    approvePO: createAsyncThunk('purchaseOrders/approve', async () => null),
    rejectPO: createAsyncThunk('purchaseOrders/reject', async () => null),
    markPOOrdered: createAsyncThunk('purchaseOrders/markOrdered', async () => null),
    createPurchaseOrder: createAsyncThunk('purchaseOrders/create', async () => null),
    updatePurchaseOrder: createAsyncThunk('purchaseOrders/update', async () => null),
    receivePO: createAsyncThunk('purchaseOrders/receive', async () => null),
  };
});

const createMockMaintenance = (overrides: Partial<Maintenance> = {}): Maintenance => ({
  id: 'm1',
  itemId: 'item1',
  itemName: 'Steel Bar',
  itemSku: 'SKU-001',
  quantity: 2,
  issueType: 'physical_damage',
  issueDescription: 'Motor has stopped working',
  reportedBy: 'user1',
  reportedByName: 'Test User',
  photos: [],
  status: 'pending',
  updates: [],
  returnedAt: null,
  returnedQuantity: null,
  repairSummary: null,
  repairCost: null,
  repairedBy: null,
  writtenOffAt: null,
  writeOffReason: null,
  writeOffExplanation: null,
  addedBy: 'user1',
  addedByName: 'Test User',
  addedAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  sourceRequestId: null,
  sourceReturnDate: null,
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

describe('MaintenanceDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading when maintenance not loaded', () => {
    renderWithStore(<MaintenanceDetailScreen />, {
      ...defaultPreloadedState,
      maintenance: {
        maintenanceRecords: [],
        selectedMaintenance: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all' },
      },
    });

    expect(screen.getByText('Loading maintenance record...')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Maintenance Details' })).toBeTruthy();
  });

  it('renders maintenance details when in store (item name, SKU, status)', () => {
    const mockMaintenance = createMockMaintenance();

    renderWithStore(<MaintenanceDetailScreen />, {
      ...defaultPreloadedState,
      maintenance: {
        maintenanceRecords: [mockMaintenance],
        selectedMaintenance: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all' },
      },
    });

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText('SKU: SKU-001')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Item Information')).toBeTruthy();
    expect(screen.getByText('Issue Details')).toBeTruthy();
  });

  it('Return button navigates to ReturnFromMaintenance when status allows', () => {
    const mockMaintenance = createMockMaintenance({ status: 'pending' });

    renderWithStore(<MaintenanceDetailScreen />, {
      ...defaultPreloadedState,
      maintenance: {
        maintenanceRecords: [mockMaintenance],
        selectedMaintenance: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all' },
      },
    });

    const returnButton = screen.getByRole('button', { name: 'Return to inventory' });
    fireEvent.press(returnButton);

    expect(mockNavigate).toHaveBeenCalledWith('ReturnFromMaintenance', { maintenanceId: 'm1' });
  });

  it('Write-off button navigates to WriteOff when status allows', () => {
    const mockMaintenance = createMockMaintenance({ status: 'pending' });

    renderWithStore(<MaintenanceDetailScreen />, {
      ...defaultPreloadedState,
      maintenance: {
        maintenanceRecords: [mockMaintenance],
        selectedMaintenance: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all' },
      },
    });

    const writeOffButton = screen.getByRole('button', { name: 'Write off item' });
    fireEvent.press(writeOffButton);

    expect(mockNavigate).toHaveBeenCalledWith('WriteOff', { maintenanceId: 'm1' });
  });

  it('Back button calls goBack', () => {
    const mockMaintenance = createMockMaintenance();

    renderWithStore(<MaintenanceDetailScreen />, {
      ...defaultPreloadedState,
      maintenance: {
        maintenanceRecords: [mockMaintenance],
        selectedMaintenance: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all' },
      },
    });

    const backButton = screen.getByRole('button', { name: 'Go back' });
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
