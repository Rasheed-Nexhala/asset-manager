import type { Item } from '../types/inventory';

/**
 * Navigation parameter types for Purchase Order Stack
 */
export type PurchaseOrderStackParamList = {
  PurchaseOrderList: undefined;
  CreatePO: { poId?: string; selectedItems?: Item[]; initialQuantities?: Record<string, number> };
  VendorManagement: undefined;
  AddVendor: { vendorId?: string };
  ApprovePO: { poId: string };
  ReceivePO: { poId: string };
  SelectItems: {
    returnScreen: 'CreatePO';
    returnParams: { poId?: string };
    excludeItemIds?: string[];
  };
};
