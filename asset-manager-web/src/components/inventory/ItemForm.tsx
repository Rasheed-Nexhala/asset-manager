import { useState, useCallback } from 'react';
import { Icon } from '../shared/Icon';
import { CategoryPicker } from './CategoryPicker';
import { COMMON_UNITS } from '../../utils/unitUtils';
import type { Item, CreateItemData, UpdateItemData, ItemType } from '../../types/inventory';

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
  const [name, setName] = useState(initialData?.name ?? '');
  const [sku, setSku] = useState(initialData?.sku ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initialData?.categoryId ?? null);
  const [type, setType] = useState<ItemType>(initialData?.type ?? 'consumable');
  const [unit, setUnit] = useState(initialData?.unit ?? 'Pcs');
  const [minStockLevel, setMinStockLevel] = useState(
    initialData?.minStockLevel?.toString() ?? '0'
  );
  const [initialQuantity, setInitialQuantity] = useState('');
  const [status, setStatus] = useState<'active' | 'discontinued'>(
    (initialData?.status as 'active' | 'discontinued') ?? 'active'
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!name.trim()) newErrors.name = 'Item name is required';
    if (!sku.trim()) newErrors.sku = 'SKU is required';
    const min = parseFloat(minStockLevel);
    if (isNaN(min) || min < 0) newErrors.minStockLevel = 'Minimum stock must be 0 or greater';
    if (mode === 'create') {
      const qty = parseFloat(initialQuantity);
      if (isNaN(qty) || qty < 0) newErrors.initialQuantity = 'Initial quantity must be 0 or greater';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, sku, minStockLevel, initialQuantity, mode]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    if (mode === 'create') {
      const data: CreateItemData = {
        name: name.trim(),
        sku: sku.trim(),
        description: description.trim() || undefined,
        categoryId,
        type,
        unit,
        minStockLevel: parseFloat(minStockLevel) || 0,
        initialQuantity: parseFloat(initialQuantity) || 0,
      };
      onSubmit(data, imageFile ?? undefined);
    } else {
      const data: UpdateItemData = {
        name: name.trim(),
        sku: sku.trim(),
        description: description.trim() || undefined,
        categoryId,
        type,
        unit,
        minStockLevel: parseFloat(minStockLevel) || 0,
        status,
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
    unit,
    minStockLevel,
    initialQuantity,
    status,
    imageFile,
    validate,
    onSubmit,
  ]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Item Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.name ? 'border-red-600' : 'border-slate-200'}`}
          placeholder="Enter item name"
        />
        {errors.name && <p className="text-[13px] text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">SKU *</label>
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.sku ? 'border-red-600' : 'border-slate-200'}`}
          placeholder="e.g. ITM-001"
        />
        {errors.sku && <p className="text-[13px] text-red-600 mt-1">{errors.sku}</p>}
      </div>

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
        <label className="block text-[15px] text-slate-900 mb-1.5">Category</label>
        <CategoryPicker value={categoryId} onChange={setCategoryId} />
      </div>

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ItemType)}
          className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-white"
        >
          <option value="consumable">Consumable</option>
          <option value="non_consumable">Non-Consumable</option>
          <option value="fuel">Fuel</option>
        </select>
      </div>

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Unit</label>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-white"
        >
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Minimum Stock Level *</label>
        <input
          type="number"
          min="0"
          value={minStockLevel}
          onChange={(e) => setMinStockLevel(e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.minStockLevel ? 'border-red-600' : 'border-slate-200'}`}
        />
        {errors.minStockLevel && <p className="text-[13px] text-red-600 mt-1">{errors.minStockLevel}</p>}
      </div>

      {mode === 'create' && (
        <div>
          <label className="block text-[15px] text-slate-900 mb-1.5">Initial Quantity *</label>
          <input
            type="number"
            min="0"
            value={initialQuantity}
            onChange={(e) => setInitialQuantity(e.target.value)}
            className={`w-full border rounded-lg h-12 px-4 ${errors.initialQuantity ? 'border-red-600' : 'border-slate-200'}`}
            placeholder="0"
          />
          {errors.initialQuantity && <p className="text-[13px] text-red-600 mt-1">{errors.initialQuantity}</p>}
        </div>
      )}

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

      {onManageSteelMaster && (
        <button
          type="button"
          onClick={onManageSteelMaster}
          className="text-blue-800 font-semibold text-[15px]"
        >
          Manage Custom Items (Steel Master)
        </button>
      )}

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
          disabled={loading}
          className="flex-1 bg-blue-800 rounded-[10px] h-[50px] font-semibold text-white disabled:opacity-70"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
        </button>
      </div>
    </div>
  );
}
