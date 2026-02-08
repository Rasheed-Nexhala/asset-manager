import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components';

export const DashboardScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScreenHeader title="Dashboard" />
      <View className="flex-1" />
    </SafeAreaView>
  );
};
