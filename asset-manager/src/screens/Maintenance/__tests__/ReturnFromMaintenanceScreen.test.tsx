/**
 * Return from Maintenance flow
 * Tests loading state, form render, quantity increment/decrement,
 * validation (repair summary required, min 10 chars), submit success, goBack on Alert OK.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ReturnFromMaintenanceScreen } from '../ReturnFromMaintenanceScreen';
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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: { maintenanceId: 'm1' } }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockReturnFromMaintenanceResolve: () => void;
let mockReturnFromMaintenanceReject: (err: unknown) => void;

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
    returnFromMaintenanceThunk: createAsyncThunk(
      'maintenance/return',
      async () =>
        new Promise<void>((resolve, reject) => {
          mockReturnFromMaintenanceResolve = resolve;
          mockReturnFromMaintenanceReject = reject;
        })
    ),
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

const mockMaintenance: Maintenance = {
  id: 'm1',
  itemId: 'item1',
  itemName: 'Steel Bar',
  itemSku: 'SKU-001',
  quantity: 5,
  issueType: 'physical_damage',
  issueDescription: 'Motor damaged',
  reportedBy: 'u1',
  reportedByName: 'User One',
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
  addedByName: 'User One',
  addedAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  sourceRequestId: null,
  sourceReturnDate: null,
} as Maintenance;

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

const defaultAuthState = {
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

const stateWithMaintenance: Partial<RootState> = {
  ...defaultAuthState,
  maintenance: {
    maintenanceRecords: [mockMaintenance],
    selectedMaintenance: null,
    loading: false,
    error: null,
    errorTimestamp: null,
    filters: { status: 'all' },
  },
};

const stateWithoutMaintenance: Partial<RootState> = {
  ...defaultAuthState,
  maintenance: {
    maintenanceRecords: [],
    selectedMaintenance: null,
    loading: false,
    error: null,
    errorTimestamp: null,
    filters: { status: 'all' },
  },
};

describe('ReturnFromMaintenanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
  });

  it('shows loading state when maintenance is null', () => {
    renderWithStore(<ReturnFromMaintenanceScreen />, stateWithoutMaintenance);

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('renders form with item info when maintenance is in store', () => {
    renderWithStore(<ReturnFromMaintenanceScreen />, stateWithMaintenance);

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText('SKU: SKU-001')).toBeTruthy();
    expect(screen.getByText('Available Quantity')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Return to inventory' })).toBeTruthy();
  });

  it('increment/decrement quantity buttons work and respect bounds (1 to maintenance.quantity)', () => {
    renderWithStore(<ReturnFromMaintenanceScreen />, stateWithMaintenance);

    const decrementBtn = screen.getByRole('button', { name: 'Decrease quantity' });
    const incrementBtn = screen.getByRole('button', { name: 'Increase quantity' });
    const quantityInput = screen.getByLabelText('Return quantity');

    expect(quantityInput.props.value).toBe('5');

    fireEvent.press(decrementBtn);
    expect(quantityInput.props.value).toBe('4');

    fireEvent.press(decrementBtn);
    fireEvent.press(decrementBtn);
    fireEvent.press(decrementBtn);
    expect(quantityInput.props.value).toBe('1');

    fireEvent.press(decrementBtn);
    expect(quantityInput.props.value).toBe('1');

    fireEvent.press(incrementBtn);
    fireEvent.press(incrementBtn);
    fireEvent.press(incrementBtn);
    fireEvent.press(incrementBtn);
    expect(quantityInput.props.value).toBe('5');

    fireEvent.press(incrementBtn);
    expect(quantityInput.props.value).toBe('5');
  });

  it('validation: submit without repair summary shows error', () => {
    renderWithStore(<ReturnFromMaintenanceScreen />, stateWithMaintenance);

    fireEvent.press(screen.getByRole('button', { name: 'Return to inventory' }));

    expect(screen.getByText('Repair summary is required')).toBeTruthy();
  });

  it('validation: repair summary < 10 chars shows error', () => {
    renderWithStore(<ReturnFromMaintenanceScreen />, stateWithMaintenance);

    fireEvent.changeText(screen.getByLabelText('Repair summary'), 'Short');

    fireEvent.press(screen.getByRole('button', { name: 'Return to inventory' }));

    expect(screen.getByText('Repair summary must be at least 10 characters')).toBeTruthy();
  });

  it('submit with valid data dispatches returnFromMaintenanceThunk and shows success Alert', async () => {
    renderWithStore(<ReturnFromMaintenanceScreen />, stateWithMaintenance);

    fireEvent.changeText(screen.getByLabelText('Repair summary'), 'Motor was repaired and tested successfully');

    fireEvent.press(screen.getByRole('button', { name: 'Return to inventory' }));

    mockReturnFromMaintenanceResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        '5 items returned to inventory successfully',
        expect.any(Array)
      );
    });
  });

  it('success Alert OK calls navigation.goBack', async () => {
    renderWithStore(<ReturnFromMaintenanceScreen />, stateWithMaintenance);

    fireEvent.changeText(screen.getByLabelText('Repair summary'), 'Motor was repaired and tested successfully');

    fireEvent.press(screen.getByRole('button', { name: 'Return to inventory' }));

    mockReturnFromMaintenanceResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });
});
