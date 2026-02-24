import { generatePOHtml, buildDraftPOForPrint } from '../poPdfUtils';
import type { PurchaseOrder } from '../../types/purchaseOrder';

describe('poPdfUtils', () => {
  describe('generatePOHtml', () => {
    it('generates HTML for a purchase order', () => {
      const po: PurchaseOrder = {
        id: 'po1',
        poNumber: 'PO-001',
        vendorId: 'v1',
        vendorName: 'Vendor A',
        vendorContact: '123',
        items: [
          {
            itemId: 'i1',
            itemName: 'Steel Bar',
            itemSku: 'SKU-001',
            quantity: 10,
            unitPrice: 100,
            amount: 1000,
            gstPercentage: 18,
            gstAmount: 180,
          },
        ],
        subtotal: 1000,
        gstAmount: 180,
        totalAmount: 1180,
        status: 'draft',
        createdByName: 'John',
        createdAt: '2025-02-24T00:00:00.000Z',
      } as PurchaseOrder;

      const html = generatePOHtml(po);
      expect(html).toContain('PO-001');
      expect(html).toContain('Vendor A');
      expect(html).toContain('Steel Bar');
      expect(html).toContain('SKU-001');
      expect(html).toContain('10');
      expect(html).toContain('₹1,000');
      expect(html).toContain('₹1,180');
      expect(html).toContain('John');
    });

    it('escapes HTML in item names', () => {
      const po: PurchaseOrder = {
        id: 'po1',
        poNumber: 'PO-001',
        vendorId: 'v1',
        vendorName: 'Vendor',
        vendorContact: '',
        items: [
          {
            itemId: 'i1',
            itemName: '<script>alert(1)</script>',
            itemSku: 'SKU',
            quantity: 1,
            unitPrice: 100,
            amount: 100,
          },
        ],
        subtotal: 100,
        gstAmount: 18,
        totalAmount: 118,
        status: 'draft',
        createdByName: 'User',
        createdAt: '2025-02-24',
      } as PurchaseOrder;

      const html = generatePOHtml(po);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('buildDraftPOForPrint', () => {
    it('builds PO object from form data', () => {
      const formData = {
        vendorName: 'Test Vendor',
        vendorContact: '999',
        items: [
          {
            itemId: 'i1',
            itemName: 'Item 1',
            itemSku: 'SKU-1',
            quantity: 5,
            unitPrice: 100,
            amount: 500,
          },
        ],
        justification: 'Need stock',
        expectedDeliveryDate: new Date('2025-03-01'),
        userName: 'Jane',
      };

      const po = buildDraftPOForPrint(formData, 'DRAFT-001');
      expect(po.poNumber).toBe('DRAFT-001');
      expect(po.vendorName).toBe('Test Vendor');
      expect(po.status).toBe('draft');
      expect(po.items).toHaveLength(1);
      expect(po.items[0].amount).toBe(500);
      expect(po.totalAmount).toBeGreaterThan(0);
    });

    it('uses default DRAFT when poNumber not provided', () => {
      const po = buildDraftPOForPrint({
        vendorName: 'V',
        vendorContact: '',
        items: [],
        justification: '',
        expectedDeliveryDate: null,
        userName: 'U',
      });
      expect(po.poNumber).toBe('DRAFT');
    });
  });
});
