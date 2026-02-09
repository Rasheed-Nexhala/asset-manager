import React from 'react';
import { View, Text } from 'react-native';

/**
 * Stock status type for badge display
 */
export type StockStatus = 'adequate' | 'low_stock' | 'discontinued';

/**
 * Props for StockStatusBadge component
 */
export interface StockStatusBadgeProps {
  status: StockStatus;
}

/**
 * Color mapping for stock status badges
 * Uses CIAMS design system semantic colors at 15% opacity for backgrounds
 */
const statusColors = {
  adequate: {
    bg: 'bg-[#16A34A]/15',
    text: 'text-[#16A34A]',
    label: 'Adequate',
  },
  low_stock: {
    bg: 'bg-[#D97706]/15',
    text: 'text-[#D97706]',
    label: 'Low Stock',
  },
  discontinued: {
    bg: 'bg-[#475569]/15',
    text: 'text-[#475569]',
    label: 'Discontinued',
  },
};

/**
 * StockStatusBadge component
 * 
 * Displays a visual badge indicating stock status:
 * - Adequate: Green badge for items with sufficient stock
 * - Low Stock: Amber badge for items below minimum stock level
 * - Discontinued: Slate badge for discontinued items
 * 
 * Follows CIAMS design system badge pattern with semantic colors
 * and proper typography (12px font, medium weight, rounded-full)
 */
export const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({ status }) => {
  const colors = statusColors[status];

  return (
    <View className={`px-2 py-1 rounded-full ${colors.bg}`}>
      <Text className={`text-[12px] font-medium ${colors.text}`}>
        {colors.label}
      </Text>
    </View>
  );
};
