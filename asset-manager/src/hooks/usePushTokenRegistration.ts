import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  isTransientPushTokenError,
  registerPushToken,
} from '../services/firebase/notificationService';
import { runNonCriticalTask } from '../utils/nonCriticalTask';

function safeRegisterPushToken(userId: string): void {
  runNonCriticalTask(
    'register_push_token',
    () => registerPushToken(userId),
    {
      feature: 'notifications',
      retry: {
        retries: 2,
        baseDelayMs: 2000,
        maxDelayMs: 10000,
        shouldRetry: (error) => isTransientPushTokenError(error),
      },
      tags: {
        trigger: 'session_active',
      },
      onFailure: (error) => {
        console.warn('Push token registration failed:', error);
      },
    }
  ).catch(() => {
    // runNonCriticalTask handles capture internally; this guard prevents unhandled rejections.
  });
}

export function usePushTokenRegistration(userId: string | null): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    safeRegisterPushToken(userId);

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        safeRegisterPushToken(userId);
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, [userId]);
}
