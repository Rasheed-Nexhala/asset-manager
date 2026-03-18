import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { POStatusBadge, PODocumentCard } from '../../components/purchaseOrder';
import { useAppSelector } from '../../store/hooks';
import { selectPOById } from '../../store/selectors/purchaseOrderSelectors';
import { selectIsAdmin, selectIsStoreIncharge } from '../../store/selectors/authSelectors';
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

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;
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
  const isAdmin = useAppSelector(selectIsAdmin);
  const isStoreIncharge = useAppSelector(selectIsStoreIncharge);

  const [po, setPo] = useState<PurchaseOrder | null>(poFromStore ?? null);
  const [loading, setLoading] = useState(!poFromStore && !!poId);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!poId) return;
    if (poFromStore?.id === poId) {
      setPo(poFromStore);
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    getPOById(poId)
      .then((p) => {
        setPo(p);
        if (!p) setLoadError('Purchase order not found');
      })
      .catch((err: unknown) => {
        setPo(null);
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load purchase order'
        );
      })
      .finally(() => setLoading(false));
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

  const canApprove = po.status === 'pending_approval' && isAdmin;
  const canReceive =
    (po.status === 'approved' || po.status === 'ordered' || po.status === 'partially_received') &&
    (isAdmin || isStoreIncharge);

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
          </div>
          <POStatusBadge status={po.status} />
        </div>
      </div>

      {/* Vendor */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
        <h2 className="mb-3 text-[17px] font-semibold text-slate-900">VENDOR</h2>
        <p className="text-[15px] text-slate-900">{po.vendorName}</p>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-slate-500">
          <Icon name="phone" className="h-4 w-4" />
          {po.vendorContact}
        </p>
        {po.vendorEmail && (
          <p className="mt-4 text-[13px] text-slate-500">{po.vendorEmail}</p>
        )}
      </div>

      {/* Items */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
        <h2 className="mb-3 text-[17px] font-semibold text-slate-900">ITEMS</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 text-left text-[13px] font-medium text-slate-500">
                  Item
                </th>
                <th className="pb-2 text-left text-[13px] font-medium text-slate-500">
                  Qty
                </th>
                <th className="pb-2 text-right text-[13px] font-medium text-slate-500">
                  Unit Price
                </th>
                <th className="pb-2 text-right text-[13px] font-medium text-slate-500">
                  GST %
                </th>
                <th className="pb-2 text-right text-[13px] font-medium text-slate-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, i) => (
                <tr
                  key={item.itemId + i}
                  className={`border-b border-slate-100 last:border-b-0 ${
                    i === po.items.length - 1 ? '' : ''
                  }`}
                >
                  <td className="py-3">
                    <p className="text-[15px] font-medium text-slate-900 truncate max-w-[200px]">
                      {item.itemName}
                    </p>
                  </td>
                  <td className="py-3 text-[15px] text-slate-900">
                    {item.orderedQuantity != null && item.orderedUnit
                      ? `${item.orderedQuantity} ${item.orderedUnit}`
                      : `${item.quantity} ${item.unit || 'Pcs'}`}
                  </td>
                  <td className="py-3 text-right text-[15px] text-slate-900">
                    {formatCurrencyOrOptional(item.unitPrice ?? 0)}
                  </td>
                  <td className="py-3 text-right text-[15px] text-slate-900">
                    {formatGstOrOptional(item.gstPercentage)}
                  </td>
                  <td className="py-3 text-right text-[15px] font-semibold text-slate-900">
                    {formatCurrencyOrOptional(
                      item.amount +
                        (item.gstAmount ??
                          Math.round((item.amount * (item.gstPercentage ?? 0)) / 100))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {hasAnyPrice && (
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
          <div className="space-y-2">
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
              <span className="text-[15px] font-semibold text-slate-900">
                {formatCurrencyOrOptional(po.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Justification */}
      <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
        <p className="text-[13px] text-slate-500">
          Justification
        </p>
        <p className="mt-1 text-[15px] text-slate-900">
          {po.justification || '—'}
        </p>
      </div>

      {/* Attached Documents */}
      {(po.documents?.length ?? 0) > 0 && (
        <div className="rounded-[10px] border border-slate-200 bg-white p-4 lg:p-6">
          <h2 className="mb-1 text-[17px] font-semibold text-slate-900">
            ATTACHED DOCUMENTS
          </h2>
          <p className="mb-3 text-[13px] text-slate-500">
            Invoice and bills attached at receipt
          </p>
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
