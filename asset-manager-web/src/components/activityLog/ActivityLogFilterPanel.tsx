import { useState, useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setFilters, clearFilters } from '../../store/slices/activityLogSlice';
import type { ActivityLogFiltersStore, ActivityLogFiltersUI, ActionCategory } from '../../types/activityLog';
import { filtersToStore, filtersToUI } from '../../utils/dateSerialization';
import { ACTION_CATEGORY_CONFIG } from '../../constants/activityLogConfig';
import { Icon } from '../shared/Icon';

interface ActivityLogFilterPanelProps {
  isOpen: boolean;
  filters: ActivityLogFiltersStore;
  onClose: () => void;
}

const INITIAL_FILTERS_UI: ActivityLogFiltersUI = {
  startDate: null,
  endDate: null,
  userId: null,
  actionCategory: 'all',
  actionType: 'all',
  searchQuery: '',
};

export function ActivityLogFilterPanel({ isOpen, filters, onClose }: ActivityLogFilterPanelProps) {
  const dispatch = useAppDispatch();
  const [localFilters, setLocalFilters] = useState<ActivityLogFiltersUI>(filtersToUI(filters) as ActivityLogFiltersUI);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filtersToUI(filters));
    }
  }, [isOpen, filters]);

  if (!isOpen) return null;

  const categories = Object.keys(ACTION_CATEGORY_CONFIG) as ActionCategory[];

  const handleApply = () => {
    dispatch(setFilters(filtersToStore(localFilters)));
    onClose();
  };

  const handleClear = () => {
    setLocalFilters(INITIAL_FILTERS_UI);
  };

  const handleClearAndApply = () => {
    dispatch(clearFilters());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl md:rounded-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="w-10 h-1 bg-slate-200 rounded-full self-center mt-2 mb-2 md:hidden" />

        {/* Header */}
        <div className="px-4 pb-4 pt-2 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-[22px] font-semibold text-slate-900">Filter Logs</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-12 flex items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Close"
          >
            <Icon name="x-mark" className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Date Range */}
          <div>
            <h3 className="text-[17px] font-semibold text-slate-900 mb-3">Date Range</h3>
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[15px] text-slate-900">From</label>
                <input
                  type="date"
                  value={localFilters.startDate ? localFilters.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      startDate: e.target.value ? new Date(e.target.value) : null,
                    }))
                  }
                  className="w-full border border-slate-200 rounded-lg h-12 px-4 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[15px] text-slate-900">To</label>
                <input
                  type="date"
                  value={localFilters.endDate ? localFilters.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      endDate: e.target.value ? new Date(e.target.value) : null,
                    }))
                  }
                  className="w-full border border-slate-200 rounded-lg h-12 px-4 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <h3 className="text-[17px] font-semibold text-slate-900 mb-3">Category</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLocalFilters((prev) => ({ ...prev, actionCategory: 'all' }))}
                className={`px-4 py-2.5 rounded-full border text-[13px] font-medium ${
                  localFilters.actionCategory === 'all'
                    ? 'bg-blue-800 border-blue-800 text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setLocalFilters((prev) => ({ ...prev, actionCategory: category }))}
                  className={`px-4 py-2.5 rounded-full border text-[13px] font-medium ${
                    localFilters.actionCategory === category
                      ? 'bg-blue-800 border-blue-800 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {ACTION_CATEGORY_CONFIG[category].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pt-4 pb-6 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 border-[1.5px] border-blue-800 rounded-[10px] h-[50px] text-[15px] font-semibold text-blue-800 hover:bg-blue-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 bg-blue-800 rounded-[10px] h-[50px] text-[15px] font-semibold text-white hover:bg-blue-900"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
