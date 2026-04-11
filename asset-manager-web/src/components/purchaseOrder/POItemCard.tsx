import { useState, useEffect } from 'react';
import { Icon } from '../shared/Icon';
import {
  isWeightBasedItem,
  kgToPieces,
  piecesToKg,
  tonToKg,
  getConversionErrorMessage,
} from '../../utils/weightConversionUtils';
import type { PurchaseOrderItem } from '../../types/purchaseOrder';
import type { Item } from '../../types/inventory';

interface POItemCardProps {
  item: PurchaseOrderItem;
  inventoryItem?: Item | null;
  editable?: boolean;
  onRemove?: () => void;
  onQuantityChange?: (
    quantity: number,
    orderedUnit?: string,
    orderedQuantity?: number
  ) => void;
  onUnitPriceChange?: (price: number) => void;
  onGstPercentageChange?: (percentage: number) => void;
  onRemarksChange?: (remarks: string) => void;
}

const formatCurrency = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN')}`;

const sanitizeDecimalInput = (t: string): string => {
  const sanitized = t.replace(/[^\d.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return sanitized;
};

export function POItemCard({
  item,
  inventoryItem,
  editable = false,
  onRemove,
  onQuantityChange,
  onUnitPriceChange,
  onGstPercentageChange,
  onRemarksChange,
}: POItemCardProps) {
  const baseUnit = inventoryItem?.unit || item.unit || 'Pieces';
  const isSteel = inventoryItem ? isWeightBasedItem(inventoryItem) : false;
  const hasFullWeightConfig =
    isSteel &&
    inventoryItem?.weightPerMeter != null &&
    inventoryItem?.lengthPerPiece != null;

  const [entryMode, setEntryMode] = useState<'pieces' | 'kg' | 'ton'>('pieces');
  const [quantityStr, setQuantityStr] = useState(
    item.orderedQuantity ? String(item.orderedQuantity) : item.quantity > 0 ? String(item.quantity) : ''
  );
  const [unitPriceStr, setUnitPriceStr] = useState(
    item.unitPrice > 0 ? String(item.unitPrice) : ''
  );
  const [gstStr, setGstStr] = useState(
    (item.gstPercentage ?? 0) > 0 ? String(item.gstPercentage) : ''
  );
  const [qtyError, setQtyError] = useState<string | null>(null);

  useEffect(() => {
    if (item.orderedUnit === 'Kg') setEntryMode('kg');
    else if (item.orderedUnit === 'Ton' || item.orderedUnit === 'Ton (MT)') setEntryMode('ton');
    else setEntryMode('pieces');
  }, [item.orderedUnit]);

  useEffect(() => {
    setUnitPriceStr(item.unitPrice > 0 ? String(item.unitPrice) : '');
  }, [item.itemId]);

  useEffect(() => {
    setGstStr((item.gstPercentage ?? 0) > 0 ? String(item.gstPercentage) : '');
  }, [item.itemId]);

  const handleModeChange = (m: 'pieces' | 'kg' | 'ton') => {
    setEntryMode(m);
    setQtyError(null);
    if (item.quantity > 0 && hasFullWeightConfig && inventoryItem) {
      if (m === 'pieces') {
        setQuantityStr(String(item.quantity));
      } else if (m === 'kg') {
        setQuantityStr(
          String(
            piecesToKg(
              item.quantity,
              inventoryItem.weightPerMeter!,
              inventoryItem.lengthPerPiece!
            )
          )
        );
      } else {
        setQuantityStr(
          String(
            piecesToKg(
              item.quantity,
              inventoryItem.weightPerMeter!,
              inventoryItem.lengthPerPiece!
            ) / 1000
          )
        );
      }
    } else if (item.quantity > 0) {
      setQuantityStr(String(item.quantity));
    } else {
      setQuantityStr('');
    }
  };

  const handleQuantityInput = (text: string) => {
    setQuantityStr(text);
    if (!text.trim()) {
      setQtyError(null);
      onQuantityChange?.(
        0,
        entryMode === 'pieces'
          ? hasFullWeightConfig
            ? undefined
            : baseUnit
          : entryMode === 'kg'
            ? 'Kg'
            : 'Ton',
        0
      );
      return;
    }

    const num = parseFloat(text);
    if (isNaN(num) || num < 0) {
      setQtyError('Invalid amount');
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
        setQtyError('Must be whole number');
        return;
      }
      if (
        !hasFullWeightConfig &&
        isDiscreteUnit(inventoryItem?.unit || '') &&
        !Number.isInteger(num)
      ) {
        setQtyError('Must be whole number for this unit');
        return;
      }
      setQtyError(null);
      onQuantityChange?.(
        num,
        hasFullWeightConfig ? undefined : baseUnit,
        hasFullWeightConfig ? undefined : num
      );
    } else {
      const kg = entryMode === 'ton' ? tonToKg(num) : num;
      const res = kgToPieces(
        kg,
        inventoryItem!.weightPerMeter!,
        inventoryItem!.lengthPerPiece!
      );
      if (!res.isExact) {
        setQtyError(
          getConversionErrorMessage(
            kg,
            inventoryItem!.weightPerMeter!,
            inventoryItem!.lengthPerPiece!
          )
        );
        return;
      }
      setQtyError(null);
      onQuantityChange?.(
        res.pieces,
        entryMode === 'kg' ? 'Kg' : 'Ton',
        num
      );
    }
  };

  const gstPct = item.gstPercentage ?? 0;
  const gstAmount = item.gstAmount ?? Math.round((item.amount * gstPct) / 100);
  const amountWithGst = item.amount + gstAmount;

  return (
    <div className="mb-3 rounded-[10px] border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-slate-900">
            {item.itemName}
          </p>
          <p className="mt-0.5 text-[13px] text-slate-500">
            SKU: {item.itemSku}
          </p>
        </div>
        {editable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="-mr-2 -mt-1 flex h-12 w-12 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
          >
            <Icon name="trash" className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {editable && hasFullWeightConfig && (
          <div>
            <p className="mb-1.5 text-[15px] text-slate-900">Order By</p>
            <div className="flex gap-2">
              {(['pieces', 'kg', 'ton'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  className={`rounded-md border px-3 py-1.5 text-[12px] font-medium ${
                    entryMode === m
                      ? 'border-blue-800 bg-blue-800 text-white'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {m === 'pieces' ? 'Pieces' : m === 'kg' ? 'Kg' : 'Ton'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[15px] text-slate-900">
            Quantity {entryMode !== 'pieces' && `(${entryMode === 'kg' ? 'Kg' : 'Ton'})`}
          </label>
          {editable && onQuantityChange ? (
            <div>
              <input
                type="text"
                inputMode="decimal"
                value={quantityStr}
                onChange={(e) => handleQuantityInput(e.target.value)}
                placeholder="0"
                className={`h-12 w-full rounded-lg border px-4 text-[15px] text-slate-900 ${
                  qtyError ? 'border-red-600' : 'border-slate-200 focus:border-blue-800 focus:ring-1 focus:ring-blue-800'
                }`}
              />
              {qtyError && (
                <p className="mt-1 text-[12px] text-red-600 whitespace-pre-wrap">{qtyError}</p>
              )}
            </div>
          ) : (
            <p className="h-12 py-3 text-[15px] text-slate-900">
              {item.orderedQuantity
                ? `${item.orderedQuantity} ${item.orderedUnit || baseUnit}`
                : `${item.quantity} ${baseUnit}`}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[15px] text-slate-900">
            Unit Price (₹) {entryMode !== 'pieces' ? `per ${entryMode === 'kg' ? 'Kg' : 'Ton'}` : `per ${baseUnit}`}
          </label>
          {editable && onUnitPriceChange ? (
            <input
              type="text"
              inputMode="decimal"
              value={unitPriceStr}
              onChange={(e) => {
                const sanitized = sanitizeDecimalInput(e.target.value);
                setUnitPriceStr(sanitized);
                onUnitPriceChange(parseFloat(sanitized) || 0);
              }}
              placeholder="0"
              className="h-12 w-full rounded-lg border border-slate-200 px-4 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
          ) : (
            <p className="h-12 py-3 text-[15px] text-slate-900">
              {(item.unitPrice ?? 0) > 0 ? formatCurrency(item.unitPrice!) : '—'}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[15px] text-slate-900">
            GST (%)
          </label>
          {editable && onGstPercentageChange ? (
            <input
              type="text"
              inputMode="decimal"
              value={gstStr}
              onChange={(e) => {
                const sanitized = sanitizeDecimalInput(e.target.value);
                setGstStr(sanitized);
                const parsed = parseFloat(sanitized) || 0;
                onGstPercentageChange(Math.min(100, Math.max(0, parsed)));
              }}
              placeholder="0"
              className="h-12 w-full rounded-lg border border-slate-200 px-4 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
          ) : (
            <p className="h-12 py-3 text-[15px] text-slate-900">
              {gstPct}%
              {item.gstAmount != null && item.gstAmount > 0 && (
                <span className="ml-2 text-[13px] text-slate-500">
                  ({formatCurrency(item.gstAmount)})
                </span>
              )}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[15px] text-slate-900">
              Amount (incl. GST)
            </p>
            {item.isPriceUpdated && (
              <div className="group relative flex items-center cursor-help">
                <span className="shrink-0 rounded-full bg-amber-600/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 border border-amber-600/30 flex items-center gap-1">
                  ⚠️ Price Adjusted
                </span>
                {item.priceChangeLog && item.priceChangeLog.length > 0 && (
                  <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-xs -translate-x-1/2 flex-col rounded bg-slate-800 px-3 py-2 text-[12px] text-white shadow-lg group-hover:flex">
                    <p className="mb-1 font-semibold text-slate-200">Price Adjustments (Receipts):</p>
                    {item.priceChangeLog.map((log, i) => (
                      <span key={i} className="mb-1">
                        {new Date(log.date).toLocaleDateString()} — Qty {log.quantityAffected} @ ₹{log.newPrice} 
                        <span className="text-slate-400 block ml-2">(was ₹{log.oldPrice} — {log.receivedByName})</span>
                      </span>
                    ))}
                    {item.originalUnitPrice !== undefined && (
                      <p className="mt-1 border-t border-slate-600 pt-1 text-slate-300">
                        Original Approved PO Price: ₹{item.originalUnitPrice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-[15px] font-semibold text-slate-900">
            {amountWithGst > 0 ? formatCurrency(amountWithGst) : '—'}
          </p>
        </div>

        {editable && onRemarksChange && (
          <div>
            <label className="mb-1.5 block text-[15px] text-slate-900">
              Remarks
            </label>
            <input
              type="text"
              value={item.remarks ?? ''}
              onChange={(e) => onRemarksChange(e.target.value)}
              placeholder="Optional"
              className="h-12 w-full rounded-lg border border-slate-200 px-4 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
          </div>
        )}
      </div>
    </div>
  );
}
