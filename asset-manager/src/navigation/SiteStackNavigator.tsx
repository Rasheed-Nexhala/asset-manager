import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SiteManagementScreen, AddSiteScreen, EditSiteScreen } from '../screens';

export type SiteStackParamList = {
  SiteManagement: undefined;
  AddSite: undefined;
  EditSite: { siteId: string };
};

const Stack = createStackNavigator<SiteStackParamList>();

/**
 * SiteStackNavigator — Stack navigator for Site Management screens.
 * Includes list, add, and edit screens with modal presentation for add/edit.
 */
export const SiteStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SiteManagement" component={SiteManagementScreen} />
      <Stack.Screen
        name="AddSite"
        component={AddSiteScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="EditSite"
        component={EditSiteScreen}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
};
