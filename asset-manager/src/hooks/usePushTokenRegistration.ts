import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { registerPushToken } from '../services/firebase/notificationService';

function safeRegisterPushToken(userId: string): void {
  registerPushToken(userId).catch((error) => {
    console.warn('Push token registration failed:', error);
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
