import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IssueType, IssueTypeConfig } from '../../types/maintenance';

interface IssueTypeSelectorProps {
  value: IssueType | null;
  onSelect: (issueType: IssueType) => void;
  error?: string;
  disabled?: boolean;
}

// Issue type configurations
const issueTypes: IssueTypeConfig[] = [
  {
    value: 'motor_electrical',
    label: 'Motor/Electrical',
    description: 'Motor malfunctions, electrical issues',
  },
  {
    value: 'physical_damage',
    label: 'Physical Damage',
    description: 'Broken parts, cracks, dents',
  },
  {
    value: 'wear_and_tear',
    label: 'Wear and Tear',
    description: 'Normal usage degradation',
  },
  {
    value: 'missing_parts',
    label: 'Missing Parts',
    description: 'Components missing or lost',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other issues',
  },
];

export default function IssueTypeSelector({
  value,
  onSelect,
  error,
  disabled = false,
}: IssueTypeSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  
  const selectedConfig = issueTypes.find((type) => type.value === value);
  const displayText = selectedConfig?.label || 'Select Issue Type';
  const hasError = Boolean(error);
  
  const handleSelect = (issueType: IssueType) => {
    onSelect(issueType);
    setModalVisible(false);
  };
  
  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        className={`border rounded-lg h-12 px-4 bg-white flex-row items-center justify-between ${
          hasError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
        } ${disabled ? 'opacity-50' : ''}`}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        accessibilityLabel="Issue type selector"
        accessibilityHint="Select the type of issue"
        accessibilityRole="button"
      >
        <Text
          className={`text-[15px] ${
            value ? 'text-[#0F172A]' : 'text-[#94A3B8]'
          }`}
        >
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>
      
      {/* Error Message */}
      {hasError && (
        <Text className="text-[13px] text-[#DC2626] mt-1">{error}</Text>
      )}
      
      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setModalVisible(false)}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
        >
          <Pressable 
            className="bg-white rounded-t-2xl" 
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center my-2" />
            
            {/* Header */}
            <View className="px-4 py-3 border-b border-[#E2E8F0]">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                Select Issue Type
              </Text>
            </View>
            
            {/* List */}
            <FlatList
              data={issueTypes}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="px-4 py-4 border-b border-[#E2E8F0]"
                  onPress={() => handleSelect(item.value)}
                  accessibilityLabel={`Select ${item.label}`}
                  accessibilityRole="button"
                  style={{ minHeight: 48 }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[15px] font-medium text-[#0F172A] mb-1">
                        {item.label}
                      </Text>
                      {item.description && (
                        <Text className="text-[13px] text-[#64748B]">
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {value === item.value && (
                      <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
            
            {/* Cancel Button */}
            <TouchableOpacity
              className="px-4 py-4 border-t border-[#E2E8F0]"
              onPress={() => setModalVisible(false)}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              style={{ minHeight: 48 }}
            >
              <Text className="text-[15px] font-semibold text-[#DC2626] text-center">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
