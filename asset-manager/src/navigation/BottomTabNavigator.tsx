import React, { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DashboardStackNavigator } from './DashboardStackNavigator';
import { SiteStackNavigator } from './SiteStackNavigator';
import { InventoryStackNavigator } from './InventoryStackNavigator';
import { RequestStackNavigator } from './RequestStackNavigator';
import { PurchaseOrderStackNavigator } from './PurchaseOrderStackNavigator';
import { useAppSelector } from '../store/hooks';
import {
  selectIsAdminOrSuperAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
  selectCanManageRequests,
  selectCanViewRequestQueue,
} from '../store/selectors/authSelectors';
import { selectPendingRequestsCount } from '../store/selectors/requestSelectors';
import { selectPendingApprovalCount } from '../store/selectors/purchaseOrderSelectors';

const Tab = createBottomTabNavigator();

const TAB_BAR_BASE_HEIGHT = 56;
const TAB_BAR_MIN_BOTTOM_PADDING = 12;

/**
 * Bottom Tab Navigator (Standard)
 *
 * Uses the JS-based tab navigator which works without a native rebuild.
 *
 * To upgrade to the Native Bottom Tab Navigator (iOS Liquid Glass, etc.),
 * you need to rebuild the development build:
 *   npx expo run:ios
 * Then switch to createNativeBottomTabNavigator from
 * '@react-navigation/bottom-tabs/unstable'
 */
export const BottomTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_PADDING);
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const canManageRequests = useAppSelector(selectCanManageRequests);
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const pendingRequestsCount = useAppSelector(selectPendingRequestsCount);
  const pendingApprovalCount = useAppSelector(selectPendingApprovalCount);

  // Purchase Orders tab is visible to Admin, SuperAdmin, and StoreIncharge
  const showPurchaseOrdersTab = isAdminOrSuperAdmin || isStoreIncharge;

  // Inventory tab is visible to Admin, SuperAdmin, StoreIncharge, and SiteManager
  const showInventoryTab = isAdminOrSuperAdmin || isStoreIncharge || isSiteManager;

  // Requests tab: queue viewers (incl. read-only Admin) and Site Managers
  const showRequestsTab = canViewRequestQueue || isSiteManager;

  // Initial screen for Requests stack (role-based)
  const requestsInitialScreen =
    isSiteManager && !canViewRequestQueue
      ? 'MyRequests'
      : canViewRequestQueue
        ? 'RequestQueue'
        : 'MyRequests';

  // Initial screen for Inventory stack (role-based)
  const inventoryInitialScreen =
    isAdminOrSuperAdmin || isStoreIncharge ? 'CentralStoreInventory' : 'MySiteInventory';

  // When Requests tab is pressed, pop to initial screen so user always sees RequestQueue/MyRequests
  const requestsTabListeners = useCallback(
    ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) => ({
      tabPress: () => {
        navigation.navigate('Requests', {
          screen: requestsInitialScreen,
        });
      },
    }),
    [requestsInitialScreen]
  );

  // When Inventory tab is pressed, pop to initial screen so user always sees list (not ItemDetail/Maintenance)
  const inventoryTabListeners = useCallback(
    ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) => ({
      tabPress: () => {
        navigation.navigate('Inventory', {
          screen: inventoryInitialScreen,
        });
      },
    }),
    [inventoryInitialScreen]
  );

  // When Dashboard tab is pressed, pop to DashboardHome so user always sees main dashboard
  const dashboardTabListeners = useCallback(
    ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) => ({
      tabPress: () => {
        navigation.navigate('Dashboard', {
          screen: 'DashboardHome',
        });
      },
    }),
    []
  );

  // When Purchase Orders tab is pressed, pop to list so user always sees PurchaseOrderList
  const purchaseOrdersTabListeners = useCallback(
    ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) => ({
      tabPress: () => {
        navigation.navigate('PurchaseOrders', {
          screen: 'PurchaseOrderList',
        });
      },
    }),
    []
  );

  // When Sites tab is pressed, pop to list so user always sees SiteManagement
  const sitesTabListeners = useCallback(
    ({ navigation }: { navigation: { navigate: (name: string, params?: object) => void } }) => ({
      tabPress: () => {
        navigation.navigate('Sites', {
          screen: 'SiteManagement',
        });
      },
    }),
    []
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: TAB_BAR_BASE_HEIGHT + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Dashboard',
        }}
        listeners={dashboardTabListeners}
      />
      {showInventoryTab && (
        <Tab.Screen
          name="Inventory"
          component={InventoryStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
            tabBarLabel: 'Inventory',
          }}
          listeners={inventoryTabListeners}
        />
      )}
      {showRequestsTab && (
        <Tab.Screen
          name="Requests"
          component={RequestStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="file-tray-full-outline" size={size} color={color} />
            ),
            tabBarLabel: 'Requests',
            tabBarBadge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          }}
          listeners={requestsTabListeners}
        />
      )}
      {showPurchaseOrdersTab && (
        <Tab.Screen
          name="PurchaseOrders"
          component={PurchaseOrderStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
            tabBarLabel: 'Purchase',
            tabBarBadge:
              isAdminOrSuperAdmin && pendingApprovalCount > 0
                ? pendingApprovalCount
                : undefined,
          }}
          listeners={purchaseOrdersTabListeners}
        />
      )}
      {isAdminOrSuperAdmin && (
        <Tab.Screen
          name="Sites"
          component={SiteStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
            ),
            tabBarLabel: 'Sites',
          }}
          listeners={sitesTabListeners}
        />
      )}
    </Tab.Navigator>
  );
};
