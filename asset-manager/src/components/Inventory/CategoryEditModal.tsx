/**
 * Category Edit Modal Component
 * 
 * Modal form for editing category name with validation.
 * Follows CIAMS design system.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category } from '../../types/inventory';

export interface CategoryEditModalProps {
  visible: boolean;
  category: Category | null;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function CategoryEditModal({
  visible,
  category,
  onSave,
  onCancel,
  isLoading = false,
  error = null,
}: CategoryEditModalProps) {
  const [name, setName] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset form when category changes or modal opens/closes
  useEffect(() => {
    if (visible && category) {
      setName(category.name);
      setLocalError(null);
    } else if (!visible) {
      setName('');
      setLocalError(null);
    }
  }, [visible, category]);

  const handleSave = async () => {
    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('Category name is required');
      return;
    }

    if (trimmedName.length > 50) {
      setLocalError('Category name must be 50 characters or less');
      return;
    }

    setLocalError(null);
    try {
      await onSave(trimmedName);
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const displayError = error || localError;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-[10px] w-full max-w-md">
          {/* Header */}
          <View className="p-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              Edit Category
            </Text>
            <TouchableOpacity
              onPress={onCancel}
              className="w-8 h-8 items-center justify-center"
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="p-4 gap-4">
            {/* Error Message */}
            {displayError && (
              <View className="p-3 rounded-lg bg-[#DC2626]/10 border-[1.5px] border-[#DC2626]">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="warning" size={20} color="#DC2626" />
                  <Text className="text-[13px] text-[#DC2626] flex-1">
                    {displayError}
                  </Text>
                </View>
              </View>
            )}

            {/* Category Name Input */}
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]">
                Category Name <Text className="text-[#DC2626]">*</Text>
              </Text>
              <TextInput
                className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
                placeholder="Enter category name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (localError) setLocalError(null);
                }}
                maxLength={50}
                editable={!isLoading}
                autoFocus
                accessibilityLabel="Category name"
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[50px] items-center justify-center"
                onPress={onCancel}
                disabled={isLoading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-[15px] font-semibold text-[#64748B]">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                onPress={handleSave}
                disabled={isLoading || !name.trim()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Save category"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-[15px] font-semibold text-white">
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
