import React from 'react';
import { View, Text } from 'react-native';

/**
 * Subtle branding footer for app screens.
 * Follows CIAMS design system: caption/meta typography, divider pattern, 4px spacing grid.
 */
export const BrandFooter: React.FC = () => (
  <View className="border-t border-[#E2E8F0] pt-4 pb-6 items-center">
    <Text
      className="text-[13px] text-[#64748B]"
      accessibilityLabel="Made by Nexhala"
    >
      Made by Nexhala
    </Text>
  </View>
);
