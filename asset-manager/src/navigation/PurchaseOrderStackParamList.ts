/**
 * Navigation parameter types for Purchase Order Stack
 */
export type PurchaseOrderStackParamList = {
  PurchaseOrderList: undefined;
  CreatePO: { poId?: string };
  VendorManagement: undefined;
  AddVendor: { vendorId?: string };
  ApprovePO: { poId: string };
  ReceivePO: { poId: string };
};
