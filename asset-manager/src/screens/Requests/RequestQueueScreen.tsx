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
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { RequestCard } from '../../components/Requests/RequestCard';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFilters } from '../../store/slices/requestsSlice';
import {
  fetchRequestsPaginated,
  loadMoreRequests,
  exportRequestsThunk,
} from '../../store/thunks/requestThunks';
import {
  selectFilteredAndSearchedRequestsSortedByDate,
  selectRequestsLoading,
  selectRequestsFilters,
  selectRequestsTotalCount,
  selectRequestsHasMore,
  selectRequestsLoadingMore,
} from '../../store/selectors/requestSelectors';
import { selectAllSites } from '../../store/selectors/sitesSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { fetchSites } from '../../store/slices/sitesSlice';
import { navigateToProcessRequest } from '../../navigation/navigationUtils';
import { selectCanManageRequests } from '../../store/selectors/authSelectors';
import type { Request } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type NavigationProp = StackNavigationProp<RequestStackParamList, 'RequestQueue'>;

export const RequestQueueScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const requests = useAppSelector((state) =>
    selectFilteredAndSearchedRequestsSortedByDate(state, searchQuery)
  );
  const isLoading = useAppSelector(selectRequestsLoading);
  const filters = useAppSelector(selectRequestsFilters);
  const totalCount = useAppSelector(selectRequestsTotalCount);
  const hasMore = useAppSelector(selectRequestsHasMore);
  const loadingMore = useAppSelector(selectRequestsLoadingMore);
  const sites = useAppSelector(selectAllSites);
  const allItems = useAppSelector(selectAllItems);
  const canManageRequests = useAppSelector(selectCanManageRequests);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Ensure inventory is loaded for availability display (isAllSufficient on RequestCard).
  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  // Ensure sites are loaded for the site filter chips.
  useEffect(() => {
    dispatch(fetchSites());
  }, [dispatch]);

  useEffect(() => {
    // Frontend search filters the currently loaded pages in memory.
    // We only refetch when status or siteId filters change.
    dispatch(fetchRequestsPaginated());
  }, [dispatch, filters.status, filters.siteId]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      dispatch(loadMoreRequests());
    }
  }, [dispatch, hasMore, loadingMore]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Refresh both requests AND items so availability (centralStoreQuantity) is up-to-date
    Promise.all([
      dispatch(fetchRequestsPaginated()),
      dispatch(fetchItems()),
    ]).finally(() => setTimeout(() => setRefreshing(false), 800));
  }, [dispatch]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleToggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    await dispatch(exportRequestsThunk());
    setIsExporting(false);
  }, [dispatch]);

  const handleRequestPress = useCallback(
    (request: Request) => {
      navigateToProcessRequest(request.id);
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
      // Only show availability for pending/approved; hide once transferred, returned, etc.
      const showAvailability =
        canManageRequests &&
        (item.status === 'pending' || item.status === 'approved');

      // Site transfers use source-site inventory, not central store. We don't have
      // per-site inventory in the list, so show "View to check" instead of wrong status.
      const isSiteTransfer = item.requestType === 'site_transfer';
      const availabilityUnknown = isSiteTransfer;

      const isAllSufficient = availabilityUnknown
        ? false // Not used when unknown
        : item.items.every((ri) => {
            const invItem = allItems.find((i) => i.id === ri.itemId);
            const available = invItem?.centralStoreQuantity ?? 0;
            return available >= ri.quantityRequested;
          });

      return (
        <View className="px-4 pb-3">
          <RequestCard
            request={item}
            onPress={() => handleRequestPress(item)}
            showAvailability={showAvailability}
            isAllSufficient={isAllSufficient}
            availabilityUnknown={availabilityUnknown}
          />
        </View>
      );
    },
    [handleRequestPress, allItems, canManageRequests]
  );

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.siteId !== 'all' ||
    filters.priority !== 'all' ||
    searchQuery.trim().length > 0;

  const isInitialOrRefetching = requests.length === 0 && totalCount === null;
  if (isInitialOrRefetching || (isLoading && requests.length === 0)) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Request Queue"
          rightActions={[
            {
              icon: 'download-outline',
              onPress: handleExport,
              loading: isExporting,
              accessibilityLabel: 'Export Requests',
            }
          ]}
        />
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
      <ScreenHeader
        title="Request Queue"
        rightActions={[
          {
            icon: 'download-outline',
            onPress: handleExport,
            loading: isExporting,
            accessibilityLabel: 'Export Requests',
          },
          {
            icon: showFilters ? 'filter' : 'filter-outline',
            iconColor: showFilters ? '#1E40AF' : '#64748B',
            onPress: handleToggleFilters,
            accessibilityLabel: 'Toggle filters',
          }
        ]}
      />

      {/* CIAMS Search Bar */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search by request number, site, requester, purpose, or item..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            accessibilityLabel="Search requests"
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

      {/* CIAMS Filters Section (collapsible, like Inventory) */}
      {showFilters && (
        <View className="bg-white border-b border-[#E2E8F0] px-4 py-4">
          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]">Priority</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <View className="flex-row items-center gap-2">
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
            </View>
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]">Site</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <View className="flex-row items-center gap-2">
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
            </View>
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]">Status</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <View className="flex-row items-center gap-2">
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
          </View>
        </View>
      )}

      {requests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="document-text-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Requests Found
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            {hasActiveFilters
              ? 'Try adjusting your filters or search to see more requests.'
              : 'No requests in the queue yet.'}
          </Text>
        </View>
      ) : (
        <>
          {totalCount != null && (
            <View className="bg-white px-4 py-2 border-b border-[#E2E8F0]">
              <Text className="text-[13px] text-[#64748B]">
                Showing {requests.length} of {totalCount}
              </Text>
            </View>
          )}
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestCard}
            contentContainerStyle={{ paddingVertical: 16, paddingBottom: 80 }}
            onEndReached={hasMore && !loadingMore ? handleLoadMore : undefined}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#1E40AF"
              />
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#1E40AF" />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </ScreenLayout>
  );
};
