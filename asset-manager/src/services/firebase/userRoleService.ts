import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  Unsubscribe,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import type { UserRoleData, UserRole, Permission, UserListItem } from '../../types/roles';

const USERS_COLLECTION = 'users';

/**
 * Get user role data from Firestore
 */
export const getUserRole = async (userId: string): Promise<UserRoleData | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const data = userDoc.data();
    return {
      role: data.role as UserRole,
      isActive: data.isActive ?? false,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      isSuperadmin: data.isSuperadmin ?? false,
    };
  } catch (error) {
    console.error('Error getting user role:', error);
    throw error;
  }
};

/**
 * Create or update user role data
 * Only Admins should be able to call this (enforce in Firestore rules)
 */
export const setUserRole = async (
  userId: string,
  roleData: UserRoleData
): Promise<void> => {
  try {
    await setDoc(
      doc(db, USERS_COLLECTION, userId),
      {
        ...roleData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
};

/**
 * Create default user document on signup
 */
export const createDefaultUserDocument = async (
  userId: string,
  email: string | null,
  displayName: string | null
): Promise<void> => {
  const defaultRoleData: UserRoleData = {
    role: 'Unassigned', // Default role for new users
    isActive: true, // New signups can use the app immediately; admins can deactivate if needed
    permissions: [],
    isSuperadmin: false, // Set manually in Firestore for designated super admins
  };
  
  try {
    await setDoc(doc(db, USERS_COLLECTION, userId), {
      email,
      displayName,
      ...defaultRoleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

/**
 * Update user role (Admin only)
 * Stores updatedBy/updatedByName for notification exclusion (actor doesn't get notified)
 */
export const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    const updates: Record<string, unknown> = {
      role,
      updatedAt: serverTimestamp(),
    };
    if (currentUser?.uid) {
      updates.updatedBy = currentUser.uid;
      updates.updatedByName = currentUser.displayName ?? currentUser.email ?? 'Admin';
    }
    await updateDoc(doc(db, USERS_COLLECTION, userId), updates);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * Update user active status
 * Stores updatedBy/updatedByName for notification exclusion (actor doesn't get notified)
 */
export const updateUserActiveStatus = async (
  userId: string,
  isActive: boolean
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    const updates: Record<string, unknown> = {
      isActive,
      updatedAt: serverTimestamp(),
    };
    if (currentUser?.uid) {
      updates.updatedBy = currentUser.uid;
      updates.updatedByName = currentUser.displayName ?? currentUser.email ?? 'Admin';
    }
    await updateDoc(doc(db, USERS_COLLECTION, userId), updates);
  } catch (error) {
    console.error('Error updating user active status:', error);
    throw error;
  }
};

/**
 * Mark a user as deleted (soft delete).
 * Used for account deletion (Guideline 5.1.1(v)).
 * Sets soft-delete fields and isActive: false; preserves name, email, userId. Firebase Auth is deleted separately.
 * Firestore rules must allow self soft-delete.
 * Actor is the user themselves (self-delete) - no updatedBy needed.
 */
export const markUserAsDeleted = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      isDeleted: true,
      isActive: false,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking user as deleted:', error);
    throw error;
  }
};

/**
 * Update user permissions
 */
export const updateUserPermissions = async (
  userId: string,
  permissions: Permission[]
): Promise<void> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      permissions,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    throw error;
  }
};

/**
 * Get all users from Firestore
 * Returns a list of all users with their role data
 */
export const getAllUsers = async (): Promise<UserListItem[]> => {
  try {
    const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: UserListItem[] = [];
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        email: data.email || null,
        displayName: data.displayName || null,
        role: data.role as UserRole,
        isActive: data.isActive ?? false,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        isDeleted: data.isDeleted ?? false,
        isSuperadmin: data.isSuperadmin ?? false,
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for a single user's role data
 * Returns an unsubscribe function that should be called when done listening
 *
 * @param userId - The user ID to subscribe to
 * @param callback - Function called whenever the user data changes
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToUserRole = (
  userId: string,
  callback: (userRole: UserRoleData | null) => void
): Unsubscribe => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);

  return onSnapshot(
    userDocRef,
    (snapshot: DocumentSnapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data();
      callback({
        role: data.role as UserRole,
        isActive: data.isActive ?? false,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        isSuperadmin: data.isSuperadmin ?? false,
      });
    },
    (error) => {
      console.error('Error in user role subscription:', error);
      callback(null);
    }
  );
};

/**
 * Subscribe to real-time updates for all users
 * Returns an unsubscribe function that should be called when done listening
 *
 * @param callback - Function called whenever the users list changes
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToAllUsers = (
  callback: (users: UserListItem[]) => void
): Unsubscribe => {
  const usersCollectionRef = collection(db, USERS_COLLECTION);

  return onSnapshot(
    usersCollectionRef,
    (snapshot: QuerySnapshot) => {
      const users: UserListItem[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          email: data.email || null,
          displayName: data.displayName || null,
          role: data.role as UserRole,
          isActive: data.isActive ?? false,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          isDeleted: data.isDeleted ?? false,
          isSuperadmin: data.isSuperadmin ?? false,
        });
      });

      callback(users);
    },
    (error) => {
      console.error('Error in all users subscription:', error);
    }
  );
};

/**
 * Subscribe to real-time updates for SiteManager users only (to prevent massive global reads)
 *
 * @param callback - Function called whenever the site managers list changes
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToSiteManagers = (
  callback: (users: UserListItem[]) => void
): Unsubscribe => {
  const usersCollectionRef = collection(db, USERS_COLLECTION);
  const q = query(usersCollectionRef, where('role', '==', 'SiteManager'));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const users: UserListItem[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          email: data.email || null,
          displayName: data.displayName || null,
          role: data.role as UserRole,
          isActive: data.isActive ?? false,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          isDeleted: data.isDeleted ?? false,
          isSuperadmin: data.isSuperadmin ?? false,
        });
      });

      callback(users);
    },
    (error) => {
      console.error('Error in site managers subscription:', error);
    }
  );
};
