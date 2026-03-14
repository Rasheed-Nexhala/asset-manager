import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../../config/firebase';

/**
 * Storage path pattern for item images
 * Format: itemImages/{itemId}/{fileName}
 */
const ITEM_IMAGES_PATH = 'itemImages';

/**
 * Storage path pattern for maintenance photos
 * Format: maintenancePhotos/{maintenanceId}/{fileName}
 */
const MAINTENANCE_PHOTOS_PATH = 'maintenancePhotos';

/**
 * Storage path pattern for PO invoice/documents
 * Format: poInvoices/{poId}/{fileName}
 */
const PO_INVOICES_PATH = 'poInvoices';

/**
 * Storage path pattern for signed PO documents (uploaded before approval)
 * Format: poSignedDocs/{poId}/{fileName}
 */
const PO_SIGNED_DOCS_PATH = 'poSignedDocs';

/**
 * ## Orphaned Image Cleanup
 *
 * To prevent storage costs from accumulating orphaned files:
 * - Call `deleteItemImageByUrl(imageUrl)` when deleting items that have images
 * - Call `deleteItemImageByUrl(imageUrl)` when item creation fails after image upload
 * - Both delete functions handle missing files gracefully (no throw on object-not-found)
 */

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
 * Allowed PO invoice/document MIME types (PDF + images for invoice photos)
 */
const ALLOWED_PO_INVOICE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Infer content type from file URI extension.
 * On React Native Android, fetch(localUri) often returns blob.type === '',
 * so we fall back to extension. Defaults to image/jpeg.
 */
function getContentTypeFromUri(fileUri: string): string {
  const lower = fileUri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.pdf')) return 'application/pdf';
  return 'image/jpeg';
}

/**
 * Resolve content type for PO invoice upload: use blob.type if valid, else infer from URI.
 * Supports PDF and images.
 */
function resolveInvoiceContentType(blob: Blob, fileUri: string): string {
  if (blob.type && ALLOWED_PO_INVOICE_TYPES.includes(blob.type)) {
    return blob.type;
  }
  return getContentTypeFromUri(fileUri);
}

/**
 * Resolve content type for upload: use blob.type if valid, else infer from URI.
 * Fixes Android where blob.type can be empty when fetching local file URIs.
 */
function resolveImageContentType(blob: Blob, fileUri: string): string {
  if (blob.type && ALLOWED_IMAGE_TYPES.includes(blob.type)) {
    return blob.type;
  }
  return getContentTypeFromUri(fileUri);
}

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

    const contentType = resolveImageContentType(blob, fileUri);
    const validation = validateImageFile(blob, contentType);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const extension = contentType.split('/')[1] || 'jpg';
    const finalFileName = fileName || `image_${Date.now()}.${extension}`;

    // Create storage reference
    const storageRef = ref(storage, `${ITEM_IMAGES_PATH}/${itemId}/${finalFileName}`);

    // Upload file (use resolved contentType; blob.type can be empty on Android)
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType,
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
 * Result of uploading a maintenance photo
 */
export interface MaintenancePhotoUploadResult {
  url: string;
  fileName: string;
}

/**
 * Upload a maintenance photo to Firebase Storage
 *
 * Uses the same validation as item images (max 5MB, allowed image types).
 * Path: maintenancePhotos/{maintenanceId}/{fileName}
 *
 * @param fileUri - Local file URI (from React Native ImagePicker)
 * @param maintenanceId - Maintenance record ID to associate the photo with
 * @param fileName - Optional custom file name. If not provided, generates one from timestamp
 * @returns Object with download URL and file name for MaintenancePhoto metadata
 */
export const uploadMaintenancePhoto = async (
  fileUri: string,
  maintenanceId: string,
  fileName?: string
): Promise<MaintenancePhotoUploadResult> => {
  try {
    const response = await fetch(fileUri);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();

    const contentType = resolveImageContentType(blob, fileUri);
    const validation = validateImageFile(blob, contentType);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const extension = contentType.split('/')[1] || 'jpg';
    const finalFileName = fileName || `image_${Date.now()}.${extension}`;
    const storageRef = ref(storage, `${MAINTENANCE_PHOTOS_PATH}/${maintenanceId}/${finalFileName}`);

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType,
    });

    const downloadURL = await getDownloadURL(snapshot.ref);
    return { url: downloadURL, fileName: finalFileName };
  } catch (error) {
    console.error('Error uploading maintenance photo:', error);
    throw error;
  }
};

/**
 * Result of uploading a PO invoice/document
 */
export interface POInvoiceUploadResult {
  url: string;
  fileName: string;
}

/**
 * Upload a PO invoice or document to Firebase Storage
 *
 * Supports PDF and images (for invoice photos). Path: poInvoices/{poId}/{fileName}
 * Max 5MB per file.
 *
 * @param fileUri - Local file URI (from document picker or image picker)
 * @param poId - Purchase Order ID to associate the document with
 * @param fileName - Optional custom file name. If not provided, generates one from timestamp
 * @returns Object with download URL and file name for PO document metadata
 */
export const uploadPOInvoice = async (
  fileUri: string,
  poId: string,
  fileName?: string
): Promise<POInvoiceUploadResult> => {
  try {
    const response = await fetch(fileUri);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();

    const contentType = resolveInvoiceContentType(blob, fileUri);
    const validation = validateInvoiceFile(blob, contentType);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const extension = contentType === 'application/pdf' ? 'pdf' : contentType.split('/')[1] || 'jpg';
    const finalFileName = fileName || `invoice_${Date.now()}.${extension}`;
    const storageRef = ref(storage, `${PO_INVOICES_PATH}/${poId}/${finalFileName}`);

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType,
    });

    const downloadURL = await getDownloadURL(snapshot.ref);
    return { url: downloadURL, fileName: finalFileName };
  } catch (error) {
    console.error('Error uploading PO invoice:', error);
    throw error;
  }
};

/**
 * Result of uploading a signed PO document
 */
export interface POSignedDocUploadResult {
  url: string;
  fileName: string;
}

/**
 * Upload a signed PO document (PDF or image) to Firebase Storage.
 * Used when admin has manually signed the PO and uploads it before approval.
 * Path: poSignedDocs/{poId}/signed_{timestamp}.{ext}
 *
 * @param fileUri - Local file URI (from document picker or image picker)
 * @param poId - Purchase Order ID
 * @param fileName - Optional custom file name
 */
export const uploadPOSignedDocument = async (
  fileUri: string,
  poId: string,
  fileName?: string
): Promise<POSignedDocUploadResult> => {
  try {
    const response = await fetch(fileUri);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();

    const contentType = resolveInvoiceContentType(blob, fileUri);
    const validation = validateInvoiceFile(blob, contentType);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const extension = contentType === 'application/pdf' ? 'pdf' : contentType.split('/')[1] || 'jpg';
    const finalFileName = fileName || `signed_${Date.now()}.${extension}`;
    const storageRef = ref(storage, `${PO_SIGNED_DOCS_PATH}/${poId}/${finalFileName}`);

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType,
    });

    const downloadURL = await getDownloadURL(snapshot.ref);
    return { url: downloadURL, fileName: finalFileName };
  } catch (error) {
    console.error('Error uploading signed PO document:', error);
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
    const validation = validateImageFile(blob);
    if (!validation.isValid) {
      throw new Error(validation.error);
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
 * Extract storage path from Firebase Storage download URL.
 * URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
 *
 * @param imageUrl - Full download URL from Firebase Storage
 * @returns Storage path or null if URL format is invalid
 */
const getStoragePathFromUrl = (imageUrl: string): string | null => {
  try {
    const match = imageUrl.match(/\/o\/(.+?)(\?|$)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

/**
 * Delete an item image from Firebase Storage
 *
 * Handles errors gracefully - does not throw if the image does not exist
 * (e.g. storage/object-not-found). Use for cleanup operations to avoid
 * failing when orphaned references point to already-deleted files.
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
  } catch (error: any) {
    // Don't throw if file doesn't exist - graceful cleanup for orphaned references
    if (error?.code === 'storage/object-not-found') {
      return;
    }
    console.error('Error deleting item image:', error);
    throw error;
  }
};

/**
 * Delete an item image by its Firebase Storage download URL.
 *
 * Used when cleaning up images during item deletion - the item document
 * stores imageUrl, not the storage path. Extracts path from URL and deletes.
 * Does not throw if the image does not exist (graceful cleanup).
 *
 * @param imageUrl - Full download URL from Firebase Storage
 */
export const deleteItemImageByUrl = async (imageUrl: string): Promise<void> => {
  if (!imageUrl || !imageUrl.trim()) return;

  const path = getStoragePathFromUrl(imageUrl);
  if (!path) {
    console.warn('Could not extract storage path from image URL:', imageUrl);
    return;
  }

  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error: any) {
    // Don't throw if file doesn't exist - graceful cleanup for orphaned references
    if (error?.code === 'storage/object-not-found') {
      return;
    }
    console.error('Error deleting item image by URL:', error);
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
export const validateImageFile = (blob: Blob, resolvedContentType?: string): { isValid: boolean; error?: string } => {
  // Check file size
  if (blob.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`,
    };
  }

  // Check file type
  const typeToCheck = resolvedContentType || blob.type;
  if (!ALLOWED_IMAGE_TYPES.includes(typeToCheck)) {
    return {
      isValid: false,
      error: `File type "${typeToCheck}" is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate PO invoice file before upload
 *
 * @param blob - Blob to validate
 * @returns Object with isValid flag and error message if invalid
 */
export const validateInvoiceFile = (blob: Blob, resolvedContentType?: string): { isValid: boolean; error?: string } => {
  if (blob.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`,
    };
  }

  const allowedTypes = ALLOWED_PO_INVOICE_TYPES;
  const typeToCheck = resolvedContentType || blob.type;
  if (typeToCheck && !allowedTypes.includes(typeToCheck)) {
    return {
      isValid: false,
      error: `File type "${typeToCheck}" is not allowed. Allowed types: PDF, images (jpg, png, webp, gif)`,
    };
  }

  return { isValid: true };
};
