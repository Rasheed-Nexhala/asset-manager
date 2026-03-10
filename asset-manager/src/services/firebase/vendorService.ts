import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import type { Timestamp, QuerySnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  FirestoreVendor,
  Vendor,
  CreateVendorData,
  UpdateVendorData,
} from '../../types/vendor';
import { firestoreVendorToVendor } from '../../types/vendor';

const VENDORS_COLLECTION = 'vendors';

/**
 * List all vendors
 *
 * @returns Array of all vendors sorted by name
 */
export const listVendors = async (): Promise<Vendor[]> => {
  try {
    const q = query(
      collection(db, VENDORS_COLLECTION),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(q);
    const vendors: Vendor[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const firestoreVendor: FirestoreVendor = {
        id: docSnap.id,
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
        poCount: data.poCount ?? 0,
        lastPoDate: data.lastPoDate ?? null,
        status: data.status || 'active',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      vendors.push(firestoreVendorToVendor(firestoreVendor));
    });

    return vendors;
  } catch (error) {
    console.error('Error listing vendors:', error);
    throw error;
  }
};

/**
 * Get a single vendor by ID
 *
 * @param id - Vendor document ID
 * @returns Vendor if found, null otherwise
 */
export const getVendorById = async (id: string): Promise<Vendor | null> => {
  try {
    const vendorDoc = await getDoc(doc(db, VENDORS_COLLECTION, id));

    if (!vendorDoc.exists()) {
      return null;
    }

    const data = vendorDoc.data();
    const firestoreVendor: FirestoreVendor = {
      id: vendorDoc.id,
      name: data.name,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      address: data.address,
      poCount: data.poCount ?? 0,
      lastPoDate: data.lastPoDate ?? null,
      status: data.status || 'active',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    return firestoreVendorToVendor(firestoreVendor);
  } catch (error) {
    console.error('Error getting vendor by ID:', error);
    throw error;
  }
};

/**
 * Create a new vendor
 *
 * @param vendorData - Vendor creation data
 * @returns The created vendor ID
 */
export const createVendor = async (vendorData: CreateVendorData): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, VENDORS_COLLECTION), {
      name: vendorData.name.trim(),
      contactPerson: vendorData.contactPerson.trim(),
      phone: vendorData.phone.trim(),
      email: vendorData.email?.trim() || null,
      address: vendorData.address?.trim() || null,
      poCount: 0,
      lastPoDate: null,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating vendor:', error);
    throw error;
  }
};

/**
 * Update an existing vendor
 *
 * @param id - Vendor document ID
 * @param updates - Fields to update
 */
export const updateVendor = async (
  id: string,
  updates: UpdateVendorData
): Promise<void> => {
  try {
    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updatePayload[key] = value;
      }
    });

    await updateDoc(doc(db, VENDORS_COLLECTION, id), updatePayload);
  } catch (error) {
    console.error('Error updating vendor:', error);
    throw error;
  }
};

/**
 * Increment vendor poCount and set lastPoDate
 * Called when a PO is created (submitted, not draft)
 *
 * @param vendorId - Vendor document ID
 * @param lastPoDate - Timestamp of the PO date
 */
export const incrementVendorPoCount = async (
  vendorId: string,
  lastPoDate: Timestamp
): Promise<void> => {
  try {
    await updateDoc(doc(db, VENDORS_COLLECTION, vendorId), {
      poCount: increment(1),
      lastPoDate,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error incrementing vendor PO count:', error);
    // Do not throw - vendor may have been deleted; PO is source of truth
  }
};

/**
 * Update vendor lastPoDate (e.g. when a PO is received)
 *
 * @param vendorId - Vendor document ID
 * @param lastPoDate - Timestamp of the PO received date
 */
export const updateVendorLastPoDate = async (
  vendorId: string,
  lastPoDate: Timestamp
): Promise<void> => {
  try {
    await updateDoc(doc(db, VENDORS_COLLECTION, vendorId), {
      lastPoDate,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating vendor lastPoDate:', error);
    // Do not throw - vendor may have been deleted; PO is source of truth
  }
};

/**
 * Subscribe to real-time updates for vendors collection
 *
 * @param callback - Function called whenever the vendors list changes
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToVendors = (
  callback: (vendors: Vendor[]) => void
): (() => void) => {
  const q = query(
    collection(db, VENDORS_COLLECTION),
    orderBy('name', 'asc')
  );

  const unsub = onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const vendors: Vendor[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const firestoreVendor: FirestoreVendor = {
          id: docSnap.id,
          name: data.name,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
          address: data.address,
          poCount: data.poCount ?? 0,
          lastPoDate: data.lastPoDate ?? null,
          status: data.status || 'active',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        vendors.push(firestoreVendorToVendor(firestoreVendor));
      });
      callback(vendors);
    },
    (error) => {
      console.error('Error in vendors subscription:', error);
    }
  );

  return () => unsub();
};
