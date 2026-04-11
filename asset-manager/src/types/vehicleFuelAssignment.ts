import type { Timestamp } from 'firebase/firestore';

/** How fuel was sourced for this assignment (defaults to central_store when absent in legacy docs). */
export type VehicleFuelAssignmentSource = 'central_store' | 'site_request';

/** One fuel assignment from central store to a vehicle (consumption record). */
export interface FirestoreVehicleFuelAssignment {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantityLiters: number;
  referenceSiteId?: string | null;
  referenceSiteName?: string | null;
  reason?: string;
  notes?: string;
  assignedByUserId: string;
  assignedByName: string;
  createdAt: Timestamp;
  assignmentSource?: VehicleFuelAssignmentSource;
  sourceRequestId?: string | null;
  sourceRequestNumber?: string | null;
}

export interface VehicleFuelAssignment {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantityLiters: number;
  referenceSiteId?: string | null;
  referenceSiteName?: string | null;
  reason?: string;
  notes?: string;
  assignedByUserId: string;
  assignedByName: string;
  createdAt: string;
  assignmentSource?: VehicleFuelAssignmentSource;
  sourceRequestId?: string | null;
  sourceRequestNumber?: string | null;
}

export interface AssignFuelToVehicleData {
  vehicleId: string;
  itemId: string;
  quantityLiters: number;
  referenceSiteId?: string | null;
  reason?: string;
  notes?: string;
}

/** Dispense fuel from a transferred request line to a vehicle (site inventory; no central deduction). */
export interface DispenseFuelFromSiteRequestInput {
  siteId: string;
  requestId: string;
  itemId: string;
  vehicleId: string;
  quantityLiters: number;
  reason?: string;
  notes?: string;
}

/**
 * Input for dispensing a fuel item to a vehicle across multiple request lines in one transaction.
 * Used by the inventory-first split flow so the Site Manager starts from total site fuel stock
 * and distributes liters across however many transferred requests contain that fuel line.
 */
export interface DispenseFuelFromMultipleRequestsInput {
  siteId: string;
  itemId: string;
  vehicleId: string;
  /** One entry per request line to draw from. Zero-qty entries are ignored. */
  distributions: Array<{ requestId: string; quantityLiters: number }>;
}
