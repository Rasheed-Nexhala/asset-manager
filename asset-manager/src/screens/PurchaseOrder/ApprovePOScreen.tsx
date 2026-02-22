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
import { getPOById } from '../../services/firebase/purchaseOrderService';
import { approvePO, rejectPO } from '../../store/thunks/purchaseOrderThunks';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsAdmin,
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

export const ApprovePOScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { poId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isAdmin = useAppSelector(selectIsAdmin);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    getPOById(poId).then(setPo).finally(() => setLoading(false));
  }, [poId]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

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

  if (!isAdmin) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Review PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] text-[#64748B]">
            Only Admin can approve or reject purchase orders.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (loading || !po) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Review PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading purchase order...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (po.status !== 'pending_approval') {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Review PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] text-[#64748B] text-center">
            This PO is no longer pending approval. Status: {po.status}.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title={`Review ${po.poNumber}`}
        showBack
        onBackPress={handleBack}
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
          <Text className="text-[13px] text-[#D97706] mt-1 font-medium">
            ⏳ PENDING APPROVAL
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
              className={`flex-row gap-3 py-3 border-b border-[#E2E8F0] ${
                i === po.items.length - 1 ? 'border-b-0' : ''
              }`}
            >
              <View className="flex-[2] min-w-0">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Item</Text>
                <Text className="text-[15px] font-medium text-[#0F172A]">
                  {item.itemName}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Qty</Text>
                <Text className="text-[15px] text-[#0F172A]">{item.quantity}</Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Unit</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[13px] text-[#64748B] mb-0.5">Amount</Text>
                <Text className="text-[15px] font-semibold text-[#0F172A]">
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View className="mb-4">
          <Text className="text-[15px] font-semibold text-[#0F172A]">
            Total: {formatCurrency(po.totalAmount)}
          </Text>
        </View>

        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-4">
          <Text className="text-[13px] text-[#64748B] mb-1">Justification</Text>
          <Text className="text-[15px] text-[#0F172A]">
            {po.justification || '—'}
          </Text>
        </View>

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
              error={!rejectionReason.trim() ? 'Reason is required' : undefined}
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
      </ScrollView>
    </ScreenLayout>
  );
};
