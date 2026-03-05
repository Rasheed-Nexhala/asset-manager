import { useEffect } from 'react';

const DEFAULT_AUTO_CLEAR_MS = 5000;

/**
 * Hook that auto-clears an error/warning message after a delay.
 *
 * When `error` is truthy, schedules `onClear` to run after `autoClearMs` (default 5 seconds).
 * Cleans up the timer on unmount or when error changes.
 *
 * @param error - The error message (string or null). When truthy, auto-clear is scheduled.
 * @param onClear - Callback to clear the error (e.g. dispatch(clearError()) or setError(null))
 * @param autoClearMs - Delay in milliseconds before clearing (default 5000)
 *
 * @example
 * // Redux error
 * const error = useAppSelector(selectSitesError);
 * useAutoClearError(error, () => dispatch(clearError()));
 *
 * @example
 * // Local state error
 * const [error, setError] = useState<string | null>(null);
 * useAutoClearError(error, () => setError(null));
 */
export function useAutoClearError(
  error: string | null | undefined,
  onClear: () => void,
  autoClearMs = DEFAULT_AUTO_CLEAR_MS
): void {
  useEffect(() => {
    if (error) {
      const timer = setTimeout(onClear, autoClearMs);
      return () => clearTimeout(timer);
    }
  }, [error, onClear, autoClearMs]);
}

export default useAutoClearError;
