import { useCallback, useMemo, useState } from 'react';
import { Icon } from '../shared/Icon';
import type { Vendor } from '../../types/vendor';

interface VendorSelectorProps {
  vendors: Vendor[];
  selectedVendorId: string | null;
  onSelect: (vendor: Vendor | null) => void;
  placeholder?: string;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const FILTER_ALL = 'all';

const getFilterKey = (name: string): string => {
  const first = (name || '').trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  return '#';
};

export function VendorSelector({
  vendors,
  selectedVendorId,
  onSelect,
  placeholder = 'Select Saved Vendor',
}: VendorSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [letterFilter, setLetterFilter] = useState<string>(FILTER_ALL);

  const selectedVendor = selectedVendorId
    ? vendors.find((v) => v.id === selectedVendorId)
    : null;

  const filteredVendors = useMemo(() => {
    if (letterFilter === FILTER_ALL) return vendors;
    return vendors.filter((v) => getFilterKey(v.name) === letterFilter);
  }, [vendors, letterFilter]);

  const availableLetters = useMemo(() => {
    const used = new Set(vendors.map((v) => getFilterKey(v.name)));
    const result = [FILTER_ALL];
    LETTERS.forEach((l) => {
      if (used.has(l)) result.push(l);
    });
    if (used.has('#')) result.push('#');
    return result;
  }, [vendors]);

  const handleOpen = useCallback(() => {
    setLetterFilter(FILTER_ALL);
    setModalVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleSelect = useCallback(
    (vendor: Vendor | null) => {
      onSelect(vendor);
      setModalVisible(false);
    },
    [onSelect]
  );

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full min-h-[56px] items-center justify-between rounded-[10px] border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Icon
              name="building-office-2"
              className={`h-5 w-5 ${selectedVendor ? 'text-blue-800' : 'text-slate-400'}`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-[15px] font-medium truncate ${
                selectedVendor ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {selectedVendor?.name ?? placeholder}
            </p>
            {selectedVendor && (
              <p className="mt-0.5 text-[13px] text-slate-500 truncate">
                {selectedVendor.phone}
              </p>
            )}
          </div>
        </div>
        <Icon name="chevron-down" className="h-5 w-5 flex-shrink-0 text-slate-500" />
      </button>

      {selectedVendor && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mt-2 flex min-h-[44px] items-center gap-2 py-2 text-[13px] font-medium text-blue-800 hover:underline"
        >
          <Icon name="x-mark" className="h-4 w-4" />
          Clear selection
        </button>
      )}

      {modalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-selector-title"
        >
          <div
            className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white md:max-h-[80vh] md:max-w-lg md:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 md:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            <div className="border-b border-slate-200 px-4 pb-4">
              <div className="flex items-center justify-between">
                <h2 id="vendor-selector-title" className="text-[22px] font-semibold text-slate-900">
                  Select Vendor
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
                >
                  <Icon name="x-mark" className="h-6 w-6" />
                </button>
              </div>

              <p className="mt-4 text-[13px] text-slate-500">Filter by name</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableLetters.map((letter) => {
                  const isActive = letterFilter === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setLetterFilter(letter)}
                      className={`min-h-[44px] min-w-[44px] rounded-full px-3 ${
                        isActive
                          ? 'bg-blue-800 text-white'
                          : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {letter === FILTER_ALL ? 'All' : letter}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredVendors.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[17px] font-semibold text-slate-900">
                    No vendors found
                  </p>
                  <p className="mt-2 text-[15px] text-slate-500">
                    {letterFilter === FILTER_ALL
                      ? 'Add vendors to reuse them in purchase orders.'
                      : `No vendors starting with "${letterFilter}".`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredVendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => handleSelect(vendor)}
                      className="flex w-full items-center justify-between rounded-[10px] border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-slate-900 truncate">
                          {vendor.name}
                        </p>
                        <p className="mt-0.5 text-[13px] text-slate-500 truncate">
                          {vendor.phone}
                        </p>
                      </div>
                      <Icon name="chevron-right" className="h-5 w-5 flex-shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
