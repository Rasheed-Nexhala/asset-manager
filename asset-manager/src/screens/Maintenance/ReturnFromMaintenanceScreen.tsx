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
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMaintenanceById,
  returnFromMaintenanceThunk,
} from '../../store/thunks/maintenanceThunks';
import { selectMaintenanceById } from '../../store/selectors/maintenanceSelectors';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import type { ReturnFromMaintenanceData } from '../../types/maintenance';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceStackParamList';

type NavigationProp = StackNavigationProp<MaintenanceStackParamList, 'ReturnFromMaintenance'>;
type RouteParamsProp = RouteProp<MaintenanceStackParamList, 'ReturnFromMaintenance'>;

/**
 * ReturnFromMaintenanceScreen
 * 
 * Form to return repaired items back to inventory
 * Supports partial returns (can return less than total quantity)
 */
export const ReturnFromMaintenanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParamsProp>();
  const dispatch = useAppDispatch();
  const { maintenanceId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const maintenance = useAppSelector((state) => selectMaintenanceById(maintenanceId)(state));

  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [repairSummary, setRepairSummary] = useState<string>('');
  const [repairCost, setRepairCost] = useState<string>('');
  const [repairedBy, setRepairedBy] = useState<string>('');
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

  // Initialize return quantity to max available
  useEffect(() => {
    if (maintenance) {
      setReturnQuantity(maintenance.quantity);
    }
  }, [maintenance]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleIncrement = useCallback(() => {
    if (maintenance && returnQuantity < maintenance.quantity) {
      setReturnQuantity((prev) => prev + 1);
    }
  }, [maintenance, returnQuantity]);

  const handleDecrement = useCallback(() => {
    if (returnQuantity > 1) {
      setReturnQuantity((prev) => prev - 1);
    }
  }, [returnQuantity]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate return quantity
    if (!returnQuantity || returnQuantity <= 0) {
      newErrors.returnQuantity = 'Return quantity is required';
    } else if (maintenance && returnQuantity > maintenance.quantity) {
      newErrors.returnQuantity = `Cannot exceed ${maintenance.quantity}`;
    }

    // Repair summary is optional - no validation

    // Validate repair cost (if provided)
    if (repairCost.trim()) {
      const isValid = /^\d+(\.\d{1,2})?$/.test(repairCost.trim());
      if (!isValid) {
        newErrors.repairCost = 'Invalid repair cost format (e.g., 123.45)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [returnQuantity, repairCost, maintenance]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm() || !maintenance || !userId || !userName) return;

    const returnData: ReturnFromMaintenanceData = {
      returnQuantity,
      repairSummary: repairSummary.trim() || undefined,
      repairCost: repairCost.trim() ? parseFloat(repairCost) : undefined,
      repairedBy: repairedBy.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await dispatch(
        returnFromMaintenanceThunk({
          maintenanceId,
          returnData,
          userId,
          userName,
        })
      ).unwrap();

      Alert.alert(
        'Success',
        `${returnQuantity} ${displayUnit} returned to inventory successfully`,
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
      Alert.alert('Error', error?.message || 'Failed to return items');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateForm,
    maintenance,
    userId,
    userName,
    returnQuantity,
    repairSummary,
    repairCost,
    repairedBy,
    dispatch,
    maintenanceId,
    navigation,
  ]);

  if (!maintenance) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Return from Maintenance" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Return from Maintenance" showBack onBackPress={handleBack} />

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
                {maintenance.quantity}
                {' '}
                {displayUnit}
              </Text>
            </View>
          </View>

          {/* Warning Banner */}
          <View className="bg-[#D97706]/15 px-4 py-3 rounded-lg">
            <View className="flex-row items-start gap-2">
              <Ionicons name="warning" size={20} color="#D97706" />
              <Text className="text-[13px] text-[#D97706] flex-1">
                {maintenance.quantity - returnQuantity > 0
                  ? `Returning ${returnQuantity} of ${maintenance.quantity} ${displayUnit}. ${maintenance.quantity - returnQuantity} ${displayUnit} will remain in maintenance with 'Partial Return' status.`
                  : `Returning all ${returnQuantity} ${displayUnit}. This record will be marked as 'Returned'.`}
              </Text>
            </View>
          </View>

          {/* Return Quantity Field */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Return Quantity <Text className="text-[#DC2626]">*</Text>
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="w-12 h-12 border border-[#E2E8F0] rounded-full items-center justify-center"
                onPress={handleDecrement}
                disabled={returnQuantity <= 1}
                style={{ opacity: returnQuantity <= 1 ? 0.5 : 1 }}
                accessibilityLabel="Decrease quantity"
                accessibilityRole="button"
              >
                <Text className="text-[#1E40AF] text-xl font-bold">−</Text>
              </TouchableOpacity>
              <TextInput
                className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-1 text-center text-xl font-bold"
                value={returnQuantity.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num > 0 && num <= maintenance.quantity) {
                    setReturnQuantity(num);
                  }
                }}
                keyboardType="numeric"
                accessibilityLabel="Return quantity"
              />
              <TouchableOpacity
                className="w-12 h-12 border border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
                onPress={handleIncrement}
                disabled={returnQuantity >= maintenance.quantity}
                style={{ opacity: returnQuantity >= maintenance.quantity ? 0.5 : 1 }}
                accessibilityLabel="Increase quantity"
                accessibilityRole="button"
              >
                <Text className="text-white text-xl font-bold">+</Text>
              </TouchableOpacity>
            </View>
            {errors.returnQuantity && (
              <Text className="text-[13px] text-[#DC2626] mt-1">{errors.returnQuantity}</Text>
            )}
          </View>

          {/* Repair Summary Field (Optional) */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Repair Summary (Optional)</Text>
            <TextInput
              className="rounded-lg px-4 py-3 bg-white text-[15px] text-[#0F172A] border border-[#E2E8F0]"
              placeholder="Describe the repairs performed"
              placeholderTextColor="#94A3B8"
              value={repairSummary}
              onChangeText={setRepairSummary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
              accessibilityLabel="Repair summary"
            />
          </View>

          {/* Repair Cost Field (Optional) */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Repair Cost (Optional)</Text>
            <View className="flex-row items-center">
              <View className="border border-[#E2E8F0] rounded-l-lg h-12 px-4 bg-[#F8FAFC] items-center justify-center">
                <Text className="text-[15px] text-[#64748B]">₹</Text>
              </View>
              <TextInput
                className={`border-t border-r border-b rounded-r-lg h-12 px-4 bg-white flex-1 text-[15px] text-[#0F172A] ${
                  errors.repairCost ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                }`}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                value={repairCost}
                onChangeText={(text) => {
                  setRepairCost(text);
                  if (errors.repairCost) {
                    setErrors((prev) => ({ ...prev, repairCost: '' }));
                  }
                }}
                keyboardType="decimal-pad"
                accessibilityLabel="Repair cost"
              />
            </View>
            {errors.repairCost && (
              <Text className="text-[13px] text-[#DC2626] mt-1">{errors.repairCost}</Text>
            )}
          </View>

          {/* Repaired By Field (Optional) */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Repaired By (Optional)</Text>
            <TextInput
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
              placeholder="Name of repair person or vendor"
              placeholderTextColor="#94A3B8"
              value={repairedBy}
              onChangeText={setRepairedBy}
              accessibilityLabel="Repaired by"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center mt-2"
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={{ opacity: isSubmitting ? 0.7 : 1 }}
            activeOpacity={0.7}
            accessibilityLabel="Return to inventory"
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">Return to Inventory</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
