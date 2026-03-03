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
import { PrioritySelector } from '../../components/Requests/PrioritySelector';
import { RequestItemCard } from '../../components/Requests/RequestItemCard';
import { ItemSelectorModal } from '../../components/Requests/ItemSelectorModal';
import { editRequest, submitDraftRequest } from '../../store/thunks/requestThunks';
import { requestService } from '../../services/firebase/requestService';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type {
  RequestPriority,
  EditRequestData,
  RequestItem,
} from '../../types/request';
import type { Item } from '../../types/inventory';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type RouteParams = RouteProp<RequestStackParamList, 'EditRequest'>;
type NavigationProp = StackNavigationProp<RequestStackParamList, 'EditRequest'>;

interface FormErrors {
  priority?: string;
  items?: string;
  purpose?: string;
}

export const EditRequestScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { requestId } = route.params;

  const handleBack = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);

  const [request, setRequest] = useState<{
    id: string;
    siteName?: string;
    priority: RequestPriority;
    purpose: string;
    items: RequestItem[];
  } | null>(null);
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [items, setItems] = useState<RequestItem[]>([]);
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const isBusy = isSavingDraft || isSubmittingRequest;
  const [isLoading, setIsLoading] = useState(true);
  const [itemSelectorVisible, setItemSelectorVisible] = useState(false);

  const hasItems = items.length > 0;
  const isButtonDisabled = isBusy || !hasItems;

  useEffect(() => {
    let cancelled = false;
    requestService.getRequestById(requestId).then((r) => {
      if (!cancelled && r && r.status === 'draft') {
        setRequest(r);
        setPriority(r.priority);
        setPurpose(r.purpose);
        setItems(r.items);
      } else if (!cancelled) {
        Alert.alert('Error', 'Only draft requests can be edited', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, navigation]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!priority) {
      newErrors.priority = 'Priority is required';
    }

    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleItemsSelected = (selectedItems: Item[]) => {
    const newItems: RequestItem[] = selectedItems.map((item) => ({
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      itemType: item.type,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      imageUrl: item.imageUrl,
      quantityRequested: 1,
      quantityApproved: 1,
      quantityReturned: 0,
      status: 'pending',
    }));
    setItems([...items, ...newItems]);
    setErrors((prev) => ({ ...prev, items: undefined }));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              quantityRequested: quantity,
              quantityApproved: quantity,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const handleSubmit = async (isDraft: boolean = true) => {
    // Validate only when submitting (not when saving draft)
    if (!isDraft && !validateForm()) return;
    if (!userId || !userName) return;

    if (isDraft) {
      setIsSavingDraft(true);
    } else {
      setIsSubmittingRequest(true);
    }

    const startedAt = Date.now();
    const MIN_LOADER_MS = 500;

    try {
      const updates: EditRequestData = {
        priority,
        purpose,
        items,
      };

      // First, save any changes
      await dispatch(
        editRequest({
          requestId,
          updates,
          editedBy: userId,
          editedByName: userName,
        })
      ).unwrap();

      // If submitting, convert draft → pending
      if (!isDraft) {
        await dispatch(
          submitDraftRequest({
            requestId,
            userId,
          })
        ).unwrap();
      }

      Alert.alert(
        'Success',
        isDraft ? 'Draft saved successfully' : 'Request submitted successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update request'
      );
    } finally {
      const clearLoading = () => {
        if (isDraft) {
          setIsSavingDraft(false);
        } else {
          setIsSubmittingRequest(false);
        }
      };
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      if (remaining > 0) {
        setTimeout(clearLoading, remaining);
      } else {
        clearLoading();
      }
    }
  };

  if (isLoading || !request) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Edit Request" showBack onBackPress={handleBack} />
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
      <ScreenHeader title="Edit Request" showBack onBackPress={handleBack} />

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          {/* Request Info */}
          <View className="bg-[#F8FAFC] rounded-lg p-4">
            <Text className="text-[13px] text-[#64748B] mb-1">
              Editing draft request
            </Text>
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              {request?.siteName}
            </Text>
          </View>

          <PrioritySelector
            value={priority}
            onChange={(value) => {
              setPriority(value);
              setErrors((prev) => ({ ...prev, priority: undefined }));
            }}
            error={errors.priority}
          />

          {/* Items Section */}
          <View className="gap-1.5">
            <View className="flex-row justify-between items-center">
              <Text className="text-[15px] text-[#0F172A]">
                Items <Text className="text-[#DC2626]">*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setItemSelectorVisible(true)}
                className="flex-row items-center gap-1"
                accessibilityRole="button"
                accessibilityLabel="Add items"
              >
                <Ionicons name="add-circle" size={20} color="#1E40AF" />
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Add Items
                </Text>
              </TouchableOpacity>
            </View>

            {items.length > 0 ? (
              <View className="gap-3 mt-2">
                {items.map((item) => (
                  <RequestItemCard
                    key={item.itemId}
                    item={item}
                    mode="edit"
                    onQuantityChange={handleQuantityChange}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </View>
            ) : (
              <View className="bg-[#F8FAFC] rounded-lg p-6 items-center justify-center border border-dashed border-[#E2E8F0] mt-2">
                <Ionicons name="cube-outline" size={48} color="#64748B" />
                <Text className="text-[15px] text-[#64748B] mt-2">
                  No items added yet
                </Text>
              </View>
            )}

            {errors.items && (
              <Text
                className="text-[13px] text-[#DC2626]"
                accessibilityLiveRegion="polite"
              >
                {errors.items}
              </Text>
            )}
          </View>

          <FormField
            label="Purpose / Notes"
            value={purpose}
            onChangeText={(text) => {
              setPurpose(text);
              setErrors((prev) => ({ ...prev, purpose: undefined }));
            }}
            placeholder="Describe the purpose of this request..."
            error={errors.purpose}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleSubmit(true)}
            disabled={isButtonDisabled}
            className={`flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center ${
              !hasItems ? 'opacity-50' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel={isSavingDraft ? 'Saving draft' : 'Save as draft'}
            accessibilityState={{ disabled: isButtonDisabled, busy: isSavingDraft }}
          >
            {isSavingDraft ? (
              <ActivityIndicator size="small" color="#1E40AF" />
            ) : (
              <Text className="text-[15px] font-semibold text-[#1E40AF]">
                Save Draft
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSubmit(false)}
            disabled={isButtonDisabled}
            className={`flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center ${
              !hasItems ? 'opacity-50' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel="Submit request"
            accessibilityState={{ disabled: isButtonDisabled }}
          >
            {isSubmittingRequest ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">
                Submit Request
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ItemSelectorModal
        isVisible={itemSelectorVisible}
        onClose={() => setItemSelectorVisible(false)}
        onSelect={handleItemsSelected}
        excludeItemIds={items.map((i) => i.itemId)}
      />
    </ScreenLayout>
  );
};
