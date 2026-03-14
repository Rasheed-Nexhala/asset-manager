import { Icon } from '../shared/Icon';
import type { RequestType } from '../../types/request';

interface RequestTypeBadgeProps {
  requestType?: RequestType;
}

/**
 * Badge that identifies the request type.
 * Only renders for non-standard (i.e. site_transfer) requests.
 */
export function RequestTypeBadge({ requestType }: RequestTypeBadgeProps) {
  if (!requestType || requestType === 'standard') return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/15 text-[12px] font-medium text-indigo-600">
      <Icon name="arrows-right-left" className="h-3.5 w-3.5" />
      Site Transfer
    </span>
  );
}
