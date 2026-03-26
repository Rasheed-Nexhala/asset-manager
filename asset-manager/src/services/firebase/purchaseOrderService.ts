import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  getCountFromServer,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import type { DocumentData, Transaction } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { getLocationId } from '../../utils/locationUtils';
import type {
  PurchaseOrder,
  PurchaseOrderFirestore,
  PurchaseOrderGrrReceiptFirestore,
  CreatePurchaseOrderData,
  ReceivePOData,
  ApprovePOData,
  RejectPOData,
} from '../../types/purchaseOrder';
import { firestorePOToPO } from '../../types/purchaseOrder';
import {
  incrementVendorPoCountInTransaction,
  updateVendorLastPoDateInTransaction,
} from './vendorService';

const PURCHASE_ORDERS_COLLECTION = 'purchaseOrders';
const PO_COUNTERS_COLLECTION = 'poCounters';
const GRR_COUNTERS_COLLECTION = 'grrCounters';
const INVENTORY_COLLECTION = 'inventory';
const ITEMS_COLLECTION = 'items';
const USERS_COLLECTION = 'users';

const DEFAULT_GST_PERCENTAGE = 18;

const getInventoryDocId = (itemId: string, locationId: string): string =>
  `${itemId}_${locationId}`;

const validatePoItemQuantities = (
  items: Array<{
    itemName: string;
    quantity: number;
    orderedUnit?: string;
    orderedQuantity?: number;
    unitPrice?: number;
    gstPercentage?: number;
  }>
): void => {
  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.itemName}`);
    }
    if ((item.orderedUnit === 'Kg' || item.orderedUnit === 'Ton') && !Number.isInteger(item.quantity)) {
      throw new Error(
        `Invalid quantity for ${item.itemName}. Weight-based orders must convert to whole pieces.`
      );
    }
    if (item.orderedQuantity != null && (!Number.isFinite(item.orderedQuantity) || item.orderedQuantity < 0)) {
      throw new Error(`Invalid ordered quantity for ${item.itemName}`);
    }
    if (item.unitPrice != null && (!Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      throw new Error(`Invalid unit price for ${item.itemName}. Must be 0 or greater.`);
    }
    if (item.gstPercentage != null && (!Number.isFinite(item.gstPercentage) || item.gstPercentage < 0)) {
      throw new Error(`Invalid GST percentage for ${item.itemName}. Must be 0 or greater.`);
    }
  }
};

/**
 * Check if a PO number is already used by another PO.
 * @param poNumber - The PO number to check (trimmed)
 * @param excludePoId - When updating, the current PO's ID to exclude from the check
 */
const isPoNumberTaken = async (
  poNumber: string,
  excludePoId?: string
): Promise<boolean> => {
  const q = query(
    collection(db, PURCHASE_ORDERS_COLLECTION),
    where('poNumber', '==', poNumber),
    limit(2)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  if (excludePoId) {
    const other = snapshot.docs.find((d) => d.id !== excludePoId);
    return other != null;
  }
  return true;
};

type PoActorFlags = { isSuperAdmin: boolean };

const fetchPoUserFlags = async (
  userId: string
): Promise<{ role: string | undefined; isSuperAdmin: boolean }> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDocFromServer(userRef);
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  const data = userSnap.data();
  return {
    role: data?.role as string | undefined,
    isSuperAdmin: data?.isSuperadmin === true,
  };
};

/** Store Incharge or super admin (regular Admin without flag cannot create POs). */
const ensureCanCreatePO = async (userId: string): Promise<void> => {
  const { role, isSuperAdmin } = await fetchPoUserFlags(userId);
  if (role !== 'StoreIncharge' && !isSuperAdmin) {
    throw new Error(
      'Only Store Incharge or super admin can create purchase orders'
    );
  }
};

/** Admin or super admin; returns flags for assigned-admin bypass when super admin. */
const ensureCanApproveRejectPO = async (
  userId: string
): Promise<PoActorFlags> => {
  const { role, isSuperAdmin } = await fetchPoUserFlags(userId);
  if (role !== 'Admin' && !isSuperAdmin) {
    throw new Error(
      'Only Admin or super admin can approve or reject purchase orders'
    );
  }
  return { isSuperAdmin };
};

const ensureCanReceive = async (userId: string): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDocFromServer(userRef);
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  const role = userSnap.data()?.role;
  if (role !== 'Admin' && role !== 'StoreIncharge') {
    throw new Error('Only Admin or Store Incharge can receive POs');
  }
};

const normalizeGrrReceiptsForRead = (
  raw: unknown
): PurchaseOrderGrrReceiptFirestore[] => {
  if (!Array.isArray(raw)) return [];
  const out: PurchaseOrderGrrReceiptFirestore[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Record<string, unknown>;
    const grrNumber = typeof r.grrNumber === 'string' ? r.grrNumber : '';
    if (!grrNumber) continue;
    let receivedAt: Timestamp;
    const rawAt = r.receivedAt;
    if (rawAt instanceof Timestamp) {
      receivedAt = rawAt;
    } else if (
      rawAt &&
      typeof rawAt === 'object' &&
      'toDate' in rawAt &&
      typeof (rawAt as { toDate: unknown }).toDate === 'function'
    ) {
      receivedAt = Timestamp.fromDate((rawAt as { toDate: () => Date }).toDate());
    } else {
      receivedAt = Timestamp.now();
    }
    out.push({
      grrNumber,
      receivedAt,
      receivedBy: typeof r.receivedBy === 'string' ? r.receivedBy : '',
      receivedByName:
        typeof r.receivedByName === 'string' ? r.receivedByName : '',
    });
  }
  return out;
};

/**
 * Normalize items when reading from Firestore (backward compat for old POs without per-item GST)
 */
const normalizePOItemsForRead = (
  rawItems: Array<Record<string, unknown>>
): PurchaseOrderFirestore['items'] =>
  (rawItems ?? []).map((item) => {
    const amount = (item.amount as number) ?? 0;
    const gstPct = (item.gstPercentage as number | undefined) ?? DEFAULT_GST_PERCENTAGE;
    const gstAmount =
      (item.gstAmount as number | undefined) ?? Math.round((amount * gstPct) / 100);
    return {
      itemId: item.itemId as string,
      itemName: item.itemName as string,
      itemSku: item.itemSku as string,
      unit: item.unit as string | undefined,
      isExistingItem: (item.isExistingItem as boolean) ?? false,
      quantity: (item.quantity as number) ?? 0,
      unitPrice: (item.unitPrice as number) ?? 0,
      amount,
      gstPercentage: gstPct,
      gstAmount,
      receivedQuantity: (item.receivedQuantity as number | null) ?? null,
      orderedUnit: (item.orderedUnit as string | undefined),
      orderedQuantity: (item.orderedQuantity as number | undefined),
      remarks: (item.remarks as string | undefined),
    };
  });

/**
 * Map a raw Firestore document data to a PurchaseOrderFirestore object.
 * Centralizes defaults and type safety for fields across different fetch methods.
 */
const mapFirestoreDocToPOFirestore = (
  id: string,
  data: DocumentData
): PurchaseOrderFirestore => {
  const items = normalizePOItemsForRead(data.items ?? []);
  return {
    id,
    poNumber: data.poNumber,
    vendorId: data.vendorId,
    vendorName: data.vendorName,
    vendorContact: data.vendorContact,
    vendorEmail: data.vendorEmail,
    vendorAddress: data.vendorAddress,
    vendorGstin: data.vendorGstin,
    vendorContactPerson: data.vendorContactPerson,
    location: data.location,
    jobNo: data.jobNo,
    poIssueSite: data.poIssueSite,
    deliveryLocation: data.deliveryLocation,
    buyerContactName: data.buyerContactName,
    buyerContactPhone: data.buyerContactPhone,
    siteId: data.siteId,
    siteName: data.siteName,
    deliveryDateText: data.deliveryDateText,
    items,
    subtotal: data.subtotal,
    gstPercentage: data.gstPercentage ?? DEFAULT_GST_PERCENTAGE,
    gstAmount: data.gstAmount ?? 0,
    totalAmount: data.totalAmount ?? 0,
    justification: data.justification,
    expectedDeliveryDate: data.expectedDeliveryDate ?? null,
    documents: data.documents ?? [],
    pdfUrl: data.pdfUrl,
    status: data.status,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    createdByRole: data.createdByRole ?? undefined,
    createdAt: data.createdAt,
    reviewedBy: data.reviewedBy ?? null,
    reviewedByName: data.reviewedByName ?? null,
    reviewedAt: data.reviewedAt ?? null,
    adminComments: data.adminComments ?? null,
    rejectionReason: data.rejectionReason ?? null,
    signedPdfUrl: data.signedPdfUrl ?? undefined,
    downloadedBy: data.downloadedBy ?? undefined,
    downloadedByName: data.downloadedByName ?? undefined,
    assignedToAdminId: data.assignedToAdminId ?? undefined,
    assignedToAdminName: data.assignedToAdminName ?? undefined,
    receivedAt: data.receivedAt ?? null,
    receivedBy: data.receivedBy ?? null,
    receivedByName: data.receivedByName ?? null,
    receivedNotes: data.receivedNotes ?? null,
    grrReceipts: normalizeGrrReceiptsForRead(data.grrReceipts),
    updatedAt: data.updatedAt,
  };
};

/**
 * Generate unique PO number using a counter document.
 * Format: PO-YYYY-NNNN
 */
const generatePoNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const counterDocId = `year_${year}`;

  try {
    const result = await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, PO_COUNTERS_COLLECTION, counterDocId);
      const counterSnap = await transaction.get(counterRef);

      const lastNumber = counterSnap.exists()
        ? (counterSnap.data()?.lastNumber ?? 0)
        : 0;
      const nextNumber = lastNumber + 1;

      transaction.set(counterRef, {
        year,
        lastNumber: nextNumber,
        updatedAt: serverTimestamp(),
      });

      return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    });

    return result;
  } catch (error) {
    console.error('Error generating PO number:', error);
    throw new Error('Failed to generate PO number. Please try again.');
  }
};

/** Next PO-RCV-YYYY-NNNN inside an existing transaction (year from receipt date; NNNN = 4-digit seq per year). */
const generateGrrNumberInTransaction = async (
  transaction: Transaction,
  forDate: Date
): Promise<string> => {
  const year = forDate.getFullYear();
  const counterDocId = `year_${year}`;
  const counterRef = doc(db, GRR_COUNTERS_COLLECTION, counterDocId);
  const counterSnap = await transaction.get(counterRef);
  const lastNumber = counterSnap.exists()
    ? (counterSnap.data()?.lastNumber ?? 0)
    : 0;
  const nextNumber = lastNumber + 1;
  transaction.set(counterRef, {
    year,
    lastNumber: nextNumber,
    updatedAt: serverTimestamp(),
  });
  return `PO-RCV-${year}-${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Build PO items with amounts and per-item GST from CreatePurchaseOrderData
 */
const buildPOItems = (
  items: CreatePurchaseOrderData['items']
): PurchaseOrderFirestore['items'] =>
  items.map((item) => {
    const unitPrice = item.unitPrice ?? 0;
    const orderQty = item.orderedQuantity ?? item.quantity;
    const amount = orderQty * unitPrice;
    const gstPct = item.gstPercentage ?? (unitPrice > 0 ? DEFAULT_GST_PERCENTAGE : 0);
    const gstAmount = gstPct > 0 ? Math.round((amount * gstPct) / 100) : 0;
    return {
      itemId: item.itemId,
      itemName: item.itemName,
      itemSku: item.itemSku,
      ...(item.unit != null && item.unit !== '' ? { unit: item.unit } : {}),
      isExistingItem: item.isExistingItem,
      quantity: item.quantity,
      unitPrice,
      amount,
      gstPercentage: gstPct,
      gstAmount,
      receivedQuantity: null,
      ...(item.orderedUnit != null && item.orderedUnit !== '' ? { orderedUnit: item.orderedUnit } : {}),
      ...(item.orderedQuantity != null ? { orderedQuantity: item.orderedQuantity } : {}),
      ...(item.remarks != null && item.remarks !== '' ? { remarks: item.remarks } : {}),
    };
  });

/**
 * Calculate subtotal, GST, total from items (per-item GST)
 */
const calculateTotals = (items: PurchaseOrderFirestore['items']) => {
  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const gstAmount = items.reduce(
    (sum, i) => sum + (i.gstAmount ?? Math.round((i.amount * (i.gstPercentage ?? DEFAULT_GST_PERCENTAGE)) / 100)),
    0
  );
  const totalAmount = subtotal + gstAmount;
  const gstPercentage = subtotal > 0 ? (gstAmount / subtotal) * 100 : 0;
  return { subtotal, gstAmount, totalAmount, gstPercentage };
};

/**
 * Create a new purchase order
 */
export const createPO = async (
  data: CreatePurchaseOrderData,
  userId: string,
  userName: string,
  isDraft: boolean = false,
  createdByRole?: string
): Promise<string> => {
  try {
    await ensureCanCreatePO(userId);
    validatePoItemQuantities(data.items);
    if (!isDraft) {
      const assignedId = data.assignedToAdminId?.trim();
      const assignedName = data.assignedToAdminName?.trim();
      if (!assignedId || !assignedName) {
        throw new Error('Please select an admin to assign for approval when submitting for approval.');
      }
    }
    const trimmed = data.poNumber?.trim();
    if (!trimmed) {
      throw new Error('PO number is required.');
    }
    if (await isPoNumberTaken(trimmed)) {
      throw new Error(`PO number "${trimmed}" is already in use.`);
    }
    const poNumber = trimmed;
    const items = buildPOItems(data.items);
    const { subtotal, gstAmount, totalAmount, gstPercentage } = calculateTotals(items);

    const expectedDeliveryTimestamp = data.expectedDeliveryDate
      ? Timestamp.fromDate(new Date(data.expectedDeliveryDate))
      : null;

    // All non-draft POs go to pending_approval; Admin must upload signed PO and approve like others
    const status = isDraft ? 'draft' : 'pending_approval';
    const reviewedBy = null;
    const reviewedByName = null;
    const reviewedAt = null;

    const newPO = {
      poNumber,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      vendorContact: data.vendorContact,
      vendorEmail: data.vendorEmail ?? null,
      vendorAddress: data.vendorAddress ?? null,
      vendorGstin: data.vendorGstin ?? null,
      vendorContactPerson: data.vendorContactPerson ?? null,
      location: data.location ?? null,
      jobNo: data.jobNo ?? null,
      poIssueSite: data.poIssueSite ?? null,
      deliveryLocation: data.deliveryLocation ?? null,
      buyerContactName: data.buyerContactName ?? null,
      buyerContactPhone: data.buyerContactPhone ?? null,
      siteId: data.siteId?.trim() || null,
      siteName: data.siteName?.trim() || null,
      deliveryDateText: data.deliveryDateText?.trim() || null,
      items,
      subtotal,
      gstPercentage,
      gstAmount,
      totalAmount,
      justification: data.justification.trim(),
      expectedDeliveryDate: expectedDeliveryTimestamp,
      documents: [],
      status,
      createdBy: userId,
      createdByName: userName,
      createdByRole: createdByRole ?? null,
      createdAt: serverTimestamp(),
      reviewedBy,
      reviewedByName,
      reviewedAt,
      adminComments: null,
      rejectionReason: null,
      receivedAt: null,
      receivedBy: null,
      receivedByName: null,
      receivedNotes: null,
      assignedToAdminId: !isDraft && data.assignedToAdminId?.trim() ? data.assignedToAdminId.trim() : null,
      assignedToAdminName: !isDraft && data.assignedToAdminName?.trim() ? data.assignedToAdminName.trim() : null,
      updatedAt: serverTimestamp(),
    };

    const docId = await runTransaction(db, async (transaction) => {
      const docRef = doc(collection(db, PURCHASE_ORDERS_COLLECTION));
      transaction.set(docRef, newPO);
      if (!isDraft) {
        incrementVendorPoCountInTransaction(
          transaction,
          data.vendorId,
          Timestamp.now()
        );
      }
      return docRef.id;
    });

    return docId;
  } catch (error) {
    console.error('Error creating PO:', error);
    if (error instanceof Error && error.message.includes('already in use')) {
      throw error;
    }
    throw new Error('Failed to create purchase order. Please try again.');
  }
};

/**
 * Get a single PO by ID
 */
export const getPOById = async (poId: string): Promise<PurchaseOrder | null> => {
  try {
    const poDoc = await getDoc(doc(db, PURCHASE_ORDERS_COLLECTION, poId));

    if (!poDoc.exists()) {
      return null;
    }

    const data = poDoc.data();
    const firestorePO = mapFirestoreDocToPOFirestore(poDoc.id, data);

    return firestorePOToPO(firestorePO);
  } catch (error) {
    console.error('Error getting PO by ID:', error);
    throw error;
  }
};

/**
 * Delete a draft purchase order (permanently removes from Firestore).
 * Only the PO creator can delete, and only when status is draft.
 */
export const deletePO = async (poId: string, userId: string): Promise<void> => {
  try {
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
    const poSnap = await getDoc(poRef);

    if (!poSnap.exists()) {
      throw new Error('Purchase order not found');
    }

    const poData = poSnap.data();

    if (poData.status !== 'draft') {
      throw new Error('Only draft purchase orders can be deleted');
    }

    if (poData.createdBy !== userId) {
      throw new Error('Only the creator can delete this draft');
    }

    await deleteDoc(poRef);
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    throw error;
  }
};

/**
 * Update an existing draft purchase order
 * Only POs with status 'draft' can be updated
 */
export const updatePO = async (
  poId: string,
  data: CreatePurchaseOrderData,
  isDraft: boolean = false,
  createdByRole?: string,
  userId?: string,
  userName?: string
): Promise<PurchaseOrder | null> => {
  try {
    if (!userId) {
      throw new Error('User ID is required to update a purchase order');
    }
    if (!isDraft) {
      await ensureCanCreatePO(userId);
    }
    validatePoItemQuantities(data.items);
    if (!isDraft) {
      const assignedId = data.assignedToAdminId?.trim();
      const assignedName = data.assignedToAdminName?.trim();
      if (!assignedId || !assignedName) {
        throw new Error('Please select an admin to assign for approval when submitting for approval.');
      }
    }
    const trimmed = data.poNumber?.trim();
    if (!trimmed) {
      throw new Error('PO number is required.');
    }
    const newPoNumber = trimmed;
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);

    const existingSnap = await getDoc(poRef);
    if (existingSnap.exists()) {
      const currentPoNumber = existingSnap.data()?.poNumber as string | undefined;
      if (currentPoNumber !== newPoNumber && (await isPoNumberTaken(newPoNumber, poId))) {
        throw new Error(`PO number "${newPoNumber}" is already in use.`);
      }
    }

    const items = buildPOItems(data.items);
    const { subtotal, gstAmount, totalAmount, gstPercentage } = calculateTotals(items);

    const expectedDeliveryTimestamp = data.expectedDeliveryDate
      ? Timestamp.fromDate(new Date(data.expectedDeliveryDate))
      : null;

    // All non-draft POs go to pending_approval; Admin must upload signed PO and approve like others
    const status = isDraft ? 'draft' : 'pending_approval';
    const reviewedBy = null;
    const reviewedByName = null;
    const reviewedAt = null;

    await runTransaction(db, async (transaction) => {
      const poSnap = await transaction.get(poRef);
      if (!poSnap.exists()) {
        throw new Error('Purchase order not found');
      }

      const poData = poSnap.data();
      if (poData.status !== 'draft') {
        throw new Error(
          `Cannot update PO with status "${poData.status}". Only draft POs can be updated.`
        );
      }
      if (poData.createdBy !== userId) {
        throw new Error('Only the creator can update this draft');
      }

      const updatePayload: Record<string, unknown> = {
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        vendorContact: data.vendorContact,
        vendorEmail: data.vendorEmail ?? null,
        vendorAddress: data.vendorAddress ?? null,
        vendorGstin: data.vendorGstin ?? null,
        vendorContactPerson: data.vendorContactPerson ?? null,
        location: data.location ?? null,
        jobNo: data.jobNo ?? null,
        poIssueSite: data.poIssueSite ?? null,
        deliveryLocation: data.deliveryLocation ?? null,
        buyerContactName: data.buyerContactName ?? null,
        buyerContactPhone: data.buyerContactPhone ?? null,
        siteId: data.siteId?.trim() || null,
        siteName: data.siteName?.trim() || null,
        deliveryDateText: data.deliveryDateText?.trim() || null,
        items,
        subtotal,
        gstPercentage,
        gstAmount,
        totalAmount,
        justification: data.justification.trim(),
        expectedDeliveryDate: expectedDeliveryTimestamp,
        status,
        createdByRole: createdByRole ?? null,
        reviewedBy,
        reviewedByName,
        reviewedAt,
        assignedToAdminId: !isDraft && data.assignedToAdminId?.trim() ? data.assignedToAdminId.trim() : null,
        assignedToAdminName: !isDraft && data.assignedToAdminName?.trim() ? data.assignedToAdminName.trim() : null,
        updatedAt: serverTimestamp(),
      };
      updatePayload.poNumber = newPoNumber;
      transaction.update(poRef, updatePayload);

      if (!isDraft) {
        incrementVendorPoCountInTransaction(
          transaction,
          data.vendorId,
          Timestamp.now()
        );
      }
    });

    return getPOById(poId);
  } catch (error) {
    console.error('Error updating PO:', error);
    if (error instanceof Error && error.message.includes('already in use')) {
      throw error;
    }
    throw error;
  }
};

/**
 * Record that an admin downloaded the PO for signing.
 * Sets downloadedBy/downloadedByName so "Approved By" shows the correct admin.
 */
export const recordPODownloadForSigning = async (
  poId: string,
  adminId: string,
  adminName: string
): Promise<void> => {
  try {
    await ensureCanApproveRejectPO(adminId);
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
    const poSnap = await getDoc(poRef);

    if (!poSnap.exists()) {
      throw new Error('Purchase order not found');
    }

    const poData = poSnap.data();
    if (poData.status !== 'pending_approval') {
      throw new Error('Only pending approval POs can be downloaded for signing');
    }

    await updateDoc(poRef, {
      downloadedBy: adminId,
      downloadedByName: adminName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error recording PO download for signing:', error);
    throw error;
  }
};

/**
 * Update a PO with the signed document URL (after admin uploads signed PDF/image).
 */
export const setSignedPdfUrl = async (
  poId: string,
  adminId: string,
  signedPdfUrl: string
): Promise<PurchaseOrder | null> => {
  try {
    const { isSuperAdmin } = await ensureCanApproveRejectPO(adminId);
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
    const poSnap = await getDoc(poRef);

    if (!poSnap.exists()) {
      throw new Error('Purchase order not found');
    }

    const poData = poSnap.data();
    if (poData.status !== 'pending_approval') {
      throw new Error('Signed document can only be uploaded for pending approval POs');
    }
    const assignedId = poData.assignedToAdminId?.trim();
    if (
      assignedId &&
      assignedId !== adminId &&
      !isSuperAdmin
    ) {
      throw new Error('Only the assigned admin can upload the signed document for this PO.');
    }

    await updateDoc(poRef, {
      signedPdfUrl,
      updatedAt: serverTimestamp(),
    });

    return getPOById(poId);
  } catch (error) {
    console.error('Error setting signed PDF URL:', error);
    throw error;
  }
};

/**
 * Clear the signed document URL from a PO (allows user to remove and re-upload).
 * Only allowed for pending_approval POs.
 */
export const clearSignedPdfUrl = async (
  poId: string,
  adminId: string
): Promise<PurchaseOrder | null> => {
  try {
    const { isSuperAdmin } = await ensureCanApproveRejectPO(adminId);
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
    const poSnap = await getDoc(poRef);

    if (!poSnap.exists()) {
      throw new Error('Purchase order not found');
    }

    const poData = poSnap.data();
    if (poData.status !== 'pending_approval') {
      throw new Error('Signed document can only be removed from pending approval POs');
    }
    const assignedId = poData.assignedToAdminId?.trim();
    if (
      assignedId &&
      assignedId !== adminId &&
      !isSuperAdmin
    ) {
      throw new Error('Only the assigned admin can remove the signed document for this PO.');
    }

    await updateDoc(poRef, {
      signedPdfUrl: null,
      updatedAt: serverTimestamp(),
    });

    return getPOById(poId);
  } catch (error) {
    console.error('Error clearing signed PDF URL:', error);
    throw error;
  }
};

/**
 * Approve a PO (Admin only).
 * Admin name is recorded in reviewedBy/reviewedByName. Signed document upload is optional;
 * store incharge can print and sign later when receiving.
 */
export const approvePO = async (
  poId: string,
  adminId: string,
  adminName: string,
  data?: ApprovePOData
): Promise<void> => {
  try {
    const { isSuperAdmin } = await ensureCanApproveRejectPO(adminId);
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);

    await runTransaction(db, async (transaction) => {
      const poSnap = await transaction.get(poRef);
      if (!poSnap.exists()) {
        throw new Error('Purchase order not found');
      }

      const poData = poSnap.data();
      if (poData.status !== 'pending_approval') {
        throw new Error(
          `Cannot approve PO with status "${poData.status}". Only pending approval POs can be approved.`
        );
      }
      const assignedId = poData.assignedToAdminId?.trim();
      if (
        assignedId &&
        assignedId !== adminId &&
        !isSuperAdmin
      ) {
        throw new Error('Only the assigned admin can approve this PO.');
      }

      transaction.update(poRef, {
        status: 'approved',
        reviewedBy: adminId,
        reviewedByName: adminName,
        reviewedAt: serverTimestamp(),
        adminComments: data?.adminComments?.trim() ?? null,
        rejectionReason: null,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error approving PO:', error);
    throw error;
  }
};

/**
 * Reject a PO (Admin only)
 */
export const rejectPO = async (
  poId: string,
  adminId: string,
  adminName: string,
  data: RejectPOData
): Promise<void> => {
  try {
    const { isSuperAdmin } = await ensureCanApproveRejectPO(adminId);
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);

    await runTransaction(db, async (transaction) => {
      const poSnap = await transaction.get(poRef);
      if (!poSnap.exists()) {
        throw new Error('Purchase order not found');
      }

      const poData = poSnap.data();
      if (poData.status !== 'pending_approval') {
        throw new Error(
          `Cannot reject PO with status "${poData.status}". Only pending approval POs can be rejected.`
        );
      }
      const assignedId = poData.assignedToAdminId?.trim();
      if (
        assignedId &&
        assignedId !== adminId &&
        !isSuperAdmin
      ) {
        throw new Error('Only the assigned admin can reject this PO.');
      }

      transaction.update(poRef, {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedByName: adminName,
        reviewedAt: serverTimestamp(),
        rejectionReason: data.rejectionReason.trim(),
        adminComments: data.adminComments?.trim() ?? null,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error rejecting PO:', error);
    throw error;
  }
};

/**
 * Receive a PO and update inventory atomically
 */
export const receivePO = async (
  poId: string,
  receiveData: ReceivePOData,
  userId: string,
  userName: string
): Promise<{ grrNumber: string }> => {
  const storeLocationId = getLocationId('store');
  await ensureCanReceive(userId);
  const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);

  // Pre-fetch PO to know which items to look up
  const initialPoSnap = await getDocFromServer(poRef);
  if (!initialPoSnap.exists()) {
    throw new Error('Purchase order not found');
  }

  const initialPoData = initialPoSnap.data();
  if (initialPoData.status !== 'approved' && initialPoData.status !== 'ordered' && initialPoData.status !== 'partially_received') {
    throw new Error(
      `Cannot receive PO with status "${initialPoData.status}". Only approved, ordered, or partially received POs can be received.`
    );
  }

  if (!Array.isArray(initialPoData.items) || initialPoData.items.length === 0) {
    throw new Error('PO has no valid items');
  }

  const receivedByQty = new Map(
    receiveData.receivedQuantities.map((r) => [r.itemId, r.receivedQuantity])
  );

  let mintedGrrNumber = '';

  await runTransaction(db, async (transaction) => {
    // 1. Re-read PO document
    const poSnap = await transaction.get(poRef);
    if (!poSnap.exists()) {
      throw new Error('Purchase order not found');
    }

    const poData = poSnap.data();
    if (poData.status !== 'approved' && poData.status !== 'ordered' && poData.status !== 'partially_received') {
      throw new Error(
        `Cannot receive PO with status "${poData.status}". Only approved, ordered, or partially received POs can be received.`
      );
    }

    const poItemIds = new Set(poData.items.map((i: { itemId: string }) => i.itemId));
    for (const r of receiveData.receivedQuantities) {
      if (r.receivedQuantity > 0 && !poItemIds.has(r.itemId)) {
        throw new Error(`Item ${r.itemId} is not part of this purchase order`);
      }
    }

    for (const item of poData.items) {
      const qty = receivedByQty.get(item.itemId) ?? 0;
      if (qty < 0) {
        throw new Error(
          `Invalid received quantity for ${item.itemName}: ${qty}. Must be 0 or greater`
        );
      }
      if (!Number.isInteger(qty)) {
        throw new Error(`Received quantity for ${item.itemName} must be a whole number`);
      }
    }

    const hasAtLeastOneReceived = poData.items.some(
      (item: any) => (receivedByQty.get(item.itemId) ?? 0) > 0
    );
    if (!hasAtLeastOneReceived) {
      throw new Error(
        'At least one item must have a received quantity greater than zero'
      );
    }

    // 2. Re-read all item and inventory documents
    const readsData: any[] = [];
    for (const item of poData.items) {
      const receivedQty = receivedByQty.get(item.itemId) ?? 0;
      if (receivedQty === 0) continue;

      const itemRef = doc(db, ITEMS_COLLECTION, item.itemId);
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists()) {
        throw new Error(`Item ${item.itemName} (${item.itemId}) not found`);
      }

      const inventoryRef = doc(
        db,
        INVENTORY_COLLECTION,
        getInventoryDocId(item.itemId, storeLocationId)
      );
      const invSnap = await transaction.get(inventoryRef);

      readsData.push({
        item,
        receivedQty,
        itemRef,
        itemData: itemSnap.data(),
        inventoryRef,
        invSnap,
      });
    }

    // 3. Perform all writes
    const now = serverTimestamp();
    for (const data of readsData) {
      const { item, receivedQty, itemRef, itemData, inventoryRef, invSnap } = data;

      if (invSnap && invSnap.exists()) {
        transaction.update(inventoryRef, {
          quantity: invSnap.data().quantity + receivedQty,
          updatedAt: now,
        });
      } else {
        transaction.set(inventoryRef, {
          itemId: item.itemId,
          itemName: item.itemName,
          itemSku: item.itemSku,
          locationId: storeLocationId,
          locationType: 'store',
          locationName: 'Central Store',
          quantity: receivedQty,
          updatedAt: now,
        });
      }

      transaction.update(itemRef, {
        centralStoreQuantity: (itemData.centralStoreQuantity || 0) + receivedQty,
        totalQuantity: (itemData.totalQuantity || 0) + receivedQty,
        updatedAt: now,
      });
    }

    const documents = receiveData.documents.map((d) => ({
      type: d.type,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      uploadedAt: Timestamp.now(),
    }));

    const receivedAtTimestamp = Timestamp.fromDate(
      new Date(receiveData.receivedDate)
    );

    const nextGrr = await generateGrrNumberInTransaction(
      transaction,
      new Date(receiveData.receivedDate)
    );
    mintedGrrNumber = nextGrr;

    const existingGrr = Array.isArray(poData.grrReceipts)
      ? poData.grrReceipts
      : [];
    const newGrrReceipt: PurchaseOrderGrrReceiptFirestore = {
      grrNumber: nextGrr,
      receivedAt: receivedAtTimestamp,
      receivedBy: userId,
      receivedByName: userName,
    };

    let allFullyReceived = true;
    const updatedItems = poData.items.map((item: any) => {
      const newlyReceived = receivedByQty.get(item.itemId) ?? 0;
      const totalReceived = (item.receivedQuantity ?? 0) + newlyReceived;
      
      if (totalReceived < item.quantity) {
        allFullyReceived = false;
      }

      return {
        ...item,
        receivedQuantity: totalReceived,
      };
    });

    const newStatus = allFullyReceived ? 'received' : 'partially_received';

    transaction.update(poRef, {
      status: newStatus,
      receivedAt: receivedAtTimestamp,
      receivedBy: userId,
      receivedByName: userName,
      receivedNotes: receiveData.receivedNotes?.trim() ?? null,
      documents: [...(poData.documents ?? []), ...documents],
      items: updatedItems,
      grrReceipts: [...existingGrr, newGrrReceipt],
      updatedAt: serverTimestamp(),
    });

    updateVendorLastPoDateInTransaction(
      transaction,
      initialPoData.vendorId,
      receivedAtTimestamp
    );
  });

  return { grrNumber: mintedGrrNumber };
};

/**
 * Build Firestore query constraints for purchase orders (shared by listPaginated and getCount).
 * statusFilter 'all' means no status filter.
 */
const buildPOQueryConstraints = (statusFilter?: string): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];
  if (statusFilter && statusFilter !== 'all') {
    constraints.push(where('status', '==', statusFilter));
  }
  constraints.push(orderBy('createdAt', 'desc'));
  return constraints;
};

/** Default page size for paginated PO lists */
export const PURCHASE_ORDERS_PAGE_SIZE = 15;

/**
 * List purchase orders with cursor-based pagination.
 *
 * @param statusFilter - 'all' or specific status (pending_approval, approved, etc.)
 * @param pageSize - Number of POs per page
 * @param lastDoc - Cursor for next page (from previous response)
 * @returns POs and cursor for next page
 */
export const listPurchaseOrdersPaginated = async (
  statusFilter: string | undefined,
  pageSize: number,
  lastDoc?: DocumentSnapshot
): Promise<{ orders: PurchaseOrder[]; lastDoc: DocumentSnapshot | null }> => {
  const constraints = buildPOQueryConstraints(statusFilter);
  if (lastDoc) constraints.push(startAfter(lastDoc));
  constraints.push(limit(pageSize));

  const q = query(collection(db, PURCHASE_ORDERS_COLLECTION), ...constraints);
  const snapshot = await getDocsFromServer(q);

  const orders: PurchaseOrder[] = [];
  snapshot.forEach((docSnap) => {
    try {
      const data = docSnap.data();
      const firestorePO = mapFirestoreDocToPOFirestore(docSnap.id, data);
      orders.push(firestorePOToPO(firestorePO));
    } catch (err) {
      console.warn('Skipping malformed PO document:', docSnap.id, err);
    }
  });

  const newLastDoc =
    snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { orders, lastDoc: newLastDoc };
};

/**
 * Get total count of purchase orders matching Firestore filters.
 * Must use same where/orderBy as listPurchaseOrdersPaginated.
 *
 * @param statusFilter - Same as listPurchaseOrdersPaginated ('all' or specific status)
 * @returns Total count from server
 */
export const getPurchaseOrdersCount = async (
  statusFilter: string | undefined
): Promise<number> => {
  const constraints = buildPOQueryConstraints(statusFilter);
  const q = query(collection(db, PURCHASE_ORDERS_COLLECTION), ...constraints);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};

const EXPORT_MAX_LIMIT = 1000;

/**
 * Fetch purchase orders without pagination for exporting
 *
 * @param statusFilter - Optional status filter
 * @param maxLimit - Maximum number of POs to export (default 1000)
 * @returns Array of purchase orders
 */
export const exportPurchaseOrders = async (
  statusFilter?: string,
  maxLimit?: number
): Promise<PurchaseOrder[]> => {
  try {
    const constraints = buildPOQueryConstraints(statusFilter);
    constraints.push(limit(maxLimit ?? EXPORT_MAX_LIMIT));
    const q = query(collection(db, PURCHASE_ORDERS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const orders: PurchaseOrder[] = [];
    snapshot.forEach((docSnap) => {
      try {
        const data = docSnap.data();
        const firestorePO = mapFirestoreDocToPOFirestore(docSnap.id, data);
        orders.push(firestorePOToPO(firestorePO));
      } catch (err) {
        console.warn('Skipping malformed PO document:', docSnap.id, err);
      }
    });

    return orders;
  } catch (error) {
    console.error('Error exporting purchase orders:', error);
    throw error;
  }
};

/**
 * Get count of pending purchase orders for the dashboard widget
 */
export const getPendingPOCount = async (): Promise<number> => {
  const q = query(
    collection(db, PURCHASE_ORDERS_COLLECTION),
    where('status', '==', 'pending_approval')
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};

/**
 * Subscribe to purchase orders with optional status filter (real-time Firestore snapshot).
 * On error, callback receives ([], error). On success, callback receives (orders).
 * Used by PurchaseOrderListScreen for live updates. Loads full list (no pagination).
 */
export const subscribeToPurchaseOrders = (
  callback: (orders: PurchaseOrder[], error?: Error) => void,
  statusFilter?: string
): (() => void) => {
  let q = query(
    collection(db, PURCHASE_ORDERS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  if (statusFilter && statusFilter !== 'all') {
    q = query(q, where('status', '==', statusFilter));
  }

  q = query(q, limit(50));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const orders: PurchaseOrder[] = [];
      snapshot.forEach((docSnap) => {
        try {
          const data = docSnap.data();
          const firestorePO = mapFirestoreDocToPOFirestore(docSnap.id, data);
          orders.push(firestorePOToPO(firestorePO));
        } catch (err) {
          console.warn('Skipping malformed PO document:', docSnap.id, err);
        }
      });
      callback(orders);
    },
    (error) => {
      console.error('Error in purchase orders subscription:', error);
      callback([], error);
    }
  );

  return () => unsub();
};
