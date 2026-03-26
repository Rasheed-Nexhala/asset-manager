import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchSteelMasters } from '../../store/thunks/steelMasterThunks';
import { selectActiveSteelMasters } from '../../store/selectors/steelMasterSelectors';
import { CategoryPicker } from './CategoryPicker';
import { SteelMasterSelector } from './SteelMasterSelector';
import { COMMON_UNITS, STEEL_MASTER_UNITS, isDiscreteUnit } from '../../utils/unitUtils';
import {
  kgToPieces,
  piecesToKg,
  tonToKg,
  getConversionErrorMessage,
  TON_TO_KG,
} from '../../utils/weightConversionUtils';
import type { Item, CreateItemData, UpdateItemData, ItemType } from '../../types/inventory';
import { normalizeCategoryId } from '../../types/inventory';
import type { SteelMaster } from '../../types/steelMaster';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { Icon } from '../shared/Icon';

/** Check if unit is weight-based (Kg or Ton) */
const isWeightUnit = (u: string): boolean => u === 'Kg' || u === 'Ton (MT)';

export interface ItemFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Item>;
  onSubmit: (data: CreateItemData | UpdateItemData, imageFile?: File) => void;
  onCancel: () => void;
  loading?: boolean;
  onManageSteelMaster?: () => void;
}

export function ItemForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  onManageSteelMaster,
}: ItemFormProps) {
  const dispatch = useAppDispatch();
  const steelMasters = useAppSelector(selectActiveSteelMasters);

  const [name, setName] = useState(initialData?.name ?? '');
  const [sku, setSku] = useState(initialData?.sku ?? '');
  const [selectedSteelMaster, setSelectedSteelMaster] = useState<SteelMaster | null>(null);
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initialData?.categoryId ?? null);
  const [type, setType] = useState<ItemType>(initialData?.type ?? 'consumable');
  const [unit, setUnit] = useState(initialData?.unit ?? 'Pcs');
  const [standardUnitPrice, setStandardUnitPrice] = useState(
    initialData?.standardUnitPrice != null ? String(initialData.standardUnitPrice) : ''
  );
  const [standardGstPercentage, setStandardGstPercentage] = useState(
    initialData?.standardGstPercentage != null ? String(initialData.standardGstPercentage) : ''
  );
  const [initialQuantity, setInitialQuantity] = useState('');
  const [status, setStatus] = useState<'active' | 'discontinued'>(
    (initialData?.status as 'active' | 'discontinued') ?? 'active'
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  /** Weight config for steel items - from steel master or existing item data */
  const weightConfig = useMemo(() => {
    if (type === 'fuel') return null;
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
  }, [type, selectedSteelMaster, mode, initialData?.weightPerMeter, initialData?.lengthPerPiece]);

  const isWeightBased = weightConfig !== null;

  /** Backend blocks type changes when stock exists away from central (sites or maintenance). */
  const typeChangeLocked = useMemo(
    () =>
      mode === 'edit' &&
      ((initialData?.atSitesQuantity ?? 0) > 0 || (initialData?.inMaintenanceQuantity ?? 0) > 0),
    [mode, initialData?.atSitesQuantity, initialData?.inMaintenanceQuantity]
  );

  const [minStockLevel, setMinStockLevel] = useState(
    () => initialMinStockLevelDisplay || initialData?.minStockLevel?.toString() || '0'
  );

  // Sync minStockLevel when initialMinStockLevelDisplay changes (e.g. edit mode load)
  useEffect(() => {
    if (mode === 'edit' && initialMinStockLevelDisplay) {
      setMinStockLevel(initialMinStockLevelDisplay);
    }
  }, [mode, initialMinStockLevelDisplay]);

  // When type is Fuel, unit is fixed to Liters and custom item selection is cleared
  useEffect(() => {
    if (type === 'fuel') {
      setUnit('Liters');
      setSelectedSteelMaster(null);
    }
  }, [type]);

  // Load steel masters on mount (for custom item selector)
  useEffect(() => {
    if (steelMasters.length === 0) {
      dispatch(fetchSteelMasters(true));
    }
  }, [dispatch, steelMasters.length]);

  // Pre-fill selected custom item when editing
  useEffect(() => {
    if (mode !== 'edit' || !initialData?.steelMasterId) return;
    const sm = steelMasters.find((m) => m.id === initialData.steelMasterId);
    if (sm) setSelectedSteelMaster(sm);
  }, [mode, initialData?.steelMasterId, steelMasters]);

  /** Update form field and clear its error */
  const updateField = useCallback(
    (field: string, value: string | number | null) => {
      if (field === 'name') setName(value as string);
      else if (field === 'sku') setSku(value as string);
      else if (field === 'description') setDescription(value as string);
      else if (field === 'categoryId') setCategoryId(value as string | null);
      else if (field === 'type') setType(value as ItemType);
      else if (field === 'unit') setUnit(value as string);
      else if (field === 'minStockLevel') setMinStockLevel(String(value ?? ''));
      else if (field === 'initialQuantity') setInitialQuantity(String(value ?? ''));
      else if (field === 'standardUnitPrice') setStandardUnitPrice(String(value ?? ''));
      else if (field === 'standardGstPercentage') setStandardGstPercentage(String(value ?? ''));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  /** Live validation for weight-based Kg/Ton conversion */
  useEffect(() => {
    if (!isWeightBased || !weightConfig || !isWeightUnit(unit)) return;

    const newErrors: Record<string, string> = {};

    if (mode === 'create' && initialQuantity.trim()) {
      const quantity = parseFloat(initialQuantity);
      if (!isNaN(quantity) && quantity > 0) {
        const kgValue = unit === 'Ton (MT)' ? tonToKg(quantity) : quantity;
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

    if (minStockLevel.trim()) {
      const minStock = parseFloat(minStockLevel);
      if (!isNaN(minStock) && minStock > 0) {
        const kgValue = unit === 'Ton (MT)' ? tonToKg(minStock) : minStock;
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
  }, [initialQuantity, minStockLevel, unit, isWeightBased, weightConfig, mode]);

  /** Live validation: min stock level cannot exceed initial/total quantity */
  useEffect(() => {
    if (!minStockLevel.trim()) return;

    const minStock = parseFloat(minStockLevel);
    if (isNaN(minStock)) return;

    let newError: string | undefined;
    if (mode === 'create' && initialQuantity.trim()) {
      const initialQty = parseFloat(initialQuantity);
      if (!isNaN(initialQty) && minStock > initialQty) {
        newError = 'Minimum stock level cannot exceed initial quantity';
      }
    } else if (mode === 'edit' && initialData) {
      const centralStockPieces = Number(initialData.centralStoreQuantity ?? initialData.totalQuantity ?? 0);
      let centralQtyDisplay: number;
      if (isWeightBased && weightConfig && isWeightUnit(unit)) {
        const kg = piecesToKg(centralStockPieces, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
        centralQtyDisplay = unit === 'Ton (MT)' ? kg / TON_TO_KG : kg;
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
    initialQuantity,
    minStockLevel,
    unit,
    mode,
    initialData?.centralStoreQuantity,
    initialData?.totalQuantity,
    isWeightBased,
    weightConfig,
  ]);

  /** When a custom item is selected, auto-fill name, SKU, unit (matches RN behavior) */
  const handleSteelMasterSelect = useCallback(
    (master: SteelMaster | null) => {
      setSelectedSteelMaster(master);
      if (!master) {
        if (mode === 'create') {
          setName('');
          setSku('');
          setUnit('Pcs');
        }
        return;
      }
      setName(master.name);
      setSku(master.hsnCode || '');
      setUnit('Pcs');
    },
    [mode]
  );

  /** Handle unit change with auto-conversion when switching between Pcs and Kg/Ton */
  const handleUnitChange = useCallback(
    (newUnit: string) => {
      const oldUnit = unit;

      if (isWeightBased && weightConfig) {
        const wasWeightUnit = isWeightUnit(oldUnit);
        const isNowWeightUnit = isWeightUnit(newUnit);

        if (wasWeightUnit !== isNowWeightUnit) {
          const updates: { initialQuantity?: string; minStockLevel?: string } = {};

          if (initialQuantity) {
            const val = parseFloat(initialQuantity);
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

          if (minStockLevel) {
            const val = parseFloat(minStockLevel);
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

          if (updates.initialQuantity !== undefined) setInitialQuantity(updates.initialQuantity);
          if (updates.minStockLevel !== undefined) setMinStockLevel(updates.minStockLevel);
          setUnit(newUnit);
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
    [unit, initialQuantity, minStockLevel, isWeightBased, weightConfig, updateField]
  );

  const effectiveUnit = type === 'fuel' ? 'Liters' : unit;

  /** Unit options: restrict to Pcs/Kg/Ton when custom item selected (weight-based) */
  const unitOptions = selectedSteelMaster ? [...STEEL_MASTER_UNITS] : [...COMMON_UNITS];

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === 'create' || mode === 'edit') {
      if (!name.trim()) newErrors.name = 'Item name is required';
      if (!sku.trim()) newErrors.sku = 'SKU is required';
    }

    if (!effectiveUnit.trim()) {
      newErrors.unit = 'Unit of measurement is required';
    }

    // Initial quantity validation (create mode only)
    if (mode === 'create') {
      const quantity = parseFloat(initialQuantity);
      if (!initialQuantity.trim()) {
        newErrors.initialQuantity = 'Initial quantity is required';
      } else if (isNaN(quantity) || quantity < 0) {
        newErrors.initialQuantity = 'Must be a valid number (0 or greater)';
      } else if (!isWeightBased && isDiscreteUnit(effectiveUnit) && !Number.isInteger(quantity)) {
        newErrors.initialQuantity = `${effectiveUnit} must be a whole number`;
      } else if (isWeightBased && weightConfig && isWeightUnit(effectiveUnit)) {
        const kgValue = effectiveUnit === 'Ton (MT)' ? tonToKg(quantity) : quantity;
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
    const minStock = parseFloat(minStockLevel);
    if (!minStockLevel.trim()) {
      newErrors.minStockLevel = 'Minimum stock level is required';
    } else if (isNaN(minStock)) {
      newErrors.minStockLevel = 'Must be a valid number';
    } else if (minStock < 0) {
      newErrors.minStockLevel = 'Minimum stock level cannot be negative';
    } else if (!isWeightBased && isDiscreteUnit(effectiveUnit) && !Number.isInteger(minStock)) {
      newErrors.minStockLevel = `${effectiveUnit} must be a whole number`;
    } else if (mode === 'create') {
      const initialQty = parseFloat(initialQuantity);
      if (!isNaN(initialQty) && minStock > initialQty) {
        newErrors.minStockLevel = 'Minimum stock level cannot exceed initial quantity';
      }
    } else if (mode === 'edit' && initialData) {
      const centralStockPieces = Number(initialData.centralStoreQuantity ?? initialData.totalQuantity ?? 0);
      let centralQtyDisplay: number;
      if (isWeightBased && weightConfig && isWeightUnit(effectiveUnit)) {
        const kg = piecesToKg(centralStockPieces, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
        centralQtyDisplay = effectiveUnit === 'Ton (MT)' ? kg / TON_TO_KG : kg;
      } else {
        centralQtyDisplay = centralStockPieces;
      }
      if (!isNaN(centralQtyDisplay) && minStock > centralQtyDisplay) {
        newErrors.minStockLevel = 'Minimum stock level cannot exceed current central store quantity';
      }
    } else if (isWeightBased && weightConfig && isWeightUnit(effectiveUnit)) {
      const kgValue = effectiveUnit === 'Ton (MT)' ? tonToKg(minStock) : minStock;
      const result = kgToPieces(kgValue, weightConfig.weightPerMeter, weightConfig.lengthPerPiece);
      if (!result.isExact) {
        newErrors.minStockLevel = getConversionErrorMessage(
          kgValue,
          weightConfig.weightPerMeter,
          weightConfig.lengthPerPiece
        );
      }
    }

    if (standardUnitPrice.trim()) {
      const price = parseFloat(standardUnitPrice);
      if (isNaN(price) || price < 0) newErrors.standardUnitPrice = 'Must be 0 or greater';
    }
    if (standardGstPercentage.trim()) {
      const gst = parseFloat(standardGstPercentage);
      if (isNaN(gst) || gst < 0 || gst > 100) newErrors.standardGstPercentage = 'Must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    name,
    sku,
    type,
    minStockLevel,
    initialQuantity,
    mode,
    effectiveUnit,
    standardUnitPrice,
    standardGstPercentage,
    isWeightBased,
    weightConfig,
    initialData,
  ]);

  /** Check if form is valid (no weight conversion errors) */
  const isFormValid = useMemo((): boolean => {
    const hasErrors = Boolean(errors.initialQuantity || errors.minStockLevel);
    if (hasErrors) return false;

    if (mode === 'create') {
      return Boolean(
        name.trim() &&
          sku.trim() &&
          effectiveUnit.trim() &&
          initialQuantity.trim() &&
          minStockLevel.trim()
      );
    }

    return Boolean(
      name.trim() &&
        sku.trim() &&
        effectiveUnit.trim() &&
        minStockLevel.trim()
    );
  }, [name, sku, effectiveUnit, initialQuantity, minStockLevel, mode, errors.initialQuantity, errors.minStockLevel]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const categoryIdNorm = normalizeCategoryId(categoryId);

    // Resolve weight config (from steel master when selected, or from initialData when editing)
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
    let initialQuantityPieces = mode === 'create' ? parseFloat(initialQuantity) : 0;
    let minStockLevelPieces = parseFloat(minStockLevel);
    let unitToSend = effectiveUnit;
    if (weightPerMeter != null && lengthPerPiece != null && isWeightUnit(effectiveUnit)) {
      unitToSend = 'Pcs';
      if (mode === 'create') {
        const kgInitial = effectiveUnit === 'Ton (MT)' ? tonToKg(initialQuantityPieces) : initialQuantityPieces;
        const resultInitial = kgToPieces(kgInitial, weightPerMeter, lengthPerPiece);
        initialQuantityPieces = resultInitial.pieces;
      }
      const kgMin = effectiveUnit === 'Ton (MT)' ? tonToKg(minStockLevelPieces) : minStockLevelPieces;
      const resultMin = kgToPieces(kgMin, weightPerMeter, lengthPerPiece);
      minStockLevelPieces = resultMin.pieces;
    }

    const stdUnitPrice = standardUnitPrice.trim()
      ? parseFloat(standardUnitPrice)
      : undefined;
    const stdGstPct = standardGstPercentage.trim()
      ? parseFloat(standardGstPercentage)
      : undefined;

    if (mode === 'create') {
      const data: CreateItemData = {
        name: name.trim(),
        sku: sku.trim(),
        description: description.trim() || undefined,
        categoryId: categoryIdNorm,
        type,
        unit: unitToSend,
        minStockLevel: minStockLevelPieces,
        initialQuantity: initialQuantityPieces,
        weightPerMeter,
        lengthPerPiece,
        steelMasterId,
        steelMasterName: selectedSteelMaster?.name,
        standardUnitPrice: stdUnitPrice,
        standardGstPercentage: stdGstPct,
      };
      onSubmit(data, imageFile ?? undefined);
    } else {
      const data: UpdateItemData = {
        name: name.trim(),
        sku: sku.trim(),
        description: description.trim() || undefined,
        categoryId: categoryIdNorm,
        type,
        unit: type === 'fuel' ? 'Liters' : initialData?.unit ?? unitToSend,
        minStockLevel: minStockLevelPieces,
        status,
        ...(type === 'fuel'
          ? {}
          : {
              weightPerMeter,
              lengthPerPiece,
            }),
        standardUnitPrice: stdUnitPrice,
        standardGstPercentage: stdGstPct,
      };
      onSubmit(data, imageFile ?? undefined);
    }
  }, [
    mode,
    name,
    sku,
    description,
    categoryId,
    type,
    effectiveUnit,
    minStockLevel,
    initialQuantity,
    status,
    standardUnitPrice,
    standardGstPercentage,
    imageFile,
    selectedSteelMaster,
    initialData?.name,
    initialData?.sku,
    initialData?.categoryId,
    initialData?.type,
    initialData?.unit,
    initialData?.weightPerMeter,
    initialData?.lengthPerPiece,
    validate,
    onSubmit,
  ]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Custom Item Selector - create mode only, hide for Fuel type (matches RN) */}
      {mode === 'create' && type !== 'fuel' && (
        <div className="rounded-[10px] border-2 border-dashed border-blue-800 bg-blue-800/5 p-4">
          <p className="mb-2 text-[17px] font-semibold text-slate-900">
            Create from Custom Item (Optional)
          </p>
          <p className="mb-3 text-[13px] text-slate-500">
            Select a custom item to auto-fill item details
          </p>
          <SteelMasterSelector
            steelMasters={steelMasters}
            selectedSteelMaster={selectedSteelMaster}
            onSelect={handleSteelMasterSelect}
            label=""
            disabled={loading}
            onManagePress={onManageSteelMaster}
          />
          {selectedSteelMaster && (
            <div className="mt-3 rounded-[10px] border border-slate-200 bg-white p-3">
              <p className="mb-1 text-[13px] text-slate-500">Selected Custom Item:</p>
              <p className="text-[15px] font-medium text-slate-900">{selectedSteelMaster.name}</p>
              <div className="mt-2 flex flex-wrap gap-4">
                <span className="text-[13px] text-slate-500">
                  Weight: {selectedSteelMaster.weightPerMeter} kg/m
                </span>
                <span className="text-[13px] text-slate-500">
                  Length: {selectedSteelMaster.defaultLength}m
                </span>
                <span className="text-[13px] text-slate-500">
                  SKU: {selectedSteelMaster.hsnCode}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Name, SKU, category, type: create + edit. Unit: create only (changing unit with stock is phase 2). */}
      {(mode === 'create' || mode === 'edit') && (
        <>
          <div>
            <label htmlFor="item-name" className="block text-[15px] text-slate-900 mb-1.5">Item Name *</label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border rounded-lg h-12 px-4 ${errors.name ? 'border-red-600' : 'border-slate-200'}`}
              placeholder="Enter item name"
            />
            {errors.name && <p className="text-[13px] text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="item-sku" className="block text-[15px] text-slate-900 mb-1.5">SKU *</label>
            <input
              id="item-sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={`w-full border rounded-lg h-12 px-4 ${errors.sku ? 'border-red-600' : 'border-slate-200'}`}
              placeholder="e.g. ITM-001"
            />
            {errors.sku && <p className="text-[13px] text-red-600 mt-1">{errors.sku}</p>}
          </div>

          <div>
            <label className="block text-[15px] text-slate-900 mb-1.5">Category</label>
            <CategoryPicker value={categoryId} onChange={setCategoryId} />
          </div>

          <div>
            <label className="block text-[15px] text-slate-900 mb-1.5">Type</label>
            {typeChangeLocked && (
              <div
                className="mb-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900"
                role="status"
              >
                <Icon name="exclamation-triangle" className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <p>
                  Item type can’t be changed while stock exists at sites or in maintenance. Move all
                  stock back to the central store and clear maintenance for this item first.
                </p>
              </div>
            )}
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              disabled={loading || typeChangeLocked}
              aria-disabled={loading || typeChangeLocked}
              className={`w-full border rounded-lg h-12 px-4 bg-white border-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
            >
              <option value="consumable">Consumable</option>
              <option value="non_consumable">Non-Consumable</option>
              <option value="fuel">Fuel</option>
            </select>
          </div>
        </>
      )}

      {mode === 'create' && (
        <div>
          <label htmlFor="item-unit" className="block text-[15px] text-slate-900 mb-1.5">Unit</label>
          {type === 'fuel' ? (
            <div className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-slate-50 flex items-center text-slate-600">
              Liters
            </div>
          ) : (
            <>
              <select
                id="item-unit"
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value)}
                className={`w-full border rounded-lg h-12 px-4 bg-white ${errors.unit ? 'border-red-600' : 'border-slate-200'}`}
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {errors.unit && <p className="text-[13px] text-red-600 mt-1">{errors.unit}</p>}
            </>
          )}
        </div>
      )}

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-slate-200 rounded-lg p-4 min-h-[80px]"
          placeholder="Optional description"
        />
      </div>

      <div>
        <label htmlFor="min-stock-level" className="block text-[15px] text-slate-900 mb-1.5">Minimum Stock Level *</label>
        <input
          id="min-stock-level"
          type="number"
          min="0"
          value={minStockLevel}
          onChange={(e) => updateField('minStockLevel', e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.minStockLevel ? 'border-red-600' : 'border-slate-200'}`}
        />
        {errors.minStockLevel && <p className="text-[13px] text-red-600 mt-1">{errors.minStockLevel}</p>}
      </div>

      {mode === 'create' && (
        <div>
          <label htmlFor="initial-quantity" className="block text-[15px] text-slate-900 mb-1.5">Initial Quantity *</label>
          <input
            id="initial-quantity"
            type="number"
            min="0"
            value={initialQuantity}
            onChange={(e) => updateField('initialQuantity', e.target.value)}
            className={`w-full border rounded-lg h-12 px-4 ${errors.initialQuantity ? 'border-red-600' : 'border-slate-200'}`}
            placeholder="0"
          />
          {errors.initialQuantity && <p className="text-[13px] text-red-600 mt-1">{errors.initialQuantity}</p>}
        </div>
      )}

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Standard Unit Price (₹)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={standardUnitPrice}
          onChange={(e) => setStandardUnitPrice(e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.standardUnitPrice ? 'border-red-600' : 'border-slate-200'}`}
          placeholder="e.g. 150 (optional, used as default in POs)"
        />
        <p className="text-[13px] text-slate-500 mt-1">
          Default price when this item is added to a purchase order
        </p>
        {errors.standardUnitPrice && <p className="text-[13px] text-red-600 mt-1">{errors.standardUnitPrice}</p>}
      </div>

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Standard GST (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={standardGstPercentage}
          onChange={(e) => setStandardGstPercentage(e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.standardGstPercentage ? 'border-red-600' : 'border-slate-200'}`}
          placeholder="e.g. 18 (optional, used as default in POs)"
        />
        <p className="text-[13px] text-slate-500 mt-1">
          Default GST % when this item is added to a purchase order
        </p>
        {errors.standardGstPercentage && <p className="text-[13px] text-red-600 mt-1">{errors.standardGstPercentage}</p>}
      </div>

      {mode === 'edit' && (
        <div>
          <label className="block text-[15px] text-slate-900 mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'discontinued')}
            className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-white"
          >
            <option value="active">Active</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full border border-slate-200 rounded-lg p-2"
        />
        {imagePreview && (
          <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 border border-slate-200 rounded-[10px] h-[50px] font-semibold text-slate-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || loading}
          className="flex flex-1 items-center justify-center rounded-[10px] h-[50px] bg-blue-800 font-semibold text-white disabled:opacity-70"
        >
          {loading ? (
            <LoadingSpinner size="sm" className="!border-white/30 !border-t-white" />
          ) : (
            mode === 'create' ? 'Create' : 'Save'
          )}
        </button>
      </div>
    </div>
  );
}
