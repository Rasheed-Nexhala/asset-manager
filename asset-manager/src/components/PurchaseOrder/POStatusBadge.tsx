import React from 'react';
import { View, Text } from 'react-native';
import type { PurchaseOrderStatus } from '../../types/purchaseOrder';

interface POStatusBadgeProps {
  status: PurchaseOrderStatus;
}

const statusConfig: Record<
  PurchaseOrderStatus,
  { bg: string; text: string; label: string }
> = {
  draft: {
    bg: 'bg-[#64748B]/15',
    text: 'text-[#64748B]',
    label: 'Draft',
  },
  pending_approval: {
    bg: 'bg-[#D97706]/15',
    text: 'text-[#D97706]',
    label: 'Pending Approval',
  },
  approved: {
    bg: 'bg-[#1E40AF]/15',
    text: 'text-[#1E40AF]',
    label: 'Approved',
  },
  ordered: {
    bg: 'bg-[#16A34A]/15',
    text: 'text-[#16A34A]',
    label: 'Ordered',
  },
  received: {
    bg: 'bg-[#475569]/15',
    text: 'text-[#475569]',
    label: 'Received',
  },
  rejected: {
    bg: 'bg-[#DC2626]/15',
    text: 'text-[#DC2626]',
    label: 'Rejected',
  },
};

export const POStatusBadge: React.FC<POStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  if (!config) {
    return (
      <View className="px-2 py-1 rounded-full bg-[#64748B]/15">
        <Text className="text-[12px] font-medium text-[#64748B]">{status}</Text>
      </View>
    );
  }

  return (
    <View className={`px-2 py-1 rounded-full ${config.bg}`}>
      <Text className={`text-[12px] font-medium ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
};
