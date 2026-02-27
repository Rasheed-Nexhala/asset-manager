import {
  selectUserId,
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectUserDisplayName,
  selectUserRole,
  selectAuthError,
  selectIsAuthenticated,
} from '../authSelectors';
import type { RootState } from '../../index';

const createMockState = (auth: Partial<RootState['auth']>): RootState =>
  ({
    auth: {
      user: null,
      userRole: null,
      isAuthenticated: false,
      isLoading: false,
      isRoleLoading: false,
      authInitialized: false,
      error: null,
      ...auth,
    },
    sites: { sites: [], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
    inventory: { items: [], categories: [], inventoryByLocation: {}, lowStockItemIds: [], loading: false, error: null, errorTimestamp: null, filters: null },
    requests: { requests: [], myRequests: [], selectedRequest: null, loading: false, error: null, errorTimestamp: null, filters: { status: 'all', priority: 'all', siteId: 'all' } },
    steelMaster: { steelMasters: [], selectedSteelMaster: null, loading: false, error: null },
    maintenance: { maintenanceRecords: [], selectedMaintenance: null, filters: {}, loading: false, error: null },
    activityLog: { logs: [], hasMore: true, lastDoc: null, myRecentActivity: [], filters: {}, loading: false, loadingMore: false, exportLoading: false, myActivityLoading: false, error: null, errorTimestamp: null },
    purchaseOrders: { purchaseOrders: [], selectedPO: null, vendors: [], loading: false, error: null, filters: { status: 'all' } },
  }) as RootState;

describe('authSelectors', () => {
  it('selectUserId returns uid when user exists', () => {
    const state = createMockState({
      user: { uid: 'user123', email: 'a@b.com' } as never,
    });
    expect(selectUserId(state)).toBe('user123');
  });

  it('selectUserId returns null when no user', () => {
    const state = createMockState({});
    expect(selectUserId(state)).toBe(null);
  });

  it('selectIsAdmin returns true for Admin role', () => {
    const state = createMockState({
      userRole: { role: 'Admin', isActive: true, permissions: [] },
    });
    expect(selectIsAdmin(state)).toBe(true);
  });

  it('selectIsAdmin returns false for other roles', () => {
    const state = createMockState({
      userRole: { role: 'SiteManager', isActive: true, permissions: [] },
    });
    expect(selectIsAdmin(state)).toBe(false);
  });

  it('selectIsStoreIncharge returns true for StoreIncharge', () => {
    const state = createMockState({
      userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
    });
    expect(selectIsStoreIncharge(state)).toBe(true);
  });

  it('selectIsSiteManager returns true for SiteManager', () => {
    const state = createMockState({
      userRole: { role: 'SiteManager', isActive: true, permissions: [] },
    });
    expect(selectIsSiteManager(state)).toBe(true);
  });

  it('selectUserDisplayName returns displayName when present', () => {
    const state = createMockState({
      user: { displayName: 'John Doe', email: 'j@x.com' } as never,
    });
    expect(selectUserDisplayName(state)).toBe('John Doe');
  });

  it('selectUserDisplayName falls back to email', () => {
    const state = createMockState({
      user: { email: 'j@x.com' } as never,
    });
    expect(selectUserDisplayName(state)).toBe('j@x.com');
  });

  it('selectUserRole returns userRole', () => {
    const role = { role: 'Admin' as const, isActive: true, permissions: [] };
    const state = createMockState({ userRole: role });
    expect(selectUserRole(state)).toEqual(role);
  });

  it('selectAuthError returns error', () => {
    const state = createMockState({ error: 'Something failed' });
    expect(selectAuthError(state)).toBe('Something failed');
  });

  it('selectIsAuthenticated returns isAuthenticated', () => {
    const state = createMockState({ isAuthenticated: true });
    expect(selectIsAuthenticated(state)).toBe(true);
  });
});
