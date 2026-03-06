/**
 * AddSiteScreen tests
 * Verifies header, form, cancel/back navigation, submit flow, and error banner.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AddSiteScreen } from '../AddSiteScreen';
import { renderWithProviders } from '../../../__tests__/utils/renderWithProviders';
import type { SiteFormData } from '../../../types/sites';

// Mock components barrel to avoid loading Firebase-dependent components
jest.mock('../../../components', () => ({
  ScreenHeader: require('../../../components/ScreenHeader').ScreenHeader,
  ScreenLayout: require('../../../components/layout/ScreenLayout').ScreenLayout,
  SiteForm: require('../../../components/Sites/SiteForm').SiteForm,
}));

jest.mock('../../../store/thunks/managerValidationThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    cleanupManagerAssignments: createAsyncThunk('managerValidation/cleanup', async () => ({
      sitesUpdated: 0,
      managerId: 'm1',
    })),
    validateAllManagerAssignments: createAsyncThunk('managerValidation/validateAll', async () => ({
      sitesUpdated: 0,
      managersCleaned: [],
    })),
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
    fetchMyActivityPaginated: createAsyncThunk('activityLog/fetchMyActivityPaginated', async () => ({ logs: [], totalCount: 0, lastDoc: null, pageSize: 10 })),
    loadMoreMyActivity: createAsyncThunk('activityLog/loadMoreMyActivity', async () => ({ logs: [], lastDoc: null, pageSize: 10 })),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
  };
});

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockCreateSite = jest.fn();
jest.mock('../../../store/thunks/sitesThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSites: createAsyncThunk('sites/fetchSites', async () => []),
    createSite: createAsyncThunk(
      'sites/createSite',
      async (formData: SiteFormData) => {
        mockCreateSite(formData);
        return 'mock-site-id';
      }
    ),
    updateSite: createAsyncThunk('sites/updateSite', async () => null),
  };
});

jest.mock('../../../components/Sites/SiteManagerSelector', () => ({
  SiteManagerSelector: () => null,
}));
jest.mock('../../../components/Sites/ManagerReassignmentConfirmationModal', () => ({
  ManagerReassignmentConfirmationModal: () => null,
}));
jest.mock('../../../services/firebase/userRoleService', () => ({
  getAllUsers: jest.fn().mockResolvedValue([
    { id: 'manager-1', displayName: 'John Manager', email: 'john@example.com' },
  ]),
}));

const defaultSitesState = {
  sites: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  validationLoading: false,
  lastValidationAt: null,
};

describe('AddSiteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header "Add New Site" and SiteForm', () => {
    renderWithProviders(<AddSiteScreen />, {
      preloadedState: { sites: defaultSitesState },
    });

    expect(screen.getByText('Add New Site')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Site A')).toBeTruthy();
    expect(screen.getByPlaceholderText('Street, city')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('Cancel button calls goBack', () => {
    renderWithProviders(<AddSiteScreen />, {
      preloadedState: { sites: defaultSitesState },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Cancel adding site' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('Submit with valid data dispatches createSite and goBack', async () => {
    renderWithProviders(<AddSiteScreen />, {
      preloadedState: { sites: defaultSitesState },
    });

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Site A'), 'Site Beta');
    fireEvent.changeText(screen.getByPlaceholderText('Street, city'), '456 Oak Ave');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreateSite).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Site Beta',
          address: '456 Oak Ave',
          status: 'active',
        })
      );
    });
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('Error banner shows when selectSitesError has value', () => {
    renderWithProviders(<AddSiteScreen />, {
      preloadedState: {
        sites: {
          ...defaultSitesState,
          error: 'Failed to create site',
        },
      },
    });

    expect(screen.getByText('Failed to create site')).toBeTruthy();
    expect(screen.getByLabelText('Failed to create site')).toBeTruthy();
  });

  it('Back button calls goBack', () => {
    renderWithProviders(<AddSiteScreen />, {
      preloadedState: { sites: defaultSitesState },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
