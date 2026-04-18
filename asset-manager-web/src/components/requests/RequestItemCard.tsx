import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../shared/Icon';
import { WeightDisplay } from '../inventory/WeightDisplay';
import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import {
  isWeightBasedItem,
  piecesToKg,
  kgToPieces,
  tonToKg,
  formatWeight,
  getConversionErrorMessage,
} from '../../utils/weightConversionUtils';
import type { RequestItem } from '../../types/request';

interface RequestItemCardProps {
  item: RequestItem;
  mode: 'create' | 'view' | 'edit';
  onQuantityChange?: (itemId: string, quantity: number) => void;
  onRemove?: (itemId: string) => void;
  availability?: {
    available: number;
    sufficient: boolean;
  };
}

export function RequestItemCard({
  item,
  mode,
  onQuantityChange,
  onRemove,
  availability,
}: RequestItemCardProps) {
  const { viewMode } = useWeightViewPreference();
  const isSteelItem = isWeightBasedItem({ weightPerMeter: item.weightPerMeter });
  const hasFullWeightConfig =
    isSteelItem &&
    item.weightPerMeter != null &&
    item.lengthPerPiece != null;
  const displayUnit = item.unit || 'units';

  const [entryMode, setEntryMode] = useState<'pieces' | 'kg' | 'ton'>('pieces');
  const [amountStr, setAmountStr] = useState(String(item.quantityRequested || ''));
  const [quantity, setQuantity] = useState(item.quantityRequested);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (entryMode === 'pieces') {
      setAmountStr(String(item.quantityRequested || ''));
    }
    setQuantity(item.quantityRequested);
  }, [item.quantityRequested, entryMode]);

  const handleModeChange = useCallback(
    (m: 'pieces' | 'kg' | 'ton') => {
      setEntryMode(m);
      setErrorMsg(null);
      if (quantity > 0 && hasFullWeightConfig) {
        if (m === 'pieces') {
          setAmountStr(String(quantity));
        } else if (m === 'kg') {
          setAmountStr(
            String(
              piecesToKg(quantity, item.weightPerMeter!, item.lengthPerPiece!)
            )
          );
        } else {
          setAmountStr(
            String(
              piecesToKg(quantity, item.weightPerMeter!, item.lengthPerPiece!) /
                1000
            )
          );
        }
      } else if (quantity > 0) {
        setAmountStr(String(quantity));
      } else {
        setAmountStr('');
      }
    },
    [quantity, hasFullWeightConfig, item.weightPerMeter, item.lengthPerPiece]
  );

  const handleAmountChange = (text: string) => {
    setAmountStr(text);
    if (!text.trim()) {
      setErrorMsg(null);
      setQuantity(0);
      onQuantityChange?.(item.itemId, 0);
      return;
    }

    const num = parseFloat(text);
    if (isNaN(num) || num < 0) {
      setErrorMsg('Invalid amount');
      return;
    }

    const isDiscreteUnit = (unit: string) =>
      ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(unit);

    if (entryMode === 'pieces' || !hasFullWeightConfig) {
      if (
        entryMode === 'pieces' &&
        hasFullWeightConfig &&
        !Number.isInteger(num)
      ) {
        setErrorMsg('Pieces must be a whole number');
        return;
      }
      if (
        !hasFullWeightConfig &&
        isDiscreteUnit(item.unit || '') &&
        !Number.isInteger(num)
      ) {
        setErrorMsg('Must be a whole number for this unit');
        return;
      }
      setErrorMsg(null);
      setQuantity(num);
      onQuantityChange?.(item.itemId, num);
    } else {
      const kg = entryMode === 'ton' ? tonToKg(num) : num;
      const res = kgToPieces(kg, item.weightPerMeter!, item.lengthPerPiece!);
      if (!res.isExact) {
        setErrorMsg(
          getConversionErrorMessage(
            kg,
            item.weightPerMeter!,
            item.lengthPerPiece!
          )
        );
      } else {
        setErrorMsg(null);
        setQuantity(res.pieces);
        onQuantityChange?.(item.itemId, res.pieces);
      }
    }
  };

  const handleIncrement = () => {
    if (entryMode !== 'pieces' && hasFullWeightConfig) return;
    const newQty = quantity + 1;
    setAmountStr(String(newQty));
    setQuantity(newQty);
    setErrorMsg(null);
    onQuantityChange?.(item.itemId, newQty);
  };

  const handleDecrement = () => {
    if (entryMode !== 'pieces' && hasFullWeightConfig) return;
    if (quantity > 0) {
      const newQty = quantity - 1;
      setAmountStr(String(newQty));
      setQuantity(newQty);
      setErrorMsg(null);
      onQuantityChange?.(item.itemId, newQty);
    }
  };

  return (
    <div className="bg-white rounded-[10px] p-4 border border-slate-200">
      <div className="flex gap-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="w-16 h-16 rounded-lg bg-slate-100 object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon name="cube" className="h-8 w-8 text-slate-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 mb-1 line-clamp-2 break-words">
            {item.itemName}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] text-slate-500">{item.itemSku}</span>
            <span className="w-1 h-1 rounded-full bg-slate-500" />
            <span className="text-[13px] text-slate-500">
              {item.itemType === 'consumable'
                ? 'Consumable'
                : item.itemType === 'fuel'
                  ? 'Fuel'
                  : 'Non-Consumable'}
            </span>
          </div>

          {(mode === 'create' || mode === 'edit') && (
            <div>
              {hasFullWeightConfig && (
                <div className="flex gap-2 mb-3">
                  {(['pieces', 'kg', 'ton'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleModeChange(m)}
                      className={`px-3 py-1.5 rounded-md border text-[12px] font-medium transition-colors ${
                        entryMode === m
                          ? 'bg-blue-800 border-blue-800 text-white'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {m === 'pieces' ? 'Pcs' : m === 'kg' ? 'Kg' : 'Ton'}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-[13px] text-slate-500">
                  {hasFullWeightConfig
                    ? entryMode === 'pieces'
                      ? 'Quantity (Pcs):'
                      : entryMode === 'kg'
                        ? 'Weight (Kg):'
                        : 'Weight (Ton):'
                    : `Quantity (${displayUnit}):`}
                </span>
                <div className="flex items-stretch gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {(!hasFullWeightConfig || entryMode === 'pieces') && (
                      <button
                        type="button"
                        onClick={handleDecrement}
                        aria-label="Decrease quantity"
                        className="h-12 w-12 shrink-0 border border-slate-200 rounded-full flex items-center justify-center text-blue-800 hover:bg-slate-50"
                      >
                        <Icon name="minus" className="h-5 w-5" />
                      </button>
                    )}

                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-2 text-center text-[15px] font-bold text-slate-900 bg-white min-w-[56px] max-w-[120px] w-full min-h-12"
                    />

                    {(!hasFullWeightConfig || entryMode === 'pieces') && (
                      <button
                        type="button"
                        onClick={handleIncrement}
                        aria-label="Increase quantity"
                        className="h-12 w-12 shrink-0 border border-blue-800 rounded-full flex items-center justify-center bg-blue-800 text-white hover:bg-blue-900"
                      >
                        <Icon name="plus" className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.itemId)}
                      className="h-12 w-12 shrink-0 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-[10px] border border-transparent hover:border-red-200"
                      aria-label="Remove item from request"
                    >
                      <Icon name="trash" className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>

              {hasFullWeightConfig &&
                !errorMsg &&
                quantity > 0 &&
                entryMode !== 'pieces' && (
                  <p className="text-[13px] text-green-600 mt-2 font-medium">
                    = {quantity} Pcs
                  </p>
                )}
              {hasFullWeightConfig &&
                !errorMsg &&
                quantity > 0 &&
                entryMode === 'pieces' && (
                  <p className="text-[13px] text-slate-500 mt-2">
                    ≈{' '}
                    {formatWeight(
                      piecesToKg(
                        quantity,
                        item.weightPerMeter!,
                        item.lengthPerPiece!
                      ),
                      'Kg'
                    )}
                  </p>
                )}

              {errorMsg && (
                <p className="text-[12px] text-red-600 mt-2 font-medium">
                  {errorMsg}
                </p>
              )}
            </div>
          )}

          {/* View mode */}
          {(mode === 'view' || !onQuantityChange) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] text-slate-900">Quantity: </span>
                {hasFullWeightConfig && item.weightPerMeter != null && item.lengthPerPiece != null ? (
                  <WeightDisplay
                    quantity={item.quantityRequested}
                    weightPerMeter={item.weightPerMeter}
                    lengthPerPiece={item.lengthPerPiece}
                    viewMode={viewMode}
                    unit={item.unit || 'Pcs'}
                  />
                ) : (
                  <span className="text-[15px] text-slate-900">
                    {item.quantityRequested} {displayUnit}
                  </span>
                )}
              </div>

              {/* Return status — only meaningful for non-consumables that have been approved */}
              {item.itemType === 'non_consumable' && item.quantityApproved > 0 && (() => {
                const returned = item.quantityReturned ?? 0;
                const remaining = item.quantityApproved - returned;
                const isFullyReturned = remaining <= 0;
                const isPartiallyReturned = returned > 0 && !isFullyReturned;
                return (
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[12px] text-slate-600">
                      Approved: {item.quantityApproved} {displayUnit}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium ${
                      isFullyReturned
                        ? 'bg-green-100 text-green-700'
                        : isPartiallyReturned
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      Returned: {returned} {displayUnit}
                    </span>
                    {!isFullyReturned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[12px] text-blue-700">
                        Remaining: {remaining} {displayUnit}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {availability && (
            <div
              className={`mt-3 p-2 rounded-lg ${
                availability.sufficient ? 'bg-green-600/10' : 'bg-red-600/10'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Icon
                  name={availability.sufficient ? 'check-circle' : 'exclamation-circle'}
                  className={`h-4 w-4 ${
                    availability.sufficient ? 'text-green-600' : 'text-red-600'
                  }`}
                />
                <span
                  className={`text-[13px] font-medium ${
                    availability.sufficient ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {availability.sufficient ? 'Sufficient' : 'Insufficient'}
                </span>
                <span className="text-[13px] text-slate-500 ml-auto">
                  Available:{' '}
                  {hasFullWeightConfig &&
                  item.weightPerMeter != null &&
                  item.lengthPerPiece != null ? (
                    <WeightDisplay
                      quantity={availability.available}
                      weightPerMeter={item.weightPerMeter}
                      lengthPerPiece={item.lengthPerPiece}
                      viewMode={viewMode}
                      unit={item.unit || 'Pcs'}
                    />
                  ) : (
                    `${availability.available} ${displayUnit}`
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
