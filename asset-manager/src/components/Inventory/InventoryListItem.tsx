import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryEntry, ItemType } from '../../types/inventory';

export interface InventoryListItemProps {
  entry: InventoryEntry;
  imageUrl?: string;
  type: ItemType;
  unit: string;
  onPress?: () => void;
}

/**
 * Formats a timestamp to a relative time string (e.g., "2h ago", "3d ago")
 * or a formatted date if older than 7 days
 */
const formatTimestamp = (isoString: string | null): string => {
  if (!isoString) return 'N/A';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

export const InventoryListItem: React.FC<InventoryListItemProps> = ({
  entry,
  imageUrl,
  type,
  unit,
  onPress,
}) => {
  const itemTypeLabel = type === 'consumable' ? 'Consumable' : 'Non-Consumable';
  const itemTypeColor = type === 'consumable' ? '#475569' : '#0D9488';
  const formattedDate = formatTimestamp(entry.updatedAt);

  return (
    <TouchableOpacity
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] min-h-[48px]"
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Item: ${entry.itemName}. SKU: ${entry.itemSku}. Type: ${itemTypeLabel}. Quantity: ${entry.quantity} ${unit}`}
    >
      <View className="flex-row gap-3 items-center">
        {/* Item Image - Small, left side */}
        <View className="w-12 h-12 rounded-lg bg-[#F1F5F9] items-center justify-center overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="cube-outline" size={20} color="#94A3B8" />
          )}
        </View>

        {/* Content - Right side */}
        <View className="flex-1 flex-row items-center justify-between">
          {/* Name, SKU, and Quantity */}
          <View className="flex-1 mr-2">
            <Text className="text-[15px] font-semibold text-[#0F172A] mb-0.5" numberOfLines={1}>
              {entry.itemName}
            </Text>
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-[13px] text-[#64748B]">SKU: {entry.itemSku}</Text>
              <Text className="text-[13px] text-[#0F172A] font-medium">
                {entry.quantity} {unit}
              </Text>
            </View>
            {entry.updatedAt && (
              <Text className="text-[12px] text-[#64748B] mt-0.5">
                Updated {formattedDate}
              </Text>
            )}
          </View>

          {/* Item Type Badge */}
          <View
            className="px-2 py-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: `${itemTypeColor}15` }}
          >
            <Text
              className="text-[12px] font-medium"
              style={{ color: itemTypeColor }}
            >
              {itemTypeLabel}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
