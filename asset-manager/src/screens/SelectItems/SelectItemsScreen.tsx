/**
 * SelectItemsScreen
 *
 * Full-screen item picker for Requests and Purchase Orders.
 * CIAMS design system: search bar, paginated list, multi-select with checkboxes.
 * Similar to SelectItemForMaintenanceScreen but supports multi-select.
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
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { isLowStock } from '../../utils/inventoryUtils';
import { useAppSelector } from '../../store/hooks';
import { selectIsStoreIncharge } from '../../store/selectors/authSelectors';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  listItemsForSelectionPaginated,
  getItemsForSelectionCount,
  SELECTION_ITEMS_PAGE_SIZE,
} from '../../services/firebase/inventoryService';
import type { Item } from '../../types/inventory';
import type { DocumentSnapshot } from 'firebase/firestore';

export type SelectItemsScreenParams = {
  returnScreen: string;
  returnParams: Record<string, unknown>;
  excludeItemIds?: string[];
  allowedItemTypes?: string[];
};

const SEARCH_DEBOUNCE_MS = 400;

export const SelectItemsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params ?? {}) as SelectItemsScreenParams;
  const { returnScreen, returnParams = {}, excludeItemIds = [], allowedItemTypes } = params;

  const [items, setItems] = useState<Item[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  const isForPO = returnScreen === 'CreatePO';
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  /** Store Incharge PO flow: pick from low-stock items only. SuperAdmin / others see full catalog. */
  const poSelectionLowStockOnly = isForPO && isStoreIncharge;

  const hasMore = items.length < (totalCount ?? 0) && lastDoc != null;
  const filteredItems = items
    .filter((item) => !excludeItemIds.includes(item.id))
    .filter((item) => (poSelectionLowStockOnly ? isLowStock(item) : true));

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
      if (debouncedSearch) {
        const listResult = await listItemsForSelectionPaginated(
          debouncedSearch,
          SELECTION_ITEMS_PAGE_SIZE,
          undefined,
          allowedItemTypes
        );
        setTotalCount(listResult.items.length);
        setItems(listResult.items);
        lastDocRef.current = listResult.lastDoc;
        setLastDoc(listResult.lastDoc);
      } else {
        const [countResult, listResult] = await Promise.all([
          getItemsForSelectionCount(undefined, allowedItemTypes),
          listItemsForSelectionPaginated(
            undefined,
            SELECTION_ITEMS_PAGE_SIZE,
            undefined,
            allowedItemTypes
          ),
        ]);
        setTotalCount(countResult);
        setItems(listResult.items);
        lastDocRef.current = listResult.lastDoc;
        setLastDoc(listResult.lastDoc);
      }
    } catch (error) {
      console.error('Error fetching items for selection:', error);
      setItems([]);
      setTotalCount(0);
      setLastDoc(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, allowedItemTypes]);

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
      const result = await listItemsForSelectionPaginated(
        debouncedSearch || undefined,
        SELECTION_ITEMS_PAGE_SIZE,
        lastDocRef.current,
        allowedItemTypes
      );
      setItems((prev) => [...prev, ...result.items]);
      lastDocRef.current = result.lastDoc;
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedSearch, loadingMore, hasMore, allowedItemTypes]);

  const toggleItem = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    const selected = filteredItems.filter((item) => selectedIds.has(item.id));
    if (selected.length === 0) return;

    // For CreatePO: use goBack + setParams to return to the EXISTING screen without
    // pushing a new one. navigation.navigate() can push a fresh CreatePO instance
    // (React Navigation 7), losing vendor details in component state.
    if (returnScreen === 'CreatePO') {
      try {
        const state = navigation.getState?.();
        const routes = state?.routes;
        const previousRoute = routes?.[routes.length - 2];
        if (previousRoute?.name === 'CreatePO' && typeof navigation.dispatch === 'function') {
          navigation.dispatch({
            ...CommonActions.setParams({
              ...returnParams,
              selectedItems: selected,
            }),
            source: previousRoute.key,
          });
          navigation.goBack();
          return;
        }
      } catch {
        // Fall through to navigate if getState/dispatch unavailable (e.g. in tests)
      }
    }

    // Fallback: navigate (for CreateRequest, EditRequest, or when previous route not found)
    // @ts-ignore - dynamic navigation params
    navigation.navigate(returnScreen as any, {
      ...returnParams,
      selectedItems: selected,
    } as any);
  }, [filteredItems, selectedIds, navigation, returnScreen, returnParams]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      const isSelected = selectedIds.has(item.id);

      return (
        <TouchableOpacity
          className={`bg-white rounded-[10px] p-4 border mb-3 min-h-[48px] ${
            isSelected ? 'border-[#1E40AF] bg-[#1E40AF]/5' : 'border-[#E2E8F0]'
          }`}
          onPress={() => toggleItem(item.id)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityLabel={`${item.name}, ${isSelected ? 'selected' : 'not selected'}`}
          accessibilityState={{ checked: isSelected }}
        >
          <View className="flex-row items-center">
            {/* Checkbox */}
            <View
              className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
                isSelected ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-white border-[#E2E8F0]'
              }`}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>

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
              <Text className="text-[13px] text-[#64748B]">
                SKU: {item.sku} • {item.categoryName ?? '—'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds, toggleItem]
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
          {poSelectionLowStockOnly
            ? debouncedSearch
              ? 'No low-stock items match your search'
              : 'No items below minimum stock'
            : debouncedSearch
              ? 'No items match your search'
              : 'No items available'}
        </Text>
        <Text className="text-[15px] text-[#64748B] mt-2 text-center">
          {poSelectionLowStockOnly
            ? debouncedSearch
              ? 'Try a different term (name, SKU, or category). Only low-stock items are shown for purchase orders.'
              : 'All items are above their minimum stock level. No purchase order needed.'
            : debouncedSearch
              ? 'Try a different term (name, SKU, or category). Only active items are shown.'
              : 'No active items in inventory.'}
        </Text>
      </View>
    );
  }, [loading, items.length, debouncedSearch, poSelectionLowStockOnly]);

  const isInitialLoad = loading && items.length === 0 && totalCount === null;
  const selectedCount = filteredItems.filter((i) => selectedIds.has(i.id)).length;

  if (isInitialLoad) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Select Items"
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
        title="Select Items"
        showBack
        onBackPress={handleBack}
      />

      {/* CIAMS Search Bar */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search by name, SKU, or category..."
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
            {poSelectionLowStockOnly
              ? `${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'} below minimum stock`
              : `Showing ${filteredItems.length} of ${totalCount} items`}
          </Text>
        )}
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 120,
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

      {/* Footer - CIAMS primary button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-3">
        <TouchableOpacity
          onPress={handleAdd}
          disabled={selectedCount === 0}
          className={`rounded-[10px] h-[50px] items-center justify-center ${
            selectedCount > 0 ? 'bg-[#1E40AF]' : 'bg-[#94A3B8]'
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Add ${selectedCount} selected items`}
          accessibilityState={{ disabled: selectedCount === 0 }}
        >
          <Text className="text-[15px] font-semibold text-white">
            Add {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};
