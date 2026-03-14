import { Link } from 'react-router-dom';
import type { Request } from '../../types/request';
import { RequestStatusBadge } from './RequestStatusBadge';
import { RequestTypeBadge } from './RequestTypeBadge';
import { Icon } from '../shared/Icon';

interface RequestCardProps {
  request: Request;
  onPress?: () => void;
  showAvailability?: boolean;
  isAllSufficient?: boolean;
  availabilityUnknown?: boolean;
}

function formatDate(
  timestamp: { toDate?: () => Date } | string | null | undefined
): string {
  if (!timestamp) return '';
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  const date =
    typeof (timestamp as { toDate?: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const priorityConfig = {
  high: { icon: 'exclamation-circle' as const, color: 'text-red-600' },
  medium: { icon: 'minus-circle' as const, color: 'text-amber-600' },
  low: { icon: 'check-circle' as const, color: 'text-green-600' },
};

export function RequestCard({
  request,
  onPress,
  showAvailability = false,
  isAllSufficient = false,
  availabilityUnknown = false,
}: RequestCardProps) {
  const priorityInfo =
    priorityConfig[request?.priority as keyof typeof priorityConfig] ??
    priorityConfig.medium;
  const itemCount = Array.isArray(request?.items) ? request.items.length : 0;

  const content = (
    <>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon
            name={priorityInfo.icon}
            className={`h-5 w-5 flex-shrink-0 ${priorityInfo.color}`}
          />
          <span className="text-[15px] font-semibold text-slate-900 truncate">
            {request?.requestNumber ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <RequestTypeBadge requestType={request.requestType} />
          <RequestStatusBadge status={request.status} />
        </div>
      </div>

      <div className="flex gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-slate-500">
            {request?.requestType === 'site_transfer' ? 'Transfer' : 'Site'}
          </p>
          <p className="text-[15px] text-slate-900 truncate">
            {request?.requestType === 'site_transfer' && request.sourceSiteName
              ? `${request.sourceSiteName} → ${request.siteName}`
              : request?.siteName ?? '—'}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-slate-500">Items</p>
          <p className="text-[15px] text-slate-900">{itemCount}</p>
        </div>
      </div>

      {showAvailability && (
        <div
          className={`p-2 rounded-lg mb-3 ${
            availabilityUnknown
              ? 'bg-slate-500/10'
              : isAllSufficient
                ? 'bg-green-600/10'
                : 'bg-red-600/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon
              name={
                availabilityUnknown
                  ? 'question-mark-circle'
                  : isAllSufficient
                    ? 'check-circle'
                    : 'exclamation-circle'
              }
              className={`h-4 w-4 ${
                availabilityUnknown
                  ? 'text-slate-500'
                  : isAllSufficient
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
            />
            <span
              className={`text-[13px] font-medium ${
                availabilityUnknown
                  ? 'text-slate-500'
                  : isAllSufficient
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
            >
              {availabilityUnknown
                ? 'View to check availability'
                : isAllSufficient
                  ? 'All items available'
                  : 'Insufficient stock'}
            </span>
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
        <span className="text-[13px] text-slate-500">
          {formatDate(request.createdAt)}
        </span>
        <Icon name="chevron-right" className="h-4 w-4 text-slate-500" />
      </div>
    </>
  );

  const to = `/requests/${request.id}/process`;

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className="w-full text-left bg-white rounded-[10px] p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
        aria-label={`Request ${request.requestNumber}`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className="block bg-white rounded-[10px] p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
      aria-label={`Request ${request.requestNumber}`}
    >
      {content}
    </Link>
  );
}
