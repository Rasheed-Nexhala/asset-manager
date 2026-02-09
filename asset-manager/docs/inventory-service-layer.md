# Inventory Management - Service Layer Documentation

## Overview

Step 2 of the Inventory Management implementation creates the service layer that handles all Firebase operations for inventory, categories, and storage. This layer provides a clean API for the Redux layer and React components.

## Files Created

### 1. `src/types/inventory.ts`

TypeScript type definitions for all inventory-related entities:

- **Item Types**: `ItemType`, `ItemStatus`, `LocationType`, `AdjustmentType`
- **Firestore Types**: `FirestoreItem`, `FirestoreInventoryEntry`, `FirestoreCategory` (with Firebase Timestamps)
- **Redux Types**: `Item`, `InventoryEntry`, `Category` (with serialized ISO strings)
- **Data Types**: `CreateItemData`, `UpdateItemData`, `AdjustmentData`, `ItemFilters`
- **Helper Functions**: `timestampToISO()`, `isoToTimestamp()`

**Key Design Decision**: Separate Firestore types (with Timestamps) and Redux types (with ISO strings) to ensure Redux serializability.

### 2. `src/services/firebase/inventoryService.ts`

Core service for item and inventory management:

#### Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `listItems(filters?)` | List items with optional filters (category, type, lowStockOnly, status) | `Promise<Item[]>` |
| `getItemById(id)` | Get single item by ID | `Promise<Item \| null>` |
| `checkSkuExists(sku, excludeId?)` | Validate SKU uniqueness | `Promise<boolean>` |
| `createItem(itemData, categoryName)` | Create item + initial inventory record | `Promise<string>` (item ID) |
| `updateItem(id, updates, categoryName?)` | Update existing item | `Promise<void>` |
| `adjustQuantity(adjustmentData)` | Adjust stock at location | `Promise<void>` |
| `subscribeItems(callback, filters?)` | Real-time listener for items | `Unsubscribe` |
| `subscribeInventoryByLocation(locationId, callback)` | Real-time listener for location inventory | `Unsubscribe` |
| `getInventoryByLocation(locationId)` | One-time read of location inventory | `Promise<InventoryEntry[]>` |

#### Key Features

- **Batch Operations**: `createItem()` and `adjustQuantity()` use Firestore batches for atomic operations
- **Denormalization**: Automatically updates item's stock totals when adjusting inventory
- **Validation**: SKU uniqueness checks, negative stock prevention
- **Real-time Subscriptions**: Support for live updates via `onSnapshot`

#### Example Usage

```typescript
import {
  listItems,
  createItem,
  adjustQuantity,
  subscribeItems,
} from '../services/firebase/inventoryService';

// List items with filters
const items = await listItems({
  categoryId: 'cat_001',
  type: 'consumable',
  lowStockOnly: true,
});

// Create new item
const itemId = await createItem({
  name: 'Power Drill',
  sku: 'PWR-DRL-001',
  categoryId: 'cat_001',
  type: 'non_consumable',
  unit: 'piece',
  minStockLevel: 5,
  initialQuantity: 10,
}, 'Power Tools');

// Adjust quantity
await adjustQuantity({
  itemId: 'item_001',
  locationId: 'store',
  locationType: 'store',
  locationName: 'Central Store',
  type: 'add',
  quantity: 5,
  reason: 'Restock',
  notes: 'Received new shipment',
});

// Subscribe to real-time updates
const unsubscribe = subscribeItems((items) => {
  console.log('Items updated:', items);
});
```

### 3. `src/services/firebase/categoryService.ts`

Service for category management:

#### Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `listCategories()` | List all categories | `Promise<Category[]>` |
| `getCategoryById(id)` | Get single category by ID | `Promise<Category \| null>` |
| `checkCategoryNameExists(name, excludeId?)` | Validate category name uniqueness | `Promise<boolean>` |
| `createCategory(name)` | Create new category | `Promise<string>` (category ID) |
| `updateCategory(id, name)` | Update category name | `Promise<void>` |
| `deleteCategory(id)` | Delete category | `Promise<void>` |
| `checkItemsUsingCategory(categoryId)` | Check if items reference category | `Promise<boolean>` |
| `subscribeCategories(callback)` | Real-time listener for categories | `Unsubscribe` |

#### Key Features

- **Uniqueness Validation**: Prevents duplicate category names
- **Real-time Updates**: Support for live category list updates
- **Safety Check**: `checkItemsUsingCategory()` helps prevent orphaned items

#### Example Usage

```typescript
import {
  listCategories,
  createCategory,
  subscribeCategories,
} from '../services/firebase/categoryService';

// List all categories
const categories = await listCategories();

// Create new category
const categoryId = await createCategory('Power Tools');

// Subscribe to real-time updates
const unsubscribe = subscribeCategories((categories) => {
  console.log('Categories updated:', categories);
});
```

### 4. `src/services/firebase/storageService.ts`

Service for item image uploads to Firebase Storage:

#### Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `uploadItemImage(fileUri, itemId, fileName?)` | Upload image from React Native URI | `Promise<string>` (download URL) |
| `uploadItemImageFromBlob(blob, itemId, fileName)` | Upload image from blob | `Promise<string>` (download URL) |
| `getItemImageUrl(itemId, fileName)` | Get download URL for image | `Promise<string>` |
| `deleteItemImage(itemId, fileName)` | Delete single image | `Promise<void>` |
| `deleteAllItemImages(itemId, fileNames)` | Delete multiple images | `Promise<void>` |
| `validateImageFile(blob)` | Validate file before upload | `{ isValid: boolean; error?: string }` |

#### Key Features

- **File Validation**: Size (max 5MB) and type (images only) validation
- **React Native Support**: Handles React Native file URIs by converting to blob
- **Storage Path**: Uses `itemImages/{itemId}/{fileName}` pattern
- **Error Handling**: Clear error messages for validation failures

#### Example Usage

```typescript
import { uploadItemImage } from '../services/firebase/storageService';
import * as ImagePicker from 'expo-image-picker';

// Upload image from React Native ImagePicker
const pickAndUploadImage = async (itemId: string) => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    const imageUri = result.assets[0].uri;
    const fileName = result.assets[0].fileName || `image_${Date.now()}.jpg`;
    const downloadURL = await uploadItemImage(imageUri, itemId, fileName);
    return downloadURL;
  }
};
```

## Architecture Patterns

### 1. Type Conversion Pattern

Services convert between Firestore types (with Timestamps) and Redux types (with ISO strings):

```typescript
// Firestore → Redux
const firestoreItemToItem = (firestoreItem: FirestoreItem): Item => {
  return {
    ...firestoreItem,
    createdAt: timestampToISO(firestoreItem.createdAt),
    updatedAt: timestampToISO(firestoreItem.updatedAt),
  };
};
```

### 2. Batch Operations Pattern

Critical operations use Firestore batches for atomicity:

```typescript
const batch = writeBatch(db);
batch.set(itemRef, itemData);
batch.set(inventoryRef, inventoryData);
await batch.commit(); // All or nothing
```

### 3. Real-time Subscription Pattern

Services return unsubscribe functions for cleanup:

```typescript
const unsubscribe = subscribeItems((items) => {
  // Handle updates
});

// In React component:
useEffect(() => {
  return () => unsubscribe(); // Cleanup on unmount
}, []);
```

### 4. Validation Pattern

Services validate data before Firebase operations:

```typescript
// Check uniqueness
const skuExists = await checkSkuExists(sku);
if (skuExists) {
  throw new Error(`SKU "${sku}" already exists`);
}
```

## Error Handling

All service methods:
- Log errors to console for debugging
- Re-throw errors for caller to handle
- Provide clear error messages

Example error handling in components:

```typescript
try {
  const itemId = await createItem(itemData, categoryName);
  // Success
} catch (error: any) {
  if (error.message.includes('already exists')) {
    // Show user-friendly error
    Alert.alert('Error', error.message);
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

## Security Considerations

1. **Authentication**: Services check `auth.currentUser` before write operations
2. **Validation**: Input validation prevents invalid data
3. **Firestore Rules**: Security rules enforce role-based access (already implemented in Step 1)
4. **Storage Rules**: File size and type validation enforced by storage rules

## Next Steps

Step 2 is complete. Next: **Step 3 - Redux State Management**

The Redux layer will:
- Use these services in async thunks
- Manage loading/error states
- Provide selectors for filtered data
- Integrate with React components

## Testing Recommendations

1. **Unit Tests**: Test each service method with mocked Firebase
2. **Integration Tests**: Test service interactions (e.g., createItem → adjustQuantity)
3. **Error Cases**: Test validation, duplicate SKUs, negative stock prevention
4. **Real-time**: Test subscription callbacks and cleanup

## Dependencies

- `firebase/firestore`: Firestore operations
- `firebase/storage`: Storage operations
- `firebase/auth`: Authentication checks
- `config/firebase`: Firebase initialization
