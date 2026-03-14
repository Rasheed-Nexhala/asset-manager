/**
 * Inventory Adjustment Modal
 * Supports Add, Reduce, and Enter (Set) stock modes for central store.
 * Replaces StockEntryModal for ItemDetailScreen when Admin or Store Incharge with access.
 */

import { useState, useCallback, useMemo } from 'react';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import {
  isWeightBasedItem,
  kgToPieces,
  piecesToKg,
  getConversionErrorMessage,
  tonToKg,
} from '../../utils/weightConversionUtils';
import type { Item, AdjustmentData, AdjustmentType } from '../../types/inventory';
import { getLocationId } from '../../utils/locationUtils';

const REASON_OPTIONS = [
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Return', label: 'Return' },
  { value: 'Correction', label: 'Correction' },
  { value: 'Other', label: 'Other' },
];

export interface InventoryAdjustmentModalProps {
  visible: boolean;
  mode: AdjustmentType;
  item: Item | null;
  onSubmit: (data: AdjustmentData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const MODE_LABELS: Record<AdjustmentType, string> = {
  add: 'Add Stock',
  remove: 'Reduce Stock',
  set: 'Enter Stock',
};

export function InventoryAdjustmentModal({
  visible,
  mode,
  item,
  onSubmit,
  onCancel,
  loading = false,
}: InventoryAdjustmentModalProps) {
  const [entryMode, setEntryMode] = useState<'kg' | 'ton' | 'pieces'>('pieces');
  const [amount, setAmount] = useState('');
  const [lengthPerPiece, setLengthPerPiece] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isWeightBased = item ? isWeightBasedItem(item) : false;
  const weightPerMeter = item?.weightPerMeter ?? 0;
  const defaultLength = item?.lengthPerPiece ?? 6;
  const effectiveLength = lengthPerPiece ? parseFloat(lengthPerPiece) : defaultLength;
  const currentQuantity = item?.centralStoreQuantity ?? item?.totalQuantity ?? 0;

  const conversionResult = useMemo(() => {
    if (!isWeightBased || !amount.trim()) return null;
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return null;
    if (mode === 'remove' && num === 0) return null;
    if (mode === 'add' && num <= 0) return null;
    if (entryMode === 'kg') {
      return kgToPieces(num, weightPerMeter, effectiveLength);
    }
    if (entryMode === 'ton') {
      const kg = tonToKg(num);
      return kgToPieces(kg, weightPerMeter, effectiveLength);
    }
    const kg = piecesToKg(num, weightPerMeter, effectiveLength);
    return {
      isExact: true,
      pieces: num,
      actualKg: kg,
      weightPerPiece: weightPerMeter * effectiveLength,
    };
  }, [isWeightBased, amount, entryMode, weightPerMeter, effectiveLength, mode]);

  const resetForm = useCallback(() => {
    setEntryMode('pieces');
    setAmount('');
    setLengthPerPiece('');
    setReason('');
    setNotes('');
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const num = parseFloat(amount);

    if (mode === 'add') {
      if (!amount.trim() || isNaN(num) || num <= 0) {
        newErrors.amount = 'Please enter a valid positive amount';
      }
    } else if (mode === 'remove') {
      if (!amount.trim() || isNaN(num) || num <= 0) {
        newErrors.amount = 'Please enter a valid positive amount to reduce';
      } else {
        const piecesToRemove =
          isWeightBased && (entryMode === 'kg' || entryMode === 'ton') && conversionResult
            ? conversionResult.pieces
            : num;
        if (piecesToRemove > currentQuantity) {
          newErrors.amount = `Cannot reduce more than current stock (${currentQuantity})`;
        }
      }
    } else {
      if (!amount.trim() || isNaN(num) || num < 0) {
        newErrors.amount = 'Please enter a valid target quantity (0 or more)';
      }
    }

    const isDiscreteUnit = (u: string) =>
      ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(u);

    if (!newErrors.amount) {
      if (entryMode === 'pieces' && isWeightBased && !Number.isInteger(num)) {
        newErrors.amount = 'Pieces must be a whole number. Decimals are not allowed.';
      } else if (item && !isWeightBased && isDiscreteUnit(item.unit) && !Number.isInteger(num)) {
        newErrors.amount = `${item.unit} must be a whole number. Decimals are not allowed.`;
      }
    }

    if (
      isWeightBased &&
      (entryMode === 'kg' || entryMode === 'ton') &&
      conversionResult &&
      !conversionResult.isExact
    ) {
      const weightInKg = entryMode === 'ton' ? tonToKg(num) : num;
      newErrors.amount = getConversionErrorMessage(
        weightInKg,
        weightPerMeter,
        effectiveLength
      );
    }

    if (!reason.trim()) newErrors.reason = 'Reason is required';
    if (!notes.trim()) newErrors.notes = 'Notes are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    amount,
    reason,
    notes,
    isWeightBased,
    entryMode,
    conversionResult,
    weightPerMeter,
    effectiveLength,
    mode,
    currentQuantity,
    item,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!item) return;
    if (!validate()) return;

    const num = parseFloat(amount);
    let quantity: number;
    if (isWeightBased && (entryMode === 'kg' || entryMode === 'ton')) {
      if (!conversionResult?.pieces) {
        setErrors((e) => ({ ...e, submit: 'Invalid weight conversion' }));
        return;
      }
      quantity = conversionResult.pieces;
    } else {
      quantity = num;
    }

    const adjData: AdjustmentData = {
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      locationId: getLocationId('store'),
      locationType: 'store',
      locationName: 'Central Store',
      type: mode,
      quantity,
      reason: reason.trim(),
      notes: notes.trim(),
    };

    if (isWeightBased) {
      adjData.entryMode = entryMode;
      adjData.enteredValue = num;
      adjData.lengthPerPiece = effectiveLength;
    }

    try {
      await onSubmit(adjData);
      resetForm();
      onCancel();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to adjust stock';
      setErrors((e) => ({ ...e, submit: msg }));
    }
  }, [
    item,
    amount,
    reason,
    notes,
    entryMode,
    conversionResult,
    effectiveLength,
    isWeightBased,
    mode,
    validate,
    onSubmit,
    onCancel,
    resetForm,
  ]);

  const handleClose = useCallback(() => {
    resetForm();
    onCancel();
  }, [resetForm, onCancel]);

  if (!visible) return null;

  const amountLabel =
    mode === 'set'
      ? `Target Quantity (${item?.unit || 'units'}) *`
      : isWeightBased
        ? entryMode === 'kg'
          ? 'Weight (Kg) *'
          : entryMode === 'ton'
            ? 'Weight (Ton) *'
            : 'Number of Pieces *'
        : `Quantity (${item?.unit || 'units'}) *`;

  const amountPlaceholder =
    mode === 'set'
      ? `Enter target (current: ${currentQuantity})`
      : mode === 'remove'
        ? `Max: ${currentQuantity}`
        : 'Enter amount';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjustment-modal-title"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-[10px] w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="w-10 h-1 bg-slate-200 rounded-full self-center mt-3 sm:hidden" />

        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="adjustment-modal-title" className="text-[22px] font-semibold text-slate-900">
            {MODE_LABELS[mode]}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-70"
            aria-label="Close"
          >
            <Icon name="x-mark" className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {item && (
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-[15px] font-semibold text-slate-900">{item.name}</p>
            <p className="text-[13px] text-slate-500">SKU: {item.sku}</p>
            {mode !== 'add' && (
              <p className="text-[13px] text-slate-500 mt-1">
                Current stock: {currentQuantity} {item.unit}
              </p>
            )}
          </div>
        )}

        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex flex-col gap-4">
            {isWeightBased && (
              <>
                <div>
                  <label className="block text-[15px] text-slate-900 mb-1.5">
                    Entry Mode <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {(['pieces', 'kg', 'ton'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setEntryMode(m);
                          setErrors((e) => ({ ...e, amount: '' }));
                        }}
                        disabled={loading}
                        className={`flex-1 h-12 rounded-lg border flex items-center justify-center transition-colors ${
                          entryMode === m
                            ? 'bg-blue-800 border-blue-800 text-white'
                            : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
                        }`}
                        role="radio"
                        aria-checked={entryMode === m}
                        aria-label={`${m} entry mode`}
                      >
                        <span className="text-[15px] font-semibold">
                          {m === 'pieces' ? 'Pcs' : m === 'kg' ? 'Kg' : 'Ton'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[15px] text-slate-900 mb-1.5">
                    Length per Piece (m)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lengthPerPiece}
                    onChange={(e) => setLengthPerPiece(e.target.value)}
                    placeholder={`Default: ${defaultLength}m`}
                    disabled={loading}
                    className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-white text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800"
                    aria-label="Length per piece input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[15px] text-slate-900 mb-1.5">{amountLabel}</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((e) => ({ ...e, amount: '' }));
                }}
                placeholder={amountPlaceholder}
                disabled={loading}
                className={`w-full border rounded-lg h-12 px-4 bg-white text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                  errors.amount ? 'border-red-600 focus:border-red-600 focus:ring-red-600' : 'border-slate-200 focus:border-blue-800 focus:ring-blue-800'
                }`}
                aria-label="Amount input"
                aria-invalid={!!errors.amount}
              />
              {conversionResult && (mode === 'add' || mode === 'set') && (
                <div className="flex items-center gap-2 mt-1">
                  <Icon
                    name={conversionResult.isExact ? 'check-circle' : 'exclamation-circle'}
                    className={`w-5 h-5 ${conversionResult.isExact ? 'text-green-600' : 'text-red-600'}`}
                  />
                  <span
                    className={`text-[13px] ${
                      conversionResult.isExact ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {(entryMode === 'kg' || entryMode === 'ton')
                      ? `= ${conversionResult.pieces.toFixed(2)} pieces`
                      : `= ${conversionResult.actualKg.toFixed(2)} kg`}
                  </span>
                </div>
              )}
              {errors.amount && (
                <p className="text-[13px] text-red-600 mt-1" role="alert">
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[15px] text-slate-900 mb-1.5">
                Reason <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {REASON_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setReason(opt.value);
                      setErrors((e) => ({ ...e, reason: '' }));
                    }}
                    disabled={loading}
                    className={`px-4 py-2.5 rounded-full border min-h-[48px] flex items-center justify-center transition-colors ${
                      reason === opt.value
                        ? 'bg-blue-800 border-blue-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
                    }`}
                    role="radio"
                    aria-checked={reason === opt.value}
                    aria-label={`Reason: ${opt.label}`}
                  >
                    <span className="text-[13px] font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
              {errors.reason && (
                <p className="text-[13px] text-red-600 mt-1" role="alert">
                  {errors.reason}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[15px] text-slate-900 mb-1.5">
                Notes <span className="text-red-600">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setErrors((e) => ({ ...e, notes: '' }));
                }}
                placeholder="e.g. Invoice #1407, delivery reference, etc."
                disabled={loading}
                className={`w-full border rounded-lg min-h-[80px] px-4 py-3 bg-white text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                  errors.notes ? 'border-red-600 focus:ring-red-600' : 'border-slate-200 focus:border-blue-800 focus:ring-blue-800'
                }`}
                aria-label="Notes input"
                aria-invalid={!!errors.notes}
              />
              {errors.notes && (
                <p className="text-[13px] text-red-600 mt-1" role="alert">
                  {errors.notes}
                </p>
              )}
            </div>

            {errors.submit && (
              <div className="bg-red-600/15 rounded-[10px] p-3 flex items-center gap-2">
                <Icon name="exclamation-circle" className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-[13px] text-red-600 flex-1">{errors.submit}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`rounded-[10px] h-[50px] flex items-center justify-center gap-2 w-full transition-colors mt-2 ${
                loading ? 'bg-blue-800/70' : 'bg-blue-800 hover:bg-blue-900'
              } text-white font-semibold disabled:cursor-not-allowed`}
              aria-label={loading ? 'Submitting, please wait' : MODE_LABELS[mode]}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  <span className="text-[15px]">Please wait…</span>
                </>
              ) : (
                <>
                  <Icon
                    name={
                      mode === 'add'
                        ? 'plus-circle'
                        : mode === 'remove'
                          ? 'minus-circle'
                          : 'pencil-square'
                    }
                    className="w-5 h-5"
                  />
                  <span className="text-[15px]">{MODE_LABELS[mode]}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="border-[1.5px] border-blue-800 rounded-[10px] h-[50px] flex items-center justify-center w-full text-blue-800 font-semibold hover:bg-blue-50 transition-colors disabled:opacity-70"
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
