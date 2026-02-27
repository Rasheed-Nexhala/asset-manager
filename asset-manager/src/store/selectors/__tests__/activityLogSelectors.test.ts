import {
  selectActivityLogs,
  selectMyRecentActivity,
  selectMyRecentActivitySorted,
  selectActivityLogFilters,
  selectActivityLogLoading,
  selectActivityLogLoadingMore,
  selectActivityLogExportLoading,
  selectMyActivityLoading,
  selectActivityLogError,
  selectHasMoreLogs,
  selectLogsByCategory,
  selectLogsByUser,
  selectActivityLogStats,
} from '../activityLogSelectors';
import type { RootState } from '../../index';

const createMockState = (activityLog: Partial<RootState['activityLog']>): RootState =>
  ({
    auth: { user: null, userRole: null, isAuthenticated: false, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
    sites: { sites: [], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
    inventory: { items: [], categories: [], inventoryByLocation: {}, lowStockItemIds: [], loading: false, error: null, errorTimestamp: null, filters: null },
    requests: { requests: [], myRequests: [], selectedRequest: null, loading: false, error: null, errorTimestamp: null, filters: { status: 'all', priority: 'all', siteId: 'all' } },
    steelMaster: { steelMasters: [], selectedSteelMaster: null, loading: false, error: null },
    maintenance: { maintenanceRecords: [], selectedMaintenance: null, filters: {}, loading: false, error: null },
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
      ...activityLog,
    },
    purchaseOrders: { purchaseOrders: [], selectedPO: null, vendors: [], loading: false, error: null, filters: { status: 'all' } },
  }) as RootState;

const mockLog = (id: string, overrides: Partial<{ actionCategory: string; userId: string; timestamp: string }> = {}) =>
  ({
    id,
    actionCategory: 'inventory',
    userId: 'user1',
    timestamp: '2024-01-01T12:00:00Z',
    action: 'add',
    ...overrides,
  }) as never;

describe('activityLogSelectors', () => {
  it('selectActivityLogs returns logs', () => {
    const logs = [mockLog('1'), mockLog('2')];
    const state = createMockState({ logs });
    expect(selectActivityLogs(state)).toEqual(logs);
  });

  it('selectMyRecentActivity returns my recent activity', () => {
    const activity = [mockLog('a1'), mockLog('a2')];
    const state = createMockState({ myRecentActivity: activity });
    expect(selectMyRecentActivity(state)).toEqual(activity);
  });

  it('selectMyRecentActivitySorted returns sorted by timestamp desc', () => {
    const activity = [
      mockLog('1', { timestamp: '2024-01-01T10:00:00Z' }),
      mockLog('2', { timestamp: '2024-01-01T12:00:00Z' }),
      mockLog('3', { timestamp: '2024-01-01T11:00:00Z' }),
    ];
    const state = createMockState({ myRecentActivity: activity });
    const result = selectMyRecentActivitySorted(state);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('1');
  });

  it('selectActivityLogFilters returns filters', () => {
    const filters = { category: 'inventory', startDate: '2024-01-01', endDate: '2024-01-31' };
    const state = createMockState({ filters });
    expect(selectActivityLogFilters(state)).toEqual(filters);
  });

  it('selectActivityLogLoading returns loading state', () => {
    const state = createMockState({ loading: true });
    expect(selectActivityLogLoading(state)).toBe(true);
  });

  it('selectActivityLogLoadingMore returns loadingMore state', () => {
    const state = createMockState({ loadingMore: true });
    expect(selectActivityLogLoadingMore(state)).toBe(true);
  });

  it('selectActivityLogExportLoading returns exportLoading state', () => {
    const state = createMockState({ exportLoading: true });
    expect(selectActivityLogExportLoading(state)).toBe(true);
  });

  it('selectMyActivityLoading returns myActivityLoading state', () => {
    const state = createMockState({ myActivityLoading: true });
    expect(selectMyActivityLoading(state)).toBe(true);
  });

  it('selectActivityLogError returns error', () => {
    const state = createMockState({ error: 'Export failed' });
    expect(selectActivityLogError(state)).toBe('Export failed');
  });

  it('selectHasMoreLogs returns hasMore', () => {
    const state = createMockState({ hasMore: false });
    expect(selectHasMoreLogs(state)).toBe(false);
  });

  it('selectLogsByCategory filters by category', () => {
    const logs = [
      mockLog('1', { actionCategory: 'inventory' }),
      mockLog('2', { actionCategory: 'request' }),
      mockLog('3', { actionCategory: 'inventory' }),
    ];
    const state = createMockState({ logs });
    const selector = selectLogsByCategory('inventory');
    const result = selector(state);
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.actionCategory === 'inventory')).toBe(true);
  });

  it('selectLogsByUser filters by userId', () => {
    const logs = [
      mockLog('1', { userId: 'user1' }),
      mockLog('2', { userId: 'user2' }),
      mockLog('3', { userId: 'user1' }),
    ];
    const state = createMockState({ logs });
    const selector = selectLogsByUser('user1');
    const result = selector(state);
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.userId === 'user1')).toBe(true);
  });

  it('selectActivityLogStats returns total and byCategory', () => {
    const logs = [
      mockLog('1', { actionCategory: 'inventory' }),
      mockLog('2', { actionCategory: 'inventory' }),
      mockLog('3', { actionCategory: 'request' }),
    ];
    const state = createMockState({ logs });
    const stats = selectActivityLogStats(state);
    expect(stats.total).toBe(3);
    expect(stats.byCategory?.inventory).toBe(2);
    expect(stats.byCategory?.request).toBe(1);
  });
});
