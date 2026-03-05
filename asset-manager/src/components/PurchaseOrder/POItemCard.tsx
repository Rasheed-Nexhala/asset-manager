import React, { useState, useEffect } from 'react';
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
  onGstPercentageChange?: (percentage: number) => void;
}

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

/** Sanitize input to allow digits and one decimal point (e.g. "12.50", "12.") */
const sanitizeDecimalInput = (t: string): string => {
  const sanitized = t.replace(/[^\d.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return sanitized;
};

export const POItemCard: React.FC<POItemCardProps> = ({
  item,
  onRemove,
  editable = false,
  onQuantityChange,
  onUnitPriceChange,
  onGstPercentageChange,
}) => {
  const [unitPriceStr, setUnitPriceStr] = useState(
    item.unitPrice > 0 ? String(item.unitPrice) : ''
  );
  const [gstStr, setGstStr] = useState(
    (item.gstPercentage ?? 0) > 0 ? String(item.gstPercentage) : ''
  );

  useEffect(() => {
    setUnitPriceStr(item.unitPrice > 0 ? String(item.unitPrice) : '');
  }, [item.itemId]);

  useEffect(() => {
    setGstStr((item.gstPercentage ?? 0) > 0 ? String(item.gstPercentage) : '');
  }, [item.itemId]);

  const gstPct = item.gstPercentage ?? 0;
  const gstAmount =
    item.gstAmount ?? Math.round((item.amount * gstPct) / 100);
  const amountWithGst = item.amount + gstAmount;
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
            className="w-12 h-12 items-center justify-center -mr-2 -mt-1 rounded-full"
            accessibilityLabel="Remove item"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={22} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stacked layout: Quantity, Unit Price, GST, Amount — CIAMS gap-4 between fields, gap-1.5 label-to-input */}
      <View className="gap-4">
        {/* Quantity — full-width stepper (CIAMS: minus=outline, plus=primary) */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Quantity</Text>
          {editable && onQuantityChange ? (
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => onQuantityChange(-1)}
                className="w-12 h-12 border border-[#E2E8F0] rounded-full items-center justify-center bg-white"
                accessibilityLabel="Decrease quantity"
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={22} color="#1E40AF" />
              </TouchableOpacity>
              <View className="flex-1 min-w-0 items-center justify-center h-12">
                <Text className="text-[15px] font-medium text-[#0F172A]">
                  {item.quantity}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onQuantityChange(1)}
                className="w-12 h-12 border-2 border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
                accessibilityLabel="Increase quantity"
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="h-12 justify-center">
              <Text className="text-[15px] text-[#0F172A]">{item.quantity}</Text>
            </View>
          )}
        </View>

        {/* Unit Price — full-width input */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Unit Price (₹)</Text>
          {editable && onUnitPriceChange ? (
            <TextInput
              value={unitPriceStr}
              onChangeText={(t) => {
                const sanitized = sanitizeDecimalInput(t);
                setUnitPriceStr(sanitized);
                onUnitPriceChange(parseFloat(sanitized) || 0);
              }}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              {...(Platform.OS === 'android' && {
                includeFontPadding: false,
              })}
              style={Platform.OS === 'android' ? { textAlignVertical: 'center' } : undefined}
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] focus:border-[#1E40AF]"
            />
          ) : (
            <View className="h-12 justify-center">
              <Text className="text-[15px] text-[#0F172A]">
                {formatCurrency(item.unitPrice)}
              </Text>
            </View>
          )}
        </View>

        {/* GST % — full-width input */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">GST (%)</Text>
          {editable && onGstPercentageChange ? (
            <TextInput
              value={gstStr}
              onChangeText={(t) => {
                const sanitized = sanitizeDecimalInput(t);
                setGstStr(sanitized);
                const parsed = parseFloat(sanitized) || 0;
                onGstPercentageChange(Math.min(100, Math.max(0, parsed)));
              }}
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              {...(Platform.OS === 'android' && {
                includeFontPadding: false,
              })}
              style={Platform.OS === 'android' ? { textAlignVertical: 'center' } : undefined}
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] focus:border-[#1E40AF]"
            />
          ) : (
            <View className="h-12 justify-center flex-row items-center">
              <Text className="text-[15px] text-[#0F172A]">{gstPct}%</Text>
              {item.gstAmount != null && item.gstAmount > 0 && (
                <Text className="text-[13px] text-[#64748B] ml-2">
                  ({formatCurrency(item.gstAmount)})
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Amount (incl. GST) — full-width display */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">
            Amount (incl. GST)
          </Text>
          <View className="h-12 justify-center">
            <Text className="text-[15px] font-semibold text-[#0F172A]">
              {formatCurrency(amountWithGst)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
