import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LoginScreen } from '../LoginScreen';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import type { RootState } from '../../../store';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../store/thunks/authThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    signInUser: createAsyncThunk(
      'auth/signIn',
      async (payload: { email: string; password: string }) => ({ uid: 'mock', email: payload.email })
    ),
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
    subscribeToActivityLogsRealtime: () => {},
    subscribeToMyRecentActivityRealtime: () => {},
    unsubscribeFromActivityLogs: () => {},
    unsubscribeFromMyRecentActivity: () => {},
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

describe('LoginScreen', () => {
  it('renders welcome text and form fields', () => {
    renderWithStore(<LoginScreen />);

    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByText('Enter your email and password to continue.')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
  });

  it('shows validation errors for empty form', () => {
    renderWithStore(<LoginScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
  });

  it('accepts valid email and password and submits without validation errors', async () => {
    renderWithStore(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Your password'), 'password123');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Email is required/i)).toBeNull();
    expect(screen.queryByText(/Password is required/i)).toBeNull();
  });

  it('displays account deactivated message when auth error is deactivated', () => {
    const deactivatedMessage = 'Your account is deactivated, please contact admin.';
    renderWithStore(<LoginScreen />, {
      auth: {
        user: null,
        userRole: null,
        isAuthenticated: false,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: deactivatedMessage,
      },
    });

    expect(screen.getByText(deactivatedMessage)).toBeTruthy();
  });

  it('displays auth errors (e.g. invalid credentials) in UI', () => {
    renderWithStore(<LoginScreen />, {
      auth: {
        user: null,
        userRole: null,
        isAuthenticated: false,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: 'Invalid email or password',
      },
    });

    expect(screen.getByText('Invalid email or password')).toBeTruthy();
  });

  it('shows loading state when isLoading', () => {
    renderWithStore(<LoginScreen />, {
      auth: {
        user: null,
        userRole: null,
        isAuthenticated: false,
        isLoading: true,
        isRoleLoading: false,
        authInitialized: false,
        error: null,
      },
    });

    expect(screen.getByRole('button', { name: 'Signing in, please wait' })).toBeTruthy();
  });

  it('renders sign up link when onGoToSignup provided', () => {
    const onGoToSignup = jest.fn();
    renderWithStore(<LoginScreen onGoToSignup={onGoToSignup} />);

    expect(screen.getByText("Don't have an account? Sign up")).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: "Don't have an account? Sign up" }));
    expect(onGoToSignup).toHaveBeenCalledTimes(1);
  });

  it('does not render sign up link when onGoToSignup not provided', () => {
    renderWithStore(<LoginScreen />);

    expect(screen.queryByText("Don't have an account? Sign up")).toBeNull();
  });
});
