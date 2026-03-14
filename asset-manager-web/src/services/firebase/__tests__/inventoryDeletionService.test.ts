/**
 * Unit tests for checkCanDeleteItem
 */
import { getDocs } from 'firebase/firestore';
import { checkCanDeleteItem } from '../inventoryDeletionService';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

const mockGetDocs = vi.mocked(getDocs);

function mockDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe('checkCanDeleteItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockReset();
    // Default: all queries return empty
    mockGetDocs.mockResolvedValue({
      docs: [],
      empty: true,
      size: 0,
      forEach: () => {},
    } as never);
  });

  it('returns canDelete: true when totalQuantity 0 and no related docs', async () => {
    const result = await checkCanDeleteItem('item1', {
      totalQuantity: 0,
      atSitesQuantity: 0,
      inMaintenanceQuantity: 0,
    });
    expect(result.canDelete).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('returns canDelete: true when atSitesQuantity 0, inMaintenanceQuantity 0, totalQuantity > 0 (all in central store)', async () => {
    const result = await checkCanDeleteItem('item1', {
      totalQuantity: 50,
      atSitesQuantity: 0,
      inMaintenanceQuantity: 0,
    });
    expect(result.canDelete).toBe(true);
  });

  it('returns canDelete: false when atSitesQuantity > 0', async () => {
    const result = await checkCanDeleteItem('item1', {
      totalQuantity: 50,
      atSitesQuantity: 10,
      inMaintenanceQuantity: 0,
    });
    expect(result.canDelete).toBe(false);
    expect(result.reason).toContain('stock at sites or in maintenance');
  });

  it('returns canDelete: false when inMaintenanceQuantity > 0', async () => {
    const result = await checkCanDeleteItem('item1', {
      totalQuantity: 50,
      atSitesQuantity: 0,
      inMaintenanceQuantity: 5,
    });
    expect(result.canDelete).toBe(false);
    expect(result.reason).toContain('stock at sites or in maintenance');
  });

  it('returns canDelete: false with draftPoNumbers when item in draft PO', async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [mockDoc('po1', { poNumber: 'PO-2025-001', items: [{ itemId: 'item1' }] })],
        empty: false,
        size: 1,
        forEach: () => {},
      } as never)
      .mockResolvedValueOnce({ docs: [], empty: true, size: 0, forEach: () => {} } as never)
      .mockResolvedValueOnce({ docs: [], empty: true, size: 0, forEach: () => {} } as never);

    const result = await checkCanDeleteItem('item1', {
      totalQuantity: 0,
      atSitesQuantity: 0,
      inMaintenanceQuantity: 0,
    });
    expect(result.canDelete).toBe(false);
    expect(result.reason).toContain('draft PO');
    expect(result.draftPoNumbers).toEqual(['PO-2025-001']);
  });

  it('returns canDelete: false with pendingRequestNumbers when item in pending request', async () => {
    const emptySnapshot = { docs: [], empty: true, size: 0, forEach: () => {} };
    const requestSnapshot = {
      docs: [mockDoc('req1', { requestNumber: 'REQ-2025-0045', items: [{ itemId: 'item1' }] })],
      empty: false,
      size: 1,
      forEach: () => {},
    };
    const returnValues = [emptySnapshot, requestSnapshot, emptySnapshot];
    let callIndex = 0;
    mockGetDocs.mockImplementation(() =>
      Promise.resolve(returnValues[callIndex++] as never)
    );

    const result = await checkCanDeleteItem('item1', {
      totalQuantity: 0,
      atSitesQuantity: 0,
      inMaintenanceQuantity: 0,
    });
    expect(result.canDelete).toBe(false);
    expect(result.reason).toContain('pending/approved request');
    expect(result.pendingRequestNumbers).toEqual(['REQ-2025-0045']);
  });

  it('returns canDelete: false with activeMaintenanceIds when item in pending maintenance', async () => {
    const emptySnapshot = { docs: [], empty: true, size: 0, forEach: () => {} };
    const maintenanceSnapshot = {
      docs: [mockDoc('maint1', { itemId: 'item1', status: 'pending' })],
      empty: false,
      size: 1,
      forEach: () => {},
    };
    let callCount = 0;
    mockGetDocs.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return Promise.resolve(emptySnapshot as never);
      if (callCount === 2) return Promise.resolve(emptySnapshot as never);
      return Promise.resolve(maintenanceSnapshot as never);
    });

    const result = await checkCanDeleteItem('item1', {
      totalQuantity: 0,
      atSitesQuantity: 0,
      inMaintenanceQuantity: 0,
    });
    expect(result.canDelete).toBe(false);
    expect(result.reason).toContain('active maintenance');
    expect(result.activeMaintenanceIds).toEqual(['maint1']);
  });

  it('returns canDelete: false when item in partial_return maintenance', async () => {
    const emptySnapshot = { docs: [], empty: true, size: 0, forEach: () => {} };
    const maintenanceSnapshot = {
      docs: [mockDoc('maint2', { itemId: 'item1', status: 'partial_return' })],
      empty: false,
      size: 1,
      forEach: () => {},
    };
    let callCount = 0;
    mockGetDocs.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return Promise.resolve(emptySnapshot as never);
      if (callCount === 2) return Promise.resolve(emptySnapshot as never);
      return Promise.resolve(maintenanceSnapshot as never);
    });

    const result = await checkCanDeleteItem('item1', {
      totalQuantity: 0,
      atSitesQuantity: 0,
      inMaintenanceQuantity: 0,
    });
    expect(result.canDelete).toBe(false);
    expect(result.activeMaintenanceIds).toEqual(['maint2']);
  });
});
