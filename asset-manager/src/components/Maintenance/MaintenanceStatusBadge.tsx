import React from 'react';
import { View, Text } from 'react-native';
import { MaintenanceStatus } from '../../types/maintenance';

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
}

// Status configuration with CIAMS design system colors
// Using 15% opacity backgrounds with full-color text
const statusConfig: Record<
  MaintenanceStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-[#D97706]/15',
    textColor: 'text-[#D97706]',
  },
  partial_return: {
    label: 'Partial Return',
    bgColor: 'bg-[#8B5CF6]/15',
    textColor: 'text-[#8B5CF6]',
  },
  returned: {
    label: 'Returned',
    bgColor: 'bg-[#475569]/15',
    textColor: 'text-[#475569]',
  },
  written_off: {
    label: 'Written Off',
    bgColor: 'bg-[#DC2626]/15',
    textColor: 'text-[#DC2626]',
  },
};

export default function MaintenanceStatusBadge({ status }: MaintenanceStatusBadgeProps) {
  const config = statusConfig[status];
  
  if (!config) {
    // Fallback for unknown status
    return (
      <View 
        className="px-2 py-1 rounded-full bg-[#475569]/15"
        accessibilityLabel="Unknown status"
        accessibilityRole="text"
      >
        <Text className="text-[12px] font-medium text-[#475569]">Unknown</Text>
      </View>
    );
  }
  
  return (
    <View 
      className={`px-2 py-1 rounded-full ${config.bgColor}`}
      accessibilityLabel={`Status: ${config.label}`}
      accessibilityRole="text"
    >
      <Text className={`text-[12px] font-medium ${config.textColor}`}>
        {config.label}
      </Text>
    </View>
  );
}
