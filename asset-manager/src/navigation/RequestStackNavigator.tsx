import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import {
  selectCanManageRequests,
  selectCanViewRequestQueue,
  selectIsSiteManager,
} from '../store/selectors/authSelectors';
import type { RequestStackParamList } from './RequestStackParamList';
import {
  RequestQueueScreen,
  MyRequestsScreen,
  CreateRequestScreen,
  CreateSiteTransferRequestScreen,
  ProcessRequestScreen,
  EditRequestScreen,
  RejectRequestScreen,
  ConfirmTransferScreen,
  ReturnItemsScreen,
} from '../screens/Requests';
import { SelectItemsScreen } from '../screens/SelectItems';

const Stack = createStackNavigator<RequestStackParamList>();

/**
 * Request Stack Navigator — Stack navigator for Request Management screens.
 * Role-based initial route:
 * - Admin / Store Incharge / SuperAdmin → RequestQueue (Admin read-only; see canManageRequests for actions)
 * - SiteManager → MyRequests
 */
export const RequestStackNavigator: React.FC = () => {
  const canManageRequests = useAppSelector(selectCanManageRequests);
  const canViewRequestQueue = useAppSelector(selectCanViewRequestQueue);
  const isSiteManager = useAppSelector(selectIsSiteManager);

  const initialRouteName: keyof RequestStackParamList =
    isSiteManager && !canViewRequestQueue
      ? 'MyRequests'
      : canViewRequestQueue
        ? 'RequestQueue'
        : 'MyRequests';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        presentation: 'card',
      }}
    >
      <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
      <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
      {/* CreateSiteTransferRequest: available to Site Managers from OtherSiteInventory */}
      <Stack.Screen name="CreateSiteTransferRequest" component={CreateSiteTransferRequestScreen} />
      <Stack.Screen name="EditRequest" component={EditRequestScreen} />
      <Stack.Screen name="ReturnItems" component={ReturnItemsScreen} />
      <Stack.Screen name="SelectItems" component={SelectItemsScreen} />
      {/* ProcessRequest: always available so SiteManagers can view their requests (read-only) */}
      <Stack.Screen name="ProcessRequest" component={ProcessRequestScreen} />
      {canViewRequestQueue && (
        <Stack.Screen name="RequestQueue" component={RequestQueueScreen} />
      )}
      {canManageRequests && (
        <>
          <Stack.Screen name="RejectRequest" component={RejectRequestScreen} />
          <Stack.Screen name="ConfirmTransfer" component={ConfirmTransferScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
