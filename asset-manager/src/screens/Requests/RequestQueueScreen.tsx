import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
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
import { setRequests } from '../../store/slices/requestsSlice';
import {
  selectRequestsByPriority,
  selectRequestsLoading,
  selectRequestsFilters,
} from '../../store/selectors/requestSelectors';
import { selectAllSites } from '../../store/selectors/sitesSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { setFilters } from '../../store/slices/requestsSlice';
import type { Request } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type NavigationProp = StackNavigationProp<RequestStackParamList, 'RequestQueue'>;

interface SectionData {
  title: string;
  data: Request[];
  key: string;
}

export const RequestQueueScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const requestsByPriority = useAppSelector(selectRequestsByPriority);
  const isLoading = useAppSelector(selectRequestsLoading);
  const filters = useAppSelector(selectRequestsFilters);
  const sites = useAppSelector(selectAllSites);
  const allItems = useAppSelector(selectAllItems);

  const sections = useMemo<SectionData[]>(() => {
    const result: SectionData[] = [];
    const priorityOrder: Array<'high' | 'medium' | 'low'> = [
      'high',
      'medium',
      'low',
    ];
    const titles = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };

    priorityOrder.forEach((p) => {
      const requests = requestsByPriority[p] || [];
      if (requests.length > 0) {
        result.push({
          title: titles[p],
          data: requests,
          key: p,
        });
      }
    });

    return result;
  }, [requestsByPriority]);

  // Ensure inventory is loaded for availability display (isAllSufficient on RequestCard).
  // Without this, going directly to Requests tab without visiting Inventory first
  // leaves items empty, causing "Insufficient stock" even when stock exists.
  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = requestService.subscribeToRequests(
      {
        status: filters.status,
        siteId: filters.siteId,
      },
      (requests) => {
        dispatch(setRequests(requests));
      }
    );
    return unsubscribe;
  }, [dispatch, filters.status, filters.siteId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Subscription is real-time; data is kept current. Brief delay for UX.
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleRequestPress = useCallback(
    (request: Request) => {
      navigation.navigate('ProcessRequest', { requestId: request.id });
    },
    [navigation]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View className="bg-[#F8FAFC] px-4 py-2">
        <Text className="text-[15px] font-semibold text-[#0F172A]">
          {section.title}
        </Text>
      </View>
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

  const renderFilterChip = useCallback(
    (
      label: string,
      isActive: boolean,
      onPress: () => void,
      accessibilityLabel: string
    ) => (
      <TouchableOpacity
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

  const totalCount = sections.reduce((sum, s) => sum + s.data.length, 0);

  if (isLoading && totalCount === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Request Queue" />
        <View className="flex-1 items-center justify-center">
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

      {totalCount === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="document-text-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Requests Found
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            {filters.status !== 'all' || filters.siteId !== 'all'
              ? 'Try adjusting your filters to see more requests.'
              : 'No requests in the queue yet.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestCard}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1E40AF"
            />
          }
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenLayout>
  );
};
