import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityLog } from '../../types/activityLog';
import {
  ACTION_TYPE_CONFIG,
  ACTION_CATEGORY_CONFIG,
  CATEGORY_BADGE_BG_CLASS,
  CATEGORY_TEXT_CLASS,
  CATEGORY_COLOR_MAP,
} from '../../constants/activityLogConfig';

interface ActivityLogCardProps {
  log: ActivityLog;
  onPress: () => void;
}

/** Format timestamp as relative time (e.g., "2h ago", "Just now") */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function ActivityLogCard({ log, onPress }: ActivityLogCardProps) {
  const actionConfig = ACTION_TYPE_CONFIG[log.actionType] ?? {
    label: log.actionType,
    icon: 'document-text-outline',
    category: log.actionCategory,
  };

  const category = actionConfig.category ?? log.actionCategory;
  const categoryConfig = ACTION_CATEGORY_CONFIG[category];
  const categoryColor = CATEGORY_COLOR_MAP[category as keyof typeof CATEGORY_COLOR_MAP] ?? '#475569';
  const badgeBgClass =
    CATEGORY_BADGE_BG_CLASS[category as keyof typeof CATEGORY_BADGE_BG_CLASS] ??
    'bg-[#475569]/15';
  const textClass =
    CATEGORY_TEXT_CLASS[category as keyof typeof CATEGORY_TEXT_CLASS] ??
    'text-[#475569]';

  return (
    <TouchableOpacity
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3 min-h-[120px]"
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={`Activity: ${actionConfig.label}. ${log.summary}. By ${log.userName}. Tap for details.`}
      accessibilityRole="button"
    >
      {/* Top Row: Title + Status Badge (status first per CIAMS) */}
      <View className="flex-row justify-between items-center gap-3 mb-3">
        <View className="flex-row items-center gap-3 flex-1 min-w-0">
          {/* Icon in rounded bg with semantic color (Compact Activity Card pattern) */}
          <View
            className={`w-9 h-9 rounded-full items-center justify-center ${badgeBgClass}`}
          >
            <Ionicons
              name={actionConfig.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={categoryColor}
            />
          </View>
          <Text
            className="text-[15px] font-semibold text-[#0F172A] flex-1"
            numberOfLines={2}
          >
            {actionConfig.label}
          </Text>
        </View>
        <View
          className={`px-2 py-1 rounded-full shrink-0 ${badgeBgClass}`}
        >
          <Text
            className={`text-[12px] font-medium ${textClass}`}
          >
            {categoryConfig?.label ?? category}
          </Text>
        </View>
      </View>

      {/* Middle: Key-Value Grid (User, Target) */}
      <View className="flex-row gap-4 mb-3">
        <View className="flex-1 min-w-0">
          <Text className="text-[13px] text-[#64748B] mb-1">User</Text>
          <Text
            className="text-[15px] text-[#0F172A]"
            numberOfLines={1}
          >
            {log.userName}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[13px] text-[#64748B] mb-1">Target</Text>
          <Text
            className="text-[15px] text-[#1E40AF] font-medium"
            numberOfLines={1}
          >
            {log.targetDisplay}
          </Text>
        </View>
      </View>

      {/* Bottom Row: Timestamp */}
      <View className="border-t border-[#E2E8F0] pt-3">
        <Text className="text-[13px] text-[#64748B]">
          {formatTimestamp(log.timestamp)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
