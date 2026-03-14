import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Icon } from '../shared/Icon';

/**
 * Persistent banner shown when the browser is offline.
 * Displays at the top of the layout with a retry button.
 */
export function OfflineBanner() {
  const { isOffline, isChecking, retry } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between gap-4 bg-amber-600 px-4 py-3 text-white"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <Icon name="signal-slash" className="h-5 w-5 flex-shrink-0" />
        <span className="text-[15px] font-medium">
          No internet connection. Check your network and try again.
        </span>
      </div>
      <button
        type="button"
        onClick={retry}
        disabled={isChecking}
        className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-[15px] font-semibold hover:bg-white/30 disabled:opacity-50"
      >
        <Icon name="arrow-path" className={isChecking ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        Retry
      </button>
    </div>
  );
}
