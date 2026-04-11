import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { DocumentSnapshot } from 'firebase/firestore';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { POCard } from '../../components/purchaseOrder/POCard';
import { useAppSelector } from '../../store/hooks';
import {
  selectIsAdminOrSuperAdmin,
  selectIsStoreIncharge,
  selectCanReceivePurchaseOrder,
} from '../../store/selectors/authSelectors';
import { selectVendors } from '../../store/selectors/purchaseOrderSelectors';
import {
  DEFAULT_VENDOR_LEDGER_PAGE_SIZE,
  getPurchaseOrdersCountByVendor,
  listPurchaseOrdersByVendorPaginated,
} from '../../services/firebase/purchaseOrderService';
import { getVendorById } from '../../services/firebase/vendorService';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { Vendor } from '../../types/vendor';
import {
  aggregateVendorLedgerLines,
  getDefaultVendorLedgerMonthRange,
  sumPurchaseOrderTotals,
  type VendorLedgerDateRange,
} from '../../utils/vendorLedgerUtils';

function getPONavigateTo(po: PurchaseOrder, canReceive: boolean): string {
  if (po.status === 'draft') {
    return `/purchase-orders/new?poId=${po.id}`;
  }
  if (po.status === 'pending_approval') {
    return `/purchase-orders/${po.id}/approve`;
  }
  if (
    (po.status === 'approved' ||
      po.status === 'ordered' ||
      po.status === 'partially_received') &&
    canReceive
  ) {
    return `/purchase-orders/${po.id}/receive`;
  }
  if (
    po.status === 'approved' ||
    po.status === 'ordered' ||
    po.status === 'partially_received'
  ) {
    return `/purchase-orders/${po.id}`;
  }
  return `/purchase-orders/${po.id}`;
}

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** `YYYY-MM-DD` for `<input type="date" />` in local calendar. */
function toInputDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseInputDate(val: string): Date {
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function VendorLedgerPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);
  const canReceivePO = useAppSelector(selectCanReceivePurchaseOrder);
  const canAccess = isAdminOrSuperAdmin || isStoreIncharge;

  const vendorsFromStore = useAppSelector(selectVendors);
  const vendorFromStore = useMemo(
    () => (vendorId ? vendorsFromStore.find((v) => v.id === vendorId) : undefined),
    [vendorsFromStore, vendorId]
  );

  const initialMonthRange = useMemo(() => getDefaultVendorLedgerMonthRange(), []);
  const [appliedRange, setAppliedRange] =
    useState<VendorLedgerDateRange>(initialMonthRange);
  const [draftFrom, setDraftFrom] = useState(initialMonthRange.dateFrom);
  const [draftTo, setDraftTo] = useState(initialMonthRange.dateTo);

  const [vendor, setVendor] = useState<Vendor | null>(vendorFromStore ?? null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [totalPoCount, setTotalPoCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab] = useState<'pos' | 'items'>('pos');

  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  const ledgerLines = useMemo(() => aggregateVendorLedgerLines(orders), [orders]);
  const totalValue = useMemo(() => sumPurchaseOrderTotals(orders), [orders]);

  const titleName = vendor?.name ?? vendorFromStore?.name ?? 'Vendor';

  const loadVendor = useCallback(async () => {
    if (!vendorId) return;
    if (vendorFromStore) {
      setVendor(vendorFromStore);
      return;
    }
    const v = await getVendorById(vendorId);
    setVendor(v);
  }, [vendorFromStore, vendorId]);

  const loadInitial = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    lastDocRef.current = null;
    try {
      const [count, page] = await Promise.all([
        getPurchaseOrdersCountByVendor(vendorId, appliedRange),
        listPurchaseOrdersByVendorPaginated(
          vendorId,
          DEFAULT_VENDOR_LEDGER_PAGE_SIZE,
          appliedRange,
          undefined
        ),
      ]);
      setTotalPoCount(count);
      setOrders(page.orders);
      lastDocRef.current = page.lastDoc;
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ledger');
      setOrders([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [vendorId, appliedRange]);

  useEffect(() => {
    void loadVendor();
  }, [loadVendor]);

  useEffect(() => {
    if (vendorFromStore) setVendor(vendorFromStore);
  }, [vendorFromStore]);

  useEffect(() => {
    if (!vendorId) {
      navigate('/vendors', { replace: true });
      return;
    }
    void loadInitial();
  }, [vendorId, loadInitial, navigate]);

  const handleApplyFilter = useCallback(() => {
    setAppliedRange({ dateFrom: draftFrom, dateTo: draftTo });
  }, [draftFrom, draftTo]);

  const handleThisMonth = useCallback(() => {
    const m = getDefaultVendorLedgerMonthRange();
    setDraftFrom(m.dateFrom);
    setDraftTo(m.dateTo);
    setAppliedRange(m);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!vendorId || !hasMore || loadingMore || loading) return;
    const cursor = lastDocRef.current;
    if (!cursor) return;

    setLoadingMore(true);
    setError(null);
    try {
      const page = await listPurchaseOrdersByVendorPaginated(
        vendorId,
        DEFAULT_VENDOR_LEDGER_PAGE_SIZE,
        appliedRange,
        cursor
      );
      setOrders((prev) => [...prev, ...page.orders]);
      lastDocRef.current = page.lastDoc;
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [vendorId, hasMore, loadingMore, loading, appliedRange]);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Icon name="lock-closed" className="h-16 w-16 text-slate-400" />
        <h2 className="mt-4 text-[17px] font-semibold text-slate-900">Access restricted</h2>
        <p className="mt-2 text-[15px] text-slate-500">
          Vendor ledger is available to administrators and store incharge.
        </p>
      </div>
    );
  }

  if (!vendorId) {
    return null;
  }

  if (loading && orders.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <LoadingSpinner size="lg" className="text-blue-800" />
        <p className="mt-4 text-[15px] text-slate-500">Loading ledger…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/vendors"
            className="flex items-center gap-2 text-[15px] font-medium text-slate-600 hover:text-slate-900"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
            Back to vendors
          </Link>
        </div>
        <h1 className="text-[22px] font-semibold text-slate-900">Vendor ledger</h1>
      </div>

      <p className="text-[17px] font-semibold text-slate-900">{titleName}</p>

      <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[17px] font-semibold text-slate-900">Date range</p>
        <p className="mt-1 text-[13px] text-slate-500">
          Default is the current month. Adjust dates and tap Apply.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 gap-1.5">
            <label htmlFor="ledger-from" className="block text-[15px] text-slate-900">
              From
            </label>
            <input
              id="ledger-from"
              type="date"
              value={toInputDateValue(draftFrom)}
              onChange={(e) => setDraftFrom(parseInputDate(e.target.value))}
              className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 px-3 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
          </div>
          <div className="flex-1 gap-1.5">
            <label htmlFor="ledger-to" className="block text-[15px] text-slate-900">
              To
            </label>
            <input
              id="ledger-to"
              type="date"
              value={toInputDateValue(draftTo)}
              onChange={(e) => setDraftTo(parseInputDate(e.target.value))}
              className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 px-3 text-[15px] text-slate-900 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleThisMonth}
            className="flex h-[50px] flex-1 items-center justify-center rounded-[10px] border-2 border-blue-800 text-[15px] font-semibold text-blue-800 transition-colors hover:bg-blue-50"
          >
            This month
          </button>
          <button
            type="button"
            onClick={handleApplyFilter}
            className="flex h-[50px] flex-1 items-center justify-center rounded-[10px] bg-blue-800 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[13px] text-slate-500">POs in range</p>
          <p className="text-[22px] font-bold text-slate-900">{totalPoCount ?? orders.length}</p>
        </div>
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[13px] text-slate-500">Value (loaded)</p>
          <p className="text-[22px] font-bold text-slate-900">{formatCurrency(totalValue)}</p>
        </div>
      </div>
      <p className="text-[12px] text-slate-400">
        Value sums PO totals for rows loaded below; use Load more if the list is long.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('pos')}
          className={`flex-1 rounded-[10px] py-3 text-[15px] font-semibold transition-colors ${
            tab === 'pos'
              ? 'bg-blue-800 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Purchase orders
        </button>
        <button
          type="button"
          onClick={() => setTab('items')}
          className={`flex-1 rounded-[10px] py-3 text-[15px] font-semibold transition-colors ${
            tab === 'items'
              ? 'bg-blue-800 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Items
        </button>
      </div>

      {tab === 'pos' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center rounded-[10px] border border-slate-200 bg-white py-12 text-center">
              <Icon name="document-text" className="h-14 w-14 text-slate-300" />
              <p className="mt-4 text-[17px] font-semibold text-slate-900">
                No purchase orders in this range
              </p>
              <p className="mt-2 max-w-sm text-[15px] text-slate-500">
                Try another date range or use This month.
              </p>
            </div>
          ) : (
            <>
              {orders.map((po) => (
                <POCard key={po.id} po={po} to={getPONavigateTo(po, canReceivePO)} />
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                  className="flex h-[50px] w-full items-center justify-center rounded-[10px] border-2 border-blue-800 text-[15px] font-semibold text-blue-800 transition-colors hover:bg-blue-50 disabled:opacity-60"
                >
                  {loadingMore ? (
                    <LoadingSpinner size="sm" className="text-blue-800" />
                  ) : (
                    'Load more'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-3">
          {ledgerLines.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-slate-500">
              No line items in loaded POs for this range.
            </p>
          ) : (
            ledgerLines.map((line) => (
              <div
                key={line.key}
                className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-[15px] font-semibold text-slate-900">{line.itemName}</p>
                <p className="mt-1 text-[12px] uppercase text-slate-400">SKU: {line.itemSku}</p>
                <div className="mt-3 flex flex-wrap gap-6">
                  <div>
                    <p className="text-[13px] text-slate-500">Ordered</p>
                    <p className="text-[15px] text-slate-900">
                      {line.totalOrdered}
                      {line.unit ? ` ${line.unit}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[13px] text-slate-500">Received</p>
                    <p className="text-[15px] text-slate-900">
                      {line.totalReceived}
                      {line.unit ? ` ${line.unit}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[13px] text-slate-500">Lines</p>
                    <p className="text-[15px] text-slate-900">{line.lineCount}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
