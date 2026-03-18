import purchaseOrderReducer, {
  setPurchaseOrders,
  setSelectedPO,
  setVendors,
  setVendorsLoading,
  addOrUpdatePO,
  setFilters,
  setLoading,
  setError,
  clearError,
  clearPurchaseOrders,
} from '../purchaseOrderSlice';

const mockPO = {
  id: 'po1',
  poNumber: 'PO-001',
  vendorId: 'v1',
  vendorName: 'Vendor A',
  status: 'draft',
} as import('../../types/purchaseOrder').PurchaseOrder;

const mockVendor = {
  id: 'v1',
  name: 'Vendor A',
  contact: '123',
} as import('../../types/vendor').Vendor;

describe('purchaseOrderSlice', () => {
  const initialState = {
    purchaseOrders: [],
    selectedPO: null,
    vendors: [],
    vendorsLoading: false,
    loading: false,
    loadingMore: false,
    error: null,
    totalCount: null,
    lastDoc: null,
    hasMore: false,
    filters: { status: 'all' },
  };

  it('has correct initial state', () => {
    expect(purchaseOrderReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setPurchaseOrders sets purchaseOrders with deduplication', () => {
    const state = purchaseOrderReducer(
      initialState,
      setPurchaseOrders([mockPO, { ...mockPO, id: 'po1' }] as never[])
    );
    expect(state.purchaseOrders).toHaveLength(1);
    expect(state.loading).toBe(false);
  });

  it('setSelectedPO sets selectedPO', () => {
    const state = purchaseOrderReducer(initialState, setSelectedPO(mockPO));
    expect(state.selectedPO).toEqual(mockPO);
  });

  it('setVendors sets vendors with deduplication and clears loading', () => {
    const loadingState = { ...initialState, vendorsLoading: true };
    const state = purchaseOrderReducer(
      loadingState,
      setVendors([mockVendor, { ...mockVendor, id: 'v1' }] as never[])
    );
    expect(state.vendors).toHaveLength(1);
    expect(state.vendorsLoading).toBe(false);
  });

  it('setVendorsLoading sets vendors loading state', () => {
    const state = purchaseOrderReducer(initialState, setVendorsLoading(true));
    expect(state.vendorsLoading).toBe(true);
  });

  it('addOrUpdatePO adds new PO', () => {
    const state = purchaseOrderReducer(initialState, addOrUpdatePO(mockPO));
    expect(state.purchaseOrders).toHaveLength(1);
    expect(state.purchaseOrders[0].id).toBe('po1');
  });

  it('addOrUpdatePO updates existing PO', () => {
    const withPO = purchaseOrderReducer(initialState, addOrUpdatePO(mockPO));
    const updated = { ...mockPO, vendorName: 'Vendor B' };
    const state = purchaseOrderReducer(withPO, addOrUpdatePO(updated));
    expect(state.purchaseOrders[0].vendorName).toBe('Vendor B');
  });

  it('addOrUpdatePO updates selectedPO when it matches', () => {
    const withPO = purchaseOrderReducer(initialState, addOrUpdatePO(mockPO));
    const withSelected = purchaseOrderReducer(withPO, setSelectedPO(mockPO));
    const updated = { ...mockPO, vendorName: 'Vendor B' };
    const state = purchaseOrderReducer(withSelected, addOrUpdatePO(updated));
    expect(state.selectedPO?.vendorName).toBe('Vendor B');
  });

  it('setFilters merges filters', () => {
    const state = purchaseOrderReducer(
      initialState,
      setFilters({ status: 'approved' })
    );
    expect(state.filters.status).toBe('approved');
  });

  it('setLoading sets loading', () => {
    const state = purchaseOrderReducer(initialState, setLoading(true));
    expect(state.loading).toBe(true);
  });

  it('setError sets error and clears loading', () => {
    const state = purchaseOrderReducer(initialState, setError('Failed'));
    expect(state.error).toBe('Failed');
    expect(state.loading).toBe(false);
  });

  it('clearError clears error', () => {
    const withError = purchaseOrderReducer(initialState, setError('Error'));
    const state = purchaseOrderReducer(withError, clearError());
    expect(state.error).toBe(null);
  });

  it('clearPurchaseOrders resets all', () => {
    const withData = purchaseOrderReducer(
      initialState,
      addOrUpdatePO(mockPO)
    );
    const state = purchaseOrderReducer(withData, clearPurchaseOrders());
    expect(state.purchaseOrders).toEqual([]);
    expect(state.selectedPO).toBe(null);
  });
});
