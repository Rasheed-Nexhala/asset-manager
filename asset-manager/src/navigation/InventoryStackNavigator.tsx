import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import {
  selectIsAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
} from '../store/selectors/authSelectors';
import {
  CentralStoreInventoryScreen,
  AddEditItemScreen,
  ItemDetailScreen,
  MySiteInventoryScreen,
  OtherSiteInventoryScreen,
  SteelMasterScreen,
  InventoryUpdateRequestsScreen,
} from '../screens';
import { MaintenanceStackNavigator } from './MaintenanceStackNavigator';

/**
 * Navigation parameter types for Inventory Stack
 */
export type InventoryStackParamList = {
  // Central Store screens (Admin/StoreIncharge)
  CentralStoreInventory: undefined;
  AddEditItem: { itemId?: string } | undefined;
  ItemDetail: { itemId: string };
  SteelMaster: undefined;
  Maintenance: undefined;
  InventoryUpdateRequests: undefined;

  // Site Manager screens
  MySiteInventory: undefined;
  OtherSiteInventory: { siteId: string };
};

const Stack = createStackNavigator<InventoryStackParamList>();

/**
 * InventoryStackNavigator - Stack navigator for Inventory Management screens.
 * 
 * Role-based navigation:
 * - Admin/StoreIncharge: Central Store Inventory → Add/Edit Item, Item Detail
 * - SiteManager: My Site Inventory → Other Site Inventory (read-only)
 * 
 * The initial route is determined by the user's role:
 * - Admin/StoreIncharge → CentralStoreInventory
 * - SiteManager → MySiteInventory
 */
export const InventoryStackNavigator: React.FC = () => {
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);

  // Determine initial route based on role
  const initialRouteName: keyof InventoryStackParamList = 
    isAdmin || isStoreIncharge 
      ? 'CentralStoreInventory' 
      : isSiteManager 
        ? 'MySiteInventory' 
        : 'CentralStoreInventory'; // Fallback (shouldn't happen if role is loaded)

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Central Store screens - visible to Admin and StoreIncharge */}
      {(isAdmin || isStoreIncharge) && (
        <>
          <Stack.Screen 
            name="CentralStoreInventory" 
            component={CentralStoreInventoryScreen} 
          />
          <Stack.Screen
            name="AddEditItem"
            component={AddEditItemScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="ItemDetail"
            component={ItemDetailScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="SteelMaster"
            component={SteelMasterScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Maintenance"
            component={MaintenanceStackNavigator}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="InventoryUpdateRequests"
            component={InventoryUpdateRequestsScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
        </>
      )}

      {/* Site Manager screens - visible to SiteManager */}
      {isSiteManager && (
        <>
          <Stack.Screen 
            name="MySiteInventory" 
            component={MySiteInventoryScreen} 
          />
          <Stack.Screen
            name="OtherSiteInventory"
            component={OtherSiteInventoryScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="ItemDetail"
            component={ItemDetailScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
