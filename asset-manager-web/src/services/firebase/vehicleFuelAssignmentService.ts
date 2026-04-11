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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { auth } from '../../config/firebase';
import { applyInventoryAdjustmentInTransaction, getItemById } from './inventoryService';
import type { AdjustmentData } from '../../types/inventory';
import { getVehicleById } from './vehicleService';
import { getLocationId } from '../../utils/locationUtils';
import type {
  VehicleFuelAssignment,
  AssignFuelToVehicleData,
  FirestoreVehicleFuelAssignment,
  DispenseFuelFromSiteRequestInput,
  DispenseFuelFromMultipleRequestsInput,
} from '../../types/vehicleFuelAssignment';
import type { Request, RequestItem } from '../../types/request';
import { timestampToISO } from '../../types/inventory';
import { logVehicleFuelAssignedToCloud } from './activityLogService';

const COLLECTION = 'vehicleFuelAssignments';
const REQUESTS_COLLECTION = 'requests';

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
    assignmentSource: data.assignmentSource,
    sourceRequestId: data.sourceRequestId ?? null,
    sourceRequestNumber: data.sourceRequestNumber ?? null,
  };
}

function sortAssignmentsByCreatedDesc(rows: VehicleFuelAssignment[]): void {
  rows.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function listAssignmentsByRequestId(
  requestId: string,
  maxRows = 500
): Promise<VehicleFuelAssignment[]> {
  const q = query(
    collection(db, COLLECTION),
    where('sourceRequestId', '==', requestId),
    limit(maxRows)
  );
  const snap = await getDocs(q);
  const out: VehicleFuelAssignment[] = [];
  snap.forEach((d) => {
    out.push(toAssignment(d.id, d.data() as FirestoreVehicleFuelAssignment));
  });
  sortAssignmentsByCreatedDesc(out);
  return out;
}

export function subscribeAssignmentsByRequestId(
  requestId: string,
  onSnapshotCb: (rows: VehicleFuelAssignment[]) => void
): () => void {
  const q = query(collection(db, COLLECTION), where('sourceRequestId', '==', requestId));
  return onSnapshot(
    q,
    (snap) => {
      const rows: VehicleFuelAssignment[] = [];
      snap.forEach((d) => {
        rows.push(toAssignment(d.id, d.data() as FirestoreVehicleFuelAssignment));
      });
      sortAssignmentsByCreatedDesc(rows);
      onSnapshotCb(rows);
    },
    () => onSnapshotCb([])
  );
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
        assignmentSource: 'central_store',
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

function patchItemsSupervisorQty(
  items: RequestItem[],
  itemId: string,
  delta: number
): RequestItem[] {
  return items.map((line) => {
    if (line.itemId !== itemId) return line;
    const prev = line.supervisorOutstandingQty ?? 0;
    const next = prev + delta;
    if (next < 0) {
      throw new Error('Invalid dispensed quantity update');
    }
    return { ...line, supervisorOutstandingQty: next };
  });
}

/**
 * Dispense fuel from a transferred request line to a vehicle.
 * Updates request line custody (supervisorOutstandingQty) and writes vehicleFuelAssignments with assignmentSource site_request.
 * Does not change central store inventory.
 */
export async function dispenseFuelFromSiteRequestToVehicle(
  input: DispenseFuelFromSiteRequestInput,
  actor: { userId: string; userName: string }
): Promise<{ assignmentId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const qty = Number(input.quantityLiters);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be a positive number');
  }

  const item = await getItemById(input.itemId);
  if (!item) throw new Error('Item not found');
  if (item.type !== 'fuel') {
    throw new Error('Only fuel-type items can be dispensed to vehicles from a request');
  }

  const vehicle = await getVehicleById(input.vehicleId);
  if (!vehicle) throw new Error('Vehicle not found');

  const referenceSiteName = await getSiteName(input.siteId);
  const requestRef = doc(db, REQUESTS_COLLECTION, input.requestId);
  const assignmentRef = doc(collection(db, COLLECTION));

  await runTransaction(db, async (transaction) => {
    const reqSnap = await transaction.get(requestRef);
    if (!reqSnap.exists()) throw new Error('Request not found');
    const requestData = reqSnap.data() as Request;

    if (requestData.siteId !== input.siteId) {
      throw new Error('Request does not belong to this site');
    }
    if (requestData.status !== 'transferred' && requestData.status !== 'partially_returned') {
      throw new Error('Fuel can only be dispensed after the request is transferred');
    }

    const line = requestData.items?.find((i) => i.itemId === input.itemId);
    if (!line) throw new Error('Item not found on this request');
    if (line.itemType !== 'fuel') {
      throw new Error('This line is not a fuel item');
    }

    const qtyApproved = Number(line.quantityApproved ?? 0);
    const qtyReturnedCentral = Number(line.quantityReturned ?? 0);
    const maxAtSite = qtyApproved - qtyReturnedCentral;
    const dispensed = Number(line.supervisorOutstandingQty ?? 0);

    if (dispensed + qty > maxAtSite) {
      throw new Error(
        `Only ${Math.max(0, maxAtSite - dispensed)} L can still be dispensed to vehicles for this line`
      );
    }

    const newItems = patchItemsSupervisorQty(requestData.items, input.itemId, qty);

    transaction.update(requestRef, {
      items: newItems,
      updatedAt: serverTimestamp(),
      lastSupervisorCustodyUpdateBy: actor.userId,
      lastSupervisorCustodyUpdateByName: actor.userName,
    });

    transaction.set(assignmentRef, {
      assignmentSource: 'site_request',
      sourceRequestId: input.requestId,
      sourceRequestNumber: requestData.requestNumber ?? '',
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      quantityLiters: qty,
      referenceSiteId: input.siteId,
      referenceSiteName,
      reason: input.reason?.trim() || '',
      notes: input.notes?.trim() || '',
      assignedByUserId: user.uid,
      assignedByName: actor.userName,
      createdAt: serverTimestamp(),
    });
  });

  return { assignmentId: assignmentRef.id };
}

/**
 * Dispenses a fuel item to a vehicle across multiple transferred request lines in one atomic transaction.
 * Used by the inventory-first split flow. Each distribution entry creates one vehicleFuelAssignment doc
 * with assignmentSource 'site_request', keeping supervisorOutstandingQty accurate on every request line.
 *
 * Think of it like splitting a single fuel top-up across multiple "purchase orders" — one tank fill-up
 * might draw 30L from request REQ-101 and 20L from request REQ-102, creating two log entries that both
 * point to the same vehicle.
 */
export async function dispenseFuelFromMultipleRequestsToVehicle(
  input: DispenseFuelFromMultipleRequestsInput,
  actor: { userId: string; userName: string }
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const active = input.distributions.filter((d) => d.quantityLiters > 0);
  if (active.length === 0) throw new Error('No quantity to dispense');

  for (const dist of active) {
    if (!Number.isFinite(dist.quantityLiters) || dist.quantityLiters <= 0) {
      throw new Error('Each quantity must be a positive number');
    }
  }

  const item = await getItemById(input.itemId);
  if (!item) throw new Error('Fuel item not found');
  if (item.type !== 'fuel') throw new Error('Only fuel-type items can be dispensed to vehicles');

  const vehicle = await getVehicleById(input.vehicleId);
  if (!vehicle) throw new Error('Vehicle not found');

  const referenceSiteName = await getSiteName(input.siteId);

  const requestRefs = active.map((d) => doc(db, REQUESTS_COLLECTION, d.requestId));
  const assignmentRefs = active.map(() => doc(collection(db, COLLECTION)));

  await runTransaction(db, async (transaction) => {
    // All reads before any writes (Firestore transaction requirement)
    const reqSnaps = await Promise.all(requestRefs.map((ref) => transaction.get(ref)));

    for (let i = 0; i < active.length; i++) {
      const dist = active[i];
      const reqSnap = reqSnaps[i];
      if (!reqSnap.exists()) throw new Error('Request not found');
      const requestData = reqSnap.data() as Request;

      if (requestData.siteId !== input.siteId) {
        throw new Error('Request does not belong to this site');
      }
      if (requestData.status !== 'transferred' && requestData.status !== 'partially_returned') {
        throw new Error(`Request ${requestData.requestNumber} is not transferred yet`);
      }

      const line = requestData.items?.find((item) => item.itemId === input.itemId);
      if (!line) throw new Error(`Fuel item not found on request ${requestData.requestNumber}`);
      if (line.itemType !== 'fuel') {
        throw new Error(`Line on ${requestData.requestNumber} is not a fuel line`);
      }

      const maxAtSite =
        Number(line.quantityApproved ?? 0) - Number(line.quantityReturned ?? 0);
      const alreadyDispensed = Number(line.supervisorOutstandingQty ?? 0);

      if (alreadyDispensed + dist.quantityLiters > maxAtSite) {
        throw new Error(
          `Only ${Math.max(0, maxAtSite - alreadyDispensed)} L available on ${requestData.requestNumber}`
        );
      }

      const newItems = patchItemsSupervisorQty(requestData.items, input.itemId, dist.quantityLiters);

      transaction.update(requestRefs[i], {
        items: newItems,
        updatedAt: serverTimestamp(),
        lastSupervisorCustodyUpdateBy: actor.userId,
        lastSupervisorCustodyUpdateByName: actor.userName,
      });

      transaction.set(assignmentRefs[i], {
        assignmentSource: 'site_request',
        sourceRequestId: dist.requestId,
        sourceRequestNumber: requestData.requestNumber ?? '',
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        itemId: item.id,
        itemName: item.name,
        itemSku: item.sku,
        quantityLiters: dist.quantityLiters,
        referenceSiteId: input.siteId,
        referenceSiteName,
        reason: '',
        notes: '',
        assignedByUserId: user.uid,
        assignedByName: actor.userName,
        createdAt: serverTimestamp(),
      });
    }
  });
}
