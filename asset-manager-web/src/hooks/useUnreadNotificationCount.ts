import { useState, useEffect } from 'react';
import { subscribeToNotifications } from '../services/firebase/notificationService';

/**
 * Subscribes to the user's notifications and returns the unread count.
 * Used for the header bell badge. In-app notifications only (no push).
 */
export function useUnreadNotificationCount(userId: string | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const unsubscribe = subscribeToNotifications(userId, (items) => {
      const unread = items.filter((item) => !item.read).length;
      setCount(unread);
    });

    return unsubscribe;
  }, [userId]);

  return count;
}
