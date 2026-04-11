import React from 'react';
import { View, Text } from 'react-native';
import type { PurchaseOrder } from '../../types/purchaseOrder';

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface GrrReceiptsSectionProps {
  receipts: PurchaseOrder['grrReceipts'];
}

/**
 * Prior goods-receipt register entries on a PO (one card per GRR, line items when present).
 */
export const GrrReceiptsSection: React.FC<GrrReceiptsSectionProps> = ({ receipts }) => {
  const list = receipts ?? [];
  if (list.length === 0) return null;
  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
      <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
        Receipts
      </Text>
      {list.map((r) => (
        <View
          key={`${r.grrNumber}-${r.receivedAt}`}
          className="mb-3 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 last:mb-0"
        >
          <View className="flex-col gap-0.5">
            <Text className="text-[15px] font-semibold text-[#0F172A]">
              {r.grrNumber}
            </Text>
            <Text className="text-[13px] text-[#64748B]">
              {formatDate(r.receivedAt)} · {r.receivedByName?.trim() || '—'}
            </Text>
          </View>
          {r.lineItems && r.lineItems.length > 0 ? (
            <View className="mt-3 border-t border-[#E2E8F0] pt-2">
              {r.lineItems.map((li) => (
                <View
                  key={`${r.grrNumber}-${li.itemId}`}
                  className="mb-2 flex-row items-center justify-between gap-3 last:mb-0"
                >
                  <Text className="flex-1 text-[15px] font-medium text-[#0F172A] leading-5">
                    {li.itemName}
                  </Text>
                  <Text className="shrink-0 text-[15px] text-[#64748B]">
                    {li.quantityReceived} {li.unit?.trim() || 'Pcs'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
};
