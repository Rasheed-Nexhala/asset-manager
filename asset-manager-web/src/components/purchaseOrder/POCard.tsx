import { Link } from 'react-router-dom';
import { Icon } from '../shared/Icon';
import { POStatusBadge } from './POStatusBadge';
import type { PurchaseOrder } from '../../types/purchaseOrder';

interface POCardProps {
  po: PurchaseOrder;
  to: string;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export function POCard({ po, to }: POCardProps) {
  const itemCount = Array.isArray(po?.items) ? po.items.length : 0;
  const hasAnyPrice = (po?.items ?? []).some(
    (i) => (Number(i.unitPrice) || 0) > 0
  );
  const grrReceipts = po.grrReceipts ?? [];
  const latestGrr =
    grrReceipts.length > 0 ? grrReceipts[grrReceipts.length - 1] : null;
  const moreGrrCount =
    grrReceipts.length > 1 ? grrReceipts.length - 1 : 0;

  return (
    <Link
      to={to}
      className="block rounded-[10px] border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[15px] font-semibold text-slate-900">
          {po.poNumber ?? '—'}
        </span>
        <POStatusBadge status={po.status} />
      </div>

      {latestGrr && (
        <p className="mb-3 text-[13px] text-slate-600">
          GRR: {latestGrr.grrNumber}
          {moreGrrCount > 0 ? ` (+${moreGrrCount} more)` : ''}
        </p>
      )}

      <div className="mb-3 flex gap-4">
        <div className="flex-1">
          <p className="text-[13px] text-slate-500">Vendor</p>
          <p className="text-[15px] text-slate-900">{po.vendorName ?? '—'}</p>
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-slate-500">Items</p>
          <p className="text-[15px] text-slate-900">{itemCount}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
        <div className="flex flex-col">
          <p className="text-[13px] text-slate-500">
            {formatDate(po.createdAt)} • {po.createdByName ?? '—'}
          </p>
          {po.hasPriceUpdates && (
            <span className="mt-1.5 w-max rounded-full bg-amber-600/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-600/30 tracking-wide">
              ⚠️ PRICING ADJUSTED
            </span>
          )}
        </div>
        {hasAnyPrice && (
          <span className="text-[15px] font-semibold text-slate-900">
            {formatCurrency(po.totalAmount ?? 0)}
          </span>
        )}
      </div>
    </Link>
  );
}
