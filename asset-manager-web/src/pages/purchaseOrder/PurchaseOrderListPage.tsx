import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { POCard } from '../../components/purchaseOrder/POCard';
import { POStatusBadge } from '../../components/purchaseOrder/POStatusBadge';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setFilters,
  clearError,
} from '../../store/slices/purchaseOrderSlice';
import {
  fetchPurchaseOrdersPaginated,
  loadMorePurchaseOrders,
  exportPurchaseOrdersThunk,
} from '../../store/thunks/purchaseOrderThunks';
import {
  selectFilteredPurchaseOrdersForViewer,
  selectPurchaseOrderLoading,
  selectPurchaseOrderLoadingMore,
  selectPurchaseOrderFilters,
  selectPurchaseOrderTotalCount,
  selectVisiblePurchaseOrderCount,
  selectPurchaseOrderHasMore,
  selectPurchaseOrderError,
} from '../../store/selectors/purchaseOrderSelectors';
import type { PurchaseOrder } from '../../types/purchaseOrder';

function getPONavigateTo(po: PurchaseOrder): string {
  if (po.status === 'draft') {
    return `/purchase-orders/new?poId=${po.id}`;
  }
  if (po.status === 'pending_approval') {
    return `/purchase-orders/${po.id}/approve`;
  }
  if (
    po.status === 'approved' ||
    po.status === 'ordered' ||
    po.status === 'partially_received'
  ) {
    return `/purchase-orders/${po.id}/receive`;
  }
  return `/purchase-orders/${po.id}`;
}

export function PurchaseOrderListPage() {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const orders = useAppSelector((state) =>
    selectFilteredPurchaseOrdersForViewer(state, searchQuery)
  );
  const isLoading = useAppSelector(selectPurchaseOrderLoading);
  const loadingMore = useAppSelector(selectPurchaseOrderLoadingMore);
  const totalCount = useAppSelector(selectPurchaseOrderTotalCount);
  const visibleTotalCount = useAppSelector(selectVisiblePurchaseOrderCount);
  const hasMore = useAppSelector(selectPurchaseOrderHasMore);
  const error = useAppSelector(selectPurchaseOrderError);
  const filters = useAppSelector(selectPurchaseOrderFilters);

  useEffect(() => {
    dispatch(fetchPurchaseOrdersPaginated());
  }, [dispatch, filters.status, retryTrigger]);

  useAutoClearError(error, () => dispatch(clearError()));

  const handleRetry = useCallback(() => {
    dispatch(clearError());
    setRetryTrigger((t) => t + 1);
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    dispatch(loadMorePurchaseOrders());
  }, [dispatch, hasMore, loadingMore]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    await dispatch(exportPurchaseOrdersThunk());
    setIsExporting(false);
  }, [dispatch]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const isInitialOrRefetching =
    orders.length === 0 && totalCount === null && !error;

  if (isInitialOrRefetching || (isLoading && orders.length === 0)) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <h1 className="text-[22px] font-semibold text-slate-900">
            Purchase Orders
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] border border-slate-200 px-6 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {isExporting ? (
                <LoadingSpinner className="h-5 w-5" />
              ) : (
                <Icon name="arrow-down-tray" className="h-5 w-5" />
              )}
              Export
            </button>
            <Link
              to="/purchase-orders/new"
              className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
            >
              <Icon name="plus" className="h-5 w-5" />
              New
            </Link>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <LoadingSpinner className="h-10 w-10 text-blue-800" />
          <p className="mt-4 text-[15px] text-slate-500">
            Loading purchase orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-[22px] font-semibold text-slate-900">
          Purchase Orders
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] border border-slate-200 px-6 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {isExporting ? (
              <LoadingSpinner className="h-5 w-5" />
            ) : (
              <Icon name="arrow-down-tray" className="h-5 w-5" />
            )}
            Export
          </button>
          <Link
            to="/purchase-orders/new"
            className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
          >
            <Icon name="plus" className="h-5 w-5" />
            New
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-600/30 bg-red-600/15 px-4 py-3">
          <p className="flex-1 text-[14px] text-red-600">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="ml-2 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3 rounded-full bg-slate-100 px-4 py-3">
          <Icon name="magnifying-glass" className="h-5 w-5 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by PO number, vendor, justification, or item..."
            className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none"
            aria-label="Search purchase orders"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
              aria-label="Clear search"
            >
              <Icon name="x-mark" className="h-5 w-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      {visibleTotalCount > 0 && (
        <p className="text-[13px] text-slate-500">
          {searchQuery.trim()
            ? `Showing ${orders.length} of ${visibleTotalCount} purchase orders`
            : `${visibleTotalCount} purchase order${visibleTotalCount === 1 ? '' : 's'}`}
        </p>
      )}

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-slate-500">Status:</span>
        {[
          { value: 'all', label: 'All' },
          { value: 'pending_approval', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'received', label: 'Received' },
          { value: 'partially_received', label: 'Partial' },
          { value: 'draft', label: 'Draft' },
          { value: 'rejected', label: 'Rejected' },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => dispatch(setFilters({ status: value }))}
            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
              filters.status === value
                ? 'border-blue-800 bg-blue-800 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Icon
            name="document-text"
            className="h-20 w-20 text-slate-400"
          />
          <h2 className="mt-4 text-[22px] font-semibold text-slate-900">
            {error
              ? 'Could not load purchase orders'
              : searchQuery.trim()
                ? 'No purchase orders match your search'
                : 'No Purchase Orders'}
          </h2>
          <p className="mt-2 text-[15px] text-slate-500">
            {error
              ? 'Check your connection and tap Retry above.'
              : searchQuery.trim()
                ? 'No purchase orders match your search. Try different keywords.'
                : filters.status !== 'all'
                  ? 'Try adjusting your filters to see more orders.'
                  : 'Create your first purchase order to get started.'}
          </p>
          {(filters.status === 'all' || error) && !searchQuery.trim() && (
            <Link
              to="/purchase-orders/new"
              className="mt-6 flex h-[50px] items-center justify-center rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
            >
              Create Purchase Order
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop: Table */}
          <div className="hidden overflow-hidden rounded-[10px] border border-slate-200 bg-white md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500">
                    PO Number
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-slate-500">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-[13px] font-medium text-slate-500">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr
                    key={po.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={getPONavigateTo(po)}
                        className="text-[15px] font-semibold text-blue-800 hover:underline"
                      >
                        {po.poNumber ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[15px] text-slate-900">
                      {po.vendorName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[15px] text-slate-900">
                      {Array.isArray(po.items) ? po.items.length : 0}
                    </td>
                    <td className="px-4 py-3">
                      <POStatusBadge status={po.status} />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">
                      {new Date(po.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      • {po.createdByName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[15px] font-semibold text-slate-900">
                      {(po?.items ?? []).some((i) => (Number(i.unitPrice) || 0) > 0)
                        ? `₹${(po.totalAmount ?? 0).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((po) => (
              <POCard key={po.id} po={po} to={getPONavigateTo(po)} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-4">
              {loadingMore ? (
                <LoadingSpinner className="h-6 w-6 text-blue-800" />
              ) : (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="text-[15px] font-medium text-blue-800 hover:underline"
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
