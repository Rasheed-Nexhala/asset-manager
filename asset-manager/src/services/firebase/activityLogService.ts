import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocsFromServer,
  getCountFromServer,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../config/firebase';
import type {
  ActivityLog,
  ActivityLogFirestore,
  ActivityLogFiltersStore,
  ActivityLogExportOptions,
} from '../../types/activityLog';
import { isoToDate } from '../../utils/dateSerialization';

const ACTIVITY_LOGS_COLLECTION = 'activityLogs';

/** Page size for paginated activity log list */
export const ACTIVITY_LOGS_PAGE_SIZE = 10;

/**
 * Build Firestore query constraints for activity logs (shared by listActivityLogs and getActivityLogsCount).
 * Excludes searchQuery — that filter is applied client-side.
 */
function buildActivityLogQueryConstraints(
  filters?: ActivityLogFiltersStore
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  // Normalize dates to local timezone: start of day for startDate, end of day for endDate
  const startDate = filters?.startDate ? isoToDate(filters.startDate) : null;
  const endDate = filters?.endDate ? isoToDate(filters.endDate) : null;
  if (startDate) {
    const startOfDay = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0,
      0,
      0,
      0
    );
    constraints.push(
      where('timestamp', '>=', Timestamp.fromDate(startOfDay))
    );
  }
  if (endDate) {
    const endOfDay = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23,
      59,
      59,
      999
    );
    constraints.push(
      where('timestamp', '<=', Timestamp.fromDate(endOfDay))
    );
  }

  if (filters?.userId) {
    constraints.push(where('userId', '==', filters.userId));
  }

  if (filters?.actionCategory && filters.actionCategory !== 'all') {
    constraints.push(
      where('actionCategory', '==', filters.actionCategory)
    );
  }

  if (filters?.actionType && filters.actionType !== 'all') {
    constraints.push(where('actionType', '==', filters.actionType));
  }

  constraints.push(orderBy('timestamp', 'desc'));
  return constraints;
}

/**
 * Helper: Convert Firestore document to Redux-serializable format
 *
 * Converts Firestore Timestamp to ISO 8601 string for Redux compatibility.
 */
export function firestoreToActivityLog(
  doc: QueryDocumentSnapshot
): ActivityLog {
  const data = doc.data() as Omit<ActivityLogFirestore, 'id'>;
  const timestamp = data.timestamp as Timestamp;
  return {
    ...data,
    id: doc.id,
    timestamp:
      timestamp?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * List activity logs with filters and pagination
 *
 * @param filters - Filter options (date range, user, action type, etc.)
 * @param pageSize - Number of records per page (default: 20)
 * @param lastDoc - Last document for pagination (optional)
 * @returns Promise resolving to array of activity logs and lastDoc for next page
 */
export async function listActivityLogs(
  filters?: ActivityLogFiltersStore,
  pageSize: number = ACTIVITY_LOGS_PAGE_SIZE,
  lastDoc?: DocumentSnapshot
): Promise<{ logs: ActivityLog[]; lastDoc: DocumentSnapshot | null }> {
  try {
    const constraints = buildActivityLogQueryConstraints(filters);
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      ...constraints
    );
    // Use getDocsFromServer to bypass cache and ensure fresh data when Firestore
    // has been updated (e.g. by Cloud Functions) but client cache is stale
    const snapshot = await getDocsFromServer(q);

    const logs = snapshot.docs.map(firestoreToActivityLog);
    const newLastDoc =
      snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;

    return { logs, lastDoc: newLastDoc };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error listing activity logs:', err);
    throw new Error(err.message ?? 'Failed to fetch activity logs');
  }
}

/**
 * Get total count of activity logs matching filters (for pagination display).
 * Uses same where/orderBy as listActivityLogs. searchQuery is not applied.
 *
 * @param filters - Same filters as listActivityLogs
 * @returns Total count from server
 */
export async function getActivityLogsCount(
  filters?: ActivityLogFiltersStore
): Promise<number> {
  try {
    const constraints = buildActivityLogQueryConstraints(filters);
    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      ...constraints
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error getting activity logs count:', err);
    throw new Error(err.message ?? 'Failed to get activity logs count');
  }
}

/**
 * List user's own activity with pagination (all activities, not just last 10)
 *
 * @param userId - User ID
 * @param pageSize - Number of records per page
 * @param lastDoc - Last document for cursor-based pagination (optional)
 * @returns Promise resolving to logs and lastDoc for next page
 */
export async function listMyActivityPaginated(
  userId: string,
  pageSize: number = ACTIVITY_LOGS_PAGE_SIZE,
  lastDoc?: DocumentSnapshot
): Promise<{ logs: ActivityLog[]; lastDoc: DocumentSnapshot | null }> {
  try {
    const filters: ActivityLogFiltersStore = { userId };
    return listActivityLogs(filters, pageSize, lastDoc);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error listing my activity:', err);
    throw new Error(err.message ?? 'Failed to fetch my activity');
  }
}

/**
 * Get total count of user's activity (for "Showing X of Y" display)
 *
 * @param userId - User ID
 * @returns Total count from server
 */
export async function getMyActivityCount(userId: string): Promise<number> {
  try {
    const filters: ActivityLogFiltersStore = { userId };
    return getActivityLogsCount(filters);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error getting my activity count:', err);
    throw new Error(err.message ?? 'Failed to get my activity count');
  }
}

/**
 * Export activity logs as CSV string
 *
 * @param options - Export options (filters, max records)
 * @returns Promise resolving to CSV string
 */
export async function exportActivityLogs(
  options: ActivityLogExportOptions
): Promise<string> {
  try {
    const maxRecords = options.maxRecords ?? 1000;
    const { logs } = await listActivityLogs(options.filters, maxRecords);

    // CSV Header
    const header =
      'Timestamp,User,Role,Action,Category,Target,Summary,Details\n';

    // CSV Rows - escape quotes in summary and details
    const escapeCsvField = (value: string): string =>
      `"${(value ?? '').replace(/"/g, '""')}"`;

    const rows = logs
      .map((log) => {
        const timestamp = new Date(log.timestamp).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return [
          timestamp,
          log.userName,
          log.userRole,
          log.actionType,
          log.actionCategory,
          log.targetDisplay,
          escapeCsvField(log.summary),
          escapeCsvField(log.details),
        ].join(',');
      })
      .join('\n');

    return header + rows;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error exporting activity logs:', err);
    throw new Error(err.message ?? 'Failed to export activity logs');
  }
}

/**
 * Search activity logs by text query
 *
 * Firestore doesn't support full-text search. Fetches recent logs and
 * filters client-side. For production, consider Algolia or similar.
 *
 * @param searchQuery - Search text
 * @param pageSize - Number of records per page (default: 20)
 * @returns Promise resolving to array of matching logs
 */
export async function searchActivityLogs(
  searchQuery: string,
  pageSize: number = 20
): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const snapshot = await getDocsFromServer(q);
    const allLogs = snapshot.docs.map(firestoreToActivityLog);

    // Client-side filtering
    const queryLower = searchQuery.toLowerCase().trim();
    const filtered = allLogs.filter((log) => {
      return (
        log.userName.toLowerCase().includes(queryLower) ||
        log.targetDisplay.toLowerCase().includes(queryLower) ||
        (log.summary ?? '').toLowerCase().includes(queryLower) ||
        (log.details ?? '').toLowerCase().includes(queryLower)
      );
    });

    return filtered.slice(0, pageSize);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error searching activity logs:', err);
    throw new Error(err.message ?? 'Failed to search activity logs');
  }
}

/**
 * Subscribe to real-time activity logs updates (snapshot listener)
 *
 * @param filters - Filter options (date range, user, action type, etc.)
 * @param pageSize - Number of records per page (default: 20)
 * @param onUpdate - Callback when logs are updated
 * @param onError - Callback when an error occurs
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToActivityLogs(
  filters: ActivityLogFiltersStore | undefined,
  pageSize: number,
  onUpdate: (logs: ActivityLog[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  try {
    const constraints = buildActivityLogQueryConstraints(filters);
    constraints.push(limit(pageSize));

    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      ...constraints
    );

    // Set up real-time listener with includeMetadataChanges to receive server updates.
    // Prefer server data (fromCache: false) when available to avoid stale cache.
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Use data when from server, or when offline (fromCache: true) to show cached data
        const logs = snapshot.docs.map(firestoreToActivityLog);
        onUpdate(logs);
      },
      (error) => {
        console.error('❌ Error in activity logs snapshot:', error);
        onError(
          new Error(error.message ?? 'Failed to listen to activity logs')
        );
      }
    );

    return unsubscribe;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error setting up activity logs subscription:', err);
    onError(new Error(err.message ?? 'Failed to subscribe to activity logs'));
    // Return no-op unsubscribe
    return () => {};
  }
}

/**
 * Payload for logQuantityAdjusted callable
 */
export interface LogQuantityAdjustedPayload {
  itemId: string;
  itemName: string;
  itemSku: string;
  locationId: string;
  locationName: string;
  type: 'add' | 'remove' | 'set';
  quantity: number;
  reason: string;
  notes: string;
  oldQuantity: number;
  newQuantity: number;
  userName?: string;
  userRole?: string;
}

/**
 * Log quantity adjustment via Cloud Function (callable)
 * Uses try-catch to not block the main operation on logging failure
 */
export async function logQuantityAdjustedToCloud(
  payload: LogQuantityAdjustedPayload
): Promise<void> {
  try {
    const logQuantityAdjustedFn = httpsCallable<
      LogQuantityAdjustedPayload,
      { success: boolean }
    >(functions, 'logQuantityAdjusted');
    await logQuantityAdjustedFn(payload);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? '';
    const message = (error as { message?: string })?.message ?? String(error);
    if (
      code === 'functions/not-found' ||
      code === 'functions/unavailable' ||
      message.includes('not-found')
    ) {
      if (__DEV__) {
        console.info(
          'Activity log (logQuantityAdjusted) unavailable. Deploy Cloud Functions to enable quantity adjustment logging.'
        );
      }
      return;
    }
    if (code === 'unauthenticated' || message.includes('unauthenticated')) {
      if (__DEV__) {
        console.info(
          'Activity log (logQuantityAdjusted): request was unauthenticated; event not logged.'
        );
      }
      return;
    }
    console.error('Failed to log quantity adjustment:', error);
  }
}

/**
 * Payload for logInventoryUpdateRequest callable
 */
export interface LogInventoryUpdateRequestPayload {
  actionType:
    | 'inventory_update_request_created'
    | 'inventory_update_request_approved'
    | 'inventory_update_request_rejected'
    | 'inventory_update_request_revoked'
    | 'inventory_update_request_restored';
  requestId: string;
  targetDisplay: string;
  requestedBy?: string;
  requestedByName?: string;
  requestedByRole?: string;
  reason?: string;
  approvedBy?: string;
  approvedByName?: string;
  expiresInHours?: number;
  rejectionReason?: string;
}

/**
 * Log inventory update request event via Cloud Function (callable)
 * Called after create/approve/reject of inventory update request.
 */
export async function logInventoryUpdateRequestToCloud(
  payload: LogInventoryUpdateRequestPayload
): Promise<void> {
  try {
    const fn = httpsCallable<
      LogInventoryUpdateRequestPayload,
      { success: boolean }
    >(functions, 'logInventoryUpdateRequest');
    await fn(payload);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? '';
    const message = (error as { message?: string })?.message ?? String(error);
    if (
      code === 'functions/not-found' ||
      code === 'functions/unavailable' ||
      message.includes('not-found')
    ) {
      if (__DEV__) {
        console.info(
          'Activity log (logInventoryUpdateRequest) unavailable. Deploy Cloud Functions to enable logging.'
        );
      }
      return;
    }
    if (code === 'unauthenticated' || message.includes('unauthenticated')) {
      if (__DEV__) {
        console.info(
          'Activity log (logInventoryUpdateRequest): request was unauthenticated; event not logged.'
        );
      }
      return;
    }
    console.error('Failed to log inventory update request:', error);
  }
}
