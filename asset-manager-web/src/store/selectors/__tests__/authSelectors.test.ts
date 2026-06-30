import { describe, it, expect } from 'vitest';
import {
  selectUserId,
  selectIsAdmin,
  selectIsSuperAdmin,
  selectIsAdminOrSuperAdmin,
  selectCanManageRequests,
  selectCanViewRequestQueue,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectUserDisplayName,
  selectUserRole,
  selectAuthError,
  selectIsAuthenticated,
  selectCanCreatePurchaseOrder,
  selectCanReceivePurchaseOrder,
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

  it('selectUserDisplayName prefers userRole.displayName over user.displayName', () => {
    const state = createMockState({
      user: { displayName: 'John Firebase', email: 'j@x.com' } as never,
      userRole: { role: 'Admin', isActive: true, permissions: [], displayName: 'John Firestore' },
    });
    expect(selectUserDisplayName(state)).toBe('John Firestore');
  });

  it('selectUserDisplayName falls back to user.displayName if userRole.displayName is missing', () => {
    const state = createMockState({
      user: { displayName: 'John Firebase', email: 'j@x.com' } as never,
      userRole: { role: 'Admin', isActive: true, permissions: [] },
    });
    expect(selectUserDisplayName(state)).toBe('John Firebase');
  });

  it('selectUserDisplayName falls back to email if neither displayName is present', () => {
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

  it('selectCanCreatePurchaseOrder is true for Store Incharge', () => {
    const state = createMockState({
      userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
    });
    expect(selectCanCreatePurchaseOrder(state)).toBe(true);
  });

  it('selectIsSuperAdmin is true for SuperAdmin role', () => {
    const state = createMockState({
      userRole: { role: 'SuperAdmin', isActive: true, permissions: [] },
    });
    expect(selectIsSuperAdmin(state)).toBe(true);
    expect(selectIsAdmin(state)).toBe(false);
  });

  it('selectIsAdminOrSuperAdmin is true for Admin and SuperAdmin', () => {
    expect(
      selectIsAdminOrSuperAdmin(
        createMockState({
          userRole: { role: 'Admin', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectIsAdminOrSuperAdmin(
        createMockState({
          userRole: { role: 'SuperAdmin', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectIsAdminOrSuperAdmin(
        createMockState({
          userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
        })
      )
    ).toBe(false);
  });

  it('selectCanViewRequestQueue is true for Admin, SuperAdmin, and StoreIncharge', () => {
    expect(
      selectCanViewRequestQueue(
        createMockState({
          userRole: { role: 'Admin', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectCanViewRequestQueue(
        createMockState({
          userRole: { role: 'SuperAdmin', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectCanViewRequestQueue(
        createMockState({
          userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectCanViewRequestQueue(
        createMockState({
          userRole: { role: 'SiteManager', isActive: true, permissions: [] },
        })
      )
    ).toBe(false);
  });

  it('selectCanManageRequests is true for StoreIncharge and SuperAdmin only', () => {
    expect(
      selectCanManageRequests(
        createMockState({
          userRole: { role: 'Admin', isActive: true, permissions: [] },
        })
      )
    ).toBe(false);
    expect(
      selectCanManageRequests(
        createMockState({
          userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectCanManageRequests(
        createMockState({
          userRole: { role: 'SuperAdmin', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectCanManageRequests(
        createMockState({
          userRole: { role: 'SiteManager', isActive: true, permissions: [] },
        })
      )
    ).toBe(false);
  });

  it('selectCanCreatePurchaseOrder is true for SuperAdmin role', () => {
    const state = createMockState({
      userRole: { role: 'SuperAdmin', isActive: true, permissions: [] },
    });
    expect(selectCanCreatePurchaseOrder(state)).toBe(true);
  });

  it('selectCanCreatePurchaseOrder is false for Admin without super flag', () => {
    const state = createMockState({
      userRole: { role: 'Admin', isActive: true, permissions: [] },
    });
    expect(selectCanCreatePurchaseOrder(state)).toBe(false);
  });

  it('selectCanReceivePurchaseOrder matches create PO roles (Store Incharge, SuperAdmin)', () => {
    expect(
      selectCanReceivePurchaseOrder(
        createMockState({
          userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectCanReceivePurchaseOrder(
        createMockState({
          userRole: { role: 'SuperAdmin', isActive: true, permissions: [] },
        })
      )
    ).toBe(true);
    expect(
      selectCanReceivePurchaseOrder(
        createMockState({
          userRole: { role: 'Admin', isActive: true, permissions: [] },
        })
      )
    ).toBe(false);
  });
});
