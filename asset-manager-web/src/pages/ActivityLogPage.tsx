import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectActivityLogs,
  selectActivityLogLoading,
  selectActivityLogLoadingMore,
  selectActivityLogExportLoading,
  selectActivityLogError,
  selectHasMoreLogs,
  selectActivityLogTotalCount,
  selectActivityLogFilters,
} from '../store/selectors/activityLogSelectors';
import {
  fetchActivityLogs,
  loadMoreActivityLogs,
  exportActivityLogsThunk,
} from '../store/thunks/activityLogThunks';
import { setSearchQuery, clearError, setFilters, clearFilters } from '../store/slices/activityLogSlice';
import { useAutoClearError } from '../hooks/useAutoClearError';
import {
  ACTION_TYPE_CONFIG,
  ACTION_CATEGORY_CONFIG,
  CATEGORY_BADGE_BG_CLASS,
  CATEGORY_TEXT_CLASS,
} from '../constants/activityLogConfig';
import type { ActivityLog, ActivityLogFiltersStore } from '../types/activityLog';
import { ActivityLogCard } from '../components/activityLog/ActivityLogCard';
import { ActivityLogDetailModal } from '../components/activityLog/ActivityLogDetailModal';
import { ActivityLogFilterPanel } from '../components/activityLog/ActivityLogFilterPanel';
import { Icon } from '../components/shared/Icon';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function ActivityLogPage() {
  const dispatch = useAppDispatch();

  const logs = useAppSelector(selectActivityLogs);
  const loading = useAppSelector(selectActivityLogLoading);
  const loadingMore = useAppSelector(selectActivityLogLoadingMore);
  const exportLoading = useAppSelector(selectActivityLogExportLoading);
  const error = useAppSelector(selectActivityLogError);
  const hasMore = useAppSelector(selectHasMoreLogs);
  const totalCount = useAppSelector(selectActivityLogTotalCount);
  const filters = useAppSelector(selectActivityLogFilters);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const filteredLogs = useMemo(() => {
    const q = (filters.searchQuery ?? '').toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.userName.toLowerCase().includes(q) ||
        (log.targetDisplay ?? '').toLowerCase().includes(q) ||
        (log.summary ?? '').toLowerCase().includes(q) ||
        (log.details ?? '').toLowerCase().includes(q)
    );
  }, [logs, filters.searchQuery]);

  useEffect(() => {
    dispatch(fetchActivityLogs());
  }, [dispatch, filters.startDate, filters.endDate, filters.userId, filters.actionCategory, filters.actionType]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchActivityLogs()).finally(() =>
      setTimeout(() => setRefreshing(false), 300)
    );
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      dispatch(loadMoreActivityLogs());
    }
  }, [dispatch, hasMore, loadingMore]);

  const handleExport = useCallback(async () => {
    await dispatch(exportActivityLogsThunk());
  }, [dispatch]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setSearchQuery(e.target.value ?? ''));
    },
    [dispatch]
  );

  const handleApplyFilters = useCallback(
    (newFilters: ActivityLogFiltersStore) => {
      dispatch(setFilters(newFilters));
    },
    [dispatch]
  );

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const handleCardPress = useCallback((log: ActivityLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  }, []);

  useAutoClearError(error, () => dispatch(clearError()));

  const hasActiveFilters =
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.userId) ||
    (filters.actionCategory && filters.actionCategory !== 'all') ||
    (filters.actionType && filters.actionType !== 'all') ||
    Boolean(filters.searchQuery?.trim());

  const isInitialOrRefetching =
    logs.length === 0 && totalCount === null && !error;
  const showInitialLoader =
    isInitialOrRefetching || (loading && logs.length === 0);

  if (showInitialLoader) {
    return (
      <div className="flex flex-col gap-6 px-4 py-4 md:px-6">
        <h1 className="text-[22px] font-semibold text-slate-900">Activity Log</h1>
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-slate-900">Activity Log</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterPanelOpen(true)}
            className={`flex items-center gap-2 border rounded-[10px] px-4 py-2 text-[15px] font-medium transition-colors ${
              hasActiveFilters
                ? 'border-blue-800 text-blue-800 bg-blue-50'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon name="funnel" className="h-4 w-4" />
            {hasActiveFilters ? 'Filters Applied' : 'Filter'}
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-800" />
            )}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-slate-200 hover:bg-slate-50"
              aria-label="Clear filters"
            >
              <Icon name="x-mark" className="h-4 w-4 text-slate-500" />
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exportLoading}
            className="border border-blue-800 rounded-[10px] px-4 py-2 text-[15px] font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50"
          >
            {exportLoading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-600/15 px-4 py-3 rounded-lg">
          <p className="text-[13px] text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="relative">
          <Icon
            name="magnifying-glass"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search by user, target, summary, or details..."
            value={filters.searchQuery ?? ''}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-full text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800"
            aria-label="Search activity logs"
          />
          {(filters.searchQuery?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => dispatch(setSearchQuery(''))}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
              aria-label="Clear search"
            >
              <Icon name="x-mark" className="h-5 w-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {totalCount != null && logs.length > 0 && (
        <p className="text-[13px] text-slate-500">
          Showing {filteredLogs.length} of {totalCount} activity logs
          {filters.searchQuery && ' (filtered by search)'}
        </p>
      )}

      {/* Desktop: Table */}
      <div className="hidden md:block overflow-hidden rounded-[10px] border border-slate-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                Action
              </th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                Category
              </th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                Target
              </th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                Summary
              </th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                User
              </th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                Time
              </th>
              <th className="px-4 py-3 text-right text-[13px] font-semibold text-slate-900">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const actionConfig = ACTION_TYPE_CONFIG[log.actionType] ?? {
                label: log.actionType,
                category: log.actionCategory,
              };
              const categoryConfig = ACTION_CATEGORY_CONFIG[actionConfig.category ?? log.actionCategory];
              const badgeBgClass =
                CATEGORY_BADGE_BG_CLASS[(actionConfig.category ?? log.actionCategory) as keyof typeof CATEGORY_BADGE_BG_CLASS] ??
                'bg-[#475569]/15';
              const textClass =
                CATEGORY_TEXT_CLASS[(actionConfig.category ?? log.actionCategory) as keyof typeof CATEGORY_TEXT_CLASS] ??
                'text-[#475569]';
              const timeStr = new Date(log.timestamp).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              });
              return (
                <tr
                  key={log.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-[15px] font-medium text-slate-900">
                    {actionConfig.label}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${badgeBgClass} ${textClass}`}>
                      {categoryConfig?.label ?? log.actionCategory}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[15px] text-slate-700 truncate max-w-[140px]">
                    {log.targetDisplay ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[15px] text-slate-700 truncate max-w-[200px]">
                    {log.summary ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[15px] text-slate-700">
                    {log.userName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-500">
                    {timeStr}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleCardPress(log)}
                      className="rounded-[10px] bg-blue-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-900 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile: Cards */}
      <div className="space-y-3 md:hidden">
        {filteredLogs.map((log) => (
          <ActivityLogCard
            key={log.id}
            log={log}
            onPress={() => handleCardPress(log)}
          />
        ))}
      </div>

      {loadingMore && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {hasMore && !loadingMore && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleLoadMore}
            className="px-6 py-2 rounded-lg bg-blue-800/10 text-[15px] font-medium text-blue-800 hover:bg-blue-800/20"
          >
            Load more
          </button>
        </div>
      )}

      {filteredLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Icon name="document-text" className="h-20 w-20 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mt-4 mb-2">
            {hasActiveFilters || filters.searchQuery
              ? 'No Logs Match Your Filters'
              : 'No Activity Logs Yet'}
          </h2>
          <p className="text-[15px] text-slate-500 text-center">
            {hasActiveFilters || filters.searchQuery
              ? 'Try adjusting your filters to see more results'
              : 'Activity will appear here as users interact with the system'}
          </p>
        </div>
      )}

      <ActivityLogDetailModal
        isOpen={detailOpen}
        log={selectedLog}
        onClose={() => setDetailOpen(false)}
      />

      <ActivityLogFilterPanel
        isOpen={filterPanelOpen}
        filters={filters}
        onClose={() => setFilterPanelOpen(false)}
      />
    </div>
  );
}
