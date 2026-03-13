import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  ActivityLogCard,
  ActivityLogFilterModal,
  ActivityLogDetailModal,
} from '../../components/ActivityLog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectActivityLogs,
  selectActivityLogLoading,
  selectActivityLogLoadingMore,
  selectActivityLogExportLoading,
  selectActivityLogError,
  selectHasMoreLogs,
  selectActivityLogTotalCount,
  selectActivityLogFilters,
} from '../../store/selectors/activityLogSelectors';
import {
  fetchActivityLogs,
  loadMoreActivityLogs,
  exportActivityLogsThunk,
} from '../../store/thunks/activityLogThunks';
import {
  setFilters,
  setSearchQuery,
  clearFilters,
  clearError,
} from '../../store/slices/activityLogSlice';
import type { ActivityLog } from '../../types/activityLog';

export const ActivityLogScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  const logs = useAppSelector(selectActivityLogs);
  const loading = useAppSelector(selectActivityLogLoading);
  const loadingMore = useAppSelector(selectActivityLogLoadingMore);
  const exportLoading = useAppSelector(selectActivityLogExportLoading);
  const error = useAppSelector(selectActivityLogError);
  const hasMore = useAppSelector(selectHasMoreLogs);
  const totalCount = useAppSelector(selectActivityLogTotalCount);
  const filters = useAppSelector(selectActivityLogFilters);

  // Client-side search filter (searchQuery is not in Firestore query)
  const filteredLogs = useMemo(() => {
    const q = (filters.searchQuery ?? '').toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.userName.toLowerCase().includes(q) ||
        (log.targetDisplay ?? '').toLowerCase().includes(q) ||
        (log.summary ?? '').toLowerCase().includes(q) ||
        (log.details ?? '').toLowerCase().includes(q)
    );
  }, [logs, filters.searchQuery]);

  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Fetch paginated logs on mount and when filters change
  useEffect(() => {
    dispatch(fetchActivityLogs());
  }, [dispatch, filters.startDate, filters.endDate, filters.userId, filters.actionCategory, filters.actionType]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchActivityLogs()).finally(() =>
      setTimeout(() => setRefreshing(false), 300)
    );
  }, [dispatch]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      dispatch(loadMoreActivityLogs());
    }
  }, [dispatch, hasMore, loadingMore]);

  // Export handler
  const handleExport = useCallback(async () => {
    await dispatch(exportActivityLogsThunk());
  }, [dispatch]);

  // Filter apply handler
  const handleApplyFilters = useCallback(
    (newFilters: Parameters<typeof setFilters>[0]) => {
      dispatch(setFilters(newFilters));
      // Filters change will trigger useEffect to resubscribe
    },
    [dispatch]
  );

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
    // Filter clear will trigger useEffect to resubscribe
  }, [dispatch]);

  // Search change handler (client-side only, no refetch)
  const handleSearchChange = useCallback(
    (text: string) => {
      dispatch(setSearchQuery(text ?? ''));
    },
    [dispatch]
  );

  // Card press handler
  const handleCardPress = useCallback((log: ActivityLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  }, []);

  useAutoClearError(error, () => dispatch(clearError()));

  // Check if filters or search are applied
  const hasActiveFilters =
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.userId) ||
    (filters.actionCategory && filters.actionCategory !== 'all') ||
    (filters.actionType && filters.actionType !== 'all') ||
    Boolean(filters.searchQuery?.trim());

  // Avoid flash of empty state: show loader when no fetch has completed yet
  const isInitialOrRefetching =
    logs.length === 0 && totalCount === null && !error;
  if (
    isInitialOrRefetching ||
    (loading && logs.length === 0)
  ) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Activity Log" />
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading activity logs"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Activity Log"
        rightAction={{
          label: exportLoading ? 'Exporting...' : 'Export',
          onPress: handleExport,
          loading: exportLoading,
          accessibilityLabel: 'Export logs as CSV',
        }}
      />

      {/* Error Banner */}
      {error && (
        <View className="bg-[#DC2626]/15 px-4 py-3 mx-4 mb-3 rounded-lg">
          <Text className="text-[13px] text-[#DC2626]">{error}</Text>
        </View>
      )}

      {/* CIAMS Search Bar - always visible above filter */}
      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search by user, target, summary, or details..."
            placeholderTextColor="#94A3B8"
            value={filters.searchQuery ?? ''}
            onChangeText={handleSearchChange}
            accessibilityLabel="Search activity logs"
            accessibilityRole="search"
          />
          {(filters.searchQuery?.length ?? 0) > 0 && (
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

      {/* Filter Bar - minimum 48px height */}
      <View className="px-4 pb-3 flex-row items-center gap-2 min-h-[48px]">
        <TouchableOpacity
          className="flex-1 border border-[#E2E8F0] rounded-[10px] h-12 px-4 flex-row items-center justify-between min-h-[48px]"
          onPress={() => setFilterModalVisible(true)}
          accessibilityLabel="Open filters"
          accessibilityRole="button"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="funnel-outline" size={20} color="#64748B" />
            <Text className="text-[15px] text-[#0F172A]">
              {hasActiveFilters ? 'Filters Applied' : 'All Logs'}
            </Text>
            {hasActiveFilters && (
              <View className="w-2 h-2 rounded-full bg-[#1E40AF]" />
            )}
          </View>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity
            className="w-12 h-12 border border-[#E2E8F0] rounded-[10px] items-center justify-center min-h-[48px] min-w-[48px]"
            onPress={handleClearFilters}
            accessibilityLabel="Clear filters"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Total count: "Showing X of Y" */}
      {totalCount != null && logs.length > 0 && (
        <View className="px-4 pb-2">
          <Text className="text-[13px] text-[#64748B]">
            Showing {filteredLogs.length} of {totalCount} activity logs
            {filters.searchQuery && ' (filtered by search)'}
          </Text>
        </View>
      )}

      {/* Activity Log List */}
      <FlatList
        data={filteredLogs}
        renderItem={({ item }) => (
          <ActivityLogCard
            log={item}
            onPress={() => handleCardPress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1E40AF']}
            tintColor="#1E40AF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="items-center justify-center py-12 px-4">
            <Ionicons
              name="document-text-outline"
              size={80}
              color="#94A3B8"
            />
            <Text className="text-[22px] font-semibold text-[#0F172A] text-center mt-4 mb-2">
              {hasActiveFilters || filters.searchQuery
                ? 'No Logs Match Your Filters'
                : 'No Activity Logs Yet'}
            </Text>
            <Text className="text-[15px] text-[#64748B] text-center">
              {hasActiveFilters || filters.searchQuery
                ? 'Try adjusting your filters to see more results'
                : 'Activity will appear here as users interact with the system'}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#1E40AF" />
            </View>
          ) : hasMore ? (
            <View className="py-4 items-center">
              <TouchableOpacity
                className="px-6 py-2 rounded-lg bg-[#1E40AF]/10"
                onPress={() => handleLoadMore()}
                accessibilityLabel="Load more activity logs"
              >
                <Text className="text-[15px] font-medium text-[#1E40AF]">
                  Load more
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Modals */}
      <ActivityLogFilterModal
        visible={filterModalVisible}
        filters={filters}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
      />

      <ActivityLogDetailModal
        visible={detailModalVisible}
        log={selectedLog}
        onClose={() => setDetailModalVisible(false)}
      />
    </ScreenLayout>
  );
};
