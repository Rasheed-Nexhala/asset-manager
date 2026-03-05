import { useEffect, useState, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const CHECK_INTERVAL_MS = 15000;
const FETCH_TIMEOUT_MS = 5000;
const ENDPOINT = 'https://www.google.com/generate_204';

/**
 * Checks if the device has internet connectivity by making a lightweight
 * HTTP request. Uses fetch with AbortController for timeout.
 * Does not use NetInfo - uses built-in fetch only.
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
 * Hook that detects connectivity using fetch-based polling.

 * - Polls every 15 seconds when app is in foreground
 * - Re-checks when app returns to foreground
 * - Assumes online until first check fails (avoids flash on startup)
 * - Returns retry() for manual re-check
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [isOffline, setIsOffline] = useState(false);
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

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [performCheck]);

  return { isOffline, isChecking, retry };
}

export default useNetworkStatus;
