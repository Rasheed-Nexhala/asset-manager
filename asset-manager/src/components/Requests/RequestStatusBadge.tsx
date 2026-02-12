import React from 'react';
import { View, Text } from 'react-native';
import type { RequestStatus } from '../../types/request';

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

const statusConfig = {
  draft: {
    bg: 'bg-[#64748B]/15',
    text: 'text-[#64748B]',
    label: 'Draft',
  },
  pending: {
    bg: 'bg-[#D97706]/15',
    text: 'text-[#D97706]',
    label: 'Pending',
  },
  approved: {
    bg: 'bg-[#1E40AF]/15',
    text: 'text-[#1E40AF]',
    label: 'Approved',
  },
  rejected: {
    bg: 'bg-[#DC2626]/15',
    text: 'text-[#DC2626]',
    label: 'Rejected',
  },
  transferred: {
    bg: 'bg-[#16A34A]/15',
    text: 'text-[#16A34A]',
    label: 'Transferred',
  },
  returned: {
    bg: 'bg-[#475569]/15',
    text: 'text-[#475569]',
    label: 'Returned',
  },
  cancelled: {
    bg: 'bg-[#64748B]/15',
    text: 'text-[#64748B]',
    label: 'Cancelled',
  },
};

export const RequestStatusBadge: React.FC<RequestStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <View className={`px-2 py-1 rounded-full ${config.bg}`}>
      <Text className={`text-[12px] font-medium ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
};
