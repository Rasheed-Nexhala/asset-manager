import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DocumentSnapshot } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchItemById } from '../../store/thunks/inventoryThunks';
import { selectItemById } from '../../store/selectors/inventorySelectors';
import {
  listActivityLogs,
  getActivityLogsCount,
  exportActivityLogs,
  ACTIVITY_LOGS_PAGE_SIZE,
} from '../../services/firebase/activityLogService';
import { saveCsvAndShare } from '../../utils/csvExport';
import type { ActivityLog, ActivityLogFiltersStore } from '../../types/activityLog';
import { ActivityLogCard } from '../../components/activityLog/ActivityLogCard';
import { ActivityLogDetailModal } from '../../components/activityLog/ActivityLogDetailModal';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

function buildItemFilters(itemId: string): ActivityLogFiltersStore {
  return {
    startDate: null,
    endDate: null,
    userId: null,
    actionCategory: 'all',
    actionType: 'all',
    searchQuery: '',
    targetType: 'item',
    targetId: itemId,
  };
}

export function ItemActivityHistoryPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const item = useAppSelector((s) => (itemId ? selectItemById(itemId)(s) : undefined));

  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    dispatch(fetchItemById(itemId));
  }, [dispatch, itemId]);

  useEffect(() => {
    setSearchQuery('');
  }, [itemId]);

  const fetchLogs = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const queryFilters = buildItemFilters(itemId);
      const [count, listResult] = await Promise.all([
        getActivityLogsCount(queryFilters),
        listActivityLogs(queryFilters, ACTIVITY_LOGS_PAGE_SIZE),
      ]);
      setLogs(listResult.logs);
      setLastDoc(listResult.lastDoc);
      setTotalCount(count);
      setHasMore(
        listResult.logs.length >= ACTIVITY_LOGS_PAGE_SIZE &&
          listResult.lastDoc != null
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load history';
      setError(msg);
      setLogs([]);
      setTotalCount(null);
      setLastDoc(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.userName.toLowerCase().includes(q) ||
        (log.targetDisplay ?? '').toLowerCase().includes(q) ||
        (log.summary ?? '').toLowerCase().includes(q) ||
        (log.details ?? '').toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const handleLoadMore = useCallback(async () => {
    if (!itemId || !lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const queryFilters = buildItemFilters(itemId);
      const { logs: next, lastDoc: nextLast } = await listActivityLogs(
        queryFilters,
        ACTIVITY_LOGS_PAGE_SIZE,
        lastDoc
      );
      setLogs((prev) => [...prev, ...next]);
      setLastDoc(nextLast);
      setHasMore(
        next.length >= ACTIVITY_LOGS_PAGE_SIZE && nextLast != null
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [itemId, lastDoc, hasMore, loadingMore]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value ?? '');
    },
    []
  );

  const handleExport = useCallback(async () => {
    if (!itemId) return;
    setExportLoading(true);
    setError(null);
    try {
      const queryFilters = buildItemFilters(itemId);
      const csv = await exportActivityLogs({
        filters: queryFilters,
        maxRecords: 1000,
      });
      const safeName = (item?.name ?? itemId).replace(/[^\w\-]+/g, '_').slice(0, 48);
      await saveCsvAndShare(csv, `item-history-${safeName}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportLoading(false);
    }
  }, [itemId, item?.name]);

  const hasSearchQuery = Boolean(searchQuery.trim());

  const title = item?.name ? `History: ${item.name}` : 'Item history';

  if (!itemId) {
    return (
      <div className="px-4 py-6">
        <p className="text-[15px] text-slate-600">Invalid link.</p>
      </div>
    );
  }

  const isInitialOrRefetching =
    logs.length === 0 && totalCount === null && !error;
  const showInitialLoader =
    isInitialOrRefetching || (loading && logs.length === 0);

  if (showInitialLoader) {
    return (
      <div className="flex flex-col gap-6 px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/inventory/${itemId}`)}
            className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Back to item"
          >
            <Icon name="arrow-left" className="h-6 w-6 text-slate-600" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">{title}</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate(`/inventory/${itemId}`)}
            className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Back to item"
          >
            <Icon name="arrow-left" className="h-6 w-6 text-slate-600" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
            placeholder="Search by user, summary, or details..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-full text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800"
            aria-label="Search item history"
          />
        </div>
      </div>

      {totalCount != null && logs.length > 0 && (
        <p className="text-[13px] text-slate-500">
          Showing {filteredLogs.length} of {totalCount} events
          {hasSearchQuery ? ' (filtered by search)' : ''}
        </p>
      )}

      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <ActivityLogCard
            key={log.id}
            log={log}
            variant="itemHistory"
            onPress={() => {
              setSelectedLog(log);
              setDetailOpen(true);
            }}
          />
        ))}
      </div>

      {filteredLogs.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Icon name="document-text" className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-[17px] font-semibold text-slate-900 mb-2">
            {hasSearchQuery ? 'No events match' : 'No history yet'}
          </p>
          <p className="text-[15px] text-slate-500">
            {hasSearchQuery
              ? 'Try a different search term.'
              : 'Stock changes, edits, and other audited actions for this item will appear here.'}
          </p>
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {hasMore && !loadingMore && logs.length > 0 && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleLoadMore}
            className="rounded-[10px] bg-blue-800/10 px-6 py-2 text-[15px] font-medium text-blue-800 hover:bg-blue-800/15"
          >
            Load more
          </button>
        </div>
      )}

      <ActivityLogDetailModal
        isOpen={detailOpen}
        log={selectedLog}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
