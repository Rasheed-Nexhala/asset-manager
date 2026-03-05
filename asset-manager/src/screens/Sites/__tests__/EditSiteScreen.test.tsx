/**
 * EditSiteScreen tests
 * Verifies loading state, form with site data, submit flow (updateSite, fetchSites, goBack), and back button.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { EditSiteScreen } from '../EditSiteScreen';
import { renderWithProviders } from '../../../__tests__/utils/renderWithProviders';
import type { Site, SiteFormData } from '../../../types/sites';

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
    fetchMyRecentActivity: createAsyncThunk('activityLog/fetchMy', async () => []),
    exportActivityLogsThunk: createAsyncThunk('activityLog/export', async () => null),
    subscribeToActivityLogsRealtime: () => () => {},
    subscribeToMyRecentActivityRealtime: () => () => {},
    unsubscribeFromActivityLogs: () => () => {},
    unsubscribeFromMyRecentActivity: () => () => {},
  };
});

const mockGoBack = jest.fn();
const mockUpdateSite = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: { siteId: 's1' } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../services/firebase/siteService', () => ({
  getSite: jest.fn(),
}));
const mockGetSite = require('../../../services/firebase/siteService').getSite as jest.Mock;

jest.mock('../../../store/thunks/sitesThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchSites: createAsyncThunk('sites/fetchSites', async () => []),
    createSite: createAsyncThunk('sites/createSite', async () => null),
    updateSite: createAsyncThunk(
      'sites/updateSite',
      async (arg: { siteId: string; formData: SiteFormData }) => {
        mockUpdateSite(arg);
        return { id: arg.siteId, ...arg.formData };
      }
    ),
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

const mockSite: Site = {
  id: 's1',
  name: 'Site Alpha',
  description: 'Main construction site',
  address: '123 Main St',
  contactNumber: '+1234567890',
  managerId: 'm1',
  managerName: 'Manager One',
  status: 'active',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const defaultSitesState = {
  sites: [mockSite],
  isLoading: false,
  error: null,
  searchQuery: '',
  validationLoading: false,
  lastValidationAt: null,
};

describe('EditSiteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSite.mockResolvedValue(mockSite);
  });

  it('shows loading when fetching site', async () => {
    let resolveGetSite: (value: Site | null) => void;
    const getSitePromise = new Promise<Site | null>((resolve) => {
      resolveGetSite = resolve;
    });
    mockGetSite.mockReturnValue(getSitePromise);

    renderWithProviders(<EditSiteScreen />, {
      preloadedState: { sites: defaultSitesState },
    });

    expect(screen.getByText('Loading site...')).toBeTruthy();
    expect(screen.getByText('Edit Site')).toBeTruthy();

    resolveGetSite!(mockSite);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Site Alpha')).toBeTruthy();
    });
  });

  it('renders form with site data when loaded', async () => {
    renderWithProviders(<EditSiteScreen />, {
      preloadedState: { sites: defaultSitesState },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Site Alpha')).toBeTruthy();
    });

    expect(screen.getByDisplayValue('123 Main St')).toBeTruthy();
    expect(screen.getByDisplayValue('Main construction site')).toBeTruthy();
    expect(screen.getByDisplayValue('+1234567890')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getByText('Edit Site')).toBeTruthy();
  });

  it('Submit dispatches updateSite and goBack', async () => {
    renderWithProviders(<EditSiteScreen />, {
      preloadedState: { sites: defaultSitesState },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Site Alpha')).toBeTruthy();
    });

    // Site name is read-only when editing — change address instead
    fireEvent.changeText(screen.getByPlaceholderText('Street, city'), '456 Oak Ave');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdateSite).toHaveBeenCalledWith({
        siteId: 's1',
        formData: expect.objectContaining({
          name: 'Site Alpha',
          address: '456 Oak Ave',
          status: 'active',
        }),
      });
    });
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('Back button calls goBack', async () => {
    renderWithProviders(<EditSiteScreen />, {
      preloadedState: { sites: defaultSitesState },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Site Alpha')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
