import type { PurchaseOrderStatus } from '../../types/purchaseOrder';

interface POStatusBadgeProps {
  status: PurchaseOrderStatus;
}

const statusConfig: Record<
  PurchaseOrderStatus,
  { bgClass: string; textClass: string; label: string }
> = {
  draft: {
    bgClass: 'bg-slate-500/15',
    textClass: 'text-slate-600',
    label: 'Draft',
  },
  pending_approval: {
    bgClass: 'bg-amber-600/15',
    textClass: 'text-amber-600',
    label: 'Pending Approval',
  },
  approved: {
    bgClass: 'bg-blue-800/15',
    textClass: 'text-blue-800',
    label: 'Approved',
  },
  ordered: {
    bgClass: 'bg-green-600/15',
    textClass: 'text-green-600',
    label: 'Ordered',
  },
  partially_received: {
    bgClass: 'bg-amber-600/15',
    textClass: 'text-amber-600',
    label: 'Partially Received',
  },
  received: {
    bgClass: 'bg-green-600/15',
    textClass: 'text-green-600',
    label: 'Received',
  },
  rejected: {
    bgClass: 'bg-red-600/15',
    textClass: 'text-red-600',
    label: 'Rejected',
  },
};

export function POStatusBadge({ status }: POStatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <span className="rounded-full px-2 py-1 text-[12px] font-medium bg-slate-500/15 text-slate-600">
        {status}
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-2 py-1 text-[12px] font-medium ${config.bgClass} ${config.textClass}`}
    >
      {config.label}
    </span>
  );
}
