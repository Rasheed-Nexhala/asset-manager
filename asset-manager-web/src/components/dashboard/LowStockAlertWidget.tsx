import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export interface LowStockItem {
  id: string;
  name: string;
  currentQty: number;
  minQty: number;
}

export interface LowStockAlertWidgetProps {
  items: LowStockItem[];
  onViewAll: () => void;
  onCreatePO?: (itemId: string) => void;
  loading?: boolean;
}

/**
 * Widget displaying low stock alerts with optional Create PO action.
 */
export function LowStockAlertWidget({
  items,
  onViewAll,
  onCreatePO,
  loading = false,
}: LowStockAlertWidgetProps) {
  const count = items.length;

  if (loading) {
    return (
      <div className="bg-white rounded-[10px] p-4 border border-slate-200 shadow-sm min-h-[120px] flex flex-col items-center justify-center">
        <LoadingSpinner size="sm" />
        <p className="text-[13px] text-slate-500 mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[17px] font-semibold text-slate-900">
          LOW STOCK ALERTS ({count})
        </h3>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center py-2 border-b border-slate-200 last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-slate-900 truncate">
                {item.name}
              </p>
              <p className="text-[13px] text-slate-500">
                {item.currentQty} / Min: {item.minQty}
              </p>
            </div>
            {onCreatePO && (
              <button
                type="button"
                onClick={() => onCreatePO(item.id)}
                className="border border-blue-800 rounded-[10px] px-3 py-2 min-h-[40px] flex items-center justify-center text-[13px] font-semibold text-blue-800 hover:bg-blue-50 transition-colors shrink-0"
                aria-label={`Create PO for ${item.name}`}
              >
                Create PO
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="mt-3 pt-3 border-t border-slate-200 w-full text-left text-[15px] font-medium text-blue-800 hover:underline"
        aria-label="View all alerts"
      >
        View All Alerts
      </button>
    </div>
  );
}
