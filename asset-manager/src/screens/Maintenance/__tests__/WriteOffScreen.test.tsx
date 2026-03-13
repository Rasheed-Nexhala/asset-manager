/**
 * WriteOffScreen tests
 * Tests loading state, form rendering, quantity controls, validation
 * (reason required; explanation optional), reason selector, and full submit flow.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WriteOffScreen } from '../WriteOffScreen';
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
let mockRouteParams = { maintenanceId: 'm1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockWriteOffResolve: (id?: string) => void;
let mockWriteOffReject: (err: unknown) => void;

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
    writeOffItemThunk: createAsyncThunk(
      'maintenance/writeOff',
      async () =>
        new Promise<void>((resolve, reject) => {
          mockWriteOffResolve = resolve;
          mockWriteOffReject = reject;
        })
    ),
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

const mockMaintenance: Maintenance = {
  id: 'm1',
  itemId: 'item1',
  itemName: 'Steel Bar',
  itemSku: 'SKU-001',
  quantity: 5,
  issueType: 'physical_damage',
  issueDescription: 'Motor damaged',
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
  addedAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
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
  maintenance: {
    maintenanceRecords: [mockMaintenance],
    selectedMaintenance: null,
    loading: false,
    error: null,
    errorTimestamp: null,
    filters: { status: 'all' },
  },
};

describe('WriteOffScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { maintenanceId: 'm1' };
  });

  it('shows loading state when maintenance is null', () => {
    const stateWithoutMaintenance: Partial<RootState> = {
      ...defaultPreloadedState,
      maintenance: {
        maintenanceRecords: [],
        selectedMaintenance: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all' },
      },
    };

    renderWithStore(<WriteOffScreen />, stateWithoutMaintenance);

    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Write Off Item' })).toBeTruthy();
  });

  it('renders form with item info when maintenance is in store', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    expect(screen.getByRole('header', { name: 'Write Off Item' })).toBeTruthy();
    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByText('SKU: SKU-001')).toBeTruthy();
    expect(screen.getByText('5 Pcs')).toBeTruthy(); // Available quantity
    expect(screen.getByRole('button', { name: 'Write-off reason selector' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Detailed explanation for write-off')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Write off item' })).toBeTruthy();
  });

  it('increment/decrement quantity buttons work', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    // Initial quantity is 5 (same as maintenance.quantity)
    expect(screen.getByDisplayValue('5')).toBeTruthy();

    // Decrement
    fireEvent.press(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(screen.getByDisplayValue('4')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(screen.getByDisplayValue('3')).toBeTruthy();

    // Increment
    fireEvent.press(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByDisplayValue('4')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByDisplayValue('5')).toBeTruthy();
  });

  it('validation: submit without reason shows error', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Write off item' }));

    expect(screen.getByText('Write-off reason is required')).toBeTruthy();
  });

  it('submit without explanation succeeds (explanation is optional)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, _message, buttons) => {
      if (title === 'Confirm Write Off') {
        buttons?.find((b) => b.text === 'Confirm Write Off')?.onPress?.();
      } else if (title === 'Success') {
        buttons?.find((b) => b.text === 'OK')?.onPress?.();
      }
    });

    const { store } = renderWithStore(<WriteOffScreen />, defaultPreloadedState);
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    fireEvent.press(screen.getByRole('button', { name: 'Write-off reason selector' }));
    fireEvent.press(screen.getByText('Beyond Repair'));

    // Submit without filling explanation
    fireEvent.press(screen.getByRole('button', { name: 'Write off item' }));

    mockWriteOffResolve!('m1');

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        expect.stringMatching(/\d+ (item|items) written off successfully/),
        expect.any(Array)
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
    alertSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it('select reason via WriteOffReasonSelector', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    expect(screen.getByText('Select Write-Off Reason')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Write-off reason selector' }));

    fireEvent.press(screen.getByText('Beyond Repair'));

    expect(screen.getByText('Beyond Repair')).toBeTruthy();
  });

  it('fill form, submit - triggers confirmation Alert; on Confirm dispatches writeOffItemThunk and shows success Alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, _message, buttons) => {
      if (title === 'Confirm Write Off') {
        buttons?.find((b) => b.text === 'Confirm Write Off')?.onPress?.();
      } else if (title === 'Success') {
        buttons?.find((b) => b.text === 'OK')?.onPress?.();
      }
    });

    const { store } = renderWithStore(<WriteOffScreen />, defaultPreloadedState);
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    fireEvent.press(screen.getByRole('button', { name: 'Write-off reason selector' }));
    fireEvent.press(screen.getByText('Beyond Repair'));

    fireEvent.changeText(
      screen.getByPlaceholderText('Detailed explanation for write-off'),
      'This item is beyond repair and cannot be fixed.'
    );

    fireEvent.press(screen.getByRole('button', { name: 'Write off item' }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Confirm Write Off',
      expect.stringContaining('Are you sure you want to write off'),
      expect.any(Array)
    );

    mockWriteOffResolve!('m1');

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
      const thunkCalls = dispatchSpy.mock.calls.filter((call) => typeof call[0] === 'function');
      expect(thunkCalls.length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        expect.stringMatching(/\d+ (item|items) written off successfully/),
        expect.any(Array)
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
    alertSpy.mockRestore();
    dispatchSpy.mockRestore();
  });

  it('displays "1 Pcs" when maintenance quantity is 1', () => {
    const singleItemMaintenance: Maintenance = {
      ...mockMaintenance,
      id: 'm1',
      quantity: 1,
    };

    const stateWithSingleItem: Partial<RootState> = {
      ...defaultPreloadedState,
      maintenance: {
        maintenanceRecords: [singleItemMaintenance],
        selectedMaintenance: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all' },
      },
    };

    renderWithStore(<WriteOffScreen />, stateWithSingleItem);

    expect(screen.getByText('1 Pcs')).toBeTruthy();
  });

  it('manual quantity input: typing valid number updates display', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    const quantityInput = screen.getByDisplayValue('5');
    fireEvent.changeText(quantityInput, '2');

    expect(screen.getByDisplayValue('2')).toBeTruthy();
  });

  it('manual quantity input: exceeding max shows validation error', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    const quantityInput = screen.getByDisplayValue('5');
    fireEvent.changeText(quantityInput, '10');

    fireEvent.press(screen.getByRole('button', { name: 'Write off item' }));

    expect(screen.getByText(/Cannot exceed 5/)).toBeTruthy();
  });

  it('manual quantity input: zero shows validation error', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    const quantityInput = screen.getByDisplayValue('5');
    fireEvent.changeText(quantityInput, '0');

    fireEvent.press(screen.getByRole('button', { name: 'Write off item' }));

    expect(screen.getByText(/Write-off quantity is required|Write-off quantity must be greater than 0/)).toBeTruthy();
  });

  it('confirmation dialog shows correct quantity text for single item', async () => {
    const singleItemMaintenance: Maintenance = {
      ...mockMaintenance,
      id: 'm1',
      quantity: 1,
    };

    const stateWithSingleItem: Partial<RootState> = {
      ...defaultPreloadedState,
      maintenance: {
        maintenanceRecords: [singleItemMaintenance],
        selectedMaintenance: null,
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: { status: 'all' },
      },
    };

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      if (title === 'Confirm Write Off') {
        expect(message).toContain('1 Pc');
        buttons?.find((b) => b.text === 'Confirm Write Off')?.onPress?.();
      } else if (title === 'Success') {
        expect(message).toContain('1 item');
        buttons?.find((b) => b.text === 'OK')?.onPress?.();
      }
    });

    renderWithStore(<WriteOffScreen />, stateWithSingleItem);

    fireEvent.press(screen.getByRole('button', { name: 'Write-off reason selector' }));
    fireEvent.press(screen.getByText('Beyond Repair'));
    fireEvent.press(screen.getByRole('button', { name: 'Write off item' }));

    mockWriteOffResolve!();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Confirm Write Off',
        expect.stringContaining('1 Pc'),
        expect.any(Array)
      );
    });

    alertSpy.mockRestore();
  });

  it('submit with partial quantity (2 out of 5) succeeds', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, _message, buttons) => {
      if (title === 'Confirm Write Off') {
        buttons?.find((b) => b.text === 'Confirm Write Off')?.onPress?.();
      } else if (title === 'Success') {
        buttons?.find((b) => b.text === 'OK')?.onPress?.();
      }
    });

    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Decrease quantity' }));
    fireEvent.press(screen.getByRole('button', { name: 'Decrease quantity' }));
    fireEvent.press(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(screen.getByDisplayValue('2')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Write-off reason selector' }));
    fireEvent.press(screen.getByText('Beyond Repair'));
    fireEvent.press(screen.getByRole('button', { name: 'Write off item' }));

    mockWriteOffResolve!('m1');

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Success',
        expect.stringMatching(/2 items written off successfully/),
        expect.any(Array)
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('accessibility: Write off item button has correct role and label', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    const button = screen.getByRole('button', { name: 'Write off item' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe('Write off item');
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('accessibility: increment and decrement buttons have correct labels', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeTruthy();
  });

  it('renders danger warning banner', () => {
    renderWithStore(<WriteOffScreen />, defaultPreloadedState);

    expect(screen.getByText('This permanently reduces total inventory. Cannot be undone.')).toBeTruthy();
  });
});
