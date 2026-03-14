import {
  selectPurchaseOrders,
  selectSelectedPO,
  selectVendors,
  selectPurchaseOrderLoading,
  selectPurchaseOrderError,
  selectPurchaseOrderFilters,
  selectFilteredPurchaseOrders,
  selectFilteredPurchaseOrdersBySearchQuery,
  selectFilteredPurchaseOrdersForViewer,
  selectPendingApprovalCount,
  selectPOById,
} from '../purchaseOrderSelectors';
import type { RootState } from '../../index';

const createMockState = (
  purchaseOrders: Partial<RootState['purchaseOrders']>,
  auth?: Partial<RootState['auth']>
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
      ...auth,
    },
    sites: { sites: [], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
    inventory: { items: [], categories: [], inventoryByLocation: {}, lowStockItemIds: [], loading: false, error: null, errorTimestamp: null, filters: null },
    requests: { requests: [], myRequests: [], selectedRequest: null, loading: false, error: null, errorTimestamp: null, filters: { status: 'all', priority: 'all', siteId: 'all' } },
    steelMaster: { steelMasters: [], selectedSteelMaster: null, loading: false, error: null },
    maintenance: { maintenanceRecords: [], selectedMaintenance: null, filters: {}, loading: false, error: null },
    activityLog: { logs: [], hasMore: true, lastDoc: null, myRecentActivity: [], myActivityTotalCount: null, myActivityLastDoc: null, myActivityHasMore: false, myActivityLoadingMore: false, filters: {}, loading: false, loadingMore: false, exportLoading: false, myActivityLoading: false, error: null, errorTimestamp: null },
    purchaseOrders: {
      purchaseOrders: [],
      selectedPO: null,
      vendors: [],
      loading: false,
      error: null,
      filters: { status: 'all' },
      ...purchaseOrders,
    },
  }) as RootState;

const mockPO = (id: string, status: string) =>
  ({ id, poNumber: `PO-${id}`, status, vendorId: 'v1', vendorName: 'Vendor 1', items: [], totalAmount: 100 }) as never;

const mockVendor = (id: string, name: string) =>
  ({ id, name, contactPerson: '', phone: '', email: '' }) as never;

describe('purchaseOrderSelectors', () => {
  it('selectPurchaseOrders returns purchase orders', () => {
    const pos = [mockPO('1', 'draft'), mockPO('2', 'pending_approval')];
    const state = createMockState({ purchaseOrders: pos });
    expect(selectPurchaseOrders(state)).toEqual(pos);
  });

  it('selectSelectedPO returns selected PO', () => {
    const po = mockPO('sel1', 'draft');
    const state = createMockState({ selectedPO: po });
    expect(selectSelectedPO(state)).toEqual(po);
  });

  it('selectVendors returns vendors', () => {
    const vendors = [mockVendor('v1', 'Vendor A'), mockVendor('v2', 'Vendor B')];
    const state = createMockState({ vendors });
    expect(selectVendors(state)).toEqual(vendors);
  });

  it('selectPurchaseOrderLoading returns loading state', () => {
    const state = createMockState({ loading: true });
    expect(selectPurchaseOrderLoading(state)).toBe(true);
  });

  it('selectPurchaseOrderError returns error', () => {
    const state = createMockState({ error: 'Failed to fetch POs' });
    expect(selectPurchaseOrderError(state)).toBe('Failed to fetch POs');
  });

  it('selectPurchaseOrderFilters returns filters', () => {
    const state = createMockState({ filters: { status: 'pending_approval' } });
    expect(selectPurchaseOrderFilters(state).status).toBe('pending_approval');
  });

  it('selectFilteredPurchaseOrders returns all when status is all', () => {
    const pos = [mockPO('1', 'draft'), mockPO('2', 'pending_approval')];
    const state = createMockState({ purchaseOrders: pos, filters: { status: 'all' } });
    expect(selectFilteredPurchaseOrders(state)).toHaveLength(2);
  });

  it('selectFilteredPurchaseOrders filters by status', () => {
    const pos = [
      mockPO('1', 'draft'),
      mockPO('2', 'pending_approval'),
      mockPO('3', 'pending_approval'),
    ];
    const state = createMockState({
      purchaseOrders: pos,
      filters: { status: 'pending_approval' },
    });
    const result = selectFilteredPurchaseOrders(state);
    expect(result).toHaveLength(2);
    expect(result.every((o) => o.status === 'pending_approval')).toBe(true);
  });

  it('selectFilteredPurchaseOrdersBySearchQuery returns all when search is empty', () => {
    const pos = [mockPO('1', 'draft'), mockPO('2', 'pending_approval')];
    const state = createMockState({ purchaseOrders: pos, filters: { status: 'all' } });
    expect(selectFilteredPurchaseOrdersBySearchQuery(state, '')).toHaveLength(2);
    expect(selectFilteredPurchaseOrdersBySearchQuery(state, '   ')).toHaveLength(2);
  });

  it('selectFilteredPurchaseOrdersBySearchQuery filters by poNumber', () => {
    const pos = [
      { ...mockPO('1', 'draft'), poNumber: 'PO-2025-0001', vendorName: 'Acme' },
      { ...mockPO('2', 'draft'), poNumber: 'PO-2025-0002', vendorName: 'Beta' },
    ];
    const state = createMockState({ purchaseOrders: pos, filters: { status: 'all' } });
    const result = selectFilteredPurchaseOrdersBySearchQuery(state, '0001');
    expect(result).toHaveLength(1);
    expect(result[0].poNumber).toBe('PO-2025-0001');
  });

  it('selectFilteredPurchaseOrdersBySearchQuery filters by vendorName', () => {
    const pos = [
      { ...mockPO('1', 'draft'), vendorName: 'Steel Suppliers Ltd' },
      { ...mockPO('2', 'draft'), vendorName: 'Concrete Co' },
    ];
    const state = createMockState({ purchaseOrders: pos, filters: { status: 'all' } });
    const result = selectFilteredPurchaseOrdersBySearchQuery(state, 'Steel');
    expect(result).toHaveLength(1);
    expect(result[0].vendorName).toBe('Steel Suppliers Ltd');
  });

  it('selectFilteredPurchaseOrdersBySearchQuery filters by item name', () => {
    const pos = [
      { ...mockPO('1', 'draft'), items: [{ itemName: 'Steel Beam', itemSku: 'SB-001' }] },
      { ...mockPO('2', 'draft'), items: [{ itemName: 'Concrete Mix', itemSku: 'CM-001' }] },
    ];
    const state = createMockState({ purchaseOrders: pos, filters: { status: 'all' } });
    const result = selectFilteredPurchaseOrdersBySearchQuery(state, 'Beam');
    expect(result).toHaveLength(1);
    expect(result[0].items[0].itemName).toBe('Steel Beam');
  });

  it('selectFilteredPurchaseOrdersBySearchQuery filters by item SKU', () => {
    const pos = [
      { ...mockPO('1', 'draft'), items: [{ itemName: 'Steel Beam', itemSku: 'SB-001' }] },
      { ...mockPO('2', 'draft'), items: [{ itemName: 'Concrete Mix', itemSku: 'CM-001' }] },
    ];
    const state = createMockState({ purchaseOrders: pos, filters: { status: 'all' } });
    const result = selectFilteredPurchaseOrdersBySearchQuery(state, 'CM-001');
    expect(result).toHaveLength(1);
    expect(result[0].items[0].itemSku).toBe('CM-001');
  });

  it('selectFilteredPurchaseOrdersForViewer shows only own drafts (filters others drafts)', () => {
    const pos = [
      { ...mockPO('1', 'draft'), createdBy: 'userA' },
      { ...mockPO('2', 'draft'), createdBy: 'userB' },
      { ...mockPO('3', 'pending_approval'), createdBy: 'userB' },
    ];
    const state = createMockState(
      { purchaseOrders: pos, filters: { status: 'all' } },
      { user: { uid: 'userA', email: null } }
    );
    const result = selectFilteredPurchaseOrdersForViewer(state, '');
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.id)).toEqual(['1', '3']);
  });

  it('selectFilteredPurchaseOrdersForViewer shows all non-draft POs regardless of creator', () => {
    const pos = [
      { ...mockPO('1', 'pending_approval'), createdBy: 'userA' },
      { ...mockPO('2', 'approved'), createdBy: 'userB' },
    ];
    const state = createMockState(
      { purchaseOrders: pos, filters: { status: 'all' } },
      { user: { uid: 'userC', email: null } }
    );
    const result = selectFilteredPurchaseOrdersForViewer(state, '');
    expect(result).toHaveLength(2);
  });

  it('selectFilteredPurchaseOrdersForViewer returns all when no userId', () => {
    const pos = [mockPO('1', 'draft'), mockPO('2', 'pending_approval')];
    const state = createMockState({ purchaseOrders: pos, filters: { status: 'all' } });
    const result = selectFilteredPurchaseOrdersForViewer(state, '');
    expect(result).toHaveLength(2);
  });

  it('selectPendingApprovalCount returns count of pending_approval POs', () => {
    const pos = [
      mockPO('1', 'pending_approval'),
      mockPO('2', 'pending_approval'),
      mockPO('3', 'draft'),
    ];
    const state = createMockState({ purchaseOrders: pos });
    expect(selectPendingApprovalCount(state)).toBe(2);
  });

  it('selectPOById finds PO from purchaseOrders', () => {
    const po = mockPO('po1', 'draft');
    const state = createMockState({ purchaseOrders: [po, mockPO('po2', 'draft')] });
    const selector = selectPOById('po1');
    expect(selector(state)).toEqual(po);
  });

  it('selectPOById finds PO from selectedPO', () => {
    const po = mockPO('selected1', 'draft');
    const state = createMockState({ selectedPO: po, purchaseOrders: [] });
    const selector = selectPOById('selected1');
    expect(selector(state)).toEqual(po);
  });

  it('selectPOById returns null when not found', () => {
    const state = createMockState({ purchaseOrders: [mockPO('po1', 'draft')] });
    const selector = selectPOById('missing');
    expect(selector(state)).toBeNull();
  });
});
