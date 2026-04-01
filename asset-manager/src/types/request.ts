import { Timestamp } from 'firebase/firestore';

/**
 * Request status types
 */
export type RequestStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'transferred' 
  | 'partially_returned' 
  | 'returned' 
  | 'cancelled';

/**
 * Request priority levels
 */
export type RequestPriority = 'high' | 'medium' | 'low';

/**
 * Item condition for returns
 */
export type ItemCondition = 'good' | 'needs_maintenance' | 'damaged';

/**
 * Individual item in a request
 */
export interface RequestItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  unit?: string;
  itemType: 'consumable' | 'non_consumable';
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  quantityRequested: number;
  quantityApproved: number;
  quantityReturned: number;
  /** Qty still with site supervisors (custody); does not leave site until returned to central store. */
  supervisorOutstandingQty?: number;
  status: 'pending' | 'approved' | 'transferred' | 'partially_returned' | 'returned';
  weightPerMeter?: number;
  lengthPerPiece?: number;
}

/**
 * Request type distinguishes standard (store → site) from site-to-site transfers.
 * Defaults to 'standard' when not present (backward-compatible).
 */
export type RequestType = 'standard' | 'site_transfer';

/**
 * Main request document structure in Firestore
 */
export interface Request {
  id: string;
  requestNumber: string; // REQ-2025-0045

  // Request type (standard = central store → site; site_transfer = site A → site B)
  requestType?: RequestType;

  // Site & User
  siteId: string;
  siteName: string;
  requestedBy: string;
  requestedByName: string;

  // For site_transfer: the site items are moved FROM
  sourceSiteId?: string;
  sourceSiteName?: string;
  
  // Status & Priority
  status: RequestStatus;
  priority: RequestPriority;
  purpose: string;
  
  // Items
  items: RequestItem[];
  
  // Processing
  processedBy: string | null;
  processedByName: string | null;
  processedAt: Timestamp | null;
  storeNotes: string | null;
  rejectionReason: string | null;
  rejectionComments: string | null;
  
  // Transfer
  transferredAt: Timestamp | null;
  transferredBy: string | null;
  transferredByName: string | null;
  receivedBy: string | null;
  receivedByName: string | null;
  
  // Return (new: returnHistory for partial returns with full history)
  returnHistory: Array<{
    returnId: string;
    returnedAt: Timestamp;
    returnedBy: string;
    returnedByName: string;
    items: Array<{
      itemId: string;
      itemName: string;
      quantityReturned: number;
      condition: ItemCondition;
      cumulativeReturned: number;
    }>;
    returnNotes: string | null;
  }> | null;
  // Legacy fields (backward compatibility for existing returned requests)
  returnedAt?: Timestamp | null;
  returnItems?: Array<{
    itemId: string;
    quantityReturned: number;
    condition: ItemCondition;
  }> | null;
  returnNotes?: string | null;
  
  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;

  /** Site Manager split / return — who last updated supervisor custody on this request */
  lastSupervisorCustodyUpdateBy?: string;
  lastSupervisorCustodyUpdateByName?: string;

  /** Present on remainder request created after partial approval (links to original REQ). */
  splitFromRequestId?: string;
  splitFromRequestNumber?: string;

  /** Present on parent after partial approval (links to pending remainder REQ). */
  splitRemainderRequestId?: string;
  splitRemainderRequestNumber?: string;
}

/**
 * Item availability check result
 */
export interface ItemAvailability {
  itemId: string;
  itemName: string;
  requested: number;
  available: number;
  sufficient: boolean;
}

/**
 * Request creation data
 */
export interface CreateRequestData {
  siteId: string;
  siteName: string;
  requestType?: RequestType;
  sourceSiteId?: string;
  sourceSiteName?: string;
  priority: RequestPriority;
  purpose?: string;
  items: Array<{
    itemId: string;
    itemName: string;
    itemSku: string;
    unit?: string;
    itemType: 'consumable' | 'non_consumable' | 'fuel';
    categoryId: string;
    categoryName: string;
    imageUrl?: string;
    quantity: number;
    weightPerMeter?: number;
    lengthPerPiece?: number;
  }>;
}

/**
 * Request edit data
 */
export interface EditRequestData {
  priority?: RequestPriority;
  purpose?: string;
  items?: RequestItem[];
}

/**
 * Rejection data
 */
export interface RejectRequestData {
  reason: 'insufficient_stock' | 'duplicate_request' | 'items_not_required' | 'other';
  comments?: string;
}

/**
 * Transfer data
 */
export interface TransferRequestData {
  receivedBy: string;
  receivedByName: string;
}

/**
 * Return data
 */
export interface ReturnItemsData {
  items: Array<{
    itemId: string;
    quantityReturned: number;
    condition: ItemCondition;
  }>;
  returnNotes?: string;
}
