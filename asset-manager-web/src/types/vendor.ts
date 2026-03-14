import { Timestamp } from 'firebase/firestore';
import { timestampToISO } from './inventory';

/**
 * Vendor status
 */
export type VendorStatus = 'active' | 'inactive';

/**
 * Vendor document structure in Firestore (uses Timestamp)
 */
export interface FirestoreVendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  poCount: number;
  lastPoDate: Timestamp | null;
  status: VendorStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Redux-serializable Vendor (ISO strings for timestamps)
 */
export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  poCount: number;
  lastPoDate: string | null;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert Firestore Vendor to Redux-serializable Vendor
 */
export const firestoreVendorToVendor = (doc: FirestoreVendor): Vendor => ({
  ...doc,
  lastPoDate: doc.lastPoDate ? timestampToISO(doc.lastPoDate) : null,
  createdAt: timestampToISO(doc.createdAt),
  updatedAt: timestampToISO(doc.updatedAt),
});

/**
 * Data for creating a new vendor
 */
export interface CreateVendorData {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
}

/**
 * Data for updating an existing vendor
 */
export interface UpdateVendorData {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  status?: VendorStatus;
}
