import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { InventoryUpdateRequest, InventoryUpdateRequestStatus } from '../../types/inventoryUpdateRequest';
import { formatInventoryUpdateAccessScopesLabel } from '../../types/inventoryUpdateRequest';

const STATUS_CONFIG: Record<
  InventoryUpdateRequestStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: 'bg-amber-600/15', text: 'text-amber-600', label: 'Pending' },
  approved: { bg: 'bg-green-600/15', text: 'text-green-600', label: 'Approved' },
  rejected: { bg: 'bg-red-600/15', text: 'text-red-600', label: 'Rejected' },
};

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export interface InventoryUpdateRequestCardProps {
  request: InventoryUpdateRequest;
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function InventoryUpdateRequestCard({
  request,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: InventoryUpdateRequestCardProps) {
  const statusConfig = STATUS_CONFIG[request.status];
  const isPending = request.status === 'pending';
  const isDisabled = isApproving || isRejecting;

  return (
    <div className="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 truncate">{request.requestedByName}</p>
          <p className="text-[13px] text-slate-500">{request.requestedByRole}</p>
          <p className="text-[12px] text-slate-500 mt-1">
            {formatInventoryUpdateAccessScopesLabel(request.accessScopes)}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-[12px] font-medium shrink-0 ${statusConfig.bg} ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      </div>
      <div className="mb-3">
        <p className="text-[13px] text-slate-500 mb-1">Reason</p>
        <p className="text-[15px] text-slate-900">{request.reason}</p>
      </div>
      <p className="text-[13px] text-slate-500 mb-3">{formatRelativeTime(request.createdAt)}</p>
      {isPending && onApprove && onReject && (
        <div className="flex gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onApprove}
            disabled={isDisabled}
            className="flex-1 bg-green-600 hover:bg-green-700 transition-colors rounded-[10px] h-[50px] inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white disabled:opacity-70"
          >
            {isApproving ? (
              <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
            ) : (
              <Icon name="check-circle" className="w-5 h-5" />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={isDisabled}
            className="flex-1 border-[1.5px] border-red-600 hover:bg-red-50 transition-colors rounded-[10px] h-[50px] inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-red-600 disabled:opacity-70"
          >
            {isRejecting ? (
              <LoadingSpinner size="sm" className="!border-red-600/30 !border-t-red-600" />
            ) : (
              <Icon name="x-mark" className="w-5 h-5" />
            )}
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
