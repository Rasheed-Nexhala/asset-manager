import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Units of measurement for construction and inventory management
 */
const COMMON_UNITS = [
  'Nos',
  'Bag',
  'Box',
  'Set',
  'Pair',
  'Roll',
  'Kg',
  'Ton (MT)',
  'Meter',
];

export interface UnitSelectorProps {
  /** Currently selected unit */
  selectedUnit?: string;
  /** Callback when a unit is selected */
  onSelect: (unit: string) => void;
  /** Optional label override (defaults to "Unit of Measurement") */
  label?: string;
  /** Optional error message to display */
  error?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * UnitSelector Component
 * Dropdown selector for unit of measurement with predefined common units
 */
export const UnitSelector: React.FC<UnitSelectorProps> = ({
  selectedUnit,
  onSelect,
  label = 'Unit of Measurement *',
  error,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const displayText = selectedUnit || 'Select unit';

  const hasError = Boolean(error);

  /**
   * Handle unit selection
   */
  const handleSelect = useCallback(
    (unit: string) => {
      onSelect(unit);
      setModalVisible(false);
    },
    [onSelect]
  );

  /**
   * Handle modal close
   */
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const labelEndsWithRequired = label.endsWith(' *');
  const labelText = labelEndsWithRequired ? label.slice(0, -2) : label;

  return (
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]" accessibilityRole="text">
        {labelEndsWithRequired ? (
          <>
            {labelText}
            <Text className="text-[#DC2626]"> *</Text>
          </>
        ) : (
          label
        )}
      </Text>

      <TouchableOpacity
        className={`border rounded-lg h-12 px-4 bg-white flex-row items-center justify-between ${
          hasError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
        } ${disabled ? 'opacity-50' : ''}`}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Select unit. Current: ${displayText}`}
      >
        <Text className={`text-[15px] ${selectedUnit ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>

      {error && (
        <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
        accessibilityLabel="Select unit of measurement"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-4">
            {/* Handle Bar */}
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

            <Text className="text-[22px] font-semibold text-[#0F172A] mb-4">
              Select Unit
            </Text>

            <ScrollView className="max-h-[400px]" showsVerticalScrollIndicator={false}>
              <View className="gap-2">
                {COMMON_UNITS.length === 0 ? (
                  <View className="py-8 items-center">
                    <Text className="text-[15px] text-[#64748B] text-center mb-4">
                      No units available
                    </Text>
                  </View>
                ) : (
                  COMMON_UNITS.map((unit) => {
                    const isSelected = selectedUnit?.toLowerCase() === unit.toLowerCase();

                    return (
                      <TouchableOpacity
                        key={unit}
                        className={`border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between ${
                          isSelected ? 'bg-[#1E40AF]/10 border-[#1E40AF]' : 'bg-white'
                        }`}
                        onPress={() => handleSelect(unit)}
                        activeOpacity={0.7}
                        accessibilityLabel={`Select unit: ${unit}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          className={`text-[15px] font-medium ${
                            isSelected ? 'text-[#1E40AF]' : 'text-[#0F172A]'
                          }`}
                        >
                          {unit}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={20} color="#1E40AF" />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center mt-4"
              onPress={handleCloseModal}
              activeOpacity={0.7}
              accessibilityLabel="Cancel unit selection"
              accessibilityRole="button"
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF]">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
