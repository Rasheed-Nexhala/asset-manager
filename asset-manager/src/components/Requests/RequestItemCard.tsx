import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeightDisplay } from '../Inventory/WeightDisplay';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import {
  isWeightBasedItem,
  piecesToKg,
  formatWeight,
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
  const [quantity, setQuantity] = useState(item.quantityRequested);
  const isSteelItem = isWeightBasedItem({ weightPerMeter: item.weightPerMeter });

  useEffect(() => {
    setQuantity(item.quantityRequested);
  }, [item.quantityRequested]);

  const handleIncrement = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    onQuantityChange?.(item.itemId, newQty);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      onQuantityChange?.(item.itemId, newQty);
    }
  };

  const handleQuantityInput = (text: string) => {
    const num = parseInt(text, 10) || 0;
    if (num >= 0) {
      setQuantity(num);
      onQuantityChange?.(item.itemId, num);
    }
  };

  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      <View className="flex-row gap-3">
        {/* Image */}
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

        {/* Content */}
        <View className="flex-1">
          {/* Item Name */}
          <Text className="text-[15px] font-semibold text-[#0F172A] mb-1">
            {item.itemName}
          </Text>

          {/* SKU & Type */}
          <View className="flex-row items-center gap-2 mb-2">
            <Text className="text-[13px] text-[#64748B]">{item.itemSku}</Text>
            <View className="w-1 h-1 rounded-full bg-[#64748B]" />
            <Text className="text-[13px] text-[#64748B]">
              {item.itemType === 'consumable' ? 'Consumable' : 'Non-Consumable'}
            </Text>
          </View>

          {/* Quantity Control */}
          {mode === 'create' || mode === 'edit' ? (
            <View>
              <View className="flex-row items-center gap-3">
                <Text className="text-[13px] text-[#64748B]">Quantity:</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={handleDecrement}
                    className="w-8 h-8 border border-[#E2E8F0] rounded-full items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                  >
                    <Text className="text-[#1E40AF] text-lg">−</Text>
                  </TouchableOpacity>

                  <TextInput
                    value={String(quantity)}
                    onChangeText={handleQuantityInput}
                    keyboardType="numeric"
                    className="w-16 border border-[#E2E8F0] rounded-lg px-2 text-center text-[15px] font-bold text-[#0F172A] bg-white"
                    accessibilityLabel="Quantity input"
                    style={{
                      color: '#0F172A',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: 15,
                      minHeight: 44,
                      paddingTop: 10,
                      paddingBottom: 8,
                    }}
                    underlineColorAndroid="transparent"
                    selectionColor="#1E40AF"
                  />

                  <TouchableOpacity
                    onPress={handleIncrement}
                    className="w-8 h-8 border border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                  >
                    <Text className="text-white text-lg">+</Text>
                  </TouchableOpacity>
                </View>

                {onRemove && (
                  <TouchableOpacity
                    onPress={() => onRemove(item.itemId)}
                    className="ml-auto w-9 h-9 items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Remove item"
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
              {isSteelItem &&
                item.weightPerMeter != null &&
                item.lengthPerPiece != null &&
                quantity > 0 && (
                  <Text className="text-[13px] text-[#64748B] mt-1">
                    ≈ {formatWeight(piecesToKg(quantity, item.weightPerMeter, item.lengthPerPiece), 'Kg')}
                  </Text>
                )}
            </View>
          ) : (
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-[15px] text-[#0F172A]">Quantity: </Text>
              <WeightDisplay
                quantity={item.quantityRequested}
                weightPerMeter={item.weightPerMeter}
                lengthPerPiece={item.lengthPerPiece}
                viewMode={viewMode}
                unit="Pcs"
              />
            </View>
          )}

          {/* Availability Indicator (for Store Incharge) */}
          {availability && (
            <View className={`mt-2 p-2 rounded-lg ${availability.sufficient ? 'bg-[#16A34A]/10' : 'bg-[#DC2626]/10'}`}>
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
                  {isSteelItem && item.weightPerMeter != null && item.lengthPerPiece != null ? (
                    <WeightDisplay
                      quantity={availability.available}
                      weightPerMeter={item.weightPerMeter}
                      lengthPerPiece={item.lengthPerPiece}
                      viewMode={viewMode}
                      unit="Pcs"
                    />
                  ) : (
                    <Text className="text-[13px] text-[#64748B]">{availability.available}</Text>
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
