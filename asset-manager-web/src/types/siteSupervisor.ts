import type { Timestamp } from 'firebase/firestore';

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
