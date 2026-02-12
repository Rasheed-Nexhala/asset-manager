# Request Management Module - Complete Implementation Plan

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Architecture Analysis](#architecture-analysis)
3. [Component Hierarchy Design](#component-hierarchy-design)
4. [Data Model & Backend Setup](#data-model--backend-setup)
5. [Redux State Management](#redux-state-management)
6. [Reusable Components](#reusable-components)
7. [Screen Components](#screen-components)
8. [Navigation Integration](#navigation-integration)
9. [Implementation Order](#implementation-order)
10. [Testing Strategy](#testing-strategy)

---

## Feature Overview

### Purpose
Enable Site Managers to request inventory items from Central Store, with Store Incharge processing and approving requests. The module implements a complete workflow from request creation to item transfer and return.

### Key Business Rules
- **No Partial Fulfillment**: If 3 drills needed but only 2 available, request stays pending until all items available
- **Full Edit Rights**: Store Incharge can edit ANY request (quantities, items, priority)
- **Three Priority Levels**: High, Medium, Low
- **Return Workflow**: Non-consumable items only, no due dates

### User Roles
| Role | Capabilities |
|------|-------------|
| **Site Manager** | Create requests, view own requests, return non-consumable items |
| **Store Incharge** | Process all requests, edit any request, approve/reject, confirm transfers |
| **Admin** | Full access to all request operations |

### Status Flow
```
DRAFT ──► PENDING ──► APPROVED ──► TRANSFERRED ──► RETURNED
              │                                   (non-consumable only)
              ▼
          REJECTED

          CANCELLED (by Site Manager before processing)
```

---

## Architecture Analysis

### Existing Resources to Use

#### ✅ Services (`src/services/firebase/`)
- **`inventoryService.ts`**: For stock availability checks, quantity adjustments
  - `getInventoryByLocation(locationId)` - Check central store stock
  - `adjustQuantity(adjustmentData)` - Update inventory on transfer/return
  - `subscribeInventoryByLocation(locationId, callback)` - Real-time stock monitoring
  
- **`siteService.ts`**: For site information
  - `getSite(siteId)` - Get site details for request
  - `getSites()` - List all sites for filtering
  
- **`authService.ts`**: For current user context
  - `getCurrentUser()` - Get requesting user
  - `isAuthenticated()` - Auth checks

#### ✅ Redux Slices (`src/store/slices/`)
- **`authSlice.ts`**: User role and permissions
  - Use `selectIsAdmin`, `selectIsStoreIncharge`, `selectIsSiteManager`
  - Use `selectUserRole` for request ownership validation
  
- **`inventorySlice.ts`**: Item data for request creation
  - Use `selectAllItems` for item selection
  - Use `selectItemById` for item details
  
- **`sitesSlice.ts`**: Site information
  - Use `selectAllSites` for site filtering
  - Use `selectSiteById` for site details in requests

#### ✅ Components (`src/components/`)
- **`ScreenLayout`**: Base layout with SafeAreaView and keyboard handling
- **`ScreenHeader`**: Headers with title and optional right action
- **`FormField`**: Labeled text inputs with validation
- **`StockStatusBadge`**: Badge component pattern (adapt for request status)

#### ✅ Design System (`.cursor/skills/ciams-design-system/`)
- Color palette with semantic colors
- Typography scale for headers, body, badges
- 4px-based spacing system
- Touch target minimums (48px)
- Component patterns (cards, buttons, inputs, badges)

### New Resources to Create

#### 🆕 Services
- **`src/services/firebase/requestService.ts`**: Request CRUD and workflow operations

#### 🆕 Redux
- **`src/store/slices/requestsSlice.ts`**: Request state management
- **`src/store/thunks/requestThunks.ts`**: Async request operations
- **`src/store/selectors/requestSelectors.ts`**: Memoized request selectors

#### 🆕 Types
- **`src/types/request.ts`**: TypeScript interfaces for requests

#### 🆕 Navigation
- **`src/navigation/RequestStackNavigator.tsx`**: Request screen stack

#### 🆕 Components
- `src/components/Requests/` folder with 7 reusable components
- `src/screens/Requests/` folder with 8 screen components

---

## Component Hierarchy Design

### Thinking in React Native: Component Breakdown

Following the "Thinking in React Native" methodology, here's the complete component hierarchy:

```
BottomTabNavigator
└── Requests Tab (new)
    └── RequestStackNavigator
        ├── RequestQueueScreen (Store Incharge initial)
        │   ├── ScreenLayout
        │   ├── ScreenHeader
        │   ├── FilterBar
        │   │   ├── Dropdown (Site)
        │   │   └── Dropdown (Status)
        │   └── SectionList
        │       └── RequestCard (repeating)
        │           ├── PriorityBadge
        │           ├── RequestStatusBadge
        │           └── AvailabilityIndicator
        │
        ├── MyRequestsScreen (Site Manager initial)
        │   ├── ScreenLayout
        │   ├── ScreenHeader
        │   ├── TabView (All/Pending/Approved/Rejected)
        │   └── FlatList
        │       └── RequestCard (repeating)
        │
        ├── CreateRequestScreen
        │   ├── ScreenLayout
        │   ├── ScreenHeader (with Submit action)
        │   ├── ScrollView
        │   │   ├── PrioritySelector
        │   │   ├── ItemsList
        │   │   │   └── RequestItemCard (repeating)
        │   │   │       ├── Image
        │   │   │       ├── QuantityControl (+/- buttons)
        │   │   │       └── RemoveButton
        │   │   ├── AddItemButton → ItemSelectorModal
        │   │   └── FormField (Purpose/Notes)
        │   └── BottomActions
        │       ├── SecondaryButton (Save Draft)
        │       └── PrimaryButton (Submit Request)
        │
        ├── ProcessRequestScreen
        │   ├── ScreenLayout
        │   ├── ScreenHeader
        │   ├── ScrollView
        │   │   ├── RequestHeader
        │   │   │   ├── PriorityBadge
        │   │   │   └── RequestStatusBadge
        │   │   ├── MetadataSection
        │   │   ├── ItemsList
        │   │   │   └── RequestItemCard (with availability)
        │   │   │       └── AvailabilityIndicator
        │   │   ├── InsufficientStockBanner (conditional)
        │   │   └── EditHistoryList (expandable)
        │   └── BottomActions
        │       ├── SecondaryButton (Edit)
        │       ├── SecondaryButton (Reject)
        │       └── PrimaryButton (Approve - conditional)
        │
        ├── EditRequestScreen
        │   ├── (Similar to CreateRequestScreen)
        │   └── FormField (Edit Reason - required)
        │
        ├── RejectRequestScreen
        │   ├── ScreenLayout
        │   ├── ScreenHeader
        │   ├── ScrollView
        │   │   ├── RequestSummary
        │   │   ├── Dropdown (Rejection Reason)
        │   │   └── FormField (Comments)
        │   └── PrimaryButton (Confirm Rejection)
        │
        ├── ConfirmTransferScreen
        │   ├── ScreenLayout
        │   ├── ScreenHeader
        │   ├── ScrollView
        │   │   ├── RequestSummary
        │   │   ├── ItemsChecklist
        │   │   ├── FormField (Received By)
        │   │   └── WarningBanner
        │   └── PrimaryButton (Confirm Transfer)
        │
        └── ReturnItemsScreen
            ├── ScreenLayout
            ├── ScreenHeader
            ├── ScrollView
            │   ├── ItemsList (non-consumable only)
            │   │   └── ReturnItemCard
            │   │       ├── Checkbox
            │   │       ├── QuantitySlider
            │   │       └── ConditionSelector (Radio buttons)
            │   └── FormField (Return Notes)
            └── PrimaryButton (Submit Return)

Shared Components (in src/components/Requests/)
├── RequestCard
├── PrioritySelector
├── RequestItemCard
├── ItemSelectorModal
├── RequestStatusBadge
├── AvailabilityIndicator
└── EditHistoryList
```

### Component Responsibilities

**Presentational Components** (no business logic):
- `RequestCard`: Display request summary with badges
- `PrioritySelector`: 3-option radio selector for priority
- `RequestStatusBadge`: Status-colored badge
- `AvailabilityIndicator`: Check/warning icon with availability text
- `EditHistoryList`: Formatted history entries

**Container Components** (with state/logic):
- All Screen components
- `ItemSelectorModal`: Item search and multi-select
- `RequestItemCard`: Quantity controls and state

---

## Data Model & Backend Setup

### Phase 1.1: TypeScript Interfaces

**File**: `src/types/request.ts`

```typescript
import { Timestamp } from 'firebase/firestore';

export type RequestStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'transferred' 
  | 'returned' 
  | 'cancelled';

export type RequestPriority = 'high' | 'medium' | 'low';

export type ItemCondition = 'good' | 'needs_maintenance' | 'damaged';

export interface RequestItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  itemType: 'consumable' | 'non_consumable';
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  quantityRequested: number;
  quantityApproved: number;
  quantityReturned: number;
  status: 'pending' | 'approved' | 'transferred' | 'returned';
}

export interface EditHistoryEntry {
  editedBy: string;
  editedByName: string;
  editedAt: Timestamp;
  reason: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface Request {
  id: string;
  requestNumber: string; // REQ-2025-0045
  
  // Site & User
  siteId: string;
  siteName: string;
  requestedBy: string;
  requestedByName: string;
  
  // Status & Priority
  status: RequestStatus;
  priority: RequestPriority;
  purpose: string;
  
  // Items
  items: RequestItem[];
  
  // Processing
  processedBy: string | null;
  processedByName: string | null;
  processedAt: Timestamp | null;
  storeNotes: string | null;
  rejectionReason: string | null;
  rejectionComments: string | null;
  
  // Transfer
  transferredAt: Timestamp | null;
  transferredBy: string | null;
  transferredByName: string | null;
  receivedBy: string | null;
  receivedByName: string | null;
  
  // Return
  returnedAt: Timestamp | null;
  returnItems: Array<{
    itemId: string;
    quantityReturned: number;
    condition: ItemCondition;
  }> | null;
  returnNotes: string | null;
  
  // Audit
  editHistory: EditHistoryEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Item availability check result
export interface ItemAvailability {
  itemId: string;
  itemName: string;
  requested: number;
  available: number;
  sufficient: boolean;
}

// Request creation data
export interface CreateRequestData {
  siteId: string;
  siteName: string;
  priority: RequestPriority;
  purpose: string;
  items: Array<{
    itemId: string;
    itemName: string;
    itemSku: string;
    itemType: 'consumable' | 'non_consumable';
    categoryId: string;
    categoryName: string;
    imageUrl?: string;
    quantity: number;
  }>;
}

// Request edit data
export interface EditRequestData {
  priority?: RequestPriority;
  purpose?: string;
  items?: RequestItem[];
  editReason: string;
}

// Rejection data
export interface RejectRequestData {
  reason: 'insufficient_stock' | 'duplicate_request' | 'items_not_required' | 'other';
  comments: string;
}

// Transfer data
export interface TransferRequestData {
  receivedBy: string;
  receivedByName: string;
}

// Return data
export interface ReturnItemsData {
  items: Array<{
    itemId: string;
    quantityReturned: number;
    condition: ItemCondition;
  }>;
  returnNotes?: string;
}
```

### Phase 1.2: Firestore Security Rules

**File**: `firestore.rules`

Add to existing rules:

```javascript
// Helper function to check if user can manage requests
function canManageRequests() {
  return isAuthenticated() && isUserActive() && (isAdmin() || isStoreIncharge());
}

// Requests collection
match /requests/{requestId} {
  // Read access
  allow read: if isAuthenticated() && isUserActive() && (
    isAdmin() ||
    isStoreIncharge() ||
    (isSiteManager() && resource.data.requestedBy == request.auth.uid)
  );
  
  // Create: Only Site Managers for their own requests
  allow create: if isAuthenticated() && 
    isUserActive() &&
    isSiteManager() && 
    request.resource.data.requestedBy == request.auth.uid &&
    request.resource.data.status in ['draft', 'pending'];
  
  // Update: Site Managers (own drafts), Store Incharge/Admin (any request)
  allow update: if isAuthenticated() && isUserActive() && (
    (isSiteManager() && 
     resource.data.requestedBy == request.auth.uid && 
     resource.data.status == 'draft') ||
    canManageRequests()
  );
  
  // Delete: Admin only (soft delete preferred)
  allow delete: if isAuthenticated() && isUserActive() && isAdmin();
}
```

### Phase 1.3: Request Service

**File**: `src/services/firebase/requestService.ts`

```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type {
  Request,
  CreateRequestData,
  EditRequestData,
  RejectRequestData,
  TransferRequestData,
  ReturnItemsData,
  ItemAvailability,
  EditHistoryEntry,
} from '../../types/request';
import { inventoryService } from './inventoryService';

const REQUESTS_COLLECTION = 'requests';

/**
 * Generate unique request number
 * Format: REQ-YYYY-NNNN
 */
const generateRequestNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  
  try {
    const snapshot = await getDocs(
      query(
        collection(db, REQUESTS_COLLECTION),
        where('requestNumber', '>=', prefix),
        where('requestNumber', '<', `REQ-${year + 1}-`),
        orderBy('requestNumber', 'desc'),
        limit(1)
      )
    );
    
    const lastNumber = snapshot.empty 
      ? 0 
      : parseInt(snapshot.docs[0].data().requestNumber.split('-')[2]);
    
    return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating request number:', error);
    // Fallback: timestamp-based
    return `${prefix}${Date.now()}`;
  }
};

/**
 * Create a new request
 */
export const createRequest = async (
  requestData: CreateRequestData,
  userId: string,
  userName: string,
  isDraft: boolean = false
): Promise<string> => {
  try {
    const requestNumber = await generateRequestNumber();
    
    const newRequest = {
      requestNumber,
      siteId: requestData.siteId,
      siteName: requestData.siteName,
      requestedBy: userId,
      requestedByName: userName,
      
      status: isDraft ? 'draft' : 'pending',
      priority: requestData.priority,
      purpose: requestData.purpose,
      
      items: requestData.items.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemSku: item.itemSku,
        itemType: item.itemType,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        imageUrl: item.imageUrl || null,
        quantityRequested: item.quantity,
        quantityApproved: item.quantity,
        quantityReturned: 0,
        status: 'pending',
      })),
      
      processedBy: null,
      processedByName: null,
      processedAt: null,
      storeNotes: null,
      rejectionReason: null,
      rejectionComments: null,
      
      transferredAt: null,
      transferredBy: null,
      transferredByName: null,
      receivedBy: null,
      receivedByName: null,
      
      returnedAt: null,
      returnItems: null,
      returnNotes: null,
      
      editHistory: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), newRequest);
    return docRef.id;
  } catch (error) {
    console.error('Error creating request:', error);
    throw new Error('Failed to create request. Please try again.');
  }
};

/**
 * Check availability of items in central store
 */
export const checkItemsAvailability = async (
  items: Array<{ itemId: string; itemName: string; quantityRequested: number }>
): Promise<ItemAvailability[]> => {
  try {
    const availabilityChecks = await Promise.all(
      items.map(async (item) => {
        const inventory = await inventoryService.getInventoryByLocation('store');
        const inventoryItem = inventory.find(inv => inv.itemId === item.itemId);
        const available = inventoryItem?.quantity || 0;
        
        return {
          itemId: item.itemId,
          itemName: item.itemName,
          requested: item.quantityRequested,
          available,
          sufficient: available >= item.quantityRequested,
        };
      })
    );
    
    return availabilityChecks;
  } catch (error) {
    console.error('Error checking items availability:', error);
    throw new Error('Failed to check item availability');
  }
};

/**
 * Update an existing request with edit history
 */
export const editRequest = async (
  requestId: string,
  updates: EditRequestData,
  editedBy: string,
  editedByName: string
): Promise<void> => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const currentData = requestSnap.data();
    
    // Build change log
    const changes: EditHistoryEntry['changes'] = [];
    
    if (updates.priority && updates.priority !== currentData.priority) {
      changes.push({
        field: 'priority',
        oldValue: currentData.priority,
        newValue: updates.priority,
      });
    }
    
    if (updates.purpose && updates.purpose !== currentData.purpose) {
      changes.push({
        field: 'purpose',
        oldValue: currentData.purpose,
        newValue: updates.purpose,
      });
    }
    
    if (updates.items) {
      // Track item quantity changes
      updates.items.forEach((newItem, index) => {
        const oldItem = currentData.items[index];
        if (oldItem && newItem.quantityRequested !== oldItem.quantityRequested) {
          changes.push({
            field: `items[${index}].quantityRequested`,
            oldValue: oldItem.quantityRequested,
            newValue: newItem.quantityRequested,
          });
        }
      });
    }
    
    // Create edit history entry
    const historyEntry: EditHistoryEntry = {
      editedBy,
      editedByName,
      editedAt: Timestamp.now(),
      reason: updates.editReason,
      changes,
    };
    
    // Update request
    await updateDoc(requestRef, {
      ...(updates.priority && { priority: updates.priority }),
      ...(updates.purpose && { purpose: updates.purpose }),
      ...(updates.items && { items: updates.items }),
      editHistory: [...currentData.editHistory, historyEntry],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error editing request:', error);
    throw new Error('Failed to edit request. Please try again.');
  }
};

/**
 * Approve a request (reserves items)
 */
export const approveRequest = async (
  requestId: string,
  processedBy: string,
  processedByName: string,
  storeNotes?: string
): Promise<void> => {
  try {
    // First check availability
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    const availability = await checkItemsAvailability(
      requestData.items.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        quantityRequested: item.quantityRequested,
      }))
    );
    
    // Ensure all items sufficient
    const allSufficient = availability.every(item => item.sufficient);
    if (!allSufficient) {
      throw new Error('Cannot approve: insufficient stock for some items');
    }
    
    // Update status
    await updateDoc(requestRef, {
      status: 'approved',
      processedBy,
      processedByName,
      processedAt: serverTimestamp(),
      storeNotes: storeNotes || null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error approving request:', error);
    throw error;
  }
};

/**
 * Reject a request
 */
export const rejectRequest = async (
  requestId: string,
  rejectionData: RejectRequestData,
  processedBy: string,
  processedByName: string
): Promise<void> => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    
    await updateDoc(requestRef, {
      status: 'rejected',
      processedBy,
      processedByName,
      processedAt: serverTimestamp(),
      rejectionReason: rejectionData.reason,
      rejectionComments: rejectionData.comments,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    throw new Error('Failed to reject request. Please try again.');
  }
};

/**
 * Transfer request items (atomic inventory update)
 */
export const transferRequest = async (
  requestId: string,
  transferData: TransferRequestData,
  transferredBy: string,
  transferredByName: string
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      // Get request
      const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
      const requestSnap = await transaction.get(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Request not found');
      }
      
      const requestData = requestSnap.data();
      
      if (requestData.status !== 'approved') {
        throw new Error('Only approved requests can be transferred');
      }
      
      // For each item, update inventory
      for (const item of requestData.items) {
        const quantity = item.quantityApproved;
        
        // Decrement central store
        const centralStoreInventoryRef = collection(db, 'inventory');
        const centralStoreQuery = query(
          centralStoreInventoryRef,
          where('itemId', '==', item.itemId),
          where('locationId', '==', 'store'),
          limit(1)
        );
        const centralStoreSnap = await getDocs(centralStoreQuery);
        
        if (!centralStoreSnap.empty) {
          const inventoryDoc = centralStoreSnap.docs[0];
          const currentQty = inventoryDoc.data().quantity;
          transaction.update(inventoryDoc.ref, {
            quantity: currentQty - quantity,
            updatedAt: serverTimestamp(),
          });
        }
        
        // Increment site inventory
        const siteInventoryQuery = query(
          centralStoreInventoryRef,
          where('itemId', '==', item.itemId),
          where('locationId', '==', `site_${requestData.siteId}`),
          limit(1)
        );
        const siteInventorySnap = await getDocs(siteInventoryQuery);
        
        if (!siteInventorySnap.empty) {
          // Update existing
          const inventoryDoc = siteInventorySnap.docs[0];
          const currentQty = inventoryDoc.data().quantity;
          transaction.update(inventoryDoc.ref, {
            quantity: currentQty + quantity,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Create new inventory entry
          const newInventoryRef = doc(collection(db, 'inventory'));
          transaction.set(newInventoryRef, {
            itemId: item.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            locationId: `site_${requestData.siteId}`,
            locationType: 'site',
            locationName: requestData.siteName,
            quantity: quantity,
            updatedAt: serverTimestamp(),
          });
        }
        
        // Update item status in request
        const updatedItems = requestData.items.map((reqItem: any) => 
          reqItem.itemId === item.itemId 
            ? { ...reqItem, status: 'transferred' }
            : reqItem
        );
        
        transaction.update(requestRef, {
          items: updatedItems,
        });
      }
      
      // Update request status
      transaction.update(requestRef, {
        status: 'transferred',
        transferredAt: serverTimestamp(),
        transferredBy,
        transferredByName,
        receivedBy: transferData.receivedBy,
        receivedByName: transferData.receivedByName,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error transferring request:', error);
    throw new Error('Failed to complete transfer. Please try again.');
  }
};

/**
 * Return items from site to central store or maintenance
 */
export const returnItems = async (
  requestId: string,
  returnData: ReturnItemsData,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
      const requestSnap = await transaction.get(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Request not found');
      }
      
      const requestData = requestSnap.data();
      
      // Update inventory based on condition
      for (const returnItem of returnData.items) {
        const item = requestData.items.find((i: any) => i.itemId === returnItem.itemId);
        if (!item || item.itemType === 'consumable') {
          continue; // Skip consumables
        }
        
        // Decrement site inventory
        const siteInventoryRef = collection(db, 'inventory');
        const siteInventoryQuery = query(
          siteInventoryRef,
          where('itemId', '==', returnItem.itemId),
          where('locationId', '==', `site_${requestData.siteId}`),
          limit(1)
        );
        const siteInventorySnap = await getDocs(siteInventoryQuery);
        
        if (!siteInventorySnap.empty) {
          const inventoryDoc = siteInventorySnap.docs[0];
          const currentQty = inventoryDoc.data().quantity;
          transaction.update(inventoryDoc.ref, {
            quantity: currentQty - returnItem.quantityReturned,
            updatedAt: serverTimestamp(),
          });
        }
        
        // Increment appropriate location based on condition
        const targetLocationId = returnItem.condition === 'good' 
          ? 'store' 
          : 'maintenance';
        
        const targetInventoryQuery = query(
          siteInventoryRef,
          where('itemId', '==', returnItem.itemId),
          where('locationId', '==', targetLocationId),
          limit(1)
        );
        const targetInventorySnap = await getDocs(targetInventoryQuery);
        
        if (!targetInventorySnap.empty) {
          const inventoryDoc = targetInventorySnap.docs[0];
          const currentQty = inventoryDoc.data().quantity;
          transaction.update(inventoryDoc.ref, {
            quantity: currentQty + returnItem.quantityReturned,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Create new inventory entry
          const newInventoryRef = doc(collection(db, 'inventory'));
          transaction.set(newInventoryRef, {
            itemId: returnItem.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            locationId: targetLocationId,
            locationType: targetLocationId === 'store' ? 'store' : 'maintenance',
            locationName: targetLocationId === 'store' ? 'Central Store' : 'Maintenance',
            quantity: returnItem.quantityReturned,
            updatedAt: serverTimestamp(),
          });
        }
      }
      
      // Update request
      transaction.update(requestRef, {
        status: 'returned',
        returnedAt: serverTimestamp(),
        returnItems: returnData.items,
        returnNotes: returnData.returnNotes || null,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error returning items:', error);
    throw new Error('Failed to return items. Please try again.');
  }
};

/**
 * Cancel a draft request
 */
export const cancelRequest = async (requestId: string): Promise<void> => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    
    if (requestData.status !== 'draft' && requestData.status !== 'pending') {
      throw new Error('Only draft or pending requests can be cancelled');
    }
    
    await updateDoc(requestRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    throw new Error('Failed to cancel request. Please try again.');
  }
};

/**
 * Get single request by ID
 */
export const getRequestById = async (requestId: string): Promise<Request | null> => {
  try {
    const requestDoc = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
    
    if (!requestDoc.exists()) {
      return null;
    }
    
    return {
      id: requestDoc.id,
      ...requestDoc.data(),
    } as Request;
  } catch (error) {
    console.error('Error getting request:', error);
    throw new Error('Failed to fetch request');
  }
};

/**
 * Subscribe to requests (real-time)
 */
export const subscribeToRequests = (
  filters: {
    status?: string;
    siteId?: string;
    userId?: string; // For Site Manager's own requests
  },
  callback: (requests: Request[]) => void
): (() => void) => {
  try {
    let q = query(collection(db, REQUESTS_COLLECTION));
    
    // Apply filters
    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }
    
    if (filters.siteId && filters.siteId !== 'all') {
      q = query(q, where('siteId', '==', filters.siteId));
    }
    
    if (filters.userId) {
      q = query(q, where('requestedBy', '==', filters.userId));
    }
    
    // Order by priority and date
    q = query(q, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const requests: Request[] = [];
        snapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data(),
          } as Request);
        });
        
        // Sort by priority (high → medium → low) and then by date
        const sortedRequests = requests.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority];
          
          if (priorityCompare !== 0) {
            return priorityCompare;
          }
          
          // If same priority, sort by date (newest first)
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
        
        callback(sortedRequests);
      },
      (error) => {
        console.error('Error in requests subscription:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up requests subscription:', error);
    return () => {};
  }
};

export const requestService = {
  createRequest,
  checkItemsAvailability,
  editRequest,
  approveRequest,
  rejectRequest,
  transferRequest,
  returnItems,
  cancelRequest,
  getRequestById,
  subscribeToRequests,
};
```

---

## Redux State Management

### Phase 2.1: Redux Slice

**File**: `src/store/slices/requestsSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Request } from '../../types/request';

interface RequestsState {
  requests: Request[];
  myRequests: Request[];
  selectedRequest: Request | null;
  loading: boolean;
  error: string | null;
  errorTimestamp: number | null;
  filters: {
    status: string;
    priority: string;
    siteId: string;
  };
}

const initialState: RequestsState = {
  requests: [],
  myRequests: [],
  selectedRequest: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: {
    status: 'all',
    priority: 'all',
    siteId: 'all',
  },
};

const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    // Request data
    setRequests: (state, action: PayloadAction<Request[]>) => {
      state.requests = action.payload;
      state.loading = false;
    },
    
    setMyRequests: (state, action: PayloadAction<Request[]>) => {
      state.myRequests = action.payload;
      state.loading = false;
    },
    
    setSelectedRequest: (state, action: PayloadAction<Request | null>) => {
      state.selectedRequest = action.payload;
    },
    
    addRequest: (state, action: PayloadAction<Request>) => {
      state.requests.unshift(action.payload);
      state.myRequests.unshift(action.payload);
    },
    
    updateRequestInState: (state, action: PayloadAction<Request>) => {
      const index = state.requests.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.requests[index] = action.payload;
      }
      
      const myIndex = state.myRequests.findIndex(r => r.id === action.payload.id);
      if (myIndex !== -1) {
        state.myRequests[myIndex] = action.payload;
      }
      
      if (state.selectedRequest?.id === action.payload.id) {
        state.selectedRequest = action.payload;
      }
    },
    
    // Filters
    setFilters: (state, action: PayloadAction<Partial<RequestsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    
    // Loading & Error
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.errorTimestamp = Date.now();
      state.loading = false;
    },
    
    clearError: (state) => {
      state.error = null;
      state.errorTimestamp = null;
    },
    
    // Clear all
    clearRequests: (state) => {
      state.requests = [];
      state.myRequests = [];
      state.selectedRequest = null;
      state.loading = false;
      state.error = null;
      state.errorTimestamp = null;
    },
  },
});

export const {
  setRequests,
  setMyRequests,
  setSelectedRequest,
  addRequest,
  updateRequestInState,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
  clearRequests,
} = requestsSlice.actions;

export default requestsSlice.reducer;
```

### Phase 2.2: Thunks

**File**: `src/store/thunks/requestThunks.ts`

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import { requestService } from '../../services/firebase/requestService';
import type {
  CreateRequestData,
  EditRequestData,
  RejectRequestData,
  TransferRequestData,
  ReturnItemsData,
} from '../../types/request';
import {
  setLoading,
  setError,
  clearError,
  addRequest,
  updateRequestInState,
} from '../slices/requestsSlice';

/**
 * Create a new request
 */
export const createRequest = createAsyncThunk(
  'requests/createRequest',
  async (
    {
      requestData,
      userId,
      userName,
      isDraft,
    }: {
      requestData: CreateRequestData;
      userId: string;
      userName: string;
      isDraft?: boolean;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      
      const requestId = await requestService.createRequest(
        requestData,
        userId,
        userName,
        isDraft
      );
      
      // Fetch the created request
      const createdRequest = await requestService.getRequestById(requestId);
      if (createdRequest) {
        dispatch(addRequest(createdRequest));
      }
      
      dispatch(setLoading(false));
      return requestId;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Edit an existing request
 */
export const editRequest = createAsyncThunk(
  'requests/editRequest',
  async (
    {
      requestId,
      updates,
      editedBy,
      editedByName,
    }: {
      requestId: string;
      updates: EditRequestData;
      editedBy: string;
      editedByName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      
      await requestService.editRequest(requestId, updates, editedBy, editedByName);
      
      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }
      
      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to edit request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Approve a request
 */
export const approveRequest = createAsyncThunk(
  'requests/approveRequest',
  async (
    {
      requestId,
      processedBy,
      processedByName,
      storeNotes,
    }: {
      requestId: string;
      processedBy: string;
      processedByName: string;
      storeNotes?: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      
      await requestService.approveRequest(
        requestId,
        processedBy,
        processedByName,
        storeNotes
      );
      
      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }
      
      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to approve request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Reject a request
 */
export const rejectRequest = createAsyncThunk(
  'requests/rejectRequest',
  async (
    {
      requestId,
      rejectionData,
      processedBy,
      processedByName,
    }: {
      requestId: string;
      rejectionData: RejectRequestData;
      processedBy: string;
      processedByName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      
      await requestService.rejectRequest(
        requestId,
        rejectionData,
        processedBy,
        processedByName
      );
      
      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }
      
      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reject request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Transfer request items
 */
export const transferRequest = createAsyncThunk(
  'requests/transferRequest',
  async (
    {
      requestId,
      transferData,
      transferredBy,
      transferredByName,
    }: {
      requestId: string;
      transferData: TransferRequestData;
      transferredBy: string;
      transferredByName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      
      await requestService.transferRequest(
        requestId,
        transferData,
        transferredBy,
        transferredByName
      );
      
      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }
      
      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to transfer request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Return items
 */
export const returnItems = createAsyncThunk(
  'requests/returnItems',
  async (
    {
      requestId,
      returnData,
      userId,
      userName,
    }: {
      requestId: string;
      returnData: ReturnItemsData;
      userId: string;
      userName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      
      await requestService.returnItems(requestId, returnData, userId, userName);
      
      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }
      
      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to return items';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Cancel a request
 */
export const cancelRequest = createAsyncThunk(
  'requests/cancelRequest',
  async (
    { requestId }: { requestId: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      
      await requestService.cancelRequest(requestId);
      
      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }
      
      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to cancel request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);
```

### Phase 2.3: Selectors

**File**: `src/store/selectors/requestSelectors.ts`

```typescript
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import type { Request } from '../../types/request';

// Base selectors
export const selectRequestsState = (state: RootState) => state.requests;

export const selectAllRequests = (state: RootState) => state.requests.requests;

export const selectMyRequests = (state: RootState) => state.requests.myRequests;

export const selectSelectedRequest = (state: RootState) => state.requests.selectedRequest;

export const selectRequestsLoading = (state: RootState) => state.requests.loading;

export const selectRequestsError = (state: RootState) => state.requests.error;

export const selectRequestsFilters = (state: RootState) => state.requests.filters;

// Memoized selectors
export const selectRequestById = (requestId: string) =>
  createSelector([selectAllRequests], (requests) =>
    requests.find((request) => request.id === requestId)
  );

/**
 * Group requests by priority for queue display
 */
export const selectRequestsByPriority = createSelector(
  [selectAllRequests, selectRequestsFilters],
  (requests, filters) => {
    // Apply filters
    let filtered = requests;
    
    if (filters.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filters.status);
    }
    
    if (filters.siteId !== 'all') {
      filtered = filtered.filter((r) => r.siteId === filters.siteId);
    }
    
    // Group by priority
    const grouped = {
      high: filtered.filter((r) => r.priority === 'high'),
      medium: filtered.filter((r) => r.priority === 'medium'),
      low: filtered.filter((r) => r.priority === 'low'),
    };
    
    return grouped;
  }
);

/**
 * Get filtered requests
 */
export const selectFilteredRequests = createSelector(
  [selectAllRequests, selectRequestsFilters],
  (requests, filters) => {
    let filtered = requests;
    
    if (filters.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filters.status);
    }
    
    if (filters.priority !== 'all') {
      filtered = filtered.filter((r) => r.priority === filters.priority);
    }
    
    if (filters.siteId !== 'all') {
      filtered = filtered.filter((r) => r.siteId === filters.siteId);
    }
    
    return filtered;
  }
);

/**
 * Get pending requests count
 */
export const selectPendingRequestsCount = createSelector(
  [selectAllRequests],
  (requests) => requests.filter((r) => r.status === 'pending').length
);

/**
 * Get high priority pending requests count
 */
export const selectHighPriorityPendingCount = createSelector(
  [selectAllRequests],
  (requests) =>
    requests.filter((r) => r.status === 'pending' && r.priority === 'high').length
);

/**
 * Filter my requests by status
 */
export const selectMyRequestsByStatus = (status: string) =>
  createSelector([selectMyRequests], (requests) =>
    status === 'all' ? requests : requests.filter((r) => r.status === status)
  );
```

### Phase 2.4: Update Store Configuration

**File**: `src/store/index.ts`

Add `requestsSlice` to the store:

```typescript
import requestsReducer from './slices/requestsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sites: sitesReducer,
    inventory: inventoryReducer,
    requests: requestsReducer, // Add this
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/setUser',
          'auth/setUserRole',
          // Add requests actions
          'requests/setRequests',
          'requests/setMyRequests',
          'requests/setSelectedRequest',
        ],
        ignoredPaths: [
          'auth.user',
          'requests.requests',
          'requests.myRequests',
          'requests.selectedRequest',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## Reusable Components

### Component 1: RequestStatusBadge

**File**: `src/components/Requests/RequestStatusBadge.tsx`

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import type { RequestStatus } from '../../types/request';

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

const statusConfig = {
  draft: {
    bg: 'bg-[#64748B]/15',
    text: 'text-[#64748B]',
    label: 'Draft',
  },
  pending: {
    bg: 'bg-[#D97706]/15',
    text: 'text-[#D97706]',
    label: 'Pending',
  },
  approved: {
    bg: 'bg-[#1E40AF]/15',
    text: 'text-[#1E40AF]',
    label: 'Approved',
  },
  rejected: {
    bg: 'bg-[#DC2626]/15',
    text: 'text-[#DC2626]',
    label: 'Rejected',
  },
  transferred: {
    bg: 'bg-[#16A34A]/15',
    text: 'text-[#16A34A]',
    label: 'Transferred',
  },
  returned: {
    bg: 'bg-[#475569]/15',
    text: 'text-[#475569]',
    label: 'Returned',
  },
  cancelled: {
    bg: 'bg-[#64748B]/15',
    text: 'text-[#64748B]',
    label: 'Cancelled',
  },
};

export const RequestStatusBadge: React.FC<RequestStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  
  return (
    <View className={`px-2 py-1 rounded-full ${config.bg}`}>
      <Text className={`text-[12px] font-medium ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
};
```

### Component 2: PrioritySelector

**File**: `src/components/Requests/PrioritySelector.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { RequestPriority } from '../../types/request';

interface PrioritySelectorProps {
  value: RequestPriority;
  onChange: (priority: RequestPriority) => void;
  error?: string;
}

const priorities: Array<{ value: RequestPriority; label: string; color: string; emoji: string }> = [
  { value: 'high', label: 'High', color: '#DC2626', emoji: '🔴' },
  { value: 'medium', label: 'Medium', color: '#D97706', emoji: '🟡' },
  { value: 'low', label: 'Low', color: '#16A34A', emoji: '🟢' },
];

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value,
  onChange,
  error,
}) => {
  return (
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">
        Priority <Text className="text-[#DC2626]">*</Text>
      </Text>
      
      <View className="flex-row gap-3">
        {priorities.map((priority) => {
          const isSelected = value === priority.value;
          
          return (
            <TouchableOpacity
              key={priority.value}
              onPress={() => onChange(priority.value)}
              className={`flex-1 h-12 rounded-lg border-[1.5px] items-center justify-center ${
                isSelected
                  ? 'bg-white border-[' + priority.color + ']'
                  : 'bg-white border-[#E2E8F0]'
              }`}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`Priority: ${priority.label}`}
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">{priority.emoji}</Text>
                <Text
                  className={`text-[15px] font-semibold ${
                    isSelected ? `text-[${priority.color}]` : 'text-[#64748B]'
                  }`}
                >
                  {priority.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {error && (
        <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
};
```

### Component 3: RequestCard

**File**: `src/components/Requests/RequestCard.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Request } from '../../types/request';
import { RequestStatusBadge } from './RequestStatusBadge';

interface RequestCardProps {
  request: Request;
  onPress: () => void;
  showAvailability?: boolean;
  isAllSufficient?: boolean;
}

const priorityConfig = {
  high: { emoji: '🔴', color: '#DC2626' },
  medium: { emoji: '🟡', color: '#D97706' },
  low: { emoji: '🟢', color: '#16A34A' },
};

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onPress,
  showAvailability = false,
  isAllSufficient = false,
}) => {
  const priorityInfo = priorityConfig[request.priority];
  const itemCount = request.items.length;
  
  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Request ${request.requestNumber}`}
    >
      {/* Top Row: Request Number + Status Badge */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-lg">{priorityInfo.emoji}</Text>
          <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">
            {request.requestNumber}
          </Text>
        </View>
        <RequestStatusBadge status={request.status} />
      </View>
      
      {/* Middle: Key Info */}
      <View className="flex-row gap-4 mb-3">
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B]">Site</Text>
          <Text className="text-[15px] text-[#0F172A]">{request.siteName}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B]">Items</Text>
          <Text className="text-[15px] text-[#0F172A]">{itemCount}</Text>
        </View>
      </View>
      
      {/* Availability Indicator (for Store Incharge) */}
      {showAvailability && (
        <View className={`p-2 rounded-lg mb-3 ${isAllSufficient ? 'bg-[#16A34A]/10' : 'bg-[#DC2626]/10'}`}>
          <View className="flex-row items-center gap-2">
            <Ionicons 
              name={isAllSufficient ? 'checkmark-circle' : 'alert-circle'} 
              size={16} 
              color={isAllSufficient ? '#16A34A' : '#DC2626'} 
            />
            <Text className={`text-[13px] font-medium ${isAllSufficient ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {isAllSufficient ? 'All items available' : 'Insufficient stock'}
            </Text>
          </View>
        </View>
      )}
      
      {/* Bottom: Divider + Footer */}
      <View className="border-t border-[#E2E8F0] pt-2 flex-row justify-between items-center">
        <Text className="text-[13px] text-[#64748B]">
          {formatDate(request.createdAt)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
};
```

### Component 4: RequestItemCard

**File**: `src/components/Requests/RequestItemCard.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RequestItem } from '../../types/request';

interface RequestItemCardProps {
  item: RequestItem;
  mode: 'create' | 'view' | 'edit';
  onQuantityChange?: (itemId: string, quantity: number) => void;
  onRemove?: (itemId: string) => void;
  availability?: {
    available: number;
    sufficient: boolean;
  };
}

export const RequestItemCard: React.FC<RequestItemCardProps> = ({
  item,
  mode,
  onQuantityChange,
  onRemove,
  availability,
}) => {
  const [quantity, setQuantity] = useState(item.quantityRequested);
  
  const handleIncrement = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    onQuantityChange?.(item.itemId, newQty);
  };
  
  const handleDecrement = () => {
    if (quantity > 1) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      onQuantityChange?.(item.itemId, newQty);
    }
  };
  
  const handleQuantityInput = (text: string) => {
    const num = parseInt(text) || 0;
    if (num >= 0) {
      setQuantity(num);
      onQuantityChange?.(item.itemId, num);
    }
  };
  
  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      <View className="flex-row gap-3">
        {/* Image */}
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            className="w-16 h-16 rounded-lg bg-[#F1F5F9]" 
            resizeMode="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-lg bg-[#F1F5F9] items-center justify-center">
            <Ionicons name="cube-outline" size={32} color="#64748B" />
          </View>
        )}
        
        {/* Content */}
        <View className="flex-1">
          {/* Item Name */}
          <Text className="text-[15px] font-semibold text-[#0F172A] mb-1">
            {item.itemName}
          </Text>
          
          {/* SKU & Type */}
          <View className="flex-row items-center gap-2 mb-2">
            <Text className="text-[13px] text-[#64748B]">{item.itemSku}</Text>
            <View className="w-1 h-1 rounded-full bg-[#64748B]" />
            <Text className="text-[13px] text-[#64748B]">
              {item.itemType === 'consumable' ? 'Consumable' : 'Non-Consumable'}
            </Text>
          </View>
          
          {/* Quantity Control */}
          {mode === 'create' || mode === 'edit' ? (
            <View className="flex-row items-center gap-3">
              <Text className="text-[13px] text-[#64748B]">Quantity:</Text>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={handleDecrement}
                  className="w-8 h-8 border border-[#E2E8F0] rounded-full items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                >
                  <Text className="text-[#1E40AF] text-lg">−</Text>
                </TouchableOpacity>
                
                <TextInput
                  value={String(quantity)}
                  onChangeText={handleQuantityInput}
                  keyboardType="numeric"
                  className="w-16 h-10 border border-[#E2E8F0] rounded-lg px-2 text-center text-[15px] font-bold text-[#0F172A]"
                  accessibilityLabel="Quantity input"
                />
                
                <TouchableOpacity
                  onPress={handleIncrement}
                  className="w-8 h-8 border border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                >
                  <Text className="text-white text-lg">+</Text>
                </TouchableOpacity>
              </View>
              
              {onRemove && (
                <TouchableOpacity
                  onPress={() => onRemove(item.itemId)}
                  className="ml-auto w-9 h-9 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Remove item"
                >
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text className="text-[15px] text-[#0F172A]">
              Quantity: <Text className="font-semibold">{item.quantityRequested}</Text>
            </Text>
          )}
          
          {/* Availability Indicator (for Store Incharge) */}
          {availability && (
            <View className={`mt-2 p-2 rounded-lg ${availability.sufficient ? 'bg-[#16A34A]/10' : 'bg-[#DC2626]/10'}`}>
              <View className="flex-row items-center gap-2">
                <Ionicons 
                  name={availability.sufficient ? 'checkmark-circle' : 'alert-circle'} 
                  size={16} 
                  color={availability.sufficient ? '#16A34A' : '#DC2626'} 
                />
                <Text className={`text-[13px] font-medium ${availability.sufficient ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {availability.sufficient ? 'Sufficient' : 'Insufficient'}
                </Text>
                <Text className="text-[13px] text-[#64748B] ml-auto">
                  Available: {availability.available}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
```

### Component 5: ItemSelectorModal

**File**: `src/components/Requests/ItemSelectorModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import type { Item } from '../../types/inventory';

interface ItemSelectorModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (items: Item[]) => void;
  excludeItemIds?: string[];
}

export const ItemSelectorModal: React.FC<ItemSelectorModalProps> = ({
  isVisible,
  onClose,
  onSelect,
  excludeItemIds = [],
}) => {
  const allItems = useSelector(selectAllItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Filter items
  const filteredItems = allItems.filter((item) => {
    if (excludeItemIds.includes(item.id)) return false;
    if (item.status !== 'active') return false;
    
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });
  
  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };
  
  const handleConfirm = () => {
    const selected = allItems.filter((item) => selectedItems.has(item.id));
    onSelect(selected);
    setSelectedItems(new Set());
    setSearchQuery('');
    onClose();
  };
  
  const handleCancel = () => {
    setSelectedItems(new Set());
    setSearchQuery('');
    onClose();
  };
  
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl h-[80%]">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mt-2 mb-4" />
          
          {/* Header */}
          <View className="px-4 pb-3 border-b border-[#E2E8F0]">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[22px] font-semibold text-[#0F172A]">
                Select Items
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                className="w-9 h-9 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {/* Search */}
            <View className="relative">
              <View className="absolute left-3 top-0 h-12 items-center justify-center z-10">
                <Ionicons name="search" size={20} color="#64748B" />
              </View>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search items..."
                placeholderTextColor="#94A3B8"
                className="border border-[#E2E8F0] rounded-lg h-12 pl-10 pr-4 bg-white"
              />
            </View>
          </View>
          
          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedItems.has(item.id);
              
              return (
                <TouchableOpacity
                  onPress={() => toggleItem(item.id)}
                  className="px-4 py-3 border-b border-[#E2E8F0]"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    {/* Checkbox */}
                    <View
                      className={`w-6 h-6 rounded border-2 items-center justify-center ${
                        isSelected
                          ? 'bg-[#1E40AF] border-[#1E40AF]'
                          : 'bg-white border-[#E2E8F0]'
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    
                    {/* Image */}
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        className="w-12 h-12 rounded-lg"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-lg bg-[#F1F5F9] items-center justify-center">
                        <Ionicons name="cube-outline" size={24} color="#64748B" />
                      </View>
                    )}
                    
                    {/* Item Info */}
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-[#0F172A]">
                        {item.name}
                      </Text>
                      <Text className="text-[13px] text-[#64748B]">
                        {item.sku} • {item.categoryName}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="cube-outline" size={80} color="#64748B" />
                <Text className="text-[15px] text-[#64748B] mt-4">
                  No items found
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 100 }}
          />
          
          {/* Footer */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-3">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleConfirm}
                className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
                disabled={selectedItems.size === 0}
                style={{ opacity: selectedItems.size === 0 ? 0.5 : 1 }}
              >
                <Text className="text-[15px] font-semibold text-white">
                  Add {selectedItems.size > 0 && `(${selectedItems.size})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
```

### Component 6: AvailabilityIndicator

**File**: `src/components/Requests/AvailabilityIndicator.tsx`

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AvailabilityIndicatorProps {
  requested: number;
  available: number;
  sufficient: boolean;
}

export const AvailabilityIndicator: React.FC<AvailabilityIndicatorProps> = ({
  requested,
  available,
  sufficient,
}) => {
  return (
    <View
      className={`p-2 rounded-lg ${
        sufficient ? 'bg-[#16A34A]/10' : 'bg-[#DC2626]/10'
      }`}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons
          name={sufficient ? 'checkmark-circle' : 'alert-circle'}
          size={16}
          color={sufficient ? '#16A34A' : '#DC2626'}
        />
        <Text
          className={`text-[13px] font-medium ${
            sufficient ? 'text-[#16A34A]' : 'text-[#DC2626]'
          }`}
        >
          {sufficient ? 'Sufficient' : 'Insufficient'}
        </Text>
      </View>
      <Text className="text-[13px] text-[#64748B] mt-1">
        Requested: {requested} • Available: {available}
      </Text>
    </View>
  );
};
```

### Component 7: EditHistoryList

**File**: `src/components/Requests/EditHistoryList.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EditHistoryEntry } from '../../types/request';

interface EditHistoryListProps {
  history: EditHistoryEntry[];
}

export const EditHistoryList: React.FC<EditHistoryListProps> = ({ history }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (history.length === 0) {
    return null;
  }
  
  const formatDate = (timestamp: any) => {
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  return (
    <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row justify-between items-center"
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="time-outline" size={20} color="#64748B" />
          <Text className="text-[15px] font-semibold text-[#0F172A]">
            Edit History ({history.length})
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#64748B"
        />
      </TouchableOpacity>
      
      {/* History Entries */}
      {isExpanded && (
        <View className="mt-4 gap-3">
          {history.map((entry, index) => (
            <View
              key={index}
              className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]"
            >
              {/* Editor & Date */}
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-[13px] font-medium text-[#0F172A]">
                  {entry.editedByName}
                </Text>
                <Text className="text-[13px] text-[#64748B]">
                  {formatDate(entry.editedAt)}
                </Text>
              </View>
              
              {/* Reason */}
              <Text className="text-[13px] text-[#64748B] mb-2">
                <Text className="font-medium">Reason:</Text> {entry.reason}
              </Text>
              
              {/* Changes */}
              {entry.changes.length > 0 && (
                <View className="gap-1">
                  <Text className="text-[13px] font-medium text-[#0F172A] mb-1">
                    Changes:
                  </Text>
                  {entry.changes.map((change, changeIndex) => (
                    <View key={changeIndex} className="flex-row gap-2">
                      <Text className="text-[13px] text-[#64748B]">•</Text>
                      <Text className="text-[13px] text-[#64748B] flex-1">
                        {change.field}: {JSON.stringify(change.oldValue)} →{' '}
                        {JSON.stringify(change.newValue)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
```

---

## Screen Components

Due to length constraints, I'll provide the key screens. The pattern is consistent across all screens following React Native standards and the CIAMS design system.

### Screen 1: CreateRequestScreen (Example)

**File**: `src/screens/Requests/CreateRequestScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormField } from '../../components/FormField';
import { PrioritySelector } from '../../components/Requests/PrioritySelector';
import { RequestItemCard } from '../../components/Requests/RequestItemCard';
import { ItemSelectorModal } from '../../components/Requests/ItemSelectorModal';
import { createRequest } from '../../store/thunks/requestThunks';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import { selectSiteById } from '../../store/selectors/sitesSelectors';
import type { RequestPriority, CreateRequestData } from '../../types/request';
import type { Item } from '../../types/inventory';

interface CreateRequestScreenProps {
  route: {
    params: {
      siteId: string;
    };
  };
}

interface FormErrors {
  priority?: string;
  items?: string;
  purpose?: string;
}

export const CreateRequestScreen: React.FC<CreateRequestScreenProps> = ({ route }) => {
  const { siteId } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const userId = useSelector(selectUserId);
  const userName = useSelector(selectUserDisplayName);
  const site = useSelector(selectSiteById(siteId));
  
  // Form state
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [items, setItems] = useState<Array<Item & { quantity: number }>>([]);
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemSelectorVisible, setItemSelectorVisible] = useState(false);
  
  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!priority) {
      newErrors.priority = 'Priority is required';
    }
    
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    if (!purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle item selection from modal
  const handleItemsSelected = (selectedItems: Item[]) => {
    const newItems = selectedItems.map(item => ({
      ...item,
      quantity: 1,
    }));
    setItems([...items, ...newItems]);
    setErrors({ ...errors, items: undefined });
  };
  
  // Handle quantity change
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };
  
  // Handle item removal
  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };
  
  // Submit request
  const handleSubmit = async (isDraft: boolean = false) => {
    if (!validateForm() && !isDraft) {
      return;
    }
    
    if (!site || !userId || !userName) {
      Alert.alert('Error', 'Missing required user or site information');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const requestData: CreateRequestData = {
        siteId: site.id,
        siteName: site.name,
        priority,
        purpose,
        items: items.map(item => ({
          itemId: item.id,
          itemName: item.name,
          itemSku: item.sku,
          itemType: item.type,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
        })),
      };
      
      await dispatch(createRequest({
        requestData,
        userId,
        userName,
        isDraft,
      })).unwrap();
      
      Alert.alert(
        'Success',
        isDraft ? 'Request saved as draft' : 'Request submitted successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="New Request"
        rightAction={{
          label: 'Submit',
          onPress: () => handleSubmit(false),
          loading: isSubmitting,
        }}
      />
      
      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          {/* Site Info */}
          <View className="bg-[#F8FAFC] rounded-lg p-4">
            <Text className="text-[13px] text-[#64748B] mb-1">Request for:</Text>
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              {site?.name}
            </Text>
          </View>
          
          {/* Priority Selector */}
          <PrioritySelector
            value={priority}
            onChange={(value) => {
              setPriority(value);
              setErrors({ ...errors, priority: undefined });
            }}
            error={errors.priority}
          />
          
          {/* Items Section */}
          <View className="gap-1.5">
            <View className="flex-row justify-between items-center">
              <Text className="text-[15px] text-[#0F172A]">
                Items <Text className="text-[#DC2626]">*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setItemSelectorVisible(true)}
                className="flex-row items-center gap-1"
                accessibilityRole="button"
                accessibilityLabel="Add items"
              >
                <Ionicons name="add-circle" size={20} color="#1E40AF" />
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Add Items
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Items List */}
            {items.length > 0 ? (
              <View className="gap-3 mt-2">
                {items.map((item) => (
                  <RequestItemCard
                    key={item.id}
                    item={{
                      itemId: item.id,
                      itemName: item.name,
                      itemSku: item.sku,
                      itemType: item.type,
                      categoryId: item.categoryId,
                      categoryName: item.categoryName,
                      imageUrl: item.imageUrl,
                      quantityRequested: item.quantity,
                      quantityApproved: item.quantity,
                      quantityReturned: 0,
                      status: 'pending',
                    }}
                    mode="create"
                    onQuantityChange={handleQuantityChange}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </View>
            ) : (
              <View className="bg-[#F8FAFC] rounded-lg p-6 items-center justify-center border border-dashed border-[#E2E8F0] mt-2">
                <Ionicons name="cube-outline" size={48} color="#64748B" />
                <Text className="text-[15px] text-[#64748B] mt-2">
                  No items added yet
                </Text>
                <Text className="text-[13px] text-[#64748B] text-center mt-1">
                  Tap "Add Items" to select items
                </Text>
              </View>
            )}
            
            {errors.items && (
              <Text className="text-[13px] text-[#DC2626]" accessibilityLiveRegion="polite">
                {errors.items}
              </Text>
            )}
          </View>
          
          {/* Purpose */}
          <FormField
            label="Purpose / Notes"
            required
            value={purpose}
            onChangeText={(text) => {
              setPurpose(text);
              setErrors({ ...errors, purpose: undefined });
            }}
            placeholder="Describe the purpose of this request..."
            error={errors.purpose}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
      
      {/* Bottom Actions */}
      <View className="bg-white border-t border-[#E2E8F0] px-4 py-3">
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Save as draft"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#1E40AF" />
            ) : (
              <Text className="text-[15px] font-semibold text-[#1E40AF]">
                Save Draft
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Submit request"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">
                Submit Request
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Item Selector Modal */}
      <ItemSelectorModal
        isVisible={itemSelectorVisible}
        onClose={() => setItemSelectorVisible(false)}
        onSelect={handleItemsSelected}
        excludeItemIds={items.map(item => item.id)}
      />
    </ScreenLayout>
  );
};
```

*Note: Other screens (RequestQueueScreen, ProcessRequestScreen, EditRequestScreen, etc.) follow the same pattern with:*
- `ScreenLayout` + `ScreenHeader`
- Form validation with `FormErrors` interface
- Reusable components from `src/components/Requests/`
- CIAMS design system styling
- Proper TypeScript typing
- Accessibility labels
- Loading states
- Error handling

---

## Navigation Integration

### Phase 4: Add Requests Tab

**File**: `src/navigation/RequestStackNavigator.tsx`

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { selectIsAdmin, selectIsStoreIncharge } from '../store/selectors/authSelectors';

// Screens
import { RequestQueueScreen } from '../screens/Requests/RequestQueueScreen';
import { MyRequestsScreen } from '../screens/Requests/MyRequestsScreen';
import { CreateRequestScreen } from '../screens/Requests/CreateRequestScreen';
import { ProcessRequestScreen } from '../screens/Requests/ProcessRequestScreen';
import { EditRequestScreen } from '../screens/Requests/EditRequestScreen';
import { RejectRequestScreen } from '../screens/Requests/RejectRequestScreen';
import { ConfirmTransferScreen } from '../screens/Requests/ConfirmTransferScreen';
import { ReturnItemsScreen } from '../screens/Requests/ReturnItemsScreen';

export type RequestStackParamList = {
  RequestQueue: undefined;
  MyRequests: undefined;
  CreateRequest: { siteId: string };
  ProcessRequest: { requestId: string };
  EditRequest: { requestId: string };
  RejectRequest: { requestId: string };
  ConfirmTransfer: { requestId: string };
  ReturnItems: { siteId: string };
};

const Stack = createStackNavigator<RequestStackParamList>();

export const RequestStackNavigator = () => {
  const isAdmin = useSelector(selectIsAdmin);
  const isStoreIncharge = useSelector(selectIsStoreIncharge);
  
  // Store Incharge and Admin see RequestQueue first
  // Site Manager sees MyRequests first
  const initialRouteName = isAdmin || isStoreIncharge ? 'RequestQueue' : 'MyRequests';
  
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        presentation: 'card',
      }}
    >
      <Stack.Screen name="RequestQueue" component={RequestQueueScreen} />
      <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
      <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
      <Stack.Screen name="ProcessRequest" component={ProcessRequestScreen} />
      <Stack.Screen name="EditRequest" component={EditRequestScreen} />
      <Stack.Screen name="RejectRequest" component={RejectRequestScreen} />
      <Stack.Screen name="ConfirmTransfer" component={ConfirmTransferScreen} />
      <Stack.Screen name="ReturnItems" component={ReturnItemsScreen} />
    </Stack.Navigator>
  );
};
```

**File**: `src/navigation/BottomTabNavigator.tsx` (update)

```typescript
// Add import
import { RequestStackNavigator } from './RequestStackNavigator';
import { selectHighPriorityPendingCount } from '../store/selectors/requestSelectors';

// Inside component
const highPriorityCount = useSelector(selectHighPriorityPendingCount);
const showRequestsTab = isAdmin || isStoreIncharge || isSiteManager;

// Add tab
{showRequestsTab && (
  <Tab.Screen
    name="Requests"
    component={RequestStackNavigator}
    options={{
      tabBarLabel: 'Requests',
      tabBarIcon: ({ color, size }) => (
        <Ionicons name="file-tray-full-outline" size={size} color={color} />
      ),
      tabBarBadge: highPriorityCount > 0 ? highPriorityCount : undefined,
    }}
  />
)}
```

---

## Implementation Order

### Recommended Sequential Order

**Phase 1: Foundation (Week 1)**
1. Create TypeScript interfaces (`src/types/request.ts`)
2. Add Firestore security rules
3. Create `requestService.ts` with all methods
4. Test service methods with Firestore emulator

**Phase 2: State Management (Week 1)**
5. Create `requestsSlice.ts`
6. Create `requestThunks.ts`
7. Create `requestSelectors.ts`
8. Update store configuration
9. Test Redux flow

**Phase 3: Reusable Components (Week 2)**
10. `RequestStatusBadge`
11. `PrioritySelector`
12. `RequestCard`
13. `RequestItemCard`
14. `ItemSelectorModal`
15. `AvailabilityIndicator`
16. `EditHistoryList`

**Phase 4: Screen Components (Week 2-3)**
17. `CreateRequestScreen`
18. `MyRequestsScreen`
19. `RequestQueueScreen`
20. `ProcessRequestScreen`
21. `EditRequestScreen`
22. `RejectRequestScreen`
23. `ConfirmTransferScreen`
24. `ReturnItemsScreen`

**Phase 5: Navigation (Week 3)**
25. Create `RequestStackNavigator`
26. Integrate into `BottomTabNavigator`
27. Add tab badge for pending requests

**Phase 6: Real-time Subscriptions (Week 3)**
28. Add `useEffect` subscriptions in queue/list screens
29. Test real-time updates

**Phase 7: Polish & Testing (Week 4)**
30. Error handling and user feedback
31. Loading states and optimistic updates
32. Form validation refinement
33. Accessibility testing
34. Edge case testing

---

## Testing Strategy

### Unit Tests (Jest + React Native Testing Library)

**Test files to create:**
- `requestService.test.ts` - Service methods
- `requestsSlice.test.ts` - Redux slice
- `requestSelectors.test.ts` - Selectors
- `PrioritySelector.test.tsx` - Component
- `RequestCard.test.tsx` - Component

### Integration Tests
- Request creation flow
- Approval workflow
- Transfer transaction
- Return workflow

### Manual Testing Checklist
- [ ] Site Manager can create requests
- [ ] Store Incharge sees all requests sorted by priority
- [ ] Approve button disabled when items insufficient
- [ ] Store Incharge can edit any request
- [ ] Edit history logged correctly
- [ ] Rejection requires reason and comments
- [ ] Transfer updates inventory atomically
- [ ] Returns route to correct location based on condition
- [ ] Real-time updates work
- [ ] Role-based access enforced

---

## Summary

### Files to Create (41 new files)

**Types:**
- `src/types/request.ts`

**Services:**
- `src/services/firebase/requestService.ts`

**Redux:**
- `src/store/slices/requestsSlice.ts`
- `src/store/thunks/requestThunks.ts`
- `src/store/selectors/requestSelectors.ts`

**Components (7):**
- `src/components/Requests/RequestStatusBadge.tsx`
- `src/components/Requests/PrioritySelector.tsx`
- `src/components/Requests/RequestCard.tsx`
- `src/components/Requests/RequestItemCard.tsx`
- `src/components/Requests/ItemSelectorModal.tsx`
- `src/components/Requests/AvailabilityIndicator.tsx`
- `src/components/Requests/EditHistoryList.tsx`

**Screens (8):**
- `src/screens/Requests/RequestQueueScreen.tsx`
- `src/screens/Requests/MyRequestsScreen.tsx`
- `src/screens/Requests/CreateRequestScreen.tsx`
- `src/screens/Requests/ProcessRequestScreen.tsx`
- `src/screens/Requests/EditRequestScreen.tsx`
- `src/screens/Requests/RejectRequestScreen.tsx`
- `src/screens/Requests/ConfirmTransferScreen.tsx`
- `src/screens/Requests/ReturnItemsScreen.tsx`

**Navigation:**
- `src/navigation/RequestStackNavigator.tsx`

**Tests (optional, 20+ files):**
- Service tests
- Slice tests
- Selector tests
- Component tests
- Screen tests

### Files to Modify (3 files)

**Redux:**
- `src/store/index.ts` - Add `requests` reducer

**Firestore:**
- `firestore.rules` - Add `requests` collection rules

**Navigation:**
- `src/navigation/BottomTabNavigator.tsx` - Add Requests tab

---

## Conclusion

This implementation plan provides a complete, production-ready Request Management module following:

✅ **CIAMS Design System**: All components use the industrial-grade color palette, typography, spacing, and touch targets

✅ **Thinking in React Native**: Component hierarchy designed bottom-up, static versions first, minimal state, proper data flow

✅ **React Native Standards**: Functional components, TypeScript interfaces, proper naming, hooks optimization, folder structure

✅ **Business Requirements**: No partial fulfillment, full edit rights, priority-based queue, atomic transfers, condition-based returns

The module is designed for scalability, maintainability, and excellent user experience on construction sites.
