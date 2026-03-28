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
import {
  getItemHistoryPrimaryLine,
  getItemHistoryStockLines,
} from '../../utils/itemActivityHistoryDisplay';

interface ActivityLogCardProps {
  log: ActivityLog;
  onPress: () => void;
  /** Richer layout for inventory item audit trail (summary + central store line) */
  variant?: 'default' | 'itemHistory';
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

export default function ActivityLogCard({
  log,
  onPress,
  variant = 'default',
}: ActivityLogCardProps) {
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

  const primaryLine =
    variant === 'itemHistory' ? getItemHistoryPrimaryLine(log) : null;
  const stockLines =
    variant === 'itemHistory' ? getItemHistoryStockLines(log) : [];

  const a11ySummary =
    variant === 'itemHistory'
      ? `${actionConfig.label}. ${primaryLine ?? log.summary}. By ${log.userName}.${stockLines.length > 0 ? ` ${stockLines.join(' ')}` : ''}`
      : `${actionConfig.label}. ${log.summary}. By ${log.userName}.`;

  return (
    <TouchableOpacity
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3 min-h-[120px]"
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={`Activity: ${a11ySummary} Tap for details.`}
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

      {variant === 'itemHistory' && primaryLine ? (
        <View className="mb-3">
          <Text className="text-[13px] text-[#64748B] mb-1">What happened</Text>
          <Text className="text-[15px] text-[#0F172A] leading-snug">
            {primaryLine}
          </Text>
        </View>
      ) : null}

      {variant === 'itemHistory' && stockLines.length > 0 ? (
        <View className="bg-[#F1F5F9] rounded-lg px-3 py-2.5 mb-3 border border-[#E2E8F0]">
          <Text className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">
            Stock & quantities
          </Text>
          {stockLines.map((line, idx) => (
            <Text
              key={idx}
              className="text-[15px] text-[#0F172A] leading-snug mb-1.5 last:mb-0"
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Middle: user (item history: full width; default: user + target) */}
      <View
        className={
          variant === 'itemHistory' ? 'mb-3' : 'flex-row gap-4 mb-3'
        }
      >
        <View className={variant === 'itemHistory' ? 'w-full' : 'flex-1 min-w-0'}>
          <Text className="text-[13px] text-[#64748B] mb-1">Recorded by</Text>
          <Text
            className="text-[15px] text-[#0F172A]"
            numberOfLines={1}
          >
            {log.userName}
          </Text>
          {log.userRole ? (
            <Text className="text-[13px] text-[#64748B] mt-0.5" numberOfLines={1}>
              {log.userRole}
            </Text>
          ) : null}
        </View>
        {variant === 'default' ? (
          <View className="flex-1 min-w-0">
            <Text className="text-[13px] text-[#64748B] mb-1">Target</Text>
            <Text
              className="text-[15px] text-[#1E40AF] font-medium"
              numberOfLines={1}
            >
              {log.targetDisplay}
            </Text>
          </View>
        ) : null}
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
