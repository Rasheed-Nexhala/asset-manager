/**
 * Category Management Screen
 *
 * Full CRUD interface for managing item categories.
 * Access: Admin & Store Incharge only.
 * CIAMS: ScreenLayout, ScreenHeader, list with edit/delete, FAB for add, real-time updates.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, ScreenLayout } from '../../components';
import { CategoryListItem } from '../../components/Inventory/CategoryListItem';
import { CategoryEditModal } from '../../components/Inventory/CategoryEditModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../store/thunks/inventoryThunks';
import { clearError } from '../../store/slices/inventorySlice';
import {
  selectAllCategories,
  selectAllItems,
  selectItemsLoading,
} from '../../store/selectors/inventorySelectors';
import { useInventoryError } from '../../hooks/useInventoryError';
import { subscribeCategories } from '../../services/firebase/categoryService';
import { setCategories } from '../../store/slices/inventorySlice';
import type { Category, Item } from '../../types/inventory';

export const CategoryManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = useAppSelector(selectAllCategories);
  const allItems = useAppSelector(selectAllItems);
  const isLoading = useAppSelector(selectItemsLoading);
  const error = useInventoryError();

  // Compute items grouped by category locally (selectItemsByCategory is a factory, not usable as-is)
  const itemsByCategory = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const item of allItems) {
      if (!map[item.categoryId]) map[item.categoryId] = [];
      map[item.categoryId].push(item);
    }
    return map;
  }, [allItems]);

  // Set up real-time listener for categories
  useEffect(() => {
    // Initial fetch
    dispatch(fetchCategories());

    // Subscribe to real-time updates
    const unsubscribe = subscribeCategories((updatedCategories: Category[]) => {
      dispatch(setCategories(updatedCategories));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchCategories()).finally(() => setRefreshing(false));
  }, [dispatch]);

  const handleCancel = useCallback(() => {
    dispatch(clearError());
    (navigation as any).goBack();
  }, [dispatch, navigation]);

  const handleEdit = useCallback((category: Category) => {
    setEditingCategory(category);
  }, []);

  const handleDelete = useCallback(
    async (category: Category) => {
      const itemCount = itemsByCategory[category.id]?.length || 0;

      if (itemCount > 0) {
        Alert.alert(
          'Cannot Delete Category',
          `This category has ${itemCount} item${itemCount > 1 ? 's' : ''} associated with it. Please reassign these items to another category before deleting.`,
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Delete Category',
        `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
              onPress: async () => {
              try {
                await dispatch(deleteCategory(category.id)).unwrap();
              } catch (err: any) {
                const message =
                  typeof err === 'string' ? err : err?.message || 'Failed to delete category';
                Alert.alert('Cannot Delete Category', message);
              }
            },
          },
        ]
      );
    },
    [dispatch, itemsByCategory]
  );

  const handleSaveEdit = useCallback(
    async (name: string) => {
      if (!editingCategory) return;

      try {
        await dispatch(updateCategory({ categoryId: editingCategory.id, name })).unwrap();
        setEditingCategory(null);
      } catch (err: any) {
        // Error is displayed in the modal via Redux state
        throw err;
      }
    },
    [dispatch, editingCategory]
  );

  const handleCreateCategory = useCallback(async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (trimmedName.length > 50) {
      Alert.alert('Error', 'Category name must be 50 characters or less');
      return;
    }

    try {
      setIsCreating(true);
      await dispatch(createCategory(trimmedName)).unwrap();
      setNewCategoryName('');
      setShowAddModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  }, [dispatch, newCategoryName]);

  // Filter categories based on search query
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const getItemCount = useCallback(
    (categoryId: string) => {
      return itemsByCategory[categoryId]?.length || 0;
    },
    [itemsByCategory]
  );

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryListItem
        category={item}
        itemCount={getItemCount(item.id)}
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item)}
      />
    ),
    [getItemCount, handleEdit, handleDelete]
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  const ListEmptyComponent = useCallback(() => {
    if (isLoading && categories.length === 0) return null;
    return (
      <View className="flex-1 items-center justify-center px-4 py-12">
        <Ionicons name="pricetags-outline" size={80} color="#94A3B8" />
        <Text className="text-[22px] font-semibold text-[#0F172A] text-center mt-4 mb-2">
          {searchQuery ? 'No categories found' : 'No categories yet'}
        </Text>
        <Text className="text-[15px] text-[#64748B] text-center mb-6">
          {searchQuery
            ? 'Try adjusting your search.'
            : 'Create your first category to organize your inventory items.'}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center"
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
            accessibilityLabel="Add category"
          >
            <Text className="text-[15px] font-semibold text-white">Add Category</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoading, categories.length, searchQuery]);

  if (isLoading && categories.length === 0 && !refreshing) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Category Management"
          rightAction={{
            label: 'Cancel',
            onPress: handleCancel,
            accessibilityLabel: 'Cancel',
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading categories...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']} keyboardAware>
      <ScreenHeader
        title="Category Management"
        rightAction={{
          label: 'Cancel',
          onPress: handleCancel,
          accessibilityLabel: 'Cancel',
        }}
      />

      {/* Error Banner */}
      {error && (
        <View className="p-3 mx-4 mt-3 rounded-lg bg-[#DC2626]/10 border-[1.5px] border-[#DC2626]">
          <View className="flex-row items-start gap-2">
            <Ionicons name="warning" size={24} color="#DC2626" />
            <Text className="text-[14px] text-[#DC2626] flex-1">{error}</Text>
            <TouchableOpacity
              onPress={() => dispatch(clearError())}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View className="px-4 pt-3 pb-2">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search categories..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search categories"
            accessibilityRole="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories List */}
      <FlatList
        data={filteredCategories}
        renderItem={renderCategory}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 }}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1E40AF" />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Category FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-[#1E40AF] items-center justify-center shadow-lg"
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add new category"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Category Modal */}
      {showAddModal && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-[10px] w-full max-w-md">
            {/* Header */}
            <View className="p-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-[#0F172A]">Add Category</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                }}
                className="w-8 h-8 items-center justify-center"
                disabled={isCreating}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View className="p-4 gap-4">
              {/* Category Name Input */}
              <View className="gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">
                  Category Name <Text className="text-[#DC2626]">*</Text>
                </Text>
                <TextInput
                  className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
                  placeholder="Enter category name"
                  placeholderTextColor="#94A3B8"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  maxLength={50}
                  editable={!isCreating}
                  autoFocus
                  accessibilityLabel="Category name"
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[50px] items-center justify-center"
                  onPress={() => {
                    setShowAddModal(false);
                    setNewCategoryName('');
                  }}
                  disabled={isCreating}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text className="text-[15px] font-semibold text-[#64748B]">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                  onPress={handleCreateCategory}
                  disabled={isCreating || !newCategoryName.trim()}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Create category"
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-[15px] font-semibold text-white">Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Edit Category Modal */}
      <CategoryEditModal
        visible={editingCategory !== null}
        category={editingCategory}
        onSave={handleSaveEdit}
        onCancel={() => setEditingCategory(null)}
        isLoading={isLoading}
        error={error}
      />
    </ScreenLayout>
  );
};
