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
import { RequestCard } from '../../components/Requests/RequestCard';
import { requestService } from '../../services/firebase/requestService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setRequests, setLoading, setFilters } from '../../store/slices/requestsSlice';
import {
  selectFilteredRequestsSortedByDate,
  selectRequestsLoading,
  selectRequestsFilters,
} from '../../store/selectors/requestSelectors';
import { selectAllSites } from '../../store/selectors/sitesSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { fetchSites } from '../../store/slices/sitesSlice';
import type { Request } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type NavigationProp = StackNavigationProp<RequestStackParamList, 'RequestQueue'>;

export const RequestQueueScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const requests = useAppSelector(selectFilteredRequestsSortedByDate);
  const isLoading = useAppSelector(selectRequestsLoading);
  const filters = useAppSelector(selectRequestsFilters);
  const sites = useAppSelector(selectAllSites);
  const allItems = useAppSelector(selectAllItems);

  // Ensure inventory is loaded for availability display (isAllSufficient on RequestCard).
  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  // Ensure sites are loaded for the site filter chips.
  useEffect(() => {
    dispatch(fetchSites());
  }, [dispatch]);

  useEffect(() => {
    dispatch(setLoading(true));
    const unsubscribe = requestService.subscribeToRequests(
      {
        status: filters.status,
        siteId: filters.siteId,
      },
      (reqs) => {
        dispatch(setRequests(reqs));
      }
    );
    return unsubscribe;
  }, [dispatch, filters.status, filters.siteId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleRequestPress = useCallback(
    (request: Request) => {
      navigation.navigate('ProcessRequest', { requestId: request.id });
    },
    [navigation]
  );

  const renderFilterChip = useCallback(
    (
      label: string,
      isActive: boolean,
      onPress: () => void,
      accessibilityLabel: string
    ) => (
      <TouchableOpacity
        className={`px-4 py-2 rounded-full border min-h-[40px] justify-center ${
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

  const renderRequestCard = useCallback(
    ({ item }: { item: Request }) => {
      const isAllSufficient = item.items.every((ri) => {
        const invItem = allItems.find((i) => i.id === ri.itemId);
        const available = invItem?.centralStoreQuantity ?? 0;
        return available >= ri.quantityRequested;
      });
      return (
        <View className="px-4 pb-3">
          <RequestCard
            request={item}
            onPress={() => handleRequestPress(item)}
            showAvailability
            isAllSufficient={isAllSufficient}
          />
        </View>
      );
    },
    [handleRequestPress, allItems]
  );

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.siteId !== 'all' ||
    filters.priority !== 'all';

  if (isLoading && requests.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Request Queue" />
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading requests"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading requests...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Request Queue" />

      {/* Filters */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] text-[#64748B]">Priority:</Text>
            {renderFilterChip(
              'All',
              filters.priority === 'all',
              () => dispatch(setFilters({ priority: 'all' })),
              'Filter by all priorities'
            )}
            {renderFilterChip(
              'High',
              filters.priority === 'high',
              () => dispatch(setFilters({ priority: 'high' })),
              'Filter by high priority'
            )}
            {renderFilterChip(
              'Medium',
              filters.priority === 'medium',
              () => dispatch(setFilters({ priority: 'medium' })),
              'Filter by medium priority'
            )}
            {renderFilterChip(
              'Low',
              filters.priority === 'low',
              () => dispatch(setFilters({ priority: 'low' })),
              'Filter by low priority'
            )}
          </View>
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 8 }}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] text-[#64748B]">Site:</Text>
            {renderFilterChip(
              'All',
              filters.siteId === 'all',
              () => dispatch(setFilters({ siteId: 'all' })),
              'Filter by all sites'
            )}
            {sites.map((site) => (
              <React.Fragment key={site.id}>
                {renderFilterChip(
                  site.name,
                  filters.siteId === site.id,
                  () => dispatch(setFilters({ siteId: site.id })),
                  `Filter by ${site.name}`
                )}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 8 }}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] text-[#64748B]">Status:</Text>
            {renderFilterChip(
              'All',
              filters.status === 'all',
              () => dispatch(setFilters({ status: 'all' })),
              'Filter by all statuses'
            )}
            {renderFilterChip(
              'Pending',
              filters.status === 'pending',
              () => dispatch(setFilters({ status: 'pending' })),
              'Filter by pending'
            )}
            {renderFilterChip(
              'Approved',
              filters.status === 'approved',
              () => dispatch(setFilters({ status: 'approved' })),
              'Filter by approved'
            )}
            {renderFilterChip(
              'Transferred',
              filters.status === 'transferred',
              () => dispatch(setFilters({ status: 'transferred' })),
              'Filter by transferred'
            )}
            {renderFilterChip(
              'Partially Returned',
              filters.status === 'partially_returned',
              () => dispatch(setFilters({ status: 'partially_returned' })),
              'Filter by partially returned'
            )}
            {renderFilterChip(
              'Returned',
              filters.status === 'returned',
              () => dispatch(setFilters({ status: 'returned' })),
              'Filter by returned'
            )}
          </View>
        </ScrollView>
      </View>

      {requests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="document-text-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Requests Found
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more requests.'
              : 'No requests in the queue yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestCard}
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
