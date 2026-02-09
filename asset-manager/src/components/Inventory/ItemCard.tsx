import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Item } from '../../types/inventory';

export interface ItemCardProps {
  item: Item;
  onPress?: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onPress }) => {
  const isLowStock = item.totalQuantity <= item.minStockLevel;
  const itemTypeLabel = item.type === 'consumable' ? 'Consumable' : 'Non-Consumable';
  const isConsumable = item.type === 'consumable';

  return (
    <TouchableOpacity
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Item: ${item.name}. SKU: ${item.sku}. Type: ${itemTypeLabel}. Total quantity: ${item.totalQuantity} ${item.unit}`}
    >
      {/* Top Row: Image + Name/SKU + Badges */}
      <View className="flex-row gap-3 mb-3">
        {/* Item Image */}
        <View className="w-16 h-16 rounded-lg bg-[#F1F5F9] items-center justify-center overflow-hidden">
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="cube-outline" size={32} color="#94A3B8" />
          )}
        </View>

        {/* Name and SKU */}
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-[#0F172A] mb-1" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-[13px] text-[#64748B]">SKU: {item.sku}</Text>
        </View>

        {/* Badges Container */}
        <View className="items-end gap-1.5">
          {/* Item Type Badge */}
          <View
            className={`px-2 py-1 rounded-full ${
              isConsumable ? 'bg-[#475569]/15' : 'bg-[#0D9488]/15'
            }`}
          >
            <Text
              className={`text-[12px] font-medium ${
                isConsumable ? 'text-[#475569]' : 'text-[#0D9488]'
              }`}
            >
              {itemTypeLabel}
            </Text>
          </View>

          {/* Low Stock Badge */}
          {isLowStock && (
            <View className="px-2 py-1 rounded-full bg-[#D97706]/15">
              <Text className="text-[12px] font-medium text-[#D97706]">
                Low Stock
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stock Information Grid */}
      <View className="flex-row gap-4 mb-3">
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B] mb-1">Total</Text>
          <Text className="text-[15px] text-[#0F172A] font-semibold">
            {item.totalQuantity} {item.unit}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B] mb-1">Central Store</Text>
          <Text className="text-[15px] text-[#0F172A]">
            {item.centralStoreQuantity} {item.unit}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B] mb-1">At Sites</Text>
          <Text className="text-[15px] text-[#0F172A]">
            {item.atSitesQuantity} {item.unit}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B] mb-1">Maintenance</Text>
          <Text className="text-[15px] text-[#0F172A]">
            {item.inMaintenanceQuantity} {item.unit}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
