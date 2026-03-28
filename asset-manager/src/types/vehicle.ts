import type { Timestamp } from 'firebase/firestore';

/** Vehicle master record (Firestore document fields; id is the doc id) */
export interface FirestoreVehicle {
  /** Display / registration number — required, unique (see vehicleNumberNormalized) */
  vehicleNumber: string;
  vehicleNumberNormalized: string;
  /** Optional free-text notes */
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUserId: string;
  createdByName: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleNumberNormalized: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  createdByName: string;
}

export interface CreateVehicleData {
  vehicleNumber: string;
  notes?: string;
}

export interface UpdateVehicleData {
  vehicleNumber?: string;
  notes?: string | null;
}
