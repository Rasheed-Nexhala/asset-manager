import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../shared/Icon';
import { WeightDisplay } from './WeightDisplay';
import { ViewModeToggle } from './ViewModeToggle';
import { isLowStock, getItemTypeDetails } from '../../utils/inventoryUtils';
import { isWeightViewSupported } from '../../utils/weightConversionUtils';
import type { WeightViewMode } from '../../hooks/useWeightViewPreference';
import type { Item } from '../../types/inventory';

export interface ItemCardProps {
  item: Item;
  onPress?: () => void;
}

export function ItemCard({ item }: ItemCardProps) {
  const [localViewMode, setLocalViewMode] = useState<WeightViewMode>('pieces');
  const toggleViewMode = useCallback(() => {
    setLocalViewMode((prev) => (prev === 'pieces' ? 'kg' : 'pieces'));
  }, []);
  const showLowStockBadge = isLowStock(item);
  const typeDetails = getItemTypeDetails(item.type);
  const isSteelItem = isWeightViewSupported(item);

  return (
    <Link
      to={`/inventory/${item.id}`}
      className="bg-white rounded-[10px] p-4 border border-slate-200 mb-3 block transition-colors hover:border-slate-300"
    >
      <div className="flex gap-3 mb-3">
        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon name="cube" className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 line-clamp-2">{item.name}</p>
          <p className="text-[13px] text-slate-500">SKU: {item.sku}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isSteelItem && (
            <ViewModeToggle viewMode={localViewMode} onToggle={toggleViewMode} compact />
          )}
          <span
            className={`px-2 py-1 rounded-full text-[12px] font-medium ${typeDetails.bgClass} ${typeDetails.textClass}`}
          >
            {typeDetails.label}
          </span>
          {showLowStockBadge && (
            <span className="px-2 py-1 rounded-full bg-amber-600/15 text-[12px] font-medium text-amber-600">
              Low Stock
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-4 mb-3">
        <div className="flex-1">
          <p className="text-[13px] text-slate-500 mb-1">Total</p>
          <WeightDisplay
            quantity={item.totalQuantity}
            weightPerMeter={item.weightPerMeter}
            lengthPerPiece={item.lengthPerPiece}
            viewMode={localViewMode}
            unit={item.unit}
          />
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-slate-500 mb-1">Central Store</p>
          <WeightDisplay
            quantity={item.centralStoreQuantity}
            weightPerMeter={item.weightPerMeter}
            lengthPerPiece={item.lengthPerPiece}
            viewMode={localViewMode}
            unit={item.unit}
          />
        </div>
      </div>
      {item.type !== 'fuel' && (
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-[13px] text-slate-500 mb-1">At Sites</p>
            <WeightDisplay
              quantity={item.atSitesQuantity}
              weightPerMeter={item.weightPerMeter}
              lengthPerPiece={item.lengthPerPiece}
              viewMode={localViewMode}
              unit={item.unit}
            />
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-slate-500 mb-1">Maintenance</p>
            <WeightDisplay
              quantity={item.inMaintenanceQuantity}
              weightPerMeter={item.weightPerMeter}
              lengthPerPiece={item.lengthPerPiece}
              viewMode={localViewMode}
              unit={item.unit}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
