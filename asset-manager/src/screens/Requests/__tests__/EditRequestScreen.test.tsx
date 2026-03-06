/**
 * Edit Request flow
 * Tests loading state, form render for draft, non-draft Alert+goBack,
 * Save Draft (editRequest), Submit Request (submitDraftRequest), Back button.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { EditRequestScreen } from '../EditRequestScreen';
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

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack, canGoBack: () => true }),
  useRoute: () => ({ params: { requestId: 'req1' } }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockGetRequestByIdResolve: (r: Record<string, unknown> | null) => void;

jest.mock('../../../services/firebase/requestService', () => ({
  requestService: {
    getRequestById: jest.fn(() =>
      new Promise<Record<string, unknown> | null>((resolve) => {
        mockGetRequestByIdResolve = resolve;
      })
    ),
    subscribeToRequests: jest.fn(() => () => {}),
  },
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
const mockEditRequest = jest.fn().mockResolvedValue(undefined);
const mockSubmitDraftRequest = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../store/thunks/requestThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    createRequest: createAsyncThunk('requests/createRequest', async () => null),
    editRequest: createAsyncThunk('requests/editRequest', async (arg: unknown) => mockEditRequest(arg)),
    rejectRequest: createAsyncThunk('requests/rejectRequest', async () => null),
    processRequest: createAsyncThunk('requests/processRequest', async () => null),
    confirmTransfer: createAsyncThunk('requests/confirmTransfer', async () => null),
    returnItems: createAsyncThunk('requests/returnItems', async () => null),
    submitDraftRequest: createAsyncThunk('requests/submitDraftRequest', async (arg: unknown) => mockSubmitDraftRequest(arg)),
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

const mockDraftRequest = {
  id: 'req1',
  siteName: 'Construction Site A',
  priority: 'medium' as const,
  purpose: 'Building materials needed',
  status: 'draft' as const,
  items: [
    {
      itemId: 'item1',
      itemName: 'Steel Bar',
      itemSku: 'SKU-001',
      itemType: 'non_consumable' as const,
      categoryId: 'cat1',
      categoryName: 'Steel',
      quantityRequested: 2,
      quantityApproved: 2,
      quantityReturned: 0,
      status: 'pending' as const,
    },
  ],
};

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

describe('EditRequestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title: string, _message?: string, buttons?: Array<{ text?: string; onPress?: () => void }>) => {
      buttons?.find((b) => b.text === 'OK')?.onPress?.();
    });
  });

  it('shows loading initially', () => {
    renderWithStore(<EditRequestScreen />, defaultPreloadedState);

    expect(screen.getByText('Loading request...')).toBeTruthy();
  });

  it('renders form when draft request loads', async () => {
    renderWithStore(<EditRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(mockDraftRequest);

    await waitFor(() => {
      expect(screen.getByText('Editing draft request')).toBeTruthy();
    });

    expect(screen.getByText('Construction Site A')).toBeTruthy();
    expect(screen.getByText('Steel Bar')).toBeTruthy();
    expect(screen.getByPlaceholderText('Describe the purpose of this request...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeTruthy();
  });

  it('non-draft request shows Alert and goBack', async () => {
    renderWithStore(<EditRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!({ ...mockDraftRequest, status: 'pending' });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Only draft requests can be edited',
        expect.any(Array)
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Save Draft dispatches editRequest', async () => {
    renderWithStore(<EditRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(mockDraftRequest);

    await waitFor(() => {
      expect(screen.getByText('Editing draft request')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Save as draft' }));

    await waitFor(() => {
      expect(mockEditRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req1',
          updates: expect.objectContaining({
            priority: 'medium',
            purpose: 'Building materials needed',
            items: expect.any(Array),
          }),
          editedBy: 'user1',
          editedByName: 'Test User',
        })
      );
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Draft saved successfully',
        expect.any(Array)
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Submit Request dispatches submitDraftRequest', async () => {
    renderWithStore(<EditRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(mockDraftRequest);

    await waitFor(() => {
      expect(screen.getByText('Editing draft request')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => {
      expect(mockEditRequest).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSubmitDraftRequest).toHaveBeenCalledWith({
        requestId: 'req1',
        userId: 'user1',
      });
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Request submitted successfully',
        expect.any(Array)
      );
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Back button calls goBack', async () => {
    renderWithStore(<EditRequestScreen />, defaultPreloadedState);

    mockGetRequestByIdResolve!(mockDraftRequest);

    await waitFor(() => {
      expect(screen.getByText('Editing draft request')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
