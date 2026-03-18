import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchCategories,
  setFilters,
  setCategories,
} from '../../store/slices/inventorySlice';
import {
  fetchItemsPaginated,
  loadMoreItems,
  exportInventoryThunk,
} from '../../store/thunks/inventoryThunks';
import {
  selectAllItems,
  selectAllCategories,
  selectItemsLoading,
  selectItemsTotalCount,
  selectItemsHasMore,
  selectItemsLoadingMore,
  selectLowStockCount,
} from '../../store/selectors/inventorySelectors';
import { selectIsAdmin, selectIsStoreIncharge } from '../../store/selectors/authSelectors';
import { useInventoryError } from '../../hooks/useInventoryError';
import { subscribeCategories } from '../../services/firebase/categoryService';
import { isLowStock } from '../../utils/inventoryUtils';
import type { ItemFilters, ItemType } from '../../types/inventory';
import type { Category } from '../../types/inventory';
import { InventorySubNav } from '../../components/inventory';
import { ItemCard } from '../../components/inventory/ItemCard';
import { Icon } from '../../components/shared/Icon';
import { InventoryLoadingState } from '../../components/shared/InventoryLoadingState';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

type StockFilter = 'all' | 'low_stock';

interface FilterState {
  categoryId?: string;
  type?: ItemType;
  stock: StockFilter;
}

const toItemFilters = (f: FilterState, searchTerm?: string): ItemFilters => ({
  categoryId: f.categoryId,
  type: f.type,
  lowStockOnly: f.stock === 'low_stock',
  searchTerm: searchTerm || undefined,
});

export function CentralStoreInventoryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const lowStockFromUrl = searchParams.get('lowStockFilter') === 'true';
  const [filters, setLocalFilters] = useState<FilterState>(() => ({
    stock: lowStockFromUrl ? 'low_stock' : 'all',
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const allItems = useAppSelector(selectAllItems);
  const categories = useAppSelector(selectAllCategories);
  const isLoading = useAppSelector(selectItemsLoading);
  const totalCount = useAppSelector(selectItemsTotalCount);
  const hasMore = useAppSelector(selectItemsHasMore);
  const loadingMore = useAppSelector(selectItemsLoadingMore);
  const error = useInventoryError();
  const lowStockCount = useAppSelector(selectLowStockCount);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filters.stock === 'low_stock') {
      items = items.filter((item) => isLowStock(item));
    }
    return items;
  }, [allItems, filters.stock]);

  const filteredLowStockCount = useMemo(
    () => filteredItems.filter((item) => isLowStock(item)).length,
    [filteredItems]
  );

  useEffect(() => {
    if (lowStockFromUrl && filters.stock !== 'low_stock') {
      setLocalFilters((p) => ({ ...p, stock: 'low_stock' }));
    }
  }, [lowStockFromUrl, filters.stock]);

  useEffect(() => {
    const itemFilters = toItemFilters(filters, debouncedSearch);
    dispatch(setFilters(itemFilters));
    dispatch(fetchItemsPaginated());
  }, [dispatch, filters, debouncedSearch]);

  useEffect(() => {
    dispatch(fetchCategories());
    const unsubscribe = subscribeCategories((updated: Category[]) => {
      dispatch(setCategories(updated));
    });
    return () => unsubscribe();
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchItemsPaginated());
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    if (totalCount != null && allItems.length >= totalCount) return;
    dispatch(loadMoreItems());
  }, [dispatch, hasMore, loadingMore, totalCount, allItems.length]);

  const handleAddItem = useCallback(() => navigate('/inventory/add'), [navigate]);
  const handleSteelMaster = useCallback(() => navigate('/inventory/steel-master'), [navigate]);
  const handleCategoryManagement = useCallback(
    () => navigate('/inventory/categories'),
    [navigate]
  );
  const handleMaintenance = useCallback(() => navigate('/maintenance'), [navigate]);
  const handleInventoryUpdateRequests = useCallback(
    () => navigate('/inventory/update-requests'),
    [navigate]
  );
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    await dispatch(exportInventoryThunk());
    setIsExporting(false);
  }, [dispatch]);

  const isInitialOrRefetching =
    allItems.length === 0 && totalCount === null && !error;
  if (isInitialOrRefetching || (isLoading && allItems.length === 0)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <InventorySubNav />
        <InventoryLoadingState message="Loading items..." />
      </div>
    );
  }

  if (error && allItems.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <InventorySubNav />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="exclamation-circle" className="w-20 h-20 text-red-600" />
          <h2 className="text-[22px] font-semibold text-slate-900 mb-2 mt-4">Error</h2>
          <p className="text-[15px] text-red-600 mb-4 text-center">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="bg-blue-800 rounded-[10px] h-[50px] px-6 flex items-center justify-center gap-2 text-white font-semibold"
          >
            <Icon name="arrow-path" className="w-5 h-5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasNoItems = filteredItems.length === 0 && !isLoading;

  return (
    <div className="flex flex-col h-full">
      <InventorySubNav />
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 flex items-center h-14">
        <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Central Store</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-12 h-12 flex items-center justify-center rounded-[10px]"
            aria-label="Export inventory"
          >
            {isExporting ? (
              <LoadingSpinner />
            ) : (
              <Icon name="arrow-down-tray" className="w-5 h-5 text-blue-800" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="w-12 h-12 flex items-center justify-center rounded-[10px]"
            aria-label="Toggle filters"
          >
            <Icon
              name="funnel"
              className={`w-5 h-5 ${showFilters ? 'text-blue-800' : 'text-slate-500'}`}
            />
          </button>
          <button
            type="button"
            onClick={handleAddItem}
            className="w-12 h-12 flex items-center justify-center rounded-[10px]"
            aria-label="Add new item"
          >
            <Icon name="plus-circle" className="w-5 h-5 text-blue-800" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-12 h-12 flex items-center justify-center rounded-[10px] hover:bg-slate-100 transition-colors"
              aria-label="More options"
              aria-expanded={showMoreMenu}
            >
              <Icon name="ellipsis-vertical" className="w-5 h-5 text-blue-800" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg hidden md:block">
                <MoreOptionsMenuItems
                  isAdmin={isAdmin}
                  isStoreIncharge={isStoreIncharge}
                  onClose={() => setShowMoreMenu(false)}
                  onInventoryUpdateRequests={handleInventoryUpdateRequests}
                  onMaintenance={handleMaintenance}
                  onSteelMaster={handleSteelMaster}
                  onCategoryManagement={handleCategoryManagement}
                  variant="compact"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3">
        <div className="bg-slate-100 rounded-full h-12 px-4 flex items-center gap-3">
          <Icon name="magnifying-glass" className="w-5 h-5 text-slate-400" />
          <input
            type="search"
            placeholder="Search items by name, SKU, or category..."
            className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search items"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-8 h-8 flex items-center justify-center"
              aria-label="Clear search"
            >
              <Icon name="x-mark" className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[15px] text-slate-900 mb-1.5">Category</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="All"
                  active={!filters.categoryId}
                  onClick={() => setLocalFilters((p) => ({ ...p, categoryId: undefined }))}
                />
                <FilterChip
                  label="Uncategorized"
                  active={filters.categoryId === ''}
                  onClick={() => setLocalFilters((p) => ({ ...p, categoryId: '' }))}
                />
                {categories.map((cat) => (
                  <FilterChip
                    key={cat.id}
                    label={cat.name}
                    active={filters.categoryId === cat.id}
                    onClick={() => setLocalFilters((p) => ({ ...p, categoryId: cat.id }))}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[15px] text-slate-900 mb-1.5">Type</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="All"
                  active={!filters.type}
                  onClick={() => setLocalFilters((p) => ({ ...p, type: undefined }))}
                />
                <FilterChip
                  label="Consumable"
                  active={filters.type === 'consumable'}
                  onClick={() => setLocalFilters((p) => ({ ...p, type: 'consumable' }))}
                />
                <FilterChip
                  label="Non-Consumable"
                  active={filters.type === 'non_consumable'}
                  onClick={() => setLocalFilters((p) => ({ ...p, type: 'non_consumable' }))}
                />
                <FilterChip
                  label="Fuel"
                  active={filters.type === 'fuel'}
                  onClick={() => setLocalFilters((p) => ({ ...p, type: 'fuel' }))}
                />
              </div>
            </div>
            <div>
              <p className="text-[15px] text-slate-900 mb-1.5">Stock Level</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="All"
                  active={filters.stock === 'all'}
                  onClick={() => setLocalFilters((p) => ({ ...p, stock: 'all' }))}
                />
                <FilterChip
                  label="Low Stock"
                  active={filters.stock === 'low_stock'}
                  onClick={() => setLocalFilters((p) => ({ ...p, stock: 'low_stock' }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-600/15 px-4 py-3 mx-4 mt-4 rounded-lg flex items-center gap-3">
          <Icon name="exclamation-circle" className="w-6 h-6 text-red-600" />
          <p className="text-[15px] text-red-600 flex-1">{error}</p>
        </div>
      )}

      {hasNoItems ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Icon name="cube" className="w-20 h-20 text-slate-400" />
          <h2 className="text-[22px] font-semibold text-slate-900 text-center mb-2 mt-4">
            {searchQuery || filters.categoryId || filters.type || filters.stock !== 'all'
              ? 'No Items Match Filters'
              : 'No Items Yet'}
          </h2>
          <p className="text-[15px] text-slate-500 text-center mb-6">
            {searchQuery
              ? 'No items match your search. Try a different search term.'
              : filters.categoryId || filters.type || filters.stock !== 'all'
              ? 'Try adjusting your filters to see more items.'
              : 'Get started by adding your first inventory item.'}
          </p>
          {!searchQuery && !(filters.categoryId || filters.type || filters.stock !== 'all') && (
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-blue-800 rounded-[10px] h-[50px] px-6 flex items-center justify-center text-[15px] font-semibold text-white"
            >
              Add First Item
            </button>
          )}
        </div>
      ) : (
          <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 md:hidden p-4 md:p-6 pb-24">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          <div className="hidden md:block p-4 md:p-6">
            <div className="bg-white rounded-[10px] border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold text-slate-900">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-[13px] font-semibold text-slate-900">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/inventory/${item.id}`}
                          className="text-[15px] font-semibold text-blue-800 hover:underline"
                        >
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[15px] text-slate-700">{item.sku}</td>
                      <td className="px-4 py-3 text-[15px] text-slate-700">
                        {item.categoryName || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-3 text-[15px] text-slate-700">{item.unit}</td>
                      <td className="px-4 py-3 text-[15px] text-slate-700">
                        {{ consumable: 'Consumable', non_consumable: 'Non-Consumable', fuel: 'Fuel' }[item.type]}
                      </td>
                      <td className="px-4 py-3 text-right text-[15px] font-medium text-slate-900">
                        {item.totalQuantity} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load more - only when there is more to load */}
          {hasMore && (totalCount == null || allItems.length < totalCount) && (
            <div className="flex justify-center py-4">
              {loadingMore ? (
                <LoadingSpinner className="h-6 w-6 text-blue-800" />
              ) : (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="px-6 py-2 rounded-lg bg-blue-800/10 text-[15px] font-medium text-blue-800 hover:bg-blue-800/20"
                  aria-label="Load more items"
                >
                  Load more
                </button>
              )}
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 md:relative bg-white border-t md:border-t-0 border-slate-200 px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] text-slate-500">
                {totalCount != null ? (
                  <>
                    Showing <span className="font-semibold text-slate-900">{filteredItems.length}</span> of{' '}
                    <span className="font-semibold text-slate-900">{totalCount}</span>
                  </>
                ) : (
                  <span className="font-semibold text-slate-900">{filteredItems.length}</span>
                )}{' '}
                items
              </p>
              {filteredLowStockCount > 0 && (
                <span className="px-2 py-1 rounded-full bg-amber-600/15 text-[12px] font-medium text-amber-600">
                  {filteredLowStockCount} Low Stock
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {showMoreMenu && (
        <>
          {/* Desktop: invisible overlay to close on click outside */}
          <div
            className="hidden md:block fixed inset-0 z-40"
            aria-hidden
            onClick={() => setShowMoreMenu(false)}
          />
          {/* Mobile: bottom sheet overlay */}
          <div className="fixed inset-0 z-50 flex md:hidden" aria-hidden>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMoreMenu(false)}
            aria-hidden
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8">
            <div className="w-10 h-1 bg-slate-300 rounded-full self-center mb-4 md:hidden" />
            <h2 className="text-[22px] font-semibold text-slate-900 mb-4 px-2">More Options</h2>
            <MoreOptionsMenuItems
              isAdmin={isAdmin}
              isStoreIncharge={isStoreIncharge}
              onClose={() => setShowMoreMenu(false)}
              onInventoryUpdateRequests={handleInventoryUpdateRequests}
              onMaintenance={handleMaintenance}
              onSteelMaster={handleSteelMaster}
              onCategoryManagement={handleCategoryManagement}
              variant="full"
            />
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function MoreOptionsMenuItems({
  isAdmin,
  isStoreIncharge,
  onClose,
  onInventoryUpdateRequests,
  onMaintenance,
  onSteelMaster,
  onCategoryManagement,
  variant = 'full',
}: {
  isAdmin: boolean;
  isStoreIncharge: boolean;
  onClose: () => void;
  onInventoryUpdateRequests: () => void;
  onMaintenance: () => void;
  onSteelMaster: () => void;
  onCategoryManagement: () => void;
  variant?: 'full' | 'compact';
}) {
  const itemClass =
    variant === 'compact'
      ? 'flex items-center gap-2 px-4 py-2 text-[15px] text-slate-700 hover:bg-slate-50 w-full text-left'
      : 'flex items-center px-4 py-3 rounded-xl bg-slate-50 text-left w-full';
  const iconClass = variant === 'compact' ? 'w-5 h-5 text-blue-800 shrink-0' : 'w-6 h-6 text-blue-800 mr-3';

  return (
    <div className={variant === 'compact' ? 'flex flex-col' : 'flex flex-col gap-2'}>
      {isAdmin && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onInventoryUpdateRequests();
          }}
          className={itemClass}
        >
          <Icon name="document-text" className={iconClass} />
          <span className="text-[15px] font-medium text-slate-900">Inventory Update Requests</span>
        </button>
      )}
      {(isAdmin || isStoreIncharge) && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onMaintenance();
          }}
          className={itemClass}
        >
          <Icon name="wrench-screwdriver" className={iconClass} />
          <span className="text-[15px] font-medium text-slate-900">Maintenance</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onClose();
          onSteelMaster();
        }}
        className={itemClass}
      >
        <Icon name="chart-bar-square" className={iconClass} />
        <span className="text-[15px] font-medium text-slate-900">Custom Items</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          onCategoryManagement();
        }}
        className={itemClass}
      >
        <Icon name="swatch" className={iconClass} />
        <span className="text-[15px] font-medium text-slate-900">Manage Categories</span>
      </button>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border min-h-[48px] flex items-center justify-center text-[13px] font-medium ${
        active ? 'bg-blue-800 border-blue-800 text-white' : 'bg-white border-slate-200 text-slate-500'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
