/**
 * ItemSelectorForMaintenance
 *
 * Trigger component that navigates to SelectItemForMaintenanceScreen.
 * Displays the selected item or placeholder. Replaces the modal-based picker
 * for better UX: full-screen, paginated, searchable.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Item } from '../../types/inventory';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceStackParamList';

interface ItemSelectorForMaintenanceProps {
  selectedItemId?: string;
  selectedItem?: Item | null;
  excludeItemIds?: string[];
}

type NavigationProp = StackNavigationProp<
  MaintenanceStackParamList,
  'SelectItemForMaintenance'
>;

export default function ItemSelectorForMaintenance({
  selectedItemId,
  selectedItem,
  excludeItemIds = [],
}: ItemSelectorForMaintenanceProps) {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    navigation.navigate('SelectItemForMaintenance', {
      selectedItemId,
      excludeItemIds,
    });
  };

  return (
    <>
      {/* Selector Button - CIAMS design: min height 48px */}
      <TouchableOpacity
        className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between min-h-[48px]"
        onPress={handlePress}
        accessibilityLabel="Item selector"
        accessibilityHint="Opens screen to select an item"
        accessibilityRole="button"
      >
        <Text
          className={`text-[15px] flex-1 ${
            selectedItem ? 'text-[#0F172A]' : 'text-[#94A3B8]'
          }`}
        >
          {selectedItem ? selectedItem.name : 'Select Item'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </TouchableOpacity>

      {/* Selected Item Info - CIAMS card style */}
      {selectedItem && (
        <View className="mt-2 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
          <Text className="text-[13px] text-[#64748B]">SKU: {selectedItem.sku}</Text>
          <Text className="text-[13px] text-[#64748B]">
            Available: {selectedItem.centralStoreQuantity || 0} {selectedItem.unit}
          </Text>
        </View>
      )}
    </>
  );
}
