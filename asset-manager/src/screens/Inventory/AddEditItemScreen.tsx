import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components';
import { ItemForm } from '../../components/Inventory/ItemForm';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createItem,
  updateItem,
  fetchItemById,
  SKU_EXISTS_ERROR_MESSAGE,
} from '../../store/thunks/inventoryThunks';
import { selectAllCategories, selectItemsLoading } from '../../store/selectors/inventorySelectors';
import { useInventoryError } from '../../hooks/useInventoryError';
import { uploadItemImage, deleteItemImageByUrl } from '../../services/firebase/storageService';
import type { Item, CreateItemData, UpdateItemData } from '../../types/inventory';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type NavigationProp = StackNavigationProp<InventoryStackParamList, 'AddEditItem'>;

interface RouteParams {
  itemId?: string;
}

/**
 * AddEditItemScreen Component
 * Screen for adding new items or editing existing items
 */
export const AddEditItemScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  
  const { itemId } = (route.params as RouteParams) || {};
  const mode: 'create' | 'edit' = itemId ? 'edit' : 'create';
  
  // Redux state
  const categories = useAppSelector(selectAllCategories);
  const isLoading = useAppSelector(selectItemsLoading);
  const reduxError = useInventoryError();
  
  // Local state
  const [item, setItem] = useState<Item | null>(null);
  const [loadingItem, setLoadingItem] = useState<boolean>(mode === 'edit');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load item data for edit mode
  useEffect(() => {
    const loadItem = async () => {
      if (mode === 'edit' && itemId) {
        try {
          setLoadingItem(true);
          setError(null);
          const itemData = await dispatch(fetchItemById(itemId)).unwrap();
          setItem(itemData);
        } catch (err: any) {
          setError(err.message || 'Failed to load item');
          console.error('Error loading item:', err);
        } finally {
          setLoadingItem(false);
        }
      }
    };

    loadItem();
  }, [mode, itemId, dispatch]);

  // Sync Redux error to local state (including when auto-cleared)
  useEffect(() => {
    setError(reduxError ?? null);
  }, [reduxError]);

  // Memoize initial data for ItemForm
  const initialData = useMemo<Partial<Item> | undefined>(() => {
    if (mode === 'edit' && item) {
      return {
        name: item.name,
        sku: item.sku,
        description: item.description,
        categoryId: item.categoryId,
        type: item.type,
        unit: item.unit,
        minStockLevel: item.minStockLevel,
        status: item.status,
        imageUrl: item.imageUrl,
      };
    }
    return undefined;
  }, [mode, item]);

  /**
   * Get category name by ID
   */
  const getCategoryName = useCallback(
    (categoryId: string | null): string => {
      if (!categoryId) return '';
      const category = categories.find((cat) => cat.id === categoryId);
      return category?.name || '';
    },
    [categories]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (data: CreateItemData | UpdateItemData, imageUri?: string) => {
      try {
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        if (mode === 'create') {
          const createData = data as CreateItemData;
          const categoryName = getCategoryName(createData.categoryId);
          
          if (!categoryName) {
            setError('Category not found');
            setIsSubmitting(false);
            return;
          }

          // Create item first (without image)
          const createdItem = await dispatch(
            createItem({
              itemData: {
                ...createData,
                imageUrl: undefined, // Will be added after image upload
              },
              categoryName,
            })
          ).unwrap();

          // Upload image if provided
          let imageUrl: string | undefined;
          if (imageUri) {
            try {
              imageUrl = await uploadItemImage(imageUri, createdItem.id);
              // Update item with image URL - wrap in try-catch for orphan cleanup
              try {
                await dispatch(
                  updateItem({
                    itemId: createdItem.id,
                    updates: { imageUrl },
                  })
                ).unwrap();
              } catch (updateError) {
                // If update fails after upload, delete orphaned image
                if (imageUrl) {
                  await deleteItemImageByUrl(imageUrl);
                }
                throw updateError;
              }
            } catch (imageError: any) {
              console.error('Error uploading image:', imageError);
              // Don't fail the entire operation if image upload fails
              // Item is already created, user can add image later
            }
          }

          setSuccess(true);
          
          // Navigate back after a short delay to show success message
          setTimeout(() => {
            // @ts-ignore - navigation typing varies by navigator
            navigation.goBack();
          }, 1000);
        } else {
          // Edit mode
          if (!itemId) {
            setError('Item ID is required for editing');
            setIsSubmitting(false);
            return;
          }

          const updateData = data as UpdateItemData;
          const categoryName = updateData.categoryId
            ? getCategoryName(updateData.categoryId)
            : undefined;

          // Track if we uploaded a new image (for orphan cleanup on update failure)
          let uploadedImageUrl: string | undefined;

          // Handle image upload/update
          // imageUri can be:
          // - undefined: user removed image or no image was set
          // - local URI (file://): user selected a new image
          // - http URL: existing image URL (user didn't change it)
          if (imageUri === undefined) {
            // User removed the image, set to empty string to remove it
            updateData.imageUrl = '';
          } else if (imageUri.startsWith('http')) {
            // Existing image URL, keep it as is
            updateData.imageUrl = imageUri;
          } else {
            // New image selected (local URI), upload it
            try {
              const imageUrl = await uploadItemImage(imageUri, itemId);
              updateData.imageUrl = imageUrl;
              uploadedImageUrl = imageUrl;
            } catch (imageError: any) {
              console.error('Error uploading image:', imageError);
              setError('Failed to upload image. Please try again.');
              setIsSubmitting(false);
              return;
            }
          }

          // Update item - wrap in try-catch for orphan cleanup if new image was uploaded
          try {
            await dispatch(
              updateItem({
                itemId,
                updates: updateData,
                categoryName,
              })
            ).unwrap();
          } catch (updateError) {
            // If update fails after uploading new image, delete orphaned image
            if (uploadedImageUrl) {
              await deleteItemImageByUrl(uploadedImageUrl);
            }
            throw updateError;
          }

          setSuccess(true);
          
          // Navigate back after a short delay to show success message
          setTimeout(() => {
            // @ts-ignore - navigation typing varies by navigator
            navigation.goBack();
          }, 1000);
        }
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to save item';
        setError(errorMessage);

        // Show Alert for duplicate SKU - definitive UX feedback for both create and edit
        const isDuplicateSku =
          errorMessage === SKU_EXISTS_ERROR_MESSAGE ||
          (errorMessage.toLowerCase().includes('sku') &&
            errorMessage.toLowerCase().includes('already exists'));
        if (isDuplicateSku) {
          Alert.alert(
            'Duplicate SKU',
            SKU_EXISTS_ERROR_MESSAGE,
            [{ text: 'OK' }]
          );
        }

        console.error('Error saving item:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode, itemId, dispatch, navigation, getCategoryName]
  );

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    // @ts-ignore - navigation typing varies by navigator
    navigation.goBack();
  }, [navigation]);

  // Loading state while fetching item data
  if (loadingItem) {
    return (
      <ScreenLayout edges={['top']}>
        {/* Header with Back Button */}
        <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleCancel}
            className="w-11 h-11 items-center justify-center"
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          {/* Screen Title */}
          <Text
            className="text-[22px] font-semibold text-[#0F172A]"
            accessibilityRole="header"
          >
            {mode === 'create' ? 'Add New Item' : 'Edit Item'}
          </Text>

          {/* Right spacer to center title */}
          <View className="w-11 h-11" />
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] text-[#64748B]">Loading item data...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']} keyboardAware>
      {/* Header with Back Button */}
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleCancel}
          className="w-11 h-11 items-center justify-center"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        {/* Screen Title */}
        <Text
          className="text-[22px] font-semibold text-[#0F172A]"
          accessibilityRole="header"
        >
          {mode === 'create' ? 'Add New Item' : 'Edit Item'}
        </Text>

        {/* Right spacer to center title */}
        <View className="w-11 h-11" />
      </View>

      {/* Success Message */}
      {success && (
        <View
          className="bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-lg p-3 mx-4 mt-3"
          accessibilityLiveRegion="polite"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            <Text className="text-[13px] text-[#16A34A] flex-1">
              {mode === 'create' ? 'Item created successfully' : 'Item updated successfully'}
            </Text>
          </View>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View
          className="bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-lg p-3 mx-4 mt-3"
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
        >
          <View className="flex-row items-start gap-2">
            <Ionicons name="warning" size={20} color="#DC2626" />
            <Text className="text-[13px] text-[#DC2626] flex-1">{error}</Text>
            <TouchableOpacity
              onPress={() => setError(null)}
              className="p-1"
              accessibilityLabel="Dismiss error"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Form */}
      <ItemForm
        mode={mode}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={isSubmitting || isLoading}
      />
    </ScreenLayout>
  );
};
