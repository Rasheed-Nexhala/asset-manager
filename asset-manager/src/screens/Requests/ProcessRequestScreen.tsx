import React, { useEffect, useState, useCallback } from 'react';
import { useAutoClearError } from '../../hooks/useAutoClearError';
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
import { RequestTypeBadge } from '../../components/Requests/RequestTypeBadge';
import { ViewModeToggle } from '../../components/Inventory/ViewModeToggle';
import { FormField } from '../../components/FormField';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { isWeightBasedItem } from '../../utils/weightConversionUtils';
import { requestService } from '../../services/firebase/requestService';
import {
  approveRequest,
  partialApproveAndSplit,
} from '../../store/thunks/requestThunks';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
  selectCanManageRequests,
  selectIsSiteManager,
  selectIsStoreIncharge,
  selectCanReturnItemsToCentralStore,
} from '../../store/selectors/authSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { selectRequestById } from '../../store/selectors/requestSelectors';
import type { Request, ItemAvailability, ItemCondition } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';
import {
  printTransferSlip,
  canPrintTransferSlip,
} from '../../utils/transferSlipPdfUtils';
import { SupervisorAllocationsSection } from '../../components/Requests/SupervisorAllocationsSection';
import { VehicleFuelAllocationsSection } from '../../components/Requests/VehicleFuelAllocationsSection';

type RouteParams = RouteProp<RequestStackParamList, 'ProcessRequest'>;
type NavigationProp = StackNavigationProp<RequestStackParamList, 'ProcessRequest'>;

/** Human-readable labels for return condition (visible to request queue staff) */
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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  const { requestId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const canManageRequests = useAppSelector(selectCanManageRequests);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const canReturnToCentralStore = useAppSelector(selectCanReturnItemsToCentralStore);
  const inventoryItems = useAppSelector(selectAllItems);
  const requestFromStore = useAppSelector(selectRequestById(requestId));

  // Ensure inventory items are loaded so unit fallback works for old requests
  useEffect(() => {
    if (inventoryItems.length === 0) {
      dispatch(fetchItems({}));
    }
  }, [dispatch, inventoryItems.length]);
  const { viewMode, toggleViewMode } = useWeightViewPreference();
  const [request, setRequest] = useState<Request | null>(requestFromStore ?? null);
  const [approvedQuantities, setApprovedQuantities] = useState<Record<string, number>>({});
  const [availability, setAvailability] = useState<ItemAvailability[]>([]);
  const [storeNotes, setStoreNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [slipPrinting, setSlipPrinting] = useState(false);

  // Set up real-time subscription for this specific request
  useEffect(() => {
    let cancelled = false;
    setSubscriptionError(null);

    const unsubscribe = requestService.subscribeToRequest(
      requestId,
      (updatedRequest) => {
        if (!cancelled) {
          if (updatedRequest) {
            setRequest(updatedRequest);
            setSubscriptionError(null);
          } else {
            setRequest(null);
          }
        }
      },
      (error) => {
        if (!cancelled) {
          setSubscriptionError(error?.message ?? 'Failed to load request. Pull to retry.');
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [requestId, retryKey]);

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

  // Initialize approvedQuantities when request loads or changes to pending
  useEffect(() => {
    if (request && request.status === 'pending') {
      setApprovedQuantities((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: Record<string, number> = {};
        const items = Array.isArray(request.items) ? request.items : [];
        items.forEach((item) => {
          initial[item.itemId] = item.quantityRequested;
        });
        return initial;
      });
    }
  }, [request]);

  const handleQuantityChange = useCallback((itemId: string, qty: number) => {
    const originalItem = Array.isArray(request?.items) 
      ? request.items.find(i => i.itemId === itemId) 
      : null;
    const maxQty = originalItem?.quantityRequested ?? Infinity;
    
    const clampedQty = Math.max(0, Math.min(qty, maxQty));
    
    setApprovedQuantities(prev => ({
      ...prev,
      [itemId]: clampedQty
    }));
  }, [request]);

  const canProcess = canManageRequests;
  const isPending = request?.status === 'pending';
  const selectedLinesSufficient =
    availability.length > 0 &&
    availability.every((a) => {
      const qty = approvedQuantities[a.itemId] ?? a.requested;
      if (qty <= 0) return true;
      return a.available >= qty;
    });
  const hasAtLeastOneApprovedLine =
    request?.items?.some((it) => {
      const q = approvedQuantities[it.itemId] ?? it.quantityRequested;
      return q > 0;
    }) ?? false;
  const fullQuantityApproval =
    request?.items?.every((it) => {
      const q = approvedQuantities[it.itemId] ?? it.quantityRequested;
      return q === it.quantityRequested;
    }) ?? false;
  const allOriginalLinesSufficient =
    availability.length > 0 &&
    availability.every((a) => a.available >= a.requested);
  const hasBlockingShortfall =
    availability.some((a) => {
      const qty = approvedQuantities[a.itemId] ?? a.requested;
      return qty > 0 && a.available < qty;
    }) ?? false;
  const canApprovePending =
    canProcess &&
    !!isPending &&
    !isCheckingAvailability &&
    selectedLinesSufficient &&
    hasAtLeastOneApprovedLine &&
    !hasBlockingShortfall;

  useEffect(() => {
    if (!request || !isPending) {
      setIsCheckingAvailability(false);
      return;
    }

    // Only check availability if user can manage requests (Store Incharge or Super Admin)
    if (!canProcess) {
      setIsCheckingAvailability(false);
      setAvailability([]);
      return;
    }

    const check = async () => {
      setIsCheckingAvailability(true);
      try {
        const items = Array.isArray(request.items) ? request.items : [];
        const itemsToCheck = items.map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantityRequested: item.quantityRequested,
        }));
        // Site transfer: check availability at source site, not central store
        const sourceLocationId =
          request.requestType === 'site_transfer' && request.sourceSiteId
            ? `site_${request.sourceSiteId}`
            : 'store';
        const result = await requestService.checkItemsAvailability(itemsToCheck, sourceLocationId);
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
      if (!a) return undefined;
      const requested = approvedQuantities[itemId] ?? a.requested;
      if (requested <= 0) {
        return { available: a.available, sufficient: true };
      }
      return { available: a.available, sufficient: a.available >= requested };
    },
    [availability, approvedQuantities]
  );

  const handleCreatePOForShortfall = useCallback(() => {
    // Identify items with shortfall
    const shortfallItems = availability.filter((a) => !a.sufficient);
    const selectedItems = inventoryItems.filter((i) => 
      shortfallItems.some((sa) => sa.itemId === i.id)
    );
    
    // Map their shortfall quantities
    const initialQuantities: Record<string, number> = {};
    shortfallItems.forEach((sa) => {
      initialQuantities[sa.itemId] = Math.max(0, sa.requested - sa.available);
    });

    // Navigate to PurchaseOrders tab -> CreatePO screen
    (navigation as any).navigate('PurchaseOrders', {
      screen: 'CreatePO',
      params: {
        selectedItems,
        initialQuantities,
      }
    });
  }, [availability, inventoryItems, navigation]);

  // Replenishment: after fulfilling this request, will central store fall below minStockLevel?
  // Only for standard requests (central store → site). Site transfers move between sites.
  const replenishmentItems = React.useMemo(() => {
    if (
      request?.requestType === 'site_transfer' ||
      availability.length === 0 ||
      !selectedLinesSufficient ||
      !fullQuantityApproval
    ) {
      return [];
    }
    const items: Array<{ itemId: string; itemName: string; qtyToReplenish: number }> = [];
    availability.forEach((a) => {
      const requested = approvedQuantities[a.itemId] ?? a.requested;
      if (requested <= 0) return;
      const remainingAfterFulfillment = a.available - requested;
      const invItem = inventoryItems.find((i) => i.id === a.itemId);
      const minStockLevel = invItem?.minStockLevel ?? 0;
      if (remainingAfterFulfillment < minStockLevel) {
        const qtyToReplenish = minStockLevel - remainingAfterFulfillment;
        items.push({
          itemId: a.itemId,
          itemName: a.itemName,
          qtyToReplenish: Math.max(1, Math.ceil(qtyToReplenish)),
        });
      }
    });
    return items;
  }, [
    request?.requestType,
    availability,
    selectedLinesSufficient,
    fullQuantityApproval,
    approvedQuantities,
    inventoryItems,
  ]);

  const handleCreatePOForReplenishment = useCallback(() => {
    if (replenishmentItems.length === 0) return;
    const selectedItems = inventoryItems.filter((i) =>
      replenishmentItems.some((r) => r.itemId === i.id)
    );
    const initialQuantities: Record<string, number> = {};
    replenishmentItems.forEach((r) => {
      initialQuantities[r.itemId] = r.qtyToReplenish;
    });
    (navigation as any).navigate('PurchaseOrders', {
      screen: 'CreatePO',
      params: {
        selectedItems,
        initialQuantities,
      }
    });
  }, [replenishmentItems, inventoryItems, navigation]);

  useAutoClearError(subscriptionError, () => setSubscriptionError(null));

  const handleApprove = useCallback(async () => {
    if (!request || !userId || !userName || !canApprovePending) return;

    setIsLoading(true);
    try {
      const approveSourceLocationId =
        request.requestType === 'site_transfer' && request.sourceSiteId
          ? `site_${request.sourceSiteId}`
          : 'store';

      const itemsToCheck = (Array.isArray(request.items) ? request.items : [])
        .map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantityRequested:
            approvedQuantities[item.itemId] ?? item.quantityRequested,
        }))
        .filter((row) => row.quantityRequested > 0);

      const currentAvailability = await requestService.checkItemsAvailability(
        itemsToCheck,
        approveSourceLocationId
      );
      const isStillSufficient =
        currentAvailability.length > 0 &&
        currentAvailability.every((a) => {
          const qty =
            approvedQuantities[a.itemId] ??
            request.items?.find((i) => i.itemId === a.itemId)?.quantityRequested ??
            a.requested;
          if (qty <= 0) return true;
          return a.available >= qty;
        });

      if (!isStillSufficient) {
        const fullCheck = await requestService.checkItemsAvailability(
          (request.items ?? []).map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantityRequested: item.quantityRequested,
          })),
          approveSourceLocationId
        );
        setAvailability(fullCheck);
        Alert.alert(
          'Error',
          'Insufficient stock. Another transaction may have reduced the available quantity.'
        );
        return;
      }

      if (fullQuantityApproval) {
        await dispatch(
          approveRequest({
            requestId: request.id,
            processedBy: userId,
            processedByName: userName,
            storeNotes: storeNotes.trim() || undefined,
            updatedItems: Object.entries(approvedQuantities).map(([itemId, quantityApproved]) => ({
              itemId,
              quantityApproved,
            })),
          })
        ).unwrap();
      } else {
        const approvedLineItems = (request.items ?? [])
          .map((item) => ({
            itemId: item.itemId,
            quantityApproved:
              approvedQuantities[item.itemId] ?? item.quantityRequested,
          }))
          .filter((row) => row.quantityApproved > 0);

        const result = await dispatch(
          partialApproveAndSplit({
            parentRequestId: request.id,
            approvedLineItems,
            storeNotes: storeNotes.trim() || undefined,
          })
        ).unwrap();

        if (result.remainderRequestNumber) {
          Alert.alert(
            'Approved',
            `Selected lines approved. Remainder: ${result.remainderRequestNumber}`
          );
        }
      }
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to approve request'
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    request,
    userId,
    userName,
    storeNotes,
    canApprovePending,
    fullQuantityApproval,
    approvedQuantities,
    dispatch,
  ]);

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
  /**
   * Physically returnable qty excludes items still with supervisors
   * (`supervisorOutstandingQty`), since those are not in the Site Manager's hand yet.
   * They become returnable as supervisors hand them back.
   */
  const hasItemsToReturn = nonConsumables.some((i) => {
    const remaining =
      i.quantityApproved - (i.quantityReturned ?? 0) - (i.supervisorOutstandingQty ?? 0);
    return remaining > 0;
  });
  /**
   * Gate the "Return to central store" button:
   * - Store Incharge: allowed on any request (they receive at warehouse).
   * - Site Manager:  allowed only on requests they created (enforced by Firestore rules too).
   */
  const canExecuteReturn =
    canReturnToCentralStore && (isStoreIncharge || (isSiteManager && isRequestOwner));
  const showReturnItems =
    (isTransferred || isPartiallyReturned) && canExecuteReturn && hasItemsToReturn;
  const tabNavigation =
    typeof navigation.getParent === 'function' ? navigation.getParent() : null;
  const showTransferSlipPrint = request ? canPrintTransferSlip(request) : false;
  const hasSupervisorSplittableItems = Boolean(
    request?.items?.some((i) => i.itemType === 'consumable' || i.itemType === 'non_consumable')
  );
  const hasFuelItems = Boolean(request?.items?.some((i) => i.itemType === 'fuel'));

  const handlePrintTransferSlip = useCallback(async () => {
    if (!request) return;
    setSlipPrinting(true);
    try {
      await printTransferSlip(request);
    } catch (err) {
      Alert.alert(
        'Could not share slip',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setSlipPrinting(false);
    }
  }, [request]);

  if (!request) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Process Request" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          {subscriptionError ? (
            <>
              <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
              <Text className="text-[17px] font-semibold text-[#0F172A] mt-4 text-center">
                Unable to Load Request
              </Text>
              <Text className="text-[15px] text-[#64748B] mt-2 text-center">
                {subscriptionError}
              </Text>
              <TouchableOpacity
                onPress={() => setRetryKey((k) => k + 1)}
                className="mt-6 bg-[#1E40AF] rounded-[10px] h-[50px] px-8 items-center justify-center"
              >
                <Text className="text-[15px] font-semibold text-white">Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading request...
              </Text>
            </>
          )}
        </View>
      </ScreenLayout>
    );
  }

  const priorityInfo =
    priorityConfig[request.priority as keyof typeof priorityConfig] ??
    priorityConfig.medium;

  const requestScreenTitle =
    request.status === 'rejected' || request.status === 'transferred'
      ? 'View Request'
      : 'Process Request';

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title={requestScreenTitle} showBack onBackPress={handleBack} />

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          {/* Request Header */}
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2 flex-1">
                <Text className="text-lg">{priorityInfo.emoji}</Text>
                <Text className="text-[17px] font-semibold text-[#0F172A]">
                  {request.requestNumber}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <RequestTypeBadge requestType={request.requestType} />
                <RequestStatusBadge status={request.status} />
              </View>
            </View>

            <View className="gap-2">
              {request.requestType === 'site_transfer' ? (
                <>
                  <View className="flex-row justify-between">
                    <Text className="text-[13px] text-[#64748B]">From Site</Text>
                    <Text className="text-[15px] text-[#0F172A]">
                      {request.sourceSiteName ?? '—'}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[13px] text-[#64748B]">To Site</Text>
                    <Text className="text-[15px] text-[#0F172A]">
                      {request.siteName}
                    </Text>
                  </View>
                </>
              ) : (
                <View className="flex-row justify-between">
                  <Text className="text-[13px] text-[#64748B]">Site</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    {request.siteName}
                  </Text>
                </View>
              )}
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

            {(request.splitFromRequestId || request.splitRemainderRequestId) && (
              <View className="mt-3 pt-3 border-t border-[#E2E8F0] gap-2">
                {request.splitFromRequestId && (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('ProcessRequest', {
                        requestId: request.splitFromRequestId!,
                      })
                    }
                    accessibilityRole="button"
                  >
                    <Text className="text-[13px] font-medium text-[#1E40AF]">
                      Continued from {request.splitFromRequestNumber ?? 'previous request'}
                    </Text>
                  </TouchableOpacity>
                )}
                {request.splitRemainderRequestId && (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('ProcessRequest', {
                        requestId: request.splitRemainderRequestId!,
                      })
                    }
                    accessibilityRole="button"
                  >
                    <Text className="text-[13px] font-medium text-[#1E40AF]">
                      Open remainder {request.splitRemainderRequestNumber ?? ''}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Items List */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                Items
              </Text>
              {(Array.isArray(request.items) ? request.items : []).some((i) => isWeightBasedItem({ weightPerMeter: i.weightPerMeter })) && (
                <ViewModeToggle viewMode={viewMode} onToggle={toggleViewMode} compact />
              )}
            </View>
            {(Array.isArray(request.items) ? request.items : []).map((item) => (
              <RequestItemCard
                key={item.itemId}
                item={{
                  ...item,
                  quantityRequested: approvedQuantities[item.itemId] ?? item.quantityRequested,
                  unit:
                    item.unit ||
                    inventoryItems.find((inventoryItem) => inventoryItem.id === item.itemId)?.unit,
                }}
                mode={canProcess && isPending ? 'edit' : 'view'}
                onQuantityChange={handleQuantityChange}
                availability={
                  canProcess && isPending
                    ? getAvailabilityForItem(item.itemId)
                    : undefined
                }
              />
            ))}
          </View>

          {isSiteManager &&
            isRequestOwner &&
            (isTransferred || isPartiallyReturned) &&
            tabNavigation != null &&
            hasSupervisorSplittableItems && (
              <SupervisorAllocationsSection
                siteId={request.siteId}
                requestId={request.id}
                requestItems={request.items}
                tabNavigation={tabNavigation}
              />
            )}

          {isSiteManager &&
            isRequestOwner &&
            (isTransferred || isPartiallyReturned) &&
            tabNavigation != null &&
            hasFuelItems && (
              <VehicleFuelAllocationsSection requestId={request.id} tabNavigation={tabNavigation} />
            )}

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
                            className="mb-2"
                          >
                            <View className="flex-row items-center justify-between py-2">
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
                            {isDamaged && returnEvent.returnNotes && (
                              <View className="flex-row items-center gap-1 mt-1">
                                <Ionicons name="warning" size={16} color="#D97706" />
                                <Text className="text-[13px] text-[#D97706]">
                                  Damaged • {returnEvent.returnNotes}
                                </Text>
                              </View>
                            )}
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
                          className="mb-2"
                        >
                          <View className="flex-row flex-wrap items-center justify-between py-2">
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
                          {isDamaged && request.returnNotes && (
                            <View className="flex-row items-center gap-1 mt-1">
                              <Ionicons name="warning" size={16} color="#D97706" />
                              <Text className="text-[13px] text-[#D97706]">
                                Damaged • {request.returnNotes}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}

          {canProcess &&
            isPending &&
            !isCheckingAvailability &&
            hasBlockingShortfall &&
            availability.length > 0 && (
              <View className="bg-[#DC2626]/15 rounded-[10px] p-4 border border-[#DC2626]/30">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="alert-circle" size={24} color="#DC2626" />
                  <Text className="text-[15px] font-semibold text-[#DC2626]">
                    Insufficient Stock
                  </Text>
                </View>
                <Text className="text-[13px] text-[#64748B] mb-3">
                  Reduce the approved quantity or set a line to 0 to exclude it. You can approve
                  available lines now; excluded lines become a new pending request.
                </Text>
                {request.requestType !== 'site_transfer' && (
                  <TouchableOpacity
                    onPress={handleCreatePOForShortfall}
                    className="bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 mt-1"
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Create PO for Shortfall"
                  >
                    <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">
                      Create PO for Shortfall
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          {canProcess &&
            isPending &&
            !isCheckingAvailability &&
            !allOriginalLinesSufficient &&
            !hasBlockingShortfall &&
            availability.length > 0 &&
            request.requestType !== 'site_transfer' && (
              <View className="bg-[#DC2626]/15 rounded-[10px] p-4 border border-[#DC2626]/30">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="alert-circle" size={24} color="#DC2626" />
                  <Text className="text-[15px] font-semibold text-[#DC2626]">
                    Stock short on some lines
                  </Text>
                </View>
                <Text className="text-[13px] text-[#64748B] mb-3">
                  Lower quantities or set unavailable lines to 0 to approve what is in stock now.
                  Remaining quantities will open as a new pending request. You can also create a PO
                  for shortfall.
                </Text>
                <TouchableOpacity
                  onPress={handleCreatePOForShortfall}
                  className="bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 mt-1"
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Create PO for Shortfall"
                >
                  <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                  <Text className="text-[15px] font-semibold text-white">
                    Create PO for Shortfall
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {canProcess &&
            isPending &&
            !isCheckingAvailability &&
            !allOriginalLinesSufficient &&
            !hasBlockingShortfall &&
            availability.length > 0 &&
            request.requestType === 'site_transfer' && (
              <View className="bg-[#D97706]/10 rounded-[10px] p-4 border border-[#D97706]/30">
                <Text className="text-[13px] text-[#64748B]">
                  Some lines are short at {request.sourceSiteName ?? 'the source site'}. Adjust
                  quantities (or set to 0 to exclude) to approve what is available; excluded lines
                  stay on a new pending request.
                </Text>
              </View>
            )}

          {/* Replenishment Banner: Stock sufficient but will go low after fulfillment */}
          {canProcess &&
            isPending &&
            !isCheckingAvailability &&
            selectedLinesSufficient &&
            fullQuantityApproval &&
            replenishmentItems.length > 0 && (
              <View className="bg-[#D97706]/10 rounded-[10px] p-4 border border-[#D97706]/30">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="alert-circle-outline" size={24} color="#D97706" />
                  <Text className="text-[15px] font-semibold text-[#D97706]">
                    Replenishment recommended
                  </Text>
                </View>
                <Text className="text-[13px] text-[#64748B] mb-3">
                  After fulfilling this request, central store stock will fall below the minimum
                  level for {replenishmentItems.length} item{replenishmentItems.length > 1 ? 's' : ''}.
                  Create a PO to replenish and avoid stockouts.
                </Text>
                <TouchableOpacity
                  onPress={handleCreatePOForReplenishment}
                  className="bg-[#D97706] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 mt-1"
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Create PO to replenish"
                >
                  <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                  <Text className="text-[15px] font-semibold text-white">
                    Create PO to replenish
                  </Text>
                </TouchableOpacity>
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
              disabled={isLoading || !canApprovePending}
              className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              style={{
                opacity: !canApprovePending ? 0.5 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Approve request"
              accessibilityState={{
                disabled: !canApprovePending,
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

      {/* Confirm Transfer - queue staff when request is approved */}
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

      {showTransferSlipPrint && (
        <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
          <TouchableOpacity
            onPress={handlePrintTransferSlip}
            disabled={slipPrinting}
            className="border-2 border-[#CBD5E1] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
            style={{ opacity: slipPrinting ? 0.6 : 1 }}
            accessibilityRole="button"
            accessibilityLabel="Share or print transfer slip PDF"
          >
            {slipPrinting ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#0F172A" />
                <Text className="text-[15px] font-semibold text-[#0F172A]">
                  Transfer slip (PDF)
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text className="text-[13px] text-[#64748B] mt-2 text-center">
            Proof of transfer with company details and a unique slip number.
          </Text>
        </View>
      )}

      {/* Return to central store — Store Incharge (any request) or Site Manager (own request) */}
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
              Return to central store
            </Text>
          </TouchableOpacity>
          <Text className="text-[13px] text-[#64748B] mt-2 text-center">
            {isSiteManager
              ? 'Return non-consumables currently with you. Items still with supervisors must be handed back first.'
              : 'Non-consumables are moved from the site back to the central store.'}
          </Text>
        </View>
      )}
    </ScreenLayout>
  );
};
