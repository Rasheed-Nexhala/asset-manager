import { Timestamp, DocumentSnapshot } from 'firebase/firestore';

/**
 * Utility functions for handling Firebase objects in Redux store
 */

/**
 * Convert Firebase Timestamp to serializable ISO string
 */
export const timestampToISOString = (timestamp: Timestamp | null | undefined): string | null => {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
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