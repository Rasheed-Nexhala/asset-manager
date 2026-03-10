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
    // Check if category name already exists
    const nameExists = await checkCategoryNameExists(name);
    if (nameExists) {
      throw new Error(`Category "${name}" already exists`);
    }

    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
      name: name.trim(),
      createdAt: serverTimestamp(),
    });

    return docRef.id;
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
export const updateCategory = async (id: string, name: string): Promise<void> => {
  try {
    // Check if new category name already exists
    const nameExists = await checkCategoryNameExists(name, id);
    if (nameExists) {
      throw new Error(`Category "${name}" already exists`);
    }

    await updateDoc(doc(db, CATEGORIES_COLLECTION, id), {
      name: name.trim(),
    });
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
