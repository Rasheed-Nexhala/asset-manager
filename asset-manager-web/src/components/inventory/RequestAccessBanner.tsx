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
}

export function RequestAccessBanner({ onRequestAccess }: RequestAccessBannerProps) {
  return (
    <div className="bg-amber-600/15 rounded-[10px] p-4 border border-amber-600/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
          <Icon name="lock-closed" className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-900">
            You need Admin approval to update inventory.
          </p>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Request access?
          </p>
        </div>
        <button
          type="button"
          onClick={onRequestAccess}
          className="bg-blue-800 hover:bg-blue-900 rounded-[10px] min-h-[48px] min-w-[48px] px-4 flex items-center justify-center transition-colors flex-shrink-0"
          aria-label="Request Access"
        >
          <span className="text-[15px] font-semibold text-white">
            Request Access
          </span>
        </button>
      </div>
    </div>
  );
}
