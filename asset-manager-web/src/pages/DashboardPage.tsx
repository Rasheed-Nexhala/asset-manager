import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectUserDisplayName,
  selectUserId,
  selectUserRoleType,
  selectIsActive,
  selectHasPermission,
  selectUserPermissions,
} from '../store/selectors/authSelectors';
import { selectRequestsError } from '../store/selectors/requestSelectors';
import { selectPurchaseOrderError } from '../store/selectors/purchaseOrderSelectors';
import { selectMaintenanceError } from '../store/selectors/maintenanceSelectors';
import { selectAllSites } from '../store/selectors/sitesSelectors';
import { selectInventoryByLocation, selectEmptyInventory } from '../store/selectors/inventorySelectors';
import { selectAssignedSiteIdForUser, selectSiteById } from '../store/selectors/sitesSelectors';
import { selectActivityLogError } from '../store/selectors/activityLogSelectors';
import { clearError } from '../store/slices/activityLogSlice';
import {
  clearError as clearRequestsError,
} from '../store/slices/requestsSlice';
import {
  clearError as clearPurchaseOrderError,
} from '../store/slices/purchaseOrderSlice';
import {
  clearError as clearMaintenanceError,
} from '../store/slices/maintenanceSlice';
import { useDashboardSubscriptions } from '../hooks/useDashboardSubscriptions';
import { useAutoClearError } from '../hooks/useAutoClearError';
import { getUnreadCount } from '../services/firebase/notificationService';
import { getLocationId } from '../utils/locationUtils';
import { runNonCriticalTask } from '../utils/nonCriticalTask';
import { listItems } from '../services/firebase/inventoryService';
import { getRecentPendingRequests } from '../services/firebase/requestService';
import { getPendingPOCount } from '../services/firebase/purchaseOrderService';
import { isLowStock } from '../utils/inventoryUtils';
import type { Request } from '../types/request';
import {
  DashboardGreeting,
  QuickStatsRow,
  LowStockAlertWidget,
  PendingRequestsWidget,
  MyRecentActivityWidget,
} from '../components/dashboard';
import { Icon } from '../components/shared/Icon';
import type { RootState } from '../store';

/** Convert Firestore Timestamp to ISO string for display */
function timestampToIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  const t = ts as { toMillis?: () => number; toDate?: () => Date };
  if (typeof t.toMillis === 'function') return new Date(t.toMillis()).toISOString();
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  return typeof ts === 'string' ? ts : new Date().toISOString();
}

/** Map Request to PendingRequest for widget */
function toPendingRequest(r: Request) {
  return {
    id: r.id,
    requestNumber: r.requestNumber,
    siteName: r.siteName ?? '—',
    itemCount: r.items?.length ?? 0,
    hasInsufficient: false,
    priority: (r.priority === 'high' ? 'high' : r.priority === 'low' ? 'low' : 'normal') as 'high' | 'normal' | 'low',
    createdAt: timestampToIso(r.createdAt),
  };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const displayName = useAppSelector(selectUserDisplayName) ?? '';
  const userId = useAppSelector(selectUserId);
  const roleType = useAppSelector(selectUserRoleType);
  const role = roleType ?? 'Unassigned';
  const isActive = useAppSelector(selectIsActive);
  const assignedSiteId = useAppSelector(selectAssignedSiteIdForUser(userId));
  const assignedSiteSelector = useMemo(
    () => (assignedSiteId ? selectSiteById(assignedSiteId) : (_state: RootState) => null),
    [assignedSiteId]
  );
  const assignedSite = useAppSelector(assignedSiteSelector);
  const siteName = assignedSite?.name ?? null;

  const sites = useAppSelector(selectAllSites);
  const activityLogError = useAppSelector(selectActivityLogError);
  const requestsError = useAppSelector(selectRequestsError);
  const purchaseOrderError = useAppSelector(selectPurchaseOrderError);
  const maintenanceError = useAppSelector(selectMaintenanceError);

  const [itemsCount, setItemsCount] = useState<number>(0);
  const [pendingPOCount, setPendingPOCount] = useState<number>(0);
  const [recentPendingRequests, setRecentPendingRequests] = useState<
    ReturnType<typeof toPendingRequest>[]
  >([]);
  const [lowStockItemsWidget, setLowStockItemsWidget] = useState<
    { id: string; name: string; currentQty: number; minQty: number }[]
  >([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const permissions = useAppSelector(selectUserPermissions);
  const canManageInventory = useAppSelector(selectHasPermission('canManageInventory'));
  const canApproveOrders = useAppSelector(selectHasPermission('canApproveOrders'));

  const showInventory = canManageInventory || (isStoreIncharge && permissions.length === 0);
  const showOrders = canApproveOrders || (isStoreIncharge && permissions.length === 0);

  const siteInventorySelector = useMemo(
    () =>
      assignedSiteId
        ? selectInventoryByLocation(getLocationId('site', assignedSiteId))
        : selectEmptyInventory,
    [assignedSiteId]
  );
  const siteInventory = useAppSelector(siteInventorySelector);

  const isVisible = location.pathname === '/dashboard';
  const { isInitialLoad, isRefreshing, triggerRefresh } = useDashboardSubscriptions({
    userId,
    role: roleType,
    assignedSiteId,
    isVisible,
  });

  const loadDashboardWidgetData = useCallback(async () => {
    if (!userId || roleType === 'Unassigned') return;
    setDashboardLoading(true);
    try {
      if (isAdmin || isStoreIncharge) {
        const [posCount, reqs, allItems] = await Promise.all([
          getPendingPOCount(),
          getRecentPendingRequests({}, 5),
          listItems(),
        ]);

        setPendingPOCount(posCount);
        setRecentPendingRequests(reqs.map(toPendingRequest));
        setItemsCount(allItems.length);

        const lowStock = allItems.filter(isLowStock).map((i) => ({
          id: i.id,
          name: i.name ?? i.id,
          currentQty: i.centralStoreQuantity ?? i.totalQuantity ?? 0,
          minQty: i.minStockLevel ?? 0,
        }));
        setLowStockItemsWidget(lowStock);
      } else if (isSiteManager) {
        const reqs = await getRecentPendingRequests(
          { siteId: assignedSiteId ?? undefined, userId },
          5
        );
        setRecentPendingRequests(reqs.map(toPendingRequest));
      }
    } catch (err) {
      console.error('Error loading dashboard widget data:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [userId, roleType, isAdmin, isStoreIncharge, isSiteManager, assignedSiteId]);

  useEffect(() => {
    if (isVisible || isRefreshing) {
      loadDashboardWidgetData();
    }
  }, [isVisible, isRefreshing, loadDashboardWidgetData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [triggerRefresh]);

  const refreshUnreadCount = useCallback(() => {
    if (!userId) return;
    runNonCriticalTask('dashboard_unread_count', () => getUnreadCount(userId), {
      feature: 'notifications',
      tags: { screen: 'dashboard' },
    })
      .then((count) => {
        if (typeof count === 'number') setUnreadCount(count);
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId, refreshUnreadCount]);

  const dashboardDataError = requestsError || purchaseOrderError || maintenanceError;
  const clearDashboardError = useCallback(() => {
    if (requestsError) dispatch(clearRequestsError());
    if (purchaseOrderError) dispatch(clearPurchaseOrderError());
    if (maintenanceError) dispatch(clearMaintenanceError());
  }, [dispatch, requestsError, purchaseOrderError, maintenanceError]);

  useAutoClearError(activityLogError, () => dispatch(clearError()));
  useAutoClearError(dashboardDataError, clearDashboardError);

  const statsForStore = [
    ...(showInventory ? [{ icon: 'cube' as const, value: itemsCount, label: 'Items' }] : []),
    ...(showOrders ? [{ icon: 'clock' as const, value: pendingPOCount, label: 'Pending POs' }] : []),
    ...(showOrders
      ? [{ icon: 'inbox' as const, value: recentPendingRequests.length, label: 'Pending Requests' }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6">
      {/* Error banners */}
      {activityLogError && (
        <div className="bg-red-600/15 px-4 py-3 rounded-lg flex items-center justify-between">
          <p className="text-[13px] text-red-600 flex-1">{activityLogError}</p>
          <button
            type="button"
            onClick={() => dispatch(clearError())}
            className="ml-2 p-2"
            aria-label="Dismiss error"
          >
            <Icon name="x-mark" className="h-5 w-5 text-red-600" />
          </button>
        </div>
      )}
      {dashboardDataError && (
        <div className="bg-red-600/15 px-4 py-3 rounded-lg flex items-center justify-between">
          <p className="text-[13px] text-red-600 flex-1">Some data failed to load</p>
          <button
            type="button"
            onClick={clearDashboardError}
            className="ml-2 p-2"
            aria-label="Dismiss error"
          >
            <Icon name="x-mark" className="h-5 w-5 text-red-600" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:gap-6">
        <DashboardGreeting
          displayName={displayName}
          role={role}
          siteName={siteName ?? undefined}
        />

        {/* KPI Section - Full Width */}
        {(isAdmin || (isStoreIncharge && statsForStore.length > 0)) && (
          <QuickStatsRow
            stats={isAdmin ? [
              { icon: 'cube', value: itemsCount, label: 'Items' },
              { icon: 'clock', value: pendingPOCount, label: 'Pending POs' },
              { icon: 'building-office-2', value: sites.length, label: 'Sites' },
            ] : statsForStore}
            isLoading={isInitialLoad || dashboardLoading}
          />
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Content Area (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            
            {(isAdmin || isStoreIncharge) && (
              <>
                {(lowStockItemsWidget.length > 0 || isInitialLoad || dashboardLoading) && (
                  <LowStockAlertWidget
                    items={lowStockItemsWidget}
                    onViewAll={() => navigate('/inventory?lowStockFilter=true')}
                    onCreatePO={(itemId) => {
                      const item = lowStockItemsWidget.find((i) => i.id === itemId);
                      if (!item) return;
                      const shortfall = Math.max(1, (item.minQty ?? 0) - (item.currentQty ?? 0));
                      navigate('/purchase-orders/new', {
                        state: {
                          selectedItems: [{ id: item.id, name: item.name }],
                          initialQuantities: { [item.id]: shortfall },
                        },
                      });
                    }}
                    loading={isInitialLoad || dashboardLoading}
                  />
                )}
                {(recentPendingRequests.length > 0 || isInitialLoad || dashboardLoading) && (
                  <PendingRequestsWidget
                    requests={recentPendingRequests}
                    onViewAll={() => navigate(isAdmin || isStoreIncharge ? '/requests/queue' : '/requests/my-requests')}
                    showApprove={isAdmin || isStoreIncharge}
                    loading={isInitialLoad || dashboardLoading}
                  />
                )}
              </>
            )}

            {isSiteManager && !isAdmin && !isStoreIncharge && (
              <>
                <div className="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-[17px] font-semibold text-slate-900 mb-3">
                    My Inventory Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[15px] text-slate-500">Total items</span>
                      <span className="text-[15px] font-semibold text-slate-900">
                        {siteInventory.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[15px] text-slate-500">Total quantity</span>
                      <span className="text-[15px] font-semibold text-slate-900">
                        {siteInventory.reduce((s, e) => s + e.quantity, 0)}
                      </span>
                    </div>
                  </div>
                </div>
                {(recentPendingRequests.length > 0 || isInitialLoad || dashboardLoading) && (
                  <PendingRequestsWidget
                    requests={recentPendingRequests}
                    onViewAll={() => navigate('/requests/my-requests')}
                    loading={isInitialLoad || dashboardLoading}
                  />
                )}
              </>
            )}

            {!isAdmin && !isStoreIncharge && !isSiteManager && roleType === 'Unassigned' && (
              <div
                className="bg-amber-600/15 rounded-[10px] p-4 lg:p-6 border border-amber-600/30 flex items-center gap-4"
                role="alert"
              >
                <Icon name="exclamation-triangle" className="h-8 w-8 text-amber-600 shrink-0" />
                <p className="text-[15px] text-amber-600 flex-1">
                  The Admin has to accept you and assign you a role for you to access this application.
                </p>
              </div>
            )}
          </div>

          {/* Side Content Area (1/3 width on desktop) */}
          <div className="lg:col-span-1 space-y-6">
            {isAdmin && (
              <Link
                to="/activity"
                className="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div>
                  <h3 className="text-[17px] font-semibold text-slate-900">Activity Log</h3>
                  <p className="text-[13px] text-slate-500 mt-1">Audit all system changes</p>
                </div>
                <Icon name="chevron-right" className="h-5 w-5 text-slate-400 group-hover:text-blue-800 transition-colors" />
              </Link>
            )}
            
            <MyRecentActivityWidget onViewAll={() => navigate('/activity/my-activity')} />

            {roleType !== 'Unassigned' && (
              <div className="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm">
                <h3 className="text-[17px] font-semibold text-slate-900 mb-4">Quick Links</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/inventory" className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-center">
                    <Icon name="cube" className="h-6 w-6 text-blue-800 mb-2" />
                    <span className="text-[13px] font-medium text-slate-700">Inventory</span>
                  </Link>
                  <Link to="/profile" className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-center">
                    <Icon name="user-circle" className="h-6 w-6 text-blue-800 mb-2" />
                    <span className="text-[13px] font-medium text-slate-700">My Profile</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
