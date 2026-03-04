import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SteelMasterScreen } from '../SteelMasterScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';
import type { SteelMaster } from '../../../types/steelMaster';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUnsubscribe = jest.fn();
let mockMastersToReturn: SteelMaster[] | null = null;
jest.mock('../../../services/firebase/steelMasterService', () => ({
  subscribeSteelMasters: jest.fn(
    (callback: (masters: SteelMaster[]) => void, _activeOnly?: boolean) => {
      if (mockMastersToReturn !== null) {
        queueMicrotask(() => {
          const { act } = require('@testing-library/react-native');
          act(() => {
            callback(mockMastersToReturn!.filter((m) => m.isActive));
          });
        });
      }
      return mockUnsubscribe;
    }
  ),
  listSteelMasters: jest.fn().mockResolvedValue([]),
  getSteelMasterById: jest.fn().mockResolvedValue(null),
  createSteelMaster: jest.fn().mockResolvedValue('new-id'),
  updateSteelMaster: jest.fn().mockResolvedValue(undefined),
  deleteSteelMaster: jest.fn().mockResolvedValue(undefined),
}));

let mockFetchSteelMastersResult: SteelMaster[] | 'reject' | 'pending' = [];
jest.mock('../../../store/thunks/steelMasterThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  const { act } = require('@testing-library/react-native');
  return {
    fetchSteelMasters: createAsyncThunk(
      'steelMaster/fetch',
      async (_: boolean | undefined, { rejectWithValue }) => {
        if (mockFetchSteelMastersResult === 'pending') {
          await new Promise(() => {});
        }
        if (mockFetchSteelMastersResult === 'reject') {
          return rejectWithValue('Failed to load steel masters');
        }
        const result = (mockFetchSteelMastersResult as SteelMaster[]) ?? [];
        // Defer resolution so Redux fulfilled dispatch happens inside act()
        return new Promise<SteelMaster[]>((resolve) => {
          queueMicrotask(() => {
            act(() => resolve(result));
          });
        });
      }
    ),
    fetchSteelMasterById: createAsyncThunk('steelMaster/fetchById', async () => null),
    createSteelMaster: createAsyncThunk('steelMaster/create', async () => null),
    updateSteelMaster: createAsyncThunk('steelMaster/update', async () => null),
    deleteSteelMaster: createAsyncThunk('steelMaster/delete', async () => null),
  };
});
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

const mockSteelMaster: SteelMaster = {
  id: 'sm-1',
  name: 'MS ANGLE 80x80x6',
  weightPerMeter: 7.2,
  defaultLength: 6,
  hsnCode: '7214',
  isActive: true,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const defaultSteelMasterState = {
  steelMasters: [],
  selectedSteelMaster: null,
  loading: false,
  error: null,
};

describe('SteelMasterScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockUnsubscribe.mockClear();
    mockMastersToReturn = null;
    mockFetchSteelMastersResult = [];
  });

  it('shows loading when loading and no data', async () => {
    mockFetchSteelMastersResult = 'pending';

    renderWithStore(<SteelMasterScreen />, {
      steelMaster: defaultSteelMasterState,
    });

    await waitFor(() => {
      expect(screen.getByText('Loading steel masters...')).toBeTruthy();
    });
  });

  it('renders steel master list when data in store', () => {
    mockMastersToReturn = null;
    mockFetchSteelMastersResult = 'pending';

    renderWithStore(<SteelMasterScreen />, {
      steelMaster: {
        ...defaultSteelMasterState,
        steelMasters: [mockSteelMaster],
        loading: false,
      },
    });

    expect(screen.getByText('MS ANGLE 80x80x6')).toBeTruthy();
    expect(screen.getByText('7.2 kg/m')).toBeTruthy();
    expect(screen.getByText('6m')).toBeTruthy();
    expect(screen.getByText('7214')).toBeTruthy();
  });

  it('Add button shows form', async () => {
    mockMastersToReturn = null;
    mockFetchSteelMastersResult = 'pending';

    renderWithStore(<SteelMasterScreen />, {
      steelMaster: {
        ...defaultSteelMasterState,
        steelMasters: [mockSteelMaster],
        loading: false,
      },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Add steel master' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Steel master name input')).toBeTruthy();
    });
  });

  it('Edit button opens form with master data', async () => {
    mockMastersToReturn = null;
    mockFetchSteelMastersResult = 'pending';

    renderWithStore(<SteelMasterScreen />, {
      steelMaster: {
        ...defaultSteelMasterState,
        steelMasters: [mockSteelMaster],
        loading: false,
      },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Edit MS ANGLE 80x80x6' }));

    await waitFor(() => {
      expect(screen.getByText('Edit Steel Master')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('MS ANGLE 80x80x6')).toBeTruthy();
    expect(screen.getByDisplayValue('7.2')).toBeTruthy();
    expect(screen.getByDisplayValue('6')).toBeTruthy();
    expect(screen.getByDisplayValue('7214')).toBeTruthy();
  });

  it('Back button calls goBack', async () => {
    mockMastersToReturn = null;
    mockFetchSteelMastersResult = 'pending';

    renderWithStore(<SteelMasterScreen />, {
      steelMaster: {
        ...defaultSteelMasterState,
        steelMasters: [mockSteelMaster],
        loading: false,
      },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('pull-to-refresh works', async () => {
    mockMastersToReturn = null;
    mockFetchSteelMastersResult = 'pending';

    renderWithStore(<SteelMasterScreen />, {
      steelMaster: {
        ...defaultSteelMasterState,
        steelMasters: [mockSteelMaster],
        loading: false,
      },
    });

    const list = screen.UNSAFE_getAllByType(
      require('react-native').FlatList
    )[0] as React.ReactElement<{ refreshControl?: React.ReactElement }>;
    const refreshControl = list.props.refreshControl;

    expect(refreshControl).toBeTruthy();
    expect(refreshControl?.props.onRefresh).toBeDefined();

    await act(async () => {
      refreshControl?.props.onRefresh?.();
    });
  });
});
