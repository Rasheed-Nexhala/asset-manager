import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ScreenHeader, ScreenLayout } from '../components';

export const InventoryScreen: React.FC = () => {
  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Inventory" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center justify-center py-20">
          <Text className="text-[15px] text-[#64748B] text-center">
            Inventory management coming soon
          </Text>
          <Text className="text-[13px] text-[#94A3B8] text-center mt-2">
            Item lists, stock levels, and transfers will appear here
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
