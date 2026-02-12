import React, { useState, useEffect, useCallback } from 'react';
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
import { returnItems } from '../../store/thunks/requestThunks';
import { requestService } from '../../services/firebase/requestService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
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
  quantityApproved: number;
  quantityReturned: number;
  condition: ItemCondition;
  selected: boolean;
}

export const ReturnItemsScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { requestId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);

  const [request, setRequest] = useState<Request | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<ReturnItemState[]>(
    []
  );
  const [returnNotes, setReturnNotes] = useState('');
  const [errors, setErrors] = useState<{ items?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const nonConsumableItems = useCallback((req: Request) => {
    return req.items.filter((i) => i.itemType === 'non_consumable');
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestService.getRequestById(requestId).then((r) => {
      if (!cancelled && r && r.status === 'transferred') {
        setRequest(r);
        const items = nonConsumableItems(r);
        setReturnItemsState(
          items.map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantityApproved: item.quantityApproved,
            quantityReturned: item.quantityApproved,
            condition: 'good' as ItemCondition,
            selected: false,
          }))
        );
      } else if (!cancelled) {
        Alert.alert(
          'Error',
          'Only transferred requests have items that can be returned',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, navigation, nonConsumableItems]);

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
        { text: 'OK', onPress: () => navigation.goBack() },
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

  if (isLoading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Return Items" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
      </ScreenLayout>
    );
  }

  if (!request) return null;

  const items = nonConsumableItems(request);
  if (items.length === 0) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Return Items" />
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
            onPress={() => navigation.goBack()}
          >
            <Text className="text-[15px] font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Return Items" />

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

          {/* Non-consumable items with checkbox, quantity slider, condition */}
          <View className="gap-3">
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              Select Items to Return
            </Text>
            {returnItemsState.map((item) => (
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
                  <Text className="text-[13px] text-[#64748B]">
                    Max: {item.quantityApproved}
                  </Text>
                </TouchableOpacity>

                {item.selected && (
                  <View className="gap-3 mt-2 pt-3 border-t border-[#E2E8F0]">
                    {/* Quantity */}
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
                                item.quantityApproved,
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
            ))}
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
