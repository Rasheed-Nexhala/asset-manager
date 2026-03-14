import type { ActivityLog } from '../../types/activityLog';
import {
  ACTION_TYPE_CONFIG,
  ACTION_CATEGORY_CONFIG,
  CATEGORY_BADGE_BG_CLASS,
  CATEGORY_TEXT_CLASS,
  CATEGORY_COLOR_MAP,
} from '../../constants/activityLogConfig';
import { Icon } from '../shared/Icon';
import { getActivityIconName } from './activityLogIconMap';
import type { IconName } from '../shared/Icon';

interface ActivityLogCardProps {
  log: ActivityLog;
  onPress: () => void;
}

/** Format timestamp as relative time */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function ActivityLogCard({ log, onPress }: ActivityLogCardProps) {
  const actionConfig = ACTION_TYPE_CONFIG[log.actionType] ?? {
    label: log.actionType,
    icon: 'document-text-outline',
    category: log.actionCategory,
  };

  const category = actionConfig.category ?? log.actionCategory;
  const categoryConfig = ACTION_CATEGORY_CONFIG[category];
  const badgeBgClass =
    CATEGORY_BADGE_BG_CLASS[category as keyof typeof CATEGORY_BADGE_BG_CLASS] ??
    'bg-[#475569]/15';
  const textClass =
    CATEGORY_TEXT_CLASS[category as keyof typeof CATEGORY_TEXT_CLASS] ??
    'text-[#475569]';
  const iconName = getActivityIconName(actionConfig.icon);

  return (
    <button
      type="button"
      onClick={onPress}
      className="bg-white rounded-[10px] p-4 border border-slate-200 shadow-sm min-h-[120px] w-full text-left hover:bg-slate-50 transition-colors"
      aria-label={`Activity: ${actionConfig.label}. ${log.summary}. By ${log.userName}. Tap for details.`}
    >
      <div className="flex justify-between items-center gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${badgeBgClass}`}
          >
            <Icon name={iconName} className="h-[18px] w-[18px] text-slate-600" />
          </div>
          <p className="text-[15px] font-semibold text-slate-900 flex-1 line-clamp-2">
            {actionConfig.label}
          </p>
        </div>
        <div className={`px-2 py-1 rounded-full shrink-0 ${badgeBgClass}`}>
          <span className={`text-[12px] font-medium ${textClass}`}>
            {categoryConfig?.label ?? category}
          </span>
        </div>
      </div>

      <div className="flex gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-slate-500 mb-1">User</p>
          <p className="text-[15px] text-slate-900 truncate">{log.userName}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-slate-500 mb-1">Target</p>
          <p className="text-[15px] text-blue-800 font-medium truncate">
            {log.targetDisplay}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <span className="text-[13px] text-slate-500">
          {formatTimestamp(log.timestamp)}
        </span>
      </div>
    </button>
  );
}
