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
import type { Item } from '../../types/inventory';
import { isWeightBasedItem, kgToPieces, tonToKg, formatWeight } from '../../utils/weightConversionUtils';

interface POItemCardProps {
  item: PurchaseOrderItem;
  inventoryItem?: Item | null;
  onRemove?: () => void;
  editable?: boolean;
  onQuantityChange?: (quantity: number, orderedUnit?: string, orderedQuantity?: number) => void;
  onUnitPriceChange?: (price: number) => void;
  onGstPercentageChange?: (percentage: number) => void;
}

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

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
  inventoryItem,
  onRemove,
  editable = false,
  onQuantityChange,
  onUnitPriceChange,
  onGstPercentageChange,
}) => {
  const isSteel = inventoryItem ? isWeightBasedItem(inventoryItem) : false;
  const hasFullWeightConfig = isSteel && inventoryItem?.weightPerMeter != null && inventoryItem?.lengthPerPiece != null;

  const [entryMode, setEntryMode] = useState<'pieces' | 'kg' | 'ton'>('pieces');
  const [quantityStr, setQuantityStr] = useState(
    item.orderedQuantity ? String(item.orderedQuantity) : item.quantity > 0 ? String(item.quantity) : ''
  );
  
  const [unitPriceStr, setUnitPriceStr] = useState(
    item.unitPrice > 0 ? String(item.unitPrice) : ''
  );
  const [gstStr, setGstStr] = useState(
    (item.gstPercentage ?? 0) > 0 ? String(item.gstPercentage) : ''
  );
  const [qtyError, setQtyError] = useState<string | null>(null);

  useEffect(() => {
    if (item.orderedUnit === 'Kg') setEntryMode('kg');
    else if (item.orderedUnit === 'Ton') setEntryMode('ton');
    else setEntryMode('pieces');
  }, [item.orderedUnit]);

  useEffect(() => {
    setUnitPriceStr(item.unitPrice > 0 ? String(item.unitPrice) : '');
  }, [item.itemId]);

  useEffect(() => {
    setGstStr((item.gstPercentage ?? 0) > 0 ? String(item.gstPercentage) : '');
  }, [item.itemId]);

  const handleQuantityInput = (text: string) => {
    setQuantityStr(text);
    if (!text.trim()) {
      setQtyError(null);
      onQuantityChange?.(0, entryMode === 'pieces' ? undefined : entryMode === 'kg' ? 'Kg' : 'Ton', 0);
      return;
    }

    const num = parseFloat(text);
    if (isNaN(num) || num < 0) {
      setQtyError('Invalid amount');
      return;
    }

    const isDiscreteUnit = (unit: string) => ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(unit);

    if (entryMode === 'pieces' || !hasFullWeightConfig) {
      if (entryMode === 'pieces' && hasFullWeightConfig && !Number.isInteger(num)) {
        setQtyError('Must be whole number');
        return;
      }
      if (!hasFullWeightConfig && isDiscreteUnit(inventoryItem?.unit || '') && !Number.isInteger(num)) {
        setQtyError('Must be whole number for this unit');
        return;
      }
      setQtyError(null);
      onQuantityChange?.(num, undefined, undefined);
    } else {
      const kg = entryMode === 'ton' ? tonToKg(num) : num;
      const res = kgToPieces(kg, inventoryItem!.weightPerMeter!, inventoryItem!.lengthPerPiece!);
      if (!res.isExact) {
        setQtyError('Inexact conversion');
        return;
      } else {
        setQtyError(null);
      }
      onQuantityChange?.(res.pieces, entryMode === 'kg' ? 'Kg' : 'Ton', num);
    }
  };

  const gstPct = item.gstPercentage ?? 0;
  const gstAmount = item.gstAmount ?? Math.round((item.amount * gstPct) / 100);
  const amountWithGst = item.amount + gstAmount;

  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
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
          >
            <Ionicons name="trash-outline" size={22} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>

      <View className="gap-4">
        {editable && hasFullWeightConfig && (
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Order By</Text>
            <View className="flex-row gap-2">
              {(['pieces', 'kg', 'ton'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  className={`px-3 py-1.5 rounded-md border ${
                    entryMode === m ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-white border-[#E2E8F0]'
                  }`}
                  onPress={() => {
                    setEntryMode(m);
                    setQuantityStr('');
                    setQtyError(null);
                    onQuantityChange?.(0, m === 'pieces' ? undefined : m === 'kg' ? 'Kg' : 'Ton', 0);
                  }}
                >
                  <Text className={`text-[12px] font-medium ${entryMode === m ? 'text-white' : 'text-[#64748B]'}`}>
                    {m === 'pieces' ? 'Pieces' : m === 'kg' ? 'Kg' : 'Ton'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Quantity {entryMode !== 'pieces' && `(${entryMode === 'kg' ? 'Kg' : 'Ton'})`}</Text>
          {editable && onQuantityChange ? (
            <View>
              <TextInput
                value={quantityStr}
                onChangeText={handleQuantityInput}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                  qtyError ? 'border-[#DC2626]' : 'border-[#E2E8F0] focus:border-[#1E40AF]'
                }`}
              />
              {qtyError && <Text className="text-[12px] text-[#DC2626] mt-1">{qtyError}</Text>}
              {entryMode !== 'pieces' && !qtyError && item.quantity > 0 && (
                <Text className="text-[12px] text-[#16A34A] mt-1">= {item.quantity} exact pieces</Text>
              )}
            </View>
          ) : (
            <View className="h-12 justify-center">
              <Text className="text-[15px] text-[#0F172A]">
                {item.orderedQuantity ? `${item.orderedQuantity} ${item.orderedUnit}` : `${item.quantity} Pieces`}
              </Text>
            </View>
          )}
        </View>

        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Unit Price (₹) {entryMode !== 'pieces' ? `per ${entryMode === 'kg' ? 'Kg' : 'Ton'}` : 'per Piece'}</Text>
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

        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">
            Amount (incl. GST)
          </Text>
          <View className="h-12 justify-center">
            <Text className="text-[15px] font-semibold text-[#0F172A]">
              {amountWithGst > 0 ? formatCurrency(amountWithGst) : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
