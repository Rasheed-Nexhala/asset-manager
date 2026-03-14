import type { ActivityLog } from '../../types/activityLog';
import { ACTION_TYPE_CONFIG } from '../../constants/activityLogConfig';
import { Icon } from '../shared/Icon';
import { getActivityIconName } from './activityLogIconMap';

interface ActivityLogDetailModalProps {
  isOpen: boolean;
  log: ActivityLog | null;
  onClose: () => void;
}

/** Format full timestamp for detail view */
function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityLogDetailModal({
  isOpen,
  log,
  onClose,
}: ActivityLogDetailModalProps) {
  if (!log || !isOpen) return null;

  const actionConfig = ACTION_TYPE_CONFIG[log.actionType] ?? {
    label: log.actionType,
    icon: 'document-text-outline',
    category: log.actionCategory,
  };
  const iconName = getActivityIconName(actionConfig.icon);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-detail-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] w-full sm:max-w-lg flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full self-center mt-3 mb-4 sm:hidden" />

        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon name={iconName} className="h-6 w-6 text-blue-800 shrink-0" />
            <h2
              id="activity-detail-title"
              className="text-[22px] font-semibold text-slate-900 truncate"
            >
              {actionConfig.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <Icon name="x-mark" className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 flex-1">
          <p className="text-[13px] text-slate-500 mb-4">
            {formatFullTimestamp(log.timestamp)}
          </p>

          <section className="mb-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-3">
              Action
            </h3>
            <div className="bg-slate-50 rounded-[10px] p-4 space-y-2">
              <div className="flex gap-4">
                <span className="text-[13px] text-slate-500 w-24">Type:</span>
                <span className="text-[15px] text-slate-900 flex-1">
                  {log.actionType}
                </span>
              </div>
              <div className="flex gap-4">
                <span className="text-[13px] text-slate-500 w-24">User:</span>
                <span className="text-[15px] text-slate-900 flex-1">
                  {log.userName}
                </span>
              </div>
              <div className="flex gap-4">
                <span className="text-[13px] text-slate-500 w-24">Role:</span>
                <span className="text-[15px] text-slate-900 flex-1">
                  {log.userRole}
                </span>
              </div>
              <div className="flex gap-4">
                <span className="text-[13px] text-slate-500 w-24">Target:</span>
                <span className="text-[15px] text-slate-900 flex-1">
                  {log.targetDisplay}
                </span>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-3">
              Summary
            </h3>
            <p className="text-[15px] text-slate-900">{log.summary}</p>
          </section>

          {log.details && (
            <section className="mb-6">
              <h3 className="text-[17px] font-semibold text-slate-900 mb-3">
                Details
              </h3>
              <p className="text-[15px] text-slate-900">{log.details}</p>
            </section>
          )}

          {log.changes && log.changes.length > 0 && (
            <section className="mb-6 space-y-2">
              <h3 className="text-[17px] font-semibold text-slate-900 mb-3">
                Changes
              </h3>
              {log.changes.map((change, index) => (
                <div
                  key={index}
                  className="bg-slate-50 rounded-[10px] p-4"
                >
                  <p className="text-[15px] font-medium text-slate-900 mb-2">
                    {change.fieldLabel}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-red-600/15 rounded-lg p-2">
                      <p className="text-[13px] text-slate-500 mb-1">Before:</p>
                      <p className="text-[15px] text-red-600 font-medium">
                        {String(change.oldValue)}
                      </p>
                    </div>
                    <Icon name="arrow-right" className="h-5 w-5 text-slate-500 shrink-0" />
                    <div className="flex-1 bg-green-600/15 rounded-lg p-2">
                      <p className="text-[13px] text-slate-500 mb-1">After:</p>
                      <p className="text-[15px] text-green-600 font-medium">
                        {String(change.newValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {(log.deviceInfo || log.ipAddress || log.appVersion) && (
            <section className="mb-6">
              <h3 className="text-[17px] font-semibold text-slate-900 mb-3">
                Metadata
              </h3>
              <div className="bg-slate-50 rounded-[10px] p-4 space-y-2">
                {log.deviceInfo && (
                  <div className="flex gap-4">
                    <span className="text-[13px] text-slate-500 w-24">
                      Device:
                    </span>
                    <span className="text-[15px] text-slate-900 flex-1">
                      {log.deviceInfo}
                    </span>
                  </div>
                )}
                {log.ipAddress && (
                  <div className="flex gap-4">
                    <span className="text-[13px] text-slate-500 w-24">IP:</span>
                    <span className="text-[15px] text-slate-900 flex-1">
                      {log.ipAddress}
                    </span>
                  </div>
                )}
                {log.appVersion && (
                  <div className="flex gap-4">
                    <span className="text-[13px] text-slate-500 w-24">
                      App Version:
                    </span>
                    <span className="text-[15px] text-slate-900 flex-1">
                      {log.appVersion}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
