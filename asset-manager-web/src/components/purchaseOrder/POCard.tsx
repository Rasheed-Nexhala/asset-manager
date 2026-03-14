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

      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
        <p className="text-[13px] text-slate-500">
          {formatDate(po.createdAt)} • {po.createdByName ?? '—'}
        </p>
        {hasAnyPrice && (
          <span className="text-[15px] font-semibold text-slate-900">
            {formatCurrency(po.totalAmount ?? 0)}
          </span>
        )}
      </div>
    </Link>
  );
}
