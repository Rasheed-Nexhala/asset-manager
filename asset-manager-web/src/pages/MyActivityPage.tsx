import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectMyRecentActivitySorted,
  selectMyActivityLoading,
  selectMyActivityLoadingMore,
  selectMyActivityTotalCount,
  selectMyActivityHasMore,
} from '../store/selectors/activityLogSelectors';
import { selectUserId, selectUserRoleType } from '../store/selectors/authSelectors';
import {
  fetchMyActivityPaginated,
  loadMoreMyActivity,
} from '../store/thunks/activityLogThunks';
import type { ActivityLog } from '../types/activityLog';
import { ActivityLogCard } from '../components/activityLog/ActivityLogCard';
import { ActivityLogDetailModal } from '../components/activityLog/ActivityLogDetailModal';
import { Icon } from '../components/shared/Icon';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export function MyActivityPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const roleType = useAppSelector(selectUserRoleType);
  const recentActivity = useAppSelector(selectMyRecentActivitySorted);
  const loading = useAppSelector(selectMyActivityLoading);
  const loadingMore = useAppSelector(selectMyActivityLoadingMore);
  const totalCount = useAppSelector(selectMyActivityTotalCount);
  const hasMore = useAppSelector(selectMyActivityHasMore);

  const isUnassigned = roleType === 'Unassigned' || !roleType;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      dispatch(fetchMyActivityPaginated(userId));
    }
  }, [dispatch, userId]);

  const handleLoadMore = useCallback(() => {
    if (!userId || !hasMore || loadingMore) return;
    dispatch(loadMoreMyActivity(userId));
  }, [dispatch, userId, hasMore, loadingMore]);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      await dispatch(fetchMyActivityPaginated(userId)).unwrap();
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, userId]);

  const handleCardPress = useCallback((log: ActivityLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  }, []);

  const showInitialLoader =
    recentActivity.length === 0 && (loading || totalCount === null);

  if (showInitialLoader) {
    return (
      <div className="flex flex-col gap-6 px-4 py-4 md:px-6">
        <h1 className="text-[22px] font-semibold text-slate-900">
          My Recent Activity
        </h1>
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
      <h1 className="text-[22px] font-semibold text-slate-900">
        My Recent Activity
      </h1>

      {totalCount != null && (
        <div className="bg-blue-800/10 px-4 py-3 rounded-lg flex items-start gap-2">
          <Icon name="chart-bar" className="h-5 w-5 text-blue-800 shrink-0 mt-0.5" />
          <p className="text-[13px] text-blue-800 flex-1">
            Showing {recentActivity.length} of {totalCount} actions
          </p>
        </div>
      )}

      <div className="space-y-3">
        {recentActivity.map((log) => (
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

      {recentActivity.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center px-4 py-12">
          <Icon name="clock" className="h-20 w-20 text-slate-400 mb-4" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2">
            No recent activity
          </h2>
          <p className="text-[15px] text-slate-500 text-center mb-6">
            {isUnassigned
              ? 'You will be active once your role is assigned.'
              : 'Your activity will appear here when you create requests or perform actions in the system'}
          </p>
          {!isUnassigned && (
            <button
              type="button"
              onClick={() => navigate('/requests/new')}
              className="bg-blue-800 rounded-[10px] h-[50px] px-6 flex items-center justify-center text-[15px] font-semibold text-white hover:bg-blue-900"
            >
              Create your first request
            </button>
          )}
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
