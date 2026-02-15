/**
 * Steel Master Selector Component
 * Dropdown to select a steel master when configuring weight-based items
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SteelMaster } from '../../types/steelMaster';

export interface SteelMasterSelectorProps {
  steelMasters: SteelMaster[];
  selectedSteelMaster: SteelMaster | null;
  onSelect: (master: SteelMaster | null) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  onManagePress?: () => void;
}

export const SteelMasterSelector: React.FC<SteelMasterSelectorProps> = ({
  steelMasters,
  selectedSteelMaster,
  onSelect,
  label = 'Link to Steel Master',
  error,
  disabled = false,
  onManagePress,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMasters = steelMasters.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.hsnCode || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback(
    (master: SteelMaster) => {
      onSelect(master);
      setModalVisible(false);
      setSearchQuery('');
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    setModalVisible(false);
    setSearchQuery('');
  }, [onSelect]);

  const displayText = selectedSteelMaster
    ? `${selectedSteelMaster.name} (${selectedSteelMaster.weightPerMeter} kg/m)`
    : 'Select steel master';

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-[15px] text-[#0F172A]">{label}</Text>
      ) : null}
      <TouchableOpacity
        className={`border rounded-lg h-12 px-4 bg-white flex-row items-center justify-between ${
          error ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
        } ${disabled ? 'opacity-50' : ''}`}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Select steel master. Current: ${displayText}`}
      >
        <Text
          className={`text-[15px] flex-1 ${
            selectedSteelMaster ? 'text-[#0F172A]' : 'text-[#94A3B8]'
          }`}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <View className="flex-row items-center gap-2">
          {selectedSteelMaster && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Clear selection"
            >
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </View>
      </TouchableOpacity>

      {onManagePress && (
        <TouchableOpacity
          className="flex-row items-center gap-2 py-2 px-2 min-h-[48px] justify-start"
          onPress={onManagePress}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Manage steel masters"
        >
          <Ionicons name="settings-outline" size={16} color="#1E40AF" />
          <Text className="text-[13px] text-[#1E40AF]">Manage Steel Masters</Text>
        </TouchableOpacity>
      )}

      {error && (
        <Text className="text-[13px] text-[#DC2626]">{error}</Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl max-h-[80%]">
            {/* Handle Bar */}
            <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-3" />
            
            <View className="p-4 border-b border-[#E2E8F0]">
              <Text className="text-[22px] font-semibold text-[#0F172A] mb-3">
                Select Steel Master
              </Text>
              <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
                <Ionicons name="search" size={20} color="#94A3B8" />
                <TextInput
                  className="flex-1 ml-3 text-[15px] text-[#0F172A]"
                  placeholder="Search by name or SKU..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  accessibilityLabel="Search steel masters"
                  accessibilityRole="search"
                />
              </View>
            </View>

            <ScrollView className="max-h-[400px] p-4" showsVerticalScrollIndicator={false}>
              {filteredMasters.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-6xl mb-4">🔍</Text>
                  <Text className="text-[15px] text-[#64748B] text-center">
                    No steel masters match your search
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {filteredMasters.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      className={`border rounded-[10px] p-4 min-h-[48px] ${
                        selectedSteelMaster?.id === m.id
                          ? 'bg-[#1E40AF]/10 border-[#1E40AF]'
                          : 'border-[#E2E8F0] bg-white'
                      }`}
                      onPress={() => handleSelect(m)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Select steel master ${m.name}`}
                    >
                      <Text className="text-[15px] font-semibold text-[#0F172A] mb-1">
                        {m.name}
                      </Text>
                      <Text className="text-[13px] text-[#64748B]">
                        {m.weightPerMeter} kg/m · Length: {m.defaultLength}m · SKU: {m.hsnCode || '-'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View className="p-4 border-t border-[#E2E8F0] gap-3">
              <TouchableOpacity
                className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                onPress={handleClear}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear selection"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Clear Selection
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-[#475569] rounded-[10px] h-[50px] items-center justify-center"
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Text className="text-[15px] font-semibold text-white">
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
