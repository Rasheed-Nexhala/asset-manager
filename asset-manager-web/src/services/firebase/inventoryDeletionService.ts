import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const PURCHASE_ORDERS_COLLECTION = 'purchaseOrders';
const REQUESTS_COLLECTION = 'requests';
const MAINTENANCE_COLLECTION = 'maintenance';

/** Item data needed for deletion eligibility check */
export interface ItemDeletionCheckInput {
  totalQuantity?: number;
  atSitesQuantity?: number;
  inMaintenanceQuantity?: number;
}

/** Result of pre-delete validation */
export interface ItemDeletionBlockReason {
  canDelete: boolean;
  reason?: string;
  draftPoNumbers?: string[];
  pendingRequestNumbers?: string[];
  activeMaintenanceIds?: string[];
}

/**
 * Check if an item can be deleted.
 *
 * Rules:
 * - Block if atSitesQuantity > 0 OR inMaintenanceQuantity > 0
 * - Block if item is in draft PO(s)
 * - Block if item is in pending/approved request(s)
 * - Block if item is in active maintenance (pending or partial_return)
 *
 * @param itemId - Item document ID
 * @param item - Item data with stock quantities
 * @returns Result with canDelete and optional reason/details
 */
export async function checkCanDeleteItem(
  itemId: string,
  item: ItemDeletionCheckInput
): Promise<ItemDeletionBlockReason> {
  const atSites = item.atSitesQuantity ?? 0;
  const inMaint = item.inMaintenanceQuantity ?? 0;

  // Stock check: block if any stock at sites or in maintenance
  if (atSites > 0 || inMaint > 0) {
    return {
      canDelete: false,
      reason:
        'Cannot delete: item has stock at sites or in maintenance. Reduce stock to zero or move all to central store first.',
    };
  }

  // Draft POs: query all draft POs, filter in memory for items containing itemId
  const draftPoQuery = query(
    collection(db, PURCHASE_ORDERS_COLLECTION),
    where('status', '==', 'draft')
  );
  const draftPoSnapshot = await getDocs(draftPoQuery);
  const draftPoNumbers: string[] = [];
  draftPoSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const items = data.items as Array<{ itemId?: string }> | undefined;
    if (items?.some((i) => i.itemId === itemId)) {
      const poNumber = data.poNumber as string | undefined;
      if (poNumber) draftPoNumbers.push(poNumber);
    }
  });
  if (draftPoNumbers.length > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete: item is in draft PO(s): ${draftPoNumbers.join(', ')}. Remove from draft PO first or delete the PO.`,
      draftPoNumbers,
    };
  }

  // Pending/approved requests: query, filter in memory
  const pendingRequestQuery = query(
    collection(db, REQUESTS_COLLECTION),
    where('status', 'in', ['pending', 'approved'])
  );
  const requestSnapshot = await getDocs(pendingRequestQuery);
  const pendingRequestNumbers: string[] = [];
  requestSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const items = data.items as Array<{ itemId?: string }> | undefined;
    if (items?.some((i) => i.itemId === itemId)) {
      const requestNumber = data.requestNumber as string | undefined;
      if (requestNumber) pendingRequestNumbers.push(requestNumber);
    }
  });
  if (pendingRequestNumbers.length > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete: item is in pending/approved request(s): ${pendingRequestNumbers.join(', ')}. Complete or reject the request first.`,
      pendingRequestNumbers,
    };
  }

  // Active maintenance: itemId + status in ['pending','partial_return']
  const maintenanceQuery = query(
    collection(db, MAINTENANCE_COLLECTION),
    where('itemId', '==', itemId),
    where('status', 'in', ['pending', 'partial_return'])
  );
  const maintenanceSnapshot = await getDocs(maintenanceQuery);
  const activeMaintenanceIds: string[] = maintenanceSnapshot.docs.map((d) => d.id);
  if (activeMaintenanceIds.length > 0) {
    return {
      canDelete: false,
      reason:
        'Cannot delete: item is in active maintenance record(s). Return or write off the maintenance record first.',
      activeMaintenanceIds,
    };
  }

  return { canDelete: true };
}
