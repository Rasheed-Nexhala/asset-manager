import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Vendor } from '../../types/vendor';

interface VendorSelectorProps {
  vendors: Vendor[];
  selectedVendorId: string | null;
  onSelect: (vendor: Vendor | null) => void;
  placeholder?: string;
}

export const VendorSelector: React.FC<VendorSelectorProps> = ({
  vendors,
  selectedVendorId,
  onSelect,
  placeholder = 'Select Saved Vendor',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedVendor = selectedVendorId
    ? vendors.find((v) => v.id === selectedVendorId)
    : null;

  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.phone ?? '').toLowerCase().includes(q)
    );
  });

  const handleSelect = (vendor: Vendor | null) => {
    onSelect(vendor);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between bg-white"
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        <Text
          className={`flex-1 ${selectedVendor ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}
          numberOfLines={1}
        >
          {selectedVendor?.name ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>
      {selectedVendor && (
        <TouchableOpacity
          onPress={() => onSelect(null)}
          className="mt-2"
          accessibilityLabel="Clear selection"
        >
          <Text className="text-[13px] text-[#1E40AF]">Clear selection</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="w-full"
            keyboardVerticalOffset={0}
          >
            <View className="bg-white rounded-t-2xl max-h-[80%]">
              <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-2 mb-4" />
              <View className="px-4 pb-3 border-b border-[#E2E8F0]">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[22px] font-semibold text-[#0F172A]">
                    Select Vendor
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    className="w-9 h-9 items-center justify-center"
                  >
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View className="relative">
                  <View className="absolute left-3 top-0 h-12 items-center justify-center z-10">
                    <Ionicons name="search" size={20} color="#64748B" />
                  </View>
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search vendors..."
                    placeholderTextColor="#94A3B8"
                    className="border border-[#E2E8F0] rounded-lg h-12 pl-10 pr-4 bg-white"
                  />
                </View>
              </View>
              <FlatList
                data={filteredVendors}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelect(item)}
                    className="px-4 py-3 border-b border-[#E2E8F0]"
                  >
                    <Text className="text-[15px] font-medium text-[#0F172A]">
                      {item.name}
                    </Text>
                    <Text className="text-[13px] text-[#64748B]">{item.phone}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="p-4 items-center">
                    <Text className="text-[15px] text-[#64748B]">
                      No vendors found
                    </Text>
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};
