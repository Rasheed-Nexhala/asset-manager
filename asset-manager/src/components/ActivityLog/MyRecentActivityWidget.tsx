import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
import { ACTION_TYPE_CONFIG } from '../../constants/activityLogConfig';

interface MyRecentActivityWidgetProps {
  onViewAll?: () => void;
}

/** Format relative timestamp for widget list */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffHours < 24) {
    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (diffHours < 48) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export default function MyRecentActivityWidget({
  onViewAll,
}: MyRecentActivityWidgetProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const recentActivity = useAppSelector(selectMyRecentActivitySorted);
  const loading = useAppSelector(selectMyActivityLoading);

  // Subscribe to real-time updates when Dashboard is focused; unsubscribe when it loses focus.
  // This ensures maintenance and other activity logs auto-update when the user returns to the Dashboard.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        dispatch(subscribeToMyRecentActivityRealtime(userId));
      }

      // Cleanup: unsubscribe when tab/screen loses focus (e.g. user switches to Inventory)
      return () => {
        dispatch(unsubscribeFromMyRecentActivity());
      };
    }, [dispatch, userId])
  );

  if (loading) {
    return (
      <View
        className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] items-center justify-center min-h-[180px]"
        accessibilityLabel="Loading recent activity"
        accessibilityState={{ busy: true }}
      >
        <ActivityIndicator size="small" color="#1E40AF" />
        <Text className="text-[13px] text-[#64748B] mt-2">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[17px] font-semibold text-[#0F172A]">
          My Recent Activity
        </Text>
        {onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            className="min-h-[48px] min-w-[48px] items-center justify-center px-2"
            accessibilityLabel="View all activity"
            accessibilityRole="button"
          >
            <Text className="text-[15px] text-[#3B82F6]">
              View All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Activity List */}
      {recentActivity.length === 0 ? (
        <View className="items-center justify-center py-8">
          <Text className="text-6xl mb-4">📋</Text>
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
            No Recent Activity
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            Your activity will appear here as you use the app
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {recentActivity.slice(0, 5).map((log) => {
            const actionConfig = ACTION_TYPE_CONFIG[log.actionType] ?? {
              label: log.actionType,
              icon: 'document-text-outline',
              category: log.actionCategory,
            };
            return (
              <View
                key={log.id}
                className="flex-row items-center gap-3 py-3 border-b border-[#E2E8F0] last:border-b-0"
              >
                <View className="w-9 h-9 rounded-full bg-[#1E40AF]/15 items-center justify-center">
                  <Ionicons
                    name={actionConfig.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color="#1E40AF"
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-[15px] text-[#0F172A]" numberOfLines={1}>
                    {actionConfig.label}
                  </Text>
                  <Text className="text-[13px] text-[#64748B]" numberOfLines={1}>
                    {log.targetDisplay}
                  </Text>
                </View>
                <Text className="text-[13px] text-[#64748B]">
                  {formatTimestamp(log.timestamp)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
