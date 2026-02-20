import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type {
  ActivityLogFiltersStore,
  ActivityLogFiltersUI,
  ActionCategory,
} from '../../types/activityLog';
import { filtersToStore, filtersToUI } from '../../utils/dateSerialization';
import { ACTION_CATEGORY_CONFIG } from '../../constants/activityLogConfig';

interface ActivityLogFilterModalProps {
  visible: boolean;
  filters: ActivityLogFiltersStore;
  onClose: () => void;
  onApply: (filters: ActivityLogFiltersStore) => void;
}

const INITIAL_FILTERS_UI: ActivityLogFiltersUI = {
  startDate: null,
  endDate: null,
  userId: null,
  actionCategory: 'all',
  actionType: 'all',
  searchQuery: '',
};

export default function ActivityLogFilterModal({
  visible,
  filters,
  onClose,
  onApply,
}: ActivityLogFilterModalProps) {
  const [localFilters, setLocalFilters] =
    useState<ActivityLogFiltersUI>(filtersToUI(filters));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Sync local filters when modal opens or filters prop changes
  useEffect(() => {
    if (visible) {
      setLocalFilters(filtersToUI(filters));
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApply(filtersToStore(localFilters));
    onClose();
  };

  const handleClear = () => {
    setLocalFilters(INITIAL_FILTERS_UI);
  };

  const handleStartDateChange = (
    _event: unknown,
    selectedDate?: Date
  ) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLocalFilters({ ...localFilters, startDate: selectedDate });
    }
  };

  const handleEndDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLocalFilters({ ...localFilters, endDate: selectedDate });
    }
  };

  const categories = Object.keys(
    ACTION_CATEGORY_CONFIG
  ) as ActionCategory[];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl p-4 h-[90%]">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mb-4" />

          {/* Header */}
          <View className="pb-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
            <Text className="text-[22px] font-semibold text-[#0F172A]">
              Filter Logs
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center"
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1 min-h-0 py-4"
            showsVerticalScrollIndicator={false}
          >
            {/* Date Range */}
            <View className="gap-4 mb-6">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Date Range
              </Text>

              <View className="flex-row gap-4">
                {/* Start Date */}
                <View className="flex-1 gap-1.5">
                  <Text className="text-[15px] text-[#0F172A]">From</Text>
                  <TouchableOpacity
                    className="border border-[#E2E8F0] rounded-lg h-12 px-4 justify-center bg-white min-h-[48px]"
                    onPress={() => setShowStartDatePicker(true)}
                    accessibilityLabel="Select start date"
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <Text className="text-[15px] text-[#0F172A]">
                      {localFilters.startDate
                        ? localFilters.startDate.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* End Date */}
                <View className="flex-1 gap-1.5">
                  <Text className="text-[15px] text-[#0F172A]">To</Text>
                  <TouchableOpacity
                    className="border border-[#E2E8F0] rounded-lg h-12 px-4 justify-center bg-white min-h-[48px]"
                    onPress={() => setShowEndDatePicker(true)}
                    accessibilityLabel="Select end date"
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <Text className="text-[15px] text-[#0F172A]">
                      {localFilters.endDate
                        ? localFilters.endDate.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Action Category */}
            <View className="gap-4">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Category
              </Text>

              <View className="flex-row flex-wrap gap-2 mb-6">
                <TouchableOpacity
                  className={`px-4 py-3 rounded-full border min-h-[48px] justify-center items-center ${
                    localFilters.actionCategory === 'all'
                      ? 'bg-[#1E40AF] border-[#1E40AF]'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, actionCategory: 'all' })
                  }
                  accessibilityLabel="All categories"
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-[13px] font-medium ${
                      localFilters.actionCategory === 'all'
                        ? 'text-white'
                        : 'text-[#64748B]'
                    }`}
                  >
                    All
                  </Text>
                </TouchableOpacity>

                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    className={`px-4 py-3 rounded-full border min-h-[48px] justify-center items-center ${
                      localFilters.actionCategory === category
                        ? 'bg-[#1E40AF] border-[#1E40AF]'
                        : 'bg-white border-[#E2E8F0]'
                    }`}
                    onPress={() =>
                      setLocalFilters({
                        ...localFilters,
                        actionCategory: category,
                      })
                    }
                    accessibilityLabel={ACTION_CATEGORY_CONFIG[category].label}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-[13px] font-medium ${
                        localFilters.actionCategory === category
                          ? 'text-white'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {ACTION_CATEGORY_CONFIG[category].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions - Clear (secondary), Apply (primary) */}
          <View className="pt-4 border-t border-[#E2E8F0] flex-row gap-3">
            <TouchableOpacity
              className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center bg-white"
              onPress={handleClear}
              accessibilityLabel="Clear filters"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF]">
                Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              onPress={handleApply}
              accessibilityLabel="Apply filters"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text className="text-[15px] font-semibold text-white">
                Apply
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DateTimePicker
              value={localFilters.startDate ?? new Date()}
              mode="date"
              display="default"
              onChange={handleStartDateChange}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={localFilters.endDate ?? new Date()}
              mode="date"
              display="default"
              onChange={handleEndDateChange}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
