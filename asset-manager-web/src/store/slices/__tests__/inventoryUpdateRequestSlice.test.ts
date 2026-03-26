import inventoryUpdateRequestReducer, {
  setMyAccessGrantedUntil,
  setMyWriteOffAccessGrantedUntil,
  setPendingRequests,
  setActiveApprovedRequests,
  setLoading,
  setError,
  clearError,
  clearAccess,
} from '../inventoryUpdateRequestSlice';

const mockInventoryUpdateRequest = {
  id: 'req1',
  requestedBy: 'u1',
  requestedByName: 'User',
  requestedByRole: 'StoreIncharge',
  reason: 'test',
  status: 'pending' as const,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('inventoryUpdateRequestSlice', () => {
  const initialState = {
    myAccessGrantedUntil: null,
    myWriteOffAccessGrantedUntil: null,
    pendingRequests: [],
    activeApprovedRequests: [],
    loading: false,
    error: null,
  };

  it('has correct initial state', () => {
    expect(inventoryUpdateRequestReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setMyAccessGrantedUntil sets value', () => {
    const state = inventoryUpdateRequestReducer(
      initialState,
      setMyAccessGrantedUntil('2025-12-31T23:59:59Z')
    );
    expect(state.myAccessGrantedUntil).toBe('2025-12-31T23:59:59Z');
  });

  it('setMyWriteOffAccessGrantedUntil sets value', () => {
    const state = inventoryUpdateRequestReducer(
      initialState,
      setMyWriteOffAccessGrantedUntil('2026-06-01T12:00:00Z')
    );
    expect(state.myWriteOffAccessGrantedUntil).toBe('2026-06-01T12:00:00Z');
  });

  it('setPendingRequests sets array', () => {
    const requests = [mockInventoryUpdateRequest];
    const state = inventoryUpdateRequestReducer(initialState, setPendingRequests(requests));
    expect(state.pendingRequests).toEqual(requests);
    expect(state.pendingRequests).toHaveLength(1);
  });

  it('setActiveApprovedRequests sets array', () => {
    const requests = [mockInventoryUpdateRequest];
    const state = inventoryUpdateRequestReducer(initialState, setActiveApprovedRequests(requests));
    expect(state.activeApprovedRequests).toEqual(requests);
    expect(state.activeApprovedRequests).toHaveLength(1);
  });

  it('setLoading sets loading', () => {
    const state = inventoryUpdateRequestReducer(initialState, setLoading(true));
    expect(state.loading).toBe(true);
  });

  it('setError sets error', () => {
    const state = inventoryUpdateRequestReducer(initialState, setError('Something went wrong'));
    expect(state.error).toBe('Something went wrong');
  });

  it('clearError clears error', () => {
    const withError = inventoryUpdateRequestReducer(initialState, setError('Error'));
    const state = inventoryUpdateRequestReducer(withError, clearError());
    expect(state.error).toBe(null);
  });

  it('clearAccess resets access fields, pendingRequests, activeApprovedRequests, error', () => {
    let state = inventoryUpdateRequestReducer(
      initialState,
      setMyAccessGrantedUntil('2025-12-31')
    );
    state = inventoryUpdateRequestReducer(
      state,
      setMyWriteOffAccessGrantedUntil('2026-01-01T00:00:00Z')
    );
    state = inventoryUpdateRequestReducer(state, setPendingRequests([mockInventoryUpdateRequest]));
    state = inventoryUpdateRequestReducer(
      state,
      setActiveApprovedRequests([mockInventoryUpdateRequest])
    );
    state = inventoryUpdateRequestReducer(state, setError('Error'));
    state = inventoryUpdateRequestReducer(state, clearAccess());

    expect(state.myAccessGrantedUntil).toBe(null);
    expect(state.myWriteOffAccessGrantedUntil).toBe(null);
    expect(state.pendingRequests).toEqual([]);
    expect(state.activeApprovedRequests).toEqual([]);
    expect(state.error).toBe(null);
  });
});
