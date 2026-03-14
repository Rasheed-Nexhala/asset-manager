import { LoadingSpinner } from './LoadingSpinner';

interface InventoryLoadingStateProps {
  message?: string;
  /** Use full-height layout (centers in available space). Default true. */
  fullHeight?: boolean;
}

/**
 * Consistent loading state for inventory pages.
 * Ensures spinner and message are visible and properly centered.
 */
export function InventoryLoadingState({
  message = 'Loading...',
  fullHeight = true,
}: InventoryLoadingStateProps) {
  return (
    <div
      className={
        fullHeight
          ? 'flex flex-1 flex-col items-center justify-center gap-4 px-4 min-h-[280px]'
          : 'flex flex-col items-center justify-center gap-4 py-12 px-4'
      }
    >
      <LoadingSpinner size="lg" />
      <p className="text-[15px] text-slate-500">{message}</p>
    </div>
  );
}
