import { Icon } from '../shared/Icon';
import type { IconName } from '../shared/Icon';
import { clsx } from 'clsx';

export interface QuickStat {
  icon: IconName;
  value: number | string;
  label: string;
}

export interface QuickStatsRowProps {
  stats: QuickStat[];
  /** When true and value is 0/empty, show placeholder "—" instead */
  isLoading?: boolean;
}

/**
 * Responsive grid of KPI cards for dashboard metrics.
 * Mobile: 1 column, sm: 2 columns, lg: 3 columns (matching content grid).
 */
export function QuickStatsRow({ stats, isLoading = false }: QuickStatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const showPlaceholder = isLoading && (stat.value === 0 || stat.value === '');
        
        // Define color schemes based on icon/label type for visual variety
        const colorSchemes: Record<string, { bg: string; icon: string; border: string }> = {
          'cube': { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
          'clock': { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
          'building-office-2': { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100' },
          'inbox': { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' }
        };

        const scheme = colorSchemes[stat.icon] || { bg: 'bg-slate-50', icon: 'text-slate-500', border: 'border-slate-100' };

        return (
          <div
            key={index}
            className="group bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col min-w-0 transition-all hover:border-blue-300 hover:shadow-md"
            aria-label={`${stat.label}: ${showPlaceholder ? 'loading' : stat.value}`}
          >
            <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors", scheme.bg, scheme.border, "border group-hover:bg-white")}>
              <Icon name={stat.icon} className={clsx("h-6 w-6", scheme.icon)} />
            </div>
            
            <p className="text-[32px] font-bold text-slate-900 leading-tight">
              {showPlaceholder ? '—' : stat.value}
            </p>
            <p className="text-[14px] font-medium text-slate-500 mt-1 uppercase tracking-wider">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
