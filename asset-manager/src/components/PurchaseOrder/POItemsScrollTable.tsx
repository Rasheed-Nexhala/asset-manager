import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  type LayoutChangeEvent,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PurchaseOrderItem } from '../../types/purchaseOrder';

const COL_ITEM = 288;
const COL_QTY = 96;
const COL_UNIT = 108;
const COL_GST = 76;
const COL_TOTAL = 112;

/** Sum of column widths + horizontal gaps between columns */
const TABLE_CONTENT_WIDTH =
  COL_ITEM + COL_QTY + COL_UNIT + COL_GST + COL_TOTAL + 32;

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const formatCurrencyOrOptional = (n: number) =>
  n > 0 ? formatCurrency(n) : '—';
const formatGstOrOptional = (pct: number | undefined) =>
  pct != null && pct > 0 ? `${pct}%` : '—';

type Props = {
  items: PurchaseOrderItem[];
};

/**
 * Wide PO line-items table: horizontal scroll so full item names stay readable
 * (no ellipsis). Shows a hint when content is wider than the viewport.
 */
export const POItemsScrollTable: React.FC<Props> = ({ items }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollHintVisible, setScrollHintVisible] = useState(true);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    if (containerWidth <= 0) return;
    setScrollHintVisible(TABLE_CONTENT_WIDTH > containerWidth + 2);
  }, [containerWidth]);

  return (
    <View className="bg-white rounded-[10px] border border-[#E2E8F0] mb-4 overflow-hidden">
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-start justify-between gap-2 mb-1">
          <Text className="text-[17px] font-semibold text-[#0F172A]">ITEMS</Text>
          {scrollHintVisible ? (
            <View className="flex-row items-center gap-1.5 max-w-[55%]">
              <Ionicons name="swap-horizontal" size={18} color="#64748B" />
              <Text className="text-[12px] text-[#64748B] leading-tight">
                Swipe sideways for full names and amounts
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View onLayout={onContainerLayout}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          indicatorStyle={Platform.OS === 'ios' ? 'black' : undefined}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            minWidth: TABLE_CONTENT_WIDTH,
          }}
          accessibilityLabel="Purchase order line items table"
          accessibilityHint="Scroll horizontally to see all columns and full item names."
        >
          <View style={{ width: TABLE_CONTENT_WIDTH }}>
            {/* Column headers */}
            <View className="flex-row border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-lg px-2 py-2.5 mb-0">
              <Text
                style={{ width: COL_ITEM }}
                className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B] pr-2"
              >
                Item
              </Text>
              <Text
                style={{ width: COL_QTY }}
                className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B]"
              >
                Qty
              </Text>
              <Text
                style={{ width: COL_UNIT }}
                className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B] text-right pr-2"
              >
                Unit price
              </Text>
              <Text
                style={{ width: COL_GST }}
                className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B] text-right pr-2"
              >
                GST %
              </Text>
              <Text
                style={{ width: COL_TOTAL }}
                className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B] text-right"
              >
                Total
              </Text>
            </View>

            {items.map((item, i) => {
              const qtyLabel =
                item.orderedQuantity != null && item.orderedUnit
                  ? `${item.orderedQuantity} ${item.orderedUnit}`
                  : `${item.quantity} ${item.unit || 'Pcs'}`;
              const lineTotal =
                item.amount +
                (item.gstAmount ??
                  Math.round(
                    (item.amount * (item.gstPercentage ?? 0)) / 100
                  ));

              return (
                <View
                  key={`${item.itemId}-${i}`}
                  className={`flex-row px-2 py-3 ${
                    i < items.length - 1 ? 'border-b border-[#E2E8F0]' : ''
                  }`}
                >
                  <View style={{ width: COL_ITEM }} className="pr-2">
                    <Text className="text-[15px] font-medium text-[#0F172A] leading-5">
                      {item.itemName}
                    </Text>
                  </View>
                  <Text
                    style={{ width: COL_QTY }}
                    className="text-[15px] text-[#0F172A] self-start pt-0.5"
                  >
                    {qtyLabel}
                  </Text>
                  <Text
                    style={{ width: COL_UNIT }}
                    className="text-[15px] text-[#0F172A] text-right pr-2 self-start pt-0.5"
                  >
                    {formatCurrencyOrOptional(item.unitPrice ?? 0)}
                  </Text>
                  <Text
                    style={{ width: COL_GST }}
                    className="text-[15px] text-[#0F172A] text-right pr-2 self-start pt-0.5"
                  >
                    {formatGstOrOptional(item.gstPercentage)}
                  </Text>
                  <Text
                    style={{ width: COL_TOTAL }}
                    className="text-[15px] font-semibold text-[#0F172A] text-right self-start pt-0.5"
                  >
                    {formatCurrencyOrOptional(lineTotal)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};
