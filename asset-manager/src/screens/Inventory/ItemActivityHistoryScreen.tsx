import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import type { DocumentSnapshot } from 'firebase/firestore';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ActivityLogCard, ActivityLogDetailModal } from '../../components/ActivityLog';
import {
  listActivityLogs,
  getActivityLogsCount,
  exportActivityLogs,
  ACTIVITY_LOGS_PAGE_SIZE,
} from '../../services/firebase/activityLogService';
import { saveCsvAndShare } from '../../utils/csvExport';
import type { ActivityLog, ActivityLogFiltersStore } from '../../types/activityLog';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type Nav = StackNavigationProp<InventoryStackParamList, 'ItemActivityHistory'>;

function buildItemFilters(itemId: string): ActivityLogFiltersStore {
  return {
    startDate: null,
    endDate: null,
    userId: null,
    actionCategory: 'all',
    actionType: 'all',
    searchQuery: '',
    targetType: 'item',
    targetId: itemId,
  };
}

/**
 * Audit trail for a single inventory item: quantity adjustments, edits, and other
 * activity logs recorded with targetType `item` and this item's id.
 * Search is client-side on the loaded page; the Firestore query is scoped to this item only.
 */
export const ItemActivityHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const { itemId, itemName } = (route.params as {
    itemId: string;
    itemName?: string;
  }) ?? { itemId: '' };

  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    setSearchQuery('');
  }, [itemId]);

  const fetchLogs = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const queryFilters = buildItemFilters(itemId);
      const [count, listResult] = await Promise.all([
        getActivityLogsCount(queryFilters),
        listActivityLogs(queryFilters, ACTIVITY_LOGS_PAGE_SIZE),
      ]);
      setLogs(listResult.logs);
      setLastDoc(listResult.lastDoc);
      setTotalCount(count);
      setHasMore(
        listResult.logs.length >= ACTIVITY_LOGS_PAGE_SIZE &&
          listResult.lastDoc != null
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load history';
      setError(msg);
      setLogs([]);
      setTotalCount(null);
      setLastDoc(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.userName.toLowerCase().includes(q) ||
        (log.targetDisplay ?? '').toLowerCase().includes(q) ||
        (log.summary ?? '').toLowerCase().includes(q) ||
        (log.details ?? '').toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs().finally(() => setTimeout(() => setRefreshing(false), 300));
  }, [fetchLogs]);

  const handleLoadMore = useCallback(async () => {
    if (!itemId || !lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const queryFilters = buildItemFilters(itemId);
      const { logs: next, lastDoc: nextLast } = await listActivityLogs(
        queryFilters,
        ACTIVITY_LOGS_PAGE_SIZE,
        lastDoc
      );
      setLogs((prev) => [...prev, ...next]);
      setLastDoc(nextLast);
      setHasMore(
        next.length >= ACTIVITY_LOGS_PAGE_SIZE && nextLast != null
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load more';
      setError(msg);
    } finally {
      setLoadingMore(false);
    }
  }, [itemId, lastDoc, hasMore, loadingMore]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text ?? '');
  }, []);

  const handleExport = useCallback(async () => {
    if (!itemId) return;
    setExportLoading(true);
    setError(null);
    try {
      const queryFilters = buildItemFilters(itemId);
      const csv = await exportActivityLogs({
        filters: queryFilters,
        maxRecords: 1000,
      });
      const safeName = (itemName ?? itemId).replace(/[^\w\-]+/g, '_').slice(0, 48);
      await saveCsvAndShare(csv, `item-history-${safeName}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      setError(msg);
    } finally {
      setExportLoading(false);
    }
  }, [itemId, itemName]);

  const hasSearchQuery = Boolean(searchQuery.trim());

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const title = itemName ? `History: ${itemName}` : 'Item history';

  if (!itemId) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Item history" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] text-[#64748B] text-center mb-4">
            Missing item. Go back and open an item from the inventory list.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const isInitialOrRefetching =
    logs.length === 0 && totalCount === null && !error;
  if (isInitialOrRefetching || (loading && logs.length === 0)) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title={title} showBack onBackPress={handleBack} />
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading item history"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading history...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title={title}
        showBack
        onBackPress={handleBack}
        rightAction={{
          label: exportLoading ? 'Exporting...' : 'Export',
          onPress: handleExport,
          loading: exportLoading,
          accessibilityLabel: 'Export item history as CSV',
        }}
      />

      {error && (
        <View className="bg-[#DC2626]/15 px-4 py-3 mx-4 mb-3 rounded-lg">
          <Text className="text-[13px] text-[#DC2626]">{error}</Text>
        </View>
      )}

      <View className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <View className="bg-[#F1F5F9] rounded-full h-12 px-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-[#0F172A]"
            placeholder="Search by user, summary, or details..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            accessibilityLabel="Search item history"
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

      {totalCount != null && logs.length > 0 && (
        <View className="px-4 pb-2">
          <Text className="text-[13px] text-[#64748B]">
            Showing {filteredLogs.length} of {totalCount} events
            {hasSearchQuery ? ' (filtered by search)' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredLogs}
        renderItem={({ item: logEntry }) => (
          <ActivityLogCard
            log={logEntry}
            variant="itemHistory"
            onPress={() => {
              setSelectedLog(logEntry);
              setDetailModalVisible(true);
            }}
          />
        )}
        keyExtractor={(row) => row.id}
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
            <Ionicons name="document-text-outline" size={80} color="#94A3B8" />
            <Text className="text-[22px] font-semibold text-[#0F172A] text-center mt-4 mb-2">
              {hasSearchQuery ? 'No events match' : 'No history yet'}
            </Text>
            <Text className="text-[15px] text-[#64748B] text-center">
              {hasSearchQuery
                ? 'Try a different search term.'
                : 'Stock changes, edits, and other audited actions for this item will appear here.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#1E40AF" />
            </View>
          ) : hasMore && logs.length > 0 ? (
            <View className="py-4 items-center">
              <TouchableOpacity
                className="px-6 py-2 rounded-lg bg-[#1E40AF]/10"
                onPress={handleLoadMore}
                accessibilityLabel="Load more"
              >
                <Text className="text-[15px] font-medium text-[#1E40AF]">
                  Load more
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <ActivityLogDetailModal
        visible={detailModalVisible}
        log={selectedLog}
        onClose={() => setDetailModalVisible(false)}
      />
    </ScreenLayout>
  );
};
