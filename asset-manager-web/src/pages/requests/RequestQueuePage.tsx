import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFilters } from '../../store/slices/requestsSlice';
import { exportRequestsThunk } from '../../store/thunks/requestThunks';
import {
  selectFilteredAndSearchedRequestsSortedByDate,
  selectRequestsLoading,
  selectRequestsFilters,
  selectRequestsTotalCount,
} from '../../store/selectors/requestSelectors';
import { selectAllSites } from '../../store/selectors/sitesSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { fetchSites } from '../../store/slices/sitesSlice';
import { useRequestQueueSubscription } from '../../hooks/useRequestsSubscriptions';
import { RequestCard, RequestStatusBadge, RequestTypeBadge } from '../../components/requests';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type { Request } from '../../types/request';
import { selectCanManageRequests } from '../../store/selectors/authSelectors';

export function RequestQueuePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const canManageRequests = useAppSelector(selectCanManageRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useRequestQueueSubscription();

  const requests = useAppSelector((state) =>
    selectFilteredAndSearchedRequestsSortedByDate(state, searchQuery)
  );
  const isLoading = useAppSelector(selectRequestsLoading);
  const filters = useAppSelector(selectRequestsFilters);
  const totalCount = useAppSelector(selectRequestsTotalCount);
  const sites = useAppSelector(selectAllSites);
  const allItems = useAppSelector(selectAllItems);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      debounceRef.current = null;
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    dispatch(fetchItems(undefined));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchSites());
  }, [dispatch]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    await dispatch(exportRequestsThunk({}));
    setIsExporting(false);
  }, [dispatch]);

  const handleRequestPress = useCallback(
    (request: Request) => {
      navigate(`/requests/${request.id}/process`);
    },
    [navigate]
  );

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.siteId !== 'all' ||
    filters.priority !== 'all' ||
    searchQuery.trim().length > 0;

  const isInitialOrRefetching =
    requests.length === 0 && totalCount === null;
  const showLoading =
    isInitialOrRefetching || (isLoading && requests.length === 0);

  if (showLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between gap-4 pb-4">
          <h1 className="text-[22px] font-semibold text-slate-900">
            Request Queue
          </h1>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isExporting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Icon name="arrow-down-tray" className="h-5 w-5" />
            )}
            Export
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 pb-4">
        <h1 className="text-[22px] font-semibold text-slate-900">
          Request Queue
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[15px] font-medium ${
              showFilters
                ? 'border-blue-800 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon name="funnel" className="h-5 w-5" />
            Filters
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isExporting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Icon name="arrow-down-tray" className="h-5 w-5" />
            )}
            Export
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="bg-white rounded-[10px] border border-slate-200 p-3 mb-4">
        <div className="flex items-center gap-3 rounded-full bg-slate-100 px-4 py-3">
          <Icon name="magnifying-glass" className="h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by request number, site, requester, purpose, or item..."
            className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none"
            aria-label="Search requests"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
              aria-label="Clear search"
            >
              <Icon name="x-mark" className="h-5 w-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-[10px] border border-slate-200 p-4 mb-4 space-y-4">
          <div>
            <p className="text-[15px] font-medium text-slate-900 mb-2">
              Priority
            </p>
            <div className="flex flex-wrap gap-2">
              {['all', 'high', 'medium', 'low'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => dispatch(setFilters({ priority: p }))}
                  className={`px-4 py-2 rounded-full border text-[13px] font-medium min-h-[40px] ${
                    filters.priority === p
                      ? 'bg-blue-800 border-blue-800 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[15px] font-medium text-slate-900 mb-2">Site</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => dispatch(setFilters({ siteId: 'all' }))}
                className={`px-4 py-2 rounded-full border text-[13px] font-medium min-h-[40px] ${
                  filters.siteId === 'all'
                    ? 'bg-blue-800 border-blue-800 text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                All
              </button>
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => dispatch(setFilters({ siteId: site.id }))}
                  className={`px-4 py-2 rounded-full border text-[13px] font-medium min-h-[40px] ${
                    filters.siteId === site.id
                      ? 'bg-blue-800 border-blue-800 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {site.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[15px] font-medium text-slate-900 mb-2">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'all',
                'pending',
                'approved',
                'transferred',
                'partially_returned',
                'returned',
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => dispatch(setFilters({ status: s }))}
                  className={`px-4 py-2 rounded-full border text-[13px] font-medium min-h-[40px] ${
                    filters.status === s
                      ? 'bg-blue-800 border-blue-800 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {s === 'all'
                    ? 'All'
                    : s
                        .split('_')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="document-text" className="h-20 w-20 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
            No Requests Found
          </h2>
          <p className="text-[15px] text-slate-500 text-center">
            {hasActiveFilters
              ? 'Try adjusting your filters or search to see more requests.'
              : 'No requests in the queue yet.'}
          </p>
        </div>
      ) : (
        <>
          {totalCount != null && (
            <p className="text-[13px] text-slate-500 mb-2">
              Showing {requests.length} of {totalCount}
            </p>
          )}
          {/* Desktop: Table */}
          <div className="hidden md:block overflow-hidden rounded-[10px] border border-slate-200 bg-white flex-1 min-h-0">
            <div className="overflow-y-auto max-h-[calc(100vh-20rem)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Request
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Site
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-[13px] font-semibold text-slate-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const ts = request.createdAt;
                    const createdStr =
                      typeof ts === 'string'
                        ? new Date(ts).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : ts?.toDate?.()
                          ? ts.toDate().toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '—';
                    const siteDisplay =
                      request.requestType === 'site_transfer' && request.sourceSiteName
                        ? `${request.sourceSiteName} → ${request.siteName}`
                        : request.siteName ?? '—';
                    const queueRowIsViewOnly =
                      request.status === 'rejected' ||
                      request.status === 'transferred';
                    const showProcessButton =
                      canManageRequests && !queueRowIsViewOnly;
                    return (
                      <tr
                        key={request.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleRequestPress(request)}
                            className="text-[15px] font-semibold text-blue-800 hover:underline text-left"
                          >
                            {request.requestNumber ?? '—'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <RequestTypeBadge requestType={request.requestType} />
                        </td>
                        <td className="px-4 py-3 text-[15px] text-slate-900 truncate max-w-[180px]">
                          {siteDisplay}
                        </td>
                        <td className="px-4 py-3 text-[15px] text-slate-700">
                          {request.items?.length ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <RequestStatusBadge status={request.status} />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-500">
                          {createdStr}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {showProcessButton ? (
                            <button
                              type="button"
                              onClick={() => handleRequestPress(request)}
                              className="rounded-[10px] bg-blue-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-900 transition-colors"
                            >
                              Process
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRequestPress(request)}
                              className="rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile: Cards */}
          <div className="space-y-3 overflow-y-auto flex-1 md:hidden">
            {requests.map((request) => {
              const showAvailability =
                canManageRequests &&
                (request.status === 'pending' || request.status === 'approved');
              const isSiteTransfer = request.requestType === 'site_transfer';
              const availabilityUnknown = isSiteTransfer;
              const isAllSufficient = availabilityUnknown
                ? false
                : request.items.every((ri) => {
                    const invItem = allItems.find((i) => i.id === ri.itemId);
                    const available = invItem?.centralStoreQuantity ?? 0;
                    return available >= ri.quantityRequested;
                  });

              return (
                <RequestCard
                  key={request.id}
                  request={request}
                  onPress={() => handleRequestPress(request)}
                  showAvailability={showAvailability}
                  isAllSufficient={isAllSufficient}
                  availabilityUnknown={availabilityUnknown}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
