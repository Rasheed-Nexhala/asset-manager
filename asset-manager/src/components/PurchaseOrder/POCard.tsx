import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import { POStatusBadge } from './POStatusBadge';

interface POCardProps {
  po: PurchaseOrder;
  onPress: () => void;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const POCard: React.FC<POCardProps> = ({ po, onPress }) => {
  const itemCount = Array.isArray(po?.items) ? po.items.length : 0;
  const hasAnyPrice = (po?.items ?? []).some(
    (i) => (Number(i.unitPrice) || 0) > 0
  );
  const grrReceipts = po.grrReceipts ?? [];
  const latestGrr =
    grrReceipts.length > 0 ? grrReceipts[grrReceipts.length - 1] : null;
  const moreGrrCount =
    grrReceipts.length > 1 ? grrReceipts.length - 1 : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Purchase order ${po.poNumber}`}
    >
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[15px] font-semibold text-[#0F172A]">
          {po.poNumber ?? '—'}
        </Text>
        <POStatusBadge status={po.status} />
      </View>

      {latestGrr && (
        <Text className="text-[13px] text-[#64748B] mb-3">
          GRR: {latestGrr.grrNumber}
          {moreGrrCount > 0 ? ` (+${moreGrrCount} more)` : ''}
        </Text>
      )}

      <View className="flex-row gap-4 mb-3">
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B]">Vendor</Text>
          <Text className="text-[15px] text-[#0F172A]">
            {po.vendorName ?? '—'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B]">Items</Text>
          <Text className="text-[15px] text-[#0F172A]">{itemCount}</Text>
        </View>
      </View>

      <View className="border-t border-[#E2E8F0] pt-2 flex-row justify-between items-center">
        <Text className="text-[13px] text-[#64748B]">
          {formatDate(po.createdAt)} • {po.createdByName ?? '—'}
        </Text>
        {hasAnyPrice && (
          <Text className="text-[15px] font-semibold text-[#0F172A]">
            {formatCurrency(po.totalAmount ?? 0)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
