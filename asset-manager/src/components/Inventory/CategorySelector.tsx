import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectAllCategories } from '../../store/selectors/inventorySelectors';
import { createCategory } from '../../store/slices/inventorySlice';
import type { Category } from '../../types/inventory';

export interface CategorySelectorProps {
  /** Currently selected category ID */
  selectedCategoryId?: string | null;
  /** Callback when a category is selected */
  onSelect: (categoryId: string | null) => void;
  /** Optional label override (defaults to "Category") */
  label?: string;
  /** Optional error message to display */
  error?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onSelect,
  label = 'Category',
  error,
}) => {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectAllCategories);
  const isLoading = useAppSelector((state) => state.inventory.loading);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [showAddNew, setShowAddNew] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((cat) => cat.id === selectedCategoryId) || null;
  }, [selectedCategoryId, categories]);

  const displayText = selectedCategory ? selectedCategory.name : 'Select Category';

  const hasError = Boolean(error);

  const handleSelect = useCallback(
    (categoryId: string | null) => {
      onSelect(categoryId);
      setModalVisible(false);
      setShowAddNew(false);
      setNewCategoryName('');
      setCreateError(null);
    },
    [onSelect]
  );

  const handleAddNewPress = useCallback(() => {
    setShowAddNew(true);
    setCreateError(null);
  }, []);

  const handleCreateCategory = useCallback(async () => {
    const trimmedName = newCategoryName.trim();
    
    if (!trimmedName) {
      setCreateError('Category name is required');
      return;
    }

    // Check if category already exists
    const existingCategory = categories.find(
      (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existingCategory) {
      setCreateError('A category with this name already exists');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      
      const result = await dispatch(createCategory(trimmedName)).unwrap();
      
      // Select the newly created category
      handleSelect(result.id);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  }, [newCategoryName, categories, dispatch, handleSelect]);

  const handleCancelAddNew = useCallback(() => {
    setShowAddNew(false);
    setNewCategoryName('');
    setCreateError(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setShowAddNew(false);
    setNewCategoryName('');
    setCreateError(null);
  }, []);

  return (
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]" accessibilityRole="text">
        {label}
      </Text>
      
      <TouchableOpacity
        className={`border rounded-lg h-12 px-4 bg-white flex-row items-center justify-between ${
          hasError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
        }`}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Select category. Current: ${displayText}`}
      >
        <Text className={`text-[15px] ${selectedCategoryId ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
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
        accessibilityLabel="Select category"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-4">
            {/* Handle Bar */}
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

            <Text className="text-[22px] font-semibold text-[#0F172A] mb-4">
              Select Category
            </Text>

            {showAddNew ? (
              <View className="gap-4">
                <View className="gap-1.5">
                  <Text className="text-[15px] text-[#0F172A]">Category Name</Text>
                  <TextInput
                    className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                      createError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                    }`}
                    placeholderTextColor="#94A3B8"
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChangeText={(text) => {
                      setNewCategoryName(text);
                      setCreateError(null);
                    }}
                    autoFocus={true}
                    accessibilityLabel="Category name input"
                  />
                  {createError && (
                    <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                      {createError}
                    </Text>
                  )}
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[50px] items-center justify-center"
                    onPress={handleCancelAddNew}
                    activeOpacity={0.7}
                    accessibilityLabel="Cancel adding new category"
                    accessibilityRole="button"
                    disabled={isCreating}
                  >
                    <Text className="text-[15px] font-semibold text-[#64748B]">Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                    onPress={handleCreateCategory}
                    activeOpacity={0.7}
                    accessibilityLabel="Create category"
                    accessibilityRole="button"
                    disabled={isCreating || !newCategoryName.trim()}
                  >
                    {isCreating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-[15px] font-semibold text-white">Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView className="max-h-[400px]" showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  {isLoading && categories.length === 0 ? (
                    <View className="py-8 items-center">
                      <ActivityIndicator size="large" color="#1E40AF" />
                      <Text className="text-[15px] text-[#64748B] mt-4">Loading categories...</Text>
                    </View>
                  ) : categories.length === 0 ? (
                    <View className="py-8 items-center">
                      <Text className="text-[15px] text-[#64748B] text-center mb-4">
                        No categories available
                      </Text>
                    </View>
                  ) : (
                    categories.map((category) => {
                      const isSelected = selectedCategoryId === category.id;

                      return (
                        <TouchableOpacity
                          key={category.id}
                          className={`border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between ${
                            isSelected ? 'bg-[#1E40AF]/10 border-[#1E40AF]' : 'bg-white'
                          }`}
                          onPress={() => handleSelect(category.id)}
                          activeOpacity={0.7}
                          accessibilityLabel={`Select category: ${category.name}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            className={`text-[15px] font-medium ${
                              isSelected ? 'text-[#1E40AF]' : 'text-[#0F172A]'
                            }`}
                          >
                            {category.name}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={20} color="#1E40AF" />}
                        </TouchableOpacity>
                      );
                    })
                  )}

                  {/* Add New Category Option */}
                  <TouchableOpacity
                    className="border-[1.5px] border-[#1E40AF] border-dashed rounded-lg h-12 px-4 flex-row items-center justify-center gap-2 mt-2"
                    onPress={handleAddNewPress}
                    activeOpacity={0.7}
                    accessibilityLabel="Add new category"
                    accessibilityRole="button"
                  >
                    <Ionicons name="add" size={20} color="#1E40AF" />
                    <Text className="text-[15px] font-semibold text-[#1E40AF]">
                      Add New Category
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {!showAddNew && (
              <TouchableOpacity
                className="border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center mt-4"
                onPress={handleCloseModal}
                activeOpacity={0.7}
                accessibilityLabel="Cancel category selection"
                accessibilityRole="button"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
