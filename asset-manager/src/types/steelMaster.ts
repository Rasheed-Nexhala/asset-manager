import { Timestamp } from 'firebase/firestore';

/**
 * Steel Master document structure in Firestore (with Firebase Timestamps)
 * Stores standard steel item specifications for weight-based conversion
 */
export interface FirestoreSteelMaster {
  id: string;
  name: string;
  weightPerMeter: number;
  defaultLength: number;
  hsnCode: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Steel Master document structure for Redux store (serialized timestamps)
 */
export interface SteelMaster {
  id: string;
  name: string;
  weightPerMeter: number;
  defaultLength: number;
  hsnCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data required to create a new steel master
 */
export interface CreateSteelMasterData {
  name: string;
  weightPerMeter: number;
  defaultLength: number;
  hsnCode: string;
}

/**
 * Data for updating an existing steel master
 */
export interface UpdateSteelMasterData {
  name?: string;
  weightPerMeter?: number;
  defaultLength?: number;
  hsnCode?: string;
  isActive?: boolean;
}
