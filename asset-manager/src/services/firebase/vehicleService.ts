import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { auth } from '../../../config/firebase';
import type { Vehicle, CreateVehicleData, UpdateVehicleData } from '../../types/vehicle';
import { timestampToISO } from '../../types/inventory';
import type { FirestoreVehicle } from '../../types/vehicle';
import { normalizeVehicleNumber } from '../../utils/vehicleNumberUtils';

const COLLECTION = 'vehicles';

function firestoreToVehicle(id: string, data: FirestoreVehicle): Vehicle {
  return {
    id,
    vehicleNumber: data.vehicleNumber,
    vehicleNumberNormalized: data.vehicleNumberNormalized,
    notes: data.notes,
    createdAt: timestampToISO(data.createdAt as Parameters<typeof timestampToISO>[0]),
    updatedAt: timestampToISO(data.updatedAt as Parameters<typeof timestampToISO>[0]),
    createdByUserId: data.createdByUserId,
    createdByName: data.createdByName,
  };
}

export async function listVehicles(): Promise<Vehicle[]> {
  const q = query(collection(db, COLLECTION), orderBy('vehicleNumber', 'asc'));
  const snap = await getDocs(q);
  const out: Vehicle[] = [];
  snap.forEach((d) => {
    const data = d.data() as FirestoreVehicle;
    out.push(firestoreToVehicle(d.id, data));
  });
  return out;
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as FirestoreVehicle;
  return firestoreToVehicle(snap.id, data);
}

export async function isVehicleNumberTaken(
  number: string,
  excludeId?: string
): Promise<boolean> {
  const norm = normalizeVehicleNumber(number);
  if (!norm) return false;
  const q = query(
    collection(db, COLLECTION),
    where('vehicleNumberNormalized', '==', norm),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return false;
  const docId = snap.docs[0].id;
  return excludeId ? docId !== excludeId : true;
}

export async function createVehicle(data: CreateVehicleData): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to create a vehicle');
  const trimmed = data.vehicleNumber.trim();
  if (!trimmed) throw new Error('Vehicle number is required');
  if (await isVehicleNumberTaken(trimmed)) {
    throw new Error('A vehicle with this number already exists');
  }
  const displayName = user.displayName ?? user.email ?? 'Unknown';
  const ref = await addDoc(collection(db, COLLECTION), {
    vehicleNumber: trimmed,
    vehicleNumberNormalized: normalizeVehicleNumber(trimmed),
    notes: data.notes?.trim() || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdByUserId: user.uid,
    createdByName: displayName,
  });
  return ref.id;
}

export async function updateVehicle(id: string, data: UpdateVehicleData): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to update a vehicle');
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Vehicle not found');
  const current = snap.data() as FirestoreVehicle;
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.vehicleNumber !== undefined) {
    const trimmed = data.vehicleNumber.trim();
    if (!trimmed) throw new Error('Vehicle number is required');
    const currentTrimmed = current.vehicleNumber.trim();
    if (trimmed !== currentTrimmed) {
      const assignmentCount = await countAssignmentsForVehicle(id);
      if (assignmentCount > 0) {
        throw new Error('Vehicle number cannot be changed after fuel has been assigned.');
      }
    }
    if (await isVehicleNumberTaken(trimmed, id)) {
      throw new Error('A vehicle with this number already exists');
    }
    updates.vehicleNumber = trimmed;
    updates.vehicleNumberNormalized = normalizeVehicleNumber(trimmed);
  }
  if (data.notes !== undefined) {
    updates.notes = data.notes === null ? '' : String(data.notes).trim();
  }
  await updateDoc(ref, updates);
}

export async function countAssignmentsForVehicle(vehicleId: string): Promise<number> {
  const q = query(
    collection(db, 'vehicleFuelAssignments'),
    where('vehicleId', '==', vehicleId)
  );
  const agg = await getCountFromServer(q);
  return agg.data().count;
}

/** Delete vehicle only when no fuel assignments exist. */
export async function deleteVehicleIfNoAssignments(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to delete a vehicle');
  const c = await countAssignmentsForVehicle(id);
  if (c > 0) {
    throw new Error('Cannot delete a vehicle that has fuel assignment history');
  }
  await deleteDoc(doc(db, COLLECTION, id));
}
