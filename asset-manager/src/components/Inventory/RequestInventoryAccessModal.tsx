/**
 * Request Inventory Access Modal
 *
 * Store Incharge requests Admin approval to update central store inventory.
 * Fields: reason (required), notes (optional).
 * Uses CIAMS design system styling.
 */

import React, { useState, useCallback } from 'react';
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

const DEFAULT_REASON_OPTIONS = [
  { value: 'Physical count variation', label: 'Physical count variation' },
  { value: 'Stock discrepancy', label: 'Stock discrepancy' },
  { value: 'Other', label: 'Other' },
];

export interface RequestInventoryAccessSubmitData {
  reason: string;
  notes?: string;
}

export interface RequestInventoryAccessModalProps {
  visible: boolean;
  onSubmit: (data: RequestInventoryAccessSubmitData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
  reasonOptions?: { value: string; label: string }[];
}

export const RequestInventoryAccessModal: React.FC<RequestInventoryAccessModalProps> = ({
  visible,
  onSubmit,
  onCancel,
  loading = false,
  title = 'Request Inventory Access',
  description = 'You need Admin approval to update central store inventory. Submit a request with a reason.',
  reasonOptions = DEFAULT_REASON_OPTIONS,
}) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setReason('');
    setNotes('');
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!reason.trim()) newErrors.reason = 'Reason is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [reason]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      await onSubmit({ reason: reason.trim(), notes: notes.trim() || undefined });
      resetForm();
      onCancel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit request';
      setErrors((e) => ({ ...e, submit: msg }));
    }
  }, [reason, notes, validate, onSubmit, onCancel, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onCancel();
  }, [resetForm, onCancel]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[90%]">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-3" />

          <View className="p-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
            <Text className="text-[22px] font-semibold text-[#0F172A]">{title}</Text>
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

          <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <Text className="text-[15px] text-[#64748B]">{description}</Text>

              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">
                  Reason <Text className="text-[#DC2626]">*</Text>
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {reasonOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      className={`px-4 py-2.5 rounded-full border min-h-[48px] items-center justify-center ${
                        reason === opt.value ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-white border-[#E2E8F0]'
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
                  <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                    {errors.reason}
                  </Text>
                )}
              </View>

              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">Notes (optional)</Text>
                <TextInput
                  className="border border-[#E2E8F0] rounded-lg min-h-[80px] px-4 py-3 bg-white text-[15px] text-[#0F172A]"
                  placeholder="Additional context for your request..."
                  placeholderTextColor="#94A3B8"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  textAlignVertical="top"
                  editable={!loading}
                  accessibilityLabel="Notes input"
                />
              </View>

              {errors.submit && (
                <View className="bg-[#DC2626]/15 rounded-[10px] p-3 flex-row items-center gap-2">
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text className="text-[13px] text-[#DC2626] flex-1">{errors.submit}</Text>
                </View>
              )}

              <TouchableOpacity
                className={`rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 ${
                  loading ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
                }`}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={loading ? 'Submitting, please wait' : 'Submit Request'}
                accessibilityState={{ disabled: loading, busy: loading }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={22} color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">Submit Request</Text>
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
                <Text className="text-[15px] font-semibold text-[#1E40AF]">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
