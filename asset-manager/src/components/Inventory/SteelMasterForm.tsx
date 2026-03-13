/**
 * Custom Item Form Component
 * Form for adding/editing custom item specifications
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SteelMaster, CreateSteelMasterData, UpdateSteelMasterData } from '../../types/steelMaster';

export interface SteelMasterFormProps {
  /** When false (modal mode), form is hidden when visible=false. When true (screen mode), form always renders. */
  visible?: boolean;
  mode: 'create' | 'edit';
  initialData?: SteelMaster | null;
  onSubmit: (data: CreateSteelMasterData | UpdateSteelMasterData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  /** When true, renders as screen content (no Modal). Used by AddEditCustomItemScreen. */
  asScreen?: boolean;
}

export const SteelMasterForm: React.FC<SteelMasterFormProps> = ({
  visible = true,
  mode,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  error = null,
  asScreen = false,
}) => {
  const [name, setName] = useState('');
  const [weightPerMeter, setWeightPerMeter] = useState('');
  const [defaultLength, setDefaultLength] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const defaultLengthRef = useRef<TextInput>(null);
  const weightPerMeterRef = useRef<TextInput>(null);
  const hsnCodeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible || asScreen) {
      if (mode === 'edit' && initialData) {
        setName(initialData.name);
        setWeightPerMeter(initialData.weightPerMeter.toString());
        setDefaultLength(initialData.defaultLength.toString());
        setHsnCode(initialData.hsnCode || '');
      } else {
        setName('');
        setWeightPerMeter('');
        setDefaultLength('');
        setHsnCode('');
      }
      setErrors({});
    }
  }, [visible, asScreen, mode, initialData]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Item name is required';
    const wpm = parseFloat(weightPerMeter);
    if (!weightPerMeter.trim() || isNaN(wpm) || wpm <= 0) {
      newErrors.weightPerMeter = 'Weight per meter must be a positive number';
    }
    const defLen = parseFloat(defaultLength);
    if (!defaultLength.trim() || isNaN(defLen) || defLen <= 0) {
      newErrors.defaultLength = 'Default length is required';
    }
    if (!hsnCode.trim()) newErrors.hsnCode = 'SKU is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, weightPerMeter, defaultLength, hsnCode]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const wpm = parseFloat(weightPerMeter);
    const defLen = parseFloat(defaultLength);

    if (mode === 'create') {
      await onSubmit({
        name: name.trim(),
        weightPerMeter: wpm,
        defaultLength: defLen,
        hsnCode: hsnCode.trim(),
      });
    } else if (initialData) {
      await onSubmit({
        name: name.trim(),
        weightPerMeter: wpm,
        defaultLength: defLen,
        hsnCode: hsnCode.trim(),
      });
    }
  }, [
    mode,
    initialData,
    name,
    weightPerMeter,
    defaultLength,
    hsnCode,
    validate,
    onSubmit,
  ]);

  if (!visible && !asScreen) return null;

  const formContent = (
    <ScrollView className="p-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View className="gap-4">
              {/* Name */}
              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">Custom Item Name <Text className="text-[#DC2626]">*</Text></Text>
                <TextInput
                  className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                    errors.name ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                  }`}
                  placeholder="e.g. Custom Item Name"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (errors.name) setErrors((e) => ({ ...e, name: '' }));
                  }}
                  editable={!loading}
                  accessibilityLabel="Custom item name input"
                />
                {errors.name && (
                  <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                    {errors.name}
                  </Text>
                )}
              </View>

              {/* Default Length */}
              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">
                  Default Length (m) <Text className="text-[#DC2626]">*</Text>
                </Text>
                <TextInput
                  ref={defaultLengthRef}
                  className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                    errors.defaultLength ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                  }`}
                  placeholder="e.g. 6"
                  placeholderTextColor="#94A3B8"
                  value={defaultLength}
                  onChangeText={(t) => {
                    setDefaultLength(t);
                    if (errors.defaultLength)
                      setErrors((e) => ({ ...e, defaultLength: '' }));
                  }}
                  keyboardType="decimal-pad"
                  editable={!loading}
                  accessibilityLabel="Default length input"
                />
                {errors.defaultLength && (
                  <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                    {errors.defaultLength}
                  </Text>
                )}
              </View>

              {/* Weight per Meter */}
              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">
                  Weight per Meter (kg/m) <Text className="text-[#DC2626]">*</Text>
                </Text>
                <TextInput
                  ref={weightPerMeterRef}
                  className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                    errors.weightPerMeter ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                  }`}
                  placeholder="e.g. 5.4"
                  placeholderTextColor="#94A3B8"
                  value={weightPerMeter}
                  onChangeText={(t) => {
                    setWeightPerMeter(t);
                    if (errors.weightPerMeter)
                      setErrors((e) => ({ ...e, weightPerMeter: '' }));
                  }}
                  keyboardType="decimal-pad"
                  editable={!loading}
                  accessibilityLabel="Weight per meter input"
                />
                {errors.weightPerMeter && (
                  <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                    {errors.weightPerMeter}
                  </Text>
                )}
              </View>

              {/* SKU */}
              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">
                  SKU <Text className="text-[#DC2626]">*</Text>
                </Text>
                <TextInput
                  ref={hsnCodeRef}
                  className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                    errors.hsnCode ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                  }`}
                  placeholder="Enter SKU code"
                  placeholderTextColor="#94A3B8"
                  value={hsnCode}
                  onChangeText={(t) => {
                    setHsnCode(t);
                    if (errors.hsnCode) setErrors((e) => ({ ...e, hsnCode: '' }));
                  }}
                  editable={!loading}
                  accessibilityLabel="SKU input"
                />
                {errors.hsnCode && (
                  <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                    {errors.hsnCode}
                  </Text>
                )}
              </View>

              {error && (
                <View className="bg-[#DC2626]/15 rounded-[10px] p-3 flex-row items-center gap-2">
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text className="text-[13px] text-[#DC2626] flex-1">
                    {error}
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                className={`rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 ${
                  loading ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
                }`}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={loading ? 'Saving, please wait' : mode === 'create' ? 'Add Custom Item' : 'Save changes'}
                accessibilityState={{ disabled: loading, busy: loading }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">
                      {mode === 'create' ? 'Add Custom Item' : 'Save Changes'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                onPress={onCancel}
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
  );

  if (asScreen) {
    return (
      <View className="flex-1">
        {formContent}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[90%]">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-3" />
          <View className="p-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
            <Text className="text-[22px] font-semibold text-[#0F172A]">
              {mode === 'create' ? 'Add Custom Item' : 'Edit Custom Item'}
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center"
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          {formContent}
        </View>
      </View>
    </Modal>
  );
};
