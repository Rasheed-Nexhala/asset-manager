import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocsFromServer,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  ActivityLog,
  ActivityLogFirestore,
  ActivityLogFiltersStore,
  ActivityLogExportOptions,
} from '../../types/activityLog';
import { isoToDate } from '../../utils/dateSerialization';

const ACTIVITY_LOGS_COLLECTION = 'activityLogs';

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
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ logs: ActivityLog[]; lastDoc: DocumentSnapshot | null }> {
  try {
    const constraints: QueryConstraint[] = [];

    // Filter by date range (convert ISO strings to Date for Firestore)
    const startDate = filters?.startDate ? isoToDate(filters.startDate) : null;
    const endDate = filters?.endDate ? isoToDate(filters.endDate) : null;
    if (startDate) {
      constraints.push(
        where('timestamp', '>=', Timestamp.fromDate(startDate))
      );
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      constraints.push(
        where('timestamp', '<=', Timestamp.fromDate(endOfDay))
      );
    }

    // Filter by user
    if (filters?.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }

    // Filter by action category
    if (filters?.actionCategory && filters.actionCategory !== 'all') {
      constraints.push(
        where('actionCategory', '==', filters.actionCategory)
      );
    }

    // Filter by action type
    if (filters?.actionType && filters.actionType !== 'all') {
      constraints.push(where('actionType', '==', filters.actionType));
    }

    // Order by timestamp (descending - newest first)
    constraints.push(orderBy('timestamp', 'desc'));

    // Pagination
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
 * Get user's own recent activity (last 10 actions)
 *
 * @param userId - User ID
 * @returns Promise resolving to array of recent activity logs
 */
export async function getMyRecentActivity(
  userId: string
): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    // Use getDocsFromServer to bypass cache and ensure fresh data
    const snapshot = await getDocsFromServer(q);
    return snapshot.docs.map(firestoreToActivityLog);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error fetching my recent activity:', err);
    throw new Error(err.message ?? 'Failed to fetch recent activity');
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
    const constraints: QueryConstraint[] = [];

    // Filter by date range (convert ISO strings to Date for Firestore)
    const startDate = filters?.startDate ? isoToDate(filters.startDate) : null;
    const endDate = filters?.endDate ? isoToDate(filters.endDate) : null;
    if (startDate) {
      constraints.push(
        where('timestamp', '>=', Timestamp.fromDate(startDate))
      );
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      constraints.push(
        where('timestamp', '<=', Timestamp.fromDate(endOfDay))
      );
    }

    // Filter by user
    if (filters?.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }

    // Filter by action category
    if (filters?.actionCategory && filters.actionCategory !== 'all') {
      constraints.push(
        where('actionCategory', '==', filters.actionCategory)
      );
    }

    // Filter by action type
    if (filters?.actionType && filters.actionType !== 'all') {
      constraints.push(where('actionType', '==', filters.actionType));
    }

    // Order by timestamp (descending - newest first)
    constraints.push(orderBy('timestamp', 'desc'));

    // Limit
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
 * Subscribe to user's own recent activity (real-time, last 10 actions)
 *
 * @param userId - User ID
 * @param onUpdate - Callback when activity is updated
 * @param onError - Callback when an error occurs
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToMyRecentActivity(
  userId: string,
  onUpdate: (logs: ActivityLog[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    // Set up real-time listener with includeMetadataChanges to receive server updates
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const logs = snapshot.docs.map(firestoreToActivityLog);
        onUpdate(logs);
      },
      (error) => {
        console.error('❌ Error in my recent activity snapshot:', error);
        onError(
          new Error(error.message ?? 'Failed to listen to recent activity')
        );
      }
    );

    return unsubscribe;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error setting up recent activity subscription:', err);
    onError(new Error(err.message ?? 'Failed to subscribe to recent activity'));
    // Return no-op unsubscribe
    return () => {};
  }
}
