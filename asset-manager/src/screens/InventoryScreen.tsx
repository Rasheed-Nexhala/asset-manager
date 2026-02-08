import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ScreenLayout } from '../components';

export const InventoryScreen: React.FC = () => {
  return (
    <ScreenLayout edges={['top']}>
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <Text
          className="text-[22px] font-semibold text-[#0F172A]"
          accessibilityRole="header"
        >
          Inventory
        </Text>
      </View>
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
