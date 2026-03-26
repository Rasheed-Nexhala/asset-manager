import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormField } from '../../components/FormField';
import { PODocumentCard } from '../../components/PurchaseOrder';
import { printPurchaseOrder } from '../../utils/poPdfUtils';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import {
  approvePO,
  rejectPO,
} from '../../store/thunks/purchaseOrderThunks';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsAdmin,
  selectIsSuperAdmin,
} from '../../store/selectors/authSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearError, setError } from '../../store/slices/purchaseOrderSlice';
import { selectPurchaseOrderError } from '../../store/selectors/purchaseOrderSelectors';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type RouteParams = RouteProp<PurchaseOrderStackParamList, 'ApprovePO'>;
type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'ApprovePO'
>;

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Format currency or "—" when amount is 0 (optional/not provided) */
const formatCurrencyOrOptional = (n: number) =>
  n > 0 ? formatCurrency(n) : '—';

/** Format GST % or "—" when 0 (optional/not provided) */
const formatGstOrOptional = (pct: number | undefined) =>
  pct != null && pct > 0 ? `${pct}%` : '—';

const GrrReceiptsSection: React.FC<{
  receipts: PurchaseOrder['grrReceipts'];
}> = ({ receipts }) => {
  const list = receipts ?? [];
  if (list.length === 0) return null;
  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
      <Text className="text-[15px] font-semibold text-[#0F172A] mb-2">
        GOODS RECEIPT REGISTER (GRR)
      </Text>
      {list.map((r) => (
        <Text
          key={`${r.grrNumber}-${r.receivedAt}`}
          className="text-[14px] text-[#0F172A] mb-2"
        >
          <Text className="font-semibold">{r.grrNumber}</Text>
          <Text className="text-[13px] text-[#64748B]">
            {' '}
            · {formatDate(r.receivedAt)} · {r.receivedByName ?? '—'}
          </Text>
        </Text>
      ))}
    </View>
  );
};

export const ApprovePOScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { poId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const reduxError = useAppSelector(selectPurchaseOrderError);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    setLoadError(null);
    getPOById(poId)
      .then((p) => {
        setPo(p);
        if (!p) setLoadError('Purchase order not found');
      })
      .catch((err: unknown) => {
        setPo(null);
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load purchase order'
        );
      })
      .finally(() => setLoading(false));
  }, [poId, retryTrigger]);

  useFocusEffect(
    useCallback(() => {
      dispatch(clearError());
      return () => {};
    }, [dispatch])
  );

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

  const handleApprove = useCallback(async () => {
    if (!userId || !userName) return;
    setSaving(true);
    try {
      await dispatch(
        approvePO({
          poId,
          adminId: userId,
          adminName: userName,
          data: { adminComments: adminComments.trim() || undefined },
        })
      ).unwrap();
      Alert.alert('Success', 'Purchase order approved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      // Thunk dispatches setError; banner will show
    } finally {
      setSaving(false);
    }
  }, [poId, userId, userName, adminComments, dispatch, navigation]);

  const handleReject = useCallback(async () => {
    const reason = rejectionReason.trim();
    if (!reason) {
      dispatch(setError('Please provide a rejection reason.'));
      return;
    }
    if (!userId || !userName) return;
    setSaving(true);
    try {
      await dispatch(
        rejectPO({
          poId,
          adminId: userId,
          adminName: userName,
          data: {
            rejectionReason: reason,
            adminComments: adminComments.trim() || undefined,
          },
        })
      ).unwrap();
      Alert.alert('Success', 'Purchase order rejected.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      // Thunk dispatches setError; banner will show
    } finally {
      setSaving(false);
    }
  }, [poId, userId, userName, rejectionReason, adminComments, dispatch, navigation]);

  if (loading || !po) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Review PO" showBack onBackPress={handleBack} />
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

  if (po.status === 'partially_received') {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Review PO"
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
        >
          <GrrReceiptsSection receipts={po.grrReceipts} />
          <View className="items-center justify-center py-8 px-2">
            <Text className="text-[15px] text-[#64748B] text-center">
              This PO has been partially received. You can receive it from the list.
            </Text>
          </View>
        </ScrollView>
      </ScreenLayout>
    );
  }

  if (po.status === 'ordered') {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Review PO"
          showBack
          onBackPress={handleBack}
          rightAction={{
            icon: 'print-outline',
            label: 'Print',
            onPress: handlePrint,
            accessibilityLabel: 'Print purchase order',
          }}
        />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] text-[#64748B] text-center">
            This PO can be received from the list.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const canApproveReject = isAdmin || isSuperAdmin;
  const isAssignedAdmin =
    isSuperAdmin ||
    (po.assignedToAdminId != null && po.assignedToAdminId.trim() !== ''
      ? po.assignedToAdminId === userId
      : isAdmin);
  const showApproveReject =
    po.status === 'pending_approval' && canApproveReject && isAssignedAdmin;
  const isOtherAdminViewing =
    po.status === 'pending_approval' &&
    canApproveReject &&
    !isAssignedAdmin;
  const isReadOnly =
    po.status === 'received' || po.status === 'rejected';
  const statusBadge =
    po.status === 'pending_approval'
      ? canApproveReject
        ? 'PENDING APPROVAL'
        : 'Sent for approval'
      : po.status === 'approved'
        ? 'Approved'
        : po.status === 'received'
          ? 'Received'
          : 'Rejected';

  const hasAnyPrice = (po.items ?? []).some(
    (i) => (Number(i.unitPrice) || 0) > 0
  );

  const showPrint = po.status !== 'pending_approval';

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title={canApproveReject ? `Review ${po.poNumber}` : po.poNumber}
        showBack
        onBackPress={handleBack}
        rightAction={
          showPrint
            ? {
                icon: 'print-outline',
                label: 'Print',
                onPress: handlePrint,
                accessibilityLabel: 'Print purchase order',
              }
            : undefined
        }
      />

      {reduxError && (
        <View className="bg-[#DC2626]/15 px-4 py-3 border-b border-[#DC2626]/30 flex-row items-center gap-2">
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <Text className="text-[14px] text-[#DC2626] flex-1">{reduxError}</Text>
          <TouchableOpacity
            onPress={() => dispatch(clearError())}
            className="px-3 py-1.5 bg-[#DC2626] rounded-lg"
            accessibilityLabel="Dismiss error"
            accessibilityRole="button"
          >
            <Text className="text-[13px] font-medium text-white">Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="text-[13px] text-[#64748B]">Submitted by</Text>
          <Text className="text-[15px] text-[#0F172A]">
            {po.createdByName} • {formatDate(po.createdAt)}
          </Text>
          <Text
            className={`text-[13px] mt-1 font-medium ${
              po.status === 'received'
                ? 'text-[#16A34A]'
                : po.status === 'rejected'
                  ? 'text-[#DC2626]'
                  : po.status === 'approved'
                    ? 'text-[#1E40AF]'
                    : 'text-[#D97706]'
            }`}
          >
            {po.status === 'pending_approval' && canApproveReject ? '⏳ ' : ''}
            {statusBadge}
          </Text>
        </View>

        {po.status === 'received' && (
          <GrrReceiptsSection receipts={po.grrReceipts} />
        )}

        {isOtherAdminViewing && (po.assignedToAdminId || po.assignedToAdminName) && (
          <View className="mb-4 rounded-[10px] bg-[#FEF3C7] border border-[#FCD34D] p-4">
            <Text className="text-[13px] text-[#92400E]">
              {po.assignedToAdminName?.trim()
                ? <>Assigned to: <Text className="font-semibold">{po.assignedToAdminName}</Text></>
                : 'Assigned to another admin'}
            </Text>
            <Text className="text-[13px] text-[#B45309] mt-1">
              Only the assigned admin can approve or reject this PO.
            </Text>
          </View>
        )}

        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
            VENDOR
          </Text>
          <Text className="text-[15px] text-[#0F172A]">{po.vendorName}</Text>
          <Text className="text-[13px] text-[#64748B] mt-1">
            📞 {po.vendorContact}
          </Text>
        </View>

        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
            ITEMS
          </Text>
          {po.items.map((item, i) => (
            <View
              key={item.itemId + i}
              className={`flex-row items-start gap-3 py-3 border-b border-[#E2E8F0] ${
                i === po.items.length - 1 ? 'border-b-0' : ''
              }`}
            >
              <View className="flex-1 min-w-0">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Item</Text>
                <Text
                  className="text-[15px] font-medium text-[#0F172A]"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.itemName}
                </Text>
              </View>
              <View className="shrink-0 min-w-[64px]">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Qty</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {/*
                    orderedUnit/orderedQuantity represent user-entered ordering unit.
                    Fallback to item's base inventory unit for consistency across modules.
                  */}
                  {item.orderedQuantity != null && item.orderedUnit
                    ? `${item.orderedQuantity} ${item.orderedUnit}`
                    : `${item.quantity} ${item.unit || 'Pcs'}`}
                </Text>
              </View>
              <View className="shrink-0 min-w-[72px] items-end">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Unit Price</Text>
                <Text
                  className="text-[15px] text-[#0F172A]"
                  numberOfLines={1}
                >
                  {formatCurrencyOrOptional(item.unitPrice ?? 0)}
                </Text>
              </View>
              <View className="shrink-0 min-w-[56px] items-end">
                <Text className="text-[13px] text-[#64748B] mb-0.5">GST %</Text>
                <Text
                  className="text-[15px] text-[#0F172A]"
                  numberOfLines={1}
                >
                  {formatGstOrOptional(item.gstPercentage)}
                </Text>
              </View>
              <View className="shrink-0 min-w-[72px] items-end">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Total</Text>
                <Text
                  className="text-[15px] font-semibold text-[#0F172A]"
                  numberOfLines={1}
                >
                  {formatCurrencyOrOptional(
                    item.amount +
                      (item.gstAmount ??
                        Math.round(
                          (item.amount * (item.gstPercentage ?? 0)) / 100
                        ))
                  )}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {hasAnyPrice && (
          <View className="mb-4">
            <View className="flex-row justify-between mb-1">
              <Text className="text-[15px] text-[#64748B]">Subtotal</Text>
              <Text className="text-[15px] text-[#0F172A]">
                {formatCurrencyOrOptional(po.subtotal)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-[15px] text-[#64748B]">Total GST</Text>
              <Text className="text-[15px] text-[#0F172A]">
                {formatCurrencyOrOptional(po.gstAmount)}
              </Text>
            </View>
            <View className="flex-row justify-between pt-2 border-t border-[#E2E8F0]">
              <Text className="text-[15px] font-semibold text-[#0F172A]">Total</Text>
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                {formatCurrencyOrOptional(po.totalAmount)}
              </Text>
            </View>
          </View>
        )}

        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
          <Text className="text-[13px] text-[#64748B] mb-1">Justification</Text>
          <Text className="text-[15px] text-[#0F172A]">
            {po.justification || '—'}
          </Text>
        </View>

        {isReadOnly && po.status === 'rejected' && (po.rejectionReason || po.adminComments) && (
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              REJECTION DETAILS
            </Text>
            {po.rejectionReason && (
              <View className="mb-2">
                <Text className="text-[13px] text-[#64748B] mb-1">Reason</Text>
                <Text className="text-[15px] text-[#DC2626]">
                  {po.rejectionReason}
                </Text>
              </View>
            )}
            {po.adminComments && (
              <View>
                <Text className="text-[13px] text-[#64748B] mb-1">Admin comments</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {po.adminComments}
                </Text>
              </View>
            )}
          </View>
        )}

        {po.status === 'received' && (
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              RECEIPT DETAILS
            </Text>

            <View className="flex-row justify-between mb-3">
              <View>
                <Text className="text-[13px] text-[#64748B]">Received by</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {po.receivedByName || '—'}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[13px] text-[#64748B]">Received on</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {formatDate(po.receivedAt)}
                </Text>
              </View>
            </View>

            {po.receivedNotes ? (
              <View className="bg-[#F8FAFC] rounded-lg px-3 py-2 mb-3 border border-[#E2E8F0]">
                <Text className="text-[12px] text-[#64748B] mb-0.5">Notes</Text>
                <Text className="text-[14px] text-[#0F172A]">{po.receivedNotes}</Text>
              </View>
            ) : null}

            <Text className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">
              Items Received
            </Text>

            {po.items.map((item, i) => {
              const orderedQty = item.quantity;
              const receivedQty = item.receivedQuantity ?? 0;
              const isExact = receivedQty === orderedQty;
              const isPartial = receivedQty < orderedQty;
              const isExcess = receivedQty > orderedQty;
              const orderedLabel =
                item.orderedQuantity != null && item.orderedUnit
                  ? `${item.orderedQuantity} ${item.orderedUnit}`
                  : `${orderedQty} ${item.unit || 'Pcs'}`;

              return (
                <View
                  key={item.itemId + i}
                  className={`py-3 ${i < po.items.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text
                      className="text-[15px] font-medium text-[#0F172A] flex-1 mr-2"
                      numberOfLines={1}
                    >
                      {item.itemName}
                    </Text>
                    {isExact && (
                      <View className="px-2 py-1 rounded-full bg-[#16A34A]/15">
                        <Text className="text-[12px] font-medium text-[#16A34A]">
                          Exact
                        </Text>
                      </View>
                    )}
                    {isPartial && (
                      <View className="px-2 py-1 rounded-full bg-[#D97706]/15">
                        <Text className="text-[12px] font-medium text-[#D97706]">
                          Partial
                        </Text>
                      </View>
                    )}
                    {isExcess && (
                      <View className="px-2 py-1 rounded-full bg-[#7C3AED]/15">
                        <Text className="text-[12px] font-medium text-[#7C3AED]">
                          Excess
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[13px] text-[#64748B]">
                    {`Ordered: ${orderedLabel}   •   Received: ${receivedQty} ${item.unit || 'Pcs'}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {po.status === 'received' &&
          Array.isArray(po.documents) &&
          po.documents.length > 0 && (
            <View className="mb-4">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                ATTACHED DOCUMENTS
              </Text>
              <Text className="text-[13px] text-[#64748B] mb-2">
                Invoice and bills attached at receipt
              </Text>
              {po.documents.map((doc, index) => (
                <PODocumentCard
                  key={`${doc.fileName}-${index}`}
                  fileName={doc.fileName}
                  fileUrl={doc.fileUrl}
                  type={doc.type}
                />
              ))}
            </View>
          )}

        {showApproveReject && (
          <>
            <FormField
              label="Comments (Optional)"
              value={adminComments}
              onChangeText={setAdminComments}
              placeholder="e.g. Negotiate for discount"
              multiline
            />

            {showRejectForm && (
              <View className="mt-4">
                <FormField
                  label="Rejection Reason"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="Required for rejection"
                  error={
                    !rejectionReason.trim() ? 'Reason is required' : undefined
                  }
                  required
                  multiline
                />
              </View>
            )}

            <View className="flex-row gap-3 mt-6">
              {!showRejectForm ? (
                <>
                  <TouchableOpacity
                    onPress={() => setShowRejectForm(true)}
                    className="flex-1 border-[1.5px] border-[#DC2626] rounded-[10px] h-[50px] items-center justify-center"
                  >
                    <Text className="text-[15px] font-semibold text-[#DC2626]">
                      Reject
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleApprove}
                    disabled={saving}
                    className="flex-1 rounded-[10px] h-[50px] items-center justify-center bg-[#16A34A]"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-[15px] font-semibold text-white">
                        Approve
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                    className="flex-1 border-[1.5px] border-[#64748B] rounded-[10px] h-[50px] items-center justify-center"
                  >
                    <Text className="text-[15px] font-semibold text-[#64748B]">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleReject}
                    disabled={saving || !rejectionReason.trim()}
                    className="flex-1 bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-[15px] font-semibold text-white">
                        Confirm Reject
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

      </ScrollView>
    </ScreenLayout>
  );
};
