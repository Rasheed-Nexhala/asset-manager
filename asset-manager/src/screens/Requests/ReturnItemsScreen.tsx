import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { WeightDisplay } from '../../components/Inventory/WeightDisplay';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { ViewModeToggle } from '../../components/Inventory/ViewModeToggle';
import QuickMoveToMaintenanceButton from '../../components/Maintenance/QuickMoveToMaintenanceButton';
import { isWeightBasedItem } from '../../utils/weightConversionUtils';
import { returnItems } from '../../store/thunks/requestThunks';
import { requestService } from '../../services/firebase/requestService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
  selectIsSiteManager,
  selectIsStoreIncharge,
  selectCanReturnItemsToCentralStore,
} from '../../store/selectors/authSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import type {
  Request,
  RequestItem,
  ItemCondition,
  ReturnItemsData,
} from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type RouteParams = RouteProp<RequestStackParamList, 'ReturnItems'>;
type NavigationProp = StackNavigationProp<RequestStackParamList, 'ReturnItems'>;

const CONDITIONS: Array<{ value: ItemCondition; label: string }> = [
  { value: 'good', label: 'Good' },
  { value: 'needs_maintenance', label: 'Needs Maintenance' },
  { value: 'damaged', label: 'Damaged' },
];

interface ReturnItemState {
  itemId: string;
  itemName: string;
  remainingQuantity: number; // Max returnable: quantityApproved - quantityReturned (from request)
  quantityReturned: number; // Amount to return in this batch (1 to remainingQuantity)
  condition: ItemCondition;
  selected: boolean;
}

export const ReturnItemsScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { requestId } = route.params;

  const handleBack = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const canReturnToCentralStore = useAppSelector(selectCanReturnItemsToCentralStore);
  const inventoryItems = useAppSelector(selectAllItems);
  const [isOwnerOfRequest, setIsOwnerOfRequest] = useState(false);
  const { viewMode, toggleViewMode } = useWeightViewPreference();

  // Ensure inventory items are loaded so unit fallback works for old requests
  useEffect(() => {
    if (inventoryItems.length === 0) {
      dispatch(fetchItems({}));
    }
  }, [dispatch, inventoryItems.length]);

  const [request, setRequest] = useState<Request | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<ReturnItemState[]>(
    []
  );
  const [returnNotes, setReturnNotes] = useState('');
  const [errors, setErrors] = useState<{ items?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeGoBack = useCallback(() => {
    if (isMountedRef.current && navigation.canGoBack?.()) {
      navigation.goBack();
    }
  }, [navigation]);

  const nonConsumableItems = useCallback((req: Request) => {
    const items = Array.isArray(req?.items) ? req.items : [];
    return items.filter((i) => i.itemType === 'non_consumable');
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestService.getRequestById(requestId).then((r) => {
      if (!cancelled && r && (r.status === 'transferred' || r.status === 'partially_returned')) {
        setRequest(r);
        setIsOwnerOfRequest(r.requestedBy === userId);
        const items = nonConsumableItems(r);
        const itemsWithRemaining = items
          .map((item) => {
            const currentReturned = item.quantityReturned ?? 0;
            /**
             * Items held by site supervisors are not physically available to return.
             * They must first be handed back to the Site Manager (decrements
             * `supervisorOutstandingQty`) before they become returnable here.
             */
            const withSupervisors = item.supervisorOutstandingQty ?? 0;
            const remaining = item.quantityApproved - currentReturned - withSupervisors;
            return { ...item, remaining };
          })
          .filter((item) => item.remaining > 0);
        setReturnItemsState(
          itemsWithRemaining.map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            remainingQuantity: item.remaining,
            quantityReturned: 1,
            condition: 'good' as ItemCondition,
            selected: false,
          }))
        );
      } else if (!cancelled) {
        Alert.alert(
          'Error',
          'Only transferred or partially returned requests have items that can be returned',
          [{ text: 'OK', onPress: safeGoBack }]
        );
      }
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) {
        Alert.alert('Error', 'Failed to load request', [{ text: 'OK', onPress: safeGoBack }]);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, safeGoBack, nonConsumableItems, userId]);

  const updateItem = useCallback(
    (itemId: string, updates: Partial<ReturnItemState>) => {
      setReturnItemsState((prev) =>
        prev.map((item) =>
          item.itemId === itemId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  const toggleSelect = (itemId: string) => {
    updateItem(itemId, {
      selected: !returnItemsState.find((i) => i.itemId === itemId)?.selected,
    });
  };

  const validateForm = (): boolean => {
    const hasSelection = returnItemsState.some((i) => i.selected);
    if (!hasSelection) {
      setErrors({ items: 'At least one item must be selected' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !userId || !userName) return;

    const selectedItems = returnItemsState.filter((i) => i.selected);
    if (selectedItems.length === 0) return;

    setIsSubmitting(true);

    try {
      const returnData: ReturnItemsData = {
        items: selectedItems.map((item) => ({
          itemId: item.itemId,
          quantityReturned: item.quantityReturned,
          condition: item.condition,
        })),
        returnNotes: returnNotes.trim() || undefined,
      };

      await dispatch(
        returnItems({
          requestId,
          returnData,
          userId,
          userName,
        })
      ).unwrap();

      Alert.alert('Success', 'Items returned successfully', [
        { text: 'OK', onPress: safeGoBack },
      ]);
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to return items'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Final access gate — mirrors Firestore rules:
   * - Store Incharge: any request.
   * - Site Manager:   only if they created the request (checked once request loads).
   * Other roles are blocked here, with a contextual message.
   *
   * Note: role-level block is decided before the fetch completes, but the owner
   * check needs the request, so we wait for the load for Site Managers.
   */
  const roleAllowed = canReturnToCentralStore;
  const ownershipResolved = !isLoading;
  const accessAllowed =
    roleAllowed && (isStoreIncharge || (isSiteManager && isOwnerOfRequest));

  if (!roleAllowed || (ownershipResolved && !accessAllowed)) {
    const blockTitle = isSiteManager ? 'Not the request owner' : 'Not authorized';
    const blockMessage = isSiteManager
      ? 'Only the Site Manager who created this request (or the Store Incharge) can return its items.'
      : 'Returning items to the central store is done by the Store Incharge or the Site Manager who created the request.';
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Return to central store" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="lock-closed-outline" size={64} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            {blockTitle}
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            {blockMessage}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (isLoading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Return Items" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading request...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!request) return null;

  const items = nonConsumableItems(request);
  const hasItemsToReturn = returnItemsState.length > 0;

  if (items.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Return Items" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="cube-outline" size={80} color="#64748B" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            No Returnable Items
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            This request only contains consumable items. Non-consumable items can
            be returned to the central store.
          </Text>
          <TouchableOpacity
            className="mt-6 px-6 py-3 bg-[#1E40AF] rounded-[10px]"
            onPress={safeGoBack}
          >
            <Text className="text-[15px] font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  if (items.length > 0 && !hasItemsToReturn) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Return Items" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="checkmark-circle-outline" size={80} color="#16A34A" />
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2 mt-4">
            All Items Returned
          </Text>
          <Text className="text-[15px] text-[#64748B] text-center">
            All non-consumable items in this request have been returned to the central store.
          </Text>
          <TouchableOpacity
            className="mt-6 px-6 py-3 bg-[#1E40AF] rounded-[10px]"
            onPress={safeGoBack}
          >
            <Text className="text-[15px] font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  const formatDate = (ts: { toDate?: () => Date } | null | undefined): string => {
    if (!ts) return '';
    const date = typeof (ts as { toDate?: () => Date }).toDate === 'function'
      ? (ts as { toDate: () => Date }).toDate()
      : new Date();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Return Items" showBack onBackPress={handleBack} />

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          <View className="bg-[#F8FAFC] rounded-lg p-4">
            <Text className="text-[13px] text-[#64748B] mb-1">
              All returns go to Central Store first
            </Text>
            <Text className="text-[15px] text-[#0F172A]">
              Store Incharge may later move damaged items to Maintenance.
            </Text>
          </View>

          {/* Previous return history */}
          {request.returnHistory && request.returnHistory.length > 0 && (
            <View className="bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0]">
              <Text className="text-[15px] font-semibold text-[#0F172A] mb-2">
                Previous Returns
              </Text>
              {request.returnHistory.map((returnEvent) => (
                <View key={returnEvent.returnId} className="mb-3 pb-3 border-b border-[#E2E8F0] last:border-b-0 last:mb-0 last:pb-0">
                  <Text className="text-[13px] text-[#64748B] mb-2">
                    {formatDate(returnEvent.returnedAt)} by {returnEvent.returnedByName} – {returnEvent.items.length} item(s)
                  </Text>
                  {returnEvent.items.map((returnedItem) => {
                    const isDamaged = returnedItem.condition === 'damaged';
                    const hasNotes = returnEvent.returnNotes && returnEvent.returnNotes.trim();
                    return (
                      <View key={returnedItem.itemId} className="mb-2">
                        <View className="flex-row justify-between">
                          <Text className="text-[15px] text-[#0F172A]">
                            {returnedItem.itemName}
                          </Text>
                          <Text className="text-[15px] text-[#0F172A]">
                            {returnedItem.quantityReturned}{' '}
                            {request.items.find(i => i.itemId === returnedItem.itemId)?.unit ?? 'units'} returned
                          </Text>
                        </View>
                        {isDamaged && (
                          <View className="flex-row items-center gap-1 mt-1">
                            <Ionicons name="warning" size={16} color="#D97706" />
                            <Text className="text-[13px] text-[#D97706]">
                              Damaged{hasNotes && ` • ${returnEvent.returnNotes}`}
                            </Text>
                          </View>
                        )}
                        {isDamaged && isStoreIncharge && (
                          <View className="mt-2">
                            <QuickMoveToMaintenanceButton
                              itemId={returnedItem.itemId}
                              itemName={returnedItem.itemName}
                              itemSku={request.items.find(i => i.itemId === returnedItem.itemId)?.itemSku || ''}
                              quantity={returnedItem.quantityReturned}
                              issueDescription={`Returned damaged from ${request.siteName}. ${returnEvent.returnNotes || ''}`}
                              sourceRequestId={request.id}
                              sourceReturnDate={typeof returnEvent.returnedAt.toDate === 'function' ? returnEvent.returnedAt.toDate() : new Date()}
                              onSuccess={() => {
                                Alert.alert('Success', 'Item moved to maintenance');
                              }}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* Non-consumable items with checkbox, quantity slider, condition */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                Select Items to Return
              </Text>
              {returnItemsState.some((i) => {
                const ri = request.items.find((r) => r.itemId === i.itemId);
                return ri ? isWeightBasedItem({ weightPerMeter: ri.weightPerMeter }) : false;
              }) && (
                <ViewModeToggle viewMode={viewMode} onToggle={toggleViewMode} compact />
              )}
            </View>
            {returnItemsState.map((item) => {
              const requestItem = request.items.find((i) => i.itemId === item.itemId) as RequestItem | undefined;
              const isSteelItem = requestItem ? isWeightBasedItem({ weightPerMeter: requestItem.weightPerMeter }) : false;
              const displayUnit =
                requestItem?.unit ||
                inventoryItems.find((inventoryItem) => inventoryItem.id === item.itemId)?.unit ||
                'units';
              return (
              <View
                key={item.itemId}
                className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
              >
                <TouchableOpacity
                  onPress={() => toggleSelect(item.itemId)}
                  className="flex-row items-center mb-3"
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: item.selected,
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
                      item.selected
                        ? 'border-[#1E40AF] bg-[#1E40AF]'
                        : 'border-[#E2E8F0]'
                    }`}
                  >
                    {item.selected && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                  <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">
                    {item.itemName}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[13px] text-[#64748B]">Max: </Text>
                    {isSteelItem && requestItem?.weightPerMeter != null && requestItem?.lengthPerPiece != null ? (
                      <WeightDisplay
                        quantity={item.remainingQuantity}
                        weightPerMeter={requestItem.weightPerMeter}
                        lengthPerPiece={requestItem.lengthPerPiece}
                        viewMode={viewMode}
                        unit={requestItem.unit || 'Pcs'}
                      />
                    ) : (
                      <Text className="text-[13px] text-[#64748B]">
                        {item.remainingQuantity} {displayUnit}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {item.selected && (
                  <View className="gap-3 mt-2 pt-3 border-t border-[#E2E8F0]">
                    {/* Quantity */}
                    <View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[13px] text-[#64748B]">
                          Quantity to return
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <TouchableOpacity
                            onPress={() =>
                              updateItem(item.itemId, {
                                quantityReturned: Math.max(
                                  1,
                                  item.quantityReturned - 1
                                ),
                              })
                            }
                            className="w-8 h-8 border border-[#E2E8F0] rounded-full items-center justify-center"
                          >
                            <Text className="text-[#1E40AF] text-lg">−</Text>
                          </TouchableOpacity>
                          <Text className="text-[15px] font-semibold w-8 text-center">
                            {item.quantityReturned}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              updateItem(item.itemId, {
                                quantityReturned: Math.min(
                                  item.remainingQuantity,
                                  item.quantityReturned + 1
                                ),
                              })
                            }
                            className="w-8 h-8 border border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
                          >
                            <Text className="text-white text-lg">+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {isSteelItem &&
                        requestItem?.weightPerMeter != null &&
                        requestItem?.lengthPerPiece != null &&
                        item.quantityReturned > 0 && (
                          <View className="flex-row items-center gap-1 mt-1">
                            <Text className="text-[13px] text-[#64748B]">≈ </Text>
                            <WeightDisplay
                              quantity={item.quantityReturned}
                              weightPerMeter={requestItem.weightPerMeter}
                              lengthPerPiece={requestItem.lengthPerPiece}
                              viewMode={viewMode}
                              unit={requestItem.unit || 'Pcs'}
                            />
                          </View>
                        )}
                    </View>

                    {/* Condition */}
                    <View className="gap-2">
                      <Text className="text-[13px] text-[#64748B]">
                        Condition
                      </Text>
                      <View className="flex-row gap-2 flex-wrap">
                        {CONDITIONS.map((c) => (
                          <TouchableOpacity
                            key={c.value}
                            onPress={() =>
                              updateItem(item.itemId, { condition: c.value })
                            }
                            className={`px-3 py-2 rounded-lg border ${
                              item.condition === c.value
                                ? 'border-[#1E40AF] bg-[#1E40AF]/10'
                                : 'border-[#E2E8F0] bg-white'
                            }`}
                          >
                            <Text
                              className={`text-[13px] font-medium ${
                                item.condition === c.value
                                  ? 'text-[#1E40AF]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              {c.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
            })}
          </View>

          {errors.items && (
            <Text
              className="text-[13px] text-[#DC2626]"
              accessibilityLiveRegion="polite"
            >
              {errors.items}
            </Text>
          )}

          <FormField
            label="Return Notes (optional)"
            value={returnNotes}
            onChangeText={setReturnNotes}
            placeholder="Any notes about the return..."
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Submit return"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-[15px] font-semibold text-white">
              Submit Return
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};
