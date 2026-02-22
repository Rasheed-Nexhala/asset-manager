import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { getLocationId } from '../../utils/locationUtils';
import type {
  PurchaseOrder,
  PurchaseOrderFirestore,
  CreatePurchaseOrderData,
  ReceivePOData,
  ApprovePOData,
  RejectPOData,
} from '../../types/purchaseOrder';
import { firestorePOToPO } from '../../types/purchaseOrder';
import { incrementVendorPoCount, updateVendorLastPoDate } from './vendorService';

const PURCHASE_ORDERS_COLLECTION = 'purchaseOrders';
const PO_COUNTERS_COLLECTION = 'poCounters';
const INVENTORY_COLLECTION = 'inventory';
const ITEMS_COLLECTION = 'items';

const GST_PERCENTAGE = 18;

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
    return `${prefix}${Date.now()}`;
  }
};

/**
 * Build PO items with amounts from CreatePurchaseOrderData
 */
const buildPOItems = (
  items: CreatePurchaseOrderData['items']
): PurchaseOrderFirestore['items'] =>
  items.map((item) => ({
    itemId: item.itemId,
    itemName: item.itemName,
    itemSku: item.itemSku,
    isExistingItem: item.isExistingItem,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.quantity * item.unitPrice,
    receivedQuantity: null,
  }));

/**
 * Calculate subtotal, GST, total from items
 */
const calculateTotals = (items: PurchaseOrderFirestore['items']) => {
  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const gstAmount = Math.round((subtotal * GST_PERCENTAGE) / 100);
  const totalAmount = subtotal + gstAmount;
  return { subtotal, gstAmount, totalAmount };
};

/**
 * Create a new purchase order
 */
export const createPO = async (
  data: CreatePurchaseOrderData,
  userId: string,
  userName: string,
  isDraft: boolean = false
): Promise<string> => {
  try {
    const poNumber = await generatePoNumber();
    const items = buildPOItems(data.items);
    const { subtotal, gstAmount, totalAmount } = calculateTotals(items);

    const expectedDeliveryTimestamp = data.expectedDeliveryDate
      ? Timestamp.fromDate(new Date(data.expectedDeliveryDate))
      : null;

    const newPO = {
      poNumber,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      vendorContact: data.vendorContact,
      vendorEmail: data.vendorEmail ?? null,
      vendorAddress: data.vendorAddress ?? null,
      items,
      subtotal,
      gstPercentage: GST_PERCENTAGE,
      gstAmount,
      totalAmount,
      justification: data.justification.trim(),
      expectedDeliveryDate: expectedDeliveryTimestamp,
      documents: [],
      status: isDraft ? 'draft' : 'pending_approval',
      createdBy: userId,
      createdByName: userName,
      createdAt: serverTimestamp(),
      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      adminComments: null,
      rejectionReason: null,
      receivedAt: null,
      receivedBy: null,
      receivedByName: null,
      receivedNotes: null,
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, PURCHASE_ORDERS_COLLECTION),
      newPO
    );

    if (!isDraft) {
      await incrementVendorPoCount(data.vendorId, Timestamp.now());
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating PO:', error);
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
    const firestorePO: PurchaseOrderFirestore = {
      id: poDoc.id,
      poNumber: data.poNumber,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      vendorContact: data.vendorContact,
      vendorEmail: data.vendorEmail,
      vendorAddress: data.vendorAddress,
      items: data.items,
      subtotal: data.subtotal,
      gstPercentage: data.gstPercentage ?? GST_PERCENTAGE,
      gstAmount: data.gstAmount,
      totalAmount: data.totalAmount,
      justification: data.justification,
      expectedDeliveryDate: data.expectedDeliveryDate ?? null,
      documents: data.documents ?? [],
      pdfUrl: data.pdfUrl,
      status: data.status,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: data.createdAt,
      reviewedBy: data.reviewedBy ?? null,
      reviewedByName: data.reviewedByName ?? null,
      reviewedAt: data.reviewedAt ?? null,
      adminComments: data.adminComments ?? null,
      rejectionReason: data.rejectionReason ?? null,
      receivedAt: data.receivedAt ?? null,
      receivedBy: data.receivedBy ?? null,
      receivedByName: data.receivedByName ?? null,
      receivedNotes: data.receivedNotes ?? null,
      updatedAt: data.updatedAt,
    };

    return firestorePOToPO(firestorePO);
  } catch (error) {
    console.error('Error getting PO by ID:', error);
    throw error;
  }
};

/**
 * Approve a PO (Admin only)
 */
export const approvePO = async (
  poId: string,
  adminId: string,
  adminName: string,
  data?: ApprovePOData
): Promise<void> => {
  try {
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
    const poSnap = await getDocFromServer(poRef);

    if (!poSnap.exists()) {
      throw new Error('Purchase order not found');
    }

    const poData = poSnap.data();
    if (poData.status !== 'pending_approval') {
      throw new Error(
        `Cannot approve PO with status "${poData.status}". Only pending approval POs can be approved.`
      );
    }

    await updateDoc(poRef, {
      status: 'approved',
      reviewedBy: adminId,
      reviewedByName: adminName,
      reviewedAt: serverTimestamp(),
      adminComments: data?.adminComments?.trim() ?? null,
      rejectionReason: null,
      updatedAt: serverTimestamp(),
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
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
    const poSnap = await getDocFromServer(poRef);

    if (!poSnap.exists()) {
      throw new Error('Purchase order not found');
    }

    const poData = poSnap.data();
    if (poData.status !== 'pending_approval') {
      throw new Error(
        `Cannot reject PO with status "${poData.status}". Only pending approval POs can be rejected.`
      );
    }

    await updateDoc(poRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedByName: adminName,
      reviewedAt: serverTimestamp(),
      rejectionReason: data.rejectionReason.trim(),
      adminComments: data.adminComments?.trim() ?? null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error rejecting PO:', error);
    throw error;
  }
};

/**
 * Mark PO as ordered (Admin/Store Incharge)
 */
export const markPOOrdered = async (poId: string): Promise<void> => {
  try {
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
    const poSnap = await getDocFromServer(poRef);

    if (!poSnap.exists()) {
      throw new Error('Purchase order not found');
    }

    const poData = poSnap.data();
    if (poData.status !== 'approved') {
      throw new Error(
        `Cannot mark PO as ordered. Current status: "${poData.status}". Only approved POs can be marked as ordered.`
      );
    }

    await updateDoc(poRef, {
      status: 'ordered',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking PO as ordered:', error);
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
): Promise<void> => {
  const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, poId);
  const poSnap = await getDocFromServer(poRef);

  if (!poSnap.exists()) {
    throw new Error('Purchase order not found');
  }

  const poData = poSnap.data();
  if (poData.status !== 'approved' && poData.status !== 'ordered') {
    throw new Error(
      `Cannot receive PO with status "${poData.status}". Only approved or ordered POs can be received.`
    );
  }

  const receivedByQty = new Map(
    receiveData.receivedQuantities.map((r) => [r.itemId, r.receivedQuantity])
  );

  for (const item of poData.items) {
    const qty = receivedByQty.get(item.itemId) ?? 0;
    if (qty < 0 || qty > item.quantity) {
      throw new Error(
        `Invalid received quantity for ${item.itemName}: ${qty}. Must be between 0 and ${item.quantity}`
      );
    }
  }

  const storeLocationId = getLocationId('store');

  const batch = writeBatch(db);

  for (const item of poData.items) {
    const receivedQty = receivedByQty.get(item.itemId) ?? 0;
    if (receivedQty === 0) continue;

    const storeInventoryQuery = query(
      collection(db, INVENTORY_COLLECTION),
      where('itemId', '==', item.itemId),
      where('locationId', '==', storeLocationId),
      limit(1)
    );
    const storeSnap = await getDocs(storeInventoryQuery);
    const itemDoc = await getDoc(doc(db, ITEMS_COLLECTION, item.itemId));

    if (!itemDoc.exists()) {
      throw new Error(`Item ${item.itemName} (${item.itemId}) not found`);
    }
    const itemData = itemDoc.data();

    const now = serverTimestamp();
    if (storeSnap.empty) {
      const newInvRef = doc(collection(db, INVENTORY_COLLECTION));
      batch.set(newInvRef, {
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        locationId: storeLocationId,
        locationType: 'store',
        locationName: 'Central Store',
        quantity: receivedQty,
        updatedAt: now,
      });
    } else {
      const invRef = storeSnap.docs[0].ref;
      batch.update(invRef, {
        quantity: increment(receivedQty),
        updatedAt: now,
      });
    }

    const itemRef = doc(db, ITEMS_COLLECTION, item.itemId);
    batch.update(itemRef, {
      centralStoreQuantity: increment(receivedQty),
      totalQuantity: increment(receivedQty),
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

  const updatedItems = poData.items.map((item: PurchaseOrderFirestore['items'][0]) => ({
    ...item,
    receivedQuantity: receivedByQty.get(item.itemId) ?? 0,
  }));

  batch.update(poRef, {
    status: 'received',
    receivedAt: receivedAtTimestamp,
    receivedBy: userId,
    receivedByName: userName,
    receivedNotes: receiveData.receivedNotes?.trim() ?? null,
    documents: [...(poData.documents ?? []), ...documents],
    items: updatedItems,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  await updateVendorLastPoDate(poData.vendorId, receivedAtTimestamp);
};

/**
 * Subscribe to purchase orders with optional status filter
 */
export const subscribeToPurchaseOrders = (
  callback: (orders: PurchaseOrder[]) => void,
  statusFilter?: string
): (() => void) => {
  let q = query(
    collection(db, PURCHASE_ORDERS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  if (statusFilter && statusFilter !== 'all') {
    q = query(q, where('status', '==', statusFilter));
  }

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const orders: PurchaseOrder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const firestorePO: PurchaseOrderFirestore = {
          id: docSnap.id,
          poNumber: data.poNumber,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          vendorContact: data.vendorContact,
          vendorEmail: data.vendorEmail,
          vendorAddress: data.vendorAddress,
          items: data.items,
          subtotal: data.subtotal,
          gstPercentage: data.gstPercentage ?? GST_PERCENTAGE,
          gstAmount: data.gstAmount,
          totalAmount: data.totalAmount,
          justification: data.justification,
          expectedDeliveryDate: data.expectedDeliveryDate ?? null,
          documents: data.documents ?? [],
          pdfUrl: data.pdfUrl,
          status: data.status,
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          createdAt: data.createdAt,
          reviewedBy: data.reviewedBy ?? null,
          reviewedByName: data.reviewedByName ?? null,
          reviewedAt: data.reviewedAt ?? null,
          adminComments: data.adminComments ?? null,
          rejectionReason: data.rejectionReason ?? null,
          receivedAt: data.receivedAt ?? null,
          receivedBy: data.receivedBy ?? null,
          receivedByName: data.receivedByName ?? null,
          receivedNotes: data.receivedNotes ?? null,
          updatedAt: data.updatedAt,
        };
        orders.push(firestorePOToPO(firestorePO));
      });
      callback(orders);
    },
    (error) => {
      console.error('Error in purchase orders subscription:', error);
      callback([]);
    }
  );

  return () => unsub();
};
