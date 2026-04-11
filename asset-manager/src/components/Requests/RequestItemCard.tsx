import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeightDisplay } from '../Inventory/WeightDisplay';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import {
  isWeightBasedItem,
  piecesToKg,
  kgToPieces,
  tonToKg,
  formatWeight,
  getConversionErrorMessage,
} from '../../utils/weightConversionUtils';
import type { RequestItem } from '../../types/request';

interface RequestItemCardProps {
  item: RequestItem;
  mode: 'create' | 'view' | 'edit';
  onQuantityChange?: (itemId: string, quantity: number) => void;
  onRemove?: (itemId: string) => void;
  availability?: {
    available: number;
    sufficient: boolean;
  };
}

export const RequestItemCard: React.FC<RequestItemCardProps> = ({
  item,
  mode,
  onQuantityChange,
  onRemove,
  availability,
}) => {
  const { viewMode } = useWeightViewPreference();
  const isSteelItem = isWeightBasedItem({ weightPerMeter: item.weightPerMeter });
  const hasFullWeightConfig = isSteelItem && item.weightPerMeter != null && item.lengthPerPiece != null;
  const displayUnit = item.unit || 'units';

  const [entryMode, setEntryMode] = useState<'pieces' | 'kg' | 'ton'>('pieces');
  const [amountStr, setAmountStr] = useState(String(item.quantityRequested || ''));
  const [quantity, setQuantity] = useState(item.quantityRequested);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (entryMode === 'pieces') {
      setAmountStr(String(item.quantityRequested || ''));
    }
    setQuantity(item.quantityRequested);
  }, [item.quantityRequested, entryMode]);

  const handleModeChange = useCallback((m: 'pieces' | 'kg' | 'ton') => {
    setEntryMode(m);
    setErrorMsg(null);
    if (quantity > 0 && hasFullWeightConfig) {
      if (m === 'pieces') {
        setAmountStr(String(quantity));
      } else if (m === 'kg') {
        setAmountStr(String(piecesToKg(quantity, item.weightPerMeter!, item.lengthPerPiece!)));
      } else if (m === 'ton') {
        setAmountStr(String(piecesToKg(quantity, item.weightPerMeter!, item.lengthPerPiece!) / 1000));
      }
    } else if (quantity > 0) {
      setAmountStr(String(quantity));
    } else {
      setAmountStr('');
    }
  }, [quantity, hasFullWeightConfig, item.weightPerMeter, item.lengthPerPiece]);

  const handleAmountChange = (text: string) => {
    setAmountStr(text);
    if (!text.trim()) {
      setErrorMsg(null);
      setQuantity(0);
      onQuantityChange?.(item.itemId, 0);
      return;
    }

    const num = parseFloat(text);
    if (isNaN(num) || num < 0) {
      setErrorMsg('Invalid amount');
      return;
    }

    const isDiscreteUnit = (unit: string) => ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(unit);

    if (entryMode === 'pieces' || !hasFullWeightConfig) {
      if (entryMode === 'pieces' && hasFullWeightConfig && !Number.isInteger(num)) {
        setErrorMsg('Pieces must be a whole number');
        return;
      }
      if (!hasFullWeightConfig && isDiscreteUnit(item.unit || '') && !Number.isInteger(num)) {
        setErrorMsg('Must be a whole number for this unit');
        return;
      }
      setErrorMsg(null);
      setQuantity(num);
      onQuantityChange?.(item.itemId, num);
    } else {
      const kg = entryMode === 'ton' ? tonToKg(num) : num;
      const res = kgToPieces(kg, item.weightPerMeter!, item.lengthPerPiece!);
      if (!res.isExact) {
        setErrorMsg(getConversionErrorMessage(kg, item.weightPerMeter!, item.lengthPerPiece!));
      } else {
        setErrorMsg(null);
        setQuantity(res.pieces);
        onQuantityChange?.(item.itemId, res.pieces);
      }
    }
  };

  const handleIncrement = () => {
    if (entryMode !== 'pieces' && hasFullWeightConfig) return;
    const newQty = quantity + 1;
    setAmountStr(String(newQty));
    setQuantity(newQty);
    setErrorMsg(null);
    onQuantityChange?.(item.itemId, newQty);
  };

  const handleDecrement = () => {
    if (entryMode !== 'pieces' && hasFullWeightConfig) return;
    if (quantity > 0) {
      const newQty = quantity - 1;
      setAmountStr(String(newQty));
      setQuantity(newQty);
      setErrorMsg(null);
      onQuantityChange?.(item.itemId, newQty);
    }
  };

  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      <View className="flex-row gap-3">
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="w-16 h-16 rounded-lg bg-[#F1F5F9]"
            resizeMode="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-lg bg-[#F1F5F9] items-center justify-center">
            <Ionicons name="cube-outline" size={32} color="#64748B" />
          </View>
        )}

        <View className="flex-1 min-w-0">
          <Text
            className="text-[15px] font-semibold text-[#0F172A] mb-1"
            numberOfLines={2}
          >
            {item.itemName}
          </Text>

          <View className="flex-row items-center gap-2 mb-2">
            <Text className="text-[13px] text-[#64748B]">{item.itemSku}</Text>
            <View className="w-1 h-1 rounded-full bg-[#64748B]" />
            <Text className="text-[13px] text-[#64748B]">
              {item.itemType === 'consumable'
                ? 'Consumable'
                : item.itemType === 'fuel'
                  ? 'Fuel'
                  : 'Non-Consumable'}
            </Text>
          </View>

          {mode === 'create' || mode === 'edit' ? (
            <View>
              {hasFullWeightConfig && (
                <View className="flex-row gap-2 mb-3">
                  {(['pieces', 'kg', 'ton'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      className={`px-3 py-1.5 rounded-md border ${
                        entryMode === m
                          ? 'bg-[#1E40AF] border-[#1E40AF]'
                          : 'bg-white border-[#E2E8F0]'
                      }`}
                      onPress={() => handleModeChange(m)}
                    >
                      <Text
                        className={`text-[12px] font-medium ${
                          entryMode === m ? 'text-white' : 'text-[#64748B]'
                        }`}
                      >
                        {m === 'pieces' ? 'Pcs' : m === 'kg' ? 'Kg' : 'Ton'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View className="gap-2">
                <Text className="text-[13px] text-[#64748B]">
                  {hasFullWeightConfig
                    ? entryMode === 'pieces'
                      ? 'Quantity (Pcs):'
                      : entryMode === 'kg'
                        ? 'Weight (Kg):'
                        : 'Weight (Ton):'
                    : `Quantity (${displayUnit}):`}
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="flex-row items-center gap-2 flex-1 min-w-0">
                    {(!hasFullWeightConfig || entryMode === 'pieces') && (
                      <TouchableOpacity
                        onPress={handleDecrement}
                        accessibilityLabel="Decrease quantity"
                        className="h-12 w-12 shrink-0 border border-[#E2E8F0] rounded-full items-center justify-center"
                      >
                        <Text className="text-[#1E40AF] text-lg">−</Text>
                      </TouchableOpacity>
                    )}

                    <TextInput
                      value={amountStr}
                      onChangeText={handleAmountChange}
                      keyboardType="decimal-pad"
                      className="border border-[#E2E8F0] rounded-lg px-2 text-center text-[15px] font-bold text-[#0F172A] bg-white flex-1 min-w-[56px] max-w-[120px]"
                      style={{ minHeight: 48, paddingVertical: 8 }}
                    />

                    {(!hasFullWeightConfig || entryMode === 'pieces') && (
                      <TouchableOpacity
                        onPress={handleIncrement}
                        accessibilityLabel="Increase quantity"
                        className="h-12 w-12 shrink-0 border border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
                      >
                        <Text className="text-white text-lg">+</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {onRemove && (
                    <TouchableOpacity
                      onPress={() => onRemove(item.itemId)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove item from request"
                      className="h-12 w-12 shrink-0 items-center justify-center rounded-[10px] active:bg-red-600/10"
                    >
                      <Ionicons name="trash-outline" size={22} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {hasFullWeightConfig && !errorMsg && quantity > 0 && entryMode !== 'pieces' && (
                 <Text className="text-[13px] text-[#16A34A] mt-2 font-medium">
                   = {quantity} Pcs
                 </Text>
              )}
              {hasFullWeightConfig && !errorMsg && quantity > 0 && entryMode === 'pieces' && (
                 <Text className="text-[13px] text-[#64748B] mt-2">
                   ≈ {formatWeight(piecesToKg(quantity, item.weightPerMeter!, item.lengthPerPiece!), 'Kg')}
                 </Text>
              )}

              {errorMsg && (
                <Text className="text-[12px] text-[#DC2626] mt-2 font-medium">
                  {errorMsg}
                </Text>
              )}
            </View>
          ) : (
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-[15px] text-[#0F172A]">Quantity: </Text>
              {hasFullWeightConfig ? (
                <WeightDisplay
                  quantity={item.quantityRequested}
                  weightPerMeter={item.weightPerMeter}
                  lengthPerPiece={item.lengthPerPiece}
                  viewMode={viewMode}
                  unit={item.unit || 'Pcs'}
                />
              ) : (
                <Text className="text-[15px] text-[#0F172A]">
                  {item.quantityRequested} {displayUnit}
                </Text>
              )}
            </View>
          )}

          {availability && (
            <View className={`mt-3 p-2 rounded-lg ${availability.sufficient ? 'bg-[#16A34A]/10' : 'bg-[#DC2626]/10'}`}>
              <View className="flex-row items-center gap-2 flex-wrap">
                <Ionicons
                  name={availability.sufficient ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={availability.sufficient ? '#16A34A' : '#DC2626'}
                />
                <Text className={`text-[13px] font-medium ${availability.sufficient ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {availability.sufficient ? 'Sufficient' : 'Insufficient'}
                </Text>
                <View className="flex-row items-center gap-1 ml-auto">
                  <Text className="text-[13px] text-[#64748B]">Available: </Text>
                  {hasFullWeightConfig ? (
                    <WeightDisplay
                      quantity={availability.available}
                      weightPerMeter={item.weightPerMeter}
                      lengthPerPiece={item.lengthPerPiece}
                      viewMode={viewMode}
                      unit={item.unit || 'Pcs'}
                    />
                  ) : (
                    <Text className="text-[13px] text-[#64748B]">
                      {availability.available} {displayUnit}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
