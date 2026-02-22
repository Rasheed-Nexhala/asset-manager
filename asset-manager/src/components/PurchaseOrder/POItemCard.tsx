import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PurchaseOrderItem } from '../../types/purchaseOrder';

interface POItemCardProps {
  item: PurchaseOrderItem;
  onRemove?: () => void;
  editable?: boolean;
  onQuantityChange?: (delta: number) => void;
  onUnitPriceChange?: (price: number) => void;
}

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const POItemCard: React.FC<POItemCardProps> = ({
  item,
  onRemove,
  editable = false,
  onQuantityChange,
  onUnitPriceChange,
}) => {
  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
      {/* Top row: Item name + Remove */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 min-w-0">
          <Text className="text-[15px] font-semibold text-[#0F172A]">
            {item.itemName}
          </Text>
          <Text className="text-[13px] text-[#64748B] mt-0.5">
            SKU: {item.itemSku}
          </Text>
        </View>
        {editable && onRemove && (
          <TouchableOpacity
            onPress={onRemove}
            className="w-12 h-12 items-center justify-center -mr-2 -mt-1"
            accessibilityLabel="Remove item"
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={22} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stacked layout: Quantity, Unit Price, Amount — full width per section (CIAMS gap-4) */}
      <View className="gap-4">
        {/* Quantity — full-width stepper */}
        <View>
          <Text className="text-[13px] text-[#64748B] mb-1.5">Quantity</Text>
          {editable && onQuantityChange ? (
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => onQuantityChange(-1)}
                className="w-12 h-12 rounded-lg bg-[#E2E8F0] items-center justify-center"
                accessibilityLabel="Decrease quantity"
                accessibilityRole="button"
              >
                <Ionicons name="remove" size={20} color="#0F172A" />
              </TouchableOpacity>
              <View className="flex-1 min-w-0 items-center justify-center h-12">
                <Text className="text-[15px] font-medium text-[#0F172A]">
                  {item.quantity}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onQuantityChange(1)}
                className="w-12 h-12 rounded-lg bg-[#E2E8F0] items-center justify-center"
                accessibilityLabel="Increase quantity"
                accessibilityRole="button"
              >
                <Ionicons name="add" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="h-12 justify-center">
              <Text className="text-[15px] text-[#0F172A]">{item.quantity}</Text>
            </View>
          )}
        </View>

        {/* Unit Price — full-width input */}
        <View>
          <Text className="text-[13px] text-[#64748B] mb-1.5">Unit Price (₹)</Text>
          {editable && onUnitPriceChange ? (
            <TextInput
              value={item.unitPrice > 0 ? String(item.unitPrice) : ''}
              onChangeText={(t) =>
                onUnitPriceChange(parseInt(t.replace(/\D/g, ''), 10) || 0)
              }
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              {...(Platform.OS === 'android' && {
                includeFontPadding: false,
              })}
              style={Platform.OS === 'android' ? { textAlignVertical: 'center' } : undefined}
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
            />
          ) : (
            <View className="h-12 justify-center">
              <Text className="text-[15px] text-[#0F172A]">
                {formatCurrency(item.unitPrice)}
              </Text>
            </View>
          )}
        </View>

        {/* Amount — full-width display */}
        <View>
          <Text className="text-[13px] text-[#64748B] mb-1.5">Amount</Text>
          <View className="h-12 justify-center">
            <Text className="text-[15px] font-semibold text-[#0F172A]">
              {formatCurrency(item.amount)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
