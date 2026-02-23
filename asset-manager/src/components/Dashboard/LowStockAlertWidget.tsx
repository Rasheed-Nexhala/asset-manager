import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

export interface LowStockItem {
  id: string;
  name: string;
  currentQty: number;
  minQty: number;
}

export interface LowStockAlertWidgetProps {
  items: LowStockItem[];
  onViewAll: () => void;
  onCreatePO?: (itemId: string) => void;
  loading?: boolean;
}

/**
 * Widget displaying low stock alerts with optional Create PO action.
 */
export function LowStockAlertWidget({
  items,
  onViewAll,
  onCreatePO,
  loading = false,
}: LowStockAlertWidgetProps) {
  const count = items.length;

  if (loading) {
    return (
      <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] min-h-[120px] items-center justify-center">
        <ActivityIndicator size="small" color="#1E40AF" />
        <Text className="text-[13px] text-[#64748B] mt-2">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[17px] font-semibold text-[#0F172A]">
          LOW STOCK ALERTS ({count})
        </Text>
      </View>
      <View className="gap-3">
        {items.map((item) => (
          <View
            key={item.id}
            className="flex-row justify-between items-center py-2 border-b border-[#E2E8F0] last:border-b-0"
          >
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-[#0F172A]">
                {item.name}
              </Text>
              <Text className="text-[13px] text-[#64748B]">
                {item.currentQty} / Min: {item.minQty}
              </Text>
            </View>
            {onCreatePO && (
              <TouchableOpacity
                onPress={() => onCreatePO(item.id)}
                className="border border-[#1E40AF] rounded-[10px] px-3 py-2 min-h-[40px] justify-center"
                activeOpacity={0.7}
                accessibilityLabel={`Create PO for ${item.name}`}
                accessibilityRole="button"
              >
                <Text className="text-[13px] font-semibold text-[#1E40AF]">
                  Create PO
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
      <TouchableOpacity
        onPress={onViewAll}
        className="mt-3 pt-3 border-t border-[#E2E8F0]"
        activeOpacity={0.7}
        accessibilityLabel="View all alerts"
        accessibilityRole="button"
      >
        <Text className="text-[15px] font-medium text-[#1E40AF]">
          View All Alerts
        </Text>
      </TouchableOpacity>
    </View>
  );
}
