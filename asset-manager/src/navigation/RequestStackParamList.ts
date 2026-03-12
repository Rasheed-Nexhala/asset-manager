/**
 * Navigation parameter types for Request Stack
 */
import type { Item } from '../types/inventory';

export type RequestStackParamList = {
  RequestQueue: undefined;
  MyRequests: undefined;
  CreateRequest: { siteId: string; selectedItems?: Item[] };
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
