import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormField } from '../../components/FormField';
import { POReceiptSummary, GrrReceiptsSection } from '../../components/PurchaseOrder';
import { printPurchaseOrder } from '../../utils/poPdfUtils';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import { getItemById } from '../../services/firebase/inventoryService';
import { uploadPOInvoice } from '../../services/firebase/storageService';
import { receivePO } from '../../store/thunks/purchaseOrderThunks';
import {
  selectUserId,
  selectUserDisplayName,
  selectCanReceivePurchaseOrder,
  selectRoleLoading,
} from '../../store/selectors/authSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type RouteParams = RouteProp<PurchaseOrderStackParamList, 'ReceivePO'>;
type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'ReceivePO'
>;

export const ReceivePOScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { poId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const roleLoading = useAppSelector(selectRoleLoading);
  const canReceivePO = useAppSelector(selectCanReceivePurchaseOrder);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const receiveInFlightRef = useRef(false);
  const [invoiceFiles, setInvoiceFiles] = useState<
    Array<{ fileName: string; fileUrl: string }>
  >([]);
  const [receivedDate, setReceivedDate] = useState(new Date());
  const [receivedNotes, setReceivedNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  // Per-item received quantities — pre-filled with ordered qty, editable by user
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({});
  const [receivedPrices, setReceivedPrices] = useState<Record<string, string>>({});
  const [inventoryItemsMap, setInventoryItemsMap] = useState<Record<string, any>>({});

  // Helper to fetch details for multiple items
  const fetchInventoryDetails = useCallback(async (itemIds: string[]) => {
    const missingIds = itemIds.filter(id => !inventoryItemsMap[id]);
    if (missingIds.length === 0) return;

    try {
      const results = await Promise.all(missingIds.map(id => getItemById(id)));
      const updates: Record<string, any> = {};
      results.forEach((item, index) => {
        if (item) updates[missingIds[index]] = item;
      });
      setInventoryItemsMap(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Error fetching inventory details:', err);
    }
  }, [inventoryItemsMap]);

  // Fetch details when items in PO change
  useEffect(() => {
    if (po) {
      const ids = po.items.map(i => i.itemId);
      fetchInventoryDetails(ids);
    }
  }, [po, fetchInventoryDetails]);

  useEffect(() => {
    setLoadError(null);
    getPOById(poId)
      .then((p) => {
        if (p) {
          setPo(p);
          // Pre-fill each item with its remaining quantity
          const initial: Record<string, string> = {};
          const initialPrices: Record<string, string> = {};
          p.items.forEach((item) => {
            const received = item.receivedQuantity ?? 0;
            const remaining = Math.max(0, item.quantity - received);
            initial[item.itemId] = remaining > 0 ? String(remaining) : '0';
            initialPrices[item.itemId] = String(item.unitPrice ?? 0);
          });
          setReceivedQtys(initial);
          setReceivedPrices(initialPrices);
          setLoadError(null);
        } else {
          setLoadError('Purchase order not found');
        }
      })
      .catch((err: unknown) => {
        setPo(null);
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load purchase order'
        );
      })
      .finally(() => setLoading(false));
  }, [poId, retryTrigger]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handlePrint = useCallback(async () => {
    if (!po) return;
    try {
      await printPurchaseOrder(po);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to print'
      );
    }
  }, [po]);

  const handleAddInvoice = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploadingInvoice(true);
      const newFiles: Array<{ fileName: string; fileUrl: string }> = [];
      for (const asset of result.assets) {
        const { url, fileName } = await uploadPOInvoice(
          asset.uri,
          poId,
          asset.name ?? undefined
        );
        newFiles.push({ fileName, fileUrl: url });
      }
      setInvoiceFiles((prev) => [...prev, ...newFiles]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      Alert.alert('Error', msg);
    } finally {
      setUploadingInvoice(false);
    }
  }, [poId]);

  const handleRemoveInvoice = useCallback((index: number) => {
    setInvoiceFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!po || !userId || !userName) return;
    if (receiveInFlightRef.current) return;

    // Validate all quantities are non-negative integers
    for (const item of po.items) {
      const raw = receivedQtys[item.itemId] ?? '';
      const qty = parseInt(raw, 10);
      if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
        Alert.alert('Invalid Quantity', `Enter a valid quantity (0 or more) for "${item.itemName}".`);
        return;
      }
      const rawPrice = receivedPrices[item.itemId] ?? '';
      const price = parseFloat(rawPrice);
      if (isNaN(price) || price < 0) {
        Alert.alert('Invalid Price', `Enter a valid unit price for "${item.itemName}".`);
        return;
      }
    }

    const atLeastOne = po.items.some((item) => {
      const qty = parseInt(receivedQtys[item.itemId] ?? '0', 10);
      return qty > 0;
    });
    if (!atLeastOne) {
      Alert.alert('No Items', 'At least one item must have a received quantity greater than zero.');
      return;
    }

    receiveInFlightRef.current = true;
    setSaving(true);
    try {
      const { grrNumber, updatedPO } = await dispatch(
        receivePO({
          poId,
          receiveData: {
            receivedQuantities: po.items.map((item) => ({
              itemId: item.itemId,
              receivedQuantity: parseInt(receivedQtys[item.itemId] ?? '0', 10),
              unitPrice: parseFloat(receivedPrices[item.itemId] ?? String(item.unitPrice)),
            })),
            documents: invoiceFiles.map((f) => ({
              type: 'invoice' as const,
              fileName: f.fileName,
              fileUrl: f.fileUrl,
            })),
            receivedDate: receivedDate.toISOString(),
            receivedNotes: receivedNotes.trim() || undefined,
          },
          userId,
          userName,
        })
      ).unwrap();
      const isPartial = updatedPO?.status === 'partially_received';
      const message = isPartial
        ? `Partial receipt saved. GRR: ${grrNumber}. Inventory updated. You can receive the rest in another receipt when it arrives.`
        : `Purchase order received. GRR: ${grrNumber}. Inventory updated.`;
      Alert.alert('Success', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to receive PO';
      Alert.alert('Error', msg);
    } finally {
      receiveInFlightRef.current = false;
      setSaving(false);
    }
  }, [
    po,
    poId,
    userId,
    userName,
    receivedQtys,
    receivedPrices,
    invoiceFiles,
    receivedDate,
    receivedNotes,
    dispatch,
    navigation,
  ]);

  const inventoryUpdates = po
    ? po.items.map((item) => {
        const invItem = inventoryItemsMap[item.itemId];
        const current = invItem?.centralStoreQuantity ?? 0;
        const receivedQty = parseInt(receivedQtys[item.itemId] ?? '0', 10) || 0;
        return {
          itemName: item.itemName,
          orderedQty: item.quantity,
          remainingQty: Math.max(0, item.quantity - (item.receivedQuantity ?? 0)),
          currentQty: current,
          receivedQty,
          newQty: current + receivedQty,
        };
      })
    : [];

  if (roleLoading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Receive PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!canReceivePO) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Receive PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] text-[#64748B] text-center">
            Only Store Incharge or Super Admin can receive purchase orders.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (loading || !po) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Receive PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          {loading ? (
            <>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading purchase order...
              </Text>
            </>
          ) : loadError ? (
            <>
              <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
              <Text className="text-[17px] font-semibold text-[#0F172A] text-center mt-4 mb-2">
                Could not load purchase order
              </Text>
              <Text className="text-[15px] text-[#64748B] text-center mb-6">
                {loadError}
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleBack}
                  className="px-6 py-3 border border-[#E2E8F0] rounded-[10px]"
                >
                  <Text className="text-[15px] font-medium text-[#64748B]">
                    Go Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRetryTrigger((t) => t + 1)}
                  className="px-6 py-3 bg-[#1E40AF] rounded-[10px]"
                >
                  <Text className="text-[15px] font-medium text-white">
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading purchase order...
              </Text>
            </>
          )}
        </View>
      </ScreenLayout>
    );
  }

  if (po.status !== 'approved' && po.status !== 'ordered' && po.status !== 'partially_received') {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Receive PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] text-[#64748B] text-center">
            Only approved, ordered, or partially received POs can be received. Current status: {po.status}.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title={`Receive ${po.poNumber}`}
        showBack
        onBackPress={handleBack}
        rightAction={{
          icon: 'print-outline',
          label: 'Print',
          onPress: handlePrint,
          accessibilityLabel: 'Print purchase order',
        }}
      />

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="text-[13px] text-[#64748B]">Vendor</Text>
          <Text className="text-[15px] font-medium text-[#0F172A]">
            {po.vendorName}
          </Text>
        </View>

        {(po.reviewedByName || po.reviewedAt) && (
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              APPROVAL DETAILS
            </Text>
            <View className="flex-row justify-between mb-2">
              <View>
                <Text className="text-[13px] text-[#64748B]">Approved by</Text>
                <Text className="text-[15px] font-medium text-[#0F172A]">
                  {po.reviewedByName || '—'}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[13px] text-[#64748B]">Approved on</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {po.reviewedAt
                    ? new Date(po.reviewedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </Text>
              </View>
            </View>
            {po.adminComments ? (
              <View className="bg-[#F8FAFC] rounded-lg px-3 py-2 mt-1 border border-[#E2E8F0]">
                <Text className="text-[12px] text-[#64748B] mb-0.5">Admin comments</Text>
                <Text className="text-[14px] text-[#0F172A]">{po.adminComments}</Text>
              </View>
            ) : null}
          </View>
        )}

        {(po.grrReceipts?.length ?? 0) > 0 && (
          <GrrReceiptsSection receipts={po.grrReceipts} />
        )}

        <View className="mb-4">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-1">
            ITEMS TO RECEIVE
          </Text>
          <Text className="text-[13px] text-[#64748B] mb-3">
            Enter the actual quantity received. Partial or excess delivery is allowed.
            You can record multiple receipts until every line is fulfilled.
          </Text>
          {po.items.map((item) => {
            const raw = receivedQtys[item.itemId] ?? '';
            const receivedQty = parseInt(raw, 10);
            const orderedQty = item.quantity;
            const alreadyReceived = item.receivedQuantity ?? 0;
            const remainingQty = Math.max(0, orderedQty - alreadyReceived);
            const orderedLabel = item.orderedQuantity
              ? `${item.orderedQuantity} ${item.orderedUnit}`
              : `${orderedQty} ${item.unit || 'Pcs'}`;

            const isPartial = !isNaN(receivedQty) && receivedQty > 0 && receivedQty < remainingQty;
            const isExcess = !isNaN(receivedQty) && receivedQty > remainingQty;
            const isExact = !isNaN(receivedQty) && receivedQty > 0 && receivedQty === remainingQty;

            return (
              <View
                key={item.itemId}
                className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
              >
                {/* Item name + status badge */}
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 min-w-0 pr-2">
                    <Text className="text-[15px] font-medium text-[#0F172A] leading-5">
                      {item.itemName}
                    </Text>
                    <Text className="text-[13px] text-[#64748B] mt-0.5">
                      Ordered: {orderedLabel}{alreadyReceived > 0 ? ` • Received: ${alreadyReceived} ${item.unit || 'Pcs'}` : ''}
                    </Text>
                  </View>
                  {isExact && (
                    <View className="px-2 py-1 rounded-full bg-[#16A34A]/15">
                      <Text className="text-[12px] font-medium text-[#16A34A]">Exact</Text>
                    </View>
                  )}
                  {isPartial && (
                    <View className="px-2 py-1 rounded-full bg-[#D97706]/15">
                      <Text className="text-[12px] font-medium text-[#D97706]">Partial</Text>
                    </View>
                  )}
                  {isExcess && (
                    <View className="px-2 py-1 rounded-full bg-[#7C3AED]/15">
                      <Text className="text-[12px] font-medium text-[#7C3AED]">Excess</Text>
                    </View>
                  )}
                </View>

                <View className="flex-col gap-4">
                  {/* Quantity input */}
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[14px] text-[#64748B] flex-1">
                      Received qty ({item.unit || 'Pcs'})
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => {
                          const current = parseInt(receivedQtys[item.itemId] ?? '0', 10) || 0;
                          if (current > 0) {
                            setReceivedQtys((prev) => ({
                              ...prev,
                              [item.itemId]: String(current - 1),
                            }));
                          }
                        }}
                        className="w-10 h-10 rounded-lg border border-[#E2E8F0] items-center justify-center bg-[#F8FAFC]"
                        accessibilityLabel={`Decrease ${item.itemName} quantity`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="remove" size={18} color="#64748B" />
                      </TouchableOpacity>

                      <TextInput
                        value={raw}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, '');
                          setReceivedQtys((prev) => ({
                            ...prev,
                            [item.itemId]: cleaned,
                          }));
                        }}
                        keyboardType="number-pad"
                        className="w-14 h-10 px-0 border border-[#E2E8F0] rounded-lg text-center text-[15px] font-semibold text-[#0F172A] bg-white"
                        accessibilityLabel={`Received quantity for ${item.itemName}`}
                      />

                      <TouchableOpacity
                        onPress={() => {
                          const current = parseInt(receivedQtys[item.itemId] ?? '0', 10) || 0;
                          setReceivedQtys((prev) => ({
                            ...prev,
                            [item.itemId]: String(current + 1),
                          }));
                        }}
                        className="w-10 h-10 rounded-lg border border-[#E2E8F0] items-center justify-center bg-[#F8FAFC]"
                        accessibilityLabel={`Increase ${item.itemName} quantity`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="add" size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Price input */}
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[14px] text-[#64748B] flex-1">
                      Unit Price
                    </Text>
                    <TextInput
                      value={receivedPrices[item.itemId] ?? ''}
                      onChangeText={(text) => {
                        setReceivedPrices((prev) => ({
                          ...prev,
                          [item.itemId]: text,
                        }));
                      }}
                      keyboardType="decimal-pad"
                      className="w-24 h-10 px-2 border border-[#E2E8F0] rounded-lg text-center text-[15px] font-semibold text-[#0F172A] bg-white"
                      accessibilityLabel={`Unit price for ${item.itemName}`}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mb-4">
          <Text className="text-[15px] font-medium text-[#0F172A] mb-1.5">
            Invoice/Bill (Optional)
          </Text>
          <TouchableOpacity
            onPress={handleAddInvoice}
            disabled={uploadingInvoice}
            className="border border-[#E2E8F0] rounded-lg p-4 flex-row items-center gap-3 bg-white"
            accessibilityRole="button"
            accessibilityLabel="Add invoice or bill"
          >
            <View className="w-10 h-10 rounded-lg bg-[#1E40AF]/15 items-center justify-center">
              <Ionicons name="document-attach-outline" size={24} color="#1E40AF" />
            </View>
            <View className="flex-1">
              {uploadingInvoice ? (
                <Text className="text-[15px] text-[#64748B]">Uploading...</Text>
              ) : (
                <Text className="text-[15px] text-[#94A3B8]">+ Add images or PDFs</Text>
              )}
            </View>
            {uploadingInvoice && (
              <ActivityIndicator size="small" color="#1E40AF" />
            )}
          </TouchableOpacity>
          {invoiceFiles.length > 0 && (
            <View className="mt-3 gap-2">
              {invoiceFiles.map((file, index) => (
                <View
                  key={`${file.fileUrl}-${index}`}
                  className="flex-row items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-4 py-3"
                >
                  <View className="flex-1 min-w-0 flex-row items-center gap-3">
                    <Ionicons name="document-text-outline" size={20} color="#64748B" />
                    <Text className="text-[15px] font-medium text-[#0F172A]" numberOfLines={1}>
                      {file.fileName}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                      <Text className="text-[13px] text-[#16A34A]">Uploaded</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveInvoice(index)}
                    className="p-2"
                    accessibilityLabel={`Remove ${file.fileName}`}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-[15px] font-medium text-[#0F172A] mb-1.5">
            Received Date
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between bg-white"
          >
            <Text className="text-[#0F172A]">
              {receivedDate.toLocaleDateString('en-IN')}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#64748B" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={receivedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) setReceivedDate(d);
              }}
            />
          )}
        </View>

        <View className="mb-6">
          <FormField
            label="Notes (Optional)"
            value={receivedNotes}
            onChangeText={setReceivedNotes}
            placeholder="Additional notes"
            multiline
          />
        </View>

        <POReceiptSummary updates={inventoryUpdates} />

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={saving}
          className={`mt-6 rounded-[10px] h-[50px] items-center justify-center ${
            saving ? 'bg-[#94A3B8]' : 'bg-[#1E40AF]'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-[15px] font-semibold text-white">
              CONFIRM & UPDATE INVENTORY
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
};
