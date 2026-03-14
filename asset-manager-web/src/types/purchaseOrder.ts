import { Timestamp } from 'firebase/firestore';
import { timestampToISO } from './inventory';

/**
 * Purchase Order status flow:
 * DRAFT → PENDING_APPROVAL → APPROVED → ORDERED → RECEIVED
 *                    ↓
 *               REJECTED
 */
export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'ordered'
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
  location?: string;
  jobNo?: string;

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

  receivedAt: Timestamp | null;
  receivedBy: string | null;
  receivedByName: string | null;
  receivedNotes: string | null;

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
  location?: string;
  jobNo?: string;

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

  receivedAt: string | null;
  receivedBy: string | null;
  receivedByName: string | null;
  receivedNotes: string | null;

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
  location?: string;
  jobNo?: string;
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
