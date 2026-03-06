import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ActivityLog, ActivityLogFiltersStore } from '../../types/activityLog';
import { dateToIso } from '../../utils/dateSerialization';
import { sanitizeForDisplay } from '../../utils/sanitizeUtils';
import {
  fetchMyActivityPaginated,
  loadMoreMyActivity,
  exportActivityLogsThunk,
} from '../thunks/activityLogThunks';

const PAGE_SIZE = 20;

interface ActivityLogState {
  /** Full activity logs (Admin only) */
  logs: ActivityLog[];
  totalCount: number | null;
  hasMore: boolean;
  lastDoc: unknown | null;

  /** My activity (paginated, all users) */
  myRecentActivity: ActivityLog[];
  myActivityTotalCount: number | null;
  myActivityLastDoc: unknown | null;
  myActivityHasMore: boolean;
  myActivityLoadingMore: boolean;

  /** Filters */
  filters: ActivityLogFiltersStore;

  /** Loading states */
  loading: boolean;
  loadingMore: boolean;
  exportLoading: boolean;
  myActivityLoading: boolean;

  /** Errors */
  error: string | null;
  errorTimestamp: number | null;
}

const initialState: ActivityLogState = {
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

const activityLogSlice = createSlice({
  name: 'activityLog',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<Omit<ActivityLogFiltersStore, 'startDate' | 'endDate'> & { startDate?: Date | string | null; endDate?: Date | string | null }>>) => {
      const payload = action.payload;
      const normalized = {
        ...payload,
        startDate: 'startDate' in payload ? dateToIso(payload.startDate) : state.filters.startDate,
        endDate: 'endDate' in payload ? dateToIso(payload.endDate) : state.filters.endDate,
      };
      state.filters = { ...state.filters, ...normalized };
      state.logs = [];
      state.totalCount = null;
      state.hasMore = true;
      state.lastDoc = null;
    },

    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.logs = [];
      state.totalCount = null;
      state.hasMore = true;
      state.lastDoc = null;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setMyActivityLoading: (state, action: PayloadAction<boolean>) => {
      state.myActivityLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.errorTimestamp = Date.now();
      state.loading = false;
      state.loadingMore = false;
      state.exportLoading = false;
      state.myActivityLoading = false;
    },

    clearError: (state) => {
      state.error = null;
      state.errorTimestamp = null;
    },

    clearActivityLogs: (state) => {
      state.logs = [];
      state.totalCount = null;
      state.myRecentActivity = [];
      state.myActivityTotalCount = null;
      state.myActivityLastDoc = null;
      state.myActivityHasMore = false;
      state.myActivityLoadingMore = false;
      state.hasMore = true;
      state.lastDoc = null;
      state.filters = initialState.filters;
      state.loading = false;
      state.loadingMore = false;
      state.exportLoading = false;
      state.myActivityLoading = false;
      state.error = null;
      state.errorTimestamp = null;
    },

    /**
     * Real-time snapshot updates
     * Real-time mode uses a fixed window (no pagination) - hasMore always false
     */
    updateLogsFromSnapshot: (state, action: PayloadAction<ActivityLog[]>) => {
      state.logs = action.payload;
      state.totalCount = null;
      state.loading = false;
      state.error = null;
      state.errorTimestamp = null;
      state.hasMore = false;
    },

  },
  extraReducers: (builder) => {
    builder
      .addCase('activityLog/fetchLogs/pending', (state) => {
        state.loading = true;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase('activityLog/fetchLogs/fulfilled', (state, action) => {
        const { logs, lastDoc, totalCount, pageSize } = action.payload as {
          logs: ActivityLog[];
          lastDoc: unknown;
          totalCount: number;
          pageSize: number;
        };
        state.loading = false;
        state.logs = logs;
        state.totalCount = totalCount;
        state.lastDoc = lastDoc;
        state.hasMore = logs.length >= pageSize;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase('activityLog/fetchLogs/rejected', (state, action) => {
        state.loading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'Failed to fetch activity logs';
        state.errorTimestamp = Date.now();
      })

      .addCase('activityLog/loadMore/pending', (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase('activityLog/loadMore/fulfilled', (state, action) => {
        const { logs, lastDoc, pageSize } = action.payload as {
          logs: ActivityLog[];
          lastDoc: unknown;
          pageSize: number;
        };
        state.loadingMore = false;
        state.logs = [...state.logs, ...logs];
        state.lastDoc = lastDoc;
        state.hasMore = logs.length >= pageSize;
      })
      .addCase('activityLog/loadMore/rejected', (state, action) => {
        state.loadingMore = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'Failed to load more activity logs';
        state.errorTimestamp = Date.now();
      })

      .addCase(fetchMyActivityPaginated.pending, (state) => {
        state.myActivityLoading = true;
        state.error = null;
      })
      .addCase(fetchMyActivityPaginated.fulfilled, (state, action) => {
        const { logs, totalCount, lastDoc, pageSize } = action.payload as {
          logs: ActivityLog[];
          totalCount: number;
          lastDoc: unknown;
          pageSize: number;
        };
        state.myActivityLoading = false;
        state.myRecentActivity = logs;
        state.myActivityTotalCount = totalCount;
        state.myActivityLastDoc = lastDoc;
        state.myActivityHasMore = logs.length >= pageSize;
        state.error = null;
      })
      .addCase(fetchMyActivityPaginated.rejected, (state, action) => {
        state.myActivityLoading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'Failed to fetch my activity';
        state.errorTimestamp = Date.now();
      })
      .addCase(loadMoreMyActivity.pending, (state) => {
        state.myActivityLoadingMore = true;
        state.error = null;
      })
      .addCase(loadMoreMyActivity.fulfilled, (state, action) => {
        const { logs, lastDoc, pageSize } = action.payload as {
          logs: ActivityLog[];
          lastDoc: unknown;
          pageSize: number;
        };
        state.myActivityLoadingMore = false;
        state.myRecentActivity = [...state.myRecentActivity, ...logs];
        state.myActivityLastDoc = lastDoc;
        state.myActivityHasMore = logs.length >= pageSize;
      })
      .addCase(loadMoreMyActivity.rejected, (state, action) => {
        state.myActivityLoadingMore = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'Failed to load more activity';
        state.errorTimestamp = Date.now();
      })

      .addCase(exportActivityLogsThunk.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportActivityLogsThunk.fulfilled, (state) => {
        state.exportLoading = false;
        state.error = null;
      })
      .addCase(exportActivityLogsThunk.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = sanitizeForDisplay(action.payload as string | undefined) || 'Failed to export activity logs';
        state.errorTimestamp = Date.now();
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setLoading,
  setMyActivityLoading,
  setError,
  clearError,
  clearActivityLogs,
  updateLogsFromSnapshot,
} = activityLogSlice.actions;

export default activityLogSlice.reducer;
