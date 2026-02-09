import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CategorySelector } from './CategorySelector';
import type { Item, ItemType, ItemStatus, CreateItemData, UpdateItemData } from '../../types/inventory';

/**
 * Component Props Interface
 */
export interface ItemFormProps {
  /** Form mode: create or edit */
  mode: 'create' | 'edit';
  /** Initial data for edit mode */
  initialData?: Partial<Item>;
  /** Callback when form is submitted */
  onSubmit: (data: CreateItemData | UpdateItemData, imageUri?: string) => void;
  /** Optional callback when form is cancelled */
  onCancel?: () => void;
  /** Loading state (disables form during submission) */
  loading?: boolean;
}

/**
 * Form State Interface
 */
interface FormState {
  name: string;
  sku: string;
  description: string;
  categoryId: string | null;
  type: ItemType;
  unit: string;
  initialQuantity: string;
  minStockLevel: string;
  status: ItemStatus;
  imageUri?: string;
}

/**
 * Form Errors Interface
 */
interface FormErrors {
  name?: string;
  sku?: string;
  categoryId?: string;
  type?: string;
  unit?: string;
  initialQuantity?: string;
  minStockLevel?: string;
}

/**
 * ItemForm Component
 * Comprehensive form for adding/editing inventory items
 */
export const ItemForm: React.FC<ItemFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  // Form state
  const [formData, setFormData] = useState<FormState>({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    categoryId: initialData?.categoryId || null,
    type: initialData?.type || 'consumable',
    unit: initialData?.unit || '',
    initialQuantity: '',
    minStockLevel: initialData?.minStockLevel?.toString() || '',
    status: initialData?.status || 'active',
    imageUri: initialData?.imageUrl || undefined,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Image picker permission not granted');
        }
      }
    })();
  }, []);

  /**
   * Update form field
   */
  const updateField = useCallback((field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  /**
   * Handle image selection
   */
  const handleImagePick = useCallback(async () => {
    try {
      setImageLoading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateField('imageUri', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    } finally {
      setImageLoading(false);
    }
  }, [updateField]);

  /**
   * Remove image
   */
  const handleImageRemove = useCallback(() => {
    updateField('imageUri', undefined);
  }, [updateField]);

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    // SKU validation
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    // Category validation
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    // Unit validation
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit of measurement is required';
    }

    // Initial quantity validation (create mode only)
    if (mode === 'create') {
      const quantity = parseFloat(formData.initialQuantity);
      if (!formData.initialQuantity.trim()) {
        newErrors.initialQuantity = 'Initial quantity is required';
      } else if (isNaN(quantity) || quantity < 0) {
        newErrors.initialQuantity = 'Must be a valid number (0 or greater)';
      }
    }

    // Min stock level validation
    const minStock = parseFloat(formData.minStockLevel);
    if (!formData.minStockLevel.trim()) {
      newErrors.minStockLevel = 'Minimum stock level is required';
    } else if (isNaN(minStock) || minStock < 0) {
      newErrors.minStockLevel = 'Must be a valid number (0 or greater)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  /**
   * Check if form is valid
   */
  const isFormValid = useMemo((): boolean => {
    if (mode === 'create') {
      return Boolean(
        formData.name.trim() &&
        formData.sku.trim() &&
        formData.categoryId &&
        formData.unit.trim() &&
        formData.initialQuantity.trim() &&
        formData.minStockLevel.trim()
      );
    }
    
    return Boolean(
      formData.name.trim() &&
      formData.sku.trim() &&
      formData.categoryId &&
      formData.unit.trim() &&
      formData.minStockLevel.trim()
    );
  }, [formData, mode]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    if (mode === 'create') {
      const createData: CreateItemData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || undefined,
        categoryId: formData.categoryId!,
        type: formData.type,
        unit: formData.unit.trim(),
        minStockLevel: parseFloat(formData.minStockLevel),
        initialQuantity: parseFloat(formData.initialQuantity),
      };
      onSubmit(createData, formData.imageUri);
    } else {
      const updateData: UpdateItemData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || undefined,
        categoryId: formData.categoryId!,
        unit: formData.unit.trim(),
        minStockLevel: parseFloat(formData.minStockLevel),
        status: formData.status,
      };
      onSubmit(updateData, formData.imageUri);
    }
  }, [formData, mode, onSubmit, validateForm]);

  return (
    <ScrollView
      className="flex-1 bg-[#F8FAFC]"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-4 px-4 py-4">
        {/* Item Name */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Item Name *</Text>
          <TextInput
            className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
              errors.name ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
            }`}
            placeholderTextColor="#94A3B8"
            placeholder="Enter item name"
            value={formData.name}
            onChangeText={(text) => updateField('name', text)}
            editable={!loading}
            accessibilityLabel="Item name input"
            accessibilityRole="none"
          />
          {errors.name && (
            <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
              {errors.name}
            </Text>
          )}
        </View>

        {/* SKU */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">SKU *</Text>
          <TextInput
            className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
              errors.sku ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
            } ${mode === 'edit' && initialData?.sku ? 'opacity-50' : ''}`}
            placeholderTextColor="#94A3B8"
            placeholder="Enter SKU code"
            value={formData.sku}
            onChangeText={(text) => updateField('sku', text)}
            editable={!loading && !(mode === 'edit' && initialData?.sku)}
            accessibilityLabel="SKU input"
            accessibilityRole="none"
          />
          {mode === 'edit' && initialData?.sku && (
            <Text className="text-[13px] text-[#64748B]">
              SKU cannot be changed after creation
            </Text>
          )}
          {errors.sku && (
            <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
              {errors.sku}
            </Text>
          )}
        </View>

        {/* Description */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Description</Text>
          <TextInput
            className="border border-[#E2E8F0] rounded-lg px-4 py-3 bg-white text-[15px] text-[#0F172A]"
            placeholderTextColor="#94A3B8"
            placeholder="Enter item description (optional)"
            value={formData.description}
            onChangeText={(text) => updateField('description', text)}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
            accessibilityLabel="Description input"
            accessibilityRole="none"
          />
        </View>

        {/* Category */}
        <CategorySelector
          selectedCategoryId={formData.categoryId}
          onSelect={(categoryId) => updateField('categoryId', categoryId)}
          error={errors.categoryId}
        />

        {/* Item Type */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Item Type *</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 border rounded-lg h-12 items-center justify-center ${
                formData.type === 'consumable'
                  ? 'bg-[#1E40AF] border-[#1E40AF]'
                  : 'bg-white border-[#E2E8F0]'
              } ${mode === 'edit' && initialData?.type ? 'opacity-50' : ''}`}
              onPress={() => updateField('type', 'consumable')}
              activeOpacity={0.7}
              disabled={loading || (mode === 'edit' && Boolean(initialData?.type))}
              accessibilityLabel="Consumable item type"
              accessibilityRole="radio"
              accessibilityState={{ checked: formData.type === 'consumable' }}
            >
              <Text
                className={`text-[15px] font-semibold ${
                  formData.type === 'consumable' ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                Consumable
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 border rounded-lg h-12 items-center justify-center ${
                formData.type === 'non_consumable'
                  ? 'bg-[#1E40AF] border-[#1E40AF]'
                  : 'bg-white border-[#E2E8F0]'
              } ${mode === 'edit' && initialData?.type ? 'opacity-50' : ''}`}
              onPress={() => updateField('type', 'non_consumable')}
              activeOpacity={0.7}
              disabled={loading || (mode === 'edit' && Boolean(initialData?.type))}
              accessibilityLabel="Non-consumable item type"
              accessibilityRole="radio"
              accessibilityState={{ checked: formData.type === 'non_consumable' }}
            >
              <Text
                className={`text-[15px] font-semibold ${
                  formData.type === 'non_consumable' ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                Non-Consumable
              </Text>
            </TouchableOpacity>
          </View>
          {mode === 'edit' && initialData?.type && (
            <Text className="text-[13px] text-[#64748B]">
              Item type cannot be changed after creation
            </Text>
          )}
        </View>

        {/* Unit of Measurement */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Unit of Measurement *</Text>
          <TextInput
            className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
              errors.unit ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
            }`}
            placeholderTextColor="#94A3B8"
            placeholder="e.g., bags, pcs, kg, liters"
            value={formData.unit}
            onChangeText={(text) => updateField('unit', text)}
            editable={!loading}
            accessibilityLabel="Unit of measurement input"
            accessibilityRole="none"
          />
          {errors.unit && (
            <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
              {errors.unit}
            </Text>
          )}
        </View>

        {/* Initial Quantity (Create mode only) */}
        {mode === 'create' && (
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Initial Quantity *</Text>
            <TextInput
              className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                errors.initialQuantity ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
              }`}
              placeholderTextColor="#94A3B8"
              placeholder="Enter initial quantity"
              value={formData.initialQuantity}
              onChangeText={(text) => updateField('initialQuantity', text)}
              keyboardType="numeric"
              editable={!loading}
              accessibilityLabel="Initial quantity input"
              accessibilityRole="none"
            />
            {errors.initialQuantity && (
              <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                {errors.initialQuantity}
              </Text>
            )}
          </View>
        )}

        {/* Minimum Stock Level */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Minimum Stock Level *</Text>
          <TextInput
            className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
              errors.minStockLevel ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
            }`}
            placeholderTextColor="#94A3B8"
            placeholder="Enter minimum stock level"
            value={formData.minStockLevel}
            onChangeText={(text) => updateField('minStockLevel', text)}
            keyboardType="numeric"
            editable={!loading}
            accessibilityLabel="Minimum stock level input"
            accessibilityRole="none"
          />
          {errors.minStockLevel && (
            <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
              {errors.minStockLevel}
            </Text>
          )}
        </View>

        {/* Status */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Status *</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 border rounded-lg h-12 items-center justify-center ${
                formData.status === 'active'
                  ? 'bg-[#16A34A] border-[#16A34A]'
                  : 'bg-white border-[#E2E8F0]'
              }`}
              onPress={() => updateField('status', 'active')}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityLabel="Active status"
              accessibilityRole="radio"
              accessibilityState={{ checked: formData.status === 'active' }}
            >
              <Text
                className={`text-[15px] font-semibold ${
                  formData.status === 'active' ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                Active
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 border rounded-lg h-12 items-center justify-center ${
                formData.status === 'discontinued'
                  ? 'bg-[#DC2626] border-[#DC2626]'
                  : 'bg-white border-[#E2E8F0]'
              }`}
              onPress={() => updateField('status', 'discontinued')}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityLabel="Discontinued status"
              accessibilityRole="radio"
              accessibilityState={{ checked: formData.status === 'discontinued' }}
            >
              <Text
                className={`text-[15px] font-semibold ${
                  formData.status === 'discontinued' ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                Discontinued
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Item Image */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Item Image</Text>
          
          {formData.imageUri ? (
            <View className="border border-[#E2E8F0] rounded-lg p-4 bg-white">
              <View className="items-center gap-3">
                <Image
                  source={{ uri: formData.imageUri }}
                  className="w-32 h-32 rounded-lg"
                  resizeMode="cover"
                  accessibilityLabel="Item image preview"
                />
                
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                    onPress={handleImagePick}
                    activeOpacity={0.7}
                    disabled={loading || imageLoading}
                    accessibilityLabel="Change image"
                    accessibilityRole="button"
                  >
                    <Text className="text-[15px] font-semibold text-[#1E40AF]">
                      Change Image
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="flex-1 border-[1.5px] border-[#DC2626] rounded-[10px] h-[50px] items-center justify-center"
                    onPress={handleImageRemove}
                    activeOpacity={0.7}
                    disabled={loading || imageLoading}
                    accessibilityLabel="Remove image"
                    accessibilityRole="button"
                  >
                    <Text className="text-[15px] font-semibold text-[#DC2626]">
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              className="border-[1.5px] border-[#1E40AF] border-dashed rounded-lg h-32 items-center justify-center gap-2 bg-white"
              onPress={handleImagePick}
              activeOpacity={0.7}
              disabled={loading || imageLoading}
              accessibilityLabel="Add item image"
              accessibilityRole="button"
            >
              {imageLoading ? (
                <ActivityIndicator size="large" color="#1E40AF" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color="#1E40AF" />
                  <Text className="text-[15px] font-semibold text-[#1E40AF]">
                    Add Image
                  </Text>
                  <Text className="text-[13px] text-[#64748B]">Optional</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Buttons */}
        <View className="flex-row gap-3 pt-4 pb-8">
          {onCancel && (
            <TouchableOpacity
              className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              onPress={onCancel}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityLabel="Cancel form"
              accessibilityRole="button"
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF]">Cancel</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            className={`flex-1 rounded-[10px] h-[50px] items-center justify-center ${
              !isFormValid || loading ? 'bg-[#94A3B8]' : 'bg-[#1E40AF]'
            }`}
            onPress={handleSubmit}
            activeOpacity={0.7}
            disabled={!isFormValid || loading}
            accessibilityLabel={mode === 'create' ? 'Submit new item' : 'Save changes'}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">
                {mode === 'create' ? 'Submit' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
