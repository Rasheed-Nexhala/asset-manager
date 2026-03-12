import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { MaintenanceStackParamList } from './MaintenanceStackParamList';
import {
  MaintenanceDashboardScreen,
  AddToMaintenanceScreen,
  SelectItemForMaintenanceScreen,
  MaintenanceDetailScreen,
  ReturnFromMaintenanceScreen,
  WriteOffScreen,
} from '../screens';

const Stack = createStackNavigator<MaintenanceStackParamList>();

/**
 * Maintenance Stack Navigator — Stack navigator for Maintenance Management screens.
 * 
 * Screens:
 * - MaintenanceDashboard: Main dashboard showing all maintenance items
 * - AddToMaintenance: Form to add items to maintenance
 * - MaintenanceDetail: Detail view of a maintenance item
 * - ReturnFromMaintenance: Form to return items from maintenance
 * - WriteOff: Form to write off items
 * 
 * Access: Admin and StoreIncharge only
 */
export const MaintenanceStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="MaintenanceDashboard"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        presentation: 'card',
      }}
    >
      <Stack.Screen
        name="MaintenanceDashboard"
        component={MaintenanceDashboardScreen}
      />
      <Stack.Screen
        name="AddToMaintenance"
        component={AddToMaintenanceScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="SelectItemForMaintenance"
        component={SelectItemForMaintenanceScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
      />
      <Stack.Screen
        name="ReturnFromMaintenance"
        component={ReturnFromMaintenanceScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="WriteOff"
        component={WriteOffScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
};
