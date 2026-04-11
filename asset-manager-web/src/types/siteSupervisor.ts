import type { Timestamp } from 'firebase/firestore';
import type { RequestItem } from './request';

export interface SiteSupervisor {
  id: string;
  siteId: string;
  name: string;
  phone?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  createdByManagerId: string;
}

export interface SiteSupervisorInput {
  name: string;
  phone?: string;
}

export interface SupervisorItemAllocation {
  id: string;
  siteId: string;
  supervisorId: string;
  supervisorName: string;
  requestId: string;
  requestNumber: string;
  itemId: string;
  itemName: string;
  /** Line type from the request (stored on new allocations; optional on legacy rows). */
  itemType?: RequestItem['itemType'];
  quantityAllocated: number;
  quantityReturnedToManager: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CreateSupervisorAllocationInput {
  requestId: string;
  itemId: string;
  supervisorId: string;
  quantity: number;
}

/**
 * Input for splitting an item across multiple request lines in a single transaction.
 * Used by the inventory-first split flow where the SM starts from total site stock
 * and distributes qty across however many transferred requests contain that item.
 */
export interface MultiRequestAllocationInput {
  siteId: string;
  itemId: string;
  itemName: string;
  itemType: 'consumable' | 'non_consumable';
  supervisorId: string;
  supervisorName: string;
  /** One entry per request line to deduct from. Zero-qty entries are ignored. */
  distributions: Array<{
    requestId: string;
    quantity: number;
  }>;
}
