import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import {
  selectIsAdminOrSuperAdmin,
  selectIsStoreIncharge,
  selectIsSiteManager,
} from '../store/selectors/authSelectors';
import {
  CentralStoreInventoryScreen,
  AddEditItemScreen,
  AddEditCustomItemScreen,
  ItemDetailScreen,
  ItemActivityHistoryScreen,
  MySiteInventoryScreen,
  OtherSiteInventoryScreen,
  SiteSupervisorsScreen,
  AllocateItemsToSupervisorsScreen,
  SteelMasterScreen,
  InventoryUpdateRequestsScreen,
  CategorySelectScreen,
  CategoryManagementScreen,
  VehiclesListScreen,
  VehicleDetailScreen,
  AddEditVehicleScreen,
} from '../screens';
import { MaintenanceStackNavigator } from './MaintenanceStackNavigator';

/**
 * Navigation parameter types for Inventory Stack
 */
export type InventoryStackParamList = {
  // Central Store screens (Admin/StoreIncharge)
  CentralStoreInventory: { lowStockFilter?: boolean } | undefined;
  AddEditItem: { itemId?: string; selectedCategoryId?: string } | undefined;
  ItemDetail: { itemId: string };
  ItemActivityHistory: { itemId: string; itemName?: string };
  SteelMaster: undefined;
  AddEditCustomItem: { customItemId?: string } | undefined;
  Maintenance: undefined;
  InventoryUpdateRequests: undefined;
  CategorySelect: {
    returnRoute?: string;
    itemId?: string;
    initialCategoryId?: string | null;
  };
  CategoryManagement: undefined;
  VehiclesList: undefined;
  VehicleDetail: { vehicleId: string };
  AddEditVehicle: { vehicleId?: string } | undefined;

  // Site Manager screens
  MySiteInventory: undefined;
  OtherSiteInventory: { siteId: string };
  SiteSupervisors: undefined;
  /** returnTo: where to navigate after a successful split (defaults to inventory). */
  AllocateItemsToSupervisors: { returnTo?: 'inventory' | 'requests' } | undefined;
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
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isSiteManager = useAppSelector(selectIsSiteManager);

  // Determine initial route based on role
  const initialRouteName: keyof InventoryStackParamList = 
    isAdminOrSuperAdmin || isStoreIncharge 
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
      {(isAdminOrSuperAdmin || isStoreIncharge) && (
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
            name="CategorySelect"
            component={CategorySelectScreen}
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
            name="ItemActivityHistory"
            component={ItemActivityHistoryScreen}
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
            name="AddEditCustomItem"
            component={AddEditCustomItemScreen}
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
          <Stack.Screen
            name="CategoryManagement"
            component={CategoryManagementScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="VehiclesList"
            component={VehiclesListScreen}
            options={{ presentation: 'card', gestureEnabled: true }}
          />
          <Stack.Screen
            name="VehicleDetail"
            component={VehicleDetailScreen}
            options={{ presentation: 'card', gestureEnabled: true }}
          />
          <Stack.Screen
            name="AddEditVehicle"
            component={AddEditVehicleScreen}
            options={{ presentation: 'card', gestureEnabled: true }}
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
            name="SiteSupervisors"
            component={SiteSupervisorsScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="AllocateItemsToSupervisors"
            component={AllocateItemsToSupervisorsScreen}
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
