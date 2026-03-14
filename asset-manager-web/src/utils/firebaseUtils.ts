import { Timestamp, DocumentSnapshot } from 'firebase/firestore';

/**
 * Utility functions for handling Firebase objects in Redux store
 */

/**
 * Convert Firebase Timestamp to serializable ISO string.
 * Handles null/undefined from serverTimestamp() during optimistic updates.
 * Falls back to current time when timestamp is missing to prevent runtime errors.
 *
 * @param timestamp - Firebase Timestamp, Date, or null/undefined
 * @returns ISO string - never null (uses current time as fallback)
 */
export const timestampToISOString = (timestamp: Timestamp | Date | null | undefined): string => {
  if (!timestamp || timestamp === null) {
    return new Date().toISOString(); // Fallback to current time during optimistic updates
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  // Firestore Timestamp or object with toDate() (handles mocks in tests)
  if (typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
    return (timestamp as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString(); // Final fallback
};

/**
 * Convert ISO string back to Date object
 */
export const isoStringToDate = (isoString: string | null): Date | null => {
  if (!isoString) return null;
  return new Date(isoString);
};

/**
 * Serialize DocumentSnapshot to store in Redux
 */
export const serializeDocumentSnapshot = (doc: DocumentSnapshot | null): SerializedDocumentSnapshot | null => {
  if (!doc || !doc.exists()) return null;
  
  return {
    id: doc.id,
    data: doc.data(),
    ref: doc.ref.path,
  };
};

/**
 * Serializable version of DocumentSnapshot for Redux store
 */
export interface SerializedDocumentSnapshot {
  id: string;
  data: any;
  ref: string;
}

/**
 * Convert a DocumentSnapshot back from serialized form (for Firestore queries)
 * Note: This requires a fresh fetch from Firestore since we can't reconstruct the full DocumentSnapshot
 */
export const deserializeDocumentSnapshot = async (
  serialized: SerializedDocumentSnapshot | null
): Promise<DocumentSnapshot | null> => {
  // For pagination purposes, we'll need to refetch the document
  // This is a limitation but ensures we have a valid DocumentSnapshot
  return null; // Handled in service layer with fresh queries
};