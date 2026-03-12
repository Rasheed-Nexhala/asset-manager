/**
 * Level 8 — Add to Maintenance flow
 * Tests item selection, issue type, description, submit.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AddToMaintenanceScreen } from '../AddToMaintenanceScreen';
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

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockRouteParams: object = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
  useIsFocused: () => true,
  useFocusEffect: (cb: () => void) => {
    cb();
    return () => {};
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

let mockAddToMaintenanceResolve: () => void;
let mockAddToMaintenanceReject: (err: unknown) => void;

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
    addToMaintenanceThunk: createAsyncThunk(
      'maintenance/add',
      async () =>
        new Promise<void>((resolve, reject) => {
          mockAddToMaintenanceResolve = resolve;
          mockAddToMaintenanceReject = reject;
        })
    ),
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

const mockItem: Item = {
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
  centralStoreQuantity: 10,
  atSitesQuantity: 30,
  inMaintenanceQuantity: 10,
} as Item;

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
  inventory: {
    items: [mockItem],
    categories: [],
    inventoryByLocation: {},
    lowStockItemIds: [],
    filters: null,
    loading: false,
    error: null,
    errorTimestamp: null,
  },
};

describe('AddToMaintenanceScreen — Add to Maintenance flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
  });

  it('renders form with item selector and add button', () => {
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    expect(screen.getByRole('header', { name: 'Add to Maintenance' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Item selector' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to maintenance' })).toBeTruthy();
  });

  it('shows validation error when submitting without selection', () => {
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));

    expect(screen.getByText('Please select an item')).toBeTruthy();
  });

  it('navigates to SelectItemForMaintenance when item selector is pressed', () => {
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Item selector' }));

    expect(mockNavigate).toHaveBeenCalledWith('SelectItemForMaintenance', {
      selectedItemId: undefined,
      excludeItemIds: [],
    });
  });

  it('selects item, sets issue type and description, submits successfully', async () => {
    mockRouteParams = { selectedItem: mockItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    expect(screen.getByText('Steel Bar')).toBeTruthy();

    fireEvent.press(screen.getByText('Select Issue Type'));
    fireEvent.press(screen.getByText('Physical Damage'));

    fireEvent.changeText(
      screen.getByPlaceholderText('Describe the issue in detail (optional)'),
      'Motor has stopped working and needs repair'
    );

    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));

    mockAddToMaintenanceResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Item has been added to maintenance', expect.any(Array));
    });

    expect(mockNavigate).toHaveBeenCalledWith('MaintenanceDashboard');
  });

  it('submits successfully without description (description is optional)', async () => {
    mockRouteParams = { selectedItem: mockItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByText('Select Issue Type'));
    fireEvent.press(screen.getByText('Physical Damage'));
    // No description entered - field is optional

    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));

    mockAddToMaintenanceResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Item has been added to maintenance', expect.any(Array));
    });

    expect(mockNavigate).toHaveBeenCalledWith('MaintenanceDashboard');
  });

  it('shows validation error when submitting without issue type', () => {
    mockRouteParams = { selectedItem: mockItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));

    expect(screen.getByText('Please select issue type')).toBeTruthy();
  });

  it('quantity increment and decrement work when item is selected', () => {
    mockRouteParams = { selectedItem: mockItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    const incrementBtn = screen.getByRole('button', { name: 'Increase quantity' });
    const decrementBtn = screen.getByRole('button', { name: 'Decrease quantity' });
    const amountInput = screen.getByDisplayValue('1');

    expect(amountInput).toBeTruthy();

    fireEvent.press(incrementBtn);
    expect(screen.getByDisplayValue('2')).toBeTruthy();

    fireEvent.press(incrementBtn);
    expect(screen.getByDisplayValue('3')).toBeTruthy();

    fireEvent.press(decrementBtn);
    expect(screen.getByDisplayValue('2')).toBeTruthy();

    fireEvent.press(decrementBtn);
    expect(screen.getByDisplayValue('1')).toBeTruthy();
  });

  it('quantity validation: cannot exceed available quantity', () => {
    mockRouteParams = { selectedItem: mockItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    const amountInput = screen.getByDisplayValue('1');
    fireEvent.changeText(amountInput, '999');

    fireEvent.press(screen.getByText('Select Issue Type'));
    fireEvent.press(screen.getByText('Physical Damage'));
    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));

    expect(screen.getByText(/Cannot exceed available quantity \(10\)/)).toBeTruthy();
  });

  it('quantity validation: pieces must be whole number for weight-based items', () => {
    const steelItem: Item = {
      ...mockItem,
      id: 'steel1',
      name: 'Steel Rebar',
      weightPerMeter: 2.5,
      lengthPerPiece: 6,
      isWeightBased: true,
    } as Item;

    mockRouteParams = { selectedItem: steelItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    const input = screen.getByDisplayValue('1');
    fireEvent.changeText(input, '2.5');

    fireEvent.press(screen.getByText('Select Issue Type'));
    fireEvent.press(screen.getByText('Physical Damage'));
    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));

    expect(screen.getByText(/Pieces must be a whole number/)).toBeTruthy();
  });

  it('submits with custom quantity successfully', async () => {
    mockRouteParams = { selectedItem: mockItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.press(screen.getByRole('button', { name: 'Increase quantity' }));
    expect(screen.getByDisplayValue('3')).toBeTruthy();

    fireEvent.press(screen.getByText('Select Issue Type'));
    fireEvent.press(screen.getByText('Wear and Tear'));

    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));

    mockAddToMaintenanceResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Item has been added to maintenance', expect.any(Array));
    });

    expect(mockNavigate).toHaveBeenCalledWith('MaintenanceDashboard');
  });

  it('all issue types are selectable', () => {
    mockRouteParams = { selectedItem: mockItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    const issueTypes = ['Motor/Electrical', 'Physical Damage', 'Wear and Tear', 'Missing Parts', 'Other'];

    issueTypes.forEach((label) => {
      fireEvent.press(screen.getByRole('button', { name: 'Issue type selector' }));
      fireEvent.press(screen.getByText(label));
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('Reported By field is optional and can be filled', async () => {
    mockRouteParams = { selectedItem: mockItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    fireEvent.changeText(
      screen.getByPlaceholderText('Name of person reporting the issue (optional)'),
      'John Doe'
    );

    fireEvent.press(screen.getByText('Select Issue Type'));
    fireEvent.press(screen.getByText('Missing Parts'));

    fireEvent.press(screen.getByRole('button', { name: 'Add to maintenance' }));

    mockAddToMaintenanceResolve!();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Item has been added to maintenance', expect.any(Array));
    });

    expect(mockNavigate).toHaveBeenCalledWith('MaintenanceDashboard');
  });

  it('weight-based item shows Pcs/Kg/Ton mode toggle', () => {
    const steelItem: Item = {
      ...mockItem,
      id: 'steel1',
      name: 'Steel Rebar',
      weightPerMeter: 2.5,
      lengthPerPiece: 6,
      isWeightBased: true,
    } as Item;

    mockRouteParams = { selectedItem: steelItem };
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    expect(screen.getByText('Pcs')).toBeTruthy();
    expect(screen.getByText('Kg')).toBeTruthy();
    expect(screen.getByText('Ton')).toBeTruthy();
  });

  it('accessibility: Add to maintenance button has correct role and label', () => {
    renderWithStore(<AddToMaintenanceScreen />, defaultPreloadedState);

    const button = screen.getByRole('button', { name: 'Add to maintenance' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe('Add to maintenance');
    expect(button.props.accessibilityRole).toBe('button');
  });
});
