import React, { useState, useEffect } from 'react';
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
import { isWeightBasedItem } from '../../utils/weightConversionUtils';
import { transferRequest } from '../../store/thunks/requestThunks';
import { requestService } from '../../services/firebase/requestService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import type { Request } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type RouteParams = RouteProp<RequestStackParamList, 'ConfirmTransfer'>;
type NavigationProp = StackNavigationProp<
  RequestStackParamList,
  'ConfirmTransfer'
>;

export const ConfirmTransferScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { requestId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const { viewMode } = useWeightViewPreference();

  const [request, setRequest] = useState<Request | null>(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<{ receivedBy?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    requestService.getRequestById(requestId).then((r) => {
      if (!cancelled && r && r.status === 'approved') {
        setRequest(r);
        setSelectedItems(new Set(r.items.map((i) => i.itemId)));
      } else if (!cancelled) {
        Alert.alert(
          'Error',
          'Only approved requests can be transferred',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, navigation]);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: { receivedBy?: string } = {};

    if (!receivedBy.trim()) {
      newErrors.receivedBy = 'Received by is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm() || !request || !userId || !userName) return;

    setIsSubmitting(true);

    try {
      await dispatch(
        transferRequest({
          requestId,
          transferData: {
            receivedBy: receivedBy.trim(),
            receivedByName: receivedBy.trim(),
          },
          transferredBy: userId,
          transferredByName: userName,
        })
      ).unwrap();

      Alert.alert('Success', 'Transfer confirmed successfully', [
        { text: 'OK', onPress: () => navigation.navigate('RequestQueue') },
      ]);
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to confirm transfer'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Confirm Transfer" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading transfer details...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!request) return null;

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Confirm Transfer" />

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          {/* Request Summary */}
          <View className="bg-[#F8FAFC] rounded-lg p-4">
            <Text className="text-[13px] text-[#64748B] mb-1">Transfer to</Text>
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              {request.siteName}
            </Text>
          </View>

          {/* Items Checklist */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                Items to Transfer
              </Text>
            </View>
            {request.items.map((item) => {
              const isSelected = selectedItems.has(item.itemId);
              const isSteelItem = isWeightBasedItem({ weightPerMeter: item.weightPerMeter });
              return (
                <TouchableOpacity
                  key={item.itemId}
                  onPress={() => toggleItem(item.itemId)}
                  className="flex-row items-center p-4 bg-white rounded-[10px] border border-[#E2E8F0]"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                >
                  <View
                    className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
                      isSelected
                        ? 'border-[#1E40AF] bg-[#1E40AF]'
                        : 'border-[#E2E8F0]'
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-[#0F172A]">
                      {item.itemName}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-[13px] text-[#64748B]">Qty: </Text>
                      {isSteelItem && item.weightPerMeter != null && item.lengthPerPiece != null ? (
                        <WeightDisplay
                          quantity={item.quantityApproved}
                          weightPerMeter={item.weightPerMeter}
                          lengthPerPiece={item.lengthPerPiece}
                          viewMode={viewMode}
                          unit="Pcs"
                        />
                      ) : (
                        <Text className="text-[13px] text-[#64748B]">{item.quantityApproved}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <FormField
            label="Received By"
            required
            value={receivedBy}
            onChangeText={(text) => {
              setReceivedBy(text);
              setErrors((prev) => ({ ...prev, receivedBy: undefined }));
            }}
            placeholder="Name of person receiving items at site"
            error={errors.receivedBy}
          />

          <FormField
            label="Transfer Notes (optional)"
            value={transferNotes}
            onChangeText={setTransferNotes}
            placeholder="Any additional notes..."
            multiline
            numberOfLines={3}
          />

          {/* Warning Banner */}
          <View className="bg-[#D97706]/15 rounded-lg p-4 border border-[#D97706]/30">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="warning" size={24} color="#D97706" />
              <Text className="text-[15px] font-semibold text-[#D97706]">
                Important
              </Text>
            </View>
            <Text className="text-[13px] text-[#64748B]">
              This action cannot be undone. Confirm that items have been
              physically transferred to the site.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={isSubmitting}
          className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Confirm transfer"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-[15px] font-semibold text-white">
              Confirm Transfer
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};
