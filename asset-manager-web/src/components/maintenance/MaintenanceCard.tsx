import { Link } from 'react-router-dom';
import { Icon } from '../shared/Icon';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';
import type { Maintenance, IssueType } from '../../types/maintenance';
import {
  getDisplayWrittenOffUnits,
  isWrittenOffRegisterStatus,
} from '../../utils/maintenanceWriteOffDisplay';

interface MaintenanceCardProps {
  maintenance: Maintenance;
}

const issueTypeLabels: Record<IssueType, string> = {
  motor_electrical: 'Motor/Electrical',
  physical_damage: 'Physical Damage',
  wear_and_tear: 'Wear and Tear',
  missing_parts: 'Missing Parts',
  other: 'Other',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MaintenanceCard({ maintenance }: MaintenanceCardProps) {
  const displayUnit = maintenance.unit || 'Pcs';
  const showWrittenOffUnits = isWrittenOffRegisterStatus(maintenance.status);
  const writtenOffUnits = getDisplayWrittenOffUnits(maintenance);

  return (
    <Link
      to={`/maintenance/${maintenance.id}`}
      className="block rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/30"
      aria-label={`Maintenance record for ${maintenance.itemName}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex-1 truncate text-[15px] font-semibold text-slate-900">
          {maintenance.itemName}
        </h3>
        <MaintenanceStatusBadge status={maintenance.status} />
      </div>

      <div className="mb-3 space-y-2">
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[13px] text-slate-500">SKU</p>
            <p className="text-[15px] text-slate-900">{maintenance.itemSku}</p>
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-slate-500">
              {showWrittenOffUnits ? 'Units written off' : 'Quantity'}
            </p>
            <p className="text-[15px] text-slate-900">
              {showWrittenOffUnits
                ? writtenOffUnits != null
                  ? `${writtenOffUnits} ${displayUnit}`
                  : '—'
                : `${maintenance.quantity} ${displayUnit}`}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[13px] text-slate-500">Issue Type</p>
            <p className="text-[15px] text-slate-900">
              {issueTypeLabels[maintenance.issueType] || 'Unknown'}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-slate-500">Added</p>
            <p className="text-[15px] text-slate-900">
              {formatDate(maintenance.addedAt)}
            </p>
          </div>
        </div>

        {maintenance.reportedByName && (
          <div>
            <p className="text-[13px] text-slate-500">Reported By</p>
            <p className="text-[15px] text-slate-900">
              {maintenance.reportedByName}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
        <p className="text-[13px] text-slate-500">
          Added by {maintenance.addedByName}
        </p>
        <Icon name="chevron-right" className="h-5 w-5 text-slate-500" />
      </div>
    </Link>
  );
}
