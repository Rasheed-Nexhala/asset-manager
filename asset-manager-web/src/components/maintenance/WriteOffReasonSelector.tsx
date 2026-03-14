import { useState } from 'react';
import { Icon } from '../shared/Icon';
import type { WriteOffReason, WriteOffReasonConfig } from '../../types/maintenance';

interface WriteOffReasonSelectorProps {
  value: WriteOffReason | null;
  onSelect: (reason: WriteOffReason) => void;
  error?: string;
  disabled?: boolean;
}

const writeOffReasons: WriteOffReasonConfig[] = [
  { value: 'beyond_repair', label: 'Beyond Repair', description: 'Damage is irreparable' },
  { value: 'high_repair_cost', label: 'High Repair Cost', description: 'Repair cost exceeds replacement cost' },
  { value: 'obsolete', label: 'Obsolete', description: 'Item is outdated or no longer needed' },
  { value: 'lost_stolen', label: 'Lost/Stolen', description: 'Item cannot be recovered' },
  { value: 'other', label: 'Other', description: 'Other reasons' },
];

export function WriteOffReasonSelector({
  value,
  onSelect,
  error,
  disabled = false,
}: WriteOffReasonSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedConfig = writeOffReasons.find((r) => r.value === value);
  const displayText = selectedConfig?.label || 'Select Write-Off Reason';
  const hasError = Boolean(error);

  const handleSelect = (reason: WriteOffReason) => {
    onSelect(reason);
    setModalVisible(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        className={`flex h-12 w-full items-center justify-between rounded-lg border px-4 ${
          hasError ? 'border-red-600' : 'border-slate-200'
        } bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Write-off reason selector"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{displayText}</span>
        <Icon name="chevron-down" className="h-5 w-5 text-slate-500" />
      </button>
      {hasError && <p className="mt-1 text-[13px] text-red-600">{error}</p>}

      {modalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
          onClick={() => setModalVisible(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-white md:max-w-lg md:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 md:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-[17px] font-semibold text-slate-900">Select Write-Off Reason</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {writeOffReasons.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleSelect(item.value)}
                  className="flex min-h-[48px] w-full items-center justify-between border-b border-slate-200 px-4 py-4 text-left hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <p className="text-[15px] font-medium text-slate-900">{item.label}</p>
                    {item.description && (
                      <p className="text-[13px] text-slate-500">{item.description}</p>
                    )}
                  </div>
                  {value === item.value && (
                    <Icon name="check-circle" className="h-6 w-6 text-green-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                className="w-full rounded-lg py-3 text-[15px] font-semibold text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
