import { useEffect, useRef } from 'react';
import { registerPushToken } from '../services/firebase/notificationService';

/**
 * Web: Push token registration is a no-op (notificationService.registerPushToken
 * does nothing on web). FCM Web Push can be added later.
 *
 * Keeps the hook structure for consistency with mobile and future FCM integration.
 * Uses visibilitychange to re-register when user returns to tab (when FCM is added).
 */
export function usePushTokenRegistration(userId: string | null): void {
  const wasHiddenRef = useRef(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );

  useEffect(() => {
    if (!userId) return;

    registerPushToken(userId);

    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      if (wasHiddenRef.current && !isHidden) {
        registerPushToken(userId);
      }
      wasHiddenRef.current = isHidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);
}
