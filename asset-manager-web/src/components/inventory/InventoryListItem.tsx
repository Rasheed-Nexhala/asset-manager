import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../shared/Icon';
import { WeightDisplay } from './WeightDisplay';
import { ViewModeToggle } from './ViewModeToggle';
import { isWeightViewSupported } from '../../utils/weightConversionUtils';
import { getItemTypeDetails } from '../../utils/inventoryUtils';
import type { WeightViewMode } from '../../hooks/useWeightViewPreference';
import type { InventoryEntry, ItemType } from '../../types/inventory';

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export interface InventoryListItemProps {
  entry: InventoryEntry;
  imageUrl?: string;
  type: ItemType;
  unit: string;
  weightPerMeter?: number;
  lengthPerPiece?: number;
  onPress?: () => void;
  onRequestTransfer?: () => void;
}

export function InventoryListItem({
  entry,
  imageUrl,
  type,
  unit,
  weightPerMeter,
  lengthPerPiece,
  onPress,
  onRequestTransfer,
}: InventoryListItemProps) {
  const [localViewMode, setLocalViewMode] = useState<WeightViewMode>('pieces');
  const toggleViewMode = useCallback(() => {
    setLocalViewMode((prev) => (prev === 'pieces' ? 'kg' : 'pieces'));
  }, []);
  const typeDetails = getItemTypeDetails(type);
  const effectiveLength = lengthPerPiece ?? entry.lengthPerPiece;
  const isSteelItem = isWeightViewSupported({
    weightPerMeter,
    lengthPerPiece: effectiveLength,
  });
  const formattedDate = formatTimestamp(entry.updatedAt);

  const content = (
    <>
      <div className="flex gap-3 items-center">
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon name="cube" className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex-1 mr-2 min-w-0">
            <p className="text-[15px] font-semibold text-slate-900 truncate">{entry.itemName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] text-slate-500">SKU: {entry.itemSku}</span>
              <WeightDisplay
                quantity={entry.quantity}
                weightPerMeter={weightPerMeter}
                lengthPerPiece={effectiveLength}
                viewMode={localViewMode}
                unit={unit}
              />
            </div>
            {entry.updatedAt && (
              <p className="text-[12px] text-slate-500 mt-0.5">Updated {formattedDate}</p>
            )}
          </div>
          <div className="flex items-end gap-1.5 flex-shrink-0">
            {isSteelItem && (
              <ViewModeToggle viewMode={localViewMode} onToggle={toggleViewMode} compact />
            )}
            <span
              className={`px-2 py-1 rounded-full text-[12px] font-medium ${typeDetails.bgClass} ${typeDetails.textClass}`}
            >
              {typeDetails.label}
            </span>
          </div>
        </div>
      </div>
      {onRequestTransfer && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRequestTransfer();
          }}
          className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-center gap-1.5 min-h-[36px] w-full text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <Icon name="arrows-right-left" className="w-4 h-4" />
          Request Transfer
        </button>
      )}
    </>
  );

  const className =
    'bg-white rounded-[10px] p-4 border border-slate-200 min-h-[48px] block w-full text-left transition-colors hover:border-slate-300';

  if (onPress) {
    return (
      <Link to={`/inventory/${entry.itemId}`} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} role="article">
      {content}
    </div>
  );
}
