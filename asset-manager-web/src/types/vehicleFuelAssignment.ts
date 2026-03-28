import type { Timestamp } from 'firebase/firestore';

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
}

export interface AssignFuelToVehicleData {
  vehicleId: string;
  itemId: string;
  quantityLiters: number;
  referenceSiteId?: string | null;
  reason?: string;
  notes?: string;
}
