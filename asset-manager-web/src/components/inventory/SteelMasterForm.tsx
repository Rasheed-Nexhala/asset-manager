import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { generateSkuFromHsn } from '../../utils/skuGenerationUtils';
import type { SteelMaster, CreateSteelMasterData, UpdateSteelMasterData } from '../../types/steelMaster';

export interface SteelMasterFormProps {
  mode: 'create' | 'edit';
  initialData?: SteelMaster | null;
  onSubmit: (data: CreateSteelMasterData | UpdateSteelMasterData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function SteelMasterForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  error = null,
}: SteelMasterFormProps) {
  const [name, setName] = useState('');
  const [weightPerMeter, setWeightPerMeter] = useState('');
  const [defaultLength, setDefaultLength] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setName(initialData.name);
      setWeightPerMeter(initialData.weightPerMeter.toString());
      setDefaultLength(initialData.defaultLength.toString());
      setHsnCode(initialData.hsnCode || '');
    } else {
      setName('');
      setWeightPerMeter('');
      setDefaultLength('');
      setHsnCode('');
    }
    setErrors({});
  }, [mode, initialData]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Item name is required';
    const wpm = parseFloat(weightPerMeter);
    if (!weightPerMeter.trim() || isNaN(wpm) || wpm <= 0) {
      newErrors.weightPerMeter = 'Weight per meter must be a positive number';
    }
    const defLen = parseFloat(defaultLength);
    if (!defaultLength.trim() || isNaN(defLen) || defLen <= 0) {
      newErrors.defaultLength = 'Default length is required';
    }
    if (!hsnCode.trim()) newErrors.hsnCode = 'HSN Code / SKU is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, weightPerMeter, defaultLength, hsnCode]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    const wpm = parseFloat(weightPerMeter);
    const defLen = parseFloat(defaultLength);
    if (mode === 'create') {
      await onSubmit({ name: name.trim(), weightPerMeter: wpm, defaultLength: defLen, hsnCode: hsnCode.trim() });
    } else if (initialData) {
      await onSubmit({ name: name.trim(), weightPerMeter: wpm, defaultLength: defLen, hsnCode: hsnCode.trim() });
    }
  }, [mode, initialData, name, weightPerMeter, defaultLength, hsnCode, validate, onSubmit]);

  const handleGenerateSku = useCallback(async () => {
    const trimmed = hsnCode.trim();
    if (!trimmed) {
      setErrors((e) => ({ ...e, hsnCode: 'Enter HSN code first to generate SKU' }));
      return;
    }
    setIsGeneratingSku(true);
    setErrors((e) => ({ ...e, hsnCode: '' }));
    try {
      const generated = await generateSkuFromHsn(trimmed);
      setHsnCode(generated);
    } catch (err) {
      setErrors((e) => ({
        ...e,
        hsnCode: err instanceof Error ? err.message : 'Failed to generate SKU',
      }));
    } finally {
      setIsGeneratingSku(false);
    }
  }, [hsnCode]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {error && (
        <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3 flex items-center gap-2">
          <Icon name="exclamation-circle" className="w-5 h-5 text-red-600" />
          <p className="text-[15px] text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Item Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.name ? 'border-red-600' : 'border-slate-200'}`}
          placeholder="e.g. TMT 12mm"
        />
        {errors.name && <p className="text-[13px] text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Weight per meter (kg/m) *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={weightPerMeter}
          onChange={(e) => setWeightPerMeter(e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.weightPerMeter ? 'border-red-600' : 'border-slate-200'}`}
          placeholder="e.g. 0.89"
        />
        {errors.weightPerMeter && <p className="text-[13px] text-red-600 mt-1">{errors.weightPerMeter}</p>}
      </div>

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">Default length (m) *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={defaultLength}
          onChange={(e) => setDefaultLength(e.target.value)}
          className={`w-full border rounded-lg h-12 px-4 ${errors.defaultLength ? 'border-red-600' : 'border-slate-200'}`}
          placeholder="e.g. 12"
        />
        {errors.defaultLength && <p className="text-[13px] text-red-600 mt-1">{errors.defaultLength}</p>}
      </div>

      <div>
        <label className="block text-[15px] text-slate-900 mb-1.5">SKU (HSN Code) *</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={hsnCode}
            onChange={(e) => setHsnCode(e.target.value)}
            className={`flex-1 border rounded-lg h-12 px-4 ${errors.hsnCode ? 'border-red-600' : 'border-slate-200'}`}
            placeholder="e.g. 7214 or 721699"
          />
          {mode === 'create' && (
            <button
              type="button"
              onClick={handleGenerateSku}
              disabled={loading || isGeneratingSku || !hsnCode.trim()}
              className="px-4 border border-blue-800 rounded-lg h-12 text-blue-800 font-semibold text-[13px] whitespace-nowrap hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Generate unique SKU from HSN"
            >
              {isGeneratingSku ? '...' : 'Generate'}
            </button>
          )}
        </div>
        {errors.hsnCode && <p className="text-[13px] text-red-600 mt-1">{errors.hsnCode}</p>}
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
          disabled={loading}
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
