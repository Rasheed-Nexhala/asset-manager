/**
 * Inventory Update Request Card
 *
 * Displays an inventory update request for Admin review.
 * Shows requester name, role, reason, createdAt, status badge.
 * Pending requests show [Approve] [Reject] buttons.
 * Uses StockStatusBadge pattern for status (pending=warning, approved=success, rejected=danger).
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryUpdateRequest, InventoryUpdateRequestStatus } from '../../types/inventoryUpdateRequest';
import { formatInventoryUpdateAccessScopesLabel } from '../../types/inventoryUpdateRequest';

const STATUS_CONFIG: Record<
  InventoryUpdateRequestStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: 'bg-[#D97706]/15', text: 'text-[#D97706]', label: 'Pending' },
  approved: { bg: 'bg-[#16A34A]/15', text: 'text-[#16A34A]', label: 'Approved' },
  rejected: { bg: 'bg-[#DC2626]/15', text: 'text-[#DC2626]', label: 'Rejected' },
};

export interface InventoryUpdateRequestCardProps {
  request: InventoryUpdateRequest;
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export const InventoryUpdateRequestCard: React.FC<InventoryUpdateRequestCardProps> = ({
  request,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}) => {
  const statusConfig = STATUS_CONFIG[request.status];
  const isPending = request.status === 'pending';
  const isDisabled = isApproving || isRejecting;

  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      {/* Top Row: Requester + Status Badge */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-[#0F172A]">{request.requestedByName}</Text>
          <Text className="text-[13px] text-[#64748B]">{request.requestedByRole}</Text>
          <Text className="text-[12px] text-[#64748B] mt-1">
            {formatInventoryUpdateAccessScopesLabel(request.accessScopes)}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${statusConfig.bg}`}>
          <Text className={`text-[12px] font-medium ${statusConfig.text}`}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Reason */}
      <View className="mb-3">
        <Text className="text-[13px] text-[#64748B] mb-1">Reason</Text>
        <Text className="text-[15px] text-[#0F172A]">{request.reason}</Text>
      </View>

      {/* Timestamp */}
      <Text className="text-[13px] text-[#64748B] mb-3">
        {formatRelativeTime(request.createdAt)}
      </Text>

      {/* Action Buttons (only when pending) */}
      {isPending && onApprove && onReject && (
        <View className="flex-row gap-3 pt-2 border-t border-[#E2E8F0]">
          <TouchableOpacity
            className="flex-1 bg-[#16A34A] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
            onPress={onApprove}
            disabled={isDisabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Approve request"
            accessibilityState={{ disabled: isDisabled, busy: isApproving }}
          >
            {isApproving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            )}
            <Text className="text-[15px] font-semibold text-white">Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-[#DC2626] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
            onPress={onReject}
            disabled={isDisabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reject request"
            accessibilityState={{ disabled: isDisabled, busy: isRejecting }}
          >
            {isRejecting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Ionicons name="close-circle" size={22} color="#DC2626" />
            )}
            <Text className="text-[15px] font-semibold text-[#DC2626]">Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
