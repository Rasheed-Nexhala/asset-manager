import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  serverTimestamp,
  getDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { auth } from '../../../config/firebase';
import { applyInventoryAdjustmentInTransaction, getItemById } from './inventoryService';
import type { AdjustmentData } from '../../types/inventory';
import { getVehicleById } from './vehicleService';
import { getLocationId } from '../../utils/locationUtils';
import type {
  VehicleFuelAssignment,
  AssignFuelToVehicleData,
  FirestoreVehicleFuelAssignment,
} from '../../types/vehicleFuelAssignment';
import { timestampToISO } from '../../types/inventory';
import { logVehicleFuelAssignedToCloud } from './activityLogService';

const COLLECTION = 'vehicleFuelAssignments';

const CENTRAL_LOCATION_NAME = 'Central Store';

function toAssignment(
  id: string,
  data: FirestoreVehicleFuelAssignment
): VehicleFuelAssignment {
  return {
    id,
    vehicleId: data.vehicleId,
    vehicleNumber: data.vehicleNumber,
    itemId: data.itemId,
    itemName: data.itemName,
    itemSku: data.itemSku,
    quantityLiters: data.quantityLiters,
    referenceSiteId: data.referenceSiteId ?? null,
    referenceSiteName: data.referenceSiteName ?? null,
    reason: data.reason,
    notes: data.notes,
    assignedByUserId: data.assignedByUserId,
    assignedByName: data.assignedByName,
    createdAt: timestampToISO(data.createdAt as Parameters<typeof timestampToISO>[0]),
  };
}

export async function listAssignmentsByVehicle(
  vehicleId: string,
  maxRows = 500
): Promise<VehicleFuelAssignment[]> {
  const q = query(
    collection(db, COLLECTION),
    where('vehicleId', '==', vehicleId),
    orderBy('createdAt', 'desc'),
    limit(maxRows)
  );
  const snap = await getDocs(q);
  const out: VehicleFuelAssignment[] = [];
  snap.forEach((d) => {
    out.push(toAssignment(d.id, d.data() as FirestoreVehicleFuelAssignment));
  });
  return out;
}

export async function getTotalLitersAssignedToVehicle(vehicleId: string): Promise<number> {
  const rows = await listAssignmentsByVehicle(vehicleId, 2000);
  return rows.reduce((s, r) => s + r.quantityLiters, 0);
}

async function getSiteName(siteId: string): Promise<string | null> {
  const siteSnap = await getDoc(doc(db, 'sites', siteId));
  if (!siteSnap.exists()) return null;
  const n = siteSnap.data()?.name;
  return typeof n === 'string' ? n : null;
}

/**
 * Remove fuel from central store, record assignment, log activity (vehicle_fuel_assigned).
 * Inventory deduction and assignment document are written in one Firestore transaction
 * (no separate rollback). Uses applyInventoryAdjustmentInTransaction (not the Redux thunk)
 * to avoid duplicate quantity_adjusted logs and Store Incharge access-window checks.
 */
export async function assignFuelToVehicle(
  data: AssignFuelToVehicleData,
  userName: string,
  userRole: string
): Promise<{ assignmentId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const qty = Number(data.quantityLiters);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be a positive number');
  }

  const item = await getItemById(data.itemId);
  if (!item) throw new Error('Item not found');
  if (item.type !== 'fuel') {
    throw new Error('Only fuel-type inventory items can be assigned to vehicles');
  }

  const vehicle = await getVehicleById(data.vehicleId);
  if (!vehicle) throw new Error('Vehicle not found');

  let referenceSiteName: string | null = null;
  if (data.referenceSiteId) {
    referenceSiteName = await getSiteName(data.referenceSiteId);
  }

  const locationId = getLocationId('store');
  const notes =
    data.notes?.trim()
      ? `${data.notes.trim()} — Vehicle ${vehicle.vehicleNumber}`
      : `Vehicle ${vehicle.vehicleNumber}`;

  const adjustmentData: AdjustmentData = {
    itemId: data.itemId,
    itemName: item.name,
    itemSku: item.sku,
    locationId,
    locationType: 'store',
    locationName: CENTRAL_LOCATION_NAME,
    type: 'remove',
    quantity: qty,
    reason: 'Vehicle fuel assignment',
    notes,
  };

  const assignmentRef = doc(collection(db, COLLECTION));

  const { assignmentId, oldQuantity, newQuantity } = await runTransaction(
    db,
    async (transaction) => {
      const inv = await applyInventoryAdjustmentInTransaction(
        transaction,
        adjustmentData
      );
      transaction.set(assignmentRef, {
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        quantityLiters: qty,
        referenceSiteId: data.referenceSiteId ?? null,
        referenceSiteName,
        reason: data.reason?.trim() || '',
        notes: data.notes?.trim() || '',
        assignedByUserId: user.uid,
        assignedByName: userName,
        createdAt: serverTimestamp(),
      });
      return {
        assignmentId: assignmentRef.id,
        oldQuantity: inv.oldQuantity,
        newQuantity: inv.newQuantity,
      };
    }
  );

  void logVehicleFuelAssignedToCloud({
    itemId: item.id,
    itemName: item.name,
    itemSku: item.sku,
    vehicleId: vehicle.id,
    vehicleNumber: vehicle.vehicleNumber,
    quantityLiters: qty,
    oldCentralQuantity: oldQuantity,
    newCentralQuantity: newQuantity,
    referenceSiteId: data.referenceSiteId ?? null,
    referenceSiteName,
    reason: data.reason?.trim() || '',
    notes: data.notes?.trim() || '',
    assignmentId,
    userName,
    userRole,
  });

  return { assignmentId };
}
