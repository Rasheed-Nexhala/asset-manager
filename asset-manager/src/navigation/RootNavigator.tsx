import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import {
  NavigationContainer,
  createNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import {
  selectIsAuthenticated,
  selectRoleLoading,
  selectAuthInitialized,
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSuperAdmin,
} from '../store/selectors/authSelectors';
import { AuthFlowScreen } from '../screens/Authentication/AuthFlowScreen';
import { AuthCheckingScreen } from '../screens/Authentication/AuthCheckingScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { UpdatePasswordScreen } from '../screens/Users/UpdatePasswordScreen';
import { DeleteAccountScreen } from '../screens/Users/DeleteAccountScreen';
import { NotificationCenterScreen } from '../screens/Notifications/NotificationCenterScreen';

export const navigationRef = createNavigationContainerRef<ParamListBase>();

type NotificationData = {
  screen?: string;
  requestId?: string;
  poId?: string;
  maintenanceId?: string;
  itemId?: string;
};

/**
 * Shared navigation logic for notification taps.
 * Only navigates when navigationRef is ready AND user can access Main (authenticated + role loaded).
 */
function handleNotificationNavigation(
  data: NotificationData | undefined,
  canNavigateToMain: boolean,
  isAdmin: boolean,
  isStoreIncharge: boolean,
  isSuperAdmin: boolean
): void {
  if (!data || !canNavigateToMain || !navigationRef.isReady()) return;

  const canManageRequests = isAdmin || isStoreIncharge;
  const canManagePo = isAdmin || isStoreIncharge;
  const canReviewPo = isAdmin || isSuperAdmin;

  if (data.screen === 'ProcessRequest' && data.requestId && canManageRequests) {
    const { navigateToProcessRequest } = require('./navigationUtils');
    navigateToProcessRequest(data.requestId);
  } else if (data.screen === 'RequestQueue' && canManageRequests) {
    navigationRef.navigate('Main', {
      screen: 'Tabs',
      params: {
        screen: 'Requests',
        params: { screen: 'RequestQueue' },
      },
    });
  } else if (data.screen === 'ApprovePO' && data.poId && canReviewPo) {
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
  } else if (data.screen === 'ReceivePO' && data.poId && canManagePo) {
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
  } else if (data.screen === 'PurchaseOrderList' && canManagePo) {
    navigationRef.navigate('Main', {
      screen: 'Tabs',
      params: {
        screen: 'PurchaseOrders',
        params: { screen: 'PurchaseOrderList' as const },
      },
    });
  } else if (data.screen === 'MaintenanceDetail' && data.maintenanceId) {
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
  } else if (data.screen === 'Maintenance' && data.maintenanceId) {
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
  } else if (data.screen === 'Maintenance') {
    navigationRef.navigate('Main', {
      screen: 'Tabs',
      params: {
        screen: 'Inventory',
        params: { screen: 'Maintenance' },
      },
    });
  } else if (data.screen === 'ItemDetail' && data.itemId) {
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
  } else if (data.screen === 'InventoryUpdateRequests' && isAdmin) {
    navigationRef.navigate('Main', {
      screen: 'Tabs',
      params: {
        screen: 'Inventory',
        params: { screen: 'InventoryUpdateRequests' },
      },
    });
  } else if (data.screen === 'Users') {
    navigationRef.navigate('Main', {
      screen: 'Tabs',
      params: {
        screen: 'Dashboard',
        params: { screen: 'Users' },
      },
    });
  }
}

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
        name="DeleteAccountScreen" 
        component={DeleteAccountScreen}
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
 * Handles notification tap (deep link) - navigates to target screens.
 * Supports both foreground/background (listener) and cold start (getLastNotificationResponseAsync).
 */
function useNotificationResponseHandler(
  isAuthenticated: boolean,
  isRoleLoading: boolean,
  isAdmin: boolean,
  isStoreIncharge: boolean,
  isSuperAdmin: boolean
): void {
  const [coldStartData, setColdStartData] = useState<NotificationData | null>(null);
  const canNavigateToMain = isAuthenticated && !isRoleLoading;

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const data = response?.notification?.request?.content?.data as NotificationData | undefined;
        if (data?.screen) {
          setColdStartData(data);
        }
      })
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData | undefined;
      handleNotificationNavigation(
        data,
        canNavigateToMain,
        isAdmin,
        isStoreIncharge,
        isSuperAdmin
      );
    });
    return () => sub.remove();
  }, [canNavigateToMain, isAdmin, isStoreIncharge, isSuperAdmin]);

  // Process cold start when auth, role loaded, and nav are ready (may lag behind initial mount)
  useEffect(() => {
    if (!canNavigateToMain || !coldStartData) return;

    const tryNavigate = (attempt = 0): void => {
      const maxAttempts = 50; // ~5s max wait
      if (navigationRef.isReady()) {
        handleNotificationNavigation(
          coldStartData,
          canNavigateToMain,
          isAdmin,
          isStoreIncharge,
          isSuperAdmin
        );
        Notifications.clearLastNotificationResponseAsync();
        setColdStartData(null);
      } else if (attempt < maxAttempts) {
        setTimeout(() => tryNavigate(attempt + 1), 100);
      }
    };

    tryNavigate();
  }, [canNavigateToMain, coldStartData, isAdmin, isStoreIncharge, isSuperAdmin]);
}

export const RootNavigator: React.FC = () => {
  const authInitialized = useAppSelector(selectAuthInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRoleLoading = useAppSelector(selectRoleLoading);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);

  useNotificationResponseHandler(
    isAuthenticated,
    isRoleLoading,
    isAdmin,
    isStoreIncharge,
    isSuperAdmin
  );

  return (
    <NavigationContainer ref={navigationRef}>
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        {!authInitialized ? (
          <AuthStack.Screen name="AuthChecking" component={AuthCheckingScreen} />
        ) : !isAuthenticated ? (
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
