import type { Item } from '../types/inventory';

/**
 * Navigation parameter types for Purchase Order Stack
 */
export type PurchaseOrderStackParamList = {
  PurchaseOrderList: undefined;
  CreatePO: { poId?: string; selectedItems?: Item[]; initialQuantities?: Record<string, number> };
  VendorManagement: undefined;
  /** PO history, items purchased, and links to each PO for this vendor */
  VendorLedger: { vendorId: string };
  AddVendor: { vendorId?: string };
  ApprovePO: { poId: string };
  ReceivePO: { poId: string };
  SelectItems: {
    returnScreen: 'CreatePO';
    returnParams: { poId?: string };
    excludeItemIds?: string[];
  };
};
