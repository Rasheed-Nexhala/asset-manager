/**
 * Navigation parameter types for Request Stack
 */
import type { Item } from '../types/inventory';

export type RequestStackParamList = {
  RequestQueue: undefined;
  MyRequests: undefined;
  CreateRequest: { siteId: string; selectedItems?: Item[] };
  /** Create a site-to-site transfer request from OtherSiteInventoryScreen */
  CreateSiteTransferRequest: {
    sourceSiteId: string;
    sourceSiteName: string;
    destinationSiteId: string;
    destinationSiteName: string;
    preselectedItem: {
      itemId: string;
      itemName: string;
      itemSku: string;
      unit?: string;
      itemType: 'consumable' | 'non_consumable';
      categoryId: string;
      categoryName: string;
      imageUrl?: string;
      availableQty: number;
      weightPerMeter?: number;
      lengthPerPiece?: number;
    };
  };
  ProcessRequest: { requestId: string };
  EditRequest: { requestId: string; selectedItems?: Item[] };
  RejectRequest: { requestId: string };
  ConfirmTransfer: { requestId: string };
  ReturnItems: { requestId: string };
  SelectItems: {
    returnScreen: 'CreateRequest' | 'EditRequest';
    returnParams: { siteId?: string; requestId?: string };
    excludeItemIds?: string[];
  };
};
