import {
  selectAllRequests,
  selectMyRequests,
  selectSelectedRequest,
  selectRequestsFilters,
  selectRequestById,
  selectFilteredRequests,
  selectPendingRequestsCount,
  selectHighPriorityPendingCount,
} from '../requestSelectors';
import type { RootState } from '../../index';

const createMockState = (requests: Partial<RootState['requests']>): RootState =>
  ({
    auth: { user: null, userRole: null, isAuthenticated: false, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
    sites: { sites: [], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
    inventory: { items: [], categories: [], inventoryByLocation: {}, lowStockItemIds: [], loading: false, error: null, errorTimestamp: null, filters: null },
    requests: {
      requests: [],
      myRequests: [],
      selectedRequest: null,
      loading: false,
      error: null,
      errorTimestamp: null,
      filters: { status: 'all', priority: 'all', siteId: 'all' },
      ...requests,
    },
    steelMaster: { steelMasters: [], selectedSteelMaster: null, loading: false, error: null },
    maintenance: { maintenanceRecords: [], selectedMaintenance: null, filters: {}, loading: false, error: null },
    activityLog: { logs: [], hasMore: true, lastDoc: null, myRecentActivity: [], filters: {}, loading: false, loadingMore: false, exportLoading: false, myActivityLoading: false, error: null, errorTimestamp: null },
    purchaseOrders: { purchaseOrders: [], selectedPO: null, vendors: [], loading: false, error: null, filters: { status: 'all' } },
  }) as RootState;

const mockRequest = (id: string, status: string, priority: string, siteId: string) =>
  ({ id, requestNumber: `R${id}`, status, priority, siteId, items: [] });

describe('requestSelectors', () => {
  it('selectAllRequests returns requests', () => {
    const reqs = [mockRequest('1', 'pending', 'high', 'site1')];
    const state = createMockState({ requests: reqs as never[] });
    expect(selectAllRequests(state)).toEqual(reqs);
  });

  it('selectMyRequests returns myRequests', () => {
    const reqs = [mockRequest('1', 'draft', 'low', 'site1')];
    const state = createMockState({ myRequests: reqs as never[] });
    expect(selectMyRequests(state)).toEqual(reqs);
  });

  it('selectSelectedRequest returns selectedRequest', () => {
    const req = mockRequest('1', 'pending', 'high', 'site1');
    const state = createMockState({ selectedRequest: req as never });
    expect(selectSelectedRequest(state)).toEqual(req);
  });

  it('selectRequestsFilters returns filters', () => {
    const state = createMockState({ filters: { status: 'pending', priority: 'all', siteId: 'all' } });
    expect(selectRequestsFilters(state).status).toBe('pending');
  });

  it('selectRequestById finds request from requests', () => {
    const req = mockRequest('req1', 'pending', 'high', 'site1');
    const state = createMockState({ requests: [req] as never[] });
    const selector = selectRequestById('req1');
    expect(selector(state)).toEqual(req);
  });

  it('selectRequestById finds request from myRequests', () => {
    const req = mockRequest('req1', 'draft', 'low', 'site1');
    const state = createMockState({ myRequests: [req] as never[] });
    const selector = selectRequestById('req1');
    expect(selector(state)).toEqual(req);
  });

  it('selectFilteredRequests filters by status', () => {
    const reqs = [
      mockRequest('1', 'pending', 'high', 'site1'),
      mockRequest('2', 'approved', 'high', 'site1'),
    ];
    const state = createMockState({
      requests: reqs as never[],
      filters: { status: 'pending', priority: 'all', siteId: 'all' },
    });
    const result = selectFilteredRequests(state);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
  });

  it('selectPendingRequestsCount returns count of pending', () => {
    const reqs = [
      mockRequest('1', 'pending', 'high', 'site1'),
      mockRequest('2', 'pending', 'low', 'site1'),
      mockRequest('3', 'approved', 'high', 'site1'),
    ];
    const state = createMockState({ requests: reqs as never[] });
    expect(selectPendingRequestsCount(state)).toBe(2);
  });

  it('selectHighPriorityPendingCount returns count of high priority pending', () => {
    const reqs = [
      mockRequest('1', 'pending', 'high', 'site1'),
      mockRequest('2', 'pending', 'low', 'site1'),
    ];
    const state = createMockState({ requests: reqs as never[] });
    expect(selectHighPriorityPendingCount(state)).toBe(1);
  });
});
