import type { Timestamp } from 'firebase/firestore';

/**
 * Site supervisor — a person the Site Manager tracks for dividing received materials.
 * Stored under sites/{siteId}/siteSupervisors/{id} (not an app login role).
 */
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

/**
 * Allocation of request line-item quantity to a supervisor (custody tracking).
 * Physical stock remains at site inventory until returned to central store (Store Incharge only).
 */
export interface SupervisorItemAllocation {
  id: string;
  siteId: string;
  supervisorId: string;
  supervisorName: string;
  requestId: string;
  requestNumber: string;
  itemId: string;
  itemName: string;
  /** Quantity given to this supervisor (this row). */
  quantityAllocated: number;
  /** Quantity the supervisor has given back to the Site Manager (cumulative). */
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
