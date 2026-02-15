import React from 'react';
import { View, Text } from 'react-native';
import { ScreenLayout, Users } from '../../components';

export const UsersScreen: React.FC = () => {
  return (
    <ScreenLayout edges={['top']}>
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <Text
          className="text-[22px] font-semibold text-[#0F172A]"
          accessibilityRole="header"
        >
          Users
        </Text>
      </View>
      <View className="flex-1">
        <Users />
      </View>
    </ScreenLayout>
  );
};
