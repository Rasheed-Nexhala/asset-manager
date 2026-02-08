import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated, selectRoleLoading } from '../store/selectors/authSelectors';
import { AuthFlowScreen } from '../screens/Authentication/AuthFlowScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { UpdatePasswordScreen } from '../screens/Users/UpdatePasswordScreen';

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
    </MainStack.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRoleLoading = useAppSelector(selectRoleLoading);

  return (
    <NavigationContainer>
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
