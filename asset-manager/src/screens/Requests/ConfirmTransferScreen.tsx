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
import {
  printTransferSlip,
  canPrintTransferSlip,
} from '../../utils/transferSlipPdfUtils';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
  selectCanManageRequests,
} from '../../store/selectors/authSelectors';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { fetchItems } from '../../store/thunks/inventoryThunks';
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

  const handleBack = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const canManageRequests = useAppSelector(selectCanManageRequests);
  const inventoryItems = useAppSelector(selectAllItems);
  const { viewMode } = useWeightViewPreference();

  // Ensure inventory items are loaded so unit fallback works for old requests
  useEffect(() => {
    if (inventoryItems.length === 0) {
      dispatch(fetchItems({}));
    }
  }, [dispatch, inventoryItems.length]);

  const [request, setRequest] = useState<Request | null>(null);
  const [receivedByName, setReceivedByName] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [errors, setErrors] = useState<{ receivedByName?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canManageRequests) {
      Alert.alert(
        'Access denied',
        'Only Super Admin and Store Incharge can confirm transfers.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    requestService
      .getRequestById(requestId)
      .then((r) => {
        if (cancelled) return;
        if (r && r.status === 'approved') {
          setRequest(r);
        } else {
          Alert.alert(
            'Error',
            'Only approved requests can be transferred',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          Alert.alert('Error', 'Failed to load request details', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, navigation, canManageRequests]);

  const validateForm = (): boolean => {
    const newErrors: { receivedByName?: string } = {};

    if (!receivedByName.trim()) {
      newErrors.receivedByName = 'Received by is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm() || !request || !userId || !userName) return;

    setIsSubmitting(true);

    try {
      const updated = await dispatch(
        transferRequest({
          requestId,
          transferData: {
            receivedBy: '',
            receivedByName: receivedByName.trim(),
          },
          transferredBy: userId,
          transferredByName: userName,
        })
      ).unwrap();

      if (updated && canPrintTransferSlip(updated)) {
        try {
          await printTransferSlip(updated);
        } catch (printErr) {
          Alert.alert(
            'Transfer saved',
            printErr instanceof Error
              ? printErr.message
              : 'You can print the transfer slip from the request details.',
            [{ text: 'OK', onPress: () => navigation.navigate('RequestQueue') }]
          );
          return;
        }
      }

      navigation.navigate('RequestQueue');
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
        <ScreenHeader title="Confirm Transfer" showBack onBackPress={handleBack} />
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
      <ScreenHeader title="Confirm Transfer" showBack onBackPress={handleBack} />

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          {/* Request Summary */}
          <View className="bg-[#F8FAFC] rounded-lg p-4">
            {request.requestType === 'site_transfer' ? (
              <>
                <Text className="text-[13px] text-[#64748B] mb-1">Site Transfer</Text>
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className="text-[15px] font-semibold text-[#0F172A]">
                    {request.sourceSiteName ?? '—'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#7C3AED" />
                  <Text className="text-[15px] font-semibold text-[#0F172A]">
                    {request.siteName}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text className="text-[13px] text-[#64748B] mb-1">Transfer to</Text>
                <Text className="text-[17px] font-semibold text-[#0F172A]">
                  {request.siteName}
                </Text>
              </>
            )}
          </View>

          {/* Items to Transfer (read-only list) */}
          <View className="gap-2">
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              Items to Transfer
            </Text>
            {(Array.isArray(request.items) ? request.items : []).map((item) => {
              const isSteelItem = isWeightBasedItem({ weightPerMeter: item.weightPerMeter });
              const displayUnit =
                item.unit ||
                inventoryItems.find((inventoryItem) => inventoryItem.id === item.itemId)?.unit ||
                'units';
              return (
                <View
                  key={item.itemId}
                  className="flex-row items-center p-4 bg-white rounded-[10px] border border-[#E2E8F0]"
                >
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
                          unit={item.unit || 'Pcs'}
                        />
                      ) : (
                        <Text className="text-[13px] text-[#64748B]">
                          {item.quantityApproved} {displayUnit}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <FormField
            label="Received By"
            required
            value={receivedByName}
            onChangeText={(text) => {
              setReceivedByName(text);
              setErrors((prev) => ({ ...prev, receivedByName: undefined }));
            }}
            placeholder="Name of person receiving items at site"
            error={errors.receivedByName}
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
