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
import { RequestItemCard } from '../../components/Requests/RequestItemCard';
import { RequestStatusBadge } from '../../components/Requests/RequestStatusBadge';
import { ViewModeToggle } from '../../components/Inventory/ViewModeToggle';
import { FormField } from '../../components/FormField';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { isWeightBasedItem } from '../../utils/weightConversionUtils';
import { requestService } from '../../services/firebase/requestService';
import {
  approveRequest,
} from '../../store/thunks/requestThunks';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsStoreIncharge,
  selectIsAdmin,
} from '../../store/selectors/authSelectors';
import { selectRequestById } from '../../store/selectors/requestSelectors';
import type { Request, ItemAvailability, ItemCondition } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type RouteParams = RouteProp<RequestStackParamList, 'ProcessRequest'>;
type NavigationProp = StackNavigationProp<RequestStackParamList, 'ProcessRequest'>;

/** Human-readable labels for return condition (visible to Store Incharge / Admin) */
const CONDITION_LABELS: Record<ItemCondition, string> = {
  good: 'Good',
  needs_maintenance: 'Needs maintenance',
  damaged: 'Damaged',
};

const priorityConfig = {
  high: { emoji: '🔴', color: '#DC2626' },
  medium: { emoji: '🟡', color: '#D97706' },
  low: { emoji: '🟢', color: '#16A34A' },
};

const formatDate = (timestamp: { toDate?: () => Date } | null | undefined): string => {
  if (!timestamp) return '';
  const date =
    typeof (timestamp as { toDate?: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const ProcessRequestScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { requestId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const isAdmin = useAppSelector(selectIsAdmin);
  const requestFromStore = useAppSelector(selectRequestById(requestId));
  const { viewMode, toggleViewMode } = useWeightViewPreference();
  const [request, setRequest] = useState<Request | null>(requestFromStore ?? null);
  const [availability, setAvailability] = useState<ItemAvailability[]>([]);
  const [storeNotes, setStoreNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);

  // Set up real-time subscription for this specific request
  useEffect(() => {
    let cancelled = false;
    
    // Set up real-time listener for immediate updates
    const unsubscribe = requestService.subscribeToRequest(requestId, (updatedRequest) => {
      if (!cancelled && updatedRequest) {
        setRequest(updatedRequest);
      }
    });
    
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [requestId]);

  // Also update when Redux store changes (for real-time updates from subscriptions)
  useEffect(() => {
    if (requestFromStore && requestFromStore.id === requestId) {
      // Only update if the Redux data is more recent than our current local state
      const currentUpdatedAt = request?.updatedAt?.toMillis?.() || 0;
      const reduxUpdatedAt = requestFromStore.updatedAt?.toMillis?.() || 0;
      
      if (reduxUpdatedAt >= currentUpdatedAt) {
        setRequest(requestFromStore);
      }
    }
  }, [requestFromStore, requestId, request]);

  const canProcess = isStoreIncharge || isAdmin;
  const allSufficient = availability.length > 0 && availability.every((a) => a.sufficient);
  const isPending = request?.status === 'pending';

  useEffect(() => {
    if (!request || !isPending) {
      setIsCheckingAvailability(false);
      return;
    }

    // Only check availability if user can manage requests (Store Incharge or Admin)
    if (!canProcess) {
      setIsCheckingAvailability(false);
      setAvailability([]);
      return;
    }

    const check = async () => {
      setIsCheckingAvailability(true);
      try {
        const itemsToCheck = request.items.map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantityRequested: item.quantityRequested,
        }));
        const result = await requestService.checkItemsAvailability(itemsToCheck);
        setAvailability(result);
      } catch {
        setAvailability([]);
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    check();
  }, [request, isPending, canProcess]);

  const getAvailabilityForItem = useCallback(
    (itemId: string) => {
      const a = availability.find((av) => av.itemId === itemId);
      return a
        ? { available: a.available, sufficient: a.sufficient }
        : undefined;
    },
    [availability]
  );

  const handleApprove = useCallback(async () => {
    if (!request || !userId || !userName || !allSufficient) return;

    setIsLoading(true);
    try {
      await dispatch(
        approveRequest({
          requestId: request.id,
          processedBy: userId,
          processedByName: userName,
          storeNotes: storeNotes.trim() || undefined,
        })
      ).unwrap();

      Alert.alert('Success', 'Request approved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to approve request'
      );
    } finally {
      setIsLoading(false);
    }
  }, [request, userId, userName, storeNotes, allSufficient, dispatch, navigation]);

  const handleReject = useCallback(() => {
    navigation.navigate('RejectRequest', { requestId });
  }, [navigation, requestId]);

  const handleReturnItems = useCallback(() => {
    navigation.navigate('ReturnItems', { requestId });
  }, [navigation, requestId]);

  const handleConfirmTransfer = useCallback(() => {
    navigation.navigate('ConfirmTransfer', { requestId });
  }, [navigation, requestId]);

  const isTransferred = request?.status === 'transferred';
  const isPartiallyReturned = request?.status === 'partially_returned';
  const isApproved = request?.status === 'approved';
  const showConfirmTransfer = isApproved && canProcess;
  const isRequestOwner = request?.requestedBy === userId;
  const nonConsumables = request?.items?.filter((i) => i.itemType === 'non_consumable') ?? [];
  const hasItemsToReturn = nonConsumables.some(
    (i) => (i.quantityReturned ?? 0) < i.quantityApproved
  );
  const showReturnItems =
    (isTransferred || isPartiallyReturned) &&
    isRequestOwner &&
    !canProcess &&
    hasItemsToReturn;

  if (!request) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Process Request" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading request...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const priorityInfo = priorityConfig[request.priority];

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Process Request" />

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          {/* Request Header */}
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">{priorityInfo.emoji}</Text>
                <Text className="text-[17px] font-semibold text-[#0F172A]">
                  {request.requestNumber}
                </Text>
              </View>
              <RequestStatusBadge status={request.status} />
            </View>

            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-[13px] text-[#64748B]">Site</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {request.siteName}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[13px] text-[#64748B]">Requested by</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {request.requestedByName}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[13px] text-[#64748B]">Created</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {formatDate(request.createdAt)}
                </Text>
              </View>
            </View>

            <View className="mt-3 pt-3 border-t border-[#E2E8F0]">
              <Text className="text-[13px] text-[#64748B] mb-1">Purpose</Text>
              <Text className="text-[15px] text-[#0F172A]">{request.purpose}</Text>
            </View>
          </View>

          {/* Items List */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                Items
              </Text>
              {request.items.some((i) => isWeightBasedItem({ weightPerMeter: i.weightPerMeter })) && (
                <ViewModeToggle viewMode={viewMode} onToggle={toggleViewMode} compact />
              )}
            </View>
            {request.items.map((item) => (
              <RequestItemCard
                key={item.itemId}
                item={item}
                mode="view"
                availability={
                  canProcess && isPending
                    ? getAvailabilityForItem(item.itemId)
                    : undefined
                }
              />
            ))}
          </View>

          {/* Return history – shown when status is returned or partially_returned */}
          {((request.returnHistory && request.returnHistory.length > 0) ||
            (request.status === 'returned' &&
              request.returnItems &&
              request.returnItems.length > 0)) && (
              <View className="bg-[#F0FDF4] rounded-[10px] p-4 border border-[#16A34A]/30">
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons name="arrow-undo" size={20} color="#16A34A" />
                  <Text className="text-[17px] font-semibold text-[#0F172A]">
                    Return History
                  </Text>
                </View>
                {request.returnHistory && request.returnHistory.length > 0 ? (
                  request.returnHistory.map((returnEvent) => (
                    <View
                      key={returnEvent.returnId}
                      className="mb-4 pb-3 border-b border-[#E2E8F0] last:border-b-0 last:mb-0 last:pb-0"
                    >
                      <Text className="text-[15px] font-medium text-[#0F172A] mb-2">
                        {formatDate(returnEvent.returnedAt)} by {returnEvent.returnedByName}
                      </Text>
                      {returnEvent.returnNotes && returnEvent.returnNotes.trim() && (
                        <Text className="text-[13px] text-[#64748B] mb-2">
                          {returnEvent.returnNotes}
                        </Text>
                      )}
                      {returnEvent.items.map((ri) => {
                        const conditionLabel =
                          CONDITION_LABELS[ri.condition as ItemCondition] ?? ri.condition;
                        const isDamaged = ri.condition === 'damaged';
                        const needsMaintenance = ri.condition === 'needs_maintenance';
                        return (
                          <View
                            key={`${returnEvent.returnId}-${ri.itemId}`}
                            className="flex-row flex-wrap items-center justify-between py-2 border-b border-[#E2E8F0]/50 last:border-b-0"
                          >
                            <Text
                              className="text-[15px] text-[#0F172A] flex-1"
                              numberOfLines={1}
                            >
                              {ri.itemName}
                            </Text>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-[13px] text-[#64748B]">
                                Qty: {ri.quantityReturned} (Total: {ri.cumulativeReturned})
                              </Text>
                              <View
                                className={`rounded-full px-2 py-0.5 ${
                                  isDamaged
                                    ? 'bg-[#DC2626]/20'
                                    : needsMaintenance
                                      ? 'bg-[#D97706]/20'
                                      : 'bg-[#16A34A]/20'
                                }`}
                              >
                                <Text
                                  className={`text-[13px] font-medium ${
                                    isDamaged
                                      ? 'text-[#DC2626]'
                                      : needsMaintenance
                                        ? 'text-[#D97706]'
                                        : 'text-[#16A34A]'
                                  }`}
                                >
                                  {conditionLabel}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))
                ) : (
                  /* Legacy: single return (returnItems) */
                  <>
                    <View className="mb-2">
                      <Text className="text-[13px] text-[#64748B]">Returned</Text>
                      <Text className="text-[15px] text-[#0F172A]">
                        {formatDate(request.returnedAt)}
                      </Text>
                    </View>
                    {request.returnNotes && request.returnNotes.trim() && (
                      <View className="mb-3">
                        <Text className="text-[13px] text-[#64748B]">Return notes</Text>
                        <Text className="text-[15px] text-[#0F172A]">
                          {request.returnNotes}
                        </Text>
                      </View>
                    )}
                    <Text className="text-[13px] font-medium text-[#64748B] mb-2">
                      Items returned
                    </Text>
                    {request.returnItems?.map((ri) => {
                      const item = request.items.find((i) => i.itemId === ri.itemId);
                      const itemName = item?.itemName ?? ri.itemId;
                      const conditionLabel =
                        CONDITION_LABELS[ri.condition] ?? ri.condition;
                      const isDamaged = ri.condition === 'damaged';
                      const needsMaintenance = ri.condition === 'needs_maintenance';
                      return (
                        <View
                          key={ri.itemId}
                          className="flex-row flex-wrap items-center justify-between py-2 border-b border-[#E2E8F0] last:border-b-0"
                        >
                          <Text
                            className="text-[15px] text-[#0F172A] flex-1"
                            numberOfLines={1}
                          >
                            {itemName}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-[13px] text-[#64748B]">
                              Qty: {ri.quantityReturned}
                            </Text>
                            <View
                              className={`rounded-full px-2 py-0.5 ${
                                isDamaged
                                  ? 'bg-[#DC2626]/20'
                                  : needsMaintenance
                                    ? 'bg-[#D97706]/20'
                                    : 'bg-[#16A34A]/20'
                              }`}
                            >
                              <Text
                                className={`text-[13px] font-medium ${
                                  isDamaged
                                    ? 'text-[#DC2626]'
                                    : needsMaintenance
                                      ? 'text-[#D97706]'
                                      : 'text-[#16A34A]'
                                }`}
                              >
                                {conditionLabel}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}

          {/* Insufficient Stock Banner - CRITICAL: No Edit button, only wait or reject */}
          {canProcess &&
            isPending &&
            !isCheckingAvailability &&
            !allSufficient &&
            availability.length > 0 && (
              <View className="bg-[#DC2626]/15 rounded-lg p-4 border border-[#DC2626]/30">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="alert-circle" size={24} color="#DC2626" />
                  <Text className="text-[15px] font-semibold text-[#DC2626]">
                    Insufficient Stock
                  </Text>
                </View>
                <Text className="text-[13px] text-[#64748B]">
                  Some items do not have sufficient quantity in the central
                  store. You can wait for stock to arrive or reject this request.
                  Approval is disabled until all items are available.
                </Text>
              </View>
            )}

          {/* Store Notes (optional) */}
          {canProcess && isPending && (
            <FormField
              label="Store Notes (optional)"
              value={storeNotes}
              onChangeText={setStoreNotes}
              placeholder="Add any notes for this approval..."
              multiline
              numberOfLines={3}
            />
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions - NO Edit button. Reject always enabled. Approve disabled if insufficient. */}
      {canProcess && isPending && (
        <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleReject}
              disabled={isLoading}
              className="flex-1 border-[1.5px] border-[#DC2626] rounded-[10px] h-[50px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Reject request"
            >
              <Text className="text-[15px] font-semibold text-[#DC2626]">
                Reject
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApprove}
              disabled={isLoading || !allSufficient || isCheckingAvailability}
              className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              style={{
                opacity:
                  !allSufficient || isCheckingAvailability ? 0.5 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Approve request"
              accessibilityState={{
                disabled: !allSufficient || isCheckingAvailability,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-[15px] font-semibold text-white">
                  Approve
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Confirm Transfer - for Store Incharge/Admin when request is approved */}
      {showConfirmTransfer && (
        <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
          <TouchableOpacity
            onPress={handleConfirmTransfer}
            className="bg-[#16A34A] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
            accessibilityRole="button"
            accessibilityLabel="Confirm transfer of items to site"
          >
            <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">
              Confirm Transfer
            </Text>
          </TouchableOpacity>
          <Text className="text-[13px] text-[#64748B] mt-2 text-center">
            Items physically delivered? Confirm to update inventory.
          </Text>
        </View>
      )}

      {/* Return Items - for Site Managers viewing their own transferred request */}
      {showReturnItems && (
        <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
          <TouchableOpacity
            onPress={handleReturnItems}
            className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
            accessibilityRole="button"
            accessibilityLabel="Return items to central store"
          >
            <Ionicons name="arrow-undo" size={20} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">
              Return Items
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenLayout>
  );
};
