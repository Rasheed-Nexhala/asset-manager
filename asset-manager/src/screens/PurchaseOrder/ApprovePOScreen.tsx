import React, { useEffect, useState, useCallback } from 'react';
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
  markPOOrdered,
} from '../../store/thunks/purchaseOrderThunks';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsAdmin,
  selectIsStoreIncharge,
} from '../../store/selectors/authSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
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

export const ApprovePOScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { poId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [poId, userId, userName, adminComments, dispatch, navigation]);

  const handleReject = useCallback(async () => {
    const reason = rejectionReason.trim();
    if (!reason) {
      Alert.alert('Error', 'Please provide a rejection reason.');
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [poId, userId, userName, rejectionReason, adminComments, dispatch, navigation]);

  const handleMarkOrdered = useCallback(async () => {
    setSaving(true);
    try {
      await dispatch(markPOOrdered({ poId })).unwrap();
      Alert.alert('Success', 'Purchase order marked as ordered.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to mark as ordered';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [poId, dispatch, navigation]);

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
            This PO has been marked as ordered. You can receive it from the list.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const canMarkOrdered =
    po.status === 'approved' && (isAdmin || isStoreIncharge);

  const isReadOnly =
    po.status === 'received' || po.status === 'rejected';
  const showApproveReject = po.status === 'pending_approval' && isAdmin;
  const statusBadge =
    po.status === 'pending_approval'
      ? isAdmin
        ? 'PENDING APPROVAL'
        : 'Sent for approval'
      : po.status === 'approved'
        ? 'Approved'
        : po.status === 'received'
          ? 'Received'
          : 'Rejected';

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title={isAdmin ? `Review ${po.poNumber}` : po.poNumber}
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
            {po.status === 'pending_approval' && isAdmin ? '⏳ ' : ''}
            {statusBadge}
          </Text>
        </View>

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
              <View className="shrink-0 w-10">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Qty</Text>
                <Text
                  className="text-[15px] text-[#0F172A]"
                  numberOfLines={1}
                >
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
                    className="flex-1 bg-[#16A34A] rounded-[10px] h-[50px] items-center justify-center"
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

        {canMarkOrdered && (
          <TouchableOpacity
            onPress={handleMarkOrdered}
            disabled={saving}
            className="mt-6 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">
                Mark as Ordered
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};
