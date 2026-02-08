import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated, selectRoleLoading } from '../store/selectors/authSelectors';
import { AuthFlowScreen } from '../screens/Authentication/AuthFlowScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { BottomTabNavigator } from './BottomTabNavigator';

const Stack = createStackNavigator();

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRoleLoading = useAppSelector(selectRoleLoading);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthFlowScreen} />
        ) : isRoleLoading ? (
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
