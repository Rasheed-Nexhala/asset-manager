/**
 * Request Access Banner
 *
 * Shown when Store Incharge needs Admin approval to update inventory.
 * Displays a warning-style message with a "Request Access" button.
 * Uses CIAMS design system (warning tint, rounded-[10px], p-4, 48px touch targets).
 */

import { Icon } from '../shared/Icon';

export interface RequestAccessBannerProps {
  onRequestAccess: () => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
}

const DEFAULT_TITLE = 'You need Admin approval to update inventory.';
const DEFAULT_SUBTITLE = 'Request access?';
const DEFAULT_BUTTON = 'Request Access';

export function RequestAccessBanner({
  onRequestAccess,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  buttonLabel = DEFAULT_BUTTON,
}: RequestAccessBannerProps) {
  return (
    <div className="bg-amber-600/15 rounded-[10px] p-4 border border-amber-600/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
          <Icon name="lock-closed" className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-900">{title}</p>
          <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onRequestAccess}
          className="bg-blue-800 hover:bg-blue-900 rounded-[10px] min-h-[48px] min-w-[48px] px-4 flex items-center justify-center transition-colors flex-shrink-0"
          aria-label={buttonLabel}
        >
          <span className="text-[15px] font-semibold text-white">{buttonLabel}</span>
        </button>
      </div>
    </div>
  );
}
