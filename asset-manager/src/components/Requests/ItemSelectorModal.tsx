import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectAllItems, selectItemsLoading } from '../../store/selectors/inventorySelectors';
import type { Item } from '../../types/inventory';

interface ItemSelectorModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (items: Item[]) => void;
  excludeItemIds?: string[];
}

export const ItemSelectorModal: React.FC<ItemSelectorModalProps> = ({
  isVisible,
  onClose,
  onSelect,
  excludeItemIds = [],
}) => {
  const allItems = useSelector(selectAllItems);
  const isLoading = useSelector(selectItemsLoading);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Safe array - Redux selector can return undefined during initialization
  const safeItems = Array.isArray(allItems) ? allItems : [];

  // Filter items with null-safe string operations
  const filteredItems = safeItems.filter((item) => {
    if (!item?.id) return false;
    if (excludeItemIds.includes(item.id)) return false;
    if (item.status !== 'active') return false;

    const searchLower = searchQuery?.toLowerCase?.() ?? '';
    const nameLower = (item.name ?? '').toLowerCase();
    const skuLower = (item.sku ?? '').toLowerCase();

    const matchesSearch =
      nameLower.includes(searchLower) || skuLower.includes(searchLower);

    return matchesSearch;
  });

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleConfirm = () => {
    const selected = safeItems.filter((item) => item?.id && selectedItems.has(item.id));
    onSelect(selected);
    setSelectedItems(new Set());
    setSearchQuery('');
    onClose();
  };

  const handleCancel = () => {
    setSelectedItems(new Set());
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl h-[80%]">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-2 mb-4" />

          {/* Header */}
          <View className="px-4 pb-3 border-b border-[#E2E8F0]">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[22px] font-semibold text-[#0F172A]">
                Select Items
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                className="w-9 h-9 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="relative">
              <View className="absolute left-3 top-0 h-12 items-center justify-center z-10">
                <Ionicons name="search" size={20} color="#64748B" />
              </View>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search items..."
                placeholderTextColor="#94A3B8"
                className="border border-[#E2E8F0] rounded-lg h-12 pl-10 pr-4 bg-white"
              />
            </View>
          </View>

          {/* Items List */}
          {isLoading && safeItems.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12 min-h-[200px]">
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading items...
              </Text>
            </View>
          ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item, index) => item?.id ?? `item-${index}`}
            renderItem={({ item }) => {
              const itemId = item?.id ?? '';
              const isSelected = selectedItems.has(itemId);

              return (
                <TouchableOpacity
                  onPress={() => itemId && toggleItem(itemId)}
                  className="px-4 py-3 border-b border-[#E2E8F0]"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    {/* Checkbox */}
                    <View
                      className={`w-6 h-6 rounded border-2 items-center justify-center ${
                        isSelected
                          ? 'bg-[#1E40AF] border-[#1E40AF]'
                          : 'bg-white border-[#E2E8F0]'
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>

                    {/* Image */}
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        className="w-12 h-12 rounded-lg"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-lg bg-[#F1F5F9] items-center justify-center">
                        <Ionicons name="cube-outline" size={24} color="#64748B" />
                      </View>
                    )}

                    {/* Item Info */}
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-[#0F172A]">
                        {item.name ?? 'Unnamed Item'}
                      </Text>
                      <Text className="text-[13px] text-[#64748B]">
                        {item.sku ?? '—'} • {item.categoryName ?? '—'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="cube-outline" size={80} color="#64748B" />
                <Text className="text-[15px] text-[#64748B] mt-4">
                  No items found
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 100 }}
          />
          )}

          {/* Footer */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-3">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                disabled={selectedItems.size === 0}
                style={{ opacity: selectedItems.size === 0 ? 0.5 : 1 }}
              >
                <Text className="text-[15px] font-semibold text-white">
                  Add {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
