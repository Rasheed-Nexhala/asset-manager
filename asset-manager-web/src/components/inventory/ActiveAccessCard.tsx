import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { InventoryUpdateRequest } from '../../types/inventoryUpdateRequest';

function formatExpiry(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export interface ActiveAccessCardProps {
  request: InventoryUpdateRequest;
  onToggle: (requestId: string, revoke: boolean) => void;
  isToggling?: boolean;
}

export function ActiveAccessCard({
  request,
  onToggle,
  isToggling = false,
}: ActiveAccessCardProps) {
  const accessActive = !request.accessRevoked;

  const handleToggle = () => {
    if (isToggling) return;
    onToggle(request.id, accessActive);
  };

  return (
    <div className="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 truncate">{request.requestedByName}</p>
          <p className="text-[13px] text-slate-500">{request.requestedByRole}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full min-h-[28px] flex items-center justify-center text-[12px] font-medium shrink-0 ${
            accessActive ? 'bg-green-600/15 text-green-600' : 'bg-slate-600/15 text-slate-600'
          }`}
        >
          {accessActive ? 'Access Active' : 'Revoked'}
        </span>
      </div>
      <div className="mb-3">
        <p className="text-[13px] text-slate-500 mb-1">Reason</p>
        <p className="text-[15px] text-slate-900">{request.reason}</p>
      </div>
      {request.accessExpiresAt && (
        <p className="text-[13px] text-slate-500 mb-3">
          Expires: {formatExpiry(request.accessExpiresAt)}
        </p>
      )}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
        <span className="text-[15px] text-slate-900 flex-1">
          {accessActive ? 'Revoke access' : 'Restore access'}
        </span>
        {isToggling ? (
          <span className="min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Updating">
            <LoadingSpinner size="sm" />
          </span>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center -mr-2 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-2"
            role="switch"
            aria-checked={accessActive}
            aria-label={accessActive ? 'Revoke access' : 'Restore access'}
          >
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                accessActive ? 'bg-green-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${
                  accessActive ? 'left-6' : 'left-1'
                }`}
              />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
