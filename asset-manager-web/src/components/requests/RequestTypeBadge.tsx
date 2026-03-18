import { Icon } from '../shared/Icon';
import type { RequestType } from '../../types/request';

interface RequestTypeBadgeProps {
  requestType?: RequestType;
}

/**
 * Badge that identifies the request type.
 * - standard: Store → Site (material request to a site)
 * - site_transfer: Site → Site (transfer between sites)
 */
export function RequestTypeBadge({ requestType }: RequestTypeBadgeProps) {
  if (!requestType || requestType === 'standard') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-600/15 text-[12px] font-medium text-slate-600">
        <Icon name="building-storefront" className="h-3.5 w-3.5" />
        Site
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/15 text-[12px] font-medium text-indigo-600">
      <Icon name="arrows-right-left" className="h-3.5 w-3.5" />
      Site Transfer
    </span>
  );
}
