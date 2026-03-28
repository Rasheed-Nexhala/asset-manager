import type { PurchaseOrder } from '../../types/purchaseOrder';

type GrrReceipt = NonNullable<PurchaseOrder['grrReceipts']>[number];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface GrrReceiptsListProps {
  receipts: PurchaseOrder['grrReceipts'];
  /** e.g. mb-3 for spacing under heading */
  className?: string;
}

/**
 * Receipt history: one card per GRR, line items as name + qty (scannable, minimal labels).
 */
export function GrrReceiptsList({ receipts, className = '' }: GrrReceiptsListProps) {
  const list = receipts ?? [];
  if (list.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="mb-3 text-[17px] font-semibold text-[#0F172A]">Receipts</h2>
      <ul className="space-y-3">
        {list.map((r: GrrReceipt) => (
          <li
            key={`${r.grrNumber}-${r.receivedAt}`}
            className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-3"
          >
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <span className="text-[15px] font-semibold text-[#0F172A]">
                {r.grrNumber}
              </span>
              <span className="text-[13px] text-[#64748B]">
                {formatDate(r.receivedAt)} · {r.receivedByName?.trim() || '—'}
              </span>
            </div>
            {r.lineItems && r.lineItems.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-[#E2E8F0] pt-2">
                {r.lineItems.map((li) => (
                  <li
                    key={`${r.grrNumber}-${li.itemId}`}
                    className="flex flex-row items-baseline justify-between gap-3 text-[15px]"
                  >
                    <span className="min-w-0 flex-1 font-medium text-[#0F172A]">
                      {li.itemName}
                    </span>
                    <span className="shrink-0 tabular-nums text-[#64748B]">
                      {li.quantityReceived} {li.unit?.trim() || 'Pcs'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
