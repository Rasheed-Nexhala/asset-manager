import { LoadingSpinner } from './LoadingSpinner';

interface InventoryLoadingStateProps {
  message?: string;
  /** Use full-height layout (centers in available space). Default true. */
  fullHeight?: boolean;
}

/**
 * Consistent loading state for inventory pages.
 * Shows a spinner as the primary visual indicator; message is sr-only for screen readers.
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
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" />
      <span className="sr-only">{message}</span>
    </div>
  );
}
