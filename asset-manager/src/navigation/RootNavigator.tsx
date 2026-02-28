import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import {
  NavigationContainer,
  createNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated, selectRoleLoading } from '../store/selectors/authSelectors';
import { AuthFlowScreen } from '../screens/Authentication/AuthFlowScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { UpdatePasswordScreen } from '../screens/Users/UpdatePasswordScreen';
import { NotificationCenterScreen } from '../screens/Notifications/NotificationCenterScreen';

export const navigationRef = createNavigationContainerRef<ParamListBase>();

const AuthStack = createStackNavigator();
const MainStack = createStackNavigator();

/**
 * Main Stack Navigator - Contains all authenticated screens
 * Wraps the BottomTabNavigator to enable modal/overlay screens like UpdatePassword
 */
const MainStackNavigator: React.FC = () => {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Tabs" component={BottomTabNavigator} />
      <MainStack.Screen 
        name="UpdatePasswordScreen" 
        component={UpdatePasswordScreen}
        options={{
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      <MainStack.Screen
        name="NotificationCenter"
        component={NotificationCenterScreen}
        options={{ presentation: 'card' }}
      />
    </MainStack.Navigator>
  );
};

/**
 * Handles notification tap (deep link) - navigates to target screens
 */
function useNotificationResponseHandler(): void {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        screen?: string;
        requestId?: string;
        poId?: string;
        maintenanceId?: string;
        itemId?: string;
      } | undefined;
      if (!navigationRef.isReady()) return;

      if (data?.screen === 'ProcessRequest' && data?.requestId) {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'Requests',
            params: {
              screen: 'ProcessRequest',
              params: { requestId: data.requestId },
            },
          },
        });
      } else if (data?.screen === 'RequestQueue') {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'Requests',
            params: { screen: 'RequestQueue' },
          },
        });
      } else if ((data?.screen === 'ApprovePO' || data?.screen === 'ReceivePO') && data?.poId) {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'PurchaseOrders',
            params: {
              screen: data.screen,
              params: { poId: data.poId },
            },
          },
        });
      } else if (data?.screen === 'PurchaseOrderList') {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'PurchaseOrders',
            params: { screen: 'PurchaseOrderList' as const },
          },
        });
      } else if (data?.screen === 'MaintenanceDetail' && data?.maintenanceId) {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'Inventory',
            params: {
              screen: 'Maintenance',
              params: {
                screen: 'MaintenanceDetail',
                params: { maintenanceId: data.maintenanceId },
              },
            },
          },
        });
      } else if (data?.screen === 'Maintenance' && data?.maintenanceId) {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'Inventory',
            params: {
              screen: 'Maintenance',
              params: {
                screen: 'MaintenanceDetail',
                params: { maintenanceId: data.maintenanceId },
              },
            },
          },
        });
      } else if (data?.screen === 'Maintenance') {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'Inventory',
            params: { screen: 'Maintenance' },
          },
        });
      } else if (data?.screen === 'ItemDetail' && data?.itemId) {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'Inventory',
            params: {
              screen: 'ItemDetail',
              params: { itemId: data.itemId },
            },
          },
        });
      } else if (data?.screen === 'Users') {
        navigationRef.navigate('Main', {
          screen: 'Tabs',
          params: {
            screen: 'Dashboard',
            params: { screen: 'Users' },
          },
        });
      }
    });
    return () => sub.remove();
  }, []);
}

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRoleLoading = useAppSelector(selectRoleLoading);

  useNotificationResponseHandler();

  return (
    <NavigationContainer ref={navigationRef}>
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <AuthStack.Screen name="Auth" component={AuthFlowScreen} />
        ) : isRoleLoading ? (
          <AuthStack.Screen name="Loading" component={LoadingScreen} />
        ) : (
          <AuthStack.Screen name="Main" component={MainStackNavigator} />
        )}
      </AuthStack.Navigator>
    </NavigationContainer>
  );
};
