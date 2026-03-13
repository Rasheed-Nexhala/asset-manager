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
import { UnitSelector } from './UnitSelector';
import { SteelMasterSelector } from './SteelMasterSelector';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSteelMasters } from '../../store/thunks/steelMasterThunks';
import { selectActiveSteelMasters } from '../../store/selectors/steelMasterSelectors';
import { selectAllCategories } from '../../store/selectors/inventorySelectors';
import {
  kgToPieces,
  piecesToKg,
  tonToKg,
  TON_TO_KG,
  getConversionErrorMessage,
} from '../../utils/weightConversionUtils';
import type { Item, ItemType, ItemStatus, CreateItemData, UpdateItemData } from '../../types/inventory';
import { normalizeCategoryId } from '../../types/inventory';
import type { SteelMaster } from '../../types/steelMaster';

/** Check if unit is weight-based (Kg or Ton) */
const isWeightUnit = (unit: string): boolean => unit === 'Kg' || unit === 'Ton (MT)';
const isDiscreteUnit = (unit: string): boolean =>
  ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(unit);

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
  /** Optional callback when user taps "Manage Custom Items" */
  onManageSteelMaster?: () => void;
  /** Optional: navigate to CategorySelectScreen instead of modal. Receives current categoryId for pre-selection. */
  onSelectCategoryPress?: (currentCategoryId: string | null) => void;
  /** Optional: category ID returned from CategorySelectScreen (parent clears after applying) */
  returnedCategoryId?: string | null;
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
  onManageSteelMaster,
  onSelectCategoryPress,
  returnedCategoryId,
}) => {
  const dispatch = useAppDispatch();
  const steelMasters = useAppSelector(selectActiveSteelMasters);
  const categories = useAppSelector(selectAllCategories);

  /**
   * In edit mode with Kg/Ton unit, minStockLevel is stored as pieces in the backend.
   * Convert pieces → kg (or ton) for display so the user sees and edits in weight units.
   */
  const initialMinStockLevelDisplay = useMemo((): string => {
    if (mode !== 'edit' || initialData?.minStockLevel == null) {
      return initialData?.minStockLevel?.toString() ?? '';
    }
    const pieces = Number(initialData.minStockLevel);
    const u = initialData.unit;
    if (u !== 'Kg' && u !== 'Ton (MT)') {
      return initialData.minStockLevel.toString();
    }
    const wpm = initialData.weightPerMeter;
    const lpp = initialData.lengthPerPiece;
    if (wpm == null || lpp == null) {
      return initialData.minStockLevel.toString();
    }
    const kg = piecesToKg(pieces, wpm, lpp);
    return u === 'Ton (MT)' ? (kg / TON_TO_KG).toString() : kg.toString();
  }, [
    mode,
    initialData?.minStockLevel,
    initialData?.unit,
    initialData?.weightPerMeter,
    initialData?.lengthPerPiece,
  ]);

  // Form state (minStockLevel in edit+Kg/Ton uses converted display value from pieces)
  const [formData, setFormData] = useState<FormState>({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    categoryId: initialData?.categoryId || null,
    type: initialData?.type || 'consumable',
    unit: initialData?.unit || '',
    initialQuantity: '',
    minStockLevel: initialMinStockLevelDisplay || initialData?.minStockLevel?.toString() || '',
    status: initialData?.status || 'active',
    imageUri: initialData?.imageUrl || undefined,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [selectedSteelMaster, setSelectedSteelMaster] = useState<SteelMaster | null>(null);
  const [autoGeneratedSku, setAutoGeneratedSku] = useState<string>('');

  const isFromSteelMaster = Boolean(selectedSteelMaster);

  /** Weight config for steel items - from steel master or existing item data */
  const weightConfig = useMemo(() => {
    if (selectedSteelMaster) {
      return {
        weightPerMeter: selectedSteelMaster.weightPerMeter,
        lengthPerPiece: selectedSteelMaster.defaultLength,
      };
    }
    if (mode === 'edit' && initialData?.weightPerMeter != null && initialData?.lengthPerPiece != null) {
      return {
        weightPerMeter: initialData.weightPerMeter,
        lengthPerPiece: initialData.lengthPerPiece,
      };
    }
    return null;
  }, [selectedSteelMaster, mode, initialData?.weightPerMeter, initialData?.lengthPerPiece]);

  const isWeightBased = weightConfig !== null;

  // Load steel masters on mount (for steel master selector at top)
  useEffect(() => {
    if (steelMasters.length === 0) {
      dispatch(fetchSteelMasters(true));
    }
  }, [dispatch, steelMasters.length]);

  // Pre-fill from initialData when editing (including steel master)
  useEffect(() => {
    if (mode !== 'edit' || !initialData) return;
    if (initialData.steelMasterId) {
      const sm = steelMasters.find((m) => m.id === initialData.steelMasterId);
      if (sm) setSelectedSteelMaster(sm);
    }
  }, [mode, initialData?.steelMasterId, steelMasters]);

  // Sync category returned from CategorySelectScreen
  useEffect(() => {
    if (returnedCategoryId != null) {
      setFormData((prev) => ({ ...prev, categoryId: returnedCategoryId }));
    }
  }, [returnedCategoryId]);

  /** Live validation for weight-based Kg/Ton conversion */
  useEffect(() => {
    if (!isWeightBased || !weightConfig || !isWeightUnit(formData.unit)) return;

    const newErrors: Partial<FormErrors> = {};

    if (mode === 'create' && formData.initialQuantity.trim()) {
      const quantity = parseFloat(formData.initialQuantity);
      if (!isNaN(quantity) && quantity > 0) {
        const kgValue = formData.unit === 'Ton (MT)' ? tonToKg(quantity) : quantity;
        const result = kgToPieces(kgValue, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
        if (!result.isExact) {
          newErrors.initialQuantity = getConversionErrorMessage(
            kgValue,
            weightConfig.weightPerMeter,
            weightConfig.lengthPerPiece
          );
        }
      }
    }

    if (formData.minStockLevel.trim()) {
      const minStock = parseFloat(formData.minStockLevel);
      if (!isNaN(minStock) && minStock > 0) {
        const kgValue = formData.unit === 'Ton (MT)' ? tonToKg(minStock) : minStock;
        const result = kgToPieces(kgValue, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
        if (!result.isExact) {
          newErrors.minStockLevel = getConversionErrorMessage(
            kgValue,
            weightConfig.weightPerMeter,
            weightConfig.lengthPerPiece
          );
        }
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (newErrors.initialQuantity !== undefined) next.initialQuantity = newErrors.initialQuantity;
      else delete next.initialQuantity;
      if (newErrors.minStockLevel !== undefined) next.minStockLevel = newErrors.minStockLevel;
      else delete next.minStockLevel;
      return next;
    });
  }, [
    formData.initialQuantity,
    formData.minStockLevel,
    formData.unit,
    isWeightBased,
    weightConfig,
    mode,
  ]);

  /** Live validation: min stock level cannot exceed initial/total quantity */
  useEffect(() => {
    if (!formData.minStockLevel.trim()) return;

    const minStock = parseFloat(formData.minStockLevel);
    if (isNaN(minStock)) return;

    let newError: string | undefined;
    if (mode === 'create' && formData.initialQuantity.trim()) {
      const initialQty = parseFloat(formData.initialQuantity);
      if (!isNaN(initialQty) && minStock > initialQty) {
        newError = 'Minimum stock level cannot exceed initial quantity';
      }
    } else if (mode === 'edit' && initialData) {
      const centralStockPieces = Number(initialData.centralStoreQuantity ?? initialData.totalQuantity ?? 0);
      let centralQtyDisplay: number;
      if (isWeightBased && weightConfig && isWeightUnit(formData.unit)) {
        const kg = piecesToKg(centralStockPieces, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
        centralQtyDisplay = formData.unit === 'Ton (MT)' ? kg / TON_TO_KG : kg;
      } else {
        centralQtyDisplay = centralStockPieces;
      }
      if (!isNaN(centralQtyDisplay) && minStock > centralQtyDisplay) {
        newError = 'Minimum stock level cannot exceed current central store quantity';
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (newError) next.minStockLevel = newError;
      else if (prev.minStockLevel?.includes('cannot exceed')) delete next.minStockLevel;
      return next;
    });
  }, [
    formData.initialQuantity,
    formData.minStockLevel,
    formData.unit,
    mode,
    initialData?.centralStoreQuantity,
    initialData?.totalQuantity,
    isWeightBased,
    weightConfig,
  ]);

  /**
   * Handle steel master selection - auto-fill name, SKU, unit
   */
  const handleSteelMasterSelect = useCallback(
    (master: SteelMaster | null) => {
      if (!master) {
        setSelectedSteelMaster(null);
        setAutoGeneratedSku('');
        if (mode === 'create') {
          setFormData((prev) => ({ ...prev, name: '', sku: '', unit: '' }));
        }
        return;
      }

      setSelectedSteelMaster(master);
      setFormData((prev) => ({ 
        ...prev, 
        name: master.name, 
        unit: 'Pcs',
        sku: master.hsnCode || '' // Use steel master's SKU directly
      }));

      // Set the auto-generated SKU to show the indication
      setAutoGeneratedSku(master.hsnCode || '');
    },
    [mode]
  );

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
   * Handle unit change with auto-conversion when switching between Pcs and Kg/Ton
   */
  const handleUnitChange = useCallback(
    (newUnit: string) => {
      const oldUnit = formData.unit;

      if (isWeightBased && weightConfig) {
        const wasWeightUnit = isWeightUnit(oldUnit);
        const isNowWeightUnit = isWeightUnit(newUnit);

        if (wasWeightUnit !== isNowWeightUnit) {
          const updates: Partial<FormState> = { unit: newUnit };

          if (formData.initialQuantity) {
            const val = parseFloat(formData.initialQuantity);
            if (!isNaN(val) && val > 0) {
              let converted: number;
              if (isNowWeightUnit) {
                converted = piecesToKg(val, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
                if (newUnit === 'Ton (MT)') converted = converted / 1000;
              } else {
                const kg = oldUnit === 'Ton (MT)' ? tonToKg(val) : val;
                const result = kgToPieces(kg, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
                converted = result.pieces;
              }
              updates.initialQuantity = converted.toString();
            }
          }

          if (formData.minStockLevel) {
            const val = parseFloat(formData.minStockLevel);
            if (!isNaN(val) && val > 0) {
              let converted: number;
              if (isNowWeightUnit) {
                converted = piecesToKg(val, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
                if (newUnit === 'Ton (MT)') converted = converted / 1000;
              } else {
                const kg = oldUnit === 'Ton (MT)' ? tonToKg(val) : val;
                const result = kgToPieces(kg, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
                converted = result.pieces;
              }
              updates.minStockLevel = converted.toString();
            }
          }

          setFormData((prev) => ({ ...prev, ...updates }));
          setErrors((prev) => {
            const next = { ...prev };
            delete next.initialQuantity;
            delete next.minStockLevel;
            return next;
          });
          return;
        }
      }

      updateField('unit', newUnit);
    },
    [
      formData.unit,
      formData.initialQuantity,
      formData.minStockLevel,
      isWeightBased,
      weightConfig,
      updateField,
    ]
  );

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
    // Category is now optional, so we don't strictly require it
    // if (!formData.categoryId) {
    //   newErrors.categoryId = 'Category is required';
    // }

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
      } else if (!isWeightBased && isDiscreteUnit(formData.unit) && !Number.isInteger(quantity)) {
        newErrors.initialQuantity = `${formData.unit} must be a whole number`;
      } else if (
        isWeightBased &&
        weightConfig &&
        isWeightUnit(formData.unit)
      ) {
        const kgValue = formData.unit === 'Ton (MT)' ? tonToKg(quantity) : quantity;
        const result = kgToPieces(kgValue, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
        if (!result.isExact) {
          newErrors.initialQuantity = getConversionErrorMessage(
            kgValue,
            weightConfig.weightPerMeter,
            weightConfig.lengthPerPiece
          );
        }
      }
    }

    // Min stock level validation
    const minStock = parseFloat(formData.minStockLevel);
    if (!formData.minStockLevel.trim()) {
      newErrors.minStockLevel = 'Minimum stock level is required';
    } else if (isNaN(minStock)) {
      newErrors.minStockLevel = 'Must be a valid number';
    } else if (minStock < 0) {
      newErrors.minStockLevel = 'Minimum stock level cannot be negative';
    } else if (!isWeightBased && isDiscreteUnit(formData.unit) && !Number.isInteger(minStock)) {
      newErrors.minStockLevel = `${formData.unit} must be a whole number`;
    } else if (mode === 'create') {
      const initialQty = parseFloat(formData.initialQuantity);
      if (!isNaN(initialQty) && minStock > initialQty) {
        newErrors.minStockLevel = 'Minimum stock level cannot exceed initial quantity';
      }
    } else if (mode === 'edit' && initialData) {
      const centralStockPieces = Number(initialData.centralStoreQuantity ?? initialData.totalQuantity ?? 0);
      let centralQtyDisplay: number;
      if (isWeightBased && weightConfig && isWeightUnit(formData.unit)) {
        const kg = piecesToKg(centralStockPieces, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
        centralQtyDisplay = formData.unit === 'Ton (MT)' ? kg / TON_TO_KG : kg;
      } else {
        centralQtyDisplay = centralStockPieces;
      }
      if (!isNaN(centralQtyDisplay) && minStock > centralQtyDisplay) {
        newErrors.minStockLevel = 'Minimum stock level cannot exceed current central store quantity';
      }
    } else if (
      isWeightBased &&
      weightConfig &&
      isWeightUnit(formData.unit)
    ) {
      const kgValue = formData.unit === 'Ton (MT)' ? tonToKg(minStock) : minStock;
      const result = kgToPieces(kgValue, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
      if (!result.isExact) {
        newErrors.minStockLevel = getConversionErrorMessage(
          kgValue,
          weightConfig.weightPerMeter,
          weightConfig.lengthPerPiece
        );
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode, isWeightBased, weightConfig, initialData]);

  /**
   * Check if form is valid (no weight conversion errors)
   */
  const isFormValid = useMemo((): boolean => {
    const hasErrors = Boolean(errors.initialQuantity || errors.minStockLevel);
    if (hasErrors) return false;

    if (mode === 'create') {
      return Boolean(
        formData.name.trim() &&
        formData.sku.trim() &&
        // formData.categoryId && // Category is now optional
        formData.unit.trim() &&
        formData.initialQuantity.trim() &&
        formData.minStockLevel.trim()
      );
    }

    return Boolean(
      formData.name.trim() &&
      formData.sku.trim() &&
      // formData.categoryId && // Category is now optional
      formData.unit.trim() &&
      formData.minStockLevel.trim()
    );
  }, [formData, mode, errors.initialQuantity, errors.minStockLevel]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    const categoryId = normalizeCategoryId(formData.categoryId);
    // Category is now optional, so no validation needed
    // if (!categoryId) {
    //   setErrors((e) => ({ ...e, categoryId: 'Category is required' }));
    //   return;
    // }

    // Resolve weight config (from steel master when selected)
    let weightPerMeter: number | undefined;
    let lengthPerPiece: number | undefined;
    let steelMasterId: string | undefined;
    if (selectedSteelMaster) {
      weightPerMeter = selectedSteelMaster.weightPerMeter;
      lengthPerPiece = selectedSteelMaster.defaultLength;
      steelMasterId = selectedSteelMaster.id;
    } else if (mode === 'edit' && initialData?.weightPerMeter != null && initialData?.lengthPerPiece != null) {
      weightPerMeter = initialData.weightPerMeter;
      lengthPerPiece = initialData.lengthPerPiece;
    }

    // Convert Kg/Ton to pieces for backend (inventory stored as pieces)
    let initialQuantityPieces = mode === 'create' ? parseFloat(formData.initialQuantity) : 0;
    let minStockLevelPieces = parseFloat(formData.minStockLevel);
    if (
      weightPerMeter != null &&
      lengthPerPiece != null &&
      isWeightUnit(formData.unit)
    ) {
      if (mode === 'create') {
        const kgInitial = formData.unit === 'Ton (MT)' ? tonToKg(initialQuantityPieces) : initialQuantityPieces;
        const resultInitial = kgToPieces(kgInitial, weightPerMeter, lengthPerPiece);
        initialQuantityPieces = Math.round(resultInitial.pieces);
      }
      const kgMin = formData.unit === 'Ton (MT)' ? tonToKg(minStockLevelPieces) : minStockLevelPieces;
      const resultMin = kgToPieces(kgMin, weightPerMeter, lengthPerPiece);
      minStockLevelPieces = Math.round(resultMin.pieces);
    }

    if (mode === 'create') {
      const createData: CreateItemData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || undefined,
        categoryId,
        type: formData.type,
        unit: formData.unit.trim(),
        minStockLevel: minStockLevelPieces,
        initialQuantity: initialQuantityPieces,
        weightPerMeter,
        lengthPerPiece,
        steelMasterId,
        steelMasterName: selectedSteelMaster?.name,
      };
      onSubmit(createData, formData.imageUri);
    } else {
      const updateData: UpdateItemData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || undefined,
        categoryId,
        unit: formData.unit.trim(),
        minStockLevel: minStockLevelPieces,
        status: formData.status,
        weightPerMeter,
        lengthPerPiece,
      };
      onSubmit(updateData, formData.imageUri);
    }
  }, [formData, mode, onSubmit, validateForm, selectedSteelMaster, initialData]);

  return (
    <ScrollView
      className="flex-1 bg-[#F8FAFC]"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-4 px-4 py-4">
        {/* Item Type - Only show in create mode (not editable in edit) */}
        {mode === 'create' && (
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Item Type <Text className="text-[#DC2626]">*</Text></Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`flex-1 border rounded-lg h-12 items-center justify-center ${
                  formData.type === 'consumable'
                    ? 'bg-[#1E40AF] border-[#1E40AF]'
                    : 'bg-white border-[#E2E8F0]'
                }`}
                onPress={() => updateField('type', 'consumable')}
                activeOpacity={0.7}
                disabled={loading}
                accessibilityLabel="Consumable item type"
                accessibilityRole="radio"
                accessibilityState={{ checked: formData.type === 'consumable' }}
              >
                <Text
                  className={`text-[14px] font-semibold ${
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
                }`}
                onPress={() => updateField('type', 'non_consumable')}
                activeOpacity={0.7}
                disabled={loading}
                accessibilityLabel="Non-consumable item type"
                accessibilityRole="radio"
                accessibilityState={{ checked: formData.type === 'non_consumable' }}
              >
                <Text
                  className={`text-[14px] font-semibold ${
                    formData.type === 'non_consumable' ? 'text-white' : 'text-[#0F172A]'
                  }`}
                >
                  Non-Consum.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 border rounded-lg h-12 items-center justify-center ${
                  formData.type === 'fuel'
                    ? 'bg-[#1E40AF] border-[#1E40AF]'
                    : 'bg-white border-[#E2E8F0]'
                }`}
                onPress={() => {
                  updateField('type', 'fuel');
                  updateField('unit', 'Liters');
                  setSelectedSteelMaster(null);
                  setAutoGeneratedSku('');
                }}
                activeOpacity={0.7}
                disabled={loading}
                accessibilityLabel="Fuel item type"
                accessibilityRole="radio"
                accessibilityState={{ checked: formData.type === 'fuel' }}
              >
                <Text
                  className={`text-[14px] font-semibold ${
                    formData.type === 'fuel' ? 'text-white' : 'text-[#0F172A]'
                  }`}
                >
                  Fuel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Custom Item Selector - Only show in create mode, hide for Fuel type */}
        {mode === 'create' && formData.type !== 'fuel' && (
          <View className="border-2 border-dashed border-[#1E40AF] rounded-[10px] bg-[#1E40AF]/5 p-4">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-2">
              Create from Custom Item (Optional)
            </Text>
            <Text className="text-[13px] text-[#64748B] mb-3">
              Select a custom item to auto-fill item details
            </Text>
            
            
            <SteelMasterSelector
              steelMasters={steelMasters}
              selectedSteelMaster={selectedSteelMaster}
              onSelect={handleSteelMasterSelect}
              label=""
              disabled={loading}
              onManagePress={onManageSteelMaster}
            />
            {selectedSteelMaster && (
              <View className="mt-3 bg-white rounded-[10px] p-3 border border-[#E2E8F0]">
                <Text className="text-[13px] text-[#64748B] mb-1">Selected Custom Item:</Text>
                <Text className="text-[15px] font-medium text-[#0F172A]">
                  {selectedSteelMaster.name}
                </Text>
                <View className="flex-row flex-wrap gap-4 mt-2">
                  <Text className="text-[13px] text-[#64748B]">
                    Weight: {selectedSteelMaster.weightPerMeter} kg/m
                  </Text>
                  <Text className="text-[13px] text-[#64748B]">
                    Length: {selectedSteelMaster.defaultLength}m
                  </Text>
                  <Text className="text-[13px] text-[#64748B]">
                    SKU: {selectedSteelMaster.hsnCode}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Item Name - Only show in create mode (not editable in edit) */}
        {mode === 'create' && (
          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] text-[#0F172A]">Item Name <Text className="text-[#DC2626]">*</Text></Text>
              {isFromSteelMaster && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="flash" size={14} color="#16A34A" />
                  <Text className="text-[12px] text-[#16A34A]">Auto-filled</Text>
                </View>
              )}
            </View>
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
            />
            {isFromSteelMaster && selectedSteelMaster && (
              <Text className="text-[13px] text-[#64748B]">
                From: {selectedSteelMaster.name}
              </Text>
            )}
            {errors.name && (
              <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                {errors.name}
              </Text>
            )}
          </View>
        )}

        {/* SKU - Only show in create mode (not editable in edit) */}
        {mode === 'create' && (
          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] text-[#0F172A]">SKU <Text className="text-[#DC2626]">*</Text></Text>
              {isFromSteelMaster && autoGeneratedSku && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="flash" size={14} color="#16A34A" />
                  <Text className="text-[12px] text-[#16A34A]">
                    Auto-filled
                  </Text>
                </View>
              )}
            </View>
            <TextInput
              className={`border rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A] ${
                errors.sku ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
              }`}
              placeholderTextColor="#94A3B8"
              placeholder="Enter SKU code"
              value={formData.sku}
              onChangeText={(text) => updateField('sku', text)}
              editable={!loading}
              accessibilityLabel="SKU input"
            />
            {isFromSteelMaster && autoGeneratedSku && selectedSteelMaster && (
              <Text className="text-[13px] text-[#64748B]">
                From Custom Item: {selectedSteelMaster.name} (editable)
              </Text>
            )}
            {errors.sku && (
              <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                {errors.sku}
              </Text>
            )}
          </View>
        )}

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
          />
        </View>

        {/* Category - Only show in create mode (not editable in edit) */}
        {mode === 'create' &&
          (onSelectCategoryPress ? (
            <View className="gap-1.5">
              <Text className="text-[15px] text-[#0F172A]" accessibilityRole="text">
                Category
              </Text>
              <TouchableOpacity
                className={`border rounded-lg h-12 px-4 bg-white flex-row items-center justify-between min-h-[48px] ${
                  errors.categoryId ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
                } ${loading ? 'opacity-60' : ''}`}
                onPress={() => !loading && onSelectCategoryPress(formData.categoryId)}
                activeOpacity={0.7}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={`Select category. Current: ${
                  formData.categoryId
                    ? categories.find((c) => c.id === formData.categoryId)?.name ?? 'Unknown'
                    : 'Select Category'
                }`}
              >
                <Text
                  className={`text-[15px] ${
                    formData.categoryId ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                  }`}
                >
                  {formData.categoryId
                    ? categories.find((c) => c.id === formData.categoryId)?.name ?? 'Unknown'
                    : 'Select Category'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </TouchableOpacity>
              {errors.categoryId && (
                <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                  {errors.categoryId}
                </Text>
              )}
            </View>
          ) : (
            <View className="gap-1.5">
              <CategorySelector
                selectedCategoryId={formData.categoryId}
                onSelect={(categoryId) => updateField('categoryId', categoryId)}
                error={errors.categoryId}
                disabled={loading}
              />
            </View>
          ))}

        {/* Unit of Measurement - Only show in create mode (not editable in edit) */}
        {mode === 'create' && (
          <View className="gap-1.5">
            <UnitSelector
              selectedUnit={formData.unit}
              onSelect={handleUnitChange}
              error={errors.unit}
              disabled={loading || formData.type === 'fuel'}
              autoFilled={isFromSteelMaster || formData.type === 'fuel'}
              autoFilledFrom={formData.type === 'fuel' ? 'Fuel type' : 'Custom Item default'}
              steelMasterItem={isFromSteelMaster}
            />
          </View>
        )}

        {/* Initial Quantity (Create mode only) */}
        {mode === 'create' && (
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Initial Quantity <Text className="text-[#DC2626]">*</Text></Text>
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
          <Text className="text-[15px] text-[#0F172A]">Minimum Stock Level <Text className="text-[#DC2626]">*</Text></Text>
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
          />
          {errors.minStockLevel && (
            <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
              {errors.minStockLevel}
            </Text>
          )}
        </View>

        {/* Status */}
        <View className="gap-1.5">
          <Text className="text-[15px] text-[#0F172A]">Status <Text className="text-[#DC2626]">*</Text></Text>
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
                    className={`flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 ${
                      imageLoading ? 'opacity-70' : ''
                    }`}
                    onPress={handleImagePick}
                    activeOpacity={0.7}
                    disabled={loading || imageLoading}
                    accessibilityLabel={imageLoading ? 'Changing image, please wait' : 'Change image'}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: loading || imageLoading, busy: imageLoading }}
                  >
                    {imageLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#1E40AF" />
                        <Text className="text-[15px] font-semibold text-[#1E40AF]">Please wait…</Text>
                      </>
                    ) : (
                      <Text className="text-[15px] font-semibold text-[#1E40AF]">
                        Change Image
                      </Text>
                    )}
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
        <View className="flex-row gap-3 pt-6 pb-8">
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
            className={`flex-1 rounded-[10px] h-[50px] items-center justify-center flex-row gap-2 ${
              !isFormValid || loading ? 'bg-[#94A3B8]' : 'bg-[#1E40AF]'
            }`}
            onPress={handleSubmit}
            activeOpacity={0.7}
            disabled={!isFormValid || loading}
            accessibilityLabel={loading ? 'Saving, please wait' : mode === 'create' ? 'Submit new item' : 'Save changes'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isFormValid || loading, busy: loading }}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
              </>
            ) : (
              <Text className="text-[15px] font-semibold text-white">
                {mode === 'create' ? 'Submit' : 'Save Changes'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
