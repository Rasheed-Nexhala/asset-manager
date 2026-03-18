import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export interface PendingRequest {
  id: string;
  requestNumber: string;
  siteName: string;
  itemCount: number;
  hasInsufficient: boolean;
  insufficientCount?: number;
  priority: 'high' | 'normal' | 'low';
  createdAt: string;
}

export interface PendingRequestsWidgetProps {
  requests: PendingRequest[];
  onViewAll: () => void;
  /** When true, shows the Approve button (Admin/StoreIncharge). When false, only View is shown (SiteManager). */
  showApprove?: boolean;
  loading?: boolean;
}

function formatTimeAgo(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Widget displaying pending requests with View/Approve actions.
 */
export function PendingRequestsWidget({
  requests,
  onViewAll,
  showApprove = false,
  loading = false,
}: PendingRequestsWidgetProps) {
  const count = requests.length;

  if (loading) {
    return (
      <div className="bg-white rounded-[10px] p-4 border border-slate-200 shadow-sm min-h-[120px] flex flex-col items-center justify-center">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[17px] font-semibold text-slate-900">
          PENDING REQUESTS ({count})
        </h3>
      </div>
      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className={`rounded-lg p-3 border ${
              req.priority === 'high'
                ? 'bg-red-600/15 border-red-600/30'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-[15px] font-semibold text-slate-900">
                {req.requestNumber}
              </p>
              <span className="text-[13px] text-slate-500">
                {formatTimeAgo(req.createdAt)}
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mb-1">
              {req.siteName} • {req.itemCount} items
            </p>
            {req.hasInsufficient && (
              <p className="text-[13px] text-red-600 mb-2">
                {req.insufficientCount ?? 'Some'} insufficient
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <Link
                to={`/requests/${req.id}/process`}
                className="flex-1 border border-blue-800 rounded-[10px] py-2 min-h-[40px] flex items-center justify-center text-[13px] font-semibold text-blue-800 hover:bg-blue-50 transition-colors"
                aria-label={`View request ${req.requestNumber}`}
              >
                View
              </Link>
              {showApprove && (
                <Link
                  to={`/requests/${req.id}/process`}
                  className="flex-1 bg-blue-800 rounded-[10px] py-2 min-h-[40px] flex items-center justify-center text-[13px] font-semibold text-white hover:bg-blue-900 transition-colors"
                  aria-label={`Approve request ${req.requestNumber}`}
                >
                  Approve
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="mt-3 pt-3 border-t border-slate-200 w-full text-left text-[15px] font-medium text-blue-800 hover:underline"
        aria-label="View all pending requests"
      >
        View All Requests
      </button>
    </div>
  );
}
