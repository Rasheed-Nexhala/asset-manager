import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { ActionCategory, ActivityLogFiltersUI } from '../../types/activityLog';
import { filtersToUI } from '../../utils/dateSerialization';

/** Base selector */
export const selectActivityLogState = (state: RootState) =>
  state.activityLog;

/** Activity logs */
export const selectActivityLogs = (state: RootState) =>
  state.activityLog.logs;

/** My recent activity (raw, may not be sorted) - with safe fallback for circular dependency edge cases */
export const selectMyRecentActivity = (state: RootState) =>
  state.activityLog?.myRecentActivity ?? [];

/** My recent activity sorted by timestamp descending (newest first) */
export const selectMyRecentActivitySorted = createSelector(
  [(state: RootState) => state.activityLog?.myRecentActivity ?? []],
  (logs) =>
    [...logs].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
);

/** Filters (store format - ISO strings for dates) */
export const selectActivityLogFilters = (state: RootState) =>
  state.activityLog.filters;

/** Filters as UI format (Date objects for DateTimePicker/display) */
export const selectActivityLogFiltersAsUI = createSelector(
  [selectActivityLogFilters],
  (filters): ActivityLogFiltersUI => filtersToUI(filters)
);

/** Loading states */
export const selectActivityLogLoading = (state: RootState) =>
  state.activityLog.loading;
export const selectActivityLogLoadingMore = (state: RootState) =>
  state.activityLog.loadingMore;
export const selectActivityLogExportLoading = (state: RootState) =>
  state.activityLog.exportLoading;
export const selectMyActivityLoading = (state: RootState) =>
  state.activityLog.myActivityLoading;

/** Error state */
export const selectActivityLogError = (state: RootState) =>
  state.activityLog.error;

/** Pagination */
export const selectHasMoreLogs = (state: RootState) =>
  state.activityLog.hasMore;

/** Logs by category (memoized factory selector) */
export const selectLogsByCategory = (category: ActionCategory) =>
  createSelector([selectActivityLogs], (logs) =>
    logs.filter((log) => log.actionCategory === category)
  );

/** Logs by user (memoized factory selector) */
export const selectLogsByUser = (userId: string) =>
  createSelector([selectActivityLogs], (logs) =>
    logs.filter((log) => log.userId === userId)
  );

/** Activity log statistics (memoized selector) */
export const selectActivityLogStats = createSelector(
  [selectActivityLogs],
  (logs) => {
    const stats: {
      total: number;
      byCategory: Partial<Record<ActionCategory, number>>;
    } = {
      total: logs.length,
      byCategory: {},
    };

    logs.forEach((log) => {
      stats.byCategory[log.actionCategory] =
        (stats.byCategory[log.actionCategory] ?? 0) + 1;
    });

    return stats;
  }
);
