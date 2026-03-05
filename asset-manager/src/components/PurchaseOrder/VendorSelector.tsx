import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Vendor } from '../../types/vendor';

interface VendorSelectorProps {
  vendors: Vendor[];
  selectedVendorId: string | null;
  onSelect: (vendor: Vendor | null) => void;
  placeholder?: string;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const FILTER_ALL = 'all';

/**
 * Get the first character for filtering (A-Z or # for other)
 */
const getFilterKey = (name: string): string => {
  const first = (name || '').trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  return '#';
};

export const VendorSelector: React.FC<VendorSelectorProps> = ({
  vendors,
  selectedVendorId,
  onSelect,
  placeholder = 'Select Saved Vendor',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [letterFilter, setLetterFilter] = useState<string>(FILTER_ALL);

  const selectedVendor = selectedVendorId
    ? vendors.find((v) => v.id === selectedVendorId)
    : null;

  const filteredVendors = useMemo(() => {
    if (letterFilter === FILTER_ALL) return vendors;
    return vendors.filter((v) => getFilterKey(v.name) === letterFilter);
  }, [vendors, letterFilter]);

  const availableLetters = useMemo(() => {
    const used = new Set(vendors.map((v) => getFilterKey(v.name)));
    const result = [FILTER_ALL];
    LETTERS.forEach((l) => {
      if (used.has(l)) result.push(l);
    });
    if (used.has('#')) result.push('#');
    return result;
  }, [vendors]);

  const handleOpen = useCallback(() => {
    setLetterFilter(FILTER_ALL);
    setModalVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setModalVisible(false);
  }, []);

  const handleSelect = useCallback(
    (vendor: Vendor | null) => {
      onSelect(vendor);
      Keyboard.dismiss();
      setModalVisible(false);
    },
    [onSelect]
  );

  const handleBackdropPress = useCallback(() => {
    Keyboard.dismiss();
    setModalVisible(false);
  }, []);

  const renderVendorItem = useCallback(
    ({ item }: { item: Vendor }) => (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3 mx-4 active:opacity-70"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Select vendor ${item.name}`}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1 min-w-0">
            <Text
              className="text-[15px] font-semibold text-[#0F172A]"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="text-[13px] text-[#64748B] mt-0.5" numberOfLines={1}>
              {item.phone}
            </Text>
          </View>
          <View className="w-10 h-10 items-center justify-center ml-2">
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleSelect]
  );

  return (
    <View>
      <TouchableOpacity
        onPress={handleOpen}
        className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] flex-row items-center justify-between min-h-[56px] active:opacity-70"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        <View className="flex-1 min-w-0 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-[#F1F5F9] items-center justify-center">
            <Ionicons
              name="business-outline"
              size={20}
              color={selectedVendor ? '#1E40AF' : '#94A3B8'}
            />
          </View>
          <View className="flex-1 min-w-0">
            <Text
              className={`text-[15px] font-medium ${
                selectedVendor ? 'text-[#0F172A]' : 'text-[#94A3B8]'
              }`}
              numberOfLines={1}
            >
              {selectedVendor?.name ?? placeholder}
            </Text>
            {selectedVendor && (
              <Text className="text-[13px] text-[#64748B] mt-0.5" numberOfLines={1}>
                {selectedVendor.phone}
              </Text>
            )}
          </View>
        </View>
        <View className="w-10 h-10 items-center justify-center">
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </View>
      </TouchableOpacity>

      {selectedVendor && (
        <TouchableOpacity
          onPress={() => onSelect(null)}
          className="mt-2 flex-row items-center gap-2 py-2 min-h-[44px]"
          accessibilityLabel="Clear vendor selection"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle-outline" size={18} color="#1E40AF" />
          <Text className="text-[13px] font-medium text-[#1E40AF]">
            Clear selection
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-2xl max-h-[85%]">
                {/* Handle bar - CIAMS bottom sheet pattern */}
                <View className="pt-3 pb-2">
                  <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center" />
                </View>

                {/* Header */}
                <View className="px-4 pb-4 border-b border-[#E2E8F0]">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-[22px] font-semibold text-[#0F172A]">
                      Select Vendor
                    </Text>
                    <TouchableOpacity
                      onPress={handleClose}
                      className="w-12 h-12 items-center justify-center rounded-full bg-[#F1F5F9] active:opacity-70"
                      accessibilityLabel="Close"
                      accessibilityRole="button"
                    >
                      <Ionicons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* Letter filter chips - no keyboard needed */}
                  <View className="mt-4">
                    <Text className="text-[13px] text-[#64748B] mb-2">
                      Filter by name
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    >
                      {availableLetters.map((letter) => {
                        const isActive = letterFilter === letter;
                        return (
                          <TouchableOpacity
                            key={letter}
                            onPress={() => setLetterFilter(letter)}
                            className={`min-w-[44px] h-11 rounded-full items-center justify-center px-3 ${
                              isActive
                                ? 'bg-[#1E40AF]'
                                : 'bg-[#F1F5F9] border border-[#E2E8F0]'
                            }`}
                            accessibilityLabel={`Filter by ${letter === FILTER_ALL ? 'all' : letter}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                          >
                            <Text
                              className={`text-[14px] font-medium ${
                                isActive ? 'text-white' : 'text-[#64748B]'
                              }`}
                            >
                              {letter === FILTER_ALL ? 'All' : letter}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Vendor list */}
                <FlatList
                  data={filteredVendors}
                  keyExtractor={(item) => item.id}
                  renderItem={renderVendorItem}
                  contentContainerStyle={{ paddingVertical: 16, paddingBottom: 40 }}
                  ListEmptyComponent={
                    <View className="px-4 py-12 items-center">
                      <View className="w-16 h-16 rounded-full bg-[#F1F5F9] items-center justify-center mb-4">
                        <Ionicons
                          name="business-outline"
                          size={32}
                          color="#94A3B8"
                        />
                      </View>
                      <Text className="text-[17px] font-semibold text-[#0F172A] text-center mb-2">
                        No vendors found
                      </Text>
                      <Text className="text-[15px] text-[#64748B] text-center">
                        {letterFilter === FILTER_ALL
                          ? 'Add vendors to reuse them in purchase orders.'
                          : `No vendors starting with "${letterFilter}".`}
                      </Text>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};
