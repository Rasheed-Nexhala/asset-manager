import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ActivityLogScreen } from '../screens/ActivityLog/ActivityLogScreen';
import { MyActivityScreen } from '../screens/ActivityLog/MyActivityScreen';
import { ProfileScreen } from '../screens/Users/ProfileScreen';
import { UsersScreen } from '../screens/Users/UsersScreen';
import { useAppSelector } from '../store/hooks';
import { selectIsAdminOrSuperAdmin } from '../store/selectors/authSelectors';
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
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      {isAdminOrSuperAdmin && (
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
      {isAdminOrSuperAdmin && (
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
