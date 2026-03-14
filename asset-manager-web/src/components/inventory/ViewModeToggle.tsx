import { Icon } from '../shared/Icon';
import type { WeightViewMode } from '../../hooks/useWeightViewPreference';

interface ViewModeToggleProps {
  viewMode: WeightViewMode;
  onToggle: () => void;
  compact?: boolean;
}

/**
 * Toggle between pieces and kg view for weight-based steel items.
 */
export function ViewModeToggle({ viewMode, onToggle, compact }: ViewModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-1 ${
        compact ? 'min-h-[32px]' : 'min-h-[40px]'
      }`}
      aria-label={`View in ${viewMode === 'pieces' ? 'kg' : 'pieces'}`}
      aria-pressed={viewMode === 'kg'}
    >
      {viewMode === 'pieces' ? 'Pcs' : 'Kg'}
    </button>
  );
}
