import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeToNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../services/firebase/notificationService';
import { useAppSelector } from '../store/hooks';
import { selectUserId } from '../store/selectors/authSelectors';

export function NotificationCenterPage() {
  const userId = useAppSelector(selectUserId);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, setNotifications);
    return () => unsubscribe();
  }, [userId]);

  /** Returns the path to navigate to for a notification. Used with Link for reliable navigation. */
  const getNotificationPath = useCallback((item: NotificationItem): string => {
    const data = item.data as {
      requestId?: string;
      poId?: string;
      screen?: string;
      maintenanceId?: string;
      itemId?: string;
    } | undefined;

    if (data?.requestId && data?.screen === 'ProcessRequest') {
      return `/requests/${data.requestId}/process`;
    }
    if ((data?.screen === 'ApprovePO' || data?.screen === 'ReceivePO') && data?.poId) {
      return data.screen === 'ApprovePO'
        ? `/purchase-orders/${data.poId}/approve`
        : `/purchase-orders/${data.poId}/receive`;
    }
    if (data?.screen === 'PurchaseOrderList') return '/purchase-orders';
    if (data?.screen === 'RequestQueue') return '/requests/queue';
    if (data?.screen === 'MaintenanceDetail' && data?.maintenanceId) {
      return `/maintenance/${data.maintenanceId}`;
    }
    if (data?.screen === 'Maintenance' && data?.maintenanceId) {
      return `/maintenance/${data.maintenanceId}`;
    }
    if (data?.screen === 'Maintenance') return '/maintenance';
    if (data?.screen === 'ItemDetail' && data?.itemId) {
      return `/inventory/${data.itemId}`;
    }
    if (data?.screen === 'InventoryUpdateRequests') return '/inventory/update-requests';
    if (data?.screen === 'Users') return '/admin/users';
    return '/requests/queue';
  }, []);

  const handleMarkRead = useCallback(
    (item: NotificationItem) => {
      if (userId) markNotificationRead(userId, item.id).catch(() => {});
    },
    [userId]
  );

  if (!userId) {
    return (
      <div className="flex flex-col gap-6 px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Go to dashboard"
          >
            ← Dashboard
          </Link>
          <h1 className="text-[22px] font-semibold text-slate-900">
            Notifications
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-[15px] text-slate-500 text-center">
            Sign in to see notifications
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
      <div className="flex items-center gap-2">
        <Link
          to="/dashboard"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 text-[15px] font-medium"
          aria-label="Go to dashboard"
        >
          ← Dashboard
        </Link>
        <h1 className="text-[22px] font-semibold text-slate-900">
          Notifications
        </h1>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => (
          <Link
            key={item.id}
            to={getNotificationPath(item)}
            onClick={() => handleMarkRead(item)}
            className={`block w-full bg-white rounded-[10px] p-4 border border-slate-200 text-left hover:bg-slate-50 transition-colors ${
              !item.read ? 'opacity-100' : 'opacity-80'
            }`}
          >
            <div className="flex items-start gap-2">
              {!item.read && (
                <div className="w-2 h-2 rounded-full bg-blue-800 shrink-0 mt-2" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {item.title}
                </p>
                <p className="text-[15px] text-slate-600 mt-1 line-clamp-2">
                  {item.body}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <p className="text-[15px] text-slate-500 text-center">
            No notifications yet
          </p>
        </div>
      )}
    </div>
  );
}
