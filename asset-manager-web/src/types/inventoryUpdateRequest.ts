import { Timestamp } from 'firebase/firestore';

/**
 * Status of an inventory update request.
 * - pending: Awaiting Admin approval
 * - approved: Admin approved; Store Incharge has temporary access to update central store
 * - rejected: Admin rejected the request
 */
export type InventoryUpdateRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Inventory Update Request document structure in Firestore.
 * Store Incharge requests Admin approval to update (add/reduce/enter) central store inventory.
 * Admin can approve (with expiry), reject, or revoke/restore access anytime via toggle.
 * All changes are logged.
 */
export interface InventoryUpdateRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: string;
  reason: string;
  status: InventoryUpdateRequestStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string; // ISO string (serialized from Firestore Timestamp)
  accessExpiresAt?: string; // ISO string - when Store Incharge's temporary access ends
  /** When true, Admin has revoked access; Store Incharge loses access immediately */
  accessRevoked?: boolean;
  rejectionReason?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
