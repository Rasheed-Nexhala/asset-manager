import React from 'react';
import { View, Text } from 'react-native';

interface InventoryUpdate {
  itemName: string;
  orderedQty: number;
  remainingQty?: number;
  currentQty: number;
  receivedQty: number;
  newQty: number;
}

interface POReceiptSummaryProps {
  updates: InventoryUpdate[];
}

export const POReceiptSummary: React.FC<POReceiptSummaryProps> = ({
  updates,
}) => {
  const visibleUpdates = updates.filter((u) => u.receivedQty > 0);
  if (visibleUpdates.length === 0) return null;

  return (
    <View className="bg-[#D97706]/15 rounded-lg p-4 border border-[#D97706]/30">
      <Text className="text-[15px] font-semibold text-[#D97706] mb-3">
        Inventory will be updated:
      </Text>
      {visibleUpdates.map((u, i) => {
        const expected = u.remainingQty ?? u.orderedQty;
        const isPartial = u.receivedQty > 0 && u.receivedQty < expected;
        const isExcess = u.receivedQty > expected;
        const isExact = u.receivedQty > 0 && u.receivedQty === expected;

        return (
          <View key={i} className="mb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] text-[#0F172A] flex-1 mr-2" numberOfLines={1}>
                • {u.itemName}
              </Text>
              {isExact && (
                <View className="px-2 py-1 rounded-full bg-[#16A34A]/15">
                  <Text className="text-[12px] font-medium text-[#16A34A]">Exact</Text>
                </View>
              )}
              {isPartial && (
                <View className="px-2 py-1 rounded-full bg-[#D97706]/15">
                  <Text className="text-[12px] font-medium text-[#D97706]">Partial</Text>
                </View>
              )}
              {isExcess && (
                <View className="px-2 py-1 rounded-full bg-[#7C3AED]/15">
                  <Text className="text-[12px] font-medium text-[#7C3AED]">Excess</Text>
                </View>
              )}
            </View>
            <Text className="text-[13px] text-[#64748B] ml-2">
              {`${u.currentQty} → ${u.newQty} (+${u.receivedQty})`}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
