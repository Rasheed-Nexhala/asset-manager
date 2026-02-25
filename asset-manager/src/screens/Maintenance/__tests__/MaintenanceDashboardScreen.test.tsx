import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MaintenanceDashboardScreen } from '../MaintenanceDashboardScreen';
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
let mockRecordsToReturn: Maintenance[] | null = null;
jest.mock('../../../services/firebase/maintenanceService', () => ({
  subscribeToMaintenance: jest.fn((callback: (records: Maintenance[]) => void) => {
    if (mockRecordsToReturn !== null) {
      callback(mockRecordsToReturn);
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

const createMockMaintenance = (overrides: Partial<Maintenance> = {}): Maintenance =>
  ({
    id: 'maint-1',
    itemId: 'item-1',
    itemName: 'Steel Beam A',
    itemSku: 'SB-001',
    quantity: 2,
    issueType: 'physical_damage',
    issueDescription: 'Bent during transport',
    reportedBy: 'u1',
    reportedByName: 'John Doe',
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
    addedBy: 'u1',
    addedByName: 'Store Manager',
    addedAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    sourceRequestId: null,
    sourceReturnDate: null,
    ...overrides,
  }) as Maintenance;

const defaultMaintenanceState = {
  maintenanceRecords: [],
  selectedMaintenance: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: { status: 'all' as const },
};

describe('MaintenanceDashboardScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUnsubscribe.mockClear();
    mockRecordsToReturn = null;
  });

  it('shows loading when loading and no data', () => {
    mockRecordsToReturn = null;
    renderWithStore(<MaintenanceDashboardScreen />, {
      maintenance: {
        ...defaultMaintenanceState,
        maintenanceRecords: [],
        loading: true,
      },
    });

    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.getByLabelText('Loading maintenance records')).toBeTruthy();
  });

  it('renders active tab with maintenance cards when data in store', () => {
    mockRecordsToReturn = null;
    const activeRecord = createMockMaintenance({
      id: 'maint-1',
      itemName: 'Steel Beam A',
      status: 'pending',
    });

    renderWithStore(<MaintenanceDashboardScreen />, {
      maintenance: {
        ...defaultMaintenanceState,
        maintenanceRecords: [activeRecord],
        loading: false,
      },
    });

    expect(screen.getByText('Maintenance')).toBeTruthy();
    expect(screen.getByText('Steel Beam A')).toBeTruthy();
    expect(screen.getByText('Active (1)')).toBeTruthy();
    expect(screen.getByText('History (0)')).toBeTruthy();
    expect(screen.getByLabelText('Maintenance record for Steel Beam A')).toBeTruthy();
  });

  it('switch to history tab shows history records', () => {
    mockRecordsToReturn = null;
    const activeRecord = createMockMaintenance({
      id: 'maint-1',
      itemName: 'Active Item',
      status: 'pending',
    });
    const historyRecord = createMockMaintenance({
      id: 'maint-2',
      itemName: 'Returned Item',
      status: 'returned',
    });

    renderWithStore(<MaintenanceDashboardScreen />, {
      maintenance: {
        ...defaultMaintenanceState,
        maintenanceRecords: [activeRecord, historyRecord],
        loading: false,
      },
    });

    expect(screen.getByText('Active Item')).toBeTruthy();
    expect(screen.getByText('Active (1)')).toBeTruthy();
    expect(screen.getByText('History (1)')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('History tab'));
    expect(screen.getByText('Returned Item')).toBeTruthy();
    expect(screen.queryByText('Active Item')).toBeNull();
  });

  it('add button navigates to AddToMaintenance', () => {
    mockRecordsToReturn = [];
    renderWithStore(<MaintenanceDashboardScreen />, {
      maintenance: defaultMaintenanceState,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));
    expect(mockNavigate).toHaveBeenCalledWith('AddToMaintenance');
  });

  it('card press navigates to MaintenanceDetail with maintenanceId', () => {
    mockRecordsToReturn = null;
    const activeRecord = createMockMaintenance({
      id: 'maint-123',
      itemName: 'Steel Beam A',
      status: 'pending',
    });

    renderWithStore(<MaintenanceDashboardScreen />, {
      maintenance: {
        ...defaultMaintenanceState,
        maintenanceRecords: [activeRecord],
        loading: false,
      },
    });

    fireEvent.press(screen.getByLabelText('Maintenance record for Steel Beam A'));
    expect(mockNavigate).toHaveBeenCalledWith('MaintenanceDetail', {
      maintenanceId: 'maint-123',
    });
  });

  it('pull-to-refresh works', () => {
    mockRecordsToReturn = null;
    const activeRecord = createMockMaintenance({
      id: 'maint-1',
      itemName: 'Steel Beam A',
      status: 'pending',
    });

    renderWithStore(<MaintenanceDashboardScreen />, {
      maintenance: {
        ...defaultMaintenanceState,
        maintenanceRecords: [activeRecord],
        loading: false,
      },
    });

    const list = screen.UNSAFE_getAllByType(
      require('react-native').FlatList
    )[0] as React.ReactElement<{ refreshControl?: React.ReactElement }>;
    const refreshControl = list.props.refreshControl;

    expect(refreshControl).toBeTruthy();
    expect(refreshControl?.props.onRefresh).toBeDefined();

    act(() => {
      refreshControl?.props.onRefresh?.();
    });
  });
});
