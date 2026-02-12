import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SignedInScreen } from '../screens/Users/SignedInScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SiteStackNavigator } from './SiteStackNavigator';
import { InventoryStackNavigator } from './InventoryStackNavigator';
import { RequestStackNavigator } from './RequestStackNavigator';
import { useAppSelector } from '../store/hooks';
import {
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
} from '../store/selectors/authSelectors';
import { selectHighPriorityPendingCount } from '../store/selectors/requestSelectors';

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
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const highPriorityCount = useAppSelector(selectHighPriorityPendingCount);

  // Inventory tab is visible to Admin, StoreIncharge, and SiteManager
  const showInventoryTab = isAdmin || isStoreIncharge || isSiteManager;

  // Requests tab is visible to Admin, StoreIncharge, and SiteManager
  const showRequestsTab = isAdmin || isStoreIncharge || isSiteManager;

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
        name="Users"
        component={SignedInScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Users',
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Dashboard',
        }}
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
            tabBarBadge: highPriorityCount > 0 ? highPriorityCount : undefined,
          }}
        />
      )}
      {isAdmin && (
        <Tab.Screen
          name="Sites"
          component={SiteStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
            ),
            tabBarLabel: 'Sites',
          }}
        />
      )}
    </Tab.Navigator>
  );
};
