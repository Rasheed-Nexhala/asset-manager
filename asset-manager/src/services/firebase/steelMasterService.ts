import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  FirestoreSteelMaster,
  SteelMaster,
  CreateSteelMasterData,
  UpdateSteelMasterData,
} from '../../types/steelMaster';
import { timestampToISO } from '../../types/inventory';

const STEEL_MASTER_COLLECTION = 'steelMaster';

/**
 * Convert FirestoreSteelMaster to SteelMaster (for Redux store)
 */
const firestoreSteelMasterToSteelMaster = (
  firestoreSteelMaster: FirestoreSteelMaster
): SteelMaster => {
  return {
    ...firestoreSteelMaster,
    createdAt: timestampToISO(firestoreSteelMaster.createdAt),
    updatedAt: timestampToISO(firestoreSteelMaster.updatedAt),
  };
};

/**
 * Parse document data from Firestore snapshot
 * Legacy fields (code, type, standardLengths, defaultLength) are ignored if present
 */
const parseSteelMasterDoc = (docSnap: { id: string; data: () => Record<string, unknown> }): FirestoreSteelMaster => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name as string,
    weightPerMeter: data.weightPerMeter as number,
    defaultLength: (data.defaultLength as number) ?? 6,
    hsnCode: (data.hsnCode as string) || '',
    isActive: (data.isActive as boolean) ?? true,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
};

/**
 * List all steel masters
 */
export const listSteelMasters = async (
  activeOnly = false
): Promise<SteelMaster[]> => {
  try {
    let q = query(
      collection(db, STEEL_MASTER_COLLECTION),
      orderBy('name', 'asc')
    );

    if (activeOnly) {
      q = query(q, where('isActive', '==', true));
    }

    const snapshot = await getDocs(q);
    const steelMasters: SteelMaster[] = [];

    snapshot.forEach((docSnap) => {
      const firestoreSteelMaster = parseSteelMasterDoc(docSnap);
      steelMasters.push(firestoreSteelMasterToSteelMaster(firestoreSteelMaster));
    });

    return steelMasters;
  } catch (error) {
    console.error('Error listing steel masters:', error);
    throw error;
  }
};

/**
 * Get a single steel master by ID
 */
export const getSteelMasterById = async (
  id: string
): Promise<SteelMaster | null> => {
  try {
    const steelMasterDoc = await getDoc(
      doc(db, STEEL_MASTER_COLLECTION, id)
    );

    if (!steelMasterDoc.exists()) {
      return null;
    }

    const firestoreSteelMaster = parseSteelMasterDoc(steelMasterDoc);
    return firestoreSteelMasterToSteelMaster(firestoreSteelMaster);
  } catch (error) {
    console.error('Error getting steel master by ID:', error);
    throw error;
  }
};

/**
 * Create a new steel master
 */
export const createSteelMaster = async (
  data: CreateSteelMasterData
): Promise<string> => {
  try {
    const docData: Record<string, unknown> = {
      name: data.name.trim(),
      weightPerMeter: data.weightPerMeter,
      defaultLength: data.defaultLength,
      hsnCode: data.hsnCode.trim(),
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (data.createdBy) docData.createdBy = data.createdBy;
    if (data.createdByName) docData.createdByName = data.createdByName;
    if (data.createdByRole) docData.createdByRole = data.createdByRole;

    const docRef = await addDoc(collection(db, STEEL_MASTER_COLLECTION), docData);

    return docRef.id;
  } catch (error) {
    console.error('Error creating steel master:', error);
    throw error;
  }
};

/**
 * Update an existing steel master
 */
export const updateSteelMaster = async (
  id: string,
  updates: UpdateSteelMasterData
): Promise<void> => {
  try {
    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.weightPerMeter !== undefined)
      updateData.weightPerMeter = updates.weightPerMeter;
    if (updates.defaultLength !== undefined)
      updateData.defaultLength = updates.defaultLength;
    if (updates.hsnCode !== undefined)
      updateData.hsnCode = updates.hsnCode.trim();
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.updatedBy) updateData.updatedBy = updates.updatedBy;
    if (updates.updatedByName) updateData.updatedByName = updates.updatedByName;
    if (updates.updatedByRole) updateData.updatedByRole = updates.updatedByRole;

    await updateDoc(doc(db, STEEL_MASTER_COLLECTION, id), updateData);
  } catch (error) {
    console.error('Error updating steel master:', error);
    throw error;
  }
};

/**
 * Soft delete a steel master (set isActive = false)
 */
export const deleteSteelMaster = async (id: string): Promise<void> => {
  try {
    await updateSteelMaster(id, { isActive: false });
  } catch (error) {
    console.error('Error deleting steel master:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for steel masters
 */
export const subscribeSteelMasters = (
  callback: (steelMasters: SteelMaster[]) => void,
  activeOnly = false
): Unsubscribe => {
  let q = query(
    collection(db, STEEL_MASTER_COLLECTION),
    orderBy('name', 'asc')
  );

  if (activeOnly) {
    q = query(q, where('isActive', '==', true));
  }

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const steelMasters: SteelMaster[] = [];

      snapshot.forEach((docSnap) => {
        const firestoreSteelMaster = parseSteelMasterDoc(docSnap);
        steelMasters.push(
          firestoreSteelMasterToSteelMaster(firestoreSteelMaster)
        );
      });

      callback(steelMasters);
    },
    (error) => {
      console.error('Error in steel masters subscription:', error);
      callback([]);
    }
  );
};
