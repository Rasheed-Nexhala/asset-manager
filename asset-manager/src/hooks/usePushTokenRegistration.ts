import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { registerPushToken } from '../services/firebase/notificationService';

export function usePushTokenRegistration(userId: string | null): void {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    registerPushToken(userId);

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        registerPushToken(userId);
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, [userId]);
}
