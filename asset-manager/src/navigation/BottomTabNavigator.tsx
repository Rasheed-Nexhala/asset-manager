import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SignedInScreen } from '../screens/Users/SignedInScreen';
import { DashboardScreen } from '../screens/DashboardScreen';

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
    </Tab.Navigator>
  );
};
