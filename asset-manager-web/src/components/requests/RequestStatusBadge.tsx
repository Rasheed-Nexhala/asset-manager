import type { RequestStatus } from '../../types/request';

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

const statusConfig: Record<
  RequestStatus,
  { bg: string; text: string; label: string }
> = {
  draft: { bg: 'bg-slate-600/15', text: 'text-slate-600', label: 'Draft' },
  pending: { bg: 'bg-amber-600/15', text: 'text-amber-600', label: 'Pending' },
  approved: { bg: 'bg-blue-800/15', text: 'text-blue-800', label: 'Approved' },
  rejected: { bg: 'bg-red-600/15', text: 'text-red-600', label: 'Rejected' },
  transferred: { bg: 'bg-green-600/15', text: 'text-green-600', label: 'Transferred' },
  partially_returned: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-700',
    label: 'Partially Returned',
  },
  returned: { bg: 'bg-slate-600/15', text: 'text-slate-600', label: 'Returned' },
  cancelled: { bg: 'bg-slate-600/15', text: 'text-slate-600', label: 'Cancelled' },
};

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    bg: 'bg-slate-600/15',
    text: 'text-slate-600',
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-[12px] font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
