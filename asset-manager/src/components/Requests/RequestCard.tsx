import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Request } from '../../types/request';
import { RequestStatusBadge } from './RequestStatusBadge';

interface RequestCardProps {
  request: Request;
  onPress: () => void;
  showAvailability?: boolean;
  isAllSufficient?: boolean;
}

const priorityConfig = {
  high: { emoji: '🔴', color: '#DC2626' },
  medium: { emoji: '🟡', color: '#D97706' },
  low: { emoji: '🟢', color: '#16A34A' },
};

const formatDate = (timestamp: { toDate?: () => Date } | string | null | undefined): string => {
  if (!timestamp) return '';
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  const date = typeof (timestamp as { toDate?: () => Date }).toDate === 'function'
    ? (timestamp as { toDate: () => Date }).toDate()
    : new Date(timestamp as unknown as string);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onPress,
  showAvailability = false,
  isAllSufficient = false,
}) => {
  const priorityInfo =
    priorityConfig[request?.priority as keyof typeof priorityConfig] ??
    priorityConfig.medium;
  const itemCount = Array.isArray(request?.items) ? request.items.length : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Request ${request.requestNumber}`}
    >
      {/* Top Row: Request Number + Status Badge */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-lg">{priorityInfo.emoji}</Text>
          <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">
            {request?.requestNumber ?? '—'}
          </Text>
        </View>
        <RequestStatusBadge status={request.status} />
      </View>

      {/* Middle: Key Info */}
      <View className="flex-row gap-4 mb-3">
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B]">Site</Text>
          <Text className="text-[15px] text-[#0F172A]">{request?.siteName ?? '—'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B]">Items</Text>
          <Text className="text-[15px] text-[#0F172A]">{itemCount}</Text>
        </View>
      </View>

      {/* Availability Indicator (for Store Incharge) */}
      {showAvailability && (
        <View className={`p-2 rounded-lg mb-3 ${isAllSufficient ? 'bg-[#16A34A]/10' : 'bg-[#DC2626]/10'}`}>
          <View className="flex-row items-center gap-2">
            <Ionicons
              name={isAllSufficient ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={isAllSufficient ? '#16A34A' : '#DC2626'}
            />
            <Text className={`text-[13px] font-medium ${isAllSufficient ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {isAllSufficient ? 'All items available' : 'Insufficient stock'}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom: Divider + Footer */}
      <View className="border-t border-[#E2E8F0] pt-2 flex-row justify-between items-center">
        <Text className="text-[13px] text-[#64748B]">
          {formatDate(request.createdAt)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
};
