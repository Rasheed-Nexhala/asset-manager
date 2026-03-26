/**
 * Request Access Banner
 *
 * Shown when Store Incharge needs Admin approval to update inventory.
 * Displays a warning-style message with a "Request Access" button.
 * Uses CIAMS design system (warning tint, rounded-[10px], p-4, 48px touch targets).
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface RequestAccessBannerProps {
  onRequestAccess: () => void;
  /** Override default copy (central stock adjustments) */
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
}

const DEFAULT_TITLE = 'You need Admin approval to update inventory.';
const DEFAULT_SUBTITLE = 'Request access?';
const DEFAULT_BUTTON = 'Request Access';

export const RequestAccessBanner: React.FC<RequestAccessBannerProps> = ({
  onRequestAccess,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  buttonLabel = DEFAULT_BUTTON,
}) => {
  return (
    <View className="bg-[#D97706]/15 rounded-[10px] p-4 border border-[#D97706]/30">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-[#D97706]/20 items-center justify-center">
          <Ionicons name="lock-closed" size={22} color="#D97706" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-[#0F172A]">{title}</Text>
          <Text className="text-[13px] text-[#64748B] mt-0.5">{subtitle}</Text>
        </View>
        <TouchableOpacity
          className="bg-[#1E40AF] rounded-[10px] min-h-[48px] min-w-[48px] px-4 items-center justify-center"
          onPress={onRequestAccess}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Text className="text-[15px] font-semibold text-white">{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
