import {
  selectAllSites,
  selectSitesLoading,
  selectSitesError,
  selectSearchQuery,
  selectActiveSites,
  selectInactiveSites,
  selectSiteById,
  selectFilteredSites,
  selectFilteredActiveSites,
  selectAssignedSiteIdForUser,
} from '../sitesSelectors';
import type { RootState } from '../../index';

const createMockState = (sites: Partial<RootState['sites']>): RootState =>
  ({
    auth: { user: null, userRole: null, isAuthenticated: false, isLoading: false, isRoleLoading: false, authInitialized: false, error: null },
    sites: {
      sites: [],
      isLoading: false,
      error: null,
      searchQuery: '',
      validationLoading: false,
      lastValidationAt: null,
      ...sites,
    },
    inventory: { items: [], categories: [], inventoryByLocation: {}, lowStockItemIds: [], loading: false, error: null, errorTimestamp: null, filters: null },
    requests: { requests: [], myRequests: [], selectedRequest: null, loading: false, error: null, errorTimestamp: null, filters: { status: 'all', priority: 'all', siteId: 'all' } },
    steelMaster: { steelMasters: [], selectedSteelMaster: null, loading: false, error: null },
    maintenance: { maintenanceRecords: [], selectedMaintenance: null, filters: {}, loading: false, error: null },
    activityLog: { logs: [], hasMore: true, lastDoc: null, myRecentActivity: [], filters: {}, loading: false, loadingMore: false, exportLoading: false, myActivityLoading: false, error: null, errorTimestamp: null },
    purchaseOrders: { purchaseOrders: [], selectedPO: null, vendors: [], loading: false, error: null, filters: { status: 'all' } },
  }) as RootState;

const mockSite = (id: string, overrides: Partial<{ name: string; address: string; status: string; managerId: string | null }> = {}) =>
  ({
    id,
    name: `Site ${id}`,
    address: `Address ${id}`,
    status: 'active',
    managerId: null,
    managerName: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  }) as never;

describe('sitesSelectors', () => {
  it('selectAllSites returns sites', () => {
    const sites = [mockSite('1'), mockSite('2')];
    const state = createMockState({ sites });
    expect(selectAllSites(state)).toEqual(sites);
  });

  it('selectSitesLoading returns loading state', () => {
    const state = createMockState({ isLoading: true });
    expect(selectSitesLoading(state)).toBe(true);
  });

  it('selectSitesError returns error', () => {
    const state = createMockState({ error: 'Failed to load sites' });
    expect(selectSitesError(state)).toBe('Failed to load sites');
  });

  it('selectSearchQuery returns search query', () => {
    const state = createMockState({ searchQuery: 'construction' });
    expect(selectSearchQuery(state)).toBe('construction');
  });

  it('selectActiveSites filters active sites', () => {
    const active = mockSite('1', { status: 'active' });
    const inactive = mockSite('2', { status: 'inactive' });
    const state = createMockState({ sites: [active, inactive] });
    expect(selectActiveSites(state)).toEqual([active]);
  });

  it('selectInactiveSites filters inactive sites', () => {
    const inactive = mockSite('2', { status: 'inactive' });
    const state = createMockState({ sites: [mockSite('1'), inactive] });
    expect(selectInactiveSites(state)).toEqual([inactive]);
  });

  it('selectSiteById finds site', () => {
    const site = mockSite('site1');
    const state = createMockState({ sites: [site, mockSite('site2')] });
    const selector = selectSiteById('site1');
    expect(selector(state)).toEqual(site);
  });

  it('selectSiteById returns null when not found', () => {
    const state = createMockState({ sites: [mockSite('site1')] });
    const selector = selectSiteById('missing');
    expect(selector(state)).toBeNull();
  });

  it('selectFilteredSites returns all when search is empty', () => {
    const sites = [mockSite('1'), mockSite('2')];
    const state = createMockState({ sites, searchQuery: '' });
    expect(selectFilteredSites(state)).toEqual(sites);
  });

  it('selectFilteredSites filters by name', () => {
    const sites = [
      mockSite('1', { name: 'Construction Site A' }),
      mockSite('2', { name: 'Warehouse B' }),
    ];
    const state = createMockState({ sites, searchQuery: 'construction' });
    const result = selectFilteredSites(state);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Construction Site A');
  });

  it('selectFilteredSites filters by address', () => {
    const sites = [
      mockSite('1', { address: '123 Main St' }),
      mockSite('2', { address: '456 Oak Ave' }),
    ];
    const state = createMockState({ sites, searchQuery: 'main' });
    expect(selectFilteredSites(state)).toHaveLength(1);
    expect(selectFilteredSites(state)[0].address).toBe('123 Main St');
  });

  it('selectFilteredActiveSites returns only active from filtered', () => {
    const sites = [
      mockSite('1', { name: 'Alpha', status: 'active' }),
      mockSite('2', { name: 'Alpha Beta', status: 'inactive' }),
    ];
    const state = createMockState({ sites, searchQuery: 'alpha' });
    const result = selectFilteredActiveSites(state);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('active');
  });

  it('selectAssignedSiteIdForUser returns site id when managerId matches', () => {
    const sites = [
      mockSite('1', { managerId: 'user1' }),
      mockSite('2', { managerId: 'user2' }),
    ];
    const state = createMockState({ sites });
    const selector = selectAssignedSiteIdForUser('user1');
    expect(selector(state)).toBe('1');
  });

  it('selectAssignedSiteIdForUser returns null when no match', () => {
    const state = createMockState({ sites: [mockSite('1', { managerId: 'user1' })] });
    const selector = selectAssignedSiteIdForUser('other');
    expect(selector(state)).toBeNull();
  });

  it('selectAssignedSiteIdForUser returns null when userId is null', () => {
    const state = createMockState({ sites: [mockSite('1')] });
    const selector = selectAssignedSiteIdForUser(null);
    expect(selector(state)).toBeNull();
  });
});
