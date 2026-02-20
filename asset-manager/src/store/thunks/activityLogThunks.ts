import type { DocumentSnapshot } from 'firebase/firestore';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch } from '../index';
import {
  listActivityLogs,
  getMyRecentActivity,
  exportActivityLogs,
  subscribeToActivityLogs,
  subscribeToMyRecentActivity,
} from '../../services/firebase/activityLogService';
import { saveCsvAndShare } from '../../utils/csvExport';
import {
  updateLogsFromSnapshot,
  updateMyActivityFromSnapshot,
  setLoading,
  setMyActivityLoading,
  setError,
} from '../slices/activityLogSlice';
import type { RootState } from '../index';

const PAGE_SIZE = 50;

/**
 * Subscription manager - stores unsubscribe functions
 */
let activityLogsUnsubscribe: (() => void) | null = null;

/**
 * MyActivity subscription: ref-counted so MyRecentActivityWidget and MyActivityScreen
 * can both subscribe without one unmount killing the other's subscription
 */
let myActivityUnsubscribe: (() => void) | null = null;
let myActivityRefCount = 0;
let myActivitySubscribedUserId: string | null = null;

/**
 * Fetch activity logs with filters and pagination
 */
export const fetchActivityLogs = createAsyncThunk(
  'activityLog/fetchLogs',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters } = state.activityLog;

      const { logs, lastDoc } = await listActivityLogs(
        filters,
        PAGE_SIZE
      );
      return { logs, lastDoc };
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
        return rejectWithValue('No more logs to load');
      }

      const { logs, lastDoc: newLastDoc } = await listActivityLogs(
        filters,
        PAGE_SIZE,
        lastDoc as DocumentSnapshot
      );
      return { logs, lastDoc: newLastDoc };
    } catch (error: unknown) {
      const err = error as Error;
      return rejectWithValue(
        err.message ?? 'Failed to load more activity logs'
      );
    }
  }
);

/**
 * Fetch user's own recent activity (last 10 actions)
 */
export const fetchMyRecentActivity = createAsyncThunk(
  'activityLog/fetchMyActivity',
  async (userId: string, { rejectWithValue }) => {
    try {
      const logs = await getMyRecentActivity(userId);
      return logs;
    } catch (error: unknown) {
      const err = error as Error;
      return rejectWithValue(
        err.message ?? 'Failed to fetch recent activity'
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
    dispatch(setLoading(true));

    // Set up new subscription
    activityLogsUnsubscribe = subscribeToActivityLogs(
      filters,
      PAGE_SIZE,
      (logs) => {
        // Firestore onSnapshot fires almost immediately (often from cache).
        // Delay clearing loader so users actually see it.
        const elapsed = Date.now() - startTime;
        const dispatchUpdate = () =>
          dispatch(updateLogsFromSnapshot(logs));
        if (elapsed >= MIN_LOADER_DISPLAY_MS) {
          dispatchUpdate();
        } else {
          setTimeout(dispatchUpdate, MIN_LOADER_DISPLAY_MS - elapsed);
        }
      },
      (error) => {
        // Handle error
        dispatch(setError(error.message ?? 'Failed to subscribe to activity logs'));
      }
    );
  };
};

/**
 * Subscribe to user's own recent activity (real-time)
 * Ref-counted: multiple consumers (Widget + Screen) can subscribe; only unsubscribes when all unsubscribe
 */
export const subscribeToMyRecentActivityRealtime = (userId: string) => {
  return (dispatch: AppDispatch) => {
    // Same userId and already subscribed: increment ref count
    if (myActivitySubscribedUserId === userId && myActivityUnsubscribe) {
      myActivityRefCount += 1;
      return;
    }

    // Different userId or no subscription: unsubscribe existing, then subscribe
    if (myActivityUnsubscribe) {
      myActivityUnsubscribe();
      myActivityUnsubscribe = null;
      myActivityRefCount = 0;
      myActivitySubscribedUserId = null;
    }

    myActivitySubscribedUserId = userId;
    myActivityRefCount = 1;

    const startTime = Date.now();
    dispatch(setMyActivityLoading(true));

    myActivityUnsubscribe = subscribeToMyRecentActivity(
      userId,
      (logs) => {
        // Firestore onSnapshot fires almost immediately (often from cache).
        // Delay clearing loader so users actually see it.
        const elapsed = Date.now() - startTime;
        const dispatchUpdate = () =>
          dispatch(updateMyActivityFromSnapshot(logs));
        if (elapsed >= MIN_LOADER_DISPLAY_MS) {
          dispatchUpdate();
        } else {
          setTimeout(dispatchUpdate, MIN_LOADER_DISPLAY_MS - elapsed);
        }
      },
      (error) => {
        dispatch(setError(error.message ?? 'Failed to subscribe to recent activity'));
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

/**
 * Unsubscribe from recent activity real-time updates
 * Ref-counted: only unsubscribes when ref count hits 0
 */
export const unsubscribeFromMyRecentActivity = () => {
  return () => {
    myActivityRefCount = Math.max(0, myActivityRefCount - 1);
    if (myActivityRefCount === 0 && myActivityUnsubscribe) {
      myActivityUnsubscribe();
      myActivityUnsubscribe = null;
      myActivitySubscribedUserId = null;
    }
  };
};
