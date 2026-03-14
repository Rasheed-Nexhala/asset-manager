import type { Site } from '../../types/sites';
import { Icon } from '../shared/Icon';

export interface SiteCardProps {
  site: Site;
  onPress?: () => void;
}

export function SiteCard({ site, onPress }: SiteCardProps) {
  const isActive = site.status === 'active';

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full rounded-[10px] border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
      aria-label={`Site: ${site.name}. Status: ${site.status}. Manager: ${site.managerName || 'Not Assigned'}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Icon name="building-office-2" className="h-6 w-6 text-blue-800" />
          <span className="line-clamp-2 text-[15px] font-semibold text-slate-900">
            {site.name}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[12px] font-medium ${
            isActive ? 'bg-green-600/15 text-green-600' : 'bg-red-600/15 text-red-600'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Icon name="user-circle" className="mt-0.5 h-[18px] w-[18px] text-slate-500" />
          <div className="flex-1">
            <p className="text-[13px] text-slate-500">Manager</p>
            <p className="text-[15px] text-slate-900">
              {site.managerName || 'Not Assigned'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Icon name="map-pin" className="mt-0.5 h-[18px] w-[18px] text-slate-500" />
          <div className="flex-1">
            <p className="text-[13px] text-slate-500">Location</p>
            <p className="line-clamp-2 text-[15px] text-slate-900">{site.address}</p>
          </div>
        </div>

        {site.description && (
          <div className="flex items-start gap-2">
            <Icon name="document-text" className="mt-0.5 h-[18px] w-[18px] text-slate-500" />
            <div className="flex-1">
              <p className="text-[13px] text-slate-500">Description</p>
              <p className="line-clamp-2 text-[15px] text-slate-900">{site.description}</p>
            </div>
          </div>
        )}

        {site.contactNumber && (
          <div className="flex items-start gap-2">
            <Icon name="phone" className="mt-0.5 h-[18px] w-[18px] text-slate-500" />
            <div className="flex-1">
              <p className="text-[13px] text-slate-500">Contact</p>
              <p className="text-[15px] text-slate-900">{site.contactNumber}</p>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
