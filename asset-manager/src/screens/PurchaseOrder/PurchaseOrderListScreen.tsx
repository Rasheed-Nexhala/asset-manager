import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { POCard } from '../../components/PurchaseOrder/POCard';
import { subscribeToPurchaseOrders } from '../../services/firebase/purchaseOrderService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setPurchaseOrders,
  setFilters,
  setLoading,
} from '../../store/slices/purchaseOrderSlice';
import {
  selectFilteredPurchaseOrders,
  selectPurchaseOrderLoading,
  selectPurchaseOrderFilters,
} from '../../store/selectors/purchaseOrderSelectors';
import { selectIsAdmin } from '../../store/selectors/authSelectors';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'PurchaseOrderList'
>;

export const PurchaseOrderListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const orders = useAppSelector(selectFilteredPurchaseOrders);
  const isLoading = useAppSelector(selectPurchaseOrderLoading);
  const filters = useAppSelector(selectPurchaseOrderFilters);
  const isAdmin = useAppSelector(selectIsAdmin);

  useEffect(() => {
    dispatch(setLoading(true));
    const unsubscribe = subscribeToPurchaseOrders(
      (poList) => {
        dispatch(setPurchaseOrders(poList));
      },
      filters.status !== 'all' ? filters.status : undefined
    );
    return unsubscribe;
  }, [dispatch, filters.status]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handlePOPress = useCallback(
    (po: PurchaseOrder) => {
      if (po.status === 'pending_approval' && isAdmin) {
        navigation.navigate('ApprovePO', { poId: po.id });
      } else if (
        (po.status === 'approved' || po.status === 'ordered') &&
        !['received', 'rejected'].includes(po.status)
      ) {
        navigation.navigate('ReceivePO', { poId: po.id });
      } else {
        navigation.navigate('CreatePO', { poId: po.id });
      }
    },
    [navigation, isAdmin]
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

  if (isLoading && orders.length === 0) {
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
            {renderFilterChip('Ordered', 'ordered', 'Filter by ordered')}
            {renderFilterChip('Received', 'received', 'Filter by received')}
            {renderFilterChip('Draft', 'draft', 'Filter by draft')}
            {renderFilterChip('Rejected', 'rejected', 'Filter by rejected')}
          </View>
        </ScrollView>
      </View>

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="receipt-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Purchase Orders
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center mb-6">
            {filters.status !== 'all'
              ? 'Try adjusting your filters to see more orders.'
              : 'Create your first purchase order to get started.'}
          </Text>
          {filters.status === 'all' && (
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
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenLayout>
  );
};
