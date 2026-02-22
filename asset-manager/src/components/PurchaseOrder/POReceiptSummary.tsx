import React from 'react';
import { View, Text } from 'react-native';

interface InventoryUpdate {
  itemName: string;
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
  if (updates.length === 0) return null;

  return (
    <View className="bg-[#D97706]/15 rounded-lg p-4 border border-[#D97706]/30">
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-[15px] font-semibold text-[#D97706]">
          Inventory will be updated:
        </Text>
      </View>
      {updates.map((u, i) => (
        <Text
          key={i}
          className="text-[14px] text-[#0F172A] mb-1"
        >{`• ${u.itemName}: ${u.currentQty} → ${u.newQty} (+${u.receivedQty})`}</Text>
      ))}
    </View>
  );
};
