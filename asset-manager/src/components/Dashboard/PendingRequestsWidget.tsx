import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

export interface PendingRequest {
  id: string;
  requestNumber: string;
  siteName: string;
  itemCount: number;
  hasInsufficient: boolean;
  insufficientCount?: number;
  priority: 'high' | 'normal' | 'low';
  createdAt: string;
}

export interface PendingRequestsWidgetProps {
  requests: PendingRequest[];
  onViewAll: () => void;
  onViewRequest: (id: string) => void;
  onApprove?: (id: string) => void;
  loading?: boolean;
}

function formatTimeAgo(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Widget displaying pending requests with View/Approve actions.
 */
export function PendingRequestsWidget({
  requests,
  onViewAll,
  onViewRequest,
  onApprove,
  loading = false,
}: PendingRequestsWidgetProps) {
  const count = requests.length;

  if (loading) {
    return (
      <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] min-h-[120px] items-center justify-center">
        <ActivityIndicator size="small" color="#1E40AF" />
        <Text className="text-[13px] text-[#64748B] mt-2">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[17px] font-semibold text-[#0F172A]">
          PENDING REQUESTS ({count})
        </Text>
      </View>
      <View className="gap-3">
        {requests.map((req) => (
          <View
            key={req.id}
            className={`rounded-lg p-3 border ${
              req.priority === 'high'
                ? 'bg-[#DC2626]/15 border-[#DC2626]/30'
                : 'bg-[#F8FAFC] border-[#E2E8F0]'
            }`}
          >
            <View className="flex-row justify-between items-start mb-2">
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                {req.requestNumber}
              </Text>
              <Text className="text-[13px] text-[#64748B]">
                {formatTimeAgo(req.createdAt)}
              </Text>
            </View>
            <Text className="text-[13px] text-[#64748B] mb-1">
              {req.siteName} • {req.itemCount} items
            </Text>
            {req.hasInsufficient && (
              <Text className="text-[13px] text-[#DC2626] mb-2">
                {req.insufficientCount ?? 'Some'} insufficient
              </Text>
            )}
            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                onPress={() => onViewRequest(req.id)}
                className="flex-1 border border-[#1E40AF] rounded-[10px] py-2 min-h-[40px] items-center justify-center"
                activeOpacity={0.7}
                accessibilityLabel={`View request ${req.requestNumber}`}
                accessibilityRole="button"
              >
                <Text className="text-[13px] font-semibold text-[#1E40AF]">
                  View
                </Text>
              </TouchableOpacity>
              {onApprove && (
                <TouchableOpacity
                  onPress={() => onApprove(req.id)}
                  className="flex-1 bg-[#1E40AF] rounded-[10px] py-2 min-h-[40px] items-center justify-center"
                  activeOpacity={0.7}
                  accessibilityLabel={`Approve request ${req.requestNumber}`}
                  accessibilityRole="button"
                >
                  <Text className="text-[13px] font-semibold text-white">
                    Approve
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity
        onPress={onViewAll}
        className="mt-3 pt-3 border-t border-[#E2E8F0]"
        activeOpacity={0.7}
        accessibilityLabel="View all pending requests"
        accessibilityRole="button"
      >
        <Text className="text-[15px] font-medium text-[#1E40AF]">
          View All Requests
        </Text>
      </TouchableOpacity>
    </View>
  );
}
