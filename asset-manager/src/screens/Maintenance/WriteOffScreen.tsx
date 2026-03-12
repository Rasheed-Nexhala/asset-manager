import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import WriteOffReasonSelector from '../../components/Maintenance/WriteOffReasonSelector';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMaintenanceById,
  writeOffItemThunk,
} from '../../store/thunks/maintenanceThunks';
import { selectMaintenanceById } from '../../store/selectors/maintenanceSelectors';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import type { WriteOffData, WriteOffReason } from '../../types/maintenance';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceStackParamList';

type NavigationProp = StackNavigationProp<MaintenanceStackParamList, 'WriteOff'>;
type RouteParamsProp = RouteProp<MaintenanceStackParamList, 'WriteOff'>;

/**
 * WriteOffScreen
 * 
 * Form to permanently write off unrepairable items
 * This action is irreversible and permanently reduces total inventory
 */
export const WriteOffScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParamsProp>();
  const dispatch = useAppDispatch();
  const { maintenanceId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const maintenance = useAppSelector((state) => selectMaintenanceById(maintenanceId)(state));

  const [writeOffQuantity, setWriteOffQuantity] = useState<number>(1);
  const [reason, setReason] = useState<WriteOffReason | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const displayUnit = maintenance?.unit || 'Pcs';

  // Fetch maintenance record if not in store
  useEffect(() => {
    if (!maintenance && maintenanceId) {
      dispatch(fetchMaintenanceById(maintenanceId));
    }
  }, [dispatch, maintenanceId, maintenance]);

  // Initialize write-off quantity to max available
  useEffect(() => {
    if (maintenance) {
      setWriteOffQuantity(maintenance.quantity);
    }
  }, [maintenance]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleIncrement = useCallback(() => {
    if (maintenance && writeOffQuantity < maintenance.quantity) {
      setWriteOffQuantity((prev) => prev + 1);
    }
  }, [maintenance, writeOffQuantity]);

  const handleDecrement = useCallback(() => {
    if (writeOffQuantity > 1) {
      setWriteOffQuantity((prev) => prev - 1);
    }
  }, [writeOffQuantity]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate write-off quantity
    if (!writeOffQuantity || writeOffQuantity <= 0) {
      newErrors.writeOffQuantity = 'Write-off quantity is required';
    } else if (maintenance && writeOffQuantity > maintenance.quantity) {
      newErrors.writeOffQuantity = `Cannot exceed ${maintenance.quantity}`;
    }

    // Validate reason
    if (!reason) {
      newErrors.reason = 'Write-off reason is required';
    }

    // Explanation is optional - no validation

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [writeOffQuantity, reason, maintenance]);

  const handleWriteOff = useCallback(() => {
    if (!validateForm()) return;

    // Double confirmation dialog
    Alert.alert(
      'Confirm Write Off',
      `Are you sure you want to write off ${writeOffQuantity} ${displayUnit}?\n\nThis action is PERMANENT and cannot be undone. The items will be permanently removed from total inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Write Off',
          style: 'destructive',
          onPress: submitWriteOff,
        },
      ]
    );
  }, [validateForm, writeOffQuantity, displayUnit]);

  const submitWriteOff = useCallback(async () => {
    if (!maintenance || !userId || !userName || !reason) return;

    const writeOffData: WriteOffData = {
      writeOffQuantity,
      reason,
      explanation: explanation.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await dispatch(
        writeOffItemThunk({
          maintenanceId,
          writeOffData,
          userId,
          userName,
        })
      ).unwrap();

      Alert.alert(
        'Success',
        `${writeOffQuantity} ${writeOffQuantity === 1 ? 'item' : 'items'} written off successfully`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to write off items');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    maintenance,
    userId,
    userName,
    reason,
    writeOffQuantity,
    explanation,
    dispatch,
    maintenanceId,
    navigation,
  ]);

  if (!maintenance) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Write Off Item" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Write Off Item" showBack onBackPress={handleBack} />

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="gap-4 py-4">
          {/* Item Information Card */}
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <Text className="text-[15px] font-semibold text-[#0F172A] mb-2">
              {maintenance.itemName}
            </Text>
            <Text className="text-[13px] text-[#64748B]">SKU: {maintenance.itemSku}</Text>
            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-[13px] text-[#64748B]">Available Quantity</Text>
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                {maintenance.quantity} {displayUnit}
              </Text>
            </View>
          </View>

          {/* Danger Warning Banner */}
          <View className="bg-[#DC2626]/15 px-4 py-3 rounded-lg">
            <View className="flex-row items-start gap-2">
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text className="text-[13px] text-[#DC2626] flex-1">
                This permanently reduces total inventory. Cannot be undone.
              </Text>
            </View>
          </View>

          {/* Write Off Quantity Field */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Write Off Quantity <Text className="text-[#DC2626]">*</Text>
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="w-12 h-12 border border-[#E2E8F0] rounded-full items-center justify-center"
                onPress={handleDecrement}
                disabled={writeOffQuantity <= 1}
                style={{ opacity: writeOffQuantity <= 1 ? 0.5 : 1 }}
                accessibilityLabel="Decrease quantity"
                accessibilityRole="button"
              >
                <Text className="text-[#1E40AF] text-xl font-bold">−</Text>
              </TouchableOpacity>
              <TextInput
                className={`border rounded-lg h-12 px-4 bg-white flex-1 text-center text-xl font-bold ${errors.writeOffQuantity ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
                value={Number.isNaN(writeOffQuantity) ? '' : writeOffQuantity.toString()}
                onChangeText={(text) => {
                  if (text === '') {
                    setWriteOffQuantity(NaN as any);
                    return;
                  }
                  const num = parseInt(text, 10);
                  if (!isNaN(num)) {
                    setWriteOffQuantity(num);
                    if (num <= 0) {
                      setErrors(prev => ({ ...prev, writeOffQuantity: 'Write-off quantity must be greater than 0' }));
                    } else if (num > maintenance.quantity) {
                      setErrors(prev => ({ ...prev, writeOffQuantity: `Cannot exceed ${maintenance.quantity}` }));
                    } else {
                      setErrors(prev => ({ ...prev, writeOffQuantity: '' }));
                    }
                  }
                }}
                keyboardType="numeric"
                accessibilityLabel="Write off quantity"
              />
              <TouchableOpacity
                className="w-12 h-12 border border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
                onPress={handleIncrement}
                disabled={writeOffQuantity >= maintenance.quantity}
                style={{ opacity: writeOffQuantity >= maintenance.quantity ? 0.5 : 1 }}
                accessibilityLabel="Increase quantity"
                accessibilityRole="button"
              >
                <Text className="text-white text-xl font-bold">+</Text>
              </TouchableOpacity>
            </View>
            {errors.writeOffQuantity && (
              <Text className="text-[13px] text-[#DC2626] mt-1">{errors.writeOffQuantity}</Text>
            )}
          </View>

          {/* Write-Off Reason Field */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Reason <Text className="text-[#DC2626]">*</Text>
            </Text>
            <WriteOffReasonSelector
              value={reason}
              onSelect={(selectedReason) => {
                setReason(selectedReason);
                if (errors.reason) {
                  setErrors((prev) => ({ ...prev, reason: '' }));
                }
              }}
              error={errors.reason}
              disabled={isSubmitting}
            />
          </View>

          {/* Explanation Field (Optional) */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Explanation (Optional)</Text>
            <TextInput
              className="border border-[#E2E8F0] rounded-lg px-4 py-3 bg-white text-[15px] text-[#0F172A]"
              placeholder="Detailed explanation for write-off"
              placeholderTextColor="#94A3B8"
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
              accessibilityLabel="Explanation"
            />
            <Text className="text-[13px] text-[#64748B]">
              Provide details about why this item cannot be repaired or returned
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className="bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center mt-2"
            onPress={handleWriteOff}
            disabled={isSubmitting}
            style={{ opacity: isSubmitting ? 0.7 : 1 }}
            activeOpacity={0.7}
            accessibilityLabel="Write off item"
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text className="text-[15px] font-semibold text-white">Write Off Item</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Warning Text */}
          <Text className="text-[13px] text-[#64748B] text-center">
            This action is permanent and will reduce total inventory count
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
