import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Vendor } from '../../types/vendor';

interface VendorCardProps {
  vendor: Vendor;
  onPress: () => void;
  /** Opens vendor ledger (POs + items). */
  onLedgerPress?: () => void;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  onPress,
  onLedgerPress,
}) => {
  return (
    <View className="bg-white rounded-[10px] border border-[#E2E8F0] mb-3 flex-row overflow-hidden">
      <TouchableOpacity
        onPress={onPress}
        className="flex-1 p-4"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Edit vendor ${vendor.name}`}
      >
        <Text className="text-[15px] font-semibold text-[#0F172A] mb-1">
          {vendor.name}
        </Text>
        <View className="flex-row items-center gap-2 mb-2">
          <Ionicons name="call-outline" size={16} color="#64748B" />
          <Text className="text-[13px] text-[#64748B]">{vendor.phone}</Text>
        </View>
        <View className="flex-row items-center justify-between pt-2 border-t border-[#E2E8F0]">
          <Text className="text-[13px] text-[#64748B]">
            POs: {vendor.poCount} | Last: {formatDate(vendor.lastPoDate)}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </View>
      </TouchableOpacity>
      {onLedgerPress && (
        <TouchableOpacity
          onPress={onLedgerPress}
          className="w-[52px] border-l border-[#E2E8F0] items-center justify-center min-h-[48px]"
          accessibilityRole="button"
          accessibilityLabel={`Vendor ledger for ${vendor.name}`}
        >
          <Ionicons name="book-outline" size={24} color="#1E40AF" />
        </TouchableOpacity>
      )}
    </View>
  );
};
