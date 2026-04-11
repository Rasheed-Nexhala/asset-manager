import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import {
  POStatusBadge,
  PODocumentCard,
  GrrReceiptsList,
} from '../../components/purchaseOrder';
import { useAppSelector } from '../../store/hooks';
import { selectPOById } from '../../store/selectors/purchaseOrderSelectors';
import {
  selectIsAdminOrSuperAdmin,
  selectIsSuperAdmin,
  selectUserId,
  selectCanReceivePurchaseOrder,
} from '../../store/selectors/authSelectors';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import type { PurchaseOrder } from '../../types/purchaseOrder';

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (n: number) =>
  `\u20B9${n.toLocaleString('en-IN')}`;
const formatCurrencyOrOptional = (n: number) =>
  n > 0 ? formatCurrency(n) : '—';
const formatGstOrOptional = (pct: number | undefined) =>
  pct != null && pct > 0 ? `${pct}%` : '—';

export function PurchaseOrderDetailPage() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const poFromStore = useAppSelector((state) =>
    poId ? selectPOById(poId)(state) : null
  );
  const userId = useAppSelector(selectUserId);
  const isAdminOrSuperAdmin = useAppSelector(selectIsAdminOrSuperAdmin);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const canReceivePO = useAppSelector(selectCanReceivePurchaseOrder);

  /** Loaded when PO is not yet in Redux (e.g. deep link). */
  const [fetchedPo, setFetchedPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(() => Boolean(poId && !poFromStore));
  const [loadError, setLoadError] = useState<string | null>(null);

  const po: PurchaseOrder | null = poFromStore ?? fetchedPo;

  useEffect(() => {
    if (!poId) {
      setFetchedPo(null);
      setLoadError(null);
      return;
    }
    if (poFromStore?.id === poId) {
      setLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setFetchedPo(null);
    getPOById(poId)
      .then((p) => {
        if (cancelled) return;
        setFetchedPo(p);
        if (!p) setLoadError('Purchase order not found');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFetchedPo(null);
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load purchase order'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [poId, poFromStore?.id]);

  if (loading || !po) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[15px] font-medium text-slate-600 hover:text-slate-900"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
          Back
        </button>
        <div className="flex flex-col items-center justify-center py-16">
          {loading ? (
            <>
              <LoadingSpinner className="h-10 w-10 text-blue-800" />
              <p className="mt-4 text-[15px] text-slate-500">
                Loading purchase order...
              </p>
            </>
          ) : loadError ? (
            <>
              <Icon name="exclamation-circle" className="h-16 w-16 text-red-600" />
              <h2 className="mt-4 text-[17px] font-semibold text-slate-900">
                Could not load purchase order
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">{loadError}</p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-[10px] border border-slate-200 px-6 py-3 text-[15px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Go Back
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  const hasAnyPrice = (po.items ?? []).some(
    (i) => (Number(i.unitPrice) || 0) > 0
  );

  const assignedId = po.assignedToAdminId?.trim() ?? '';
  const canApprove =
    po.status === 'pending_approval' &&
    isAdminOrSuperAdmin &&
    (isSuperAdmin || !assignedId || assignedId === userId);
  const canReceive =
    (po.status === 'approved' || po.status === 'ordered' || po.status === 'partially_received') &&
    canReceivePO;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[15px] font-medium text-slate-600 hover:text-slate-900"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
          Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <Link
              to={`/purchase-orders/${po.id}/approve`}
              className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-green-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-green-700"
            >
              <Icon name="check-circle" className="h-5 w-5" />
              Approve
            </Link>
          )}
          {canReceive && (
            <Link
              to={`/purchase-orders/${po.id}/receive`}
              className="flex h-[50px] items-center justify-center gap-2 rounded-[10px] bg-blue-800 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900"
            >
              Receive
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900">
              {po.poNumber ?? '—'}
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Submitted by {po.createdByName} • {formatDate(po.createdAt)}
            </p>
            {(po.hasPriceUpdates ||
              po.items.some(
                (i) =>
                  i.receivedUnitPrice != null &&
                  i.receivedUnitPrice !== i.unitPrice
              )) && (
              <p className="mt-3 w-max rounded-full border border-amber-600/30 bg-amber-600/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                Pricing adjusted at receipt — totals reflect actual received prices
              </p>
            )}
          </div>
          <POStatusBadge status={po.status} />
        </div>
      </div>

      {(po.grrReceipts?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
          <GrrReceiptsList receipts={po.grrReceipts} />
        </div>
      )}

      {/* Vendor */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
        <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">Vendor</h2>
        <p className="text-[15px] font-semibold text-[#0F172A]">{po.vendorName}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[13px] text-[#64748B]">
          <span className="inline-flex items-center gap-1">
            <Icon name="phone" className="h-4 w-4 shrink-0" />
            {po.vendorContact}
          </span>
          {po.vendorEmail?.trim() ? (
            <span>
              <span className="text-[#94A3B8]"> · </span>
              {po.vendorEmail}
            </span>
          ) : null}
        </p>
      </div>

      {/* Items */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
        <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">Items</h2>
        <div className="space-y-3">
          {po.items.map((item, i) => {
            const lineTotal =
              item.amount +
              (item.gstAmount ??
                Math.round((item.amount * (item.gstPercentage ?? 0)) / 100));
            const qtyStr =
              item.orderedQuantity != null && item.orderedUnit
                ? `${item.orderedQuantity} ${item.orderedUnit}`
                : `${item.quantity} ${item.unit || 'Pcs'}`;
            const priceLogs = item.priceChangeLog ?? [];
            return (
              <div
                key={item.itemId + i}
                className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
              >
                <p className="text-[15px] font-semibold text-[#0F172A]">
                  {item.itemName}
                </p>
                <p className="mt-1 text-[13px] text-[#64748B]">
                  {qtyStr} · {formatCurrencyOrOptional(item.unitPrice ?? 0)} · GST{' '}
                  {formatGstOrOptional(item.gstPercentage)} ·{' '}
                  <span className="font-medium text-[#0F172A]">
                    {formatCurrencyOrOptional(lineTotal)}
                  </span>
                </p>
                {((item.originalUnitPrice != null &&
                  item.originalUnitPrice !== item.unitPrice) ||
                  (item.receivedUnitPrice != null &&
                    item.receivedUnitPrice !== item.unitPrice)) && (
                    <p className="mt-1 text-[12px] text-slate-500">
                      {item.originalUnitPrice != null
                        ? `Approved PO unit price was ${formatCurrencyOrOptional(
                            item.originalUnitPrice
                          )}`
                        : `Ordered unit price was ${formatCurrencyOrOptional(
                            item.unitPrice
                          )}, received at ${formatCurrencyOrOptional(
                            item.receivedUnitPrice ?? item.unitPrice
                          )}`}
                    </p>
                  )}
                {(priceLogs.length > 0 ||
                  (po.status === 'received' &&
                    item.receivedUnitPrice != null &&
                    item.receivedUnitPrice !== item.unitPrice)) && (
                  <div className="mt-2 rounded-lg border border-amber-600/25 bg-amber-600/10 px-3 py-2">
                    <p className="text-[12px] font-semibold text-amber-900">
                      Price changes at receipt
                    </p>
                    {priceLogs.length > 0 ? (
                      <ul className="mt-1.5 list-inside list-disc space-y-1 text-[12px] text-amber-950/90">
                        {priceLogs.map((log, li) => (
                          <li key={li}>
                            {new Date(log.date).toLocaleDateString('en-IN')} — Qty{' '}
                            {log.quantityAffected} @ {formatCurrency(log.newPrice)}{' '}
                            (was {formatCurrency(log.oldPrice)}, {log.receivedByName})
                          </li>
                        ))}
                      </ul>
                    ) : item.receivedUnitPrice != null ? (
                      <p className="mt-1.5 text-[12px] text-amber-950/90">
                        Received at {formatCurrency(item.receivedUnitPrice)}, was{' '}
                        {formatCurrency(item.unitPrice)} when ordered (mobile receipt)
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Verification Summary for Received POs */}
      {po.status === 'received' && hasAnyPrice && (() => {
        const hasWebPriceData = po.hasPriceUpdates || po.items.some(item => item.originalUnitPrice != null);
        const hasMobilePriceData = po.items.some(item => 
          item.receivedUnitPrice != null && item.receivedUnitPrice !== item.unitPrice
        );
        const hasAnyPriceData = hasWebPriceData || hasMobilePriceData;

        // Calculate ordered total (expected cost for the received quantity at original prices)
        const orderedTotal = po.items.reduce((sum, item) => {
          const basePrice = item.originalUnitPrice ?? item.unitPrice;
          const qty = item.receivedQuantity ?? item.quantity;
          const amount = qty * basePrice;
          const gst = item.gstPercentage ? Math.round((amount * item.gstPercentage) / 100) : 0;
          return sum + amount + gst;
        }, 0);

        // Calculate received total (using actual historical receipt prices where available)
        const receivedTotal = po.items.reduce((sum, item) => {
          let amount = 0;
          
          if (po.grrReceipts && po.grrReceipts.length > 0) {
            // Sum up exact received amounts from GRR history
            let itemReceivedSum = 0;
            let itemReceivedQty = 0;
            for (const grr of po.grrReceipts) {
              const line = grr.lineItems?.find(l => l.itemId === item.itemId);
              if (line && line.quantityReceived > 0) {
                const price = line.unitPrice ?? item.originalUnitPrice ?? item.unitPrice;
                itemReceivedSum += line.quantityReceived * price;
                itemReceivedQty += line.quantityReceived;
              }
            }
            
            // If there's a discrepancy between grr sum and receivedQuantity, 
            // fallback to proportional for the remainder (legacy data guard)
            const remainingQty = Math.max(0, (item.receivedQuantity ?? item.quantity) - itemReceivedQty);
            if (remainingQty > 0) {
              const fallbackPrice = item.receivedUnitPrice ?? item.unitPrice;
              itemReceivedSum += remainingQty * fallbackPrice;
            }
            amount = itemReceivedSum;
          } else {
            // Legacy fallback if no GRR history
            let effectivePrice = item.unitPrice;
            let effectiveQty = item.receivedQuantity ?? item.quantity;
            if (item.receivedUnitPrice != null) {
              effectivePrice = item.receivedUnitPrice;
            }
            amount = effectiveQty * effectivePrice;
          }
          
          const gst = item.gstPercentage ? Math.round((amount * item.gstPercentage) / 100) : 0;
          return sum + amount + gst;
        }, 0);

        return (
          <div className="rounded-[10px] border border-blue-800/30 bg-blue-800/10 p-4 lg:p-6">
            <h2 className="mb-3 text-[17px] font-semibold text-blue-900">
              Receipt Price Verification
            </h2>
            {hasAnyPriceData ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[15px] text-slate-700">Ordered Total (incl. GST)</span>
                  <span className="text-[15px] text-slate-900">
                    {formatCurrency(orderedTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[15px] text-slate-700">Received Total (incl. GST)</span>
                  <span className="text-[15px] text-slate-900">
                    {formatCurrency(receivedTotal)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-blue-800/20 pt-2">
                  <span className="text-[15px] font-semibold text-slate-900">
                    Difference
                  </span>
                  <span className={`text-[15px] font-semibold ${
                    receivedTotal === orderedTotal 
                      ? 'text-green-600' 
                      : receivedTotal > orderedTotal 
                      ? 'text-red-600' 
                      : 'text-blue-600'
                  }`}>
                    {receivedTotal === orderedTotal 
                      ? 'No difference' 
                      : `${receivedTotal > orderedTotal ? '+' : ''}${formatCurrency(receivedTotal - orderedTotal)}`
                    }
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-slate-600 leading-5">
                No receive-time unit prices are stored for this PO. This usually means it was 
                received before price verification was implemented, or the received prices 
                matched the ordered prices exactly. The totals shown reflect the ordered amounts.
              </p>
            )}
          </div>
        );
      })()} 

      {/* Standard Summary */}
      {hasAnyPrice && (
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
          <div className="space-y-2">
            {(po.hasPriceUpdates ||
              po.items.some(
                (i) =>
                  i.receivedUnitPrice != null &&
                  i.receivedUnitPrice !== i.unitPrice
              )) && (
              <p className="mb-2 text-[13px] text-amber-800">
                Subtotal, GST, and total include adjustments from goods receipts.
              </p>
            )}
            <div className="flex justify-between">
              <span className="text-[15px] text-slate-500">Subtotal</span>
              <span className="text-[15px] text-slate-900">
                {formatCurrencyOrOptional(po.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[15px] text-slate-500">Total GST</span>
              <span className="text-[15px] text-slate-900">
                {formatCurrencyOrOptional(po.gstAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-[15px] font-semibold text-slate-900">
                Total
              </span>
              <span className="text-[15px] text-slate-900">
                {formatCurrencyOrOptional(po.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Justification */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
        <p className="text-[13px] text-[#64748B]">
          Justification
        </p>
        <p className="mt-1 text-[15px] text-[#0F172A]">
          {po.justification || '—'}
        </p>
      </div>

      {/* Attached Documents */}
      {(po.documents?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
          <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">
            Documents
          </h2>
          <div className="space-y-3">
            {po.documents!.map((doc, i) => (
              <PODocumentCard
                key={`${doc.fileUrl}-${i}`}
                fileName={doc.fileName}
                fileUrl={doc.fileUrl}
                type={doc.type}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
