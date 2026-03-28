import React, { useState, useCallback, useEffect } from 'react';
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
import { PrioritySelector } from '../../components/Requests/PrioritySelector';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createRequest } from '../../store/thunks/requestThunks';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import { selectSiteById } from '../../store/selectors/sitesSelectors';
import { fetchSites } from '../../store/slices/sitesSlice';
import type { RequestPriority } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type RouteParams = RouteProp<RequestStackParamList, 'CreateSiteTransferRequest'>;
type NavigationProp = StackNavigationProp<RequestStackParamList, 'CreateSiteTransferRequest'>;

interface FormErrors {
  quantity?: string;
  purpose?: string;
}

/**
 * CreateSiteTransferRequestScreen
 *
 * Allows a Site Manager to request that a specific item is transferred
 * from another site (Site A) to their own site (Site B).
 *
 * The request is created with requestType='site_transfer' so the Store
 * Incharge / Admin can identify it in the queue and the transfer logic
 * knows to move inventory from site_A → site_B instead of store → site_B.
 */
export const CreateSiteTransferRequestScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();

  const {
    sourceSiteId,
    sourceSiteName,
    destinationSiteId,
    destinationSiteName,
    preselectedItem,
  } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);

  // Ensure sites are loaded (needed for destination site info)
  const destinationSite = useAppSelector(selectSiteById(destinationSiteId));
  useEffect(() => {
    if (!destinationSite) {
      dispatch(fetchSites());
    }
  }, [dispatch, destinationSite]);

  const [quantity, setQuantity] = useState<string>('1');
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [purpose, setPurpose] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const qty = parseInt(quantity, 10);

    if (!quantity.trim() || isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    } else if (qty > preselectedItem.availableQty) {
      newErrors.quantity = `Maximum available at ${sourceSiteName}: ${preselectedItem.availableQty}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validate() || !userId || !userName) return;

    const qty = parseInt(quantity, 10);

    setIsSubmitting(true);
    try {
      await dispatch(
        createRequest({
          requestData: {
            siteId: destinationSiteId,
            siteName: destinationSiteName,
            requestType: 'site_transfer',
            sourceSiteId,
            sourceSiteName,
            priority,
            purpose: purpose.trim() || `Site transfer from ${sourceSiteName}`,
            items: [
              {
                itemId: preselectedItem.itemId,
                itemName: preselectedItem.itemName,
                itemSku: preselectedItem.itemSku,
                unit: preselectedItem.unit,
                itemType: preselectedItem.itemType,
                categoryId: preselectedItem.categoryId,
                categoryName: preselectedItem.categoryName,
                imageUrl: preselectedItem.imageUrl,
                quantity: qty,
                weightPerMeter: preselectedItem.weightPerMeter,
                lengthPerPiece: preselectedItem.lengthPerPiece,
              },
            ],
          },
          userId,
          userName,
          isDraft: false,
        })
      ).unwrap();

      Alert.alert(
        'Request Submitted',
        `Your transfer request for "${preselectedItem.itemName}" has been submitted. Store Incharge will review it shortly.`,
        [
          {
            text: 'View My Requests',
            onPress: () => navigation.navigate('MyRequests'),
          },
          { text: 'OK', onPress: () => navigation.goBack() },
        ]
      );
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to submit transfer request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    quantity,
    priority,
    purpose,
    userId,
    userName,
    destinationSiteId,
    destinationSiteName,
    sourceSiteId,
    sourceSiteName,
    preselectedItem,
    dispatch,
    navigation,
  ]);

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Request Transfer"
        showBack
        onBackPress={handleBack}
      />

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="gap-4 py-4">
          {/* Transfer Route Banner */}
          <View className="bg-[#7C3AED]/10 rounded-[10px] p-4 border border-[#7C3AED]/20">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="swap-horizontal" size={18} color="#7C3AED" />
              <Text className="text-[13px] font-semibold text-[#7C3AED]">
                Site Transfer Request
              </Text>
            </View>
            <View className="flex-row items-center gap-2 flex-wrap">
              <View className="bg-white rounded-lg px-3 py-1.5 border border-[#E2E8F0]">
                <Text className="text-[13px] text-[#64748B] mb-0.5">From</Text>
                <Text className="text-[14px] font-semibold text-[#0F172A]">
                  {sourceSiteName}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#7C3AED" />
              <View className="bg-white rounded-lg px-3 py-1.5 border border-[#E2E8F0]">
                <Text className="text-[13px] text-[#64748B] mb-0.5">To</Text>
                <Text className="text-[14px] font-semibold text-[#0F172A]">
                  {destinationSiteName}
                </Text>
              </View>
            </View>
          </View>

          {/* Item Summary */}
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <Text className="text-[13px] text-[#64748B] mb-2">Item to Transfer</Text>
            <Text className="text-[15px] font-semibold text-[#0F172A] mb-1">
              {preselectedItem.itemName}
            </Text>
            <Text className="text-[13px] text-[#64748B]">
              SKU: {preselectedItem.itemSku}
            </Text>
            <View className="flex-row items-center gap-1 mt-2">
              <Ionicons name="cube-outline" size={14} color="#64748B" />
              <Text className="text-[13px] text-[#64748B]">
                Available at {sourceSiteName}:{' '}
                <Text className="font-semibold text-[#0F172A]">
                  {preselectedItem.availableQty} {preselectedItem.unit ?? 'units'}
                </Text>
              </Text>
            </View>
          </View>

          {/* Quantity */}
          <FormField
            label="Quantity"
            required
            value={quantity}
            onChangeText={(text) => {
              setQuantity(text);
              setErrors((prev) => ({ ...prev, quantity: undefined }));
            }}
            placeholder={`Max ${preselectedItem.availableQty}`}
            keyboardType="numeric"
            error={errors.quantity}
          />

          {/* Priority */}
          <View className="gap-1.5">
            <Text className="text-[15px] font-medium text-[#0F172A]">Priority</Text>
            <PrioritySelector
              value={priority}
              onChange={setPriority}
            />
          </View>

          {/* Purpose */}
          <FormField
            label="Purpose / Notes"
            value={purpose}
            onChangeText={(text) => {
              setPurpose(text);
              setErrors((prev) => ({ ...prev, purpose: undefined }));
            }}
            placeholder={`Reason for requesting transfer from ${sourceSiteName}...`}
            multiline
            numberOfLines={3}
            error={errors.purpose}
          />

          {/* Info Banner */}
          <View className="bg-[#F1F5F9] rounded-[10px] p-4 border border-[#E2E8F0]">
            <View className="flex-row items-start gap-2">
              <Ionicons name="information-circle-outline" size={18} color="#64748B" />
              <Text className="text-[13px] text-[#64748B] flex-1 leading-5">
                This request will be reviewed by the Store Incharge or Super Admin. Once approved and confirmed, the item will be moved from {sourceSiteName} to {destinationSiteName}.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="bg-[#7C3AED] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
          style={{ opacity: isSubmitting ? 0.7 : 1 }}
          accessibilityRole="button"
          accessibilityLabel="Submit transfer request"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
              <Text className="text-[15px] font-semibold text-white">
                Submit Transfer Request
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};
