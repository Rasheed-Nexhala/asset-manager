import { useEffect } from 'react';

const DEFAULT_AUTO_CLEAR_MS = 5000;

/**
 * Hook that auto-clears an error/warning message after a delay.
 *
 * @param error - The error message (string or null). When truthy, auto-clear is scheduled.
 * @param onClear - Callback to clear the error
 * @param autoClearMs - Delay in milliseconds before clearing (default 5000)
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
