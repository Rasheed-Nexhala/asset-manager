import { Icon } from '../shared/Icon';
import type { IconName } from '../shared/Icon';

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
 * Mobile: 1 column, sm: 2 columns, lg: 4 columns.
 */
export function QuickStatsRow({ stats, isLoading = false }: QuickStatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const showPlaceholder = isLoading && (stat.value === 0 || stat.value === '');
        return (
          <div
            key={index}
            className="bg-white rounded-[10px] p-4 lg:p-5 border border-slate-200 shadow-sm flex flex-col min-w-0"
            aria-label={`${stat.label}: ${showPlaceholder ? 'loading' : stat.value}`}
          >
            <Icon name={stat.icon} className="h-6 w-6 text-slate-500 mb-2" />
            <p className="text-[32px] font-bold text-slate-900">
              {showPlaceholder ? '—' : stat.value}
            </p>
            <p className="text-[13px] text-slate-500">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
