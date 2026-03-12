import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { PurchaseOrderStackParamList } from './PurchaseOrderStackParamList';
import {
  PurchaseOrderListScreen,
  CreatePOScreen,
  VendorManagementScreen,
  AddVendorScreen,
  ApprovePOScreen,
  ReceivePOScreen,
} from '../screens/PurchaseOrder';
import { SelectItemsScreen } from '../screens/SelectItems';

const Stack = createStackNavigator<PurchaseOrderStackParamList>();

/**
 * Purchase Order Stack Navigator — Stack navigator for PO Management screens.
 * Visible to Admin and Store Incharge only.
 */
export const PurchaseOrderStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="PurchaseOrderList"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        presentation: 'card',
      }}
    >
      <Stack.Screen name="PurchaseOrderList" component={PurchaseOrderListScreen} />
      <Stack.Screen name="CreatePO" component={CreatePOScreen} />
      <Stack.Screen name="VendorManagement" component={VendorManagementScreen} />
      <Stack.Screen name="AddVendor" component={AddVendorScreen} />
      <Stack.Screen name="ApprovePO" component={ApprovePOScreen} />
      <Stack.Screen name="ReceivePO" component={ReceivePOScreen} />
      <Stack.Screen name="SelectItems" component={SelectItemsScreen} />
    </Stack.Navigator>
  );
};
