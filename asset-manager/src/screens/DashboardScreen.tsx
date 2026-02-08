import React from 'react';
import { View } from 'react-native';
import { ScreenHeader, ScreenLayout } from '../components';

export const DashboardScreen: React.FC = () => {
  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Dashboard" />
      <View className="flex-1" />
    </ScreenLayout>
  );
};
