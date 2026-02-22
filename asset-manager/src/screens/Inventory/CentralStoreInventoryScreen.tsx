import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ItemCard } from '../../components/Inventory/ItemCard';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchItems,
  fetchCategories,
} from '../../store/slices/inventorySlice';
import {
  selectAllItems,
  selectItemsBySearchQuery,
  selectAllCategories,
  selectItemsLoading,
  selectLowStockCount,
  selectTotalItemsCount,
} from '../../store/selectors/inventorySelectors';
import {
  selectIsAdmin,
  selectIsStoreIncharge,
} from '../../store/selectors/authSelectors';
import { useInventoryError } from '../../hooks/useInventoryError';
import { subscribeItems } from '../../services/firebase/inventoryService';
import { subscribeCategories } from '../../services/firebase/categoryService';
import { setItems, setCategories } from '../../store/slices/inventorySlice';
import type { Item, ItemType, Category } from '../../types/inventory';

type StockFilter = 'all' | 'low_stock';

interface FilterState {
  categoryId?: string;
  type?: ItemType;
  stock: StockFilter;
}

type NavigationProp = StackNavigationProp<
  InventoryStackParamList,
  'CentralStoreInventory'
>;

export const CentralStoreInventoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setLocalFilters] = useState<FilterState>({
    stock: 'all',
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Redux selectors
  const allItems = useAppSelector(selectAllItems);
  const categories = useAppSelector(selectAllCategories);
  const isLoading = useAppSelector(selectItemsLoading);
  const error = useInventoryError();
  const lowStockCount = useAppSelector(selectLowStockCount);
  const totalItemsCount = useAppSelector(selectTotalItemsCount);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);

  // Apply search filter using optimized selector
  const searchedItems = useAppSelector((state) => 
    selectItemsBySearchQuery(state, searchQuery)
  );

  // Combine filters and search
  const filteredItems = useMemo(() => {
    let items = searchedItems;

    // Apply local filters
    if (filters.categoryId) {
      items = items.filter((item) => item.categoryId === filters.categoryId);
    }
    if (filters.type) {
      items = items.filter((item) => item.type === filters.type);
    }
    if (filters.stock === 'low_stock') {
      items = items.filter(
        (item) => item.totalQuantity <= item.minStockLevel
      );
    }

    return items;
  }, [searchedItems, filters]);

  // Calculate counts for filtered items
  const filteredLowStockCount = useMemo(() => {
    return filteredItems.filter(
      (item) => item.totalQuantity <= item.minStockLevel
    ).length;
  }, [filteredItems]);

  // Subscribe once on mount — filters are applied in memory via useMemo/selectors
  useEffect(() => {
    // Initial fetch (subscription will also fire immediately with current data)
    dispatch(fetchItems());
    dispatch(fetchCategories());

    const unsubscribeItems = subscribeItems((updatedItems: Item[]) => {
      dispatch(setItems(updatedItems));
    });

    const unsubscribeCategories = subscribeCategories((updatedCategories: Category[]) => {
      dispatch(setCategories(updatedCategories));
    });

    return () => {
      unsubscribeItems();
      unsubscribeCategories();
    };
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchItems())
      .then(() => dispatch(fetchCategories()))
      .finally(() => {
        setRefreshing(false);
      });
  }, [dispatch]);

  const handleAddItem = useCallback(() => {
    navigation.navigate('AddEditItem');
  }, [navigation]);

  const handleSteelMaster = useCallback(() => {
    navigation.navigate('SteelMaster');
  }, [navigation]);

  const handleMaintenance = useCallback(() => {
    navigation.navigate('Maintenance');
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: Item) => {
      navigation.navigate('ItemDetail', { itemId: item.id });
    },
    [navigation]
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleCategoryFilter = useCallback(
    (categoryId: string | undefined) => {
      setLocalFilters((prev) => ({
        ...prev,
        categoryId,
      }));
    },
    []
  );

  const handleTypeFilter = useCallback((type: ItemType | undefined) => {
    setLocalFilters((prev) => ({
      ...prev,
      type,
    }));
  }, []);

  const handleStockFilter = useCallback((stock: StockFilter) => {
    setLocalFilters((prev) => ({
      ...prev,
      stock,
    }));
  }, []);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  const renderItemCard = useCallback(
    ({ item }: { item: Item }) => (
      <ItemCard item={item} onPress={() => handleItemPress(item)} />
    ),
    [handleItemPress]
  );

  const renderFilterChip = useCallback(
    (
      label: string,
      isActive: boolean,
      onPress: () => void,
      accessibilityLabel: string,
      key?: string
    ) => (
      <TouchableOpacity
        key={key}
        className={`px-4 py-2 rounded-full border min-h-[48px] items-center justify-center ${
          isActive
            ? 'bg-[#1E40AF] border-[#1E40AF]'
            : 'bg-white border-[#E2E8F0]'
        }`}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isActive }}
      >
        <Text
          className={`text-[13px] font-medium ${
            isActive ? 'text-white' : 'text-[#64748B]'
          }`}
        >
          {label}
        </Text>
      </TouchableOpacity>
    ),
    []
  );

  // CIAMS Standard Header Component - Responsive Layout
  const renderCustomHeader = () => (
    <View className="bg-white border-b border-[#E2E8F0] px-4 flex-row items-center h-14">
      <Text 
        className="text-[22px] font-semibold text-[#0F172A] flex-1 flex-shrink" 
        accessibilityRole="header"
        numberOfLines={1}
      >
        Central Store
      </Text>
      <View className="flex-row items-center ml-2">
        <TouchableOpacity
          className="w-12 h-12 items-center justify-center rounded-[10px]"
          onPress={handleToggleFilters}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
        >
          <Ionicons 
            name={showFilters ? "filter" : "filter-outline"} 
            size={22} 
            color={showFilters ? "#1E40AF" : "#64748B"} 
          />
        </TouchableOpacity>
        {(isAdmin || isStoreIncharge) && (
          <TouchableOpacity
            className="w-12 h-12 items-center justify-center rounded-[10px]"
            onPress={handleMaintenance}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Maintenance"
          >
            <Ionicons name="build-outline" size={22} color="#1E40AF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="w-12 h-12 items-center justify-center rounded-[10px]"
          onPress={handleSteelMaster}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Steel Master"
        >
          <Ionicons name="analytics-outline" size={22} color="#1E40AF" />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-12 h-12 items-center justify-center rounded-[10px]"
          onPress={handleAddItem}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add new item"
        >
          <Ionicons name="add-circle" size={22} color="#1E40AF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state (only full-screen when no data at all, like Sites)
  if (isLoading && allItems.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        {renderCustomHeader()}
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading items"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading items...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Error state (only if no items loaded)
  if (error && allItems.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        {renderCustomHeader()}
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle" size={80} color="#DC2626" />
          <Text className="text-[22px] font-semibold text-[#0F172A] mb-2 mt-4">
            Error
          </Text>
          <Text className="text-[15px] text-[#DC2626] mb-4 text-center">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center flex-row gap-2"
            onPress={handleRefresh}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retry loading items"
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  const hasNoItems = filteredItems.length === 0 && !isLoading;

  return (
    <ScreenLayout edges={['top']}>
      {renderCustomHeader()}

      {/* CIAMS Search Bar */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search items by name, SKU, or category..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            accessibilityLabel="Search items"
            accessibilityRole="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              className="w-8 h-8 items-center justify-center"
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CIAMS Filters Section */}
      {showFilters && (
        <View className="bg-white border-b border-[#E2E8F0] px-4 py-4">
          <View className="gap-4">
            {/* Category Filter */}
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]">Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <View className="flex-row items-center gap-2">
                  {renderFilterChip(
                    'All',
                    !filters.categoryId,
                    () => handleCategoryFilter(undefined),
                    'Filter by all categories',
                    'category-all'
                  )}
                  {categories.map((category) =>
                    renderFilterChip(
                      category.name,
                      filters.categoryId === category.id,
                      () => handleCategoryFilter(category.id),
                      `Filter by ${category.name} category`,
                      category.id
                    )
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Type Filter */}
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]">Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <View className="flex-row items-center gap-2">
                  {renderFilterChip(
                    'All',
                    !filters.type,
                    () => handleTypeFilter(undefined),
                    'Filter by all types',
                    'type-all'
                  )}
                  {renderFilterChip(
                    'Consumable',
                    filters.type === 'consumable',
                    () => handleTypeFilter('consumable'),
                    'Filter by consumable items',
                    'type-consumable'
                  )}
                  {renderFilterChip(
                    'Non-Consumable',
                    filters.type === 'non_consumable',
                    () => handleTypeFilter('non_consumable'),
                    'Filter by non-consumable items',
                    'type-non-consumable'
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Stock Filter */}
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]">Stock Level</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <View className="flex-row items-center gap-2">
                  {renderFilterChip(
                    'All',
                    filters.stock === 'all',
                    () => handleStockFilter('all'),
                    'Show all stock levels',
                    'stock-all'
                  )}
                  {renderFilterChip(
                    'Low Stock',
                    filters.stock === 'low_stock',
                    () => handleStockFilter('low_stock'),
                    'Show only low stock items',
                    'stock-low'
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {/* CIAMS Error Banner */}
      {error && (
        <View className="bg-[#DC2626]/15 px-4 py-3 mx-4 mt-4 rounded-lg flex-row items-center gap-3">
          <Ionicons name="alert-circle" size={24} color="#DC2626" />
          <Text className="text-[15px] text-[#DC2626] flex-1">{error}</Text>
        </View>
      )}

      {/* CIAMS Empty State */}
      {hasNoItems ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="cube-outline" size={80} color="#94A3B8" />
          
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
            {searchQuery || filters.categoryId || filters.type || filters.stock !== 'all'
              ? 'No Items Match Filters'
              : 'No Items Yet'}
          </Text>
          
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            {searchQuery
              ? 'No items match your search. Try a different search term.'
              : filters.categoryId || filters.type || filters.stock !== 'all'
              ? 'Try adjusting your filters to see more items.'
              : 'Get started by adding your first inventory item.'}
          </Text>
          
          {!searchQuery && !(filters.categoryId || filters.type || filters.stock !== 'all') && (
            <TouchableOpacity
              className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center"
              onPress={handleAddItem}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add new item"
            >
              <Text className="text-[15px] font-semibold text-white">Add First Item</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View className="flex-1">
          <FlatList
            data={filteredItems}
            renderItem={renderItemCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ItemSeparatorComponent={() => <View className="h-3" />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#1E40AF"
              />
            }
            showsVerticalScrollIndicator={false}
          />

          {/* CIAMS Footer with Status Info */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] text-[#64748B]">
                <Text className="text-[#0F172A] font-semibold">{filteredItems.length}</Text> items found
              </Text>
              {filteredLowStockCount > 0 && (
                <View className="flex-row items-center gap-2">
                  <View className="px-2 py-1 rounded-full bg-[#D97706]/15">
                    <Text className="text-[12px] font-medium text-[#D97706]">
                      {filteredLowStockCount} Low Stock
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </ScreenLayout>
  );
};
