import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CategoryManagementScreen } from '../CategoryManagementScreen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));
jest.mock('firebase/auth', () => ({ User: function User() {} }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: { now: jest.fn() },
}));
jest.mock('../../../../config/firebase', () => ({
  auth: {},
  db: {},
  functions: {},
}));
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { Category } from '../../../types/inventory';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubscribe = jest.fn();
let mockCategoriesToReturn: Category[] | null = null;
jest.mock('../../../services/firebase/categoryService', () => ({
  subscribeCategories: jest.fn((callback: (categories: Category[]) => void) => {
    if (mockCategoriesToReturn !== null) {
      queueMicrotask(() => {
        const { act } = require('@testing-library/react-native');
        act(() => {
          callback(mockCategoriesToReturn!);
        });
      });
    }
    return mockUnsubscribe;
  }),
  checkItemsUsingCategory: jest.fn().mockResolvedValue(0),
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
    fetchCategories: createAsyncThunk(
      'inventory/fetchCategories',
      async (_, { getState }) => {
        const state = getState() as RootState;
        return state.inventory?.categories ?? [];
      }
    ),
    createCategory: createAsyncThunk('inventory/createCategory', async () => {
      await new Promise((r) => setTimeout(r, 0));
      return null;
    }),
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
    fetchMyActivityPaginated: createAsyncThunk('activityLog/fetchMyActivityPaginated', async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })),
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({ logs: [], lastDoc: null, pageSize: 10 })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
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

const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Steel',
  createdAt: '2025-01-01',
  ...overrides,
});

const defaultInventoryState = {
  items: [],
  categories: [],
  inventoryByLocation: {},
  lowStockItemIds: [],
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: null,
};

describe('CategoryManagementScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockUnsubscribe.mockClear();
    mockCategoriesToReturn = null;
  });

  it('renders header and add button', async () => {
    renderWithStore(<CategoryManagementScreen />, {
      inventory: {
        ...defaultInventoryState,
        categories: [],
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Category Management')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Add new category' })).toBeTruthy();
  });

  it('renders category list when categories in store', async () => {
    mockCategoriesToReturn = null;
    const cat1 = createMockCategory({ id: 'cat-1', name: 'Steel' });
    const cat2 = createMockCategory({ id: 'cat-2', name: 'Hardware' });

    renderWithStore(<CategoryManagementScreen />, {
      inventory: {
        ...defaultInventoryState,
        categories: [cat1, cat2],
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Steel')).toBeTruthy();
      expect(screen.getByText('Hardware')).toBeTruthy();
    });
  });

  it('search filters categories', async () => {
    mockCategoriesToReturn = null;
    const cat1 = createMockCategory({ id: 'cat-1', name: 'Steel' });
    const cat2 = createMockCategory({ id: 'cat-2', name: 'Hardware' });

    renderWithStore(<CategoryManagementScreen />, {
      inventory: {
        ...defaultInventoryState,
        categories: [cat1, cat2],
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Steel')).toBeTruthy();
      expect(screen.getByText('Hardware')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('Search categories...'), 'Steel');

    expect(screen.getByText('Steel')).toBeTruthy();
    expect(screen.queryByText('Hardware')).toBeNull();
  });

  it('Add category opens modal and creates', async () => {
    renderWithStore(<CategoryManagementScreen />, {
      inventory: {
        ...defaultInventoryState,
        categories: [createMockCategory({ id: 'cat-0', name: 'Existing' })],
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add new category' })).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Add new category' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter category name')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('Enter category name'), 'New Category');
    fireEvent.press(screen.getByRole('button', { name: 'Create category' }));

    // Modal closes after createCategory succeeds - flush async updates then assert
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await waitFor(
      () => {
        expect(screen.queryByRole('button', { name: 'Create category' })).toBeNull();
      },
      { timeout: 3000 }
    );
  });

  it('Back button calls goBack', async () => {
    renderWithStore(<CategoryManagementScreen />, {
      inventory: {
        ...defaultInventoryState,
        categories: [],
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Category Management')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Delete category with no items shows confirmation dialog', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { checkItemsUsingCategory } = require('../../../services/firebase/categoryService');
    (checkItemsUsingCategory as jest.Mock).mockResolvedValue(0);

    const cat1 = createMockCategory({ id: 'cat-1', name: 'Steel' });
    renderWithStore(<CategoryManagementScreen />, {
      inventory: {
        ...defaultInventoryState,
        categories: [cat1],
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete category Steel' })).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Delete category Steel' }));

    await waitFor(() => {
      expect(checkItemsUsingCategory).toHaveBeenCalledWith('cat-1');
      expect(alertSpy).toHaveBeenCalledWith(
        'Delete Category',
        'Are you sure you want to delete "Steel"? This action cannot be undone.',
        expect.any(Array)
      );
    });
    alertSpy.mockRestore();
  });

  it('Delete category with items shows cannot delete alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { checkItemsUsingCategory } = require('../../../services/firebase/categoryService');
    (checkItemsUsingCategory as jest.Mock).mockResolvedValue(3);

    const cat1 = createMockCategory({ id: 'cat-1', name: 'Steel' });
    renderWithStore(<CategoryManagementScreen />, {
      inventory: {
        ...defaultInventoryState,
        categories: [cat1],
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete category Steel' })).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Delete category Steel' }));

    await waitFor(() => {
      expect(checkItemsUsingCategory).toHaveBeenCalledWith('cat-1');
      expect(alertSpy).toHaveBeenCalledWith(
        'Cannot Delete Category',
        'This category has 3 items associated with it. Please reassign these items to another category before deleting.',
        [{ text: 'OK' }]
      );
    });
    alertSpy.mockRestore();
  });
});
