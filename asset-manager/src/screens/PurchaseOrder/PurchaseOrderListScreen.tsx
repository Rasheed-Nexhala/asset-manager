import React, { useEffect, useCallback, useState } from 'react';
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
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { POCard } from '../../components/PurchaseOrder/POCard';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setFilters,
  setPurchaseOrdersFromSubscription,
  setLoading,
  setError,
  clearError,
} from '../../store/slices/purchaseOrderSlice';
import { loadMorePurchaseOrders } from '../../store/thunks/purchaseOrderThunks';
import { subscribeToPurchaseOrders } from '../../services/firebase/purchaseOrderService';
import {
  selectFilteredPurchaseOrdersForViewer,
  selectPurchaseOrderLoading,
  selectPurchaseOrderLoadingMore,
  selectPurchaseOrderFilters,
  selectPurchaseOrderTotalCount,
  selectVisiblePurchaseOrderCount,
  selectPurchaseOrderHasMore,
  selectPurchaseOrderError,
} from '../../store/selectors/purchaseOrderSelectors';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'PurchaseOrderList'
>;

export const PurchaseOrderListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryTrigger, setRetryTrigger] = useState(0);

  const orders = useAppSelector((state) =>
    selectFilteredPurchaseOrdersForViewer(state, searchQuery)
  );
  const isLoading = useAppSelector(selectPurchaseOrderLoading);
  const loadingMore = useAppSelector(selectPurchaseOrderLoadingMore);
  const totalCount = useAppSelector(selectPurchaseOrderTotalCount);
  const visibleTotalCount = useAppSelector(selectVisiblePurchaseOrderCount);
  const hasMore = useAppSelector(selectPurchaseOrderHasMore);
  const error = useAppSelector(selectPurchaseOrderError);
  const filters = useAppSelector(selectPurchaseOrderFilters);

  // Real-time Firestore subscription when screen is focused
  useEffect(() => {
    if (!isFocused) return;

    dispatch(setLoading(true));
    dispatch(clearError());

    const statusFilter =
      filters.status !== 'all' ? filters.status : undefined;

    const unsubscribe = subscribeToPurchaseOrders(
      (ordersData, err) => {
        if (err) {
          dispatch(setLoading(false));
          dispatch(setError(err.message));
        } else {
          dispatch(setPurchaseOrdersFromSubscription(ordersData));
        }
      },
      statusFilter
    );

    return () => unsubscribe();
  }, [isFocused, filters.status, dispatch, retryTrigger]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRetryTrigger((t) => t + 1);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  const handleRetry = useCallback(() => {
    dispatch(clearError());
    setRetryTrigger((t) => t + 1);
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    dispatch(loadMorePurchaseOrders());
  }, [dispatch, hasMore, loadingMore]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handlePOPress = useCallback(
    (po: PurchaseOrder) => {
      if (po.status === 'draft') {
        navigation.navigate('CreatePO', { poId: po.id });
      } else if (po.status === 'pending_approval') {
        navigation.navigate('ApprovePO', { poId: po.id });
      } else if (po.status === 'approved' || po.status === 'ordered') {
        navigation.navigate('ReceivePO', { poId: po.id });
      } else {
        navigation.navigate('ApprovePO', { poId: po.id });
      }
    },
    [navigation]
  );

  const renderFilterChip = useCallback(
    (
      label: string,
      value: string,
      accessibilityLabel: string
    ) => (
      <TouchableOpacity
        className={`px-4 py-2 rounded-full border ${
          filters.status === value
            ? 'bg-[#1E40AF] border-[#1E40AF]'
            : 'bg-white border-[#E2E8F0]'
        }`}
        onPress={() => dispatch(setFilters({ status: value }))}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: filters.status === value }}
      >
        <Text
          className={`text-[13px] font-medium ${
            filters.status === value ? 'text-white' : 'text-[#64748B]'
          }`}
        >
          {label}
        </Text>
      </TouchableOpacity>
    ),
    [dispatch, filters.status]
  );

  const renderItem = useCallback(
    ({ item }: { item: PurchaseOrder }) => (
      <View className="px-4 pb-3">
        <POCard po={item} onPress={() => handlePOPress(item)} />
      </View>
    ),
    [handlePOPress]
  );

  const isInitialOrRefetching =
    orders.length === 0 && totalCount === null && !error;
  if (isInitialOrRefetching || (isLoading && orders.length === 0)) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Purchase Orders"
          rightAction={{
            icon: 'add',
            onPress: () => navigation.navigate('CreatePO', {}),
            label: 'New',
          }}
        />
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading purchase orders"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading purchase orders...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Purchase Orders"
        rightAction={{
          icon: 'add',
          onPress: () => navigation.navigate('CreatePO', {}),
          label: 'New',
        }}
      />

      {error && (
        <View className="bg-[#DC2626]/15 px-4 py-3 border-b border-[#DC2626]/30 flex-row items-center justify-between">
          <Text className="text-[14px] text-[#DC2626] flex-1">{error}</Text>
          <TouchableOpacity
            onPress={handleRetry}
            className="ml-2 px-3 py-1.5 bg-[#DC2626] rounded-lg"
          >
            <Text className="text-[13px] font-medium text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search by PO number, vendor, or item..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            accessibilityLabel="Search purchase orders"
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

      {visibleTotalCount > 0 && (
        <View className="bg-white border-b border-[#E2E8F0] px-4 py-2">
          <Text className="text-[13px] text-[#64748B]">
            {searchQuery.trim()
              ? `Showing ${orders.length} of ${visibleTotalCount} purchase orders`
              : `${visibleTotalCount} purchase order${visibleTotalCount === 1 ? '' : 's'}`}
          </Text>
        </View>
      )}

      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] text-[#64748B]">Status:</Text>
            {renderFilterChip('All', 'all', 'Filter by all statuses')}
            {renderFilterChip(
              'Pending',
              'pending_approval',
              'Filter by pending approval'
            )}
            {renderFilterChip('Approved', 'approved', 'Filter by approved')}
            {renderFilterChip('Received', 'received', 'Filter by received')}
            {renderFilterChip('Draft', 'draft', 'Filter by draft')}
            {renderFilterChip('Rejected', 'rejected', 'Filter by rejected')}
          </View>
        </ScrollView>
      </View>

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons
            name={error ? 'cloud-offline-outline' : 'receipt-outline'}
            size={80}
            color="#64748B"
          />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            {error
              ? 'Could not load purchase orders'
              : searchQuery.trim()
                ? 'No purchase orders match your search'
                : 'No Purchase Orders'}
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            {error
              ? 'Check your connection and tap Retry above.'
              : searchQuery.trim()
                ? 'No purchase orders match your search. Try different keywords.'
                : filters.status !== 'all'
                  ? 'Try adjusting your filters to see more orders.'
                  : 'Create your first purchase order to get started.'}
          </Text>
          {(filters.status === 'all' || error) && !searchQuery.trim() && (
            <TouchableOpacity
              onPress={() => navigation.navigate('CreatePO', {})}
              className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center"
            >
              <Text className="text-[15px] font-semibold text-white">
                Create Purchase Order
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1E40AF"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#1E40AF" />
              </View>
            ) : hasMore ? (
              <TouchableOpacity
                onPress={handleLoadMore}
                className="py-4 items-center"
                accessibilityRole="button"
                accessibilityLabel="Load more purchase orders"
              >
                <Text className="text-[15px] font-medium text-[#1E40AF]">
                  Load more
                </Text>
              </TouchableOpacity>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenLayout>
  );
};
