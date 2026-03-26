/**
 * Status of an inventory update request.
 * - pending: Awaiting Admin approval
 * - approved: Admin approved; Store Incharge has temporary access to update central store
 * - rejected: Admin rejected the request
 */
export type InventoryUpdateRequestStatus = 'pending' | 'approved' | 'rejected';

/** What the Store Incharge is allowed to do until access expires. */
export type InventoryUpdateAccessScope = 'central_store' | 'maintenance_writeoff';

export const DEFAULT_INVENTORY_UPDATE_ACCESS_SCOPES: InventoryUpdateAccessScope[] = [
  'central_store',
];

export function normalizeInventoryUpdateAccessScopes(
  scopes: InventoryUpdateAccessScope[] | undefined
): InventoryUpdateAccessScope[] {
  if (!scopes?.length) return [...DEFAULT_INVENTORY_UPDATE_ACCESS_SCOPES];
  const valid = scopes.filter(
    (s): s is InventoryUpdateAccessScope =>
      s === 'central_store' || s === 'maintenance_writeoff'
  );
  return valid.length ? valid : [...DEFAULT_INVENTORY_UPDATE_ACCESS_SCOPES];
}

/** Short labels for admin queue and activity log details. */
export function formatInventoryUpdateAccessScopesLabel(
  scopes: InventoryUpdateAccessScope[] | undefined
): string {
  const n = normalizeInventoryUpdateAccessScopes(scopes);
  return n
    .map((s) => (s === 'central_store' ? 'Central stock' : 'Maintenance write-off'))
    .join(' · ');
}

/**
 * Inventory Update Request document structure in Firestore.
 * Store Incharge requests Admin approval to update central store inventory and/or write off maintenance items.
 * Admin can approve (with expiry), reject, or revoke/restore access anytime via toggle.
 * All changes are logged.
 */
export interface InventoryUpdateRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: string;
  reason: string;
  /** Defaults to central_store only when missing (legacy documents). */
  accessScopes?: InventoryUpdateAccessScope[];
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
