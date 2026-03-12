import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import {
  selectIsAdmin,
  selectIsStoreIncharge,
} from '../store/selectors/authSelectors';
import type { RequestStackParamList } from './RequestStackParamList';
import {
  RequestQueueScreen,
  MyRequestsScreen,
  CreateRequestScreen,
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
 * - Admin/StoreIncharge → RequestQueue
 * - SiteManager → MyRequests
 */
export const RequestStackNavigator: React.FC = () => {
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);

  const initialRouteName: keyof RequestStackParamList =
    isAdmin || isStoreIncharge ? 'RequestQueue' : 'MyRequests';

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
      <Stack.Screen name="EditRequest" component={EditRequestScreen} />
      <Stack.Screen name="ReturnItems" component={ReturnItemsScreen} />
      <Stack.Screen name="SelectItems" component={SelectItemsScreen} />
      {(isAdmin || isStoreIncharge) && (
        <>
          <Stack.Screen name="RequestQueue" component={RequestQueueScreen} />
          <Stack.Screen name="ProcessRequest" component={ProcessRequestScreen} />
          <Stack.Screen name="RejectRequest" component={RejectRequestScreen} />
          <Stack.Screen name="ConfirmTransfer" component={ConfirmTransferScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
