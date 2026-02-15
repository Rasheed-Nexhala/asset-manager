import React, { useState } from 'react';
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
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormField } from '../../components/FormField';
import { rejectRequest } from '../../store/thunks/requestThunks';
import { requestService } from '../../services/firebase/requestService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import type { RejectRequestData } from '../../types/request';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type RouteParams = RouteProp<RequestStackParamList, 'RejectRequest'>;
type NavigationProp = StackNavigationProp<RequestStackParamList, 'RejectRequest'>;

const REJECTION_REASONS: Array<{
  value: RejectRequestData['reason'];
  label: string;
}> = [
  { value: 'insufficient_stock', label: 'Insufficient Stock' },
  { value: 'duplicate_request', label: 'Duplicate Request' },
  { value: 'items_not_required', label: 'Items Not Required' },
  { value: 'other', label: 'Other' },
];

export const RejectRequestScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { requestId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);

  const [request, setRequest] = useState<{ requestNumber: string } | null>(
    null
  );
  const [reason, setReason] = useState<RejectRequestData['reason'] | ''>('');
  const [comments, setComments] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; comments?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    requestService.getRequestById(requestId).then((r) => {
      if (!cancelled && r) {
        setRequest(r);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const validateForm = (): boolean => {
    const newErrors: { reason?: string; comments?: string } = {};

    if (!reason) {
      newErrors.reason = 'Rejection reason is required';
    }

    if (reason === 'other' && !comments.trim()) {
      newErrors.comments = 'Comments are required when selecting Other';
    }

    if (!comments.trim()) {
      newErrors.comments = 'Comments are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReject = async () => {
    if (!validateForm() || !userId || !userName) return;

    setIsSubmitting(true);

    try {
      const rejectionData: RejectRequestData = {
        reason: reason as RejectRequestData['reason'],
        comments: comments.trim(),
      };

      await dispatch(
        rejectRequest({
          requestId,
          rejectionData,
          processedBy: userId,
          processedByName: userName,
        })
      ).unwrap();

      Alert.alert('Success', 'Request rejected', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to reject request'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Reject Request" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading request...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Reject Request" />

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          {/* Request Summary */}
          {request && (
            <View className="bg-[#F8FAFC] rounded-lg p-4">
              <Text className="text-[13px] text-[#64748B] mb-1">
                Rejecting request
              </Text>
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                {request.requestNumber}
              </Text>
            </View>
          )}

          {/* Rejection Reason Dropdown */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Rejection Reason <Text className="text-[#DC2626]">*</Text>
            </Text>
            <View className="gap-2">
              {REJECTION_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => {
                    setReason(r.value);
                    setErrors((prev) => ({ ...prev, reason: undefined }));
                  }}
                  className={`flex-row items-center p-4 rounded-lg border ${
                    reason === r.value
                      ? 'border-[#1E40AF] bg-[#1E40AF]/5'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reason === r.value }}
                  accessibilityLabel={`Rejection reason: ${r.label}`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 ${
                      reason === r.value
                        ? 'border-[#1E40AF] bg-[#1E40AF]'
                        : 'border-[#E2E8F0]'
                    }`}
                  >
                    {reason === r.value && (
                      <View className="w-2 h-2 rounded-full bg-white self-center mt-0.5" />
                    )}
                  </View>
                  <Text className="text-[15px] text-[#0F172A]">{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.reason && (
              <Text
                className="text-[13px] text-[#DC2626]"
                accessibilityLiveRegion="polite"
              >
                {errors.reason}
              </Text>
            )}
          </View>

          {/* Comments */}
          <FormField
            label="Comments"
            required
            value={comments}
            onChangeText={(text) => {
              setComments(text);
              setErrors((prev) => ({ ...prev, comments: undefined }));
            }}
            placeholder="Provide details for the rejection..."
            error={errors.comments}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
        <TouchableOpacity
          onPress={handleReject}
          disabled={isSubmitting}
          className="bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Confirm rejection"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-[15px] font-semibold text-white">
              Confirm Rejection
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};
