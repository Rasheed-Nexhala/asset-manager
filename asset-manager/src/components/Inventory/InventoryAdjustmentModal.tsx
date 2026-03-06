/**
 * Inventory Adjustment Modal
 * Supports Add, Reduce, and Enter (Set) stock modes for central store.
 * Replaces StockEntryModal for ItemDetailScreen when Admin or Store Incharge with access.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  isWeightBasedItem,
  kgToPieces,
  piecesToKg,
  getConversionErrorMessage,
  tonToKg,
} from '../../utils/weightConversionUtils';
import type { Item } from '../../types/inventory';
import type { AdjustmentData, AdjustmentType } from '../../types/inventory';
import { getLocationId } from '../../utils/locationUtils';

const REASON_OPTIONS = [
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Return', label: 'Return' },
  { value: 'Correction', label: 'Correction' },
  { value: 'Other', label: 'Other' },
];

export interface InventoryAdjustmentModalProps {
  visible: boolean;
  mode: AdjustmentType;
  item: Item | null;
  onSubmit: (data: AdjustmentData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const MODE_LABELS: Record<AdjustmentType, string> = {
  add: 'Add Stock',
  remove: 'Reduce Stock',
  set: 'Enter Stock',
};

export const InventoryAdjustmentModal: React.FC<InventoryAdjustmentModalProps> = ({
  visible,
  mode,
  item,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [entryMode, setEntryMode] = useState<'kg' | 'ton' | 'pieces'>('pieces');
  const [amount, setAmount] = useState('');
  const [lengthPerPiece, setLengthPerPiece] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isWeightBased = item ? isWeightBasedItem(item) : false;
  const weightPerMeter = item?.weightPerMeter ?? 0;
  const defaultLength = item?.lengthPerPiece ?? 6;
  const effectiveLength = lengthPerPiece ? parseFloat(lengthPerPiece) : defaultLength;
  const currentQuantity = item?.centralStoreQuantity ?? item?.totalQuantity ?? 0;

  const conversionResult = useMemo(() => {
    if (!isWeightBased || !amount.trim()) return null;
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return null;
    if (mode === 'remove' && num === 0) return null;
    if (mode === 'add' && num <= 0) return null;
    if (entryMode === 'kg') {
      return kgToPieces(num, weightPerMeter, effectiveLength);
    }
    if (entryMode === 'ton') {
      const kg = tonToKg(num);
      return kgToPieces(kg, weightPerMeter, effectiveLength);
    }
    const kg = piecesToKg(num, weightPerMeter, effectiveLength);
    return {
      isExact: true,
      pieces: num,
      actualKg: kg,
      weightPerPiece: weightPerMeter * effectiveLength,
    };
  }, [isWeightBased, amount, entryMode, weightPerMeter, effectiveLength, mode]);

  const resetForm = useCallback(() => {
    setEntryMode('pieces');
    setAmount('');
    setLengthPerPiece('');
    setReason('');
    setNotes('');
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const num = parseFloat(amount);

    if (mode === 'add') {
      if (!amount.trim() || isNaN(num) || num <= 0) {
        newErrors.amount = 'Please enter a valid positive amount';
      }
    } else if (mode === 'remove') {
      if (!amount.trim() || isNaN(num) || num <= 0) {
        newErrors.amount = 'Please enter a valid positive amount to reduce';
      } else {
        const piecesToRemove =
          isWeightBased && (entryMode === 'kg' || entryMode === 'ton') && conversionResult
            ? conversionResult.pieces
            : num;
        if (piecesToRemove > currentQuantity) {
          newErrors.amount = `Cannot reduce more than current stock (${currentQuantity})`;
        }
      }
    } else {
      if (!amount.trim() || isNaN(num) || num < 0) {
        newErrors.amount = 'Please enter a valid target quantity (0 or more)';
      }
    }

    if (
      isWeightBased &&
      (entryMode === 'kg' || entryMode === 'ton') &&
      conversionResult &&
      !conversionResult.isExact &&
      mode !== 'remove'
    ) {
      const weightInKg = entryMode === 'ton' ? tonToKg(num) : num;
      newErrors.amount = getConversionErrorMessage(
        weightInKg,
        weightPerMeter,
        effectiveLength
      );
    }

    if (!reason.trim()) newErrors.reason = 'Reason is required';
    if (!notes.trim()) newErrors.notes = 'Notes are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    amount,
    reason,
    notes,
    isWeightBased,
    entryMode,
    conversionResult,
    weightPerMeter,
    effectiveLength,
    mode,
    currentQuantity,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!item) return;
    if (!validate()) return;

    const num = parseFloat(amount);
    let quantity: number;
    if (isWeightBased && (entryMode === 'kg' || entryMode === 'ton')) {
      if (!conversionResult?.pieces) {
        setErrors((e) => ({ ...e, submit: 'Invalid weight conversion' }));
        return;
      }
      quantity = conversionResult.pieces;
    } else {
      quantity = num;
    }

    const adjData: AdjustmentData = {
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      locationId: getLocationId('store'),
      locationType: 'store',
      locationName: 'Central Store',
      type: mode,
      quantity,
      reason: reason.trim(),
      notes: notes.trim(),
    };

    if (isWeightBased) {
      adjData.entryMode = entryMode;
      adjData.enteredValue = num;
      adjData.lengthPerPiece = effectiveLength;
    }

    try {
      await onSubmit(adjData);
      resetForm();
      onCancel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to adjust stock';
      setErrors((e) => ({ ...e, submit: msg }));
    }
  }, [
    item,
    amount,
    reason,
    notes,
    entryMode,
    conversionResult,
    effectiveLength,
    isWeightBased,
    mode,
    validate,
    onSubmit,
    onCancel,
    resetForm,
  ]);

  const handleClose = useCallback(() => {
    resetForm();
    onCancel();
  }, [resetForm, onCancel]);

  if (!visible) return null;

  const amountLabel =
    mode === 'set'
      ? `Target Quantity (${item?.unit || 'units'}) *`
      : isWeightBased
        ? entryMode === 'kg'
          ? 'Weight (Kg) *'
          : entryMode === 'ton'
            ? 'Weight (Ton) *'
            : 'Number of Pieces *'
        : `Quantity (${item?.unit || 'units'}) *`;

  const amountPlaceholder =
    mode === 'set'
      ? `Enter target (current: ${currentQuantity})`
      : mode === 'remove'
        ? `Max: ${currentQuantity}`
        : 'Enter amount';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[90%]">
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-3" />

          <View className="p-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
            <Text className="text-[22px] font-semibold text-[#0F172A]">
              {MODE_LABELS[mode]}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center"
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {item && (
            <View className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                {item.name}
              </Text>
              <Text className="text-[13px] text-[#64748B]">SKU: {item.sku}</Text>
              {mode !== 'add' && (
                <Text className="text-[13px] text-[#64748B] mt-1">
                  Current stock: {currentQuantity} {item.unit}
                </Text>
              )}
            </View>
          )}

          <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              {isWeightBased && (
                <>
                  <View className="gap-1.5">
                    <Text className="text-[15px] text-[#0F172A]">
                      Entry Mode <Text className="text-[#DC2626]">*</Text>
                    </Text>
                    <View className="flex-row gap-3">
                      {(['pieces', 'kg', 'ton'] as const).map((m) => (
                        <TouchableOpacity
                          key={m}
                          className={`flex-1 h-12 rounded-lg border items-center justify-center ${
                            entryMode === m
                              ? 'bg-[#1E40AF] border-[#1E40AF]'
                              : 'bg-white border-[#E2E8F0]'
                          }`}
                          onPress={() => {
                            setEntryMode(m);
                            setErrors((e) => ({ ...e, amount: '' }));
                          }}
                          disabled={loading}
                          activeOpacity={0.7}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: entryMode === m }}
                          accessibilityLabel={`${m} entry mode`}
                        >
                          <Text
                            className={`text-[15px] font-semibold ${
                              entryMode === m ? 'text-white' : 'text-[#0F172A]'
                            }`}
                          >
                            {m === 'pieces' ? 'Pcs' : m === 'kg' ? 'Kg' : 'Ton'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View className="gap-1.5">
                    <Text className="text-[15px] text-[#0F172A]">
                      Length per Piece (m)
                    </Text>
                    <TextInput
                      className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
                      placeholder={`Default: ${defaultLength}m`}
                      placeholderTextColor="#94A3B8"
                      value={lengthPerPiece}
                      onChangeText={setLengthPerPiece}
                      keyboardType="decimal-pad"
                      editable={!loading}
                      accessibilityLabel="Length per piece input"
                    />
                  </View>
                </>
              )}

              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">{amountLabel}</Text>
                <TextInput
                  className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                    errors.amount ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                  }`}
                  placeholder={amountPlaceholder}
                  placeholderTextColor="#94A3B8"
                  value={amount}
                  onChangeText={(t) => {
                    setAmount(t);
                    setErrors((e) => ({ ...e, amount: '' }));
                  }}
                  keyboardType="decimal-pad"
                  editable={!loading}
                  accessibilityLabel="Amount input"
                />
                {conversionResult && (mode === 'add' || mode === 'set') && (
                  <View className="flex-row items-center gap-2 mt-1">
                    {conversionResult.isExact ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#16A34A"
                      />
                    ) : (
                      <Ionicons name="alert-circle" size={20} color="#DC2626" />
                    )}
                    <Text
                      className={`text-[13px] ${
                        conversionResult.isExact
                          ? 'text-[#16A34A]'
                          : 'text-[#DC2626]'
                      }`}
                    >
                      {(entryMode === 'kg' || entryMode === 'ton')
                        ? `= ${conversionResult.pieces.toFixed(2)} pieces`
                        : `= ${conversionResult.actualKg.toFixed(2)} kg`}
                    </Text>
                  </View>
                )}
                {errors.amount && (
                  <Text
                    className="text-[13px] text-[#DC2626]"
                    accessibilityLiveRegion="polite"
                  >
                    {errors.amount}
                  </Text>
                )}
              </View>

              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">
                  Reason <Text className="text-[#DC2626]">*</Text>
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {REASON_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      className={`px-4 py-2.5 rounded-full border min-h-[48px] items-center justify-center ${
                        reason === opt.value
                          ? 'bg-[#1E40AF] border-[#1E40AF]'
                          : 'bg-white border-[#E2E8F0]'
                      }`}
                      onPress={() => {
                        setReason(opt.value);
                        setErrors((e) => ({ ...e, reason: '' }));
                      }}
                      disabled={loading}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: reason === opt.value }}
                      accessibilityLabel={`Reason: ${opt.label}`}
                    >
                      <Text
                        className={`text-[13px] font-medium ${
                          reason === opt.value ? 'text-white' : 'text-[#0F172A]'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.reason && (
                  <Text
                    className="text-[13px] text-[#DC2626]"
                    accessibilityLiveRegion="polite"
                  >
                    {errors.reason}
                  </Text>
                )}
              </View>

              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">
                  Notes <Text className="text-[#DC2626]">*</Text>
                </Text>
                <TextInput
                  className={`border rounded-lg min-h-[80px] px-4 py-3 bg-white text-[15px] text-[#0F172A] ${
                    errors.notes ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                  }`}
                  placeholder="e.g. Invoice #1407, delivery reference, etc."
                  placeholderTextColor="#94A3B8"
                  value={notes}
                  onChangeText={(t) => {
                    setNotes(t);
                    setErrors((e) => ({ ...e, notes: '' }));
                  }}
                  multiline
                  textAlignVertical="top"
                  editable={!loading}
                  accessibilityLabel="Notes input"
                />
                {errors.notes && (
                  <Text
                    className="text-[13px] text-[#DC2626]"
                    accessibilityLiveRegion="polite"
                  >
                    {errors.notes}
                  </Text>
                )}
              </View>

              {errors.submit && (
                <View className="bg-[#DC2626]/15 rounded-[10px] p-3 flex-row items-center gap-2">
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text className="text-[13px] text-[#DC2626] flex-1">
                    {errors.submit}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                className={`rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 mt-2 ${
                  loading ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
                }`}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  loading ? 'Submitting, please wait' : MODE_LABELS[mode]
                }
                accessibilityState={{ disabled: loading, busy: loading }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">
                      Please wait…
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name={
                        mode === 'add'
                          ? 'add-circle'
                          : mode === 'remove'
                            ? 'remove-circle'
                            : 'create-outline'
                      }
                      size={22}
                      color="#FFFFFF"
                    />
                    <Text className="text-[15px] font-semibold text-white">
                      {MODE_LABELS[mode]}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                onPress={handleClose}
                disabled={loading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
