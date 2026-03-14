import { useEffect, useState, useCallback } from 'react';

const CHECK_INTERVAL_MS = 15000;
const FETCH_TIMEOUT_MS = 5000;
const ENDPOINT = 'https://www.google.com/generate_204';

/**
 * Checks if the device has internet connectivity by making a lightweight
 * HTTP request. Uses fetch with AbortController for timeout.
 */
async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(ENDPOINT, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export interface UseNetworkStatusResult {
  isOffline: boolean;
  isChecking: boolean;
  retry: () => void;
}

/**
 * Hook that detects connectivity using Web APIs.
 *
 * Web adaptation:
 * - Uses navigator.onLine + online/offline events for real-time updates
 * - Uses visibilitychange (tab focus) instead of React Native AppState
 * - Polls every 15 seconds when tab is visible
 * - Re-checks when user returns to tab
 * - Returns retry() for manual re-check
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);

  const performCheck = useCallback(async () => {
    setIsChecking(true);
    const connected = await checkConnectivity();
    setIsOffline(!connected);
    setIsChecking(false);
  }, []);

  const retry = useCallback(() => {
    performCheck();
  }, [performCheck]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      performCheck();
      intervalId = setInterval(performCheck, CHECK_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    startPolling();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performCheck]);

  return { isOffline, isChecking, retry };
}

export default useNetworkStatus;
