/**
 * Level 8 — Create Request → Item Selector → Submit flow
 * Tests the full workflow: form fill, open modal, select items, submit.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { CreateRequestScreen } from '../CreateRequestScreen';
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
import type { Site } from '../../../types/sites';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRouteParams: { siteId: string; selectedItems?: Item[] } = { siteId: 'site1' };
const mockSetParams = jest.fn((p: Partial<typeof mockRouteParams>) => {
  if ('selectedItems' in p) {
    if (p.selectedItems === undefined) delete mockRouteParams.selectedItems;
    else mockRouteParams.selectedItems = p.selectedItems;
  }
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, setParams: mockSetParams }),
  useRoute: () => ({ params: { ...mockRouteParams } }),
  useIsFocused: () => true,
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));


let mockCreateRequestResolve: (value: string) => void;
let mockCreateRequestReject: (reason: unknown) => void;

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
    createRequest: createAsyncThunk(
      'requests/createRequest',
      async () =>
        new Promise<string>((resolve, reject) => {
          mockCreateRequestResolve = resolve;
          mockCreateRequestReject = reject;
        })
    ),
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

const mockSite: Site = {
  id: 'site1',
  name: 'Construction Site A',
  address: '123 Main St',
  managerId: 'm1',
  managerName: 'John Manager',
  status: 'active',
  createdAt: null,
  updatedAt: null,
};

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
  {
    id: 'item2',
    name: 'Cement Bag',
    sku: 'SKU-002',
    categoryId: 'cat2',
    categoryName: 'Building',
    type: 'consumable',
    unit: 'bag',
    minStockLevel: 20,
    status: 'active',
    totalQuantity: 100,
    centralStoreQuantity: 60,
    atSitesQuantity: 40,
    inMaintenanceQuantity: 0,
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
    userRole: null,
    isLoading: false,
    isRoleLoading: false,
    authInitialized: false,
    error: null,
    isAuthenticated: true,
  },
  sites: {
    sites: [mockSite],
    isLoading: false,
    error: null,
    searchQuery: '',
    validationLoading: false,
    lastValidationAt: null,
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
};

describe('CreateRequestScreen — Create Request → Item Selector → Submit flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.siteId = 'site1';
    delete mockRouteParams.selectedItems;
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
  });

  it('renders screen with site name and empty items state', () => {
    renderWithStore(<CreateRequestScreen />, defaultPreloadedState);

    expect(screen.getByText('New Request')).toBeTruthy();
    expect(screen.getByText('Construction Site A')).toBeTruthy();
    expect(screen.getByText('No items added yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeTruthy();
  });

  it('navigates to SelectItems when Add items is pressed', () => {
    renderWithStore(<CreateRequestScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Add items' }));

    expect(mockNavigate).toHaveBeenCalledWith('SelectItems', {
      returnScreen: 'CreateRequest',
      returnParams: { siteId: 'site1' },
      excludeItemIds: [],
      allowedItemTypes: ['consumable', 'non_consumable'],
    });
  });

  it('adds selected items to list when returning from SelectItems with selection', () => {
    const { rerender, store } = renderWithStore(<CreateRequestScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Add items' }));
    expect(mockNavigate).toHaveBeenCalledWith('SelectItems', expect.any(Object));

    mockRouteParams.selectedItems = [mockItems[0]];
    rerender(
      <Provider store={store}>
        <WeightViewPreferenceProvider>
          <CreateRequestScreen />
        </WeightViewPreferenceProvider>
      </Provider>
    );

    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.queryByText('No items added yet')).toBeNull();
  });

  it('shows validation error when submitting without items', () => {
    renderWithStore(<CreateRequestScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Submit request' }));

    expect(screen.getByText('At least one item is required')).toBeTruthy();
  });

  it('submits request and navigates back on success', async () => {
    const { rerender, store } = renderWithStore(<CreateRequestScreen />, defaultPreloadedState);

    mockRouteParams.selectedItems = [mockItems[0]];
    rerender(
      <Provider store={store}>
        <WeightViewPreferenceProvider>
          <CreateRequestScreen />
        </WeightViewPreferenceProvider>
      </Provider>
    );

    fireEvent.press(screen.getByRole('button', { name: 'Submit request' }));

    mockCreateRequestResolve!('req-123');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Request submitted successfully',
        expect.any(Array)
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('RequestQueue');
  });

  it('saves draft and navigates to list on success', async () => {
    renderWithStore(<CreateRequestScreen />, defaultPreloadedState);

    fireEvent.press(screen.getByRole('button', { name: 'Save as draft' }));

    mockCreateRequestResolve!('req-draft-1');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Request saved as draft',
        expect.any(Array)
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('RequestQueue');
  });

  it('shows error alert when createRequest rejects', async () => {
    const { rerender, store } = renderWithStore(<CreateRequestScreen />, defaultPreloadedState);

    mockRouteParams.selectedItems = [mockItems[0]];
    rerender(
      <Provider store={store}>
        <WeightViewPreferenceProvider>
          <CreateRequestScreen />
        </WeightViewPreferenceProvider>
      </Provider>
    );

    fireEvent.press(screen.getByRole('button', { name: 'Submit request' }));

    mockCreateRequestReject!(new Error('Firebase error'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
    });
  });

  it('disables submit buttons while submitting', async () => {
    const { rerender, store } = renderWithStore(<CreateRequestScreen />, defaultPreloadedState);

    mockRouteParams.selectedItems = [mockItems[0]];
    rerender(
      <Provider store={store}>
        <WeightViewPreferenceProvider>
          <CreateRequestScreen />
        </WeightViewPreferenceProvider>
      </Provider>
    );

    fireEvent.press(screen.getByRole('button', { name: 'Submit request' }));

    const submitBtn = screen.getByRole('button', { name: 'Submit request' });
    expect(submitBtn.props.accessibilityState?.disabled ?? submitBtn.props.disabled).toBe(true);

    mockCreateRequestResolve!('req-123');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('RequestQueue');
    });
  });
});
