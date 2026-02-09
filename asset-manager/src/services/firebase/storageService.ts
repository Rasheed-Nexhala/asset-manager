import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../../config/firebase';

/**
 * Storage path pattern for item images
 * Format: itemImages/{itemId}/{fileName}
 */
const ITEM_IMAGES_PATH = 'itemImages';

/**
 * Maximum file size: 5MB (as per storage rules)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Allowed image MIME types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Upload an item image to Firebase Storage
 * 
 * This function:
 * 1. Validates the file size (max 5MB)
 * 2. Validates the file type (images only)
 * 3. Uploads to itemImages/{itemId}/{fileName}
 * 4. Returns the download URL
 * 
 * @param fileUri - Local file URI (from React Native ImagePicker or similar)
 * @param itemId - Item ID to associate the image with
 * @param fileName - Optional custom file name. If not provided, generates one from timestamp
 * @returns Download URL of the uploaded image
 * 
 * @example
 * ```typescript
 * // Using React Native ImagePicker
 * import * as ImagePicker from 'expo-image-picker';
 * 
 * const pickImage = async (itemId: string) => {
 *   const result = await ImagePicker.launchImageLibraryAsync({
 *     mediaTypes: ImagePicker.MediaTypeOptions.Images,
 *     allowsEditing: true,
 *     quality: 0.8,
 *   });
 * 
 *   if (!result.canceled && result.assets[0]) {
 *     const imageUri = result.assets[0].uri;
 *     const fileName = result.assets[0].fileName || `image_${Date.now()}.jpg`;
 *     const downloadURL = await uploadItemImage(imageUri, itemId, fileName);
 *     return downloadURL;
 *   }
 * };
 * ```
 */
export const uploadItemImage = async (
  fileUri: string,
  itemId: string,
  fileName?: string
): Promise<string> => {
  try {
    // Convert React Native URI to blob
    // In React Native, fileUri is typically a local file path
    // We need to fetch it and convert to blob for Firebase Storage
    const response = await fetch(fileUri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Validate file size
    if (blob.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
      throw new Error(
        `File type "${blob.type}" is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    // Generate file name if not provided
    const finalFileName = fileName || `image_${Date.now()}.${blob.type.split('/')[1]}`;

    // Create storage reference
    const storageRef = ref(storage, `${ITEM_IMAGES_PATH}/${itemId}/${finalFileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: blob.type,
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading item image:', error);
    throw error;
  }
};

/**
 * Upload an item image from a blob (useful for web or when you already have a blob)
 * 
 * @param blob - Blob object containing the image data
 * @param itemId - Item ID to associate the image with
 * @param fileName - File name with extension
 * @returns Download URL of the uploaded image
 */
export const uploadItemImageFromBlob = async (
  blob: Blob,
  itemId: string,
  fileName: string
): Promise<string> => {
  try {
    // Validate file size
    if (blob.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
      throw new Error(
        `File type "${blob.type}" is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    // Create storage reference
    const storageRef = ref(storage, `${ITEM_IMAGES_PATH}/${itemId}/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: blob.type,
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading item image from blob:', error);
    throw error;
  }
};

/**
 * Get download URL for an item image
 * 
 * @param itemId - Item ID
 * @param fileName - File name
 * @returns Download URL
 */
export const getItemImageUrl = async (
  itemId: string,
  fileName: string
): Promise<string> => {
  try {
    const storageRef = ref(storage, `${ITEM_IMAGES_PATH}/${itemId}/${fileName}`);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting item image URL:', error);
    throw error;
  }
};

/**
 * Delete an item image from Firebase Storage
 * 
 * @param itemId - Item ID
 * @param fileName - File name to delete
 */
export const deleteItemImage = async (
  itemId: string,
  fileName: string
): Promise<void> => {
  try {
    const storageRef = ref(storage, `${ITEM_IMAGES_PATH}/${itemId}/${fileName}`);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting item image:', error);
    throw error;
  }
};

/**
 * Delete all images for an item
 * 
 * Note: This function requires listing all files in the item's folder,
 * which is not directly supported by Firebase Storage Web SDK.
 * You would need to maintain a list of file names in Firestore or
 * use Cloud Functions to delete all files in a folder.
 * 
 * For now, this is a placeholder. In production, you might want to:
 * 1. Store image file names in the item document
 * 2. Delete each image individually using deleteItemImage
 * 3. Or use Cloud Functions to delete all files in a folder
 * 
 * @param itemId - Item ID
 * @param fileNames - Array of file names to delete
 */
export const deleteAllItemImages = async (
  itemId: string,
  fileNames: string[]
): Promise<void> => {
  try {
    // Delete all files in parallel
    await Promise.all(
      fileNames.map((fileName) => deleteItemImage(itemId, fileName))
    );
  } catch (error) {
    console.error('Error deleting all item images:', error);
    throw error;
  }
};

/**
 * Validate image file before upload
 * 
 * @param blob - Blob to validate
 * @returns Object with isValid flag and error message if invalid
 */
export const validateImageFile = (blob: Blob): { isValid: boolean; error?: string } => {
  // Check file size
  if (blob.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`,
    };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(blob.type)) {
    return {
      isValid: false,
      error: `File type "${blob.type}" is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  return { isValid: true };
};
