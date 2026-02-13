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
import { createRequest } from '../../store/thunks/requestThunks';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import { selectSiteById } from '../../store/selectors/sitesSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { RequestPriority, CreateRequestData } from '../../types/request';
import type { Item } from '../../types/inventory';
import type { RequestStackParamList } from '../../navigation/RequestStackParamList';

type RouteParams = RouteProp<RequestStackParamList, 'CreateRequest'>;
type NavigationProp = StackNavigationProp<RequestStackParamList, 'CreateRequest'>;

interface FormErrors {
  priority?: string;
  items?: string;
  purpose?: string;
}

export const CreateRequestScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { siteId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const site = useAppSelector(selectSiteById(siteId));

  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [items, setItems] = useState<Array<Item & { quantity: number }>>([]);
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const isBusy = isSubmittingRequest || isSavingDraft;
  const [itemSelectorVisible, setItemSelectorVisible] = useState(false);

  // Ensure items catalog is loaded (required for Site Managers who may not have visited Central Store)
  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!priority) {
      newErrors.priority = 'Priority is required';
    }

    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    // Purpose / Notes is optional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleItemsSelected = (selectedItems: Item[]) => {
    const newItems = selectedItems.map((item) => ({
      ...item,
      quantity: 1,
    }));
    setItems([...items, ...newItems]);
    setErrors({ ...errors, items: undefined });
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!validateForm() && !isDraft) {
      return;
    }

    if (!site || !userId || !userName) {
      Alert.alert('Error', 'Missing required user or site information');
      return;
    }

    if (isDraft) {
      setIsSavingDraft(true);
    } else {
      setIsSubmittingRequest(true);
    }

    try {
      const requestData: CreateRequestData = {
        siteId: site.id,
        siteName: site.name,
        priority,
        purpose: purpose.trim() || undefined,
        items: items.map((item) => ({
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          itemType: item.type,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
        })),
      };

      await dispatch(
        createRequest({
          requestData,
          userId,
          userName,
          isDraft,
        })
      ).unwrap();

      Alert.alert(
        'Success',
        isDraft ? 'Request saved as draft' : 'Request submitted successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create request'
      );
    } finally {
      if (isDraft) {
        setIsSavingDraft(false);
      } else {
        setIsSubmittingRequest(false);
      }
    }
  };

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="New Request" />

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          {/* Site Info */}
          <View className="bg-[#F8FAFC] rounded-lg p-4">
            <Text className="text-[13px] text-[#64748B] mb-1">
              Request for:
            </Text>
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              {site?.name}
            </Text>
          </View>

          {/* Priority Selector */}
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
                    key={item.id}
                    item={{
                      itemId: item.id,
                      itemName: item.name,
                      itemSku: item.sku,
                      itemType: item.type,
                      categoryId: item.categoryId,
                      categoryName: item.categoryName,
                      imageUrl: item.imageUrl,
                      quantityRequested: item.quantity,
                      quantityApproved: item.quantity,
                      quantityReturned: 0,
                      status: 'pending',
                    }}
                    mode="create"
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
                <Text className="text-[13px] text-[#64748B] text-center mt-1">
                  Tap &quot;Add Items&quot; to select items
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

          {/* Purpose (optional) */}
          <FormField
            label="Purpose / Notes (optional)"
            value={purpose}
            onChangeText={(text) => {
              setPurpose(text);
              setErrors((prev) => ({ ...prev, purpose: undefined }));
            }}
            placeholder="Describe the purpose of this request (optional)..."
            error={errors.purpose}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleSubmit(true)}
            disabled={isBusy}
            className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Save as draft"
          >
            <Text className="text-[15px] font-semibold text-[#1E40AF]">
              Save Draft
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSubmit(false)}
            disabled={isBusy}
            className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Submit request"
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
        excludeItemIds={items.map((item) => item.id)}
      />
    </ScreenLayout>
  );
};
