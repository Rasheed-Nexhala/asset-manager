/**
 * Category Select Screen
 *
 * Full-screen category picker for Add/Edit Item flow.
 * CIAMS design system: search bar, list cards with item counts, Add New Category.
 * Replaces the modal-based CategorySelector for better UX on field devices.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCategories, setCategories } from '../../store/slices/inventorySlice';
import { createCategory } from '../../store/thunks/inventoryThunks';
import {
  selectAllCategories,
  selectAllItems,
  selectItemsLoading,
} from '../../store/selectors/inventorySelectors';
import { subscribeCategories } from '../../services/firebase/categoryService';
import type { Category, Item } from '../../types/inventory';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type NavigationProp = StackNavigationProp<InventoryStackParamList, 'CategorySelect'>;

interface RouteParams {
  returnRoute?: string;
  itemId?: string;
  initialCategoryId?: string | null;
}

export const CategorySelectScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const dispatch = useAppDispatch();

  const { returnRoute = 'AddEditItem', itemId, initialCategoryId } =
    (route.params as RouteParams) || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const categories = useAppSelector(selectAllCategories);
  const allItems = useAppSelector(selectAllItems);
  const isLoading = useAppSelector(selectItemsLoading);

  // Items per category for display
  const itemsByCategory = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const item of allItems) {
      if (!map[item.categoryId]) map[item.categoryId] = [];
      map[item.categoryId].push(item);
    }
    return map;
  }, [allItems]);

  const getItemCount = useCallback(
    (categoryId: string) => itemsByCategory[categoryId]?.length ?? 0,
    [itemsByCategory]
  );

  // Subscribe to categories
  useEffect(() => {
    dispatch(fetchCategories());
    const unsubscribe = subscribeCategories((updated: Category[]) => {
      dispatch(setCategories(updated));
    });
    return () => unsubscribe();
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchCategories()).finally(() => setRefreshing(false));
  }, [dispatch]);

  const handleSelect = useCallback(
    (categoryId: string) => {
      navigation.navigate(returnRoute as 'AddEditItem', {
        itemId,
        selectedCategoryId: categoryId,
      });
    },
    [navigation, returnRoute, itemId]
  );

  const handleAddNewPress = useCallback(() => {
    setShowAddNew(true);
    setCreateError(null);
  }, []);

  const handleCreateCategory = useCallback(async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCreateError('Category name is required');
      return;
    }
    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setCreateError('A category with this name already exists');
      return;
    }
    try {
      setIsCreating(true);
      setCreateError(null);
      const created = await dispatch(createCategory(trimmed)).unwrap();
      handleSelect(created?.id ?? '');
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create category'
      );
    } finally {
      setIsCreating(false);
    }
  }, [newCategoryName, categories, dispatch, handleSelect]);

  const handleCancelAddNew = useCallback(() => {
    setShowAddNew(false);
    setNewCategoryName('');
    setCreateError(null);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const renderCategoryItem = useCallback(
    ({ item }: { item: Category }) => {
      const isSelected = initialCategoryId === item.id;
      const itemCount = getItemCount(item.id);
      return (
        <TouchableOpacity
          className={`bg-white rounded-[10px] p-4 border mb-3 min-h-[48px] ${
            isSelected ? 'border-[#1E40AF] bg-[#1E40AF]/5' : 'border-[#E2E8F0]'
          }`}
          onPress={() => handleSelect(item.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.name}, ${itemCount} items`}
          accessibilityState={{ selected: isSelected }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                {item.name}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons name="cube-outline" size={16} color="#64748B" />
                <Text className="text-[13px] text-[#64748B]">
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color="#1E40AF" />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [getItemCount, handleSelect, initialCategoryId]
  );

  const ListEmptyComponent = useCallback(() => {
    if (isLoading && categories.length === 0) return null;
    return (
      <View className="flex-1 items-center justify-center py-16 px-4">
        <Ionicons name="pricetags-outline" size={64} color="#94A3B8" />
        <Text className="text-[17px] font-semibold text-[#0F172A] mt-4 text-center">
          {searchQuery ? 'No categories match' : 'No categories yet'}
        </Text>
        <Text className="text-[15px] text-[#64748B] mt-2 text-center">
          {searchQuery
            ? 'Try a different search term.'
            : 'Add a category to organize your items.'}
        </Text>
      </View>
    );
  }, [isLoading, categories.length, searchQuery]);

  if (showAddNew) {
    return (
      <ScreenLayout edges={['top']} keyboardAware>
        <ScreenHeader
          title="Add New Category"
          showBack
          onBackPress={handleCancelAddNew}
        />
        <View className="flex-1 px-4 pt-4">
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]">
                Category Name <Text className="text-[#DC2626]">*</Text>
              </Text>
              <TextInput
                className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                  createError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                }`}
                placeholder="Enter category name"
                placeholderTextColor="#94A3B8"
                value={newCategoryName}
                onChangeText={(t) => {
                  setNewCategoryName(t);
                  setCreateError(null);
                }}
                autoFocus
                editable={!isCreating}
                accessibilityLabel="Category name"
              />
              {createError && (
                <Text className="text-[13px] text-[#DC2626]">
                  {createError}
                </Text>
              )}
            </View>

            <View className="flex-row gap-3 pt-2">
              <TouchableOpacity
                className="flex-1 border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[50px] items-center justify-center"
                onPress={handleCancelAddNew}
                disabled={isCreating}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-[15px] font-semibold text-[#64748B]">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 ${
                  isCreating ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
                }`}
                onPress={handleCreateCategory}
                disabled={isCreating || !newCategoryName.trim()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  isCreating ? 'Creating category' : 'Create category'
                }
                accessibilityState={{ disabled: isCreating, busy: isCreating }}
              >
                {isCreating ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">
                      Creating…
                    </Text>
                  </>
                ) : (
                  <Text className="text-[15px] font-semibold text-white">
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Select Category"
        showBack
        onBackPress={handleBack}
      />

      {/* CIAMS Search Bar */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
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
              className="w-10 h-10 items-center justify-center"
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading && categories.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading categories…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 100,
            flexGrow: 1,
          }}
          ListEmptyComponent={ListEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1E40AF"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add New Category - CIAMS primary action */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-4">
        <TouchableOpacity
          className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
          onPress={handleAddNewPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add new category"
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text className="text-[15px] font-semibold text-white">
            Add New Category
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};
