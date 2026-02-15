import React from 'react';
import { View } from 'react-native';
import { ScreenHeader, ScreenLayout, Users } from '../../components';

export const UsersScreen: React.FC = () => {
  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Users" />
      <View className="flex-1">
        <Users />
      </View>
    </ScreenLayout>
  );
};
