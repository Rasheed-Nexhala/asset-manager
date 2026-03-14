import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectMyRecentActivitySorted,
  selectMyActivityLoading,
} from '../../store/selectors/activityLogSelectors';
import { selectUserId } from '../../store/selectors/authSelectors';
import { fetchMyActivityPaginated } from '../../store/thunks/activityLogThunks';
import { ACTION_TYPE_CONFIG } from '../../constants/activityLogConfig';
import { Icon, type IconName } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';

/** Maps activityLogConfig icon names (Ionicons) to our Icon component names */
const ICON_MAP: Record<string, string> = {
  'document-text-outline': 'document-text',
  'log-in-outline': 'arrow-path',
  'log-out-outline': 'arrow-path',
  'create-outline': 'document-text',
  'cube-outline': 'cube',
  'file-tray-full-outline': 'inbox',
  'checkmark-circle-outline': 'chart-bar',
  'time-outline': 'clock',
};

interface MyRecentActivityWidgetProps {
  onViewAll?: () => void;
}

/** Format relative timestamp for widget list */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffHours < 24) {
    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (diffHours < 48) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function MyRecentActivityWidget({ onViewAll }: MyRecentActivityWidgetProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const recentActivity = useAppSelector(selectMyRecentActivitySorted);
  const loading = useAppSelector(selectMyActivityLoading);

  useEffect(() => {
    if (userId) {
      dispatch(fetchMyActivityPaginated(userId));
    }
  }, [dispatch, userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-[10px] p-4 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[180px]">
        <LoadingSpinner size="sm" />
        <p className="text-[13px] text-slate-500 mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[17px] font-semibold text-slate-900">
          My Recent Activity
        </h3>
        {onViewAll && (
          <Link
            to="/activity/my-activity"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center px-2 text-[15px] font-medium text-blue-500 hover:text-blue-700"
            aria-label="View all activity"
          >
            View All
          </Link>
        )}
      </div>

      {recentActivity.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Icon name="document-text" className="h-16 w-16 text-slate-400 mb-4" />
          <h4 className="text-[22px] font-semibold text-slate-900 text-center mb-2">
            No Recent Activity
          </h4>
          <p className="text-[15px] text-slate-500 text-center">
            Your activity will appear here as you use the app
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentActivity.slice(0, 5).map((log) => {
            const actionConfig = ACTION_TYPE_CONFIG[log.actionType] ?? {
              label: log.actionType,
              icon: 'document-text-outline',
              category: log.actionCategory,
            };
            const iconName = (ICON_MAP[actionConfig.icon] ?? 'document-text') as IconName;
            return (
              <div
                key={log.id}
                className="flex items-center gap-3 py-3 border-b border-slate-200 last:border-b-0"
              >
                <div className="w-9 h-9 rounded-full bg-blue-800/15 flex items-center justify-center shrink-0">
                  <Icon name={iconName} className="h-[18px] w-[18px] text-blue-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-slate-900 truncate">
                    {actionConfig.label}
                  </p>
                  <p className="text-[13px] text-slate-500 truncate">
                    {log.targetDisplay}
                  </p>
                </div>
                <span className="text-[13px] text-slate-500 shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
