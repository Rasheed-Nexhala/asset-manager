import type { PurchaseOrder } from '../types/purchaseOrder';

/** Inclusive calendar range for filtering POs by `createdAt`. */
export type VendorLedgerDateRange = {
  dateFrom: Date;
  dateTo: Date;
};

/** Default filter: first day 00:00 through last day 23:59:59 of the current calendar month (local). */
export function getDefaultVendorLedgerMonthRange(): VendorLedgerDateRange {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { dateFrom, dateTo };
}

/**
 * One aggregated row per inventory line item across all POs for a vendor.
 * Quantities sum every line on every PO (including partial receipts).
 */
export type VendorLedgerLine = {
  key: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  unit?: string;
  totalOrdered: number;
  totalReceived: number;
  lineCount: number;
};

function lineKey(itemId: string, itemName: string, itemSku: string): string {
  if (itemId) return itemId;
  return `${itemName}|${itemSku}`;
}

/**
 * Aggregate PO line items for a vendor ledger (items purchased / ordered).
 */
export function aggregateVendorLedgerLines(orders: PurchaseOrder[]): VendorLedgerLine[] {
  const map = new Map<string, VendorLedgerLine>();

  for (const po of orders) {
    const items = po.items ?? [];
    for (const line of items) {
      const key = lineKey(line.itemId ?? '', line.itemName, line.itemSku);
      const ordered = Number.isFinite(line.quantity) ? line.quantity : 0;
      const recvRaw = line.receivedQuantity;
      const received =
        recvRaw === null || recvRaw === undefined
          ? 0
          : Number.isFinite(recvRaw)
            ? recvRaw
            : 0;

      const existing = map.get(key);
      if (existing) {
        existing.totalOrdered += ordered;
        existing.totalReceived += received;
        existing.lineCount += 1;
      } else {
        map.set(key, {
          key,
          itemId: line.itemId,
          itemName: line.itemName,
          itemSku: line.itemSku,
          unit: line.unit ?? line.orderedUnit,
          totalOrdered: ordered,
          totalReceived: received,
          lineCount: 1,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' })
  );
}

/**
 * Sum of PO totals (as recorded on each PO). Includes all statuses.
 */
export function sumPurchaseOrderTotals(orders: PurchaseOrder[]): number {
  return orders.reduce((sum, po) => sum + (Number.isFinite(po.totalAmount) ? po.totalAmount : 0), 0);
}
