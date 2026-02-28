import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SignupScreen } from '../SignupScreen';
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
    },
    preloadedState: preloadedState as Partial<RootState>,
  });
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}

describe('SignupScreen', () => {
  it('renders header text and form fields', () => {
    renderWithStore(<SignupScreen />);

    expect(screen.getByRole('header', { name: 'Create account' })).toBeTruthy();
    expect(screen.getByText('Enter your details to get started.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('At least 6 characters')).toBeTruthy();
    expect(screen.getByPlaceholderText('Re-enter your password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  it('shows validation errors for empty form', () => {
    renderWithStore(<SignupScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Name is required')).toBeTruthy();
    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(screen.getByText('Please confirm your password')).toBeTruthy();
  });

  it('shows password mismatch when passwords do not match', () => {
    renderWithStore(<SignupScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Your name'), 'Test User');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('At least 6 characters'), 'password123');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter your password'), 'different123');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Passwords do not match')).toBeTruthy();
  });

  it('accepts valid form and submits without validation errors', async () => {
    renderWithStore(<SignupScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Your name'), 'Test User');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('At least 6 characters'), 'password123');
    fireEvent.changeText(screen.getByPlaceholderText('Re-enter your password'), 'password123');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Name is required/i)).toBeNull();
    expect(screen.queryByText(/Email is required/i)).toBeNull();
    expect(screen.queryByText(/Password is required/i)).toBeNull();
    expect(screen.queryByText(/Please confirm your password/i)).toBeNull();
    expect(screen.queryByText(/Passwords do not match/i)).toBeNull();
  });

  it('displays auth error from Redux state', () => {
    renderWithStore(<SignupScreen />, {
      auth: {
        user: null,
        userRole: null,
        isAuthenticated: false,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: false,
        error: 'Email already in use',
      },
    });

    expect(screen.getByText('Email already in use')).toBeTruthy();
  });

  it('shows loading state when isLoading', () => {
    renderWithStore(<SignupScreen />, {
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

    expect(screen.getByRole('button', { name: 'Creating account, please wait' })).toBeTruthy();
  });

  it('renders login link when onGoToLogin provided', () => {
    const onGoToLogin = jest.fn();
    renderWithStore(<SignupScreen onGoToLogin={onGoToLogin} />);

    expect(screen.getByText('Already have an account? Log in')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Already have an account? Log in' }));
    expect(onGoToLogin).toHaveBeenCalledTimes(1);
  });

  it('does not render login link when onGoToLogin not provided', () => {
    renderWithStore(<SignupScreen />);

    expect(screen.queryByText('Already have an account? Log in')).toBeNull();
  });
});
