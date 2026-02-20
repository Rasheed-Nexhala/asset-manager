/**
 * Category List Item Component
 * 
 * Displays a category in a list format with name, item count, and edit/delete actions.
 * Follows CIAMS design system.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category } from '../../types/inventory';

export interface CategoryListItemProps {
  category: Category;
  itemCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryListItem({
  category,
  itemCount,
  onEdit,
  onDelete,
}: CategoryListItemProps) {
  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
      <View className="flex-row items-center justify-between">
        {/* Category Info */}
        <View className="flex-1 mr-3">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-1">
            {category.name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="cube-outline" size={16} color="#64748B" />
            <Text className="text-[13px] text-[#64748B]">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-2">
          {/* Edit Button */}
          <TouchableOpacity
            className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-lg border border-[#E2E8F0] bg-white items-center justify-center"
            onPress={onEdit}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Edit category ${category.name}`}
          >
            <Ionicons name="pencil" size={20} color="#1E40AF" />
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/10 items-center justify-center"
            onPress={onDelete}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Delete category ${category.name}`}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
