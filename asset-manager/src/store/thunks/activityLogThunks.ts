import type { DocumentSnapshot } from 'firebase/firestore';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch } from '../index';
import {
  listActivityLogs,
  getActivityLogsCount,
  listMyActivityPaginated,
  getMyActivityCount,
  exportActivityLogs,
  subscribeToActivityLogs,
  ACTIVITY_LOGS_PAGE_SIZE,
} from '../../services/firebase/activityLogService';
import { saveCsvAndShare } from '../../utils/csvExport';
import type { RootState } from '../index';

// Use plain action types to avoid require cycle: activityLogSlice <-> activityLogThunks
const ACTIVITY_LOG_UPDATE_LOGS = 'activityLog/updateLogsFromSnapshot';
const ACTIVITY_LOG_SET_LOADING = 'activityLog/setLoading';
const ACTIVITY_LOG_SET_ERROR = 'activityLog/setError';

/**
 * Subscription manager - stores unsubscribe functions
 */
let activityLogsUnsubscribe: (() => void) | null = null;

/**
 * Fetch activity logs with filters and pagination.
 * Fetches count + first page in parallel for "Showing X of Y" display.
 */
export const fetchActivityLogs = createAsyncThunk(
  'activityLog/fetchLogs',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters } = state.activityLog;

      const [countResult, listResult] = await Promise.all([
        getActivityLogsCount(filters),
        listActivityLogs(filters, ACTIVITY_LOGS_PAGE_SIZE),
      ]);

      return {
        logs: listResult.logs,
        lastDoc: listResult.lastDoc,
        totalCount: countResult,
        pageSize: ACTIVITY_LOGS_PAGE_SIZE,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return rejectWithValue(
        err.message ?? 'Failed to fetch activity logs'
      );
    }
  }
);

/**
 * Load more activity logs (pagination)
 */
export const loadMoreActivityLogs = createAsyncThunk(
  'activityLog/loadMore',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters, lastDoc } = state.activityLog;

      if (!lastDoc) {
        return { logs: [], lastDoc: null, pageSize: ACTIVITY_LOGS_PAGE_SIZE };
      }

      const { logs, lastDoc: newLastDoc } = await listActivityLogs(
        filters,
        ACTIVITY_LOGS_PAGE_SIZE,
        lastDoc as DocumentSnapshot
      );
      return {
        logs,
        lastDoc: newLastDoc,
        pageSize: ACTIVITY_LOGS_PAGE_SIZE,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return rejectWithValue(
        err.message ?? 'Failed to load more activity logs'
      );
    }
  }
);

/**
 * Fetch user's own activity with pagination (initial load).
 * Fetches count + first page in parallel.
 */
export const fetchMyActivityPaginated = createAsyncThunk(
  'activityLog/fetchMyActivityPaginated',
  async (userId: string, { rejectWithValue }) => {
    try {
      const [totalCount, listResult] = await Promise.all([
        getMyActivityCount(userId),
        listMyActivityPaginated(userId, ACTIVITY_LOGS_PAGE_SIZE),
      ]);
      return {
        logs: listResult.logs,
        totalCount,
        lastDoc: listResult.lastDoc,
        pageSize: ACTIVITY_LOGS_PAGE_SIZE,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return rejectWithValue(
        err.message ?? 'Failed to fetch my activity'
      );
    }
  }
);

/**
 * Load more of user's activity (next page).
 */
export const loadMoreMyActivity = createAsyncThunk(
  'activityLog/loadMoreMyActivity',
  async (userId: string, { getState, rejectWithValue }) => {
    const { myActivityLastDoc } = (getState() as RootState).activityLog;
    if (!myActivityLastDoc) {
      return { logs: [], lastDoc: null, pageSize: ACTIVITY_LOGS_PAGE_SIZE };
    }
    try {
      const { logs, lastDoc } = await listMyActivityPaginated(
        userId,
        ACTIVITY_LOGS_PAGE_SIZE,
        myActivityLastDoc as DocumentSnapshot
      );
      return {
        logs,
        lastDoc,
        pageSize: ACTIVITY_LOGS_PAGE_SIZE,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return rejectWithValue(
        err.message ?? 'Failed to load more activity'
      );
    }
  }
);

/**
 * Export activity logs as CSV
 */
export const exportActivityLogsThunk = createAsyncThunk(
  'activityLog/exportLogs',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters } = state.activityLog;

      const csvString = await exportActivityLogs({
        filters,
        maxRecords: 1000,
      });
      await saveCsvAndShare(csvString, 'activity-logs');

      return true;
    } catch (error: unknown) {
      const err = error as Error;
      return rejectWithValue(
        err.message ?? 'Failed to export activity logs'
      );
    }
  }
);

/** Minimum time (ms) to show loader so users can see it when Firestore returns from cache instantly */
const MIN_LOADER_DISPLAY_MS = 400;

/**
 * Subscribe to real-time activity logs updates
 * Automatically unsubscribes from previous subscription if exists
 */
export const subscribeToActivityLogsRealtime = () => {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    // Unsubscribe from previous listener
    if (activityLogsUnsubscribe) {
      activityLogsUnsubscribe();
      activityLogsUnsubscribe = null;
    }

    const state = getState();
    const { filters } = state.activityLog;

    const startTime = Date.now();
    dispatch({ type: ACTIVITY_LOG_SET_LOADING, payload: true });

    // Set up new subscription
    activityLogsUnsubscribe = subscribeToActivityLogs(
      filters,
      ACTIVITY_LOGS_PAGE_SIZE,
      (logs) => {
        // Firestore onSnapshot fires almost immediately (often from cache).
        // Delay clearing loader so users actually see it.
        const elapsed = Date.now() - startTime;
        const dispatchUpdate = () =>
          dispatch({ type: ACTIVITY_LOG_UPDATE_LOGS, payload: logs });
        if (elapsed >= MIN_LOADER_DISPLAY_MS) {
          dispatchUpdate();
        } else {
          setTimeout(dispatchUpdate, MIN_LOADER_DISPLAY_MS - elapsed);
        }
      },
      (error) => {
        // Handle error
        dispatch({ type: ACTIVITY_LOG_SET_ERROR, payload: error.message ?? 'Failed to subscribe to activity logs' });
      }
    );
  };
};

/**
 * Unsubscribe from activity logs real-time updates
 */
export const unsubscribeFromActivityLogs = () => {
  return () => {
    if (activityLogsUnsubscribe) {
      activityLogsUnsubscribe();
      activityLogsUnsubscribe = null;
    }
  };
};

