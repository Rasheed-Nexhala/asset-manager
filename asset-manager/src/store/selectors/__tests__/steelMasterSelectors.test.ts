import {
  selectAllSteelMasters,
  selectActiveSteelMasters,
  selectSteelMasterById,
  selectSteelMasterLoading,
  selectSteelMasterError,
  selectSelectedSteelMaster,
} from '../steelMasterSelectors';
import type { RootState } from '../../index';

const createMockState = (steelMaster: Partial<RootState['steelMaster']>): RootState =>
  ({
    auth: { user: null, userRole: null, isAuthenticated: false, isLoading: false, isRoleLoading: false, error: null },
    sites: { sites: [], isLoading: false, error: null, searchQuery: '', validationLoading: false, lastValidationAt: null },
    inventory: { items: [], categories: [], inventoryByLocation: {}, lowStockItemIds: [], loading: false, error: null, errorTimestamp: null, filters: null },
    requests: { requests: [], myRequests: [], selectedRequest: null, loading: false, error: null, errorTimestamp: null, filters: { status: 'all', priority: 'all', siteId: 'all' } },
    steelMaster: {
      steelMasters: [],
      selectedSteelMaster: null,
      loading: false,
      error: null,
      ...steelMaster,
    },
    maintenance: { maintenanceRecords: [], selectedMaintenance: null, filters: {}, loading: false, error: null },
    activityLog: { logs: [], hasMore: true, lastDoc: null, myRecentActivity: [], filters: {}, loading: false, loadingMore: false, exportLoading: false, myActivityLoading: false, error: null, errorTimestamp: null },
    purchaseOrders: { purchaseOrders: [], selectedPO: null, vendors: [], loading: false, error: null, filters: { status: 'all' } },
  }) as RootState;

const mockSteelMaster = (id: string, isActive = true) =>
  ({ id, name: `Steel ${id}`, hsnCode: 'HSN', weightPerMeter: 10, isActive }) as never;

describe('steelMasterSelectors', () => {
  it('selectAllSteelMasters returns steel masters', () => {
    const masters = [mockSteelMaster('1'), mockSteelMaster('2')];
    const state = createMockState({ steelMasters: masters });
    expect(selectAllSteelMasters(state)).toEqual(masters);
  });

  it('selectActiveSteelMasters filters active only', () => {
    const active = mockSteelMaster('1', true);
    const inactive = mockSteelMaster('2', false);
    const state = createMockState({ steelMasters: [active, inactive] });
    expect(selectActiveSteelMasters(state)).toEqual([active]);
  });

  it('selectSteelMasterById finds master', () => {
    const master = mockSteelMaster('sm1');
    const state = createMockState({ steelMasters: [master, mockSteelMaster('sm2')] });
    const selector = selectSteelMasterById('sm1');
    expect(selector(state)).toEqual(master);
  });

  it('selectSteelMasterById returns null when not found', () => {
    const state = createMockState({ steelMasters: [mockSteelMaster('1')] });
    const selector = selectSteelMasterById('missing');
    expect(selector(state)).toBeNull();
  });

  it('selectSteelMasterLoading returns loading state', () => {
    const state = createMockState({ loading: true });
    expect(selectSteelMasterLoading(state)).toBe(true);
  });

  it('selectSteelMasterError returns error', () => {
    const state = createMockState({ error: 'Fetch failed' });
    expect(selectSteelMasterError(state)).toBe('Fetch failed');
  });

  it('selectSelectedSteelMaster returns selected', () => {
    const master = mockSteelMaster('sel1');
    const state = createMockState({ selectedSteelMaster: master });
    expect(selectSelectedSteelMaster(state)).toEqual(master);
  });
});
