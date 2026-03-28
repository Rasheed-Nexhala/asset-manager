import type { PurchaseOrder } from '../../types/purchaseOrder';
import {
  aggregateVendorLedgerLines,
  getDefaultVendorLedgerMonthRange,
  sumPurchaseOrderTotals,
} from '../vendorLedgerUtils';

function basePO(overrides: Partial<PurchaseOrder> & { id: string }): PurchaseOrder {
  const base: PurchaseOrder = {
    id: overrides.id,
    poNumber: overrides.poNumber ?? 'PO-1',
    vendorId: overrides.vendorId ?? 'v1',
    vendorName: overrides.vendorName ?? 'Vendor',
    vendorContact: '',
    items: overrides.items ?? [],
    subtotal: overrides.subtotal ?? 0,
    gstPercentage: overrides.gstPercentage ?? 0,
    gstAmount: overrides.gstAmount ?? 0,
    totalAmount: overrides.totalAmount ?? 0,
    justification: '',
    expectedDeliveryDate: null,
    documents: [],
    status: overrides.status ?? 'received',
    createdBy: '',
    createdByName: '',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    adminComments: null,
    rejectionReason: null,
    receivedAt: null,
    receivedBy: null,
    receivedByName: null,
    receivedNotes: null,
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}

describe('getDefaultVendorLedgerMonthRange', () => {
  it('returns first and last instant of the current calendar month', () => {
    const { dateFrom, dateTo } = getDefaultVendorLedgerMonthRange();
    const now = new Date();
    expect(dateFrom.getDate()).toBe(1);
    expect(dateFrom.getMonth()).toBe(now.getMonth());
    expect(dateFrom.getFullYear()).toBe(now.getFullYear());
    expect(dateFrom.getHours()).toBe(0);
    expect(dateTo.getMonth()).toBe(now.getMonth());
    expect(dateTo.getFullYear()).toBe(now.getFullYear());
    expect(dateTo.getHours()).toBe(23);
  });
});

describe('aggregateVendorLedgerLines', () => {
  it('aggregates ordered and received quantities by item id', () => {
    const orders: PurchaseOrder[] = [
      basePO({
        id: 'a',
        items: [
          {
            itemId: 'i1',
            itemName: 'Cement',
            itemSku: 'SKU1',
            isExistingItem: true,
            quantity: 10,
            unitPrice: 0,
            amount: 0,
            receivedQuantity: 8,
          },
        ],
      }),
      basePO({
        id: 'b',
        items: [
          {
            itemId: 'i1',
            itemName: 'Cement',
            itemSku: 'SKU1',
            isExistingItem: true,
            quantity: 5,
            unitPrice: 0,
            amount: 0,
            receivedQuantity: 5,
          },
        ],
      }),
    ];

    const rows = aggregateVendorLedgerLines(orders);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalOrdered).toBe(15);
    expect(rows[0].totalReceived).toBe(13);
    expect(rows[0].lineCount).toBe(2);
  });

  it('treats null receivedQuantity as zero', () => {
    const orders: PurchaseOrder[] = [
      basePO({
        id: 'a',
        items: [
          {
            itemId: 'i1',
            itemName: 'X',
            itemSku: 'S',
            isExistingItem: true,
            quantity: 10,
            unitPrice: 0,
            amount: 0,
            receivedQuantity: null,
          },
        ],
      }),
    ];
    const rows = aggregateVendorLedgerLines(orders);
    expect(rows[0].totalReceived).toBe(0);
  });

  it('groups by name+sku when itemId is empty', () => {
    const orders: PurchaseOrder[] = [
      basePO({
        id: 'a',
        items: [
          {
            itemId: '',
            itemName: 'Custom',
            itemSku: 'C',
            isExistingItem: false,
            quantity: 2,
            unitPrice: 0,
            amount: 0,
            receivedQuantity: 0,
          },
        ],
      }),
      basePO({
        id: 'b',
        items: [
          {
            itemId: '',
            itemName: 'Custom',
            itemSku: 'C',
            isExistingItem: false,
            quantity: 3,
            unitPrice: 0,
            amount: 0,
            receivedQuantity: 1,
          },
        ],
      }),
    ];
    const rows = aggregateVendorLedgerLines(orders);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalOrdered).toBe(5);
    expect(rows[0].totalReceived).toBe(1);
  });
});

describe('sumPurchaseOrderTotals', () => {
  it('sums totalAmount', () => {
    const orders: PurchaseOrder[] = [
      basePO({ id: 'a', totalAmount: 100 }),
      basePO({ id: 'b', totalAmount: 250.5 }),
    ];
    expect(sumPurchaseOrderTotals(orders)).toBe(350.5);
  });
});
