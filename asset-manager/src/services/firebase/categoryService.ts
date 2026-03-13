import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  FirestoreCategory,
  Category,
} from '../../types/inventory';
import { timestampToISO } from '../../types/inventory';

// Collection name
const CATEGORIES_COLLECTION = 'categories';

/**
 * Convert FirestoreCategory to Category (for Redux store)
 */
const firestoreCategoryToCategory = (firestoreCategory: FirestoreCategory): Category => {
  return {
    ...firestoreCategory,
    createdAt: timestampToISO(firestoreCategory.createdAt),
  };
};

/**
 * List all categories
 * 
 * @returns Array of all categories sorted by name
 */
export const listCategories = async (): Promise<Category[]> => {
  try {
    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(q);
    const categories: Category[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const firestoreCategory: FirestoreCategory = {
        id: docSnap.id,
        name: data.name,
        createdAt: data.createdAt,
      };
      categories.push(firestoreCategoryToCategory(firestoreCategory));
    });

    return categories;
  } catch (error) {
    console.error('Error listing categories:', error);
    throw error;
  }
};

/**
 * Get a single category by ID
 * 
 * @param id - Category document ID
 * @returns Category if found, null otherwise
 */
export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const categoryDoc = await getDoc(doc(db, CATEGORIES_COLLECTION, id));

    if (!categoryDoc.exists()) {
      return null;
    }

    const data = categoryDoc.data();
    const firestoreCategory: FirestoreCategory = {
      id: categoryDoc.id,
      name: data.name,
      createdAt: data.createdAt,
    };

    return firestoreCategoryToCategory(firestoreCategory);
  } catch (error) {
    console.error('Error getting category by ID:', error);
    throw error;
  }
};

/**
 * Check if a category name already exists
 * Used for validation before creating/updating categories
 * 
 * @param name - Category name to check
 * @param excludeId - Optional category ID to exclude (for updates)
 * @returns true if name exists, false otherwise
 */
export const checkCategoryNameExists = async (
  name: string,
  excludeId?: string
): Promise<boolean> => {
  try {
    const categoriesSnapshot = await getDocs(
      query(collection(db, CATEGORIES_COLLECTION), where('name', '==', name))
    );

    // If checking for update, exclude the current category
    if (excludeId) {
      return categoriesSnapshot.docs.some((doc) => doc.id !== excludeId);
    }

    return !categoriesSnapshot.empty;
  } catch (error) {
    console.error('Error checking category name:', error);
    throw error;
  }
};

/**
 * Create a new category
 * 
 * @param name - Category name (must be unique)
 * @returns The created category ID
 */
export const createCategory = async (name: string): Promise<string> => {
  try {
    const trimmedName = name.trim();
    // Use normalized category name as the Firestore document ID to natively prevent duplicates
    const docId = trimmedName.toLowerCase().replace(/\s+/g, '');
    const docRef = doc(db, CATEGORIES_COLLECTION, docId);

    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (docSnap.exists()) {
        throw new Error(`Category "${trimmedName}" already exists`);
      }

      transaction.set(docRef, {
        name: trimmedName,
        createdAt: serverTimestamp(),
      });
    });

    return docId;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * Update an existing category name
 * 
 * @param id - Category document ID
 * @param name - New category name (must be unique)
 */
export const updateCategory = async (id: string, name: string): Promise<string> => {
  try {
    const trimmedName = name.trim();
    const newDocId = trimmedName.toLowerCase().replace(/\s+/g, '');

    if (id !== newDocId) {
      // Check if items are using this category before allowing an ID change
      const itemCount = await checkItemsUsingCategory(id);
      if (itemCount > 0) {
        throw new Error(
          `Cannot rename category because ${itemCount} item(s) are currently using it. Please create a new category instead.`
        );
      }

      const oldDocRef = doc(db, CATEGORIES_COLLECTION, id);
      const newDocRef = doc(db, CATEGORIES_COLLECTION, newDocId);

      await runTransaction(db, async (transaction) => {
        const oldDocSnap = await transaction.get(oldDocRef);
        if (!oldDocSnap.exists()) {
          throw new Error('Category not found');
        }

        const newDocSnap = await transaction.get(newDocRef);
        if (newDocSnap.exists()) {
          throw new Error(`Category "${trimmedName}" already exists`);
        }

        // Migrate to new document ID and delete old
        transaction.set(newDocRef, {
          name: trimmedName,
          createdAt: oldDocSnap.data().createdAt,
        });
        transaction.delete(oldDocRef);
      });
    } else {
      // Only case changed, ID remains the same
      const docRef = doc(db, CATEGORIES_COLLECTION, id);
      await updateDoc(docRef, {
        name: trimmedName,
      });
    }
    return newDocId;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Delete a category
 *
 * Server-side check enforces that no items reference this category before deletion.
 * Client-side check in CategoryManagementScreen provides UX defense-in-depth.
 *
 * @param id - Category document ID
 * @throws Error if items are using this category
 */
export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const itemCount = await checkItemsUsingCategory(id);
    if (itemCount > 0) {
      throw new Error(
        `Cannot delete category. ${itemCount} item${itemCount > 1 ? 's' : ''} are using this category.`
      );
    }

    const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

/**
 * Check how many items are using a category
 *
 * Used before deleting a category to ensure data integrity.
 *
 * @param categoryId - Category ID to check
 * @returns Number of items using this category
 */
export const checkItemsUsingCategory = async (categoryId: string): Promise<number> => {
  try {
    const itemsSnapshot = await getDocs(
      query(
        collection(db, 'items'),
        where('categoryId', '==', categoryId)
      )
    );

    return itemsSnapshot.size;
  } catch (error) {
    console.error('Error checking items using category:', error);
    throw error;
  }
};

/**
 * Check how many items have no category assigned (uncategorized)
 *
 * @returns Number of items with null/undefined categoryId
 */
export const checkUncategorizedItemsCount = async (): Promise<number> => {
  try {
    const itemsSnapshot = await getDocs(
      query(
        collection(db, 'items'),
        where('categoryId', '==', null)
      )
    );

    return itemsSnapshot.size;
  } catch (error) {
    console.error('Error checking uncategorized items count:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for categories collection
 * 
 * @param callback - Function called whenever the categories list changes
 * @returns Unsubscribe function to stop listening
 */
export const subscribeCategories = (
  callback: (categories: Category[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    orderBy('name', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      const categories: Category[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const firestoreCategory: FirestoreCategory = {
          id: docSnap.id,
          name: data.name,
          createdAt: data.createdAt,
        };
        categories.push(firestoreCategoryToCategory(firestoreCategory));
      });

      callback(categories);
    },
    (error) => {
      console.error('Error in categories subscription:', error);
    }
  );
};
