import { useWeightViewPreference } from '../../hooks/useWeightViewPreference';
import { piecesToKg } from '../../utils/weightConversionUtils';
import type { WeightViewMode } from '../../hooks/useWeightViewPreference';

interface WeightDisplayProps {
  quantity: number;
  weightPerMeter?: number;
  lengthPerPiece?: number;
  viewMode: WeightViewMode;
  unit: string;
  size?: 'default' | 'large';
}

/**
 * Displays quantity in pieces or kg based on view mode for weight-based items.
 * For non-weight items, shows quantity + unit.
 */
export function WeightDisplay({
  quantity,
  weightPerMeter,
  lengthPerPiece,
  viewMode,
  unit,
  size = 'default',
}: WeightDisplayProps) {
  const isWeightSupported =
    typeof weightPerMeter === 'number' &&
    weightPerMeter > 0 &&
    typeof lengthPerPiece === 'number' &&
    lengthPerPiece > 0;

  const showInKg = isWeightSupported && viewMode === 'kg';

  const displayValue = showInKg
    ? piecesToKg(quantity, weightPerMeter!, lengthPerPiece!).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : quantity.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const displayUnit = showInKg ? 'kg' : unit;

  const textClass = size === 'large' ? 'text-[22px] font-bold text-slate-900' : 'text-[15px] text-slate-900';

  return (
    <span className={textClass}>
      {displayValue} {displayUnit}
    </span>
  );
}
