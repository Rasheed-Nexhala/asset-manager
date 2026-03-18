/**
 * Custom Item Selector Component
 * Dropdown to select a custom item when creating inventory items.
 * Selecting a custom item auto-fills name, SKU, unit, and weight config.
 */

import { useState, useCallback } from 'react';
import { Icon } from '../shared/Icon';
import type { SteelMaster } from '../../types/steelMaster';

export interface SteelMasterSelectorProps {
  steelMasters: SteelMaster[];
  selectedSteelMaster: SteelMaster | null;
  onSelect: (master: SteelMaster | null) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  onManagePress?: () => void;
}

export function SteelMasterSelector({
  steelMasters,
  selectedSteelMaster,
  onSelect,
  label = 'Link to Custom Item',
  error,
  disabled = false,
  onManagePress,
}: SteelMasterSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMasters = steelMasters.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.hsnCode || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback(
    (master: SteelMaster) => {
      onSelect(master);
      setModalOpen(false);
      setSearchQuery('');
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    setModalOpen(false);
    setSearchQuery('');
  }, [onSelect]);

  const displayText = selectedSteelMaster
    ? `${selectedSteelMaster.name} (${selectedSteelMaster.weightPerMeter} kg/m)`
    : 'Select custom item';

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label className="block text-[15px] text-slate-900">{label}</label>
      ) : null}
      <button
        type="button"
        onClick={() => !disabled && setModalOpen(true)}
        disabled={disabled}
        className={`flex h-12 w-full items-center justify-between rounded-lg border px-4 text-left text-[15px] ${
          error ? 'border-red-600' : 'border-slate-200'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'bg-white hover:border-slate-300'}`}
        aria-label={`Select custom item. Current: ${displayText}`}
      >
        <span
          className={`flex-1 truncate ${
            selectedSteelMaster ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          {displayText}
        </span>
        <span className="flex items-center gap-2">
          {selectedSteelMaster && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              className="p-1 rounded-full hover:bg-slate-100"
              aria-label="Clear selection"
            >
              <Icon name="x-circle" className="w-5 h-5 text-slate-500" />
            </button>
          )}
          <Icon name="chevron-down" className="w-5 h-5 text-slate-500" />
        </span>
      </button>

      {onManagePress && (
        <button
          type="button"
          onClick={onManagePress}
          disabled={disabled}
          className="flex min-h-[48px] items-center gap-2 px-2 py-2 text-left text-[13px] font-medium text-blue-800 hover:underline"
        >
          <Icon name="chart-bar-square" className="w-4 h-4" />
          Manage Custom Items
        </button>
      )}

      {error && (
        <p className="text-[13px] text-red-600">{error}</p>
      )}

      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden
            onClick={() => setModalOpen(false)}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-hidden
          >
            <div
              role="dialog"
              aria-modal
              aria-labelledby="steel-master-modal-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm"
            >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 lg:p-6">
              <h2
                id="steel-master-modal-title"
                className="text-[22px] font-semibold text-slate-900"
              >
                Select Custom Item
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <Icon name="x-mark" className="w-5 h-5" />
              </button>
            </div>
            <div className="border-b border-slate-200 px-4 pb-4 lg:px-6 lg:pb-6">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 focus-within:border-blue-800 focus-within:ring-1 focus-within:ring-blue-800">
                <Icon name="magnifying-glass" className="w-5 h-5 shrink-0 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  aria-label="Search custom items"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
              {filteredMasters.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <Icon name="magnifying-glass" className="mb-4 w-12 h-12 text-slate-400" />
                  <p className="text-center text-[15px] text-slate-500">
                    No custom items match your search
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredMasters.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      className={`min-h-[48px] rounded-[10px] border p-4 text-left transition-colors ${
                        selectedSteelMaster?.id === m.id
                          ? 'border-blue-800 bg-blue-800/10'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      aria-pressed={selectedSteelMaster?.id === m.id}
                    >
                      <p className="mb-1 text-[15px] font-semibold text-slate-900">
                        {m.name}
                      </p>
                      <p className="text-[13px] text-slate-500">
                        {m.weightPerMeter} kg/m · Length: {m.defaultLength}m · SKU:{' '}
                        {m.hsnCode || '-'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 p-4 lg:p-6">
              <button
                type="button"
                onClick={handleClear}
                className="h-[50px] rounded-[10px] border-[1.5px] border-blue-800 font-semibold text-[15px] text-blue-800 hover:bg-blue-50 transition-colors"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-[50px] rounded-[10px] bg-blue-800 font-semibold text-[15px] text-white hover:bg-blue-900 transition-colors"
              >
                Close
              </button>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
