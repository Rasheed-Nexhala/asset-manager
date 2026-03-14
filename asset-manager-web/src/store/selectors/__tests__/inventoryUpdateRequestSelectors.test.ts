import {
  selectMyAccessGrantedUntil,
  selectPendingRequests,
  selectActiveApprovedRequests,
  selectInventoryUpdateRequestLoading,
  selectInventoryUpdateRequestError,
  selectCanStoreInchargeAdjustInventory,
} from '../inventoryUpdateRequestSelectors';
import type { RootState } from '../../index';

const createMockState = (
  inventoryUpdateRequest: Partial<RootState['inventoryUpdateRequest']>
): RootState =>
  ({
    auth: {
      user: null,
      userRole: null,
      isAuthenticated: false,
      isLoading: false,
      isRoleLoading: false,
      authInitialized: false,
      error: null,
    },
    sites: {
      sites: [],
      isLoading: false,
      error: null,
      searchQuery: '',
      validationLoading: false,
      lastValidationAt: null,
    },
    inventory: {
      items: [],
      categories: [],
      inventoryByLocation: {},
      lowStockItemIds: [],
      loading: false,
      error: null,
      errorTimestamp: null,
      filters: null,
    },
    requests: {
      requests: [],
      myRequests: [],
      selectedRequest: null,
      loading: false,
      error: null,
      errorTimestamp: null,
      filters: { status: 'all', priority: 'all', siteId: 'all' },
    },
    steelMaster: {
      steelMasters: [],
      selectedSteelMaster: null,
      loading: false,
      error: null,
    },
    maintenance: {
      maintenanceRecords: [],
      selectedMaintenance: null,
      filters: { status: 'all' },
      loading: false,
      error: null,
    },
    activityLog: {
      logs: [],
      hasMore: true,
      lastDoc: null,
      myRecentActivity: [],
      filters: {},
      loading: false,
      loadingMore: false,
      exportLoading: false,
      myActivityLoading: false,
      error: null,
      errorTimestamp: null,
    },
    purchaseOrders: {
      purchaseOrders: [],
      selectedPO: null,
      vendors: [],
      loading: false,
      error: null,
      filters: { status: 'all' },
    },
    inventoryUpdateRequest: {
      myAccessGrantedUntil: null,
      pendingRequests: [],
      activeApprovedRequests: [],
      loading: false,
      error: null,
      ...inventoryUpdateRequest,
    },
  }) as RootState;

const mockRequest = {
  id: 'req1',
  requestedBy: 'u1',
  requestedByName: 'User',
  requestedByRole: 'StoreIncharge',
  reason: 'test',
  status: 'pending' as const,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('inventoryUpdateRequestSelectors', () => {
  it('selectMyAccessGrantedUntil returns value', () => {
    const state = createMockState({ myAccessGrantedUntil: '2025-12-31T23:59:59Z' });
    expect(selectMyAccessGrantedUntil(state)).toBe('2025-12-31T23:59:59Z');
  });

  it('selectPendingRequests returns array', () => {
    const requests = [mockRequest];
    const state = createMockState({ pendingRequests: requests });
    expect(selectPendingRequests(state)).toEqual(requests);
  });

  it('selectActiveApprovedRequests returns array', () => {
    const requests = [mockRequest];
    const state = createMockState({ activeApprovedRequests: requests });
    expect(selectActiveApprovedRequests(state)).toEqual(requests);
  });

  it('selectInventoryUpdateRequestLoading returns loading', () => {
    const state = createMockState({ loading: true });
    expect(selectInventoryUpdateRequestLoading(state)).toBe(true);
  });

  it('selectInventoryUpdateRequestError returns error', () => {
    const state = createMockState({ error: 'Load failed' });
    expect(selectInventoryUpdateRequestError(state)).toBe('Load failed');
  });

  it('selectCanStoreInchargeAdjustInventory returns true when myAccessGrantedUntil is future date', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const state = createMockState({ myAccessGrantedUntil: futureDate.toISOString() });
    expect(selectCanStoreInchargeAdjustInventory(state)).toBe(true);
  });

  it('selectCanStoreInchargeAdjustInventory returns false when myAccessGrantedUntil is null', () => {
    const state = createMockState({ myAccessGrantedUntil: null });
    expect(selectCanStoreInchargeAdjustInventory(state)).toBe(false);
  });

  it('selectCanStoreInchargeAdjustInventory returns false when myAccessGrantedUntil is past date', () => {
    const pastDate = '2020-01-01T00:00:00Z';
    const state = createMockState({ myAccessGrantedUntil: pastDate });
    expect(selectCanStoreInchargeAdjustInventory(state)).toBe(false);
  });
});
