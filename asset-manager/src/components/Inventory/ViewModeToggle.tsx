/**
 * Toggle between Pcs and Kg view mode for weight-based items
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WeightViewMode } from '../../hooks/useWeightViewPreference';

export interface ViewModeToggleProps {
  viewMode: WeightViewMode;
  onToggle: () => void;
  compact?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onToggle,
  compact = false,
}) => {
  return (
    <TouchableOpacity
      className={`flex-row items-center rounded-full border border-[#E2E8F0] bg-white ${
        compact ? 'px-2 py-1' : 'px-3 py-2'
      }`}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="switch"
      accessibilityLabel={`View mode: ${viewMode === 'pieces' ? 'Pieces' : 'Kg'}. Tap to switch.`}
      accessibilityState={{ checked: viewMode === 'kg' }}
    >
      <View
        className={`flex-row items-center ${compact ? 'gap-1' : 'gap-2'}`}
      >
        <Text
          className={`text-[12px] font-medium ${
            viewMode === 'pieces' ? 'text-[#1E40AF]' : 'text-[#64748B]'
          }`}
        >
          Pcs
        </Text>
        <Ionicons
          name="swap-horizontal"
          size={compact ? 12 : 14}
          color="#94A3B8"
        />
        <Text
          className={`text-[12px] font-medium ${
            viewMode === 'kg' ? 'text-[#1E40AF]' : 'text-[#64748B]'
          }`}
        >
          Kg
        </Text>
      </View>
    </TouchableOpacity>
  );
};
