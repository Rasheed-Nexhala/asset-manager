import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { Site, CreateSiteData, UpdateSiteData } from '../../types/sites';

const SITES_COLLECTION = 'sites';

/**
 * Create a new site with Firebase-generated ID
 */
export const createSite = async (siteData: CreateSiteData): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, SITES_COLLECTION), {
      ...siteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating site:', error);
    throw error;
  }
};

/**
 * Update an existing site
 */
export const updateSite = async (
  siteId: string,
  updates: UpdateSiteData
): Promise<void> => {
  try {
    await updateDoc(doc(db, SITES_COLLECTION, siteId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating site:', error);
    throw error;
  }
};

/**
 * Get a single site by ID
 */
export const getSite = async (siteId: string): Promise<Site | null> => {
  try {
    const siteDoc = await getDoc(doc(db, SITES_COLLECTION, siteId));
    
    if (!siteDoc.exists()) {
      return null;
    }
    
    const data = siteDoc.data();
    return {
      id: siteDoc.id,
      name: data.name,
      description: data.description,
      address: data.address,
      contactNumber: data.contactNumber,
      managerId: data.managerId || null,
      managerName: data.managerName || null,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Site;
  } catch (error) {
    console.error('Error getting site:', error);
    throw error;
  }
};

/**
 * Get all sites from Firestore
 */
export const getSites = async (): Promise<Site[]> => {
  try {
    const sitesSnapshot = await getDocs(collection(db, SITES_COLLECTION));
    const sites: Site[] = [];
    
    sitesSnapshot.forEach((doc) => {
      const data = doc.data();
      sites.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        address: data.address,
        contactNumber: data.contactNumber,
        managerId: data.managerId || null,
        managerName: data.managerName || null,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Site);
    });
    
    return sites;
  } catch (error) {
    console.error('Error getting sites:', error);
    throw error;
  }
};

/**
 * Check if a site name already exists
 * Used for validation before creating/updating sites
 */
export const checkSiteNameExists = async (
  name: string,
  excludeId?: string
): Promise<boolean> => {
  try {
    const sitesSnapshot = await getDocs(
      query(collection(db, SITES_COLLECTION), where('name', '==', name))
    );
    
    // If checking for update, exclude the current site
    if (excludeId) {
      return sitesSnapshot.docs.some((doc) => doc.id !== excludeId);
    }
    
    return !sitesSnapshot.empty;
  } catch (error) {
    console.error('Error checking site name:', error);
    throw error;
  }
};

/**
 * Find site by manager ID
 * Used to check if a manager is already assigned to another site
 */
export const findSiteByManagerId = async (
  managerId: string,
  excludeId?: string
): Promise<Site | null> => {
  try {
    const sitesSnapshot = await getDocs(
      query(collection(db, SITES_COLLECTION), where('managerId', '==', managerId))
    );
    
    // Find first site with this manager (excluding current site if updating)
    for (const doc of sitesSnapshot.docs) {
      if (excludeId && doc.id === excludeId) {
        continue;
      }
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        address: data.address,
        contactNumber: data.contactNumber,
        managerId: data.managerId || null,
        managerName: data.managerName || null,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Site;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding site by manager ID:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for all sites
 * Returns an unsubscribe function that should be called when done listening
 *
 * @param callback - Function called whenever the sites list changes
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToSites = (
  callback: (sites: Site[]) => void
): Unsubscribe => {
  const sitesCollectionRef = collection(db, SITES_COLLECTION);

  return onSnapshot(
    sitesCollectionRef,
    (snapshot: QuerySnapshot) => {
      const sites: Site[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        sites.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          address: data.address,
          contactNumber: data.contactNumber,
          managerId: data.managerId || null,
          managerName: data.managerName || null,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Site);
      });

      callback(sites);
    },
    (error) => {
      console.error('Error in sites subscription:', error);
      callback([]);
    }
  );
};

/**
 * Get all sites assigned to a specific manager
 */
export const getSitesByManagerId = async (managerId: string): Promise<Site[]> => {
  try {
    const sitesSnapshot = await getDocs(
      query(collection(db, SITES_COLLECTION), where('managerId', '==', managerId))
    );
    
    const sites: Site[] = [];
    sitesSnapshot.forEach((doc) => {
      const data = doc.data();
      sites.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        address: data.address,
        contactNumber: data.contactNumber,
        managerId: data.managerId || null,
        managerName: data.managerName || null,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Site);
    });
    
    return sites;
  } catch (error) {
    console.error('Error getting sites by manager ID:', error);
    throw error;
  }
};

/**
 * Batch update multiple sites atomically
 * Firestore batch operations are limited to 500 operations per batch
 * This function automatically chunks larger updates into multiple batches
 */
export const batchUpdateSites = async (
  updates: Array<{ siteId: string; data: UpdateSiteData }>
): Promise<void> => {
  if (updates.length === 0) {
    return;
  }

  const BATCH_LIMIT = 500;
  const batches: Array<Array<{ siteId: string; data: UpdateSiteData }>> = [];

  // Chunk updates into batches of 500
  for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
    batches.push(updates.slice(i, i + BATCH_LIMIT));
  }

  try {
    // Process each batch sequentially
    for (const batchUpdates of batches) {
      const batch = writeBatch(db);

      batchUpdates.forEach(({ siteId, data }) => {
        const siteRef = doc(db, SITES_COLLECTION, siteId);
        batch.update(siteRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    }
  } catch (error) {
    console.error('Error in batch update sites:', error);
    throw error;
  }
};

/**
 * Find sites with invalid manager assignments
 * A manager is considered invalid if:
 * - The managerId doesn't exist in the users collection
 * - The manager exists but is not active
 * - The manager exists but role is not 'SiteManager'
 */
export const findSitesWithInvalidManagers = async (
  validManagerIds: Set<string>
): Promise<Site[]> => {
  try {
    const sitesSnapshot = await getDocs(collection(db, SITES_COLLECTION));
    const invalidSites: Site[] = [];

    sitesSnapshot.forEach((doc) => {
      const data = doc.data();
      const managerId = data.managerId;

      // If site has a manager assigned, check if it's valid
      if (managerId && !validManagerIds.has(managerId)) {
        invalidSites.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          address: data.address,
          contactNumber: data.contactNumber,
          managerId: data.managerId || null,
          managerName: data.managerName || null,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Site);
      }
    });

    return invalidSites;
  } catch (error) {
    console.error('Error finding sites with invalid managers:', error);
    throw error;
  }
};
