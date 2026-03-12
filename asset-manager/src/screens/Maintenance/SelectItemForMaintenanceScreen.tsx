/**
 * SelectItemForMaintenanceScreen
 *
 * Full-screen item picker for Add to Maintenance flow.
 * CIAMS design system: search bar, paginated list, list cards.
 * Replaces the modal-based ItemSelectorForMaintenance for better UX on field devices.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  listItemsForMaintenancePaginated,
  getItemsForMaintenanceCount,
  MAINTENANCE_ITEMS_PAGE_SIZE,
} from '../../services/firebase/inventoryService';
import type { Item } from '../../types/inventory';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceStackParamList';
import type { DocumentSnapshot } from 'firebase/firestore';

type NavigationProp = StackNavigationProp<
  MaintenanceStackParamList,
  'SelectItemForMaintenance'
>;
type RouteParamsProp = RouteProp<
  MaintenanceStackParamList,
  'SelectItemForMaintenance'
>;

const SEARCH_DEBOUNCE_MS = 400;

export const SelectItemForMaintenanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParamsProp>();
  const { selectedItemId, excludeItemIds = [] } = route.params ?? {};

  const [items, setItems] = useState<Item[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  const hasMore = items.length < (totalCount ?? 0) && lastDoc != null;
  const filteredItems = items.filter((item) => !excludeItemIds.includes(item.id));

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const [countResult, listResult] = await Promise.all([
        getItemsForMaintenanceCount(debouncedSearch || undefined),
        listItemsForMaintenancePaginated(
          debouncedSearch || undefined,
          MAINTENANCE_ITEMS_PAGE_SIZE
        ),
      ]);
      setTotalCount(countResult);
      setItems(listResult.items);
      lastDocRef.current = listResult.lastDoc;
      setLastDoc(listResult.lastDoc);
    } catch (error) {
      console.error('Error fetching items for maintenance:', error);
      setItems([]);
      setTotalCount(0);
      setLastDoc(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFirstPage();
    setRefreshing(false);
  }, [fetchFirstPage]);

  const handleLoadMore = useCallback(async () => {
    if (!lastDocRef.current || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await listItemsForMaintenancePaginated(
        debouncedSearch || undefined,
        MAINTENANCE_ITEMS_PAGE_SIZE,
        lastDocRef.current
      );
      setItems((prev) => [...prev, ...result.items]);
      lastDocRef.current = result.lastDoc;
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedSearch, loadingMore, hasMore]);

  const handleSelect = useCallback(
    (item: Item) => {
      navigation.navigate('AddToMaintenance', { selectedItem: item });
    },
    [navigation]
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      const isSelected = selectedItemId === item.id;
      const qty = item.centralStoreQuantity || 0;
      return (
        <TouchableOpacity
          className={`bg-white rounded-[10px] p-4 border mb-3 min-h-[48px] ${
            isSelected ? 'border-[#1E40AF] bg-[#1E40AF]/5' : 'border-[#E2E8F0]'
          }`}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.name}, ${qty} ${item.unit} available`}
          accessibilityState={{ selected: isSelected }}
        >
          <View className="flex-row items-center">
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                className="w-12 h-12 rounded-lg"
                resizeMode="cover"
              />
            ) : (
              <View className="w-12 h-12 bg-[#F8FAFC] rounded-lg items-center justify-center">
                <Ionicons name="cube-outline" size={24} color="#64748B" />
              </View>
            )}
            <View className="flex-1 ml-3">
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                {item.name}
              </Text>
              <Text className="text-[13px] text-[#64748B]">SKU: {item.sku}</Text>
              <Text className="text-[13px] text-[#64748B]">
                Available: {qty} {item.unit}
              </Text>
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [handleSelect, selectedItemId]
  );

  const ListFooterComponent = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#1E40AF" />
      </View>
    );
  }, [loadingMore]);

  const ListEmptyComponent = useCallback(() => {
    if (loading && items.length === 0) return null;
    return (
      <View className="flex-1 items-center justify-center py-16 px-4">
        <Ionicons name="cube-outline" size={64} color="#94A3B8" />
        <Text className="text-[22px] font-semibold text-[#0F172A] mt-4 text-center">
          {debouncedSearch ? 'No items match your search' : 'No items available'}
        </Text>
        <Text className="text-[15px] text-[#64748B] mt-2 text-center">
          {debouncedSearch
            ? 'Try a different search term. Only non-consumable items with stock in central store are shown.'
            : 'Only non-consumable items with stock in central store can be added to maintenance.'}
        </Text>
      </View>
    );
  }, [loading, items.length, debouncedSearch]);

  const isInitialLoad = loading && items.length === 0 && totalCount === null;

  if (isInitialLoad) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Select Item"
          showBack
          onBackPress={handleBack}
        />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading items…
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Select Item"
        showBack
        onBackPress={handleBack}
      />

      {/* CIAMS Search Bar */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search by item name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search items"
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
        {totalCount != null && (
          <Text className="text-[13px] text-[#64748B] mt-2">
            Showing {filteredItems.length} of {totalCount} items
          </Text>
        )}
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100,
          flexGrow: 1,
        }}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReached={hasMore && !loadingMore ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1E40AF"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenLayout>
  );
};
