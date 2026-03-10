import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenLayout } from '../components/layout/ScreenLayout';
import { MyRecentActivityWidget } from '../components/ActivityLog';
import {
  DashboardGreeting,
  QuickStatsRow,
  LowStockAlertWidget,
  PendingRequestsWidget,
} from '../components/Dashboard';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import type { RootState } from '../store';
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
import { selectAllRequests, selectMyRequests, selectRequestsLoading, selectRequestsError } from '../store/selectors/requestSelectors';
import { selectLowStockItems, selectItemsLoading } from '../store/selectors/inventorySelectors';
import { selectMaintenanceError } from '../store/selectors/maintenanceSelectors';
import { selectPurchaseOrders, selectPurchaseOrderLoading, selectPurchaseOrderError } from '../store/selectors/purchaseOrderSelectors';
import { selectAllSites, selectSiteById } from '../store/selectors/sitesSelectors';
import { selectAllItems, selectInventoryByLocation, selectEmptyInventory } from '../store/selectors/inventorySelectors';
import { selectAssignedSiteIdForUser } from '../store/selectors/sitesSelectors';
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
import type { DashboardStackParamList } from '../navigation/DashboardStackParamList';
import type { Request } from '../types/request';

/** Fallback when authSelectors fails to load (e.g. circular deps, hot reload) */
const selectIsStoreInchargeSafe = selectIsStoreIncharge ?? ((_state: RootState) => false);

type NavigationProp = CompositeNavigationProp<
  StackNavigationProp<DashboardStackParamList, 'DashboardHome'>,
  StackNavigationProp<DashboardStackParamList>
>;

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

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreInchargeSafe);
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

  const requests = useAppSelector(selectAllRequests);
  const myRequests = useAppSelector(selectMyRequests);
  const lowStockItems = useAppSelector(selectLowStockItems);
  const purchaseOrders = useAppSelector(selectPurchaseOrders);
  const sites = useAppSelector(selectAllSites);
  const items = useAppSelector(selectAllItems);
  const activityLogError = useAppSelector(selectActivityLogError);
  const requestsLoading = useAppSelector(selectRequestsLoading);
  const requestsError = useAppSelector(selectRequestsError);
  const purchaseOrderLoading = useAppSelector(selectPurchaseOrderLoading);
  const purchaseOrderError = useAppSelector(selectPurchaseOrderError);
  const maintenanceError = useAppSelector(selectMaintenanceError);
  const itemsLoading = useAppSelector(selectItemsLoading);

  const permissions = useAppSelector(selectUserPermissions);
  const canManageInventory = useAppSelector(selectHasPermission('canManageInventory'));
  const canApproveOrders = useAppSelector(selectHasPermission('canApproveOrders'));

  // StoreIncharge with empty permissions: default to both (role implies access)
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

  const { isInitialLoad, isRefreshing, triggerRefresh } = useDashboardSubscriptions({
    userId,
    role: roleType,
    assignedSiteId,
    isVisible: isFocused,
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        triggerRefresh();
      }
    });
    return () => sub.remove();
  }, [triggerRefresh]);

  const refreshUnreadCount = useCallback(() => {
    if (!userId) return;
    runNonCriticalTask(
      'dashboard_unread_count',
      () => getUnreadCount(userId),
      {
        feature: 'notifications',
        tags: {
          screen: 'dashboard',
        },
      }
    )
      .then((count) => {
        if (typeof count === 'number') {
          setUnreadCount(count);
        }
      })
      .catch(() => {
        // runNonCriticalTask handles capture internally; this guard prevents unhandled rejections.
      });
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      refreshUnreadCount();
      const interval = setInterval(() => {
        refreshUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    }, [userId, refreshUnreadCount])
  );

  const navToNotificationCenter = useCallback(() => {
    const parent = navigation.getParent();
    const mainStack = parent?.getParent();
    (mainStack as { navigate?: (name: string) => void })?.navigate?.('NotificationCenter');
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh();
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
  }, [triggerRefresh]);

  const dashboardDataError =
    requestsError || purchaseOrderError || maintenanceError;
  const clearDashboardError = useCallback(() => {
    if (requestsError) dispatch(clearRequestsError());
    if (purchaseOrderError) dispatch(clearPurchaseOrderError());
    if (maintenanceError) dispatch(clearMaintenanceError());
  }, [dispatch, requestsError, purchaseOrderError, maintenanceError]);

  useAutoClearError(activityLogError, () => dispatch(clearError()));
  useAutoClearError(dashboardDataError, clearDashboardError);

  const pendingRequests = isSiteManager ? myRequests : requests;
  const pendingForWidget = pendingRequests
    .filter((r) => r.status === 'pending')
    .slice(0, 5)
    .map(toPendingRequest);

  const poAwaitingApproval = purchaseOrders.filter((o) => o.status === 'pending_approval');
  const poApprovedReady = purchaseOrders.filter((o) => o.status === 'approved');
  const poOrderedAwaiting = purchaseOrders.filter((o) => o.status === 'ordered');

  const statsForStore = [
    ...(showInventory ? [{ icon: '📦', value: items.length, label: 'Items' }] : []),
    ...(showOrders ? [{ icon: '⏳', value: poAwaitingApproval.length, label: 'Pending POs' }] : []),
    ...(showOrders ? [{ icon: '📥', value: pendingForWidget.length, label: 'Pending Requests' }] : []),
  ];

  const tabNav = navigation.getParent() as
    | { navigate: (name: string, params?: object) => void }
    | undefined;

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Dashboard"
        leftAction={{
          icon: 'person-circle-outline',
          onPress: () => navigation.navigate('Profile'),
          accessibilityLabel: 'Profile',
        }}
        rightActions={[
          {
            icon: 'notifications-outline',
            onPress: navToNotificationCenter,
            accessibilityLabel: 'Notifications',
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
          ...(isAdmin
            ? [
                {
                  icon: 'people-outline' as const,
                  onPress: () => navigation.navigate('Users'),
                  accessibilityLabel: 'Users',
                },
              ]
            : []),
        ]}
      />
      {activityLogError && (
        <View className="bg-[#DC2626]/15 px-4 py-3 mx-4 mt-2 rounded-lg flex-row items-center justify-between">
          <Text className="text-[13px] text-[#DC2626] flex-1">{activityLogError}</Text>
          <TouchableOpacity
            onPress={() => dispatch(clearError())}
            className="ml-2 px-3 py-1"
            accessibilityLabel="Dismiss error"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}
      {dashboardDataError && (
        <View className="bg-[#DC2626]/15 px-4 py-3 mx-4 mt-2 rounded-lg flex-row items-center justify-between">
          <Text className="text-[13px] text-[#DC2626] flex-1">
            Some data failed to load
          </Text>
          <TouchableOpacity
            onPress={clearDashboardError}
            className="ml-2 px-3 py-1"
            accessibilityLabel="Dismiss error"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefreshing}
            onRefresh={onRefresh}
            tintColor="#1E40AF"
          />
        }
      >
        <View className="gap-6">
          <DashboardGreeting
            displayName={displayName}
            role={role}
            siteName={siteName ?? undefined}
          />

          {isAdmin && (
            <>
              <QuickStatsRow
                stats={[
                  { icon: '📦', value: items.length, label: 'Items' },
                  { icon: '⏳', value: poAwaitingApproval.length, label: 'Pending POs' },
                  { icon: '🏗️', value: sites.length, label: 'Sites' },
                ]}
                isLoading={isInitialLoad}
              />
              <TouchableOpacity
                className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] flex-row items-center justify-between"
                onPress={() => navigation.navigate('ActivityLog')}
                activeOpacity={0.7}
                accessibilityLabel="View Activity Log"
                accessibilityRole="button"
              >
                <Text className="text-[17px] font-semibold text-[#0F172A]">Activity Log</Text>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </TouchableOpacity>
              <MyRecentActivityWidget onViewAll={() => navigation.navigate('MyActivity')} />
              {(lowStockItems.length > 0 || isInitialLoad || itemsLoading) && (
                <LowStockAlertWidget
                  items={lowStockItems.map((i) => ({
                    id: i.id,
                    name: i.name ?? i.id,
                    currentQty: i.centralStoreQuantity ?? i.totalQuantity ?? 0,
                    minQty: i.minStockLevel ?? 0,
                  }))}
                  onViewAll={() => tabNav?.navigate('Inventory', { screen: 'CentralStoreInventory' })}
                  onCreatePO={() =>
                    tabNav?.navigate('PurchaseOrders', { screen: 'CreatePO', params: {} })
                  }
                  loading={isInitialLoad || itemsLoading}
                />
              )}
              {(pendingForWidget.length > 0 || isInitialLoad || requestsLoading) && (
                <PendingRequestsWidget
                  requests={pendingForWidget}
                  onViewAll={() => tabNav?.navigate('Requests', { screen: 'RequestQueue' })}
                  onViewRequest={(id) =>
                    tabNav?.navigate('Requests', { screen: 'ProcessRequest', params: { requestId: id } })
                  }
                  onApprove={(id) =>
                    tabNav?.navigate('Requests', { screen: 'ProcessRequest', params: { requestId: id } })
                  }
                  loading={isInitialLoad || requestsLoading}
                />
              )}
            </>
          )}

          {isStoreIncharge && (
            <>
              {statsForStore.length > 0 && (
                <QuickStatsRow stats={statsForStore} isLoading={isInitialLoad} />
              )}
              {showInventory && (lowStockItems.length > 0 || isInitialLoad || itemsLoading) && (
                <LowStockAlertWidget
                  items={lowStockItems.map((i) => ({
                    id: i.id,
                    name: i.name ?? i.id,
                    currentQty: i.centralStoreQuantity ?? i.totalQuantity ?? 0,
                    minQty: i.minStockLevel ?? 0,
                  }))}
                  onViewAll={() => tabNav?.navigate('Inventory', { screen: 'CentralStoreInventory' })}
                  onCreatePO={() =>
                    tabNav?.navigate('PurchaseOrders', { screen: 'CreatePO', params: {} })
                  }
                  loading={isInitialLoad || itemsLoading}
                />
              )}
              {showOrders && (pendingForWidget.length > 0 || isInitialLoad || requestsLoading) && (
                <PendingRequestsWidget
                  requests={pendingForWidget}
                  onViewAll={() => tabNav?.navigate('Requests', { screen: 'RequestQueue' })}
                  onViewRequest={(id) =>
                    tabNav?.navigate('Requests', { screen: 'ProcessRequest', params: { requestId: id } })
                  }
                  onApprove={(id) =>
                    tabNav?.navigate('Requests', { screen: 'ProcessRequest', params: { requestId: id } })
                  }
                  loading={isInitialLoad || requestsLoading}
                />
              )}
              <MyRecentActivityWidget onViewAll={() => navigation.navigate('MyActivity')} />
            </>
          )}

          {isSiteManager && (
            <>
              <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
                <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                  My Inventory Summary
                </Text>
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-[15px] text-[#64748B]">Total items</Text>
                    <Text className="text-[15px] font-semibold text-[#0F172A]">
                      {siteInventory.length}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[15px] text-[#64748B]">Total quantity</Text>
                    <Text className="text-[15px] font-semibold text-[#0F172A]">
                      {siteInventory.reduce((s, e) => s + e.quantity, 0)}
                    </Text>
                  </View>
                </View>
              </View>
              {(pendingForWidget.length > 0 || isInitialLoad || requestsLoading) && (
                <PendingRequestsWidget
                  requests={pendingForWidget}
                  onViewAll={() => tabNav?.navigate('Requests', { screen: 'MyRequests' })}
                  onViewRequest={(id) =>
                    tabNav?.navigate('Requests', { screen: 'ProcessRequest', params: { requestId: id } })
                  }
                  loading={isInitialLoad || requestsLoading}
                />
              )}
              <MyRecentActivityWidget onViewAll={() => navigation.navigate('MyActivity')} />
            </>
          )}

          {!isAdmin && !isStoreIncharge && !isSiteManager && (
            <>
              {!isActive && roleType === 'Unassigned' && (
                <View
                  className="bg-[#D97706]/15 rounded-[10px] p-4 border border-[#D97706]/30 flex-row items-center"
                  accessibilityLabel="Account pending activation"
                >
                  <Ionicons name="information-circle" size={24} color="#D97706" />
                  <Text className="text-[15px] text-[#D97706] ml-3 flex-1">
                    Your account will be activated once the Admin activates it and assigns you a role.
                  </Text>
                </View>
              )}
              <MyRecentActivityWidget onViewAll={() => navigation.navigate('MyActivity')} />
            </>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
