jest.mock('../../thunks/activityLogThunks', () => {
  const { createAsyncThunk } = require('@reduxjs/toolkit');
  return {
    fetchActivityLogs: createAsyncThunk(
      'activityLog/fetchLogs',
      async () => ({
        logs: [],
        lastDoc: null,
        totalCount: 0,
        pageSize: 20,
      })
    ),
    fetchMyActivityPaginated: createAsyncThunk(
      'activityLog/fetchMyActivityPaginated',
      async () => ({
        logs: [],
        totalCount: 0,
        lastDoc: null,
        pageSize: 10,
      })
    ),
    loadMoreMyActivity: createAsyncThunk(
      'activityLog/loadMoreMyActivity',
      async () => ({ logs: [], lastDoc: null, pageSize: 10 })
    ),
    loadMoreActivityLogs: createAsyncThunk(
      'activityLog/loadMore',
      async () => ({ logs: [], lastDoc: null, pageSize: 20 })
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
} from '../activityLogSlice';
import { fetchActivityLogs, fetchMyActivityPaginated } from '../../thunks/activityLogThunks';

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
    totalCount: null,
    hasMore: true,
    lastDoc: null,
    myRecentActivity: [],
    myActivityTotalCount: null,
    myActivityLastDoc: null,
    myActivityHasMore: false,
    myActivityLoadingMore: false,
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

  it('fetchActivityLogs.fulfilled sets logs', () => {
    const state = activityLogReducer(
      initialState,
      fetchActivityLogs.fulfilled(
        {
          logs: [mockLog],
          lastDoc: null,
          totalCount: 1,
          pageSize: 20,
        },
        'req1'
      )
    );
    expect(state.logs).toEqual([mockLog]);
    expect(state.totalCount).toBe(1);
    expect(state.loading).toBe(false);
  });

  it('fetchMyActivityPaginated.fulfilled sets myRecentActivity and pagination', () => {
    const state = activityLogReducer(
      initialState,
      fetchMyActivityPaginated.fulfilled(
        {
          logs: [mockLog],
          totalCount: 1,
          lastDoc: null,
          pageSize: 10,
        },
        'req1'
      )
    );
    expect(state.myRecentActivity).toEqual([mockLog]);
    expect(state.myActivityTotalCount).toBe(1);
    expect(state.myActivityLastDoc).toBe(null);
    expect(state.myActivityHasMore).toBe(false);
    expect(state.myActivityLoading).toBe(false);
  });
});
