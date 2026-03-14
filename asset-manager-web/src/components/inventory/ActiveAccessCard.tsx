import { Icon } from '../shared/Icon';
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
    <div className="bg-white rounded-[10px] p-4 border border-slate-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-slate-900">{request.requestedByName}</p>
          <p className="text-[13px] text-slate-500">{request.requestedByRole}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full min-h-[28px] flex items-center justify-center text-[12px] font-medium ${
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
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
        <span className="text-[15px] text-slate-900 flex-1">
          {accessActive ? 'Revoke access' : 'Restore access'}
        </span>
        {isToggling ? (
          <span className="min-w-[48px] min-h-[48px] flex items-center justify-center animate-pulse">...</span>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              accessActive ? 'bg-green-600' : 'bg-slate-200'
            }`}
            role="switch"
            aria-checked={accessActive}
            aria-label={accessActive ? 'Revoke access' : 'Restore access'}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                accessActive ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
