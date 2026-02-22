import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  DashboardScreen,
  ActivityLogScreen,
  MyActivityScreen,
  ProfileScreen,
  UsersScreen,
} from '../screens';
import { useAppSelector } from '../store/hooks';
import { selectIsAdmin } from '../store/selectors/authSelectors';
import type { DashboardStackParamList } from './DashboardStackParamList';

const Stack = createStackNavigator<DashboardStackParamList>();

/**
 * DashboardStackNavigator - Stack navigator for Dashboard with Activity Log screens.
 *
 * - DashboardHome: Main dashboard (all users)
 * - ActivityLog: Full activity log (Admin only)
 * - MyActivity: User's recent activity (all users)
 */
export const DashboardStackNavigator: React.FC = () => {
  const isAdmin = useAppSelector(selectIsAdmin);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      {isAdmin && (
        <Stack.Screen
          name="ActivityLog"
          component={ActivityLogScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
          }}
        />
      )}
      <Stack.Screen
        name="MyActivity"
        component={MyActivityScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      {isAdmin && (
        <Stack.Screen
          name="Users"
          component={UsersScreen}
          options={{
            presentation: 'card',
            gestureEnabled: true,
          }}
        />
      )}
    </Stack.Navigator>
  );
};
