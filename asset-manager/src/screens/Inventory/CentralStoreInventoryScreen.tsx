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
import { ScreenHeader } from '../../components/ScreenHeader';
import { ItemCard } from '../../components/Inventory/ItemCard';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchItems,
  fetchCategories,
  setFilters,
} from '../../store/slices/inventorySlice';
import {
  selectAllItems,
  selectFilteredItems,
  selectItemsBySearchQuery,
  selectAllCategories,
  selectItemsLoading,
  selectItemsError,
  selectLowStockCount,
  selectTotalItemsCount,
} from '../../store/selectors/inventorySelectors';
import { subscribeItems } from '../../services/firebase/inventoryService';
import { subscribeCategories } from '../../services/firebase/categoryService';
import { setItems, setCategories } from '../../store/slices/inventorySlice';
import type { Item, ItemType, ItemFilters } from '../../types/inventory';

type StockFilter = 'all' | 'low_stock';

interface FilterState {
  categoryId?: string;
  type?: ItemType;
  stock: StockFilter;
}

type NavigationProp = StackNavigationProp<InventoryStackParamList, 'CentralStoreInventory'>;

export const CentralStoreInventoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setLocalFilters] = useState<FilterState>({
    stock: 'all',
  });

  // Redux selectors
  const allItems = useAppSelector(selectAllItems);
  const categories = useAppSelector(selectAllCategories);
  const isLoading = useAppSelector(selectItemsLoading);
  const error = useAppSelector(selectItemsError);
  const lowStockCount = useAppSelector(selectLowStockCount);
  const totalItemsCount = useAppSelector(selectTotalItemsCount);

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

  // Set up real-time listeners
  useEffect(() => {
    // Build Redux filters for subscription
    const reduxFilters: ItemFilters = {};
    if (filters.categoryId) {
      reduxFilters.categoryId = filters.categoryId;
    }
    if (filters.type) {
      reduxFilters.type = filters.type;
    }
    if (filters.stock === 'low_stock') {
      reduxFilters.lowStockOnly = true;
    }

    // Update Redux filters
    dispatch(setFilters(Object.keys(reduxFilters).length > 0 ? reduxFilters : null));

    // Initial fetch
    dispatch(fetchItems(reduxFilters));
    dispatch(fetchCategories());

    // Subscribe to real-time updates
    const unsubscribeItems = subscribeItems(
      (items: Item[]) => {
        dispatch(setItems(items));
      },
      reduxFilters
    );

    const unsubscribeCategories = subscribeCategories((categories) => {
      dispatch(setCategories(categories));
    });

    return () => {
      unsubscribeItems();
      unsubscribeCategories();
    };
  }, [dispatch, filters]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const reduxFilters: ItemFilters = {};
    if (filters.categoryId) {
      reduxFilters.categoryId = filters.categoryId;
    }
    if (filters.type) {
      reduxFilters.type = filters.type;
    }
    if (filters.stock === 'low_stock') {
      reduxFilters.lowStockOnly = true;
    }
    dispatch(fetchItems(reduxFilters))
      .then(() => dispatch(fetchCategories()))
      .finally(() => {
        setRefreshing(false);
      });
  }, [dispatch, filters]);

  const handleAddItem = useCallback(() => {
    navigation.navigate('AddEditItem');
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
        className={`px-4 py-2 rounded-full border ${
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

  // Loading state
  if (isLoading && filteredItems.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Central Store Inventory"
          rightAction={{
            icon: 'add-circle',
            onPress: handleAddItem,
            accessibilityLabel: 'Add new item',
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading items...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Error state (only if no items loaded)
  if (error && filteredItems.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Central Store Inventory"
          rightAction={{
            icon: 'add-circle',
            onPress: handleAddItem,
            accessibilityLabel: 'Add new item',
          }}
        />
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
      <ScreenHeader
        title="Central Store Inventory"
        rightAction={{
          icon: 'add-circle',
          onPress: handleAddItem,
          accessibilityLabel: 'Add new item',
        }}
      />

      {/* Search Bar */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="relative">
          <View className="absolute left-4 top-0 h-12 items-center justify-center z-10">
            <Ionicons name="search" size={24} color="#94A3B8" />
          </View>
          <TextInput
            className="border border-[#E2E8F0] rounded-lg h-12 pl-12 pr-4 bg-white text-[15px] text-[#0F172A]"
            placeholder="Search items by name, SKU, or category..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            accessibilityLabel="Search items"
            accessibilityRole="search"
          />
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {/* Category Filter */}
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] text-[#64748B]">Category:</Text>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 8 }}
        >
          {/* Type Filter */}
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] text-[#64748B]">Type:</Text>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 8 }}
        >
          {/* Stock Filter */}
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] text-[#64748B]">Stock:</Text>
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

      {/* Error Banner */}
      {error && (
        <View className="bg-[#D97706]/15 px-4 py-2 mx-4 mt-3 rounded-lg flex-row items-center gap-2">
          <Ionicons name="warning" size={24} color="#D97706" />
          <Text className="text-[13px] text-[#D97706] flex-1">{error}</Text>
        </View>
      )}

      {/* Content */}
      {hasNoItems ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="cube-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            {searchQuery || filters.categoryId || filters.type || filters.stock !== 'all'
              ? 'No Items Match Filters'
              : 'No Items Found'}
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            {searchQuery
              ? 'No items match your search. Try a different search term.'
              : filters.categoryId || filters.type || filters.stock !== 'all'
              ? 'Try adjusting your filters to see more items.'
              : 'Get started by adding your first inventory item.'}
          </Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center flex-row gap-2"
            onPress={handleAddItem}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add new item"
          >
            <Ionicons name="add-circle" size={22} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">Add Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1">
          <FlatList
            data={filteredItems}
            renderItem={renderItemCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#1E40AF"
              />
            }
            showsVerticalScrollIndicator={false}
          />

          {/* Footer */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-3 flex-row justify-between items-center">
            <View className="flex-row items-center gap-4">
              <Text className="text-[13px] text-[#64748B]">
                Total: <Text className="text-[#0F172A] font-semibold">{filteredItems.length}</Text>
              </Text>
              {filteredLowStockCount > 0 && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="warning" size={16} color="#D97706" />
                  <Text className="text-[13px] text-[#D97706]">
                    Low Stock: <Text className="font-semibold">{filteredLowStockCount}</Text>
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </ScreenLayout>
  );
};
