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
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
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
 * Check if a steel master name or HSN code already exists
 * Used for validation before creating/updating steel masters
 * 
 * @param name - Steel master name to check
 * @param hsnCode - HSN code to check
 * @param excludeId - Optional ID to exclude (for updates)
 * @returns Object indicating if name or HSN exists
 */
export const checkSteelMasterExists = async (
  name: string,
  hsnCode: string,
  excludeId?: string
): Promise<{ nameExists: boolean; hsnExists: boolean }> => {
  try {
    const nameQuery = query(
      collection(db, STEEL_MASTER_COLLECTION),
      where('name', '==', name.trim())
    );
    const hsnQuery = query(
      collection(db, STEEL_MASTER_COLLECTION),
      where('hsnCode', '==', hsnCode.trim())
    );

    const [nameSnap, hsnSnap] = await Promise.all([
      getDocs(nameQuery),
      getDocs(hsnQuery),
    ]);

    const nameExists = excludeId
      ? nameSnap.docs.some((doc) => doc.id !== excludeId)
      : !nameSnap.empty;

    const hsnExists = hsnCode.trim() !== ''
      ? excludeId
        ? hsnSnap.docs.some((doc) => doc.id !== excludeId)
        : !hsnSnap.empty
      : false;

    return { nameExists, hsnExists };
  } catch (error) {
    console.error('Error checking steel master existence:', error);
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
    const name = data.name.trim();
    const hsnCode = data.hsnCode.trim();

    // Pre-check for uniqueness
    const { nameExists, hsnExists } = await checkSteelMasterExists(name, hsnCode);
    if (nameExists) throw new Error(`Custom item with name "${name}" already exists`);
    if (hsnExists) throw new Error(`Custom item with HSN code "${hsnCode}" already exists`);

    const docRef = doc(collection(db, STEEL_MASTER_COLLECTION));
    const docData: Record<string, unknown> = {
      name,
      weightPerMeter: data.weightPerMeter,
      defaultLength: data.defaultLength,
      hsnCode,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (data.createdBy) docData.createdBy = data.createdBy;
    if (data.createdByName) docData.createdByName = data.createdByName;
    if (data.createdByRole) docData.createdByRole = data.createdByRole;

    await runTransaction(db, async (transaction) => {
      transaction.set(docRef, docData);
    });

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
    const steelMasterRef = doc(db, STEEL_MASTER_COLLECTION, id);
    const docSnap = await getDoc(steelMasterRef);
    if (!docSnap.exists()) {
      throw new Error('Custom item not found');
    }

    const currentData = docSnap.data();
    const newName = updates.name !== undefined ? updates.name.trim() : currentData.name;
    const newHsnCode = updates.hsnCode !== undefined ? updates.hsnCode.trim() : currentData.hsnCode;

    // Pre-check for uniqueness if name or HSN changed
    if (
      (updates.name !== undefined && newName !== currentData.name) ||
      (updates.hsnCode !== undefined && newHsnCode !== currentData.hsnCode)
    ) {
      const { nameExists, hsnExists } = await checkSteelMasterExists(newName, newHsnCode, id);
      if (updates.name !== undefined && newName !== currentData.name && nameExists) {
        throw new Error(`Custom item with name "${newName}" already exists`);
      }
      if (updates.hsnCode !== undefined && newHsnCode !== currentData.hsnCode && hsnExists) {
        throw new Error(`Custom item with HSN code "${newHsnCode}" already exists`);
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) updateData.name = newName;
    if (updates.weightPerMeter !== undefined) updateData.weightPerMeter = updates.weightPerMeter;
    if (updates.defaultLength !== undefined) updateData.defaultLength = updates.defaultLength;
    if (updates.hsnCode !== undefined) updateData.hsnCode = newHsnCode;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.updatedBy) updateData.updatedBy = updates.updatedBy;
    if (updates.updatedByName) updateData.updatedByName = updates.updatedByName;
    if (updates.updatedByRole) updateData.updatedByRole = updates.updatedByRole;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(steelMasterRef);
      if (!snap.exists()) throw new Error('Custom item not found');
      transaction.update(steelMasterRef, updateData);
    });
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
    }
  );
};
