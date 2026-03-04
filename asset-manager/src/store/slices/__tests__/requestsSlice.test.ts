import requestsReducer, {
  setRequests,
  setMyRequests,
  setSelectedRequest,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
  clearRequests,
} from '../requestsSlice';

const mockRequest = {
  id: 'req1',
  requestNumber: 'R001',
  status: 'pending',
  siteId: 'site1',
  items: [],
} as import('../../types/request').Request;

describe('requestsSlice', () => {
  const initialState = {
    requests: [],
    myRequests: [],
    selectedRequest: null,
    loading: false,
    error: null,
    errorTimestamp: null,
    filters: { status: 'all', priority: 'all', siteId: 'all' },
    requestsTotalCount: null,
    requestsLastDoc: null,
    requestsHasMore: false,
    requestsLoadingMore: false,
    myRequestsTotalCount: null,
    myRequestsLastDoc: null,
    myRequestsHasMore: false,
    myRequestsLoadingMore: false,
  };

  it('has correct initial state', () => {
    expect(requestsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setRequests sets requests and excludes drafts', () => {
    const draft = { ...mockRequest, id: 'd1', status: 'draft' };
    const pending = { ...mockRequest, id: 'p1', status: 'pending' };
    const state = requestsReducer(
      initialState,
      setRequests([draft, pending] as never[])
    );
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].id).toBe('p1');
    expect(state.loading).toBe(false);
  });

  it('setMyRequests sets myRequests with deduplication', () => {
    const state = requestsReducer(
      initialState,
      setMyRequests([mockRequest, { ...mockRequest, id: 'req1' }] as never[])
    );
    expect(state.myRequests).toHaveLength(1);
  });

  it('setSelectedRequest sets selectedRequest', () => {
    const state = requestsReducer(initialState, setSelectedRequest(mockRequest));
    expect(state.selectedRequest).toEqual(mockRequest);
  });

  it('setFilters merges filters', () => {
    const state = requestsReducer(
      initialState,
      setFilters({ status: 'pending' })
    );
    expect(state.filters.status).toBe('pending');
    expect(state.filters.priority).toBe('all');
  });

  it('clearFilters resets filters', () => {
    const withFilters = requestsReducer(
      initialState,
      setFilters({ status: 'approved' })
    );
    const state = requestsReducer(withFilters, clearFilters());
    expect(state.filters).toEqual(initialState.filters);
  });

  it('setLoading sets loading', () => {
    const state = requestsReducer(initialState, setLoading(true));
    expect(state.loading).toBe(true);
  });

  it('setError sets error and clears loading', () => {
    const state = requestsReducer(initialState, setError('Something failed'));
    expect(state.error).toBe('Something failed');
    expect(state.loading).toBe(false);
  });

  it('clearError clears error', () => {
    const withError = requestsReducer(initialState, setError('Error'));
    const state = requestsReducer(withError, clearError());
    expect(state.error).toBe(null);
  });

  it('clearRequests resets all', () => {
    const withData = requestsReducer(
      initialState,
      setMyRequests([mockRequest] as never[])
    );
    const state = requestsReducer(withData, clearRequests());
    expect(state).toEqual(initialState);
  });
});
