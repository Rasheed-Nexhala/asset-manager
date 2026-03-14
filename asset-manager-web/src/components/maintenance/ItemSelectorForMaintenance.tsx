/**
 * ItemSelectorForMaintenance - Modal for selecting items from central store
 * for the Add to Maintenance flow. Filters non-consumable items with stock.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../shared/Icon';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import {
  listItemsForMaintenancePaginated,
  getItemsForMaintenanceCount,
  MAINTENANCE_ITEMS_PAGE_SIZE,
} from '../../services/firebase/inventoryService';
import type { Item } from '../../types/inventory';
import type { DocumentSnapshot } from 'firebase/firestore';

const SEARCH_DEBOUNCE_MS = 400;

export interface ItemSelectorForMaintenanceProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: Item) => void;
  selectedItemId?: string;
}

export function ItemSelectorForMaintenance({
  isOpen,
  onClose,
  onSelect,
  selectedItemId,
}: ItemSelectorForMaintenanceProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  const hasMore = items.length < (totalCount ?? 0) && lastDoc != null;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const [countResult, listResult] = await Promise.all([
        getItemsForMaintenanceCount(debouncedSearch || undefined),
        listItemsForMaintenancePaginated(
          debouncedSearch || undefined,
          MAINTENANCE_ITEMS_PAGE_SIZE
        ),
      ]);
      setTotalCount(countResult);
      setItems(listResult.items);
      lastDocRef.current = listResult.lastDoc;
      setLastDoc(listResult.lastDoc);
    } catch (error) {
      console.error('Error fetching items for maintenance:', error);
      setItems([]);
      setTotalCount(0);
      setLastDoc(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (isOpen) {
      fetchFirstPage();
    }
  }, [isOpen, fetchFirstPage]);

  const handleLoadMore = useCallback(async () => {
    if (!lastDocRef.current || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await listItemsForMaintenancePaginated(
        debouncedSearch || undefined,
        MAINTENANCE_ITEMS_PAGE_SIZE,
        lastDocRef.current
      );
      setItems((prev) => [...prev, ...result.items]);
      lastDocRef.current = result.lastDoc;
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedSearch, loadingMore, hasMore]);

  const handleSelect = useCallback(
    (item: Item) => {
      onSelect(item);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  const isEmpty = !loading && items.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-item-selector-title"
    >
      <div
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white md:max-h-[80vh] md:w-full md:max-w-lg md:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="border-b border-slate-200 px-4 pb-4">
          <div className="flex items-center justify-between">
            <h2
              id="maintenance-item-selector-title"
              className="text-[22px] font-semibold text-slate-900"
            >
              Select Item
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              aria-label="Close"
            >
              <Icon name="x-mark" className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-3 rounded-full bg-slate-100 px-4 py-3">
              <Icon name="magnifying-glass" className="h-5 w-5 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by item name..."
                className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none"
                aria-label="Search items"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
                  aria-label="Clear search"
                >
                  <Icon name="x-mark" className="h-5 w-5 text-slate-400" />
                </button>
              )}
            </div>
            {totalCount != null && (
              <p className="mt-2 text-[13px] text-slate-500">
                Showing {items.length} of {totalCount} items
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <LoadingSpinner className="h-8 w-8 text-blue-800" />
              <p className="mt-4 text-[15px] text-slate-500">Loading items…</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Icon name="cube" className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-[17px] font-semibold text-slate-900">
                {debouncedSearch ? 'No items match your search' : 'No items available'}
              </h3>
              <p className="mt-2 text-[15px] text-slate-500">
                {debouncedSearch
                  ? 'Try a different search term. Only non-consumable items with stock in central store are shown.'
                  : 'Only non-consumable items with stock in central store can be added to maintenance.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isSelected = selectedItemId === item.id;
                const qty = item.centralStoreQuantity || 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full min-h-[48px] items-center gap-3 rounded-[10px] border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-800 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Select ${item.name}, ${qty} ${item.unit} available`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Icon name="cube" className="h-6 w-6 text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-[13px] text-slate-500">
                        SKU: {item.sku} • Available: {qty} {item.unit}
                      </p>
                    </div>
                    {isSelected && (
                      <Icon name="check-circle" className="h-6 w-6 flex-shrink-0 text-green-600" />
                    )}
                  </button>
                );
              })}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <LoadingSpinner className="h-6 w-6 text-blue-800" />
                </div>
              )}
              {hasMore && !loadingMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="w-full py-4 text-center text-[15px] font-medium text-blue-800 hover:underline"
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
