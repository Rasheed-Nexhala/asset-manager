import { Timestamp } from 'firebase/firestore';
import { timestampToISO } from './inventory';

/**
 * Purchase Order status flow:
 * DRAFT → PENDING_APPROVAL → APPROVED → RECEIVED
 *                    ↓
 *               REJECTED
 *
 * Note: 'ordered' is kept for backward compatibility with existing Firestore documents.
 * New POs no longer use this status; store incharge receives directly from approved.
 */
export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'ordered' // Legacy; no longer set by app
  | 'partially_received'
  | 'received'
  | 'rejected';

/**
 * Individual item in a purchase order
 * gstPercentage: optional for backward compat (default 18 when reading old POs)
 * gstAmount: optional for backward compat (computed from amount * gstPercentage when missing)
 */
export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  unit?: string;
  isExistingItem: boolean;
  quantity: number;
  unitPrice: number;
  amount: number;
  gstPercentage?: number;
  gstAmount?: number;
  receivedQuantity: number | null;
  orderedUnit?: string;
  orderedQuantity?: number;
  remarks?: string;
}

/**
 * Document attached to a PO (e.g. invoice)
 */
export interface PurchaseOrderDocument {
  type: 'invoice' | 'other';
  fileName: string;
  fileUrl: string;
  uploadedAt: Timestamp;
}

/** Quantities received in a single GRR event (one line per PO item with qty &gt; 0 this receipt). */
export interface PurchaseOrderGrrLineItem {
  itemId: string;
  itemName: string;
  quantityReceived: number;
  unit?: string;
}

/** One goods-receipt register entry (Firestore) */
export interface PurchaseOrderGrrReceiptFirestore {
  /** e.g. PO-RCV-2026-0001 (year + per-year sequence) */
  grrNumber: string;
  receivedAt: Timestamp;
  receivedBy: string;
  receivedByName: string;
  /** Per-item quantities recorded for this receipt (optional for legacy GRR rows). */
  lineItems?: PurchaseOrderGrrLineItem[];
}

/** One goods-receipt register entry (client / Redux, ISO dates) */
export interface PurchaseOrderGrrReceipt {
  /** e.g. PO-RCV-2026-0001 */
  grrNumber: string;
  receivedAt: string;
  receivedBy: string;
  receivedByName: string;
  lineItems?: PurchaseOrderGrrLineItem[];
}

/**
 * Firestore document structure (uses Timestamp)
 */
export interface PurchaseOrderFirestore {
  id: string;
  poNumber: string;

  vendorId: string;
  vendorName: string;
  vendorContact: string;
  vendorEmail?: string;
  vendorAddress?: string;
  vendorGstin?: string;
  /** Supplier contact person name (shown on PO; often copied from vendor master) */
  vendorContactPerson?: string;
  location?: string;
  jobNo?: string;
  /** Site / office issuing the PO (e.g. FO) */
  poIssueSite?: string;
  /** Ship-to / yard location (distinct from poIssueSite when both are used) */
  deliveryLocation?: string;
  /** Internal buyer contact on PO (name) */
  buyerContactName?: string;
  /** Internal buyer contact phone */
  buyerContactPhone?: string;
  /** Optional site this PO is for (from sites collection) */
  siteId?: string;
  /** Denormalized site name for print / when site doc changes */
  siteName?: string;
  /** Verbatim delivery date line on printed PO; when set, overrides calendar-only display */
  deliveryDateText?: string;

  items: PurchaseOrderItem[];

  subtotal: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;

  justification: string;
  expectedDeliveryDate: Timestamp | null;

  documents: PurchaseOrderDocument[];
  pdfUrl?: string;

  status: PurchaseOrderStatus;

  createdBy: string;
  createdByName: string;
  createdByRole?: string;
  createdAt: Timestamp;

  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: Timestamp | null;
  adminComments: string | null;
  rejectionReason: string | null;

  /** URL of the signed PO document (PDF/image) uploaded before approval */
  signedPdfUrl?: string | null;
  /** Admin who downloaded the PO for signing (used as "Approved By" on document) */
  downloadedBy?: string | null;
  downloadedByName?: string | null;

  /** Admin assigned to approve this PO (only that admin can approve/reject) */
  assignedToAdminId?: string | null;
  assignedToAdminName?: string | null;

  receivedAt: Timestamp | null;
  receivedBy: string | null;
  receivedByName: string | null;
  receivedNotes: string | null;

  /** Append-only GRR entries minted on each Receive confirmation */
  grrReceipts?: PurchaseOrderGrrReceiptFirestore[];

  updatedAt: Timestamp;
}

/**
 * Redux-serializable Purchase Order (ISO strings for timestamps)
 */
export interface PurchaseOrder {
  id: string;
  poNumber: string;

  vendorId: string;
  vendorName: string;
  vendorContact: string;
  vendorEmail?: string;
  vendorAddress?: string;
  vendorGstin?: string;
  vendorContactPerson?: string;
  location?: string;
  jobNo?: string;
  poIssueSite?: string;
  deliveryLocation?: string;
  buyerContactName?: string;
  buyerContactPhone?: string;
  siteId?: string;
  siteName?: string;
  deliveryDateText?: string;

  items: PurchaseOrderItem[];

  subtotal: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;

  justification: string;
  expectedDeliveryDate: string | null;

  documents: Array<Omit<PurchaseOrderDocument, 'uploadedAt'> & { uploadedAt: string }>;
  pdfUrl?: string;

  status: PurchaseOrderStatus;

  createdBy: string;
  createdByName: string;
  createdByRole?: string;
  createdAt: string;

  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  adminComments: string | null;
  rejectionReason: string | null;

  /** URL of the signed PO document (PDF/image) uploaded before approval */
  signedPdfUrl?: string | null;
  /** Admin who downloaded the PO for signing (used as "Approved By" on document) */
  downloadedBy?: string | null;
  downloadedByName?: string | null;

  /** Admin assigned to approve this PO (only that admin can approve/reject) */
  assignedToAdminId?: string | null;
  assignedToAdminName?: string | null;

  receivedAt: string | null;
  receivedBy: string | null;
  receivedByName: string | null;
  receivedNotes: string | null;

  grrReceipts?: PurchaseOrderGrrReceipt[];

  updatedAt: string;
}

/**
 * Convert Firestore PO to Redux-serializable PO
 */
export const firestorePOToPO = (doc: PurchaseOrderFirestore): PurchaseOrder => ({
  ...doc,
  expectedDeliveryDate: doc.expectedDeliveryDate
    ? timestampToISO(doc.expectedDeliveryDate)
    : null,
  documents: doc.documents.map((d) => ({
    ...d,
    uploadedAt: timestampToISO(d.uploadedAt),
  })),
  grrReceipts: (doc.grrReceipts ?? []).map((r) => ({
    grrNumber: r.grrNumber,
    receivedBy: r.receivedBy,
    receivedByName: r.receivedByName,
    receivedAt: timestampToISO(r.receivedAt),
    ...(Array.isArray(r.lineItems) && r.lineItems.length > 0
      ? { lineItems: r.lineItems }
      : {}),
  })),
  createdAt: timestampToISO(doc.createdAt),
  reviewedAt: doc.reviewedAt ? timestampToISO(doc.reviewedAt) : null,
  receivedAt: doc.receivedAt ? timestampToISO(doc.receivedAt) : null,
  updatedAt: timestampToISO(doc.updatedAt),
});

/**
 * Data for creating a new PO
 */
export interface CreatePurchaseOrderData {
  /** Required PO number (manual entry). */
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorContact: string;
  vendorEmail?: string;
  vendorAddress?: string;
  vendorGstin?: string;
  vendorContactPerson?: string;
  location?: string;
  jobNo?: string;
  poIssueSite?: string;
  deliveryLocation?: string;
  buyerContactName?: string;
  buyerContactPhone?: string;
  siteId?: string;
  siteName?: string;
  deliveryDateText?: string;
  items: Array<{
    itemId: string;
    itemName: string;
    itemSku: string;
    unit?: string;
    isExistingItem: boolean;
    quantity: number;
    unitPrice?: number;
    gstPercentage?: number;
    orderedUnit?: string;
    orderedQuantity?: number;
    remarks?: string;
  }>;
  justification: string;
  expectedDeliveryDate: string | null;
  /** Required when submitting for approval (not draft). Admin to assign for approval. */
  assignedToAdminId?: string;
  assignedToAdminName?: string;
}

/**
 * Data for receiving a PO
 */
export interface ReceivePOData {
  receivedQuantities: Array<{ itemId: string; receivedQuantity: number }>;
  documents: Array<{ type: 'invoice' | 'other'; fileName: string; fileUrl: string }>;
  receivedDate: string;
  receivedNotes?: string;
}

/**
 * Data for approving/rejecting a PO
 */
export interface ApprovePOData {
  adminComments?: string;
}

export interface RejectPOData {
  rejectionReason: string;
  adminComments?: string;
}
