---
name: Maintenance Management Implementation
overview: Comprehensive implementation plan for the Maintenance Management module allowing Admin and Store Incharge to track damaged items through repair lifecycle, return repaired items to inventory, or write off unrepairable items permanently.
todos:
  - id: phase1-types-interfaces
    content: "Phase 1.1: Create TypeScript interfaces and types"
    status: pending
  - id: phase1-firebase-service
    content: "Phase 1.2: Implement Firebase maintenance service with CRUD operations"
    status: pending
  - id: phase1-redux-slice
    content: "Phase 1.3: Create Redux slice for maintenance state"
    status: pending
  - id: phase1-redux-thunks
    content: "Phase 1.4: Create async thunks for maintenance operations"
    status: pending
  - id: phase1-redux-selectors
    content: "Phase 1.5: Create memoized selectors for maintenance data"
    status: pending
  - id: phase1-register-store
    content: "Phase 1.6: Register maintenance slice in Redux store"
    status: pending
  - id: phase2-status-badge
    content: "Phase 2.1: Create MaintenanceStatusBadge component"
    status: pending
  - id: phase2-issue-selector
    content: "Phase 2.2: Create IssueTypeSelector component"
    status: pending
  - id: phase2-writeoff-selector
    content: "Phase 2.3: Create WriteOffReasonSelector component"
    status: pending
  - id: phase2-item-selector
    content: "Phase 2.4: Create ItemSelectorForMaintenance component"
    status: pending
  - id: phase2-maintenance-card
    content: "Phase 2.5: Create MaintenanceCard component"
    status: pending
  - id: phase3-dashboard-screen
    content: "Phase 3.1: Create MaintenanceDashboardScreen with real-time subscription"
    status: pending
  - id: phase3-add-screen
    content: "Phase 3.2: Create AddToMaintenanceScreen with form validation"
    status: pending
  - id: phase3-detail-screen
    content: "Phase 3.3: Create MaintenanceDetailScreen"
    status: pending
  - id: phase3-return-screen
    content: "Phase 3.4: Create ReturnFromMaintenanceScreen"
    status: pending
  - id: phase3-writeoff-screen
    content: "Phase 3.5: Create WriteOffScreen with confirmation"
    status: pending
  - id: phase4-navigation-stack
    content: "Phase 4.1: Create MaintenanceStackNavigator"
    status: pending
  - id: phase4-add-tab
    content: "Phase 4.2: Add Maintenance tab to BottomTabNavigator"
    status: pending
  - id: phase4-navigation-types
    content: "Phase 4.3: Update navigation type definitions"
    status: pending
  - id: phase4-exports
    content: "Phase 4.4: Update component and screen exports"
    status: pending
  - id: phase5-return-integration
    content: "Phase 5.1: Add quick-move-to-maintenance button in ReturnItemsScreen"
    status: pending
  - id: phase5-request-detail
    content: "Phase 5.2: Add damaged item indicator in ProcessRequestScreen"
    status: pending
  - id: phase5-item-cards
    content: "Phase 5.3: Add maintenance quantity display to ItemCard"
    status: pending
  - id: phase6-testing
    content: "Phase 6: Testing (unit, component, integration)"
    status: pending
  - id: phase7-documentation
    content: "Phase 7: Documentation and code review"
    status: pending
isProject: true
---

# 🔧 Maintenance Management Feature - Implementation Plan

## Feature Overview

The Maintenance Management module allows **Admin** and **Store Incharge** to track damaged items, send them for repair, return repaired items to inventory, or write off items permanently. This system ensures damaged items are removed from available inventory, tracked through their repair lifecycle, and properly returned or permanently removed from the system.

---

## 📋 Requirement Analysis

### Core Capabilities

1. **Add to Maintenance** - Move damaged items from available inventory to maintenance tracking
2. **Quick-Move from Returns** - Directly move damaged returned items to maintenance with one click
3. **Track Maintenance Status** - Monitor items through repair lifecycle (pending → under_repair → ready → returned)
4. **Return from Maintenance** - Return repaired items back to central store inventory
5. **Write Off Items** - Permanently remove unrepairable items from inventory
6. **Maintenance History** - View all maintenance activities with complete audit trail

### User Roles & Access

- **Admin & Store Incharge**: Full access to all maintenance operations
- **Site Manager**: Cannot access maintenance module directly; returns items to central store (damaged or not)

### Business Rules

- Only non-consumable items can go to maintenance
- Items in maintenance are removed from available inventory
- **Site Manager always returns items to central store first** (even if damaged)
- Admin/Store Incharge can then move damaged items to maintenance voluntarily
- **Quick-move button** on damaged returned items for easy maintenance routing
- Partial returns supported (e.g., 2 sent, 1 returned, 1 still under repair)
- Write-offs are permanent and cannot be undone
- All actions are fully logged with timestamps and user details

### Updated Workflow

```
Site Manager Returns Item (Damaged/Not)
              ↓
    Always Goes to Central Store
              ↓
    Store Incharge/Admin Reviews
              ↓
    Sees "Damaged" Flag on Return
              ↓
    [Quick Move to Maintenance] Button
              ↓
        Move to Maintenance
              ↓
        Decide Action
         ↙          ↘
    Repair          Write Off
       ↓
  Return to Store
```

---

## ✅ Existing Resources to Use

### Redux Store

- `**src/store/slices/authSlice.ts**` - Use `selectIsAdmin` and `selectIsStoreIncharge` for access control
- `**src/store/slices/inventorySlice.ts**` - Use for item data (`selectItems`, `updateItemInState`)
- `**src/store/slices/requestsSlice.ts**` - Use for request data (to identify damaged returns)
- `**src/store/index.ts**` - Add new `maintenance` slice here

### Firebase Services

- `**src/services/firebase/inventoryService.ts**` - Use `adjustQuantity()` for atomic inventory updates
- `**src/services/firebase/requestService.ts**` - Reference for transaction patterns
- `**src/services/firebase/storageService.ts**` - Use `uploadItemImage()` for maintenance photos

### UI Components

- `**src/components/ScreenHeader.tsx**` - Reusable header with title and actions
- `**src/components/layout/ScreenLayout.tsx**` - Screen wrapper with SafeAreaView
- `**src/components/FormField.tsx**` - Form input with validation and error display
- `**src/components/Inventory/ItemCard.tsx**` - Reference for card design patterns
- `**src/components/Requests/RequestStatusBadge.tsx**` - Reference for status badge patterns
- `**src/components/Requests/RequestCard.tsx**` - Card layout patterns
- `**src/components/Requests/RequestItemCard.tsx**` - Item display patterns

### Existing Screens to Modify

- `**src/screens/Requests/ReturnItemsScreen.tsx**` - Add quick-move-to-maintenance button
- `**src/screens/Requests/ProcessRequestScreen.tsx**` - Show damaged item indicator
- `**src/components/Inventory/ItemCard.tsx**` - Display maintenance quantity

### Navigation

- `**src/navigation/BottomTabNavigator.tsx**` - Add new "Maintenance" tab for Admin/StoreIncharge
- `**src/navigation/RootNavigator.tsx**` - Existing auth-gated navigation pattern
- `**src/types/navigation.ts**` - Add `MaintenanceStackParamList` type definitions

### Design System

- `**.cursor/skills/ciams-design-system/SKILL.md**` - Complete design system guidelines
- **Status Colors**: Green (#16A34A), Amber (#D97706), Red (#DC2626), Slate (#475569)
- **Form Patterns**: Standard spacing (gap-4), button heights (h-[50px])
- **Card Patterns**: White background, rounded-[10px], p-4, border-[#E2E8F0]

---

## 🆕 New Files to Create

### Phase 1: Backend & State Management

1. `**src/types/maintenance.ts**` - TypeScript interfaces for maintenance data
2. `**src/services/firebase/maintenanceService.ts**` - Firebase CRUD operations
3. `**src/store/slices/maintenanceSlice.ts**` - Redux slice for maintenance state
4. `**src/store/thunks/maintenanceThunks.ts**` - Async thunks for maintenance operations
5. `**src/store/selectors/maintenanceSelectors.ts**` - Memoized selectors for maintenance data

### Phase 2: Components

1. `**src/components/Maintenance/MaintenanceCard.tsx**` - Maintenance item card display
2. `**src/components/Maintenance/MaintenanceStatusBadge.tsx**` - Status badge component
3. `**src/components/Maintenance/IssueTypeSelector.tsx**` - Modal selector for issue types
4. `**src/components/Maintenance/WriteOffReasonSelector.tsx**` - Modal selector for write-off reasons
5. `**src/components/Maintenance/ItemSelectorForMaintenance.tsx**` - Select non-consumable items
6. `**src/components/Maintenance/QuickMoveToMaintenanceButton.tsx**` - Quick action button for damaged returns

### Phase 3: Screens

1. `**src/screens/Maintenance/MaintenanceDashboardScreen.tsx**` - List of maintenance items
2. `**src/screens/Maintenance/AddToMaintenanceScreen.tsx**` - Add item to maintenance
3. `**src/screens/Maintenance/ReturnFromMaintenanceScreen.tsx**` - Return repaired items
4. `**src/screens/Maintenance/WriteOffScreen.tsx**` - Write off unrepairable items
5. `**src/screens/Maintenance/MaintenanceDetailScreen.tsx**` - View maintenance record details

### Phase 4: Navigation

1. `**src/navigation/MaintenanceStackNavigator.tsx**` - Stack navigator for maintenance flow

---

## 🔧 Files to Modify

### Redux Integration

- `**src/store/index.ts**` - Register `maintenance` slice in store

### Navigation Integration

- `**src/navigation/BottomTabNavigator.tsx**` - Add "Maintenance" tab (Admin/StoreIncharge only)
- `**src/types/navigation.ts**` - Add `MaintenanceStackParamList` type

### Request Integration (Critical for New Workflow)

- `**src/screens/Requests/ReturnItemsScreen.tsx**` - Add quick-move-to-maintenance functionality
- `**src/screens/Requests/ProcessRequestScreen.tsx**` - Display damaged item indicator
- `**src/types/request.ts**` - Add `isDamaged` flag to `RequestItem` interface (if not exists)

### Inventory Display

- `**src/components/Inventory/ItemCard.tsx**` - Display maintenance quantity in stock grid

### Component Exports

- `**src/components/index.ts**` - Export new maintenance components
- `**src/screens/index.ts**` - Export new maintenance screens

---

## 📝 Step-by-Step Implementation Plan

### **Phase 1: Data & Backend Setup** (Foundation)

#### Step 1.1: Define TypeScript Interfaces

**File:** `src/types/maintenance.ts`

**Create comprehensive type definitions:**

```typescript
import { Timestamp } from 'firebase/firestore';

// Maintenance status lifecycle
export type MaintenanceStatus = 
  | 'pending'        // Just added, needs assessment
  | 'under_repair'   // Sent to service center
  | 'ready'          // Repaired, ready to return
  | 'returned'       // Returned to inventory
  | 'written_off';   // Permanently removed

// Issue type categories
export type IssueType = 
  | 'motor_electrical' 
  | 'physical_damage' 
  | 'wear_and_tear' 
  | 'missing_parts' 
  | 'other';

// Write-off reason categories
export type WriteOffReason = 
  | 'beyond_repair' 
  | 'high_repair_cost' 
  | 'obsolete' 
  | 'lost_stolen' 
  | 'other';

// Photo metadata
export interface MaintenancePhoto {
  url: string;
  fileName: string;
  uploadedAt: Date | string;
}

// Status update notes
export interface MaintenanceUpdate {
  note: string;
  addedBy: string;
  addedByName: string;
  addedAt: Date | string;
}

// Firestore document structure (uses Timestamp)
export interface MaintenanceFirestore {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  
  // Issue details
  issueType: IssueType;
  issueDescription: string;
  reportedBy: string;
  reportedByName: string;
  photos: MaintenancePhoto[];
  
  // Status tracking
  status: MaintenanceStatus;
  updates: MaintenanceUpdate[];
  
  // Return fields (populated when returned)
  returnedAt: Timestamp | null;
  returnedQuantity: number | null;
  repairSummary: string | null;
  repairCost: number | null;
  repairedBy: string | null;
  
  // Write-off fields (populated when written off)
  writtenOffAt: Timestamp | null;
  writeOffReason: WriteOffReason | null;
  writeOffExplanation: string | null;
  
  // Metadata
  addedBy: string;
  addedByName: string;
  addedAt: Timestamp;
  updatedAt: Timestamp;
  
  // Source tracking (NEW: track if came from return)
  sourceRequestId?: string | null;
  sourceReturnDate?: Timestamp | null;
}

// Redux state structure (dates as ISO strings for serialization)
export interface Maintenance extends Omit<MaintenanceFirestore, 'addedAt' | 'updatedAt' | 'returnedAt' | 'writtenOffAt' | 'sourceReturnDate'> {
  addedAt: string;
  updatedAt: string;
  returnedAt: string | null;
  writtenOffAt: string | null;
  sourceReturnDate: string | null;
}

// Form data for adding to maintenance
export interface AddToMaintenanceData {
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  issueType: IssueType;
  issueDescription: string;
  reportedBy?: string;
  reportedByName?: string;
  photos?: MaintenancePhoto[];
  sourceRequestId?: string; // NEW: Link to source request
  sourceReturnDate?: Date;  // NEW: When item was returned
}

// Form data for returning from maintenance
export interface ReturnFromMaintenanceData {
  returnQuantity: number;
  repairSummary: string;
  repairCost?: number;
  repairedBy?: string;
}

// Form data for write-off
export interface WriteOffData {
  writeOffQuantity: number;
  reason: WriteOffReason;
  explanation: string;
}

// Issue type configuration for UI
export interface IssueTypeConfig {
  value: IssueType;
  label: string;
  description?: string;
}

// Write-off reason configuration for UI
export interface WriteOffReasonConfig {
  value: WriteOffReason;
  label: string;
  description?: string;
}
```

**Junior Developer Explanation:**

- **TypeScript Types**: These are like blueprints for our data. They tell TypeScript what shape our data should have, preventing bugs.
- **Union Types** (`|`): Like multiple choice - status can ONLY be one of these specific strings.
- **Interfaces**: Like a contract - any object claiming to be a `Maintenance` must have all these fields.
- **Omit<>**: Creates a new type by removing certain fields (we remove Timestamp fields and replace with strings for Redux).
- **Firestore vs Redux types**: Firestore uses `Timestamp` objects, Redux needs serializable data (strings), so we convert.

---

#### Step 1.2: Create Firebase Service

**File:** `src/services/firebase/maintenanceService.ts`

**Key Methods to Implement:**

```typescript
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  onSnapshot,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  MaintenanceFirestore,
  Maintenance,
  AddToMaintenanceData,
  ReturnFromMaintenanceData,
  WriteOffData,
  MaintenanceStatus,
} from '../../types/maintenance';

const MAINTENANCE_COLLECTION = 'maintenance';
const ITEMS_COLLECTION = 'items';
const INVENTORY_COLLECTION = 'inventory';

// Helper: Convert Firestore document to Redux-compatible format
function firestoreToMaintenance(doc: any): Maintenance {
  const data = doc.data() as MaintenanceFirestore;
  return {
    ...data,
    id: doc.id,
    addedAt: data.addedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    returnedAt: data.returnedAt?.toDate?.()?.toISOString() || null,
    writtenOffAt: data.writtenOffAt?.toDate?.()?.toISOString() || null,
    sourceReturnDate: data.sourceReturnDate?.toDate?.()?.toISOString() || null,
  };
}

/**
 * Add item to maintenance - Atomic transaction
 * 1. Validates item exists and has sufficient central store quantity
 * 2. Creates maintenance record
 * 3. Reduces central store inventory
 * 4. Increases item's inMaintenanceQuantity
 */
export async function addToMaintenance(
  data: AddToMaintenanceData,
  userId: string,
  userName: string
): Promise<string> {
  try {
    const maintenanceId = await runTransaction(db, async (transaction) => {
      // 1. Read item document
      const itemRef = doc(db, ITEMS_COLLECTION, data.itemId);
      const itemSnap = await transaction.get(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      
      // Validate non-consumable only
      if (itemData.type === 'consumable') {
        throw new Error('Only non-consumable items can be moved to maintenance');
      }
      
      // 2. Read central store inventory
      const inventoryQuery = query(
        collection(db, INVENTORY_COLLECTION),
        where('itemId', '==', data.itemId),
        where('locationId', '==', 'store')
      );
      const inventorySnap = await getDocs(inventoryQuery);
      
      if (inventorySnap.empty) {
        throw new Error('Item not found in central store inventory');
      }
      
      const inventoryDoc = inventorySnap.docs[0];
      const inventoryData = inventoryDoc.data();
      
      // Validate sufficient quantity
      if (inventoryData.quantity < data.quantity) {
        throw new Error(
          `Insufficient quantity. Available: ${inventoryData.quantity}, Requested: ${data.quantity}`
        );
      }
      
      // 3. Create maintenance record
      const maintenanceRef = doc(collection(db, MAINTENANCE_COLLECTION));
      const maintenanceData: Omit<MaintenanceFirestore, 'id'> = {
        itemId: data.itemId,
        itemName: data.itemName,
        itemSku: data.itemSku,
        quantity: data.quantity,
        issueType: data.issueType,
        issueDescription: data.issueDescription,
        reportedBy: data.reportedBy || '',
        reportedByName: data.reportedByName || '',
        photos: data.photos || [],
        status: 'pending',
        updates: [],
        returnedAt: null,
        returnedQuantity: null,
        repairSummary: null,
        repairCost: null,
        repairedBy: null,
        writtenOffAt: null,
        writeOffReason: null,
        writeOffExplanation: null,
        addedBy: userId,
        addedByName: userName,
        addedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        sourceRequestId: data.sourceRequestId || null,
        sourceReturnDate: data.sourceReturnDate ? Timestamp.fromDate(data.sourceReturnDate) : null,
      };
      
      transaction.set(maintenanceRef, maintenanceData);
      
      // 4. Update inventory (reduce central store quantity)
      transaction.update(doc(db, INVENTORY_COLLECTION, inventoryDoc.id), {
        quantity: inventoryData.quantity - data.quantity,
        updatedAt: Timestamp.now(),
      });
      
      // 5. Update item denormalized counts
      const currentInMaintenance = itemData.inMaintenanceQuantity || 0;
      transaction.update(itemRef, {
        inMaintenanceQuantity: currentInMaintenance + data.quantity,
        centralStoreQuantity: (itemData.centralStoreQuantity || 0) - data.quantity,
        updatedAt: Timestamp.now(),
      });
      
      return maintenanceRef.id;
    });
    
    console.log('✅ Added to maintenance:', maintenanceId);
    return maintenanceId;
  } catch (error: any) {
    console.error('❌ Error adding to maintenance:', error);
    throw new Error(error.message || 'Failed to add item to maintenance');
  }
}

/**
 * Return item from maintenance - Atomic transaction
 * Supports partial returns (can return less than total quantity)
 */
export async function returnFromMaintenance(
  maintenanceId: string,
  returnData: ReturnFromMaintenanceData,
  userId: string,
  userName: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Read maintenance record
      const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
      const maintenanceSnap = await transaction.get(maintenanceRef);
      
      if (!maintenanceSnap.exists()) {
        throw new Error('Maintenance record not found');
      }
      
      const maintenanceData = maintenanceSnap.data() as MaintenanceFirestore;
      
      // Validate quantity
      if (returnData.returnQuantity > maintenanceData.quantity) {
        throw new Error(
          `Return quantity (${returnData.returnQuantity}) exceeds maintenance quantity (${maintenanceData.quantity})`
        );
      }
      
      // 2. Read item document
      const itemRef = doc(db, ITEMS_COLLECTION, maintenanceData.itemId);
      const itemSnap = await transaction.get(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      
      // 3. Read central store inventory
      const inventoryQuery = query(
        collection(db, INVENTORY_COLLECTION),
        where('itemId', '==', maintenanceData.itemId),
        where('locationId', '==', 'store')
      );
      const inventorySnap = await getDocs(inventoryQuery);
      
      if (inventorySnap.empty) {
        throw new Error('Central store inventory not found');
      }
      
      const inventoryDoc = inventorySnap.docs[0];
      const inventoryData = inventoryDoc.data();
      
      // 4. Update inventory (add back to central store)
      transaction.update(doc(db, INVENTORY_COLLECTION, inventoryDoc.id), {
        quantity: inventoryData.quantity + returnData.returnQuantity,
        updatedAt: Timestamp.now(),
      });
      
      // 5. Update item denormalized counts
      const currentInMaintenance = itemData.inMaintenanceQuantity || 0;
      transaction.update(itemRef, {
        inMaintenanceQuantity: Math.max(0, currentInMaintenance - returnData.returnQuantity),
        centralStoreQuantity: (itemData.centralStoreQuantity || 0) + returnData.returnQuantity,
        updatedAt: Timestamp.now(),
      });
      
      // 6. Update maintenance record
      const remainingQuantity = maintenanceData.quantity - returnData.returnQuantity;
      const isFullReturn = remainingQuantity === 0;
      
      transaction.update(maintenanceRef, {
        quantity: remainingQuantity,
        status: isFullReturn ? 'returned' : maintenanceData.status, // Keep current status if partial
        returnedAt: Timestamp.now(),
        returnedQuantity: (maintenanceData.returnedQuantity || 0) + returnData.returnQuantity,
        repairSummary: returnData.repairSummary,
        repairCost: returnData.repairCost || null,
        repairedBy: returnData.repairedBy || null,
        updatedAt: Timestamp.now(),
        updates: [
          ...maintenanceData.updates,
          {
            note: `Returned ${returnData.returnQuantity} items to central store. ${returnData.repairSummary}`,
            addedBy: userId,
            addedByName: userName,
            addedAt: Timestamp.now(),
          },
        ],
      });
    });
    
    console.log('✅ Returned from maintenance:', maintenanceId);
  } catch (error: any) {
    console.error('❌ Error returning from maintenance:', error);
    throw new Error(error.message || 'Failed to return items from maintenance');
  }
}

/**
 * Write off item - Permanent removal from inventory
 */
export async function writeOffItem(
  maintenanceId: string,
  writeOffData: WriteOffData,
  userId: string,
  userName: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Read maintenance record
      const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
      const maintenanceSnap = await transaction.get(maintenanceRef);
      
      if (!maintenanceSnap.exists()) {
        throw new Error('Maintenance record not found');
      }
      
      const maintenanceData = maintenanceSnap.data() as MaintenanceFirestore;
      
      // Validate quantity
      if (writeOffData.writeOffQuantity > maintenanceData.quantity) {
        throw new Error(
          `Write-off quantity (${writeOffData.writeOffQuantity}) exceeds maintenance quantity (${maintenanceData.quantity})`
        );
      }
      
      // 2. Read item document
      const itemRef = doc(db, ITEMS_COLLECTION, maintenanceData.itemId);
      const itemSnap = await transaction.get(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      
      // 3. Update item (PERMANENT reduction in total quantity)
      const currentInMaintenance = itemData.inMaintenanceQuantity || 0;
      const currentTotal = itemData.totalQuantity || 0;
      
      transaction.update(itemRef, {
        totalQuantity: Math.max(0, currentTotal - writeOffData.writeOffQuantity),
        inMaintenanceQuantity: Math.max(0, currentInMaintenance - writeOffData.writeOffQuantity),
        updatedAt: Timestamp.now(),
      });
      
      // 4. Update maintenance record
      const remainingQuantity = maintenanceData.quantity - writeOffData.writeOffQuantity;
      const isFullWriteOff = remainingQuantity === 0;
      
      transaction.update(maintenanceRef, {
        quantity: remainingQuantity,
        status: isFullWriteOff ? 'written_off' : maintenanceData.status,
        writtenOffAt: Timestamp.now(),
        writeOffReason: writeOffData.reason,
        writeOffExplanation: writeOffData.explanation,
        updatedAt: Timestamp.now(),
        updates: [
          ...maintenanceData.updates,
          {
            note: `Written off ${writeOffData.writeOffQuantity} items. Reason: ${writeOffData.reason}. ${writeOffData.explanation}`,
            addedBy: userId,
            addedByName: userName,
            addedAt: Timestamp.now(),
          },
        ],
      });
    });
    
    console.log('✅ Written off item:', maintenanceId);
  } catch (error: any) {
    console.error('❌ Error writing off item:', error);
    throw new Error(error.message || 'Failed to write off item');
  }
}

/**
 * Update maintenance status
 */
export async function updateMaintenanceStatus(
  maintenanceId: string,
  status: MaintenanceStatus
): Promise<void> {
  try {
    const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
    await updateDoc(maintenanceRef, {
      status,
      updatedAt: Timestamp.now(),
    });
    console.log('✅ Updated maintenance status:', maintenanceId, status);
  } catch (error: any) {
    console.error('❌ Error updating maintenance status:', error);
    throw new Error(error.message || 'Failed to update maintenance status');
  }
}

/**
 * Add status update note
 */
export async function addMaintenanceUpdate(
  maintenanceId: string,
  note: string,
  userId: string,
  userName: string
): Promise<void> {
  try {
    const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, maintenanceId);
    const maintenanceSnap = await getDoc(maintenanceRef);
    
    if (!maintenanceSnap.exists()) {
      throw new Error('Maintenance record not found');
    }
    
    const maintenanceData = maintenanceSnap.data() as MaintenanceFirestore;
    
    await updateDoc(maintenanceRef, {
      updates: [
        ...maintenanceData.updates,
        {
          note,
          addedBy: userId,
          addedByName: userName,
          addedAt: Timestamp.now(),
        },
      ],
      updatedAt: Timestamp.now(),
    });
    
    console.log('✅ Added maintenance update:', maintenanceId);
  } catch (error: any) {
    console.error('❌ Error adding maintenance update:', error);
    throw new Error(error.message || 'Failed to add maintenance update');
  }
}

/**
 * List maintenance records with optional filters
 */
export async function listMaintenance(filters?: {
  status?: MaintenanceStatus | 'all';
  itemId?: string;
}): Promise<Maintenance[]> {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }
    
    if (filters?.itemId) {
      constraints.push(where('itemId', '==', filters.itemId));
    }
    
    constraints.push(orderBy('addedAt', 'desc'));
    
    const q = query(collection(db, MAINTENANCE_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(firestoreToMaintenance);
  } catch (error: any) {
    console.error('❌ Error listing maintenance:', error);
    return [];
  }
}

/**
 * Get single maintenance record
 */
export async function getMaintenanceById(id: string): Promise<Maintenance | null> {
  try {
    const maintenanceRef = doc(db, MAINTENANCE_COLLECTION, id);
    const maintenanceSnap = await getDoc(maintenanceRef);
    
    if (!maintenanceSnap.exists()) {
      return null;
    }
    
    return firestoreToMaintenance(maintenanceSnap);
  } catch (error: any) {
    console.error('❌ Error getting maintenance by ID:', error);
    return null;
  }
}

/**
 * Real-time subscription to maintenance records
 */
export function subscribeToMaintenance(
  callback: (maintenanceRecords: Maintenance[]) => void,
  filters?: {
    status?: MaintenanceStatus | 'all';
    itemId?: string;
  }
): () => void {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }
    
    if (filters?.itemId) {
      constraints.push(where('itemId', '==', filters.itemId));
    }
    
    constraints.push(orderBy('addedAt', 'desc'));
    
    const q = query(collection(db, MAINTENANCE_COLLECTION), ...constraints);
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const maintenanceRecords = snapshot.docs.map(firestoreToMaintenance);
        callback(maintenanceRecords);
      },
      (error) => {
        console.error('❌ Maintenance subscription error:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up maintenance subscription:', error);
    return () => {};
  }
}
```

**Junior Developer Explanation:**

- **Transactions**: Like a database "all-or-nothing" operation. Either ALL steps succeed, or ALL fail (no partial updates).
- **Why transactions?**: Prevents race conditions - if two people try to move the same item simultaneously, one will fail safely.
- **Retry logic**: Transactions can fail due to conflicts. Firebase automatically retries up to 5 times.
- **Real-time subscriptions**: `onSnapshot` listens for changes. When ANY document changes, ALL listeners get the update instantly.
- **Denormalization**: We store `inMaintenanceQuantity` on the item for fast queries (avoid counting all maintenance records).

---

#### Step 1.3: Create Redux Slice

**File:** `src/store/slices/maintenanceSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Maintenance, MaintenanceStatus } from '../../types/maintenance';

interface MaintenanceState {
  maintenanceRecords: Maintenance[];
  selectedMaintenance: Maintenance | null;
  loading: boolean;
  error: string | null;
  errorTimestamp: number | null;
  filters: {
    status: MaintenanceStatus | 'all';
  };
}

const initialState: MaintenanceState = {
  maintenanceRecords: [],
  selectedMaintenance: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: {
    status: 'all',
  },
};

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,
  reducers: {
    // Bulk set maintenance records (from real-time subscription)
    setMaintenanceRecords: (state, action: PayloadAction<Maintenance[]>) => {
      state.maintenanceRecords = action.payload;
      state.loading = false;
    },
    
    // Set selected maintenance record
    setSelectedMaintenance: (state, action: PayloadAction<Maintenance | null>) => {
      state.selectedMaintenance = action.payload;
    },
    
    // Add new maintenance record (optimistic update)
    addMaintenanceRecord: (state, action: PayloadAction<Maintenance>) => {
      state.maintenanceRecords.unshift(action.payload);
    },
    
    // Update existing maintenance record
    updateMaintenanceInState: (state, action: PayloadAction<Maintenance>) => {
      const index = state.maintenanceRecords.findIndex(
        (m) => m.id === action.payload.id
      );
      if (index !== -1) {
        state.maintenanceRecords[index] = action.payload;
      }
      
      // Update selected if it's the same record
      if (state.selectedMaintenance?.id === action.payload.id) {
        state.selectedMaintenance = action.payload;
      }
    },
    
    // Remove maintenance record (after full return or write-off)
    removeMaintenanceRecord: (state, action: PayloadAction<string>) => {
      state.maintenanceRecords = state.maintenanceRecords.filter(
        (m) => m.id !== action.payload
      );
      
      // Clear selected if it's the removed record
      if (state.selectedMaintenance?.id === action.payload) {
        state.selectedMaintenance = null;
      }
    },
    
    // Set filters
    setFilters: (
      state,
      action: PayloadAction<{ status: MaintenanceStatus | 'all' }>
    ) => {
      state.filters = action.payload;
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filters = { status: 'all' };
    },
    
    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.errorTimestamp = Date.now();
      state.loading = false;
    },
    
    clearError: (state) => {
      state.error = null;
      state.errorTimestamp = null;
    },
    
    // Clear all maintenance data (on logout)
    clearMaintenance: (state) => {
      state.maintenanceRecords = [];
      state.selectedMaintenance = null;
      state.loading = false;
      state.error = null;
      state.errorTimestamp = null;
      state.filters = { status: 'all' };
    },
  },
});

export const {
  setMaintenanceRecords,
  setSelectedMaintenance,
  addMaintenanceRecord,
  updateMaintenanceInState,
  removeMaintenanceRecord,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
  clearMaintenance,
} = maintenanceSlice.actions;

export default maintenanceSlice.reducer;
```

**Junior Developer Explanation:**

- **Redux Slice**: Creates reducer + actions automatically (no need to write switch statements).
- **Immer**: Redux Toolkit uses Immer under the hood, so we can "mutate" state directly (it's actually immutable).
- **PayloadAction****: TypeScript type for actions with a typed payload.**
- **Why separate records?**: `maintenanceRecords` is the full list, `selectedMaintenance` is the one we're viewing/editing.

---

#### Step 1.4: Create Redux Thunks

**File:** `src/store/thunks/maintenanceThunks.ts`

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  addToMaintenance as addToMaintenanceService,
  returnFromMaintenance as returnFromMaintenanceService,
  writeOffItem as writeOffItemService,
  listMaintenance,
  getMaintenanceById,
  updateMaintenanceStatus,
  addMaintenanceUpdate,
} from '../../services/firebase/maintenanceService';
import {
  AddToMaintenanceData,
  ReturnFromMaintenanceData,
  WriteOffData,
  MaintenanceStatus,
} from '../../types/maintenance';

/**
 * Fetch all maintenance records
 */
export const fetchMaintenanceRecords = createAsyncThunk(
  'maintenance/fetchRecords',
  async (filters?: { status?: MaintenanceStatus | 'all' }, { rejectWithValue }) => {
    try {
      const records = await listMaintenance(filters);
      return records;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch maintenance records');
    }
  }
);

/**
 * Fetch single maintenance record
 */
export const fetchMaintenanceById = createAsyncThunk(
  'maintenance/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const record = await getMaintenanceById(id);
      if (!record) {
        throw new Error('Maintenance record not found');
      }
      return record;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch maintenance record');
    }
  }
);

/**
 * Add item to maintenance
 */
export const addToMaintenanceThunk = createAsyncThunk(
  'maintenance/addToMaintenance',
  async (
    {
      data,
      userId,
      userName,
    }: {
      data: AddToMaintenanceData;
      userId: string;
      userName: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const maintenanceId = await addToMaintenanceService(data, userId, userName);
      return maintenanceId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add item to maintenance');
    }
  }
);

/**
 * Return item from maintenance
 */
export const returnFromMaintenanceThunk = createAsyncThunk(
  'maintenance/returnFromMaintenance',
  async (
    {
      maintenanceId,
      returnData,
      userId,
      userName,
    }: {
      maintenanceId: string;
      returnData: ReturnFromMaintenanceData;
      userId: string;
      userName: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await returnFromMaintenanceService(maintenanceId, returnData, userId, userName);
      return maintenanceId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to return item from maintenance');
    }
  }
);

/**
 * Write off item
 */
export const writeOffItemThunk = createAsyncThunk(
  'maintenance/writeOffItem',
  async (
    {
      maintenanceId,
      writeOffData,
      userId,
      userName,
    }: {
      maintenanceId: string;
      writeOffData: WriteOffData;
      userId: string;
      userName: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await writeOffItemService(maintenanceId, writeOffData, userId, userName);
      return maintenanceId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to write off item');
    }
  }
);

/**
 * Update maintenance status
 */
export const updateMaintenanceStatusThunk = createAsyncThunk(
  'maintenance/updateStatus',
  async (
    { maintenanceId, status }: { maintenanceId: string; status: MaintenanceStatus },
    { rejectWithValue }
  ) => {
    try {
      await updateMaintenanceStatus(maintenanceId, status);
      return { maintenanceId, status };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update status');
    }
  }
);

/**
 * Add maintenance update note
 */
export const addMaintenanceUpdateThunk = createAsyncThunk(
  'maintenance/addUpdate',
  async (
    {
      maintenanceId,
      note,
      userId,
      userName,
    }: {
      maintenanceId: string;
      note: string;
      userId: string;
      userName: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await addMaintenanceUpdate(maintenanceId, note, userId, userName);
      return maintenanceId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add update');
    }
  }
);
```

**Junior Developer Explanation:**

- **createAsyncThunk**: Automatically creates pending/fulfilled/rejected action types for async operations.
- **rejectWithValue**: Returns error message as payload (used in `extraReducers`).
- **Why thunks?**: React components dispatch thunks, which call services, which update Firebase, which triggers real-time listeners, which update Redux.

---

#### Step 1.5: Create Redux Selectors

**File:** `src/store/selectors/maintenanceSelectors.ts`

```typescript
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { Maintenance, MaintenanceStatus } from '../../types/maintenance';

// Base selector
export const selectMaintenanceState = (state: RootState) => state.maintenance;

// All maintenance records
export const selectMaintenanceRecords = (state: RootState) =>
  state.maintenance.maintenanceRecords;

// Selected maintenance record
export const selectSelectedMaintenance = (state: RootState) =>
  state.maintenance.selectedMaintenance;

// Loading state
export const selectMaintenanceLoading = (state: RootState) =>
  state.maintenance.loading;

// Error state
export const selectMaintenanceError = (state: RootState) =>
  state.maintenance.error;

// Filters
export const selectMaintenanceFilters = (state: RootState) =>
  state.maintenance.filters;

// Active maintenance records (pending, under_repair, ready)
export const selectActiveMaintenanceRecords = createSelector(
  [selectMaintenanceRecords],
  (records) =>
    records.filter((record) =>
      ['pending', 'under_repair', 'ready'].includes(record.status)
    )
);

// Written off records
export const selectWrittenOffRecords = createSelector(
  [selectMaintenanceRecords],
  (records) => records.filter((record) => record.status === 'written_off')
);

// Returned records
export const selectReturnedRecords = createSelector(
  [selectMaintenanceRecords],
  (records) => records.filter((record) => record.status === 'returned')
);

// History records (returned + written_off)
export const selectMaintenanceHistory = createSelector(
  [selectMaintenanceRecords],
  (records) =>
    records.filter((record) =>
      ['returned', 'written_off'].includes(record.status)
    )
);

// Factory selector: Get maintenance records by item ID
export const selectMaintenanceByItemId = (itemId: string) =>
  createSelector([selectMaintenanceRecords], (records) =>
    records.filter((record) => record.itemId === itemId)
  );

// Filtered records based on current filter
export const selectFilteredMaintenanceRecords = createSelector(
  [selectMaintenanceRecords, selectMaintenanceFilters],
  (records, filters) => {
    if (filters.status === 'all') {
      return records;
    }
    return records.filter((record) => record.status === filters.status);
  }
);

// Statistics
export const selectMaintenanceStats = createSelector(
  [selectMaintenanceRecords],
  (records) => {
    const active = records.filter((r) =>
      ['pending', 'under_repair', 'ready'].includes(r.status)
    );
    const pending = records.filter((r) => r.status === 'pending');
    const underRepair = records.filter((r) => r.status === 'under_repair');
    const ready = records.filter((r) => r.status === 'ready');
    const writtenOff = records.filter((r) => r.status === 'written_off');
    
    return {
      total: records.length,
      active: active.length,
      pending: pending.length,
      underRepair: underRepair.length,
      ready: ready.length,
      writtenOff: writtenOff.length,
    };
  }
);
```

**Junior Developer Explanation:**

- **createSelector**: Memoizes selector results. Only recalculates if input selectors change (performance optimization).
- **Factory selectors**: Functions that return selectors (useful for parameterized queries).
- **Why memoize?**: If component re-renders but data hasn't changed, selector returns cached result (avoids expensive filtering).

---

#### Step 1.6: Register Slice in Store

**File:** `src/store/index.ts`

**Modification:** Add maintenance reducer to store configuration.

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sitesReducer from './slices/sitesSlice';
import inventoryReducer from './slices/inventorySlice';
import requestsReducer from './slices/requestsSlice';
import steelMasterReducer from './slices/steelMasterSlice';
import maintenanceReducer from './slices/maintenanceSlice'; // NEW

const store = configureStore({
  reducer: {
    auth: authReducer,
    sites: sitesReducer,
    inventory: inventoryReducer,
    requests: requestsReducer,
    steelMaster: steelMasterReducer,
    maintenance: maintenanceReducer, // NEW
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
```

---

### **Phase 2: Component Development** (Building Blocks)

#### Step 2.1: Maintenance Status Badge

**File:** `src/components/Maintenance/MaintenanceStatusBadge.tsx`

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { MaintenanceStatus } from '../../types/maintenance';

interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
}

// Status configuration with CIAMS design system colors
const statusConfig: Record<
  MaintenanceStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-[#D97706]/15',
    textColor: 'text-[#D97706]',
  },
  under_repair: {
    label: 'Under Repair',
    bgColor: 'bg-[#3B82F6]/15',
    textColor: 'text-[#3B82F6]',
  },
  ready: {
    label: 'Ready',
    bgColor: 'bg-[#16A34A]/15',
    textColor: 'text-[#16A34A]',
  },
  returned: {
    label: 'Returned',
    bgColor: 'bg-[#475569]/15',
    textColor: 'text-[#475569]',
  },
  written_off: {
    label: 'Written Off',
    bgColor: 'bg-[#DC2626]/15',
    textColor: 'text-[#DC2626]',
  },
};

export default function MaintenanceStatusBadge({ status }: MaintenanceStatusBadgeProps) {
  const config = statusConfig[status];
  
  if (!config) {
    // Fallback for unknown status
    return (
      <View className="px-2 py-1 rounded-full bg-[#475569]/15">
        <Text className="text-[12px] font-medium text-[#475569]">Unknown</Text>
      </View>
    );
  }
  
  return (
    <View className={`px-2 py-1 rounded-full ${config.bgColor}`}>
      <Text className={`text-[12px] font-medium ${config.textColor}`}>
        {config.label}
      </Text>
    </View>
  );
}
```

**Junior Developer Explanation:**

- **Record<K, V>**: TypeScript utility type for objects where keys are type K and values are type V.
- **Status badge pattern**: 15% opacity background color + full opacity text color (CIAMS design system).
- **Fallback**: Always handle unknown values gracefully (never crash the app).

---

#### Step 2.2: Issue Type Selector

**File:** `src/components/Maintenance/IssueTypeSelector.tsx`

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IssueType, IssueTypeConfig } from '../../types/maintenance';

interface IssueTypeSelectorProps {
  value: IssueType | null;
  onSelect: (issueType: IssueType) => void;
  error?: string;
  disabled?: boolean;
}

// Issue type configurations
const issueTypes: IssueTypeConfig[] = [
  {
    value: 'motor_electrical',
    label: 'Motor/Electrical',
    description: 'Motor malfunctions, electrical issues',
  },
  {
    value: 'physical_damage',
    label: 'Physical Damage',
    description: 'Broken parts, cracks, dents',
  },
  {
    value: 'wear_and_tear',
    label: 'Wear and Tear',
    description: 'Normal usage degradation',
  },
  {
    value: 'missing_parts',
    label: 'Missing Parts',
    description: 'Components missing or lost',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other issues',
  },
];

export default function IssueTypeSelector({
  value,
  onSelect,
  error,
  disabled = false,
}: IssueTypeSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  
  const selectedConfig = issueTypes.find((type) => type.value === value);
  const displayText = selectedConfig?.label || 'Select Issue Type';
  const hasError = Boolean(error);
  
  const handleSelect = (issueType: IssueType) => {
    onSelect(issueType);
    setModalVisible(false);
  };
  
  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        className={`border rounded-lg h-12 px-4 bg-white flex-row items-center justify-between ${
          hasError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'
        } ${disabled ? 'opacity-50' : ''}`}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        accessibilityLabel="Issue type selector"
        accessibilityHint="Select the type of issue"
      >
        <Text
          className={`text-[15px] ${
            value ? 'text-[#0F172A]' : 'text-[#94A3B8]'
          }`}
        >
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>
      
      {/* Error Message */}
      {hasError && (
        <Text className="text-[13px] text-[#DC2626] mt-1">{error}</Text>
      )}
      
      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setModalVisible(false)}
        >
          <Pressable className="bg-white rounded-t-2xl" onPress={(e) => e.stopPropagation()}>
            {/* Handle Bar */}
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center my-2" />
            
            {/* Header */}
            <View className="px-4 py-3 border-b border-[#E2E8F0]">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                Select Issue Type
              </Text>
            </View>
            
            {/* List */}
            <FlatList
              data={issueTypes}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="px-4 py-4 border-b border-[#E2E8F0]"
                  onPress={() => handleSelect(item.value)}
                  accessibilityLabel={`Select ${item.label}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[15px] font-medium text-[#0F172A] mb-1">
                        {item.label}
                      </Text>
                      {item.description && (
                        <Text className="text-[13px] text-[#64748B]">
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {value === item.value && (
                      <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
            
            {/* Cancel Button */}
            <TouchableOpacity
              className="px-4 py-4 border-t border-[#E2E8F0]"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-[15px] font-semibold text-[#DC2626] text-center">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
```

**Junior Developer Explanation:**

- **Modal bottom sheet pattern**: Commonly used in mobile apps for selection (iOS/Android native behavior).
- **Pressable vs TouchableOpacity**: `Pressable` for backdrop (dismiss on tap), `TouchableOpacity` for items (visual feedback).
- **e.stopPropagation()**: Prevents tapping modal content from dismissing it (only backdrop tap dismisses).
- **maxHeight on FlatList**: Prevents modal from taking full screen height.

---

#### Step 2.3: Write-Off Reason Selector

**File:** `src/components/Maintenance/WriteOffReasonSelector.tsx`

Similar to `IssueTypeSelector`, but with write-off reasons:

```tsx
// Similar structure to IssueTypeSelector
const writeOffReasons: WriteOffReasonConfig[] = [
  {
    value: 'beyond_repair',
    label: 'Beyond Repair',
    description: 'Damage is irreparable',
  },
  {
    value: 'high_repair_cost',
    label: 'High Repair Cost',
    description: 'Repair cost exceeds replacement cost',
  },
  {
    value: 'obsolete',
    label: 'Obsolete',
    description: 'Item is outdated or no longer needed',
  },
  {
    value: 'lost_stolen',
    label: 'Lost/Stolen',
    description: 'Item cannot be recovered',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other reasons',
  },
];

// ... rest is identical to IssueTypeSelector
```

---

#### Step 2.4: Item Selector for Maintenance

**File:** `src/components/Maintenance/ItemSelectorForMaintenance.tsx`

```tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../hooks/redux';
import { selectItems } from '../../store/selectors/inventorySelectors';
import { Item } from '../../types/inventory';

interface ItemSelectorForMaintenanceProps {
  onSelect: (item: Item) => void;
  selectedItemId?: string;
  excludeItemIds?: string[];
}

export default function ItemSelectorForMaintenance({
  onSelect,
  selectedItemId,
  excludeItemIds = [],
}: ItemSelectorForMaintenanceProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const allItems = useAppSelector(selectItems);
  
  // Filter to non-consumable items with central store quantity > 0
  const availableItems = useMemo(() => {
    return allItems.filter((item) => {
      // Must be non-consumable
      if (item.type !== 'non_consumable') return false;
      
      // Must have quantity in central store
      if ((item.centralStoreQuantity || 0) <= 0) return false;
      
      // Not in exclude list
      if (excludeItemIds.includes(item.id)) return false;
      
      // Match search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSku = item.sku.toLowerCase().includes(query);
        return matchesName || matchesSku;
      }
      
      return true;
    });
  }, [allItems, excludeItemIds, searchQuery]);
  
  const selectedItem = allItems.find((item) => item.id === selectedItemId);
  
  const handleSelect = (item: Item) => {
    onSelect(item);
    setModalVisible(false);
    setSearchQuery('');
  };
  
  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between"
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Item selector"
      >
        <Text
          className={`text-[15px] ${
            selectedItem ? 'text-[#0F172A]' : 'text-[#94A3B8]'
          }`}
        >
          {selectedItem ? selectedItem.name : 'Select Item'}
        </Text>
        <Ionicons name="search" size={20} color="#64748B" />
      </TouchableOpacity>
      
      {/* Selected Item Info */}
      {selectedItem && (
        <View className="mt-2 p-3 bg-[#F8FAFC] rounded-lg">
          <Text className="text-[13px] text-[#64748B]">SKU: {selectedItem.sku}</Text>
          <Text className="text-[13px] text-[#64748B]">
            Available: {selectedItem.centralStoreQuantity || 0} {selectedItem.unit}
          </Text>
        </View>
      )}
      
      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="bg-white rounded-t-2xl max-h-[80%]"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center my-2" />
            
            {/* Header */}
            <View className="px-4 py-3 border-b border-[#E2E8F0]">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-2">
                Select Item
              </Text>
              
              {/* Search Input */}
              <View className="flex-row items-center bg-[#F8FAFC] rounded-lg px-3 h-10">
                <Ionicons name="search" size={20} color="#64748B" />
                <TextInput
                  className="flex-1 ml-2 text-[15px] text-[#0F172A]"
                  placeholder="Search items..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* List */}
            {availableItems.length === 0 ? (
              <View className="py-12 items-center">
                <Ionicons name="cube-outline" size={64} color="#64748B" />
                <Text className="text-[15px] text-[#64748B] mt-4">
                  {searchQuery ? 'No items match your search' : 'No items available'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="px-4 py-3 border-b border-[#E2E8F0]"
                    onPress={() => handleSelect(item)}
                  >
                    <View className="flex-row items-center">
                      {/* Image */}
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          className="w-12 h-12 rounded-lg"
                        />
                      ) : (
                        <View className="w-12 h-12 bg-[#F8FAFC] rounded-lg items-center justify-center">
                          <Ionicons name="cube-outline" size={24} color="#64748B" />
                        </View>
                      )}
                      
                      {/* Info */}
                      <View className="flex-1 ml-3">
                        <Text className="text-[15px] font-medium text-[#0F172A]">
                          {item.name}
                        </Text>
                        <Text className="text-[13px] text-[#64748B]">
                          {item.sku}
                        </Text>
                        <Text className="text-[13px] text-[#64748B]">
                          Available: {item.centralStoreQuantity || 0} {item.unit}
                        </Text>
                      </View>
                      
                      {/* Selected Indicator */}
                      {selectedItemId === item.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
            
            {/* Cancel Button */}
            <TouchableOpacity
              className="px-4 py-4 border-t border-[#E2E8F0]"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-[15px] font-semibold text-[#DC2626] text-center">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
```

**Junior Developer Explanation:**

- **useMemo with multiple dependencies**: Recalculates filtered list only when `allItems`, `excludeItemIds`, or `searchQuery` changes.
- **Filter chain**: Multiple conditions combined - all must be true for item to show.
- **Search UX**: Auto-focus search input when modal opens (better mobile UX).

---

#### Step 2.5: Maintenance Card

**File:** `src/components/Maintenance/MaintenanceCard.tsx`

```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Maintenance, IssueType } from '../../types/maintenance';
import MaintenanceStatusBadge from './MaintenanceStatusBadge';

interface MaintenanceCardProps {
  maintenance: Maintenance;
  onPress: () => void;
}

// Issue type labels (for display)
const issueTypeLabels: Record<IssueType, string> = {
  motor_electrical: 'Motor/Electrical',
  physical_damage: 'Physical Damage',
  wear_and_tear: 'Wear and Tear',
  missing_parts: 'Missing Parts',
  other: 'Other',
};

// Helper: Format date string
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MaintenanceCard({ maintenance, onPress }: MaintenanceCardProps) {
  return (
    <TouchableOpacity
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={`Maintenance record for ${maintenance.itemName}`}
    >
      {/* Top Row: Item Name + Status */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[15px] font-semibold text-[#0F172A] flex-1 pr-2">
          {maintenance.itemName}
        </Text>
        <MaintenanceStatusBadge status={maintenance.status} />
      </View>
      
      {/* Key-Value Grid */}
      <View className="gap-2 mb-3">
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">SKU</Text>
            <Text className="text-[15px] text-[#0F172A]">{maintenance.itemSku}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">Quantity</Text>
            <Text className="text-[15px] text-[#0F172A]">{maintenance.quantity}</Text>
          </View>
        </View>
        
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">Issue Type</Text>
            <Text className="text-[15px] text-[#0F172A]">
              {issueTypeLabels[maintenance.issueType] || 'Unknown'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] text-[#64748B]">Added</Text>
            <Text className="text-[15px] text-[#0F172A]">
              {formatDate(maintenance.addedAt)}
            </Text>
          </View>
        </View>
        
        {maintenance.reportedBy && (
          <View>
            <Text className="text-[13px] text-[#64748B]">Reported By</Text>
            <Text className="text-[15px] text-[#0F172A]">{maintenance.reportedBy}</Text>
          </View>
        )}
      </View>
      
      {/* Divider + Footer */}
      <View className="border-t border-[#E2E8F0] pt-2 flex-row justify-between items-center">
        <Text className="text-[13px] text-[#64748B]">
          Added by {maintenance.addedByName}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
}
```

**Junior Developer Explanation:**

- **Card pattern**: Standard CIAMS card pattern (white bg, rounded-[10px], p-4, border).
- **Key-value grid**: 2-column layout using `flex-row` with `gap-4` (16px spacing).
- **Conditional rendering**: Only show "Reported By" if it exists (`&&` operator).
- **ActiveOpacity**: Visual feedback on press (default 0.7 = slight fade).

---

#### Step 2.6: Quick Move to Maintenance Button Component

**File:** `src/components/Maintenance/QuickMoveToMaintenanceButton.tsx`

```tsx
import React, { useState } from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import { addToMaintenanceThunk } from '../../store/thunks/maintenanceThunks';
import { AddToMaintenanceData } from '../../types/maintenance';

interface QuickMoveToMaintenanceButtonProps {
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  issueDescription: string;
  sourceRequestId: string;
  sourceReturnDate: Date;
  onSuccess?: () => void;
}

export default function QuickMoveToMaintenanceButton({
  itemId,
  itemName,
  itemSku,
  quantity,
  issueDescription,
  sourceRequestId,
  sourceReturnDate,
  onSuccess,
}: QuickMoveToMaintenanceButtonProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const [loading, setLoading] = useState(false);
  
  const handleQuickMove = () => {
    Alert.alert(
      'Move to Maintenance',
      `Move ${quantity} ${itemName} to maintenance?\n\nThis will remove the item from available inventory and track it in the maintenance system.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Move to Maintenance',
          style: 'destructive',
          onPress: async () => {
            if (!userId || !userName) {
              Alert.alert('Error', 'User information not available');
              return;
            }
            
            setLoading(true);
            
            try {
              const maintenanceData: AddToMaintenanceData = {
                itemId,
                itemName,
                itemSku,
                quantity,
                issueType: 'physical_damage', // Default for damaged returns
                issueDescription,
                sourceRequestId,
                sourceReturnDate,
              };
              
              await dispatch(
                addToMaintenanceThunk({
                  data: maintenanceData,
                  userId,
                  userName,
                })
              ).unwrap();
              
              Alert.alert('Success', 'Item moved to maintenance successfully');
              onSuccess?.();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to move item to maintenance');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  return (
    <TouchableOpacity
      className="bg-[#D97706] rounded-lg px-4 py-2.5 flex-row items-center justify-center gap-2"
      onPress={handleQuickMove}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="construct" size={18} color="#FFFFFF" />
          <Text className="text-[14px] font-semibold text-white">
            Move to Maintenance
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
```

**Junior Developer Explanation:**

- **Alert.alert**: Native confirmation dialog (iOS/Android styled automatically).
- **.unwrap()**: Throws error if thunk fails (can be caught in try-catch).
- **Optional chaining** (`?.`): Safely call function if it exists (onSuccess might be undefined).
- **Amber button** (`bg-[#D97706]`): Warning color to indicate caution (not as severe as red).

---

### **Phase 3: Screen Development** (User Interface)

Due to length constraints, I'll provide a comprehensive outline with key implementation details for each screen.

#### Step 3.1: Maintenance Dashboard Screen

**File:** `src/screens/Maintenance/MaintenanceDashboardScreen.tsx`

**Key Features:**

- Tab filter: "Active" (pending/under_repair/ready) vs "History" (returned/written_off)
- FlatList of `MaintenanceCard` components
- Pull-to-refresh
- Real-time subscription using `subscribeToMaintenance`
- Empty states for each tab
- Header with "Add to Maintenance" button

**Implementation Pattern:**

```tsx
// Subscribe on mount
useEffect(() => {
  const unsubscribe = subscribeToMaintenance((records) => {
    dispatch(setMaintenanceRecords(records));
  });
  return unsubscribe;
}, [dispatch]);

// Tab state
const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

// Filtered data based on tab
const displayedRecords = activeTab === 'active' 
  ? selectActiveMaintenanceRecords(state)
  : selectMaintenanceHistory(state);
```

---

#### Step 3.2: Add to Maintenance Screen

**File:** `src/screens/Maintenance/AddToMaintenanceScreen.tsx`

**Form Fields:**

1. Item Selector (required) - `ItemSelectorForMaintenance`
2. Quantity (required) - Number input with +/- buttons
3. Issue Type (required) - `IssueTypeSelector`
4. Description (required) - Multiline text input (min 10 chars)
5. Reported By (optional) - Text input
6. Photos (optional) - Image picker (max 5)

**Validation Rules:**

```tsx
const validateForm = (): boolean => {
  const errors: FormErrors = {};
  
  if (!selectedItem) {
    errors.item = 'Please select an item';
  }
  
  if (quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  }
  
  if (selectedItem && quantity > (selectedItem.centralStoreQuantity || 0)) {
    errors.quantity = `Cannot exceed available quantity (${selectedItem.centralStoreQuantity})`;
  }
  
  if (!issueType) {
    errors.issueType = 'Please select issue type';
  }
  
  if (description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }
  
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

---

#### Step 3.3: Maintenance Detail Screen

**File:** `src/screens/Maintenance/MaintenanceDetailScreen.tsx`

**Layout Sections:**

1. Item information card (image, name, SKU, quantity)
2. Issue details (type, description)
3. Photos gallery (if any)
4. Status timeline
5. Updates/notes section
6. Action buttons based on status:
  - `pending` / `under_repair`: "Mark as Ready" button
  - `ready`: "Return to Inventory" + "Write Off" buttons
  - `returned` / `written_off`: Read-only

---

#### Step 3.4: Return from Maintenance Screen

**File:** `src/screens/Maintenance/ReturnFromMaintenanceScreen.tsx`

**Form Fields:**

1. Return Quantity (required) - Number input with +/- buttons (max: maintenance quantity)
2. Repair Summary (required) - Multiline text input (min 10 chars)
3. Repair Cost (optional) - Number input with ₹ prefix
4. Repaired By (optional) - Text input

**Warning Banner:**

```tsx
<View className="bg-[#D97706]/15 px-4 py-3 mx-4 mb-3 rounded-lg">
  <View className="flex-row items-start gap-2">
    <Ionicons name="warning" size={20} color="#D97706" />
    <Text className="text-[13px] text-[#D97706] flex-1">
      This will add {returnQuantity} items back to central store inventory
    </Text>
  </View>
</View>
```

---

#### Step 3.5: Write Off Screen

**File:** `src/screens/Maintenance/WriteOffScreen.tsx`

**Form Fields:**

1. Write Off Quantity (required) - Number input with +/- buttons
2. Reason (required) - `WriteOffReasonSelector`
3. Explanation (required) - Multiline text input (min 20 chars)

**Danger Warning + Confirmation:**

```tsx
// Warning banner
<View className="bg-[#DC2626]/15 px-4 py-3 mx-4 mb-3 rounded-lg">
  <View className="flex-row items-start gap-2">
    <Ionicons name="alert-circle" size={20} color="#DC2626" />
    <Text className="text-[13px] text-[#DC2626] flex-1">
      ⚠️ This permanently reduces total inventory. Cannot be undone.
    </Text>
  </View>
</View>

// Confirmation alert before submit
const handleWriteOff = () => {
  Alert.alert(
    'Confirm Write Off',
    `Are you sure you want to write off ${writeOffQuantity} items?\n\nThis action is PERMANENT and cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Write Off',
        style: 'destructive',
        onPress: submitWriteOff,
      },
    ]
  );
};
```

---

### **Phase 4: Integration** (Connecting Everything)

#### Step 4.1: Create Navigation Stack

**File:** `src/navigation/MaintenanceStackNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaintenanceDashboardScreen from '../screens/Maintenance/MaintenanceDashboardScreen';
import AddToMaintenanceScreen from '../screens/Maintenance/AddToMaintenanceScreen';
import MaintenanceDetailScreen from '../screens/Maintenance/MaintenanceDetailScreen';
import ReturnFromMaintenanceScreen from '../screens/Maintenance/ReturnFromMaintenanceScreen';
import WriteOffScreen from '../screens/Maintenance/WriteOffScreen';

export type MaintenanceStackParamList = {
  MaintenanceDashboard: undefined;
  AddToMaintenance: undefined;
  MaintenanceDetail: { maintenanceId: string };
  ReturnFromMaintenance: { maintenanceId: string };
  WriteOff: { maintenanceId: string };
};

const Stack = createNativeStackNavigator<MaintenanceStackParamList>();

export default function MaintenanceStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen
        name="MaintenanceDashboard"
        component={MaintenanceDashboardScreen}
      />
      <Stack.Screen
        name="AddToMaintenance"
        component={AddToMaintenanceScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
      />
      <Stack.Screen
        name="ReturnFromMaintenance"
        component={ReturnFromMaintenanceScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="WriteOff"
        component={WriteOffScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
}
```

---

#### Step 4.2: Add Tab to Bottom Tab Navigator

**File:** `src/navigation/BottomTabNavigator.tsx`

**Modification:** Add Maintenance tab between Requests and Sites tabs.

```tsx
// Import navigator
import MaintenanceStackNavigator from './MaintenanceStackNavigator';

// Add tab (after Requests, before Sites)
{(isAdmin || isStoreIncharge) && (
  <Tab.Screen
    name="Maintenance"
    component={MaintenanceStackNavigator}
    options={{
      tabBarLabel: 'Maintenance',
      tabBarIcon: ({ color, size }) => (
        <Ionicons name="construct-outline" size={size} color={color} />
      ),
      // Optional: Add badge for pending maintenance items
      // tabBarBadge: pendingMaintenanceCount > 0 ? pendingMaintenanceCount : undefined,
    }}
  />
)}
```

**Junior Developer Explanation:**

- **Tab visibility**: Same pattern as Sites tab (only Admin/StoreIncharge).
- **Icon**: `construct-outline` represents maintenance/tools.
- **Badge**: Can add count of pending items (commented out - implement if needed).

---

#### Step 4.3: Update Navigation Types

**File:** `src/types/navigation.ts`

```typescript
import { NavigatorScreenParams } from '@react-navigation/native';
import { MaintenanceStackParamList } from '../navigation/MaintenanceStackNavigator';

// Update MainTabParamList
export type MainTabParamList = {
  Users: undefined;
  Dashboard: undefined;
  Inventory: NavigatorScreenParams<InventoryStackParamList>;
  Requests: NavigatorScreenParams<RequestStackParamList>;
  Maintenance: NavigatorScreenParams<MaintenanceStackParamList>; // NEW
  Sites: NavigatorScreenParams<SiteStackParamList>;
};

// Export MaintenanceStackParamList for type safety
export type { MaintenanceStackParamList };
```

---

#### Step 4.4: Component and Screen Exports

**File:** `src/components/index.ts`

```typescript
// Maintenance components
export { default as MaintenanceCard } from './Maintenance/MaintenanceCard';
export { default as MaintenanceStatusBadge } from './Maintenance/MaintenanceStatusBadge';
export { default as IssueTypeSelector } from './Maintenance/IssueTypeSelector';
export { default as WriteOffReasonSelector } from './Maintenance/WriteOffReasonSelector';
export { default as ItemSelectorForMaintenance } from './Maintenance/ItemSelectorForMaintenance';
export { default as QuickMoveToMaintenanceButton } from './Maintenance/QuickMoveToMaintenanceButton';
```

**File:** `src/screens/index.ts`

```typescript
// Maintenance screens
export { default as MaintenanceDashboardScreen } from './Maintenance/MaintenanceDashboardScreen';
export { default as AddToMaintenanceScreen } from './Maintenance/AddToMaintenanceScreen';
export { default as MaintenanceDetailScreen } from './Maintenance/MaintenanceDetailScreen';
export { default as ReturnFromMaintenanceScreen } from './Maintenance/ReturnFromMaintenanceScreen';
export { default as WriteOffScreen } from './Maintenance/WriteOffScreen';
```

---

### **Phase 5: Request Integration** (Critical for New Workflow)

#### Step 5.1: Add Quick-Move Button in ReturnItemsScreen

**File:** `src/screens/Requests/ReturnItemsScreen.tsx`

**Modification:** Add `QuickMoveToMaintenanceButton` for damaged items.

```tsx
import { QuickMoveToMaintenanceButton } from '../../components';

// In the item list rendering (after each returned item display):
{returnedItem.isDamaged && (isAdmin || isStoreIncharge) && (
  <View className="mt-2">
    <QuickMoveToMaintenanceButton
      itemId={returnedItem.itemId}
      itemName={returnedItem.itemName}
      itemSku={returnedItem.itemSku}
      quantity={returnedItem.quantityReturned}
      issueDescription={`Returned damaged from ${request.siteName}. ${returnedItem.damageNotes || ''}`}
      sourceRequestId={request.id}
      sourceReturnDate={new Date(returnedItem.returnedAt)}
      onSuccess={() => {
        // Optional: Refresh or show success message
        Alert.alert('Success', 'Item moved to maintenance');
      }}
    />
  </View>
)}
```

**Junior Developer Explanation:**

- **Conditional rendering**: Only show button if (1) item is damaged AND (2) user is Admin/StoreIncharge.
- **Issue description**: Auto-generated from return context (includes site name and damage notes).
- **Source tracking**: Links maintenance record back to original request.

---

#### Step 5.2: Add Damaged Item Indicator in ProcessRequestScreen

**File:** `src/screens/Requests/ProcessRequestScreen.tsx`

**Modification:** Display damaged indicator when viewing returned items.

```tsx
// In the return history section:
{returnEvent.items.map((returnedItem) => (
  <View key={returnedItem.itemId} className="mb-3">
    <View className="flex-row justify-between">
      <Text className="text-[15px] text-[#0F172A]">
        {returnedItem.itemName}
      </Text>
      <Text className="text-[15px] text-[#0F172A]">
        {returnedItem.quantityReturned} {returnedItem.unit}
      </Text>
    </View>
    
    {/* NEW: Damaged indicator */}
    {returnedItem.isDamaged && (
      <View className="flex-row items-center gap-1 mt-1">
        <Ionicons name="warning" size={16} color="#D97706" />
        <Text className="text-[13px] text-[#D97706]">
          Damaged {returnedItem.damageNotes && `• ${returnedItem.damageNotes}`}
        </Text>
      </View>
    )}
  </View>
))}
```

---

#### Step 5.3: Add Maintenance Quantity to ItemCard

**File:** `src/components/Inventory/ItemCard.tsx`

**Modification:** Add maintenance quantity to stock information grid.

```tsx
// In the stock information section (after "At Sites" row):
<View className="flex-1">
  <Text className="text-[13px] text-[#64748B]">Maintenance</Text>
  <Text className={`text-[15px] ${
    (item.inMaintenanceQuantity || 0) > 0 ? 'text-[#D97706]' : 'text-[#0F172A]'
  }`}>
    {item.inMaintenanceQuantity || 0}
  </Text>
</View>
```

**Junior Developer Explanation:**

- **Conditional color**: Orange if items in maintenance (warns user), black if zero.
- **Fallback value**: `|| 0` ensures we never show `undefined` or `null`.

---

### **Phase 6: Testing** (Quality Assurance)

#### Testing Checklist

**Unit Tests (Optional but recommended):**

- `maintenanceService.test.ts` - Test all CRUD operations
- `maintenanceSlice.test.ts` - Test reducers and actions
- `maintenanceSelectors.test.ts` - Test selector logic

**Component Tests:**

- `MaintenanceCard.test.tsx` - Render with different statuses
- `MaintenanceStatusBadge.test.tsx` - Correct colors for each status
- Selector components - Open/close modal, selection behavior
- `QuickMoveToMaintenanceButton.test.tsx` - Confirmation dialog and submit

**Integration Tests:**

1. **Add to Maintenance Flow:**
  - Select item → Fill form → Submit
  - Verify inventory reduced
  - Verify maintenance record created
  - Verify item `inMaintenanceQuantity` increased
2. **Quick-Move Flow:**
  - Return damaged item from site
  - Click "Move to Maintenance" button
  - Confirm dialog
  - Verify maintenance record created with source tracking
3. **Return Flow:**
  - Partial return (1 of 2)
  - Full return (2 of 2)
  - Verify inventory increased
  - Verify maintenance quantity reduced
  - Verify status updated correctly
4. **Write-Off Flow:**
  - Confirm dialog appears
  - Submit write-off
  - Verify total quantity permanently reduced
  - Verify maintenance record marked written_off
5. **Real-Time Updates:**
  - Two users view maintenance dashboard
  - User A adds item to maintenance
  - User B sees update immediately
  - User A returns item
  - User B sees update immediately

**Manual Testing:**

- Test with multiple users (race conditions)
- Test edge cases (0 quantity, deleted items)
- Test navigation flow (back buttons, tab switches)
- Test role-based access (SiteManager cannot access)
- Test image uploads (large images, network failures)

---

### **Phase 7: Documentation & Code Review**

#### Documentation Tasks

1. **Update README.md** - Add Maintenance Management section
2. **API Documentation** - Document all maintenance service methods
3. **Component Documentation** - Add JSDoc comments to all components
4. **Type Documentation** - Document all TypeScript interfaces
5. **Flow Diagrams** - Create visual workflow diagrams

#### Code Review Checklist

- All TypeScript types properly defined
- All async operations have error handling
- All transactions have retry logic
- All components follow CIAMS design system
- All navigation properly typed
- All real-time subscriptions properly cleaned up
- All validation rules implemented
- All confirmation dialogs added
- All loading states implemented
- All error messages user-friendly
- All accessibility labels added
- No hardcoded strings (use constants)
- No magic numbers (use named constants)
- Consistent naming conventions
- Proper code formatting

---

## 📊 Data Flow Summary

### Add to Maintenance Flow

```
User fills form
    ↓
Validate input
    ↓
Dispatch addToMaintenanceThunk
    ↓
maintenanceService.addToMaintenance()
    ↓
Firebase Transaction:
  1. Read inventory entry (central store)
  2. Read item document
  3. Validate quantity available
  4. Validate non-consumable
  5. Create maintenance document
  6. Update inventory (reduce quantity)
  7. Update item.inMaintenanceQuantity
    ↓
Real-time listener updates Redux
    ↓
UI updates automatically
```

### Quick-Move from Returns Flow (NEW)

```
Site Manager returns damaged item to central store
    ↓
Admin/StoreIncharge views return in ProcessRequestScreen
    ↓
Sees "Damaged" indicator + "Move to Maintenance" button
    ↓
Clicks "Move to Maintenance" button
    ↓
Confirmation dialog appears
    ↓
Confirms action
    ↓
QuickMoveToMaintenanceButton dispatches addToMaintenanceThunk
    ↓
Same as Add to Maintenance Flow (but with source tracking)
    ↓
Maintenance record created with:
  - sourceRequestId
  - sourceReturnDate
  - Auto-generated issue description
```

### Return from Maintenance Flow

```
User fills return form
    ↓
Validate input
    ↓
Dispatch returnFromMaintenanceThunk
    ↓
maintenanceService.returnFromMaintenance()
    ↓
Firebase Transaction:
  1. Read maintenance record
  2. Validate return quantity
  3. Read inventory entry (central store)
  4. Read item document
  5. Update inventory (increase quantity)
  6. Update item.inMaintenanceQuantity (decrease)
  7. Update maintenance record (reduce quantity or mark returned)
  8. Add update note
    ↓
Real-time listener updates Redux
    ↓
UI updates automatically
```

### Write Off Flow

```
User confirms write-off
    ↓
Validate input + Show confirmation dialog
    ↓
User confirms again
    ↓
Dispatch writeOffItemThunk
    ↓
maintenanceService.writeOffItem()
    ↓
Firebase Transaction:
  1. Read maintenance record
  2. Validate write-off quantity
  3. Read item document
  4. Update item.totalQuantity (PERMANENT reduction)
  5. Update item.inMaintenanceQuantity (decrease)
  6. Update maintenance record (mark written_off)
  7. Add update note
    ↓
Real-time listener updates Redux
    ↓
UI updates automatically
```

---

## ⚠️ Considerations & Edge Cases

### 1. Race Conditions

**Issue:** Two users try to move the same item to maintenance simultaneously.

**Solution:** Firebase transactions with automatic retry (up to 5 times). Second transaction will re-read data and fail if quantity insufficient.

### 2. Partial Returns

**Issue:** Return 1 of 2 items, 1 still in maintenance.

**Solution:**

- Maintenance record keeps reduced quantity
- Status remains active (not marked "returned")
- Only mark "returned" when quantity reaches 0

### 3. Item Deletion Prevention

**Issue:** Item is deleted while in maintenance.

**Solution:**

- Add check in `deleteItem()` service method:

```typescript
if (itemData.inMaintenanceQuantity > 0) {
  throw new Error('Cannot delete item with items in maintenance');
}
```

### 4. Negative Quantities Prevention

**Issue:** Concurrent operations could cause negative inventory.

**Solution:** Validate in transaction before committing. Transaction fails if quantity would go negative.

### 5. Orphaned Maintenance Records

**Issue:** Maintenance record exists but item is deleted (edge case).

**Solution:**

- Display maintenance records even if item deleted
- Show "Item Deleted" badge in red
- Allow write-off to clean up orphaned records

### 6. Photo Storage Cleanup

**Issue:** Photos uploaded but user cancels form.

**Solution:**

- Only upload photos AFTER form validation succeeds
- Store photo URLs in maintenance document
- On maintenance record deletion, delete associated photos

### 7. Permission Enforcement

**Issue:** SiteManager tries to access via deep link.

**Solution:**

- Tab not visible to SiteManager (navigation guard)
- Firestore security rules check user role
- Service methods can optionally validate role

### 8. Real-Time Updates

**Issue:** User views stale data while another user makes changes.

**Solution:** Firestore `onSnapshot` listener updates Redux automatically. All users see changes in real-time.

### 9. Form State Preservation

**Issue:** User navigates away from form and loses data.

**Solution:** Consider adding draft support (like requests) or warn user before navigating away.

### 10. Large Photos

**Issue:** User uploads very large images.

**Solution:**

- Validate max file size (5MB)
- Compress before upload using `expo-image-manipulator`
- Show upload progress indicator

### 11. Quick-Move Button Visibility

**Issue:** Button appears even after item already moved to maintenance.

**Solution:**

- Track if item already moved (add flag to return event)
- Hide button if already processed
- Show "Already in Maintenance" badge instead

### 12. Source Tracking

**Issue:** Lose context of where maintenance item came from.

**Solution:**

- Store `sourceRequestId` and `sourceReturnDate` in maintenance record
- Display in MaintenanceDetailScreen
- Link back to original request (optional)

---

## 🎯 Implementation Order (Sequential)

### **Week 1: Foundation** (Backend & State Management)

**Days 1-3:**

- Step 1.1: Create type definitions (`maintenance.ts`)
- Step 1.2: Implement Firebase service (`maintenanceService.ts`)
- Step 1.3: Create Redux slice
- Step 1.4: Create Redux thunks
- Step 1.5: Create Redux selectors
- Step 1.6: Register slice in store

### **Week 2: Components** (UI Building Blocks)

**Days 4-6:**

- Step 2.1: Maintenance Status Badge
- Step 2.2: Issue Type Selector
- Step 2.3: Write-Off Reason Selector
- Step 2.4: Item Selector for Maintenance
- Step 2.5: Maintenance Card
- Step 2.6: Quick Move to Maintenance Button

### **Week 3: Screens** (Main User Interface)

**Days 7-11:**

- Step 3.1: Maintenance Dashboard Screen (with real-time subscription)
- Step 3.2: Add to Maintenance Screen (form + validation)
- Step 3.3: Maintenance Detail Screen
- Step 3.4: Return from Maintenance Screen
- Step 3.5: Write Off Screen (with confirmation)

### **Week 4: Integration & Polish** (Connecting Everything)

**Days 12-14:**

- Step 4.1: Create Maintenance Stack Navigator
- Step 4.2: Add tab to Bottom Tab Navigator
- Step 4.3: Update navigation types
- Step 4.4: Component and screen exports

**Days 15-16:**

- Step 5.1: Add quick-move button in ReturnItemsScreen
- Step 5.2: Add damaged indicator in ProcessRequestScreen
- Step 5.3: Add maintenance quantity to ItemCard

**Days 17-19:**

- Step 6: Testing (unit, component, integration)
- Bug fixes and polish

**Days 20-21:**

- Step 7: Documentation and code review
- Final testing and deployment preparation

---

## 🚀 Post-Implementation Enhancements (Future)

1. **Notifications** - Push notifications when items are ready to return
2. **Reports** - Maintenance cost analytics, repair time analytics, damage trends
3. **Service Center Management** - Track which service centers are used, ratings
4. **Warranty Tracking** - Track warranty status for items, auto-flag warranty items
5. **Preventive Maintenance** - Schedule regular maintenance for equipment
6. **Bulk Operations** - Add multiple items to maintenance at once
7. **Export** - Export maintenance history to CSV/PDF for reporting
8. **Photos Enhancement** - Before/after photos, photo annotations
9. **QR Code Integration** - Scan QR code to add item to maintenance
10. **Maintenance KPIs** - Average repair time, cost per item, return rate

---

## 📝 Summary

This implementation plan provides a comprehensive roadmap for building the Maintenance Management feature with the updated workflow where Site Managers always return items to central store first, and Admin/Store Incharge can then easily move damaged items to maintenance using a quick-move button.

### Key Changes from Original Workflow:

1. **Returns Always Go to Central Store** - Site Managers return all items (damaged or not) to central store
2. **Quick-Move Button** - One-click button on damaged returned items for Admin/StoreIncharge to move to maintenance
3. **Source Tracking** - Maintenance records track which request they came from
4. **Damaged Item Indicators** - Clear visual indicators for damaged returns

### Architecture Highlights:

- **Backend-first approach** with Firebase transactions for data integrity
- **Component-driven development** with reusable UI elements
- **CIAMS design system compliance** for consistent styling
- **Role-based access control** using existing auth patterns
- **Atomic transactions** with retry logic for reliability
- **Real-time updates** for collaborative editing
- **Type-safe navigation** with TypeScript
- **Comprehensive validation** with user-friendly error messages

### Estimated Effort:

**3-4 weeks** for complete implementation including:

- Backend services and state management
- All UI components and screens
- Navigation integration
- Request module integration (quick-move feature)
- Testing and quality assurance
- Documentation and code review

The feature integrates seamlessly with your existing inventory and request systems, updating quantities atomically and providing a complete audit trail for all maintenance operations.