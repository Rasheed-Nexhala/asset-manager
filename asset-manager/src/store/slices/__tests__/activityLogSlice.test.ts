jest.mock('../../thunks/activityLogThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchActivityLogs: createAsyncThunk(
      'activityLog/fetch',
      async () => ({ logs: [], lastDoc: null })
    ),
    fetchMyRecentActivity: createAsyncThunk(
      'activityLog/fetchMy',
      async () => []
    ),
    loadMoreActivityLogs: createAsyncThunk(
      'activityLog/loadMore',
      async () => ({ logs: [], lastDoc: null })
    ),
    exportActivityLogsThunk: createAsyncThunk(
      'activityLog/export',
      async () => null
    ),
  };
});

import activityLogReducer, {
  setFilters,
  clearFilters,
  setLoading,
  setMyActivityLoading,
  setError,
  clearError,
  clearActivityLogs,
  updateLogsFromSnapshot,
  updateMyActivityFromSnapshot,
} from '../activityLogSlice';
import { fetchActivityLogs, fetchMyRecentActivity } from '../../thunks/activityLogThunks';

const mockLog = {
  id: 'log1',
  actionType: 'create',
  summary: 'Created item',
  userId: 'u1',
  createdAt: new Date().toISOString(),
} as import('../../types/activityLog').ActivityLog;

describe('activityLogSlice', () => {
  const initialState = {
    logs: [],
    hasMore: true,
    lastDoc: null,
    myRecentActivity: [],
    filters: {
      startDate: null,
      endDate: null,
      userId: null,
      actionCategory: 'all',
      actionType: 'all',
      searchQuery: '',
    },
    loading: false,
    loadingMore: false,
    exportLoading: false,
    myActivityLoading: false,
    error: null,
    errorTimestamp: null,
  };

  it('has correct initial state', () => {
    expect(activityLogReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('setFilters merges filters', () => {
    const state = activityLogReducer(
      initialState,
      setFilters({ actionType: 'create' })
    );
    expect(state.filters.actionType).toBe('create');
    expect(state.logs).toEqual([]);
    expect(state.hasMore).toBe(true);
  });

  it('clearFilters resets filters and logs', () => {
    const withData = activityLogReducer(
      initialState,
      updateLogsFromSnapshot([mockLog])
    );
    const state = activityLogReducer(withData, clearFilters());
    expect(state.filters).toEqual(initialState.filters);
    expect(state.logs).toEqual([]);
  });

  it('setLoading sets loading', () => {
    const state = activityLogReducer(initialState, setLoading(true));
    expect(state.loading).toBe(true);
  });

  it('setMyActivityLoading sets myActivityLoading', () => {
    const state = activityLogReducer(initialState, setMyActivityLoading(true));
    expect(state.myActivityLoading).toBe(true);
  });

  it('setError sets error and clears loading states', () => {
    const state = activityLogReducer(initialState, setError('Failed'));
    expect(state.error).toBe('Failed');
    expect(state.loading).toBe(false);
  });

  it('clearError clears error', () => {
    const withError = activityLogReducer(initialState, setError('Error'));
    const state = activityLogReducer(withError, clearError());
    expect(state.error).toBe(null);
  });

  it('clearActivityLogs resets all', () => {
    const withData = activityLogReducer(
      initialState,
      updateLogsFromSnapshot([mockLog])
    );
    const state = activityLogReducer(withData, clearActivityLogs());
    expect(state.logs).toEqual([]);
    expect(state.myRecentActivity).toEqual([]);
    expect(state.error).toBe(null);
  });

  it('updateLogsFromSnapshot sets logs', () => {
    const state = activityLogReducer(
      initialState,
      updateLogsFromSnapshot([mockLog])
    );
    expect(state.logs).toEqual([mockLog]);
    expect(state.loading).toBe(false);
    expect(state.hasMore).toBe(false);
  });

  it('updateMyActivityFromSnapshot sets myRecentActivity', () => {
    const state = activityLogReducer(
      initialState,
      updateMyActivityFromSnapshot([mockLog])
    );
    expect(state.myRecentActivity).toEqual([mockLog]);
    expect(state.myActivityLoading).toBe(false);
  });

  it('fetchActivityLogs.fulfilled sets logs', () => {
    const state = activityLogReducer(
      initialState,
      fetchActivityLogs.fulfilled(
        { logs: [mockLog], lastDoc: null },
        'req1'
      )
    );
    expect(state.logs).toEqual([mockLog]);
    expect(state.loading).toBe(false);
  });

  it('fetchMyRecentActivity.fulfilled sets myRecentActivity', () => {
    const state = activityLogReducer(
      initialState,
      fetchMyRecentActivity.fulfilled([mockLog], 'req1')
    );
    expect(state.myRecentActivity).toEqual([mockLog]);
    expect(state.myActivityLoading).toBe(false);
  });
});
