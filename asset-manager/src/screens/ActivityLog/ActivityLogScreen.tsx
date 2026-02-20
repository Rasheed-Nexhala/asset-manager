import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout, ScreenHeader } from '../../components';
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
  selectActivityLogFilters,
} from '../../store/selectors/activityLogSelectors';
import {
  loadMoreActivityLogs,
  exportActivityLogsThunk,
  subscribeToActivityLogsRealtime,
  unsubscribeFromActivityLogs,
} from '../../store/thunks/activityLogThunks';
import {
  setFilters,
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
  const filters = useAppSelector(selectActivityLogFilters);

  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Subscribe to real-time logs on mount and when filters change
  useEffect(() => {
    dispatch(subscribeToActivityLogsRealtime());

    // Cleanup: unsubscribe on unmount
    return () => {
      dispatch(unsubscribeFromActivityLogs());
    };
  }, [dispatch, filters]);

  // Refresh handler (resubscribe to force refresh)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      dispatch(subscribeToActivityLogsRealtime());
    } finally {
      // Small delay to show refresh animation
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [dispatch]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      dispatch(loadMoreActivityLogs());
    }
  }, [dispatch, loading, loadingMore, hasMore]);

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

  // Card press handler
  const handleCardPress = useCallback((log: ActivityLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  }, []);

  // Dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, dispatch]);

  // Check if filters are applied
  const hasActiveFilters =
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.userId) ||
    (filters.actionCategory && filters.actionCategory !== 'all') ||
    (filters.actionType && filters.actionType !== 'all');

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

      {/* Activity Log List */}
      <FlatList
        data={logs}
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
          loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading activity logs...
              </Text>
            </View>
          ) : (
            <View className="items-center justify-center py-12 px-4">
              <Ionicons
                name="document-text-outline"
                size={80}
                color="#94A3B8"
              />
              <Text className="text-[22px] font-semibold text-[#0F172A] text-center mt-4 mb-2">
                {hasActiveFilters
                  ? 'No Logs Match Your Filters'
                  : 'No Activity Logs Yet'}
              </Text>
              <Text className="text-[15px] text-[#64748B] text-center">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results'
                  : 'Activity will appear here as users interact with the system'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#1E40AF" />
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
