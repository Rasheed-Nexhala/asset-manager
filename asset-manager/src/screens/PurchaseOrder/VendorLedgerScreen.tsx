import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { DocumentSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { POCard } from '../../components/PurchaseOrder/POCard';
import {
  DEFAULT_VENDOR_LEDGER_PAGE_SIZE,
  getPurchaseOrdersCountByVendor,
  listPurchaseOrdersByVendorPaginated,
} from '../../services/firebase/purchaseOrderService';
import { getVendorById } from '../../services/firebase/vendorService';
import { useAppSelector } from '../../store/hooks';
import { selectVendors } from '../../store/selectors/purchaseOrderSelectors';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { Vendor } from '../../types/vendor';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';
import {
  aggregateVendorLedgerLines,
  getDefaultVendorLedgerMonthRange,
  sumPurchaseOrderTotals,
  type VendorLedgerDateRange,
} from '../../utils/vendorLedgerUtils';

type NavProp = StackNavigationProp<PurchaseOrderStackParamList, 'VendorLedger'>;
type RouteProps = RouteProp<PurchaseOrderStackParamList, 'VendorLedger'>;

const formatCurrency = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDisplayDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const VendorLedgerScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { vendorId } = route.params;

  const vendorsFromStore = useAppSelector(selectVendors);
  const vendorFromStore = useMemo(
    () => vendorsFromStore.find((v) => v.id === vendorId),
    [vendorsFromStore, vendorId]
  );

  const [vendor, setVendor] = useState<Vendor | null>(vendorFromStore ?? null);
  const initialMonthRange = useMemo(() => getDefaultVendorLedgerMonthRange(), []);
  const [appliedRange, setAppliedRange] =
    useState<VendorLedgerDateRange>(initialMonthRange);
  const [draftFrom, setDraftFrom] = useState(initialMonthRange.dateFrom);
  const [draftTo, setDraftTo] = useState(initialMonthRange.dateTo);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [totalPoCount, setTotalPoCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab] = useState<'pos' | 'items'>('pos');

  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  const ledgerLines = useMemo(() => aggregateVendorLedgerLines(orders), [orders]);
  const totalValue = useMemo(() => sumPurchaseOrderTotals(orders), [orders]);

  const titleName = vendor?.name ?? vendorFromStore?.name ?? 'Vendor';

  const loadVendor = useCallback(async () => {
    if (vendorFromStore) {
      setVendor(vendorFromStore);
      return;
    }
    const v = await getVendorById(vendorId);
    setVendor(v);
  }, [vendorFromStore, vendorId]);

  const loadInitial = useCallback(
    async (opts?: { isRefresh?: boolean }) => {
      if (!opts?.isRefresh) setLoading(true);
      setError(null);
      lastDocRef.current = null;
      try {
        const [count, page] = await Promise.all([
          getPurchaseOrdersCountByVendor(vendorId, appliedRange),
          listPurchaseOrdersByVendorPaginated(
            vendorId,
            DEFAULT_VENDOR_LEDGER_PAGE_SIZE,
            appliedRange,
            undefined
          ),
        ]);
        setTotalPoCount(count);
        setOrders(page.orders);
        lastDocRef.current = page.lastDoc;
        setHasMore(page.hasMore);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load ledger');
        setOrders([]);
        setHasMore(false);
      } finally {
        if (!opts?.isRefresh) setLoading(false);
        setRefreshing(false);
      }
    },
    [vendorId, appliedRange]
  );

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

  useEffect(() => {
    if (vendorFromStore) setVendor(vendorFromStore);
  }, [vendorFromStore]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const handleApplyFilter = useCallback(() => {
    setAppliedRange({ dateFrom: draftFrom, dateTo: draftTo });
  }, [draftFrom, draftTo]);

  const handleThisMonth = useCallback(() => {
    const m = getDefaultVendorLedgerMonthRange();
    setDraftFrom(m.dateFrom);
    setDraftTo(m.dateTo);
    setAppliedRange(m);
  }, []);

  const onFromChange = useCallback(
    (_event: { type: string }, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowFromPicker(false);
      if (_event.type === 'dismissed') return;
      if (selectedDate) setDraftFrom(selectedDate);
    },
    []
  );

  const onToChange = useCallback(
    (_event: { type: string }, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowToPicker(false);
      if (_event.type === 'dismissed') return;
      if (selectedDate) setDraftTo(selectedDate);
    },
    []
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    const cursor = lastDocRef.current;
    if (!cursor) return;

    setLoadingMore(true);
    setError(null);
    try {
      const page = await listPurchaseOrdersByVendorPaginated(
        vendorId,
        DEFAULT_VENDOR_LEDGER_PAGE_SIZE,
        appliedRange,
        cursor
      );
      setOrders((prev) => [...prev, ...page.orders]);
      lastDocRef.current = page.lastDoc;
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, vendorId, appliedRange]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadInitial({ isRefresh: true });
  }, [loadInitial]);

  const handlePOPress = useCallback(
    (po: PurchaseOrder) => {
      if (po.status === 'draft') {
        navigation.navigate('CreatePO', { poId: po.id });
      } else if (po.status === 'pending_approval') {
        navigation.navigate('ApprovePO', { poId: po.id });
      } else if (
        po.status === 'approved' ||
        po.status === 'ordered' ||
        po.status === 'partially_received'
      ) {
        navigation.navigate('ReceivePO', { poId: po.id });
      } else {
        navigation.navigate('ApprovePO', { poId: po.id });
      }
    },
    [navigation]
  );

  const renderSegment = () => (
    <View className="flex-row gap-2 px-4 pb-3">
      <TouchableOpacity
        onPress={() => setTab('pos')}
        className={`flex-1 rounded-[10px] py-3 items-center border ${
          tab === 'pos' ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-white border-[#E2E8F0]'
        }`}
        accessibilityRole="button"
        accessibilityState={{ selected: tab === 'pos' }}
      >
        <Text
          className={`text-[15px] font-semibold ${
            tab === 'pos' ? 'text-white' : 'text-[#64748B]'
          }`}
        >
          Purchase orders
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setTab('items')}
        className={`flex-1 rounded-[10px] py-3 items-center border ${
          tab === 'items' ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-white border-[#E2E8F0]'
        }`}
        accessibilityRole="button"
        accessibilityState={{ selected: tab === 'items' }}
      >
        <Text
          className={`text-[15px] font-semibold ${
            tab === 'items' ? 'text-white' : 'text-[#64748B]'
          }`}
        >
          Items
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && orders.length === 0 && !error) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Vendor ledger"
          showBack
          onBackPress={() => navigation.goBack()}
        />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading ledger…</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Vendor ledger"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E40AF" />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-4">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">{titleName}</Text>
        </View>

        <View className="px-4 mb-3">
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] gap-4">
            <Text className="text-[17px] font-semibold text-[#0F172A]">Date range</Text>
            <Text className="text-[13px] text-[#64748B] -mt-2">
              Default is the current month. Adjust dates and tap Apply.
            </Text>

            <View className="flex-row gap-4">
              <View className="flex-1 gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">From</Text>
                <TouchableOpacity
                  className="border border-[#E2E8F0] rounded-lg h-12 px-4 justify-center bg-white min-h-[48px]"
                  onPress={() => {
                    setShowToPicker(false);
                    setShowFromPicker(true);
                  }}
                  accessibilityLabel="Select start date"
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Text className="text-[15px] text-[#0F172A]">
                    {formatDisplayDate(draftFrom)}
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-[15px] text-[#0F172A]">To</Text>
                <TouchableOpacity
                  className="border border-[#E2E8F0] rounded-lg h-12 px-4 justify-center bg-white min-h-[48px]"
                  onPress={() => {
                    setShowFromPicker(false);
                    setShowToPicker(true);
                  }}
                  accessibilityLabel="Select end date"
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Text className="text-[15px] text-[#0F172A]">
                    {formatDisplayDate(draftTo)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showFromPicker && (
              <View className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                <View className="flex-row items-center justify-between border-b border-[#E2E8F0] px-4 py-2">
                  <Text className="text-[15px] font-medium text-[#0F172A]">From</Text>
                  <TouchableOpacity
                    onPress={() => setShowFromPicker(false)}
                    className="min-h-[44px] min-w-[44px] items-center justify-center"
                    accessibilityLabel="Close date picker"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={{ height: 216 }}>
                  <DateTimePicker
                    value={draftFrom}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onFromChange}
                  />
                </View>
              </View>
            )}

            {showToPicker && (
              <View className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                <View className="flex-row items-center justify-between border-b border-[#E2E8F0] px-4 py-2">
                  <Text className="text-[15px] font-medium text-[#0F172A]">To</Text>
                  <TouchableOpacity
                    onPress={() => setShowToPicker(false)}
                    className="min-h-[44px] min-w-[44px] items-center justify-center"
                    accessibilityLabel="Close date picker"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={{ height: 216 }}>
                  <DateTimePicker
                    value={draftTo}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onToChange}
                  />
                </View>
              </View>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleThisMonth}
                className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Reset date range to current month"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">This month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApplyFilter}
                className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Apply date filter"
              >
                <Text className="text-[15px] font-semibold text-white">Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="px-4 gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
              <Text className="text-[13px] text-[#64748B] mb-1">POs in range</Text>
              <Text className="text-[22px] font-bold text-[#0F172A]">
                {totalPoCount ?? orders.length}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
              <Text className="text-[13px] text-[#64748B] mb-1">Value (loaded)</Text>
              <Text className="text-[22px] font-bold text-[#0F172A]" numberOfLines={1}>
                {formatCurrency(totalValue)}
              </Text>
            </View>
          </View>
          <Text className="text-[12px] text-[#94A3B8] px-1">
            Value sums PO totals for rows loaded below; use Load more if the list is long.
          </Text>
        </View>

        {error && (
          <View className="mx-4 mt-3 bg-[#DC2626]/15 px-4 py-3 rounded-lg border border-[#DC2626]/30">
            <Text className="text-[14px] text-[#DC2626]">{error}</Text>
          </View>
        )}

        {renderSegment()}

        {tab === 'pos' && (
          <View className="px-4 pb-8">
            {orders.length === 0 ? (
              <View className="items-center py-12 px-4">
                <Ionicons name="document-text-outline" size={56} color="#64748B" />
                <Text className="text-[17px] font-semibold text-[#0F172A] mt-4 text-center">
                  No purchase orders in this range
                </Text>
                <Text className="text-[15px] text-[#64748B] text-center mt-2">
                  Try another date range or tap This month.
                </Text>
              </View>
            ) : (
              <>
                {orders.map((po) => (
                  <View key={po.id} className="mb-3">
                    <POCard po={po} onPress={() => handlePOPress(po)} />
                  </View>
                ))}
                {hasMore && (
                  <TouchableOpacity
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                    className="bg-white border border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center mb-4"
                    accessibilityRole="button"
                    accessibilityLabel="Load more purchase orders"
                  >
                    {loadingMore ? (
                      <ActivityIndicator color="#1E40AF" />
                    ) : (
                      <Text className="text-[15px] font-semibold text-[#1E40AF]">
                        Load more
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {tab === 'items' && (
          <View className="px-4 pb-8">
            {ledgerLines.length === 0 ? (
              <Text className="text-[15px] text-[#64748B] text-center py-8">
                No line items in loaded POs for this range.
              </Text>
            ) : (
              ledgerLines.map((line) => (
                <View
                  key={line.key}
                  className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
                >
                  <Text className="text-[15px] font-semibold text-[#0F172A] mb-2">
                    {line.itemName}
                  </Text>
                  <Text className="text-[12px] text-[#64748B] mb-3">SKU: {line.itemSku}</Text>
                  <View className="flex-row flex-wrap gap-4">
                    <View>
                      <Text className="text-[13px] text-[#64748B]">Ordered</Text>
                      <Text className="text-[15px] text-[#0F172A]">
                        {line.totalOrdered}
                        {line.unit ? ` ${line.unit}` : ''}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[13px] text-[#64748B]">Received</Text>
                      <Text className="text-[15px] text-[#0F172A]">
                        {line.totalReceived}
                        {line.unit ? ` ${line.unit}` : ''}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[13px] text-[#64748B]">Lines</Text>
                      <Text className="text-[15px] text-[#0F172A]">{line.lineCount}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};
