import { Icon } from '../shared/Icon';
import type { MaintenanceStatus } from '../../types/maintenance';

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
}

const statusConfig: Record<
  MaintenanceStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-amber-600/15',
    textColor: 'text-amber-600',
  },
  partial_return: {
    label: 'Partial Return',
    bgColor: 'bg-purple-600/15',
    textColor: 'text-purple-600',
  },
  returned: {
    label: 'Returned',
    bgColor: 'bg-slate-600/15',
    textColor: 'text-slate-600',
  },
  written_off: {
    label: 'Written Off',
    bgColor: 'bg-red-600/15',
    textColor: 'text-red-600',
  },
  partially_returned_and_written_off: {
    label: 'Partial Return & Written Off',
    bgColor: 'bg-slate-600/15',
    textColor: 'text-slate-600',
  },
};

export function MaintenanceStatusBadge({ status }: MaintenanceStatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <span
        className="rounded-full bg-slate-600/15 px-2 py-1 text-[12px] font-medium text-slate-600"
        aria-label="Unknown status"
      >
        Unknown
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-2 py-1 text-[12px] font-medium ${config.bgColor} ${config.textColor}`}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
