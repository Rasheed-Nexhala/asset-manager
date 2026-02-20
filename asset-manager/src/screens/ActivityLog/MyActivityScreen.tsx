import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout, ScreenHeader } from '../../components';
import {
  ActivityLogCard,
  ActivityLogDetailModal,
} from '../../components/ActivityLog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectMyRecentActivitySorted,
  selectMyActivityLoading,
} from '../../store/selectors/activityLogSelectors';
import { selectUserId } from '../../store/selectors/authSelectors';
import {
  subscribeToMyRecentActivityRealtime,
  unsubscribeFromMyRecentActivity,
} from '../../store/thunks/activityLogThunks';
import type { ActivityLog } from '../../types/activityLog';

export const MyActivityScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const userId = useAppSelector(selectUserId);
  const recentActivity = useAppSelector(selectMyRecentActivitySorted);
  const loading = useAppSelector(selectMyActivityLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Subscribe to real-time activity on mount
  useEffect(() => {
    if (userId) {
      dispatch(subscribeToMyRecentActivityRealtime(userId));
    }

    // Cleanup: unsubscribe on unmount
    return () => {
      dispatch(unsubscribeFromMyRecentActivity());
    };
  }, [dispatch, userId]);

  // Refresh handler (resubscribe to force refresh)
  const handleRefresh = useCallback(async () => {
    if (!userId) return;

    setRefreshing(true);
    try {
      dispatch(subscribeToMyRecentActivityRealtime(userId));
    } finally {
      // Small delay to show refresh animation
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [dispatch, userId]);

  // Card press handler
  const handleCardPress = useCallback((log: ActivityLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  }, []);

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="My Recent Activity" />

      {/* Info Banner */}
      <View className="bg-[#1E40AF]/10 px-4 py-3 mx-4 mb-3 rounded-lg flex-row items-start gap-2">
        <Ionicons
          name="information-circle"
          size={20}
          color="#1E40AF"
        />
        <Text className="text-[13px] text-[#1E40AF] flex-1">
          Showing your last 10 actions in the system
        </Text>
      </View>

      {/* Activity List */}
      <FlatList
        data={recentActivity}
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1E40AF']}
            tintColor="#1E40AF"
          />
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading recent activity...
              </Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-4 py-12">
              <View className="mb-4">
                <Ionicons name="time-outline" size={80} color="#94A3B8" />
              </View>
              <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
                No recent activity
              </Text>
              <Text className="text-[15px] text-[#64748B] text-center mb-6">
                Your activity will appear here when you create requests or perform
                actions in the system
              </Text>
              <TouchableOpacity
                className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center"
                onPress={() =>
                  (navigation.getParent() as { navigate?: (name: string) => void })
                    ?.navigate?.('Requests')
                }
                activeOpacity={0.7}
                accessibilityLabel="Go to Requests"
                accessibilityRole="button"
              >
                <Text className="text-[15px] font-semibold text-white">
                  Create your first request
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Detail Modal */}
      <ActivityLogDetailModal
        visible={detailModalVisible}
        log={selectedLog}
        onClose={() => setDetailModalVisible(false)}
      />
    </ScreenLayout>
  );
};
