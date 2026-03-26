import {
  selectMaintenanceRecords,
  selectSelectedMaintenance,
  selectMaintenanceLoading,
  selectMaintenanceError,
  selectMaintenanceFilters,
  selectActiveMaintenanceRecords,
  selectWrittenOffRecords,
  selectReturnedRecords,
  selectMaintenanceHistory,
  selectMaintenanceByItemId,
  selectFilteredMaintenanceRecords,
  selectMaintenanceStats,
  selectMaintenanceByStatus,
  selectMaintenanceById,
  selectWrittenOffRegisterRecords,
} from '../maintenanceSelectors';
import type { RootState } from '../../index';

const createMockState = (maintenance: Partial<RootState['maintenance']>): RootState =>
  ({
    auth: { user: null, userRole: null, isAuthenticated: false, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
    sites: { sites: [], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
    inventory: { items: [], categories: [], inventoryByLocation: {}, lowStockItemIds: [], loading: false, error: null, errorTimestamp: null, filters: null },
    requests: { requests: [], myRequests: [], selectedRequest: null, loading: false, error: null, errorTimestamp: null, filters: { status: 'all', priority: 'all', siteId: 'all' } },
    steelMaster: { steelMasters: [], selectedSteelMaster: null, loading: false, error: null },
    maintenance: {
      maintenanceRecords: [],
      selectedMaintenance: null,
      filters: { status: 'all' },
      loading: false,
      error: null,
      ...maintenance,
    },
    activityLog: { logs: [], hasMore: true, lastDoc: null, myRecentActivity: [], filters: {}, loading: false, loadingMore: false, exportLoading: false, myActivityLoading: false, error: null, errorTimestamp: null },
    purchaseOrders: { purchaseOrders: [], selectedPO: null, vendors: [], loading: false, error: null, filters: { status: 'all' } },
  }) as RootState;

const mockRecord = (id: string, status: string, itemId = 'item1') =>
  ({
    id,
    itemId,
    itemName: 'Item',
    itemSku: 'SKU-1',
    status,
    locationId: 'maintenance',
    locationType: 'maintenance',
    locationName: 'Maintenance',
    quantity: 1,
    addedAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }) as never;

describe('maintenanceSelectors', () => {
  it('selectMaintenanceRecords returns records', () => {
    const records = [mockRecord('1', 'pending'), mockRecord('2', 'returned')];
    const state = createMockState({ maintenanceRecords: records });
    expect(selectMaintenanceRecords(state)).toEqual(records);
  });

  it('selectSelectedMaintenance returns selected', () => {
    const record = mockRecord('sel1', 'pending');
    const state = createMockState({ selectedMaintenance: record });
    expect(selectSelectedMaintenance(state)).toEqual(record);
  });

  it('selectMaintenanceLoading returns loading state', () => {
    const state = createMockState({ loading: true });
    expect(selectMaintenanceLoading(state)).toBe(true);
  });

  it('selectMaintenanceError returns error', () => {
    const state = createMockState({ error: 'Load failed' });
    expect(selectMaintenanceError(state)).toBe('Load failed');
  });

  it('selectMaintenanceFilters returns filters', () => {
    const state = createMockState({ filters: { status: 'pending' } });
    expect(selectMaintenanceFilters(state).status).toBe('pending');
  });

  it('selectActiveMaintenanceRecords filters pending and partial_return', () => {
    const records = [
      mockRecord('1', 'pending'),
      mockRecord('2', 'partial_return'),
      mockRecord('3', 'returned'),
    ];
    const state = createMockState({ maintenanceRecords: records });
    const result = selectActiveMaintenanceRecords(state);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.status)).toContain('pending');
    expect(result.map((r) => r.status)).toContain('partial_return');
  });

  it('selectWrittenOffRecords filters written_off', () => {
    const records = [mockRecord('1', 'written_off'), mockRecord('2', 'pending')];
    const state = createMockState({ maintenanceRecords: records });
    expect(selectWrittenOffRecords(state)).toHaveLength(1);
    expect(selectWrittenOffRecords(state)[0].status).toBe('written_off');
  });

  it('selectWrittenOffRegisterRecords includes written_off and partially_returned_and_written_off', () => {
    const records = [
      mockRecord('1', 'written_off'),
      mockRecord('2', 'partially_returned_and_written_off'),
      mockRecord('3', 'returned'),
    ];
    const state = createMockState({ maintenanceRecords: records });
    const result = selectWrittenOffRegisterRecords(state);
    expect(result).toHaveLength(2);
  });

  it('selectReturnedRecords filters returned', () => {
    const records = [mockRecord('1', 'returned'), mockRecord('2', 'pending')];
    const state = createMockState({ maintenanceRecords: records });
    expect(selectReturnedRecords(state)).toHaveLength(1);
    expect(selectReturnedRecords(state)[0].status).toBe('returned');
  });

  it('selectMaintenanceHistory returns returned, written_off, and partially_returned_and_written_off', () => {
    const records = [
      mockRecord('1', 'returned'),
      mockRecord('2', 'written_off'),
      mockRecord('3', 'partially_returned_and_written_off'),
      mockRecord('4', 'pending'),
    ];
    const state = createMockState({ maintenanceRecords: records });
    const result = selectMaintenanceHistory(state);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.status)).toContain('returned');
    expect(result.map((r) => r.status)).toContain('written_off');
    expect(result.map((r) => r.status)).toContain('partially_returned_and_written_off');
  });

  it('selectMaintenanceByItemId filters by itemId', () => {
    const records = [
      mockRecord('1', 'pending', 'itemA'),
      mockRecord('2', 'pending', 'itemB'),
      mockRecord('3', 'pending', 'itemA'),
    ];
    const state = createMockState({ maintenanceRecords: records });
    const selector = selectMaintenanceByItemId('itemA');
    const result = selector(state);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.itemId === 'itemA')).toBe(true);
  });

  it('selectFilteredMaintenanceRecords returns all when status is all', () => {
    const records = [mockRecord('1', 'pending'), mockRecord('2', 'returned')];
    const state = createMockState({ maintenanceRecords: records, filters: { status: 'all' } });
    expect(selectFilteredMaintenanceRecords(state)).toHaveLength(2);
  });

  it('selectFilteredMaintenanceRecords filters by status', () => {
    const records = [
      mockRecord('1', 'pending'),
      mockRecord('2', 'pending'),
      mockRecord('3', 'returned'),
    ];
    const state = createMockState({
      maintenanceRecords: records,
      filters: { status: 'pending' },
    });
    const result = selectFilteredMaintenanceRecords(state);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === 'pending')).toBe(true);
  });

  it('selectMaintenanceStats returns correct counts', () => {
    const records = [
      mockRecord('1', 'pending'),
      mockRecord('2', 'partial_return'),
      mockRecord('3', 'written_off'),
      mockRecord('4', 'partially_returned_and_written_off'),
    ];
    const state = createMockState({ maintenanceRecords: records });
    const stats = selectMaintenanceStats(state);
    expect(stats.total).toBe(4);
    expect(stats.active).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.partialReturn).toBe(1);
    expect(stats.writtenOff).toBe(2);
  });

  it('selectMaintenanceByStatus filters by status', () => {
    const records = [
      mockRecord('1', 'pending'),
      mockRecord('2', 'pending'),
      mockRecord('3', 'returned'),
    ];
    const state = createMockState({ maintenanceRecords: records });
    const selector = selectMaintenanceByStatus('pending');
    const result = selector(state);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === 'pending')).toBe(true);
  });

  it('selectMaintenanceById finds record', () => {
    const record = mockRecord('m1', 'pending');
    const state = createMockState({ maintenanceRecords: [record, mockRecord('m2', 'pending')] });
    const selector = selectMaintenanceById('m1');
    expect(selector(state)).toEqual(record);
  });

  it('selectMaintenanceById returns null when not found', () => {
    const state = createMockState({ maintenanceRecords: [mockRecord('1', 'pending')] });
    const selector = selectMaintenanceById('missing');
    expect(selector(state)).toBeNull();
  });
});
