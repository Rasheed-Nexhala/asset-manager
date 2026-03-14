import { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMyRequestsPaginated,
  loadMoreMyRequests,
  exportRequestsThunk,
} from '../../store/thunks/requestThunks';
import {
  selectMyRequestsByStatusAndSearch,
  selectRequestsLoading,
  selectMyRequestsTotalCount,
  selectMyRequestsHasMore,
  selectMyRequestsLoadingMore,
} from '../../store/selectors/requestSelectors';
import {
  selectUserId,
  selectIsSiteManager,
  selectAuthInitialized,
} from '../../store/selectors/authSelectors';
import { selectAllSites, selectAssignedSiteIdForUser } from '../../store/selectors/sitesSelectors';
import { fetchSites } from '../../store/slices/sitesSlice';
import { useMyRequestsSubscription } from '../../hooks/useRequestsSubscriptions';
import { RequestCard } from '../../components/requests';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type { Request } from '../../types/request';

type TabKey =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'transferred'
  | 'partially_returned'
  | 'returned';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'transferred', label: 'Transferred' },
  { key: 'partially_returned', label: 'Partially Returned' },
  { key: 'returned', label: 'Returned' },
];

export function MyRequestsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useMyRequestsSubscription();

  const userId = useAppSelector(selectUserId);
  const authInitialized = useAppSelector(selectAuthInitialized);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const sites = useAppSelector(selectAllSites);
  const myAssignedSiteId = useAppSelector(selectAssignedSiteIdForUser(userId));

  const status = activeTab === 'all' ? 'all' : activeTab;
  const filteredRequests = useAppSelector((state) =>
    selectMyRequestsByStatusAndSearch(state, status, searchQuery)
  );
  const isLoading = useAppSelector(selectRequestsLoading);
  const totalCount = useAppSelector(selectMyRequestsTotalCount);
  const hasMore = useAppSelector(selectMyRequestsHasMore);
  const loadingMore = useAppSelector(selectMyRequestsLoadingMore);

  const currentSite = useMemo(
    () => sites.find((s) => s.id === myAssignedSiteId) ?? null,
    [sites, myAssignedSiteId]
  );

  useEffect(() => {
    dispatch(fetchSites());
  }, [dispatch]);

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchMyRequestsPaginated(userId));
  }, [dispatch, userId]);

  const handleLoadMore = useCallback(() => {
    if (userId && hasMore && !loadingMore) {
      dispatch(loadMoreMyRequests(userId));
    }
  }, [dispatch, userId, hasMore, loadingMore]);

  const handleCreateRequest = useCallback(() => {
    if (!currentSite) return;
    navigate(`/requests/new?siteId=${currentSite.id}`);
  }, [navigate, currentSite]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    await dispatch(exportRequestsThunk({ mode: 'my' }));
    setIsExporting(false);
  }, [dispatch]);

  const handleRequestPress = useCallback(
    (request: Request) => {
      if (request.status === 'draft') {
        navigate(`/requests/${request.id}/edit`);
      } else {
        navigate(`/requests/${request.id}/process`);
      }
    },
    [navigate]
  );

  const showLoading =
    (filteredRequests.length === 0 && totalCount === null) ||
    (isLoading && filteredRequests.length === 0);

  if (authInitialized && !userId) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between gap-4 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-6 w-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">
            My Requests
          </h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <Icon name="user-circle" className="h-20 w-20 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
            Sign In Required
          </h2>
          <p className="text-[15px] text-slate-500 text-center">
            Please sign in to view your requests.
          </p>
        </div>
      </div>
    );
  }

  if (showLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between gap-4 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Go back"
          >
            <Icon name="arrow-left" className="h-6 w-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900">
            My Requests
          </h1>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-[10px] border border-slate-200 px-4 py-2.5"
          >
            {isExporting ? (
              <LoadingSpinner className="h-5 w-5" />
            ) : (
              <Icon name="arrow-down-tray" className="h-5 w-5" />
            )}
            Export
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <LoadingSpinner className="h-8 w-8 text-blue-800" />
          <p className="text-[15px] text-slate-500 mt-4">
            Loading your requests...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-slate-100"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="h-6 w-6" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900">
          My Requests
        </h1>
        <div className="flex items-center gap-2">
          {isSiteManager && currentSite && (
            <button
              type="button"
              onClick={handleCreateRequest}
              className="flex items-center gap-2 rounded-[10px] bg-blue-800 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-blue-900"
            >
              <Icon name="plus-circle" className="h-5 w-5" />
              New Request
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-[10px] border border-slate-200 px-4 py-2.5"
          >
            {isExporting ? (
              <LoadingSpinner className="h-5 w-5" />
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

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full border text-[13px] font-medium whitespace-nowrap min-h-[40px] ${
              activeTab === tab.key
                ? 'bg-blue-800 border-blue-800 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="document-text" className="h-16 w-16 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
            No Requests Yet
          </h2>
          <p className="text-[15px] text-slate-500 text-center mb-6">
            {searchQuery.trim()
              ? 'No requests match your search. Try different keywords.'
              : activeTab !== 'all'
                ? `No ${activeTab.replace('_', ' ')} requests.`
                : 'Create your first request to get started.'}
          </p>
          {isSiteManager && currentSite && activeTab === 'all' && (
            <button
              type="button"
              onClick={handleCreateRequest}
              className="flex items-center gap-2 bg-blue-800 rounded-[10px] h-[50px] px-6 text-[15px] font-semibold text-white hover:bg-blue-900"
            >
              <Icon name="plus-circle" className="h-6 w-6" />
              New Request
            </button>
          )}
        </div>
      ) : (
        <>
          {totalCount != null && (
            <p className="text-[13px] text-slate-500 mb-2">
              Showing {filteredRequests.length} of {totalCount}
            </p>
          )}
          <div className="space-y-3 overflow-y-auto flex-1">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onPress={() => handleRequestPress(request)}
                showAvailability={false}
              />
            ))}
            {hasMore && !loadingMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                className="w-full py-4 text-center text-[15px] font-medium text-blue-800 hover:underline"
              >
                Load more
              </button>
            )}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <LoadingSpinner className="h-6 w-6 text-blue-800" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
