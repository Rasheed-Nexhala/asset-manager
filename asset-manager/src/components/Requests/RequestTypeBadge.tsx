import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RequestType } from '../../types/request';

interface RequestTypeBadgeProps {
  requestType?: RequestType;
}

/**
 * Badge that identifies the request type.
 * Only renders for non-standard (i.e. site_transfer) requests.
 * Standard requests have no badge so existing UI stays clean.
 */
export const RequestTypeBadge: React.FC<RequestTypeBadgeProps> = ({ requestType }) => {
  if (!requestType || requestType === 'standard') return null;

  return (
    <View className="flex-row items-center gap-1 px-2 py-1 rounded-full bg-[#7C3AED]/15">
      <Ionicons name="swap-horizontal" size={12} color="#7C3AED" />
      <Text className="text-[12px] font-medium text-[#7C3AED]">Site Transfer</Text>
    </View>
  );
};
