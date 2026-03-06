/**
 * AddEditItemScreen — Add/Edit item form
 * Tests: create form, loading state, edit form with data, validation, submit create, back button.
 */
jest.mock('firebase/auth', () => ({ User: function User() {} }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => ({})),
}));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));
jest.mock('../../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
}));
jest.mock('../../../services/firebase/authService', () => ({
  updatePassword: jest.fn().mockResolvedValue(undefined),
  reauthenticateWithPassword: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../services/firebase/userRoleService', () => ({
  getUserRole: jest.fn().mockResolvedValue(null),
  subscribeToUserRole: jest.fn(() => jest.fn()),
  subscribeToAllUsers: jest.fn(() => jest.fn()),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WeightViewPreferenceProvider } from '../../../hooks/useWeightViewPreference';
import { AddEditItemScreen } from '../AddEditItemScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Item, Category } from '../../../types/inventory';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

// Route params - tests set this before render
let mockRouteParams: { itemId?: string; selectedCategoryId?: string } = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Control fetchItemById, createItem, updateItem behavior
let mockFetchItemByIdResolve: (value: Item) => void;
let mockFetchItemByIdReject: (reason: unknown) => void;
let mockCreateItemResolve: (value: Item) => void;
let mockCreateItemReject: (reason: unknown) => void;
let mockUpdateItemResolve: (value: Item) => void;
let mockUpdateItemReject: (reason: unknown) => void;

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
    fetchItemById: createAsyncThunk(
      'inventory/fetchItemById',
      async () =>
        new Promise<Item>((resolve, reject) => {
          mockFetchItemByIdResolve = resolve;
          mockFetchItemByIdReject = reject;
        })
    ),
    createItem: createAsyncThunk(
      'inventory/createItem',
      async (_, { rejectWithValue }) => {
        try {
          return await new Promise<Item>((resolve, reject) => {
            mockCreateItemResolve = resolve;
            mockCreateItemReject = reject;
          });
        } catch (reason) {
          // Simulate real thunk: rejectWithValue puts payload in action for slice
          const msg =
            typeof reason === 'string' ? reason : (reason as Error)?.message ?? 'Unknown';
          return rejectWithValue(msg);
        }
      }
    ),
    updateItem: createAsyncThunk(
      'inventory/updateItem',
      async () =>
        new Promise<Item>((resolve, reject) => {
          mockUpdateItemResolve = resolve;
          mockUpdateItemReject = reject;
        })
    ),
    deleteItem: createAsyncThunk('inventory/deleteItem', async () => null),
    adjustQuantity: createAsyncThunk('inventory/adjustQuantity', async () => null),
    fetchInventoryByLocation: createAsyncThunk('inventory/fetchByLocation', async () => []),
    fetchCategories: createAsyncThunk('inventory/fetchCategories', async () => []),
    createCategory: createAsyncThunk('inventory/createCategory', async () => null),
    updateCategory: createAsyncThunk('inventory/updateCategory', async () => null),
    deleteCategory: createAsyncThunk('inventory/deleteCategory', async () => null),
    SKU_EXISTS_ERROR_MESSAGE: 'This SKU already exists. Please use a different SKU.',
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

jest.mock('../../../services/firebase/storageService', () => ({
  uploadItemImage: jest.fn().mockResolvedValue('https://example.com/image.png'),
  deleteItemImageByUrl: jest.fn().mockResolvedValue(undefined),
}));

const mockCategory: Category = {
  id: 'cat1',
  name: 'Steel',
  createdAt: '2025-01-01',
};

const mockItem: Item = {
  id: 'i1',
  name: 'Steel Bar',
  sku: 'SKU-001',
  categoryId: 'cat1',
  categoryName: 'Steel',
  type: 'consumable',
  unit: 'Pcs',
  minStockLevel: 10,
  status: 'active',
  totalQuantity: 50,
  centralStoreQuantity: 30,
  atSitesQuantity: 15,
  inMaintenanceQuantity: 5,
};

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
    items: [],
    categories: [mockCategory],
    inventoryByLocation: {},
    lowStockItemIds: [],
    loading: false,
    error: null,
    errorTimestamp: null,
    filters: null,
  },
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
    preloadedState: { ...defaultPreloadedState, ...preloadedState } as Partial<RootState>,
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

/**
 * Fill create form with valid data (enables submit button).
 * Category is pre-filled via route params (simulates return from CategorySelectScreen).
 * @param renderResult - Result from renderWithStore; used to rerender with category selection
 */
function fillCreateFormValid(
  renderResult?: { rerender: (ui: React.ReactElement) => void; store: unknown }
) {
  // Item name
  const nameInput = screen.getByLabelText('Item name input');
  fireEvent.changeText(nameInput, 'Test Item');

  // SKU
  const skuInput = screen.getByLabelText('SKU input');
  fireEvent.changeText(skuInput, 'SKU-TEST');

  // Category - pre-fill via route params and rerender (simulates return from CategorySelectScreen)
  mockRouteParams = { ...mockRouteParams, selectedCategoryId: 'cat1' };
  if (renderResult?.rerender && renderResult?.store) {
    const { Provider } = require('react-redux');
    const { WeightViewPreferenceProvider } = require('../../../hooks/useWeightViewPreference');
    renderResult.rerender(
      <Provider store={renderResult.store}>
        <WeightViewPreferenceProvider>
          <AddEditItemScreen />
        </WeightViewPreferenceProvider>
      </Provider>
    );
  }

  // Unit - open and select Pcs
  fireEvent.press(screen.getByText('Select unit'));
  fireEvent.press(screen.getByText('Pcs'));

  // Initial quantity
  const qtyInput = screen.getByLabelText('Initial quantity input');
  fireEvent.changeText(qtyInput, '10');

  // Min stock level
  const minInput = screen.getByLabelText('Minimum stock level input');
  fireEvent.changeText(minInput, '5');
}

describe('AddEditItemScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders create form when no itemId', () => {
    mockRouteParams = {};
    renderWithStore(<AddEditItemScreen />);

    expect(screen.getByText('Add New Item')).toBeTruthy();
    expect(screen.getByLabelText('Item name input')).toBeTruthy();
    expect(screen.getByLabelText('SKU input')).toBeTruthy();
    expect(screen.getByText('Select Category')).toBeTruthy();
    expect(screen.getByLabelText('Minimum stock level input')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel form' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit new item' })).toBeTruthy();
  });

  it('shows loading when itemId and fetching', () => {
    mockRouteParams = { itemId: 'i1' };
    renderWithStore(<AddEditItemScreen />);

    expect(screen.getByText('Loading item data...')).toBeTruthy();
    expect(screen.getByText('Edit Item')).toBeTruthy();
  });

  it('renders form with item data when editing', async () => {
    mockRouteParams = { itemId: 'i1' };
    renderWithStore(<AddEditItemScreen />);

    // Resolve fetchItemById with mock item
    mockFetchItemByIdResolve!(mockItem);

    await waitFor(() => {
      expect(screen.queryByText('Loading item data...')).toBeNull();
    });

    // Edit form shows item data (ItemForm in edit mode shows description, min stock, status - not name/sku/category/unit)
    expect(screen.getByText('Edit Item')).toBeTruthy();
    expect(screen.getByLabelText('Description input')).toBeTruthy();
    expect(screen.getByLabelText('Minimum stock level input')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('validation: submit without required fields shows error', async () => {
    mockRouteParams = { selectedCategoryId: 'cat1' };
    renderWithStore(<AddEditItemScreen />);

    // Fill all required fields but set minStockLevel to invalid value (-1)
    const nameInput = screen.getByLabelText('Item name input');
    fireEvent.changeText(nameInput, 'Test Item');

    const skuInput = screen.getByLabelText('SKU input');
    fireEvent.changeText(skuInput, 'SKU-TEST');

    fireEvent.press(screen.getByText('Select unit'));
    fireEvent.press(screen.getByText('Pcs'));

    const qtyInput = screen.getByLabelText('Initial quantity input');
    fireEvent.changeText(qtyInput, '10');

    const minInput = screen.getByLabelText('Minimum stock level input');
    fireEvent.changeText(minInput, '-1');

    // Submit - validation should fail
    fireEvent.press(screen.getByRole('button', { name: 'Submit new item' }));

    await waitFor(() => {
      expect(screen.getByText('Minimum stock level cannot be negative')).toBeTruthy();
    });
  });

  it('submit create dispatches createItem', async () => {
    mockRouteParams = {};
    const renderResult = renderWithStore(<AddEditItemScreen />);

    fillCreateFormValid(renderResult);

    fireEvent.press(screen.getByRole('button', { name: 'Submit new item' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saving, please wait' })).toBeTruthy();
    });

    // Resolve createItem - returns created item with id
    const createdItem: Item = { ...mockItem, id: 'new-id' };
    mockCreateItemResolve!(createdItem);

    await waitFor(() => {
      expect(screen.getByText('Item created successfully')).toBeTruthy();
    });

    // Advance timers for goBack timeout (1000ms)
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('back button calls goBack', () => {
    mockRouteParams = {};
    renderWithStore(<AddEditItemScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Cancel form' }));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows SKU already exists message when createItem rejects with duplicate SKU', async () => {
    const skuExistsMessage = 'This SKU already exists. Please use a different SKU.';
    mockRouteParams = {};
    const renderResult = renderWithStore(<AddEditItemScreen />);

    fillCreateFormValid(renderResult);
    fireEvent.press(screen.getByRole('button', { name: 'Submit new item' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saving, please wait' })).toBeTruthy();
    });

    // Reject with string (simulates rejectWithValue from thunk - unwrap() throws payload directly)
    mockCreateItemReject!(skuExistsMessage);

    await waitFor(() => {
      expect(screen.getByText(skuExistsMessage)).toBeTruthy();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Duplicate SKU',
      skuExistsMessage,
      [{ text: 'OK' }]
    );
  });
});
