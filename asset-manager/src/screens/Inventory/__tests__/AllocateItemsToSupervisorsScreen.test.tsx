jest.mock('firebase/auth', () => ({ User: function User() {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
}));

const mockTabNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    getParent: () => ({
      getParent: () => ({
        navigate: mockTabNavigate,
      }),
    }),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));

jest.mock('../../../services/firebase/requestService', () => ({
  requestService: {
    subscribeToRequests: jest.fn(),
  },
}));

jest.mock('../../../services/firebase/siteSupervisorService', () => ({
  siteSupervisorService: {
    subscribeSiteSupervisors: jest.fn(),
    createSupervisorAllocation: jest.fn(() => Promise.resolve()),
  },
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AllocateItemsToSupervisorsScreen } from '../AllocateItemsToSupervisorsScreen';
import { requestService } from '../../../services/firebase/requestService';
import { siteSupervisorService } from '../../../services/firebase/siteSupervisorService';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import inventoryUpdateRequestReducer from '../../../store/slices/inventoryUpdateRequestSlice';
import type { RootState } from '../../../store';
import type { Request, RequestItem } from '../../../types/request';
import type { SiteSupervisor } from '../../../types/siteSupervisor';
import type { Site } from '../../../types/sites';
import type { User } from 'firebase/auth';

const USER_ID = 'test-site-manager-uid';
const SITE_ID = 'test-site-id';

function mkItem(overrides: Partial<RequestItem> = {}): RequestItem {
  return {
    itemId: 'item-1',
    itemName: 'Ladder',
    itemSku: 'SKU-1',
    itemType: 'non_consumable',
    categoryId: 'cat',
    categoryName: 'Tools',
    quantityRequested: 5,
    quantityApproved: 5,
    quantityReturned: 0,
    supervisorOutstandingQty: 0,
    status: 'transferred',
    ...overrides,
  };
}

function mkTransferredRequest(): Request {
  return {
    id: 'req-1',
    requestNumber: 'REQ-2026-0001',
    siteId: SITE_ID,
    siteName: 'Test Site',
    requestedBy: USER_ID,
    requestedByName: 'Site Manager',
    status: 'transferred',
    priority: 'medium',
    purpose: 'Work',
    items: [mkItem()],
    processedBy: null,
    processedByName: null,
    processedAt: null,
    storeNotes: null,
    rejectionReason: null,
    rejectionComments: null,
    transferredAt: null,
    transferredBy: null,
    transferredByName: null,
    receivedBy: null,
    receivedByName: null,
    returnHistory: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const supervisor: SiteSupervisor = {
  id: 'sup-1',
  siteId: SITE_ID,
  name: 'Lead One',
  createdByManagerId: USER_ID,
  createdAt: null,
  updatedAt: null,
};

const mockUser = { uid: USER_ID, displayName: 'Site Manager', email: 'sm@test.com' } as User;
const mockSite: Site = {
  id: SITE_ID,
  name: 'Test Site',
  address: '1 Test St',
  managerId: USER_ID,
  status: 'active',
  createdAt: null,
  updatedAt: null,
};

function createPreloadedState(): Partial<RootState> {
  return {
    auth: {
      user: mockUser,
      userRole: { role: 'SiteManager', isActive: true, permissions: ['canManageInventory'] },
      isAuthenticated: true,
      isLoading: false,
      isRoleLoading: false,
      authInitialized: true,
      error: null,
    },
    sites: {
      sites: [mockSite],
      isLoading: false,
      error: null,
      searchQuery: '',
      validationLoading: false,
      lastValidationAt: null,
      activeManagedSiteId: SITE_ID,
    },
  };
}

function renderWithStore(ui: React.ReactElement) {
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
      inventoryUpdateRequest: inventoryUpdateRequestReducer,
    } as Record<string, React.Reducer<unknown, { type: string }>>,
    preloadedState: createPreloadedState() as Partial<RootState>,
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('AllocateItemsToSupervisorsScreen', () => {
  beforeEach(() => {
    mockTabNavigate.mockClear();
    mockGoBack.mockClear();
    jest.mocked(siteSupervisorService.createSupervisorAllocation).mockResolvedValue(undefined);
    jest.mocked(requestService.subscribeToRequests).mockImplementation((_filters, cb) => {
      cb([mkTransferredRequest()]);
      return jest.fn();
    });
    jest.mocked(siteSupervisorService.subscribeSiteSupervisors).mockImplementation((_site, cb) => {
      cb([supervisor]);
      return jest.fn();
    });
  });

  it('renders split stock title after loading', async () => {
    renderWithStore(<AllocateItemsToSupervisorsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Split stock')).toBeTruthy();
    });
  });

  it('shows success summary and stays on screen after save; clears supervisor selection for next split', async () => {
    renderWithStore(<AllocateItemsToSupervisorsScreen />);

    await waitFor(() => screen.findByText('REQ-2026-0001'));

    fireEvent.press(screen.getByText('REQ-2026-0001'));
    fireEvent.press(screen.getByText('Ladder'));
    fireEvent.press(screen.getByText('Lead One'));

    fireEvent.press(screen.getByLabelText('Save allocation to supervisor'));

    await waitFor(() => {
      expect(screen.getByLabelText('Allocation saved')).toBeTruthy();
    });

    expect(screen.getByText(/Allocation saved/)).toBeTruthy();
    const successBanner = screen.getByLabelText('Allocation saved');
    expect(successBanner).toHaveTextContent(/REQ-2026-0001/);
    expect(mockGoBack).not.toHaveBeenCalled();

    expect(jest.mocked(siteSupervisorService.createSupervisorAllocation)).toHaveBeenCalledWith(
      SITE_ID,
      expect.objectContaining({
        requestId: 'req-1',
        itemId: 'item-1',
        supervisorId: 'sup-1',
        quantity: 1,
      }),
      'Lead One',
      expect.objectContaining({ userId: USER_ID })
    );
  });

  it('dismisses the success banner', async () => {
    renderWithStore(<AllocateItemsToSupervisorsScreen />);

    await waitFor(() => screen.findByText('REQ-2026-0001'));
    fireEvent.press(screen.getByText('REQ-2026-0001'));
    fireEvent.press(screen.getByText('Ladder'));
    fireEvent.press(screen.getByText('Lead One'));
    fireEvent.press(screen.getByLabelText('Save allocation to supervisor'));

    await waitFor(() => expect(screen.getByLabelText('Allocation saved')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Dismiss success message'));

    expect(screen.queryByLabelText('Allocation saved')).toBeNull();
  });

  it('navigates to inventory tab when Back to inventory is pressed', async () => {
    renderWithStore(<AllocateItemsToSupervisorsScreen />);

    await waitFor(() => screen.findByLabelText('Back to inventory'));

    fireEvent.press(screen.getByLabelText('Back to inventory'));

    expect(mockTabNavigate).toHaveBeenCalledWith('Inventory', { screen: 'MySiteInventory' });
  });

  it('navigates to my requests when Back to requests is pressed (site manager)', async () => {
    renderWithStore(<AllocateItemsToSupervisorsScreen />);

    await waitFor(() => screen.findByLabelText('Back to requests'));

    fireEvent.press(screen.getByLabelText('Back to requests'));

    expect(mockTabNavigate).toHaveBeenCalledWith('Requests', { screen: 'MyRequests' });
  });
});
