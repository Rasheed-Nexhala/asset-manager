import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store/hooks';
import { selectAllItems, selectItemsLoading } from '../../store/selectors/inventorySelectors';
import { Item } from '../../types/inventory';

interface ItemSelectorForMaintenanceProps {
  onSelect: (item: Item) => void;
  selectedItemId?: string;
  excludeItemIds?: string[];
}

export default function ItemSelectorForMaintenance({
  onSelect,
  selectedItemId,
  excludeItemIds = [],
}: ItemSelectorForMaintenanceProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const allItems = useAppSelector(selectAllItems);
  const isLoading = useAppSelector(selectItemsLoading);
  
  // Filter to non-consumable items with central store quantity > 0
  const availableItems = useMemo(() => {
    return allItems.filter((item) => {
      // Must be non-consumable
      if (item.type !== 'non_consumable') return false;
      
      // Must have quantity in central store
      if ((item.centralStoreQuantity || 0) <= 0) return false;
      
      // Not in exclude list
      if (excludeItemIds.includes(item.id)) return false;
      
      // Match search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSku = item.sku.toLowerCase().includes(query);
        return matchesName || matchesSku;
      }
      
      return true;
    });
  }, [allItems, excludeItemIds, searchQuery]);
  
  const selectedItem = allItems.find((item) => item.id === selectedItemId);
  
  const handleSelect = (item: Item) => {
    onSelect(item);
    setModalVisible(false);
    setSearchQuery('');
  };
  
  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between"
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Item selector"
        accessibilityRole="button"
      >
        <Text
          className={`text-[15px] ${
            selectedItem ? 'text-[#0F172A]' : 'text-[#94A3B8]'
          }`}
        >
          {selectedItem ? selectedItem.name : 'Select Item'}
        </Text>
        <Ionicons name="search" size={20} color="#64748B" />
      </TouchableOpacity>
      
      {/* Selected Item Info */}
      {selectedItem && (
        <View className="mt-2 p-3 bg-[#F8FAFC] rounded-lg">
          <Text className="text-[13px] text-[#64748B]">SKU: {selectedItem.sku}</Text>
          <Text className="text-[13px] text-[#64748B]">
            Available: {selectedItem.centralStoreQuantity || 0} {selectedItem.unit}
          </Text>
        </View>
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
        >
          <Pressable
            className="bg-white rounded-t-2xl max-h-[80%]"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center my-2" />
            
            {/* Header */}
            <View className="px-4 py-3 border-b border-[#E2E8F0]">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-2">
                Select Item
              </Text>
              
              {/* Search Input */}
              <View className="flex-row items-center bg-[#F8FAFC] rounded-lg px-3 h-10">
                <Ionicons name="search" size={20} color="#64748B" />
                <TextInput
                  className="flex-1 ml-2 text-[15px] text-[#0F172A]"
                  placeholder="Search items..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* List */}
            {isLoading && allItems.length === 0 ? (
              <View className="py-12 items-center justify-center min-h-[200px]">
                <ActivityIndicator size="large" color="#1E40AF" />
                <Text className="text-[15px] text-[#64748B] mt-4">
                  Loading items...
                </Text>
              </View>
            ) : availableItems.length === 0 ? (
              <View className="py-12 items-center">
                <Ionicons name="cube-outline" size={64} color="#64748B" />
                <Text className="text-[15px] text-[#64748B] mt-4">
                  {searchQuery ? 'No items match your search' : 'No items available'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="px-4 py-3 border-b border-[#E2E8F0]"
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      {/* Image */}
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          className="w-12 h-12 rounded-lg"
                        />
                      ) : (
                        <View className="w-12 h-12 bg-[#F8FAFC] rounded-lg items-center justify-center">
                          <Ionicons name="cube-outline" size={24} color="#64748B" />
                        </View>
                      )}
                      
                      {/* Info */}
                      <View className="flex-1 ml-3">
                        <Text className="text-[15px] font-medium text-[#0F172A]">
                          {item.name}
                        </Text>
                        <Text className="text-[13px] text-[#64748B]">
                          {item.sku}
                        </Text>
                        <Text className="text-[13px] text-[#64748B]">
                          Available: {item.centralStoreQuantity || 0} {item.unit}
                        </Text>
                      </View>
                      
                      {/* Selected Indicator */}
                      {selectedItemId === item.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
            
            {/* Cancel Button */}
            <TouchableOpacity
              className="px-4 py-4 border-t border-[#E2E8F0]"
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
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
