---
name: ""
overview: ""
todos: []
isProject: false
---

# Activity Logging & Audit Trail - Implementation Plan

**CIAMS - Construction Inventory & Asset Management System**  
**Module 7: Immutable System Activity Tracking**

---

## Document Control


| Version | Date       | Author | Changes                     |
| ------- | ---------- | ------ | --------------------------- |
| 1.0     | 2025-01-20 | System | Initial implementation plan |


---

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Requirements Summary](#requirements-summary)
4. [Implementation Strategy](#implementation-strategy)
5. [Phase 1: Data & Backend Setup](#phase-1-data--backend-setup)
6. [Phase 2: Service Layer](#phase-2-service-layer)
7. [Phase 3: Redux State Management](#phase-3-redux-state-management)
8. [Phase 4: Component Development](#phase-4-component-development)
9. [Phase 5: Screen Development](#phase-5-screen-development)
10. [Phase 6: Integration Points](#phase-6-integration-points)
11. [Phase 7: Cloud Functions](#phase-7-cloud-functions)
12. [Phase 8: Testing & Validation](#phase-8-testing--validation)
13. [Implementation Checklist](#implementation-checklist)

---

## Overview

### Feature Summary

Implement a comprehensive, **immutable** activity logging system that tracks all significant user actions in the CIAMS application. Logs are server-side generated, tamper-proof, and provide a complete audit trail for compliance and security purposes.

### Key Requirements

- ✅ **Immutability**: Logs cannot be edited or deleted by anyone (including Admin)
- ✅ **Server-side Creation**: All logs created via Cloud Functions (not client-side)
- ✅ **Admin-Only Access**: Only Admin can view full activity logs
- ✅ **User Activity**: All users can view their own recent 10 actions
- ✅ **Export**: Admin can export logs as CSV (max 1000 records per export)
- ✅ **Comprehensive Coverage**: All CRUD operations logged across all modules

### User Stories


| ID     | User Story                                                                | Priority |
| ------ | ------------------------------------------------------------------------- | -------- |
| US-7.1 | As an **Admin**, I want to view complete activity logs for audit purposes | High     |
| US-7.2 | As an **Admin**, I want to filter logs by user, action, and date          | High     |
| US-7.3 | As an **Admin**, I want to export logs for compliance                     | Medium   |
| US-7.4 | As a **User**, I want to see my own recent activity                       | Low      |


---

## Current Architecture Analysis

### Existing Infrastructure

#### Redux Store (6 Slices)

1. `auth` - Authentication & user roles
2. `sites` - Site management
3. `inventory` - Inventory items & categories
4. `requests` - Request management
5. `steelMaster` - Steel master data
6. `maintenance` - Maintenance records

**✅ Available for Integration**: All slices have thunks/services that can be wrapped with logging

#### Firebase Configuration

- ✅ **Authentication**: Email/password with role-based access
- ✅ **Firestore**: Database with 13 active collections
- ✅ **Cloud Storage**: File storage for images
- ✅ **Cloud Functions**: Configured but minimal implementation (ready for activity logging)

#### Security Rules

- ✅ **Helper Functions**: `isAuthenticated()`, `isAdmin()`, `isUserActive()`, `hasInventoryAccess()`
- ✅ **Role Checks**: Admin, StoreIncharge, SiteManager
- ✅ **Immutability Pattern**: Already used for `inventoryAdjustments` collection

#### Navigation Structure

```
RootNavigator
└── AuthStack
    ├── Auth (unauthenticated)
    ├── Loading (role loading)
    └── Main (authenticated)
        └── MainStackNavigator
            ├── BottomTabNavigator
            │   ├── Users Tab
            │   ├── Dashboard Tab
            │   ├── Inventory Tab (Admin/StoreIncharge/SiteManager)
            │   ├── Requests Tab (Admin/StoreIncharge/SiteManager)
            │   └── Sites Tab (Admin only)
            └── UpdatePasswordScreen (modal)
```

**✅ Navigation Entry Point**: Activity Log screen can be added to:

- Dashboard tab (Admin section)
- Users tab (My Activity section)
- New "Admin" tab (Admin-only navigation)

---

## Requirements Summary

### Functional Requirements

#### FR-1: Activity Log Collection

- All significant actions must be logged automatically
- Server-side timestamps (cannot be manipulated)
- User identity captured from authenticated session
- Device info and IP address recorded for security audit
- Change tracking with before/after values

#### FR-2: Access Control

- **Admin**: View all logs, filter, export
- **All Users**: View own recent 10 actions only
- **No One**: Edit or delete logs (immutable)

#### FR-3: Log Filtering

- Filter by: Date range, User, Action type, Action category
- Search by: Target ID, Target display name
- Sort by: Timestamp (descending)

#### FR-4: Log Export

- CSV format
- Respects applied filters
- Max 1000 records per export
- Filename: `activity-logs-{timestamp}.csv`

### Non-Functional Requirements

#### NFR-1: Security

- All writes via Cloud Functions only (no client writes)
- Firestore rules enforce read-only access
- Server timestamps prevent time manipulation

#### NFR-2: Performance

- Pagination for log list (20 records per page)
- Lazy loading for large datasets
- Optimized queries with composite indexes

#### NFR-3: Scalability

- Log retention policy (optional: archive after 1 year)
- Export limits to prevent memory issues
- Efficient querying with indexed fields

---

## Implementation Strategy

### High-Level Approach

```
Phase 1: Data & Backend → Phase 2: Services → Phase 3: Redux
     ↓                          ↓                  ↓
Phase 4: Components ← Phase 5: Screens ← Phase 6: Integration
     ↓
Phase 7: Cloud Functions → Phase 8: Testing
```

### Incremental Rollout

1. **Week 1**: Backend setup (Firestore, Cloud Functions, types)
2. **Week 2**: Service layer + Redux (client-side reading)
3. **Week 3**: UI components + Activity Log screen (Admin view)
4. **Week 4**: Integration with existing actions + My Activity (User view)
5. **Week 5**: Export functionality + Cloud Function triggers
6. **Week 6**: Testing, refinement, documentation

---

## Phase 1: Data & Backend Setup

### 1.1 TypeScript Type Definitions

**File**: `src/types/activityLog.ts`

```typescript
import { Timestamp } from 'firebase/firestore';

/**
 * Action Categories (Module Groups)
 */
export type ActionCategory =
  | 'authentication'
  | 'users'
  | 'sites'
  | 'inventory'
  | 'requests'
  | 'purchase_orders'
  | 'maintenance'
  | 'vendors';

/**
 * Action Types (Specific Actions)
 */
export type ActionType =
  // Authentication
  | 'user_login'
  | 'user_logout'
  | 'login_failed'
  | 'password_changed'
  // User Management
  | 'user_created'
  | 'user_updated'
  | 'user_disabled'
  | 'user_enabled'
  // Site Management
  | 'site_created'
  | 'site_updated'
  | 'site_status_changed'
  // Inventory
  | 'item_created'
  | 'item_updated'
  | 'quantity_adjusted'
  | 'item_transferred'
  // Requests
  | 'request_created'
  | 'request_edited'
  | 'request_approved'
  | 'request_rejected'
  | 'request_transferred'
  | 'items_returned'
  | 'request_cancelled'
  // Purchase Orders
  | 'po_created'
  | 'po_approved'
  | 'po_rejected'
  | 'po_received'
  | 'po_ordered'
  // Maintenance
  | 'maintenance_added'
  | 'maintenance_returned'
  | 'item_written_off'
  | 'maintenance_updated'
  // Vendors
  | 'vendor_created'
  | 'vendor_updated';

/**
 * Target Type (What was acted upon)
 */
export type TargetType =
  | 'user'
  | 'site'
  | 'item'
  | 'request'
  | 'purchase_order'
  | 'maintenance'
  | 'vendor';

/**
 * Change Entry (Before/After Values)
 */
export interface ChangeEntry {
  field: string;           // e.g., "items[1].quantityRequested"
  fieldLabel: string;      // e.g., "Cement Bags Quantity"
  oldValue: any;           // Previous value
  newValue: any;           // New value
}

/**
 * Firestore Activity Log Document
 */
export interface ActivityLogFirestore {
  id: string;
  timestamp: Timestamp;

  // User Information
  userId: string;
  userName: string;
  userRole: 'Admin' | 'StoreIncharge' | 'SiteManager' | 'Unassigned';

  // Action Information
  actionType: ActionType;
  actionCategory: ActionCategory;

  // Target Information
  targetType: TargetType;
  targetId: string;
  targetDisplay: string;   // Human-readable identifier (e.g., "REQ-2025-0045")

  // Log Details
  summary: string;         // Short summary (e.g., "Edited request: Cement qty 25→20")
  details: string;         // Longer description or reason
  changes: ChangeEntry[];  // Before/after values

  // Device Metadata
  deviceInfo?: string;     // e.g., "Samsung Galaxy S21"
  ipAddress?: string;      // e.g., "192.168.1.xxx"
  appVersion?: string;     // e.g., "1.0.0"
}

/**
 * Redux Activity Log (Serialized Timestamps)
 */
export interface ActivityLog extends Omit<ActivityLogFirestore, 'timestamp'> {
  timestamp: string;       // ISO 8601 string
}

/**
 * Activity Log Filter Options
 */
export interface ActivityLogFilters {
  startDate?: Date | null;
  endDate?: Date | null;
  userId?: string | null;
  actionCategory?: ActionCategory | 'all';
  actionType?: ActionType | 'all';
  searchQuery?: string;
}

/**
 * Activity Log Export Options
 */
export interface ActivityLogExportOptions {
  filters: ActivityLogFilters;
  maxRecords?: number;     // Default: 1000
}
```

### 1.2 Firestore Collection Structure

**Collection**: `activityLogs`

**Document Structure**:

```javascript
{
  id: "log_abc123",
  timestamp: Timestamp(2025-01-20T14:45:00Z),
  
  userId: "user_xyz456",
  userName: "Rajesh Kumar",
  userRole: "StoreIncharge",
  
  actionType: "request_edited",
  actionCategory: "requests",
  
  targetType: "request",
  targetId: "req_2025_0045",
  targetDisplay: "REQ-2025-0045",
  
  summary: "Edited request: Cement qty 25→20",
  details: "Reduced cement quantity due to available stock",
  
  changes: [
    {
      field: "items[1].quantityRequested",
      fieldLabel: "Cement Bags Quantity",
      oldValue: 25,
      newValue: 20
    }
  ],
  
  deviceInfo: "Samsung Galaxy S21",
  ipAddress: "192.168.1.xxx",
  appVersion: "1.0.0"
}
```

### 1.3 Firestore Security Rules

**File**: `firestore.rules` (add to existing rules)

```javascript
/**
 * Activity Logs Collection
 *
 * Purpose: Immutable audit trail of all system activities
 * (auth, users, sites, inventory, requests, POs, maintenance, vendors)
 *
 * Access Rules (per 08_Activity_Logging_and_Audit_Trail):
 * - Write: Denied (only Cloud Functions create logs - server-side only)
 * - Read: Admin can read all; users can read only their own logs (userId match)
 */
match /activityLogs/{logId} {
  // Admin can read all logs
  allow read: if isAuthenticated() && isUserActive() && isAdmin();

  // Users can read only their own logs
  allow read: if isAuthenticated() && isUserActive() &&
                 resource.data.userId == request.auth.uid;

  // No client writes allowed - only Cloud Functions
  allow create, update, delete: if false;
}
```

### 1.4 Firestore Indexes

**File**: `firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "activityLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activityLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activityLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actionCategory", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activityLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actionType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activityLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "actionCategory", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 1.5 Action Type Configuration

**File**: `src/constants/activityLogConfig.ts`

```typescript
import { ActionType, ActionCategory } from '../types/activityLog';

/**
 * Action Type Display Configuration
 */
export const ACTION_TYPE_CONFIG: Record<ActionType, {
  label: string;
  icon: string;
  category: ActionCategory;
}> = {
  // Authentication
  user_login: { label: 'Login', icon: 'log-in-outline', category: 'authentication' },
  user_logout: { label: 'Logout', icon: 'log-out-outline', category: 'authentication' },
  login_failed: { label: 'Failed Login', icon: 'warning-outline', category: 'authentication' },
  password_changed: { label: 'Password Changed', icon: 'key-outline', category: 'authentication' },
  
  // User Management
  user_created: { label: 'User Created', icon: 'person-add-outline', category: 'users' },
  user_updated: { label: 'User Updated', icon: 'create-outline', category: 'users' },
  user_disabled: { label: 'User Disabled', icon: 'remove-circle-outline', category: 'users' },
  user_enabled: { label: 'User Enabled', icon: 'checkmark-circle-outline', category: 'users' },
  
  // Site Management
  site_created: { label: 'Site Created', icon: 'business-outline', category: 'sites' },
  site_updated: { label: 'Site Updated', icon: 'create-outline', category: 'sites' },
  site_status_changed: { label: 'Site Status Changed', icon: 'swap-horizontal-outline', category: 'sites' },
  
  // Inventory
  item_created: { label: 'Item Created', icon: 'cube-outline', category: 'inventory' },
  item_updated: { label: 'Item Updated', icon: 'create-outline', category: 'inventory' },
  quantity_adjusted: { label: 'Quantity Adjusted', icon: 'swap-vertical-outline', category: 'inventory' },
  item_transferred: { label: 'Item Transferred', icon: 'arrow-forward-outline', category: 'inventory' },
  
  // Requests
  request_created: { label: 'Request Created', icon: 'file-tray-full-outline', category: 'requests' },
  request_edited: { label: 'Request Edited', icon: 'create-outline', category: 'requests' },
  request_approved: { label: 'Request Approved', icon: 'checkmark-circle-outline', category: 'requests' },
  request_rejected: { label: 'Request Rejected', icon: 'close-circle-outline', category: 'requests' },
  request_transferred: { label: 'Items Transferred', icon: 'arrow-forward-outline', category: 'requests' },
  items_returned: { label: 'Items Returned', icon: 'arrow-back-outline', category: 'requests' },
  request_cancelled: { label: 'Request Cancelled', icon: 'ban-outline', category: 'requests' },
  
  // Purchase Orders
  po_created: { label: 'PO Created', icon: 'document-text-outline', category: 'purchase_orders' },
  po_approved: { label: 'PO Approved', icon: 'checkmark-done-outline', category: 'purchase_orders' },
  po_rejected: { label: 'PO Rejected', icon: 'close-outline', category: 'purchase_orders' },
  po_received: { label: 'PO Received', icon: 'download-outline', category: 'purchase_orders' },
  po_ordered: { label: 'PO Ordered', icon: 'send-outline', category: 'purchase_orders' },
  
  // Maintenance
  maintenance_added: { label: 'Maintenance Added', icon: 'construct-outline', category: 'maintenance' },
  maintenance_returned: { label: 'Maintenance Returned', icon: 'checkmark-outline', category: 'maintenance' },
  item_written_off: { label: 'Item Written Off', icon: 'trash-outline', category: 'maintenance' },
  maintenance_updated: { label: 'Maintenance Updated', icon: 'create-outline', category: 'maintenance' },
  
  // Vendors
  vendor_created: { label: 'Vendor Created', icon: 'storefront-outline', category: 'vendors' },
  vendor_updated: { label: 'Vendor Updated', icon: 'create-outline', category: 'vendors' },
};

/**
 * Action Category Display Configuration
 */
export const ACTION_CATEGORY_CONFIG: Record<ActionCategory, {
  label: string;
  icon: string;
}> = {
  authentication: { label: 'Authentication', icon: 'shield-checkmark-outline' },
  users: { label: 'User Management', icon: 'people-outline' },
  sites: { label: 'Site Management', icon: 'business-outline' },
  inventory: { label: 'Inventory', icon: 'cube-outline' },
  requests: { label: 'Requests', icon: 'file-tray-full-outline' },
  purchase_orders: { label: 'Purchase Orders', icon: 'document-text-outline' },
  maintenance: { label: 'Maintenance', icon: 'construct-outline' },
  vendors: { label: 'Vendors', icon: 'storefront-outline' },
};
```

---

## Phase 2: Service Layer

### 2.1 Activity Log Service

**File**: `src/services/firebase/activityLogService.ts`

```typescript
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  QueryConstraint,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  ActivityLog,
  ActivityLogFirestore,
  ActivityLogFilters,
  ActivityLogExportOptions,
} from '../../types/activityLog';

const ACTIVITY_LOGS_COLLECTION = 'activityLogs';

/**
 * Helper: Convert Firestore document to Redux-serializable format
 */
function firestoreToActivityLog(doc: any): ActivityLog {
  const data = doc.data() as ActivityLogFirestore;
  return {
    ...data,
    id: doc.id,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

/**
 * List activity logs with filters and pagination
 * 
 * @param filters - Filter options (date range, user, action type, etc.)
 * @param pageSize - Number of records per page (default: 20)
 * @param lastDoc - Last document for pagination (optional)
 * @returns Promise resolving to array of activity logs
 */
export async function listActivityLogs(
  filters?: ActivityLogFilters,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ logs: ActivityLog[]; lastDoc: DocumentSnapshot | null }> {
  try {
    const constraints: QueryConstraint[] = [];

    // Filter by date range
    if (filters?.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters?.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endOfDay)));
    }

    // Filter by user
    if (filters?.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }

    // Filter by action category
    if (filters?.actionCategory && filters.actionCategory !== 'all') {
      constraints.push(where('actionCategory', '==', filters.actionCategory));
    }

    // Filter by action type
    if (filters?.actionType && filters.actionType !== 'all') {
      constraints.push(where('actionType', '==', filters.actionType));
    }

    // Order by timestamp (descending - newest first)
    constraints.push(orderBy('timestamp', 'desc'));

    // Pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    const q = query(collection(db, ACTIVITY_LOGS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(firestoreToActivityLog);
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return { logs, lastDoc: newLastDoc };
  } catch (error: any) {
    console.error('❌ Error listing activity logs:', error);
    throw new Error(error.message || 'Failed to fetch activity logs');
  }
}

/**
 * Get user's own recent activity (last 10 actions)
 * 
 * @param userId - User ID
 * @returns Promise resolving to array of recent activity logs
 */
export async function getMyRecentActivity(userId: string): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(firestoreToActivityLog);
  } catch (error: any) {
    console.error('❌ Error fetching my recent activity:', error);
    throw new Error(error.message || 'Failed to fetch recent activity');
  }
}

/**
 * Export activity logs as CSV
 * 
 * @param options - Export options (filters, max records)
 * @returns Promise resolving to CSV string
 */
export async function exportActivityLogs(
  options: ActivityLogExportOptions
): Promise<string> {
  try {
    const maxRecords = options.maxRecords || 1000;
    const { logs } = await listActivityLogs(options.filters, maxRecords);

    // CSV Header
    const header = 'Timestamp,User,Role,Action,Category,Target,Summary,Details\n';

    // CSV Rows
    const rows = logs.map((log) => {
      const timestamp = new Date(log.timestamp).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return [
        timestamp,
        log.userName,
        log.userRole,
        log.actionType,
        log.actionCategory,
        log.targetDisplay,
        `"${log.summary.replace(/"/g, '""')}"`, // Escape quotes
        `"${log.details.replace(/"/g, '""')}"`,
      ].join(',');
    }).join('\n');

    return header + rows;
  } catch (error: any) {
    console.error('❌ Error exporting activity logs:', error);
    throw new Error(error.message || 'Failed to export activity logs');
  }
}

/**
 * Search activity logs by text query
 * 
 * @param searchQuery - Search text
 * @param pageSize - Number of records per page
 * @returns Promise resolving to array of matching logs
 */
export async function searchActivityLogs(
  searchQuery: string,
  pageSize: number = 20
): Promise<ActivityLog[]> {
  try {
    // Firestore doesn't support full-text search
    // We'll fetch all recent logs and filter client-side
    // For production, consider Algolia or similar service

    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(100) // Limit initial fetch
    );

    const snapshot = await getDocs(q);
    const allLogs = snapshot.docs.map(firestoreToActivityLog);

    // Client-side filtering
    const query = searchQuery.toLowerCase();
    const filtered = allLogs.filter((log) => {
      return (
        log.userName.toLowerCase().includes(query) ||
        log.targetDisplay.toLowerCase().includes(query) ||
        log.summary.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query)
      );
    });

    return filtered.slice(0, pageSize);
  } catch (error: any) {
    console.error('❌ Error searching activity logs:', error);
    throw new Error(error.message || 'Failed to search activity logs');
  }
}
```

### 2.2 Export Utility

**File**: `src/utils/csvExport.ts`

```typescript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Save CSV string to device and share
 * 
 * @param csvString - CSV content
 * @param filename - File name (without extension)
 */
export async function saveCsvAndShare(
  csvString: string,
  filename: string = 'export'
): Promise<void> {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}-${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fullFilename}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Activity Logs',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error: any) {
    console.error('❌ Error saving/sharing CSV:', error);
    throw new Error(error.message || 'Failed to export CSV');
  }
}
```

---

## Phase 3: Redux State Management

### 3.1 Activity Log Slice

**File**: `src/store/slices/activityLogSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ActivityLog,
  ActivityLogFilters,
  ActionCategory,
  ActionType,
} from '../../types/activityLog';
import {
  fetchActivityLogs,
  fetchMyRecentActivity,
  loadMoreActivityLogs,
  exportActivityLogsThunk,
} from '../thunks/activityLogThunks';

interface ActivityLogState {
  // Full Activity Logs (Admin Only)
  logs: ActivityLog[];
  hasMore: boolean;
  lastDoc: any | null; // DocumentSnapshot

  // My Recent Activity (All Users)
  myRecentActivity: ActivityLog[];

  // Filters
  filters: ActivityLogFilters;

  // Loading States
  loading: boolean;
  loadingMore: boolean;
  exportLoading: boolean;
  myActivityLoading: boolean;

  // Errors
  error: string | null;
  errorTimestamp: number | null;
}

const initialState: ActivityLogState = {
  logs: [],
  hasMore: true,
  lastDoc: null,
  myRecentActivity: [],
  filters: {
    startDate: null,
    endDate: null,
    userId: null,
    actionCategory: 'all',
    actionType: 'all',
    searchQuery: '',
  },
  loading: false,
  loadingMore: false,
  exportLoading: false,
  myActivityLoading: false,
  error: null,
  errorTimestamp: null,
};

const activityLogSlice = createSlice({
  name: 'activityLog',
  initialState,
  reducers: {
    // Set filters
    setFilters: (state, action: PayloadAction<Partial<ActivityLogFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.logs = []; // Clear logs when filters change
      state.hasMore = true;
      state.lastDoc = null;
    },

    // Clear filters
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.logs = [];
      state.hasMore = true;
      state.lastDoc = null;
    },

    // Set loading
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.errorTimestamp = Date.now();
      state.loading = false;
      state.loadingMore = false;
      state.exportLoading = false;
      state.myActivityLoading = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
      state.errorTimestamp = null;
    },

    // Clear activity logs (on logout)
    clearActivityLogs: (state) => {
      state.logs = [];
      state.myRecentActivity = [];
      state.hasMore = true;
      state.lastDoc = null;
      state.filters = initialState.filters;
      state.loading = false;
      state.loadingMore = false;
      state.exportLoading = false;
      state.myActivityLoading = false;
      state.error = null;
      state.errorTimestamp = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch activity logs
      .addCase(fetchActivityLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(fetchActivityLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs;
        state.lastDoc = action.payload.lastDoc;
        state.hasMore = action.payload.logs.length === 20; // Page size
        state.error = null;
        state.errorTimestamp = null;
      })
      .addCase(fetchActivityLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.errorTimestamp = Date.now();
      })

      // Load more activity logs (pagination)
      .addCase(loadMoreActivityLogs.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(loadMoreActivityLogs.fulfilled, (state, action) => {
        state.loadingMore = false;
        state.logs = [...state.logs, ...action.payload.logs];
        state.lastDoc = action.payload.lastDoc;
        state.hasMore = action.payload.logs.length === 20;
      })
      .addCase(loadMoreActivityLogs.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload as string;
        state.errorTimestamp = Date.now();
      })

      // Fetch my recent activity
      .addCase(fetchMyRecentActivity.pending, (state) => {
        state.myActivityLoading = true;
        state.error = null;
      })
      .addCase(fetchMyRecentActivity.fulfilled, (state, action) => {
        state.myActivityLoading = false;
        state.myRecentActivity = action.payload;
        state.error = null;
      })
      .addCase(fetchMyRecentActivity.rejected, (state, action) => {
        state.myActivityLoading = false;
        state.error = action.payload as string;
        state.errorTimestamp = Date.now();
      })

      // Export activity logs
      .addCase(exportActivityLogsThunk.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportActivityLogsThunk.fulfilled, (state) => {
        state.exportLoading = false;
        state.error = null;
      })
      .addCase(exportActivityLogsThunk.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload as string;
        state.errorTimestamp = Date.now();
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
  clearActivityLogs,
} = activityLogSlice.actions;

export default activityLogSlice.reducer;
```

### 3.2 Activity Log Thunks

**File**: `src/store/thunks/activityLogThunks.ts`

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  listActivityLogs,
  getMyRecentActivity,
  exportActivityLogs,
} from '../../services/firebase/activityLogService';
import { saveCsvAndShare } from '../../utils/csvExport';
import type {
  ActivityLog,
  ActivityLogFilters,
  ActivityLogExportOptions,
} from '../../types/activityLog';
import type { RootState } from '../index';

/**
 * Fetch activity logs with filters and pagination
 */
export const fetchActivityLogs = createAsyncThunk(
  'activityLog/fetchLogs',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters } = state.activityLog;

      const { logs, lastDoc } = await listActivityLogs(filters, 20);
      return { logs, lastDoc };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch activity logs');
    }
  }
);

/**
 * Load more activity logs (pagination)
 */
export const loadMoreActivityLogs = createAsyncThunk(
  'activityLog/loadMore',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters, lastDoc } = state.activityLog;

      if (!lastDoc) {
        return rejectWithValue('No more logs to load');
      }

      const { logs, lastDoc: newLastDoc } = await listActivityLogs(filters, 20, lastDoc);
      return { logs, lastDoc: newLastDoc };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load more activity logs');
    }
  }
);

/**
 * Fetch user's own recent activity (last 10 actions)
 */
export const fetchMyRecentActivity = createAsyncThunk(
  'activityLog/fetchMyActivity',
  async (userId: string, { rejectWithValue }) => {
    try {
      const logs = await getMyRecentActivity(userId);
      return logs;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch recent activity');
    }
  }
);

/**
 * Export activity logs as CSV
 */
export const exportActivityLogsThunk = createAsyncThunk(
  'activityLog/exportLogs',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters } = state.activityLog;

      const csvString = await exportActivityLogs({ filters, maxRecords: 1000 });
      await saveCsvAndShare(csvString, 'activity-logs');

      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to export activity logs');
    }
  }
);
```

### 3.3 Activity Log Selectors

**File**: `src/store/selectors/activityLogSelectors.ts`

```typescript
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { ActionCategory } from '../../types/activityLog';

// Base selector
export const selectActivityLogState = (state: RootState) => state.activityLog;

// Activity logs
export const selectActivityLogs = (state: RootState) => state.activityLog.logs;

// My recent activity
export const selectMyRecentActivity = (state: RootState) => state.activityLog.myRecentActivity;

// Filters
export const selectActivityLogFilters = (state: RootState) => state.activityLog.filters;

// Loading states
export const selectActivityLogLoading = (state: RootState) => state.activityLog.loading;
export const selectActivityLogLoadingMore = (state: RootState) => state.activityLog.loadingMore;
export const selectActivityLogExportLoading = (state: RootState) => state.activityLog.exportLoading;
export const selectMyActivityLoading = (state: RootState) => state.activityLog.myActivityLoading;

// Error state
export const selectActivityLogError = (state: RootState) => state.activityLog.error;

// Pagination
export const selectHasMoreLogs = (state: RootState) => state.activityLog.hasMore;

// Logs by category (memoized selector)
export const selectLogsByCategory = (category: ActionCategory) =>
  createSelector(
    [selectActivityLogs],
    (logs) => logs.filter((log) => log.actionCategory === category)
  );

// Logs by user (memoized selector)
export const selectLogsByUser = (userId: string) =>
  createSelector(
    [selectActivityLogs],
    (logs) => logs.filter((log) => log.userId === userId)
  );

// Logs statistics (memoized selector)
export const selectActivityLogStats = createSelector(
  [selectActivityLogs],
  (logs) => {
    const stats = {
      total: logs.length,
      byCategory: {} as Record<ActionCategory, number>,
    };

    logs.forEach((log) => {
      stats.byCategory[log.actionCategory] = (stats.byCategory[log.actionCategory] || 0) + 1;
    });

    return stats;
  }
);
```

### 3.4 Update Store Configuration

**File**: `src/store/index.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sitesReducer from './slices/sitesSlice';
import inventoryReducer from './slices/inventorySlice';
import requestsReducer from './slices/requestsSlice';
import steelMasterReducer from './slices/steelMasterSlice';
import maintenanceReducer from './slices/maintenanceSlice';
import activityLogReducer from './slices/activityLogSlice'; // ✅ NEW

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sites: sitesReducer,
    inventory: inventoryReducer,
    requests: requestsReducer,
    steelMaster: steelMasterReducer,
    maintenance: maintenanceReducer,
    activityLog: activityLogReducer, // ✅ NEW
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // ... existing actions
          'activityLog/fetchLogs/fulfilled',
          'activityLog/loadMore/fulfilled',
          'activityLog/fetchMyActivity/fulfilled',
        ],
        ignoredPaths: [
          // ... existing paths
          'activityLog.logs',
          'activityLog.myRecentActivity',
          'activityLog.lastDoc',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## Phase 4: Component Development

### 4.1 Activity Log Card Component

**File**: `src/components/ActivityLog/ActivityLogCard.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityLog } from '../../types/activityLog';
import { ACTION_TYPE_CONFIG } from '../../constants/activityLogConfig';

interface ActivityLogCardProps {
  log: ActivityLog;
  onPress: () => void;
}

// Helper: Format timestamp
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function ActivityLogCard({ log, onPress }: ActivityLogCardProps) {
  const actionConfig = ACTION_TYPE_CONFIG[log.actionType];

  return (
    <TouchableOpacity
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityLabel={`Activity log: ${log.summary}`}
      accessibilityRole="button"
    >
      {/* Top Row: Icon + Action Type + Timestamp */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Ionicons name={actionConfig.icon as any} size={20} color="#1E40AF" />
          <Text className="text-[15px] font-semibold text-[#0F172A] flex-1">
            {actionConfig.label}
          </Text>
        </View>
        <Text className="text-[13px] text-[#64748B]">
          {formatTimestamp(log.timestamp)}
        </Text>
      </View>

      {/* Summary */}
      <Text className="text-[15px] text-[#0F172A] mb-2">
        {log.summary}
      </Text>

      {/* Footer: User + Target */}
      <View className="flex-row items-center justify-between pt-2 border-t border-[#E2E8F0]">
        <Text className="text-[13px] text-[#64748B]">
          {log.userName}
        </Text>
        <Text className="text-[13px] text-[#1E40AF] font-medium">
          {log.targetDisplay}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

### 4.2 Activity Log Filter Modal Component

**File**: `src/components/ActivityLog/ActivityLogFilterModal.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { ActivityLogFilters, ActionCategory } from '../../types/activityLog';
import { ACTION_CATEGORY_CONFIG } from '../../constants/activityLogConfig';

interface ActivityLogFilterModalProps {
  visible: boolean;
  filters: ActivityLogFilters;
  onClose: () => void;
  onApply: (filters: ActivityLogFilters) => void;
}

export default function ActivityLogFilterModal({
  visible,
  filters,
  onClose,
  onApply,
}: ActivityLogFilterModalProps) {
  const [localFilters, setLocalFilters] = useState<ActivityLogFilters>(filters);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({
      startDate: null,
      endDate: null,
      userId: null,
      actionCategory: 'all',
      actionType: 'all',
      searchQuery: '',
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[90%]">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-3" />

          {/* Header */}
          <View className="p-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
            <Text className="text-[22px] font-semibold text-[#0F172A]">
              Filter Logs
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-11 h-11 items-center justify-center"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView className="px-4 py-4">
            {/* Date Range */}
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              Date Range
            </Text>

            <View className="flex-row gap-3 mb-6">
              {/* Start Date */}
              <TouchableOpacity
                className="flex-1 border border-[#E2E8F0] rounded-lg h-12 px-4 justify-center"
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text className="text-[13px] text-[#64748B]">From</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {localFilters.startDate
                    ? localFilters.startDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Select'}
                </Text>
              </TouchableOpacity>

              {/* End Date */}
              <TouchableOpacity
                className="flex-1 border border-[#E2E8F0] rounded-lg h-12 px-4 justify-center"
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text className="text-[13px] text-[#64748B]">To</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {localFilters.endDate
                    ? localFilters.endDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Select'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Category */}
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              Category
            </Text>

            <View className="flex-row flex-wrap gap-2 mb-6">
              <TouchableOpacity
                className={`px-4 py-2 rounded-full border ${
                  localFilters.actionCategory === 'all'
                    ? 'bg-[#1E40AF] border-[#1E40AF]'
                    : 'border-[#E2E8F0]'
                }`}
                onPress={() => setLocalFilters({ ...localFilters, actionCategory: 'all' })}
              >
                <Text
                  className={`text-[13px] font-medium ${
                    localFilters.actionCategory === 'all'
                      ? 'text-white'
                      : 'text-[#64748B]'
                  }`}
                >
                  All
                </Text>
              </TouchableOpacity>

              {(Object.keys(ACTION_CATEGORY_CONFIG) as ActionCategory[]).map((category) => (
                <TouchableOpacity
                  key={category}
                  className={`px-4 py-2 rounded-full border ${
                    localFilters.actionCategory === category
                      ? 'bg-[#1E40AF] border-[#1E40AF]'
                      : 'border-[#E2E8F0]'
                  }`}
                  onPress={() => setLocalFilters({ ...localFilters, actionCategory: category })}
                >
                  <Text
                    className={`text-[13px] font-medium ${
                      localFilters.actionCategory === category
                        ? 'text-white'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {ACTION_CATEGORY_CONFIG[category].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View className="px-4 py-3 border-t border-[#E2E8F0] flex-row gap-3">
            <TouchableOpacity
              className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              onPress={handleClear}
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF]">
                Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              onPress={handleApply}
            >
              <Text className="text-[15px] font-semibold text-white">
                Apply
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DateTimePicker
              value={localFilters.startDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartDatePicker(false);
                if (selectedDate) {
                  setLocalFilters({ ...localFilters, startDate: selectedDate });
                }
              }}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={localFilters.endDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndDatePicker(false);
                if (selectedDate) {
                  setLocalFilters({ ...localFilters, endDate: selectedDate });
                }
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
```

### 4.3 Activity Log Detail Modal Component

**File**: `src/components/ActivityLog/ActivityLogDetailModal.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityLog } from '../../types/activityLog';
import { ACTION_TYPE_CONFIG } from '../../constants/activityLogConfig';

interface ActivityLogDetailModalProps {
  visible: boolean;
  log: ActivityLog | null;
  onClose: () => void;
}

// Helper: Format full timestamp
function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActivityLogDetailModal({
  visible,
  log,
  onClose,
}: ActivityLogDetailModalProps) {
  if (!log) return null;

  const actionConfig = ACTION_TYPE_CONFIG[log.actionType];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[90%]">
          {/* Handle Bar */}
          <View className="w-10 h-1 bg-[#E2E8F0] rounded-full self-center mt-3" />

          {/* Header */}
          <View className="p-4 border-b border-[#E2E8F0] flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <Ionicons name={actionConfig.icon as any} size={24} color="#1E40AF" />
              <Text className="text-[22px] font-semibold text-[#0F172A]">
                {actionConfig.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-11 h-11 items-center justify-center"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView className="px-4 py-4">
            {/* Timestamp */}
            <Text className="text-[13px] text-[#64748B] mb-4">
              {formatFullTimestamp(log.timestamp)}
            </Text>

            {/* Action Section */}
            <View className="mb-6">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Action
              </Text>
              <View className="bg-[#F8FAFC] rounded-[10px] p-4 gap-2">
                <View className="flex-row gap-4">
                  <Text className="text-[13px] text-[#64748B] w-20">Type:</Text>
                  <Text className="text-[15px] text-[#0F172A] flex-1">
                    {log.actionType}
                  </Text>
                </View>
                <View className="flex-row gap-4">
                  <Text className="text-[13px] text-[#64748B] w-20">User:</Text>
                  <Text className="text-[15px] text-[#0F172A] flex-1">
                    {log.userName}
                  </Text>
                </View>
                <View className="flex-row gap-4">
                  <Text className="text-[13px] text-[#64748B] w-20">Role:</Text>
                  <Text className="text-[15px] text-[#0F172A] flex-1">
                    {log.userRole}
                  </Text>
                </View>
                <View className="flex-row gap-4">
                  <Text className="text-[13px] text-[#64748B] w-20">Target:</Text>
                  <Text className="text-[15px] text-[#0F172A] flex-1">
                    {log.targetDisplay}
                  </Text>
                </View>
              </View>
            </View>

            {/* Summary */}
            <View className="mb-6">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                Summary
              </Text>
              <Text className="text-[15px] text-[#0F172A]">
                {log.summary}
              </Text>
            </View>

            {/* Details */}
            {log.details && (
              <View className="mb-6">
                <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                  Details
                </Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {log.details}
                </Text>
              </View>
            )}

            {/* Changes */}
            {log.changes && log.changes.length > 0 && (
              <View className="mb-6">
                <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                  Changes
                </Text>
                {log.changes.map((change, index) => (
                  <View
                    key={index}
                    className="bg-[#F8FAFC] rounded-[10px] p-4 mb-2"
                  >
                    <Text className="text-[15px] font-medium text-[#0F172A] mb-2">
                      {change.fieldLabel}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1 bg-[#DC2626]/10 rounded-lg p-2">
                        <Text className="text-[13px] text-[#64748B] mb-1">
                          Before:
                        </Text>
                        <Text className="text-[15px] text-[#DC2626] font-medium">
                          {String(change.oldValue)}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={20} color="#64748B" />
                      <View className="flex-1 bg-[#16A34A]/10 rounded-lg p-2">
                        <Text className="text-[13px] text-[#64748B] mb-1">
                          After:
                        </Text>
                        <Text className="text-[15px] text-[#16A34A] font-medium">
                          {String(change.newValue)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Metadata */}
            {(log.deviceInfo || log.ipAddress || log.appVersion) && (
              <View className="mb-6">
                <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                  Metadata
                </Text>
                <View className="bg-[#F8FAFC] rounded-[10px] p-4 gap-2">
                  {log.deviceInfo && (
                    <View className="flex-row gap-4">
                      <Text className="text-[13px] text-[#64748B] w-24">Device:</Text>
                      <Text className="text-[15px] text-[#0F172A] flex-1">
                        {log.deviceInfo}
                      </Text>
                    </View>
                  )}
                  {log.ipAddress && (
                    <View className="flex-row gap-4">
                      <Text className="text-[13px] text-[#64748B] w-24">IP:</Text>
                      <Text className="text-[15px] text-[#0F172A] flex-1">
                        {log.ipAddress}
                      </Text>
                    </View>
                  )}
                  {log.appVersion && (
                    <View className="flex-row gap-4">
                      <Text className="text-[13px] text-[#64748B] w-24">App Version:</Text>
                      <Text className="text-[15px] text-[#0F172A] flex-1">
                        {log.appVersion}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

### 4.4 My Recent Activity Widget Component

**File**: `src/components/ActivityLog/MyRecentActivityWidget.tsx`

```typescript
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectMyRecentActivity,
  selectMyActivityLoading,
} from '../../store/selectors/activityLogSelectors';
import { selectUserId } from '../../store/selectors/authSelectors';
import { fetchMyRecentActivity } from '../../store/thunks/activityLogThunks';
import { ACTION_TYPE_CONFIG } from '../../constants/activityLogConfig';

interface MyRecentActivityWidgetProps {
  onViewAll?: () => void;
}

export default function MyRecentActivityWidget({ onViewAll }: MyRecentActivityWidgetProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const recentActivity = useAppSelector(selectMyRecentActivity);
  const loading = useAppSelector(selectMyActivityLoading);

  useEffect(() => {
    if (userId) {
      dispatch(fetchMyRecentActivity(userId));
    }
  }, [dispatch, userId]);

  // Helper: Format relative timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    if (diffHours < 48) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <View className="bg-white rounded-[10px] p-4 items-center justify-center h-32">
        <ActivityIndicator size="small" color="#1E40AF" />
      </View>
    );
  }

  return (
    <View className="bg-white rounded-[10px] p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[17px] font-semibold text-[#0F172A]">
          My Recent Activity
        </Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text className="text-[13px] font-medium text-[#1E40AF]">
              View All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Activity List */}
      {recentActivity.length === 0 ? (
        <View className="items-center py-6">
          <Ionicons name="time-outline" size={40} color="#94A3B8" />
          <Text className="text-[13px] text-[#64748B] mt-2">
            No recent activity
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {recentActivity.slice(0, 5).map((log) => {
            const actionConfig = ACTION_TYPE_CONFIG[log.actionType];
            return (
              <View
                key={log.id}
                className="flex-row items-center gap-2 py-2 border-b border-[#E2E8F0]"
              >
                <Ionicons
                  name={actionConfig.icon as any}
                  size={18}
                  color="#64748B"
                />
                <View className="flex-1">
                  <Text className="text-[13px] text-[#0F172A]">
                    {actionConfig.label}
                  </Text>
                  <Text className="text-[11px] text-[#64748B]">
                    {log.targetDisplay}
                  </Text>
                </View>
                <Text className="text-[11px] text-[#64748B]">
                  {formatTimestamp(log.timestamp)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
```

### 4.5 Component Exports

**File**: `src/components/ActivityLog/index.ts`

```typescript
export { default as ActivityLogCard } from './ActivityLogCard';
export { default as ActivityLogFilterModal } from './ActivityLogFilterModal';
export { default as ActivityLogDetailModal } from './ActivityLogDetailModal';
export { default as MyRecentActivityWidget } from './MyRecentActivityWidget';
```

**Update**: `src/components/index.ts`

```typescript
// ... existing exports

// Activity Log components
export {
  ActivityLogCard,
  ActivityLogFilterModal,
  ActivityLogDetailModal,
  MyRecentActivityWidget,
} from './ActivityLog';
```

---

## Phase 5: Screen Development

### 5.1 Activity Log Screen (Admin Only)

**File**: `src/screens/ActivityLog/ActivityLogScreen.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout, ScreenHeader } from '../../components';
import {
  ActivityLogCard,
  ActivityLogFilterModal,
  ActivityLogDetailModal,
} from '../../components/ActivityLog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectActivityLogs,
  selectActivityLogLoading,
  selectActivityLogLoadingMore,
  selectActivityLogExportLoading,
  selectActivityLogError,
  selectHasMoreLogs,
  selectActivityLogFilters,
} from '../../store/selectors/activityLogSelectors';
import {
  fetchActivityLogs,
  loadMoreActivityLogs,
  exportActivityLogsThunk,
} from '../../store/thunks/activityLogThunks';
import { setFilters, clearFilters, clearError } from '../../store/slices/activityLogSlice';
import type { ActivityLog } from '../../types/activityLog';

export const ActivityLogScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  const logs = useAppSelector(selectActivityLogs);
  const loading = useAppSelector(selectActivityLogLoading);
  const loadingMore = useAppSelector(selectActivityLogLoadingMore);
  const exportLoading = useAppSelector(selectActivityLogExportLoading);
  const error = useAppSelector(selectActivityLogError);
  const hasMore = useAppSelector(selectHasMoreLogs);
  const filters = useAppSelector(selectActivityLogFilters);

  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Fetch initial logs
  useEffect(() => {
    dispatch(fetchActivityLogs());
  }, [dispatch]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchActivityLogs());
    setRefreshing(false);
  }, [dispatch]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      dispatch(loadMoreActivityLogs());
    }
  }, [dispatch, loading, loadingMore, hasMore]);

  // Export handler
  const handleExport = useCallback(async () => {
    await dispatch(exportActivityLogsThunk());
  }, [dispatch]);

  // Filter apply handler
  const handleApplyFilters = useCallback((newFilters: any) => {
    dispatch(setFilters(newFilters));
    dispatch(fetchActivityLogs());
  }, [dispatch]);

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
    dispatch(fetchActivityLogs());
  }, [dispatch]);

  // Card press handler
  const handleCardPress = useCallback((log: ActivityLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  }, []);

  // Dismiss error
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, dispatch]);

  // Check if filters are applied
  const hasActiveFilters =
    filters.startDate ||
    filters.endDate ||
    filters.userId ||
    (filters.actionCategory && filters.actionCategory !== 'all') ||
    (filters.actionType && filters.actionType !== 'all');

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Activity Log"
        rightAction={{
          label: exportLoading ? 'Exporting...' : 'Export',
          onPress: handleExport,
          loading: exportLoading,
          accessibilityLabel: 'Export logs as CSV',
        }}
      />

      {/* Error Banner */}
      {error && (
        <View className="bg-[#DC2626]/15 px-4 py-2 mx-4 mb-3 rounded-lg">
          <Text className="text-[13px] text-[#DC2626]">{error}</Text>
        </View>
      )}

      {/* Filter Bar */}
      <View className="px-4 pb-3 flex-row items-center gap-2">
        <TouchableOpacity
          className="flex-1 border border-[#E2E8F0] rounded-[10px] h-12 px-4 flex-row items-center justify-between"
          onPress={() => setFilterModalVisible(true)}
          accessibilityLabel="Open filters"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="funnel-outline" size={20} color="#64748B" />
            <Text className="text-[15px] text-[#0F172A]">
              {hasActiveFilters ? 'Filters Applied' : 'All Logs'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity
            className="w-12 h-12 border border-[#E2E8F0] rounded-[10px] items-center justify-center"
            onPress={handleClearFilters}
            accessibilityLabel="Clear filters"
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Activity Log List */}
      <FlatList
        data={logs}
        renderItem={({ item }) => (
          <ActivityLogCard log={item} onPress={() => handleCardPress(item)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1E40AF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading activity logs...
              </Text>
            </View>
          ) : (
            <View className="items-center justify-center py-12">
              <Ionicons name="document-text-outline" size={80} color="#64748B" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                {hasActiveFilters
                  ? 'No logs match your filters'
                  : 'No activity logs yet'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#1E40AF" />
            </View>
          ) : null
        }
      />

      {/* Modals */}
      <ActivityLogFilterModal
        visible={filterModalVisible}
        filters={filters}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
      />

      <ActivityLogDetailModal
        visible={detailModalVisible}
        log={selectedLog}
        onClose={() => setDetailModalVisible(false)}
      />
    </ScreenLayout>
  );
};
```

### 5.2 My Activity Screen (All Users)

**File**: `src/screens/ActivityLog/MyActivityScreen.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout, ScreenHeader } from '../../components';
import {
  ActivityLogCard,
  ActivityLogDetailModal,
} from '../../components/ActivityLog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectMyRecentActivity,
  selectMyActivityLoading,
} from '../../store/selectors/activityLogSelectors';
import { selectUserId } from '../../store/selectors/authSelectors';
import { fetchMyRecentActivity } from '../../store/thunks/activityLogThunks';
import type { ActivityLog } from '../../types/activityLog';

export const MyActivityScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  const userId = useAppSelector(selectUserId);
  const recentActivity = useAppSelector(selectMyRecentActivity);
  const loading = useAppSelector(selectMyActivityLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Fetch initial activity
  useEffect(() => {
    if (userId) {
      dispatch(fetchMyRecentActivity(userId));
    }
  }, [dispatch, userId]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!userId) return;

    setRefreshing(true);
    await dispatch(fetchMyRecentActivity(userId));
    setRefreshing(false);
  }, [dispatch, userId]);

  // Card press handler
  const handleCardPress = useCallback((log: ActivityLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  }, []);

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="My Recent Activity" />

      {/* Info Banner */}
      <View className="bg-[#1E40AF]/10 px-4 py-3 mx-4 mb-3 rounded-lg flex-row items-start gap-2">
        <Ionicons name="information-circle" size={20} color="#1E40AF" />
        <Text className="text-[13px] text-[#1E40AF] flex-1">
          Showing your last 10 actions in the system
        </Text>
      </View>

      {/* Activity List */}
      <FlatList
        data={recentActivity}
        renderItem={({ item }) => (
          <ActivityLogCard log={item} onPress={() => handleCardPress(item)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1E40AF"
          />
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading recent activity...
              </Text>
            </View>
          ) : (
            <View className="items-center justify-center py-12">
              <Ionicons name="time-outline" size={80} color="#64748B" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                No recent activity
              </Text>
            </View>
          )
        }
      />

      {/* Detail Modal */}
      <ActivityLogDetailModal
        visible={detailModalVisible}
        log={selectedLog}
        onClose={() => setDetailModalVisible(false)}
      />
    </ScreenLayout>
  );
};
```

### 5.3 Screen Exports

**File**: `src/screens/ActivityLog/index.ts`

```typescript
export { ActivityLogScreen } from './ActivityLogScreen';
export { MyActivityScreen } from './MyActivityScreen';
```

**Update**: `src/screens/index.ts`

```typescript
// ... existing exports

// Activity Log screens
export { ActivityLogScreen, MyActivityScreen } from './ActivityLog';
```

---

## Phase 6: Integration Points

### 6.1 Add Activity Log Navigation

**Option A: Add to Dashboard Tab (Recommended)**

**File**: `src/navigation/DashboardStackNavigator.tsx` (NEW)

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen, ActivityLogScreen, MyActivityScreen } from '../screens';
import { useAppSelector } from '../store/hooks';
import { selectIsAdmin } from '../store/selectors/authSelectors';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  ActivityLog: undefined;
  MyActivity: undefined;
};

const Stack = createStackNavigator<DashboardStackParamList>();

export const DashboardStackNavigator: React.FC = () => {
  const isAdmin = useAppSelector(selectIsAdmin);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      {isAdmin && (
        <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
      )}
      <Stack.Screen name="MyActivity" component={MyActivityScreen} />
    </Stack.Navigator>
  );
};
```

**Update**: `src/navigation/BottomTabNavigator.tsx`

```typescript
// Replace DashboardScreen with DashboardStackNavigator

import { DashboardStackNavigator } from './DashboardStackNavigator';

// ...

<Tab.Screen
  name="Dashboard"
  component={DashboardStackNavigator} // ✅ Changed
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="grid-outline" size={size} color={color} />
    ),
    tabBarLabel: 'Dashboard',
  }}
/>
```

**Update**: `src/screens/DashboardScreen.tsx`

Add navigation buttons to access Activity Log (Admin) and My Activity (All Users):

```typescript
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { DashboardStackParamList } from '../navigation/DashboardStackNavigator';

type NavigationProp = StackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const isAdmin = useAppSelector(selectIsAdmin);

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Dashboard" />
      
      <ScrollView className="flex-1 px-4 py-4">
        {/* My Recent Activity Widget (All Users) */}
        <MyRecentActivityWidget
          onViewAll={() => navigation.navigate('MyActivity')}
        />

        {/* Admin-only: Full Activity Log Access */}
        {isAdmin && (
          <TouchableOpacity
            className="bg-white rounded-[10px] p-4 mt-3 flex-row items-center justify-between"
            onPress={() => navigation.navigate('ActivityLog')}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="document-text-outline" size={24} color="#1E40AF" />
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                Activity Log
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        )}

        {/* Other dashboard widgets... */}
      </ScrollView>
    </ScreenLayout>
  );
};
```

### 6.2 Clear Activity Logs on Logout

**File**: `src/store/slices/authSlice.ts`

```typescript
// In signOutUser thunk fulfilled case:
.addCase(signOutUser.fulfilled, (state) => {
  state.isLoading = false;
  state.user = null;
  state.userRole = null;
  state.isAuthenticated = false;
  state.error = null;
  
  // ✅ NEW: Clear activity logs on logout
  // This will be dispatched automatically via Redux middleware
});
```

**Update**: `src/App.tsx` or auth sync hook

```typescript
// In useAuthStateSync hook (when user signs out):
useEffect(() => {
  const unsubscribe = subscribeToAuthState((user) => {
    dispatch(setUser(user));
    
    if (!user) {
      // Clear all module data on logout
      dispatch(clearSites());
      dispatch(clearInventory());
      dispatch(clearRequests());
      dispatch(clearSteelMasters());
      dispatch(clearMaintenance());
      dispatch(clearActivityLogs()); // ✅ NEW
    }
  });
  
  return unsubscribe;
}, [dispatch]);
```

---

## Phase 7: Cloud Functions

### 7.1 Cloud Function Structure

**File**: `functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

/**
 * Helper: Create activity log
 */
async function createActivityLog(logData: {
  userId: string;
  userName: string;
  userRole: string;
  actionType: string;
  actionCategory: string;
  targetType: string;
  targetId: string;
  targetDisplay: string;
  summary: string;
  details: string;
  changes?: any[];
  deviceInfo?: string;
  ipAddress?: string;
  appVersion?: string;
}): Promise<void> {
  await db.collection('activityLogs').add({
    ...logData,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Firestore Trigger: Log Item Creation
 */
export const onItemCreated = functions.firestore
  .document('items/{itemId}')
  .onCreate(async (snapshot, context) => {
    const item = snapshot.data();
    const itemId = context.params.itemId;

    await createActivityLog({
      userId: item.createdBy || 'system',
      userName: item.createdByName || 'System',
      userRole: item.createdByRole || 'Admin',
      actionType: 'item_created',
      actionCategory: 'inventory',
      targetType: 'item',
      targetId: itemId,
      targetDisplay: `${item.name} (${item.sku})`,
      summary: `Created item: ${item.name}`,
      details: `Added new ${item.type} item to ${item.categoryName} category`,
      changes: [],
    });
  });

/**
 * Firestore Trigger: Log Request Creation
 */
export const onRequestCreated = functions.firestore
  .document('requests/{requestId}')
  .onCreate(async (snapshot, context) => {
    const request = snapshot.data();
    const requestId = context.params.requestId;

    await createActivityLog({
      userId: request.requestedBy,
      userName: request.requestedByName,
      userRole: 'SiteManager',
      actionType: 'request_created',
      actionCategory: 'requests',
      targetType: 'request',
      targetId: requestId,
      targetDisplay: request.requestNumber,
      summary: `Created request: ${request.requestNumber}`,
      details: `Request for ${request.items.length} items (${request.priority} priority)`,
      changes: [],
    });
  });

/**
 * Firestore Trigger: Log Request Status Change
 */
export const onRequestUpdated = functions.firestore
  .document('requests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const requestId = context.params.requestId;

    // Only log if status changed
    if (before.status !== after.status) {
      let actionType = 'request_edited';
      let summary = `Request ${after.requestNumber} status changed`;

      if (after.status === 'approved') {
        actionType = 'request_approved';
        summary = `Approved request: ${after.requestNumber}`;
      } else if (after.status === 'rejected') {
        actionType = 'request_rejected';
        summary = `Rejected request: ${after.requestNumber}`;
      } else if (after.status === 'transferred') {
        actionType = 'request_transferred';
        summary = `Transferred items for request: ${after.requestNumber}`;
      } else if (after.status === 'returned') {
        actionType = 'items_returned';
        summary = `Items returned for request: ${after.requestNumber}`;
      } else if (after.status === 'cancelled') {
        actionType = 'request_cancelled';
        summary = `Cancelled request: ${after.requestNumber}`;
      }

      await createActivityLog({
        userId: after.processedBy || after.requestedBy,
        userName: after.processedByName || after.requestedByName,
        userRole: after.processedByRole || 'SiteManager',
        actionType,
        actionCategory: 'requests',
        targetType: 'request',
        targetId: requestId,
        targetDisplay: after.requestNumber,
        summary,
        details: after.storeNotes || after.rejectionComments || '',
        changes: [
          {
            field: 'status',
            fieldLabel: 'Status',
            oldValue: before.status,
            newValue: after.status,
          },
        ],
      });
    }
  });

/**
 * Firestore Trigger: Log Maintenance Addition
 */
export const onMaintenanceAdded = functions.firestore
  .document('maintenance/{maintenanceId}')
  .onCreate(async (snapshot, context) => {
    const maintenance = snapshot.data();
    const maintenanceId = context.params.maintenanceId;

    await createActivityLog({
      userId: maintenance.addedBy,
      userName: maintenance.addedByName,
      userRole: 'StoreIncharge',
      actionType: 'maintenance_added',
      actionCategory: 'maintenance',
      targetType: 'maintenance',
      targetId: maintenanceId,
      targetDisplay: `${maintenance.itemName} (${maintenance.quantity} units)`,
      summary: `Moved ${maintenance.quantity} ${maintenance.itemName} to maintenance`,
      details: maintenance.issueDescription,
      changes: [],
    });
  });

/**
 * Firestore Trigger: Log Maintenance Status Change
 */
export const onMaintenanceUpdated = functions.firestore
  .document('maintenance/{maintenanceId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const maintenanceId = context.params.maintenanceId;

    // Only log if status changed
    if (before.status !== after.status) {
      let actionType = 'maintenance_updated';
      let summary = `Maintenance status changed`;

      if (after.status === 'returned') {
        actionType = 'maintenance_returned';
        summary = `Returned ${after.returnedQuantity} ${after.itemName} from maintenance`;
      } else if (after.status === 'written_off') {
        actionType = 'item_written_off';
        summary = `Written off ${after.itemName} (${after.writeOffReason})`;
      }

      await createActivityLog({
        userId: after.addedBy, // Or processedBy if available
        userName: after.addedByName,
        userRole: 'StoreIncharge',
        actionType,
        actionCategory: 'maintenance',
        targetType: 'maintenance',
        targetId: maintenanceId,
        targetDisplay: `${after.itemName} (${after.quantity} units)`,
        summary,
        details: after.repairSummary || after.writeOffExplanation || '',
        changes: [
          {
            field: 'status',
            fieldLabel: 'Status',
            oldValue: before.status,
            newValue: after.status,
          },
        ],
      });
    }
  });

/**
 * HTTP Function: Log Authentication Event (called from client)
 */
export const logAuthEvent = functions.https.onCall(async (data, context) => {
  // Verify authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { actionType, userName, userRole, details } = data;

  await createActivityLog({
    userId: context.auth.uid,
    userName: userName || context.auth.token.name || context.auth.token.email || 'Unknown',
    userRole: userRole || 'Unassigned',
    actionType,
    actionCategory: 'authentication',
    targetType: 'user',
    targetId: context.auth.uid,
    targetDisplay: userName || context.auth.token.email || 'User',
    summary: `${actionType === 'user_login' ? 'Logged in' : 'Logged out'}`,
    details: details || '',
    changes: [],
    deviceInfo: data.deviceInfo,
    ipAddress: context.rawRequest.ip,
    appVersion: data.appVersion,
  });

  return { success: true };
});
```

### 7.2 Deploy Cloud Functions

```bash
# Build functions
npm --prefix functions run build

# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:onItemCreated,functions:onRequestCreated
```

### 7.3 Call Cloud Function from Client (Auth Events)

**File**: `src/services/firebase/authService.ts`

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase'; // Import from firebase config

/**
 * Log authentication event via Cloud Function
 */
async function logAuthEvent(
  actionType: 'user_login' | 'user_logout',
  userName: string,
  userRole: string
): Promise<void> {
  try {
    const logAuthEventFn = httpsCallable(functions, 'logAuthEvent');
    await logAuthEventFn({
      actionType,
      userName,
      userRole,
      details: '',
      deviceInfo: 'Web/Mobile', // Or use react-native-device-info
      appVersion: '1.0.0', // Or use expo-constants
    });
  } catch (error) {
    console.error('Failed to log auth event:', error);
    // Don't throw - logging failure shouldn't block auth
  }
}

// Update signIn and logout functions
export async function signIn(email: string, password: string): Promise<User> {
  // ... existing code
  
  // ✅ NEW: Log login event
  const userRole = await getUserRole(user.uid);
  await logAuthEvent('user_login', user.displayName || email, userRole?.role || 'Unassigned');
  
  return user;
}

export async function logout(): Promise<void> {
  const user = auth.currentUser;
  
  // ✅ NEW: Log logout event
  if (user) {
    const userRole = await getUserRole(user.uid);
    await logAuthEvent('user_logout', user.displayName || user.email || 'User', userRole?.role || 'Unassigned');
  }
  
  await signOut(auth);
}
```

---

## Phase 8: Testing & Validation

### 8.1 Unit Tests

**File**: `src/services/firebase/__tests__/activityLogService.test.ts`

```typescript
import { listActivityLogs, getMyRecentActivity, exportActivityLogs } from '../activityLogService';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  // ... mocks
}));

describe('activityLogService', () => {
  describe('listActivityLogs', () => {
    it('should fetch activity logs with filters', async () => {
      // Test implementation
    });

    it('should paginate activity logs', async () => {
      // Test implementation
    });
  });

  describe('getMyRecentActivity', () => {
    it('should fetch user recent activity (max 10)', async () => {
      // Test implementation
    });
  });

  describe('exportActivityLogs', () => {
    it('should export logs as CSV string', async () => {
      // Test implementation
    });

    it('should respect maxRecords limit', async () => {
      // Test implementation
    });
  });
});
```

### 8.2 Component Tests

**File**: `src/components/ActivityLog/__tests__/ActivityLogCard.test.tsx`

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ActivityLogCard from '../ActivityLogCard';
import type { ActivityLog } from '../../../types/activityLog';

const mockLog: ActivityLog = {
  id: 'log_001',
  timestamp: new Date().toISOString(),
  userId: 'user_001',
  userName: 'John Doe',
  userRole: 'StoreIncharge',
  actionType: 'request_approved',
  actionCategory: 'requests',
  targetType: 'request',
  targetId: 'req_001',
  targetDisplay: 'REQ-2025-0001',
  summary: 'Approved request',
  details: 'Approved with all items',
  changes: [],
};

describe('ActivityLogCard', () => {
  it('should render activity log information', () => {
    const { getByText } = render(
      <ActivityLogCard log={mockLog} onPress={() => {}} />
    );

    expect(getByText('Request Approved')).toBeTruthy();
    expect(getByText('Approved request')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('REQ-2025-0001')).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const onPressMock = jest.fn();
    const { getByRole } = render(
      <ActivityLogCard log={mockLog} onPress={onPressMock} />
    );

    fireEvent.press(getByRole('button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
```

### 8.3 Integration Tests

**Test Scenarios:**

1. ✅ Admin can view full activity log
2. ✅ Admin can filter logs by date, user, action
3. ✅ Admin can export logs as CSV
4. ✅ User can view own recent 10 actions
5. ✅ User cannot view other users' logs
6. ✅ Logs are created automatically on actions
7. ✅ Logs cannot be edited or deleted

### 8.4 Security Rules Testing

**File**: `firestore.rules.test.ts` (if using Firebase Emulator)

```typescript
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

describe('activityLogs security rules', () => {
  it('should deny write access to all clients', async () => {
    const admin = getAdminContext();
    const user = getUserContext('user_001');

    await assertFails(admin.firestore().collection('activityLogs').add({}));
    await assertFails(user.firestore().collection('activityLogs').add({}));
  });

  it('should allow Admin to read all logs', async () => {
    const admin = getAdminContext();
    await assertSucceeds(admin.firestore().collection('activityLogs').get());
  });

  it('should allow user to read only own logs', async () => {
    const user = getUserContext('user_001');
    await assertSucceeds(
      user.firestore()
        .collection('activityLogs')
        .where('userId', '==', 'user_001')
        .get()
    );
  });

  it('should deny user from reading other users logs', async () => {
    const user = getUserContext('user_001');
    await assertFails(
      user.firestore()
        .collection('activityLogs')
        .where('userId', '==', 'user_002')
        .get()
    );
  });
});
```

---

## Implementation Checklist

### ✅ Phase 1: Data & Backend Setup

- Create `src/types/activityLog.ts`
- Create `src/constants/activityLogConfig.ts`
- Update `firestore.rules` with activityLogs rules
- Update `firestore.indexes.json` with composite indexes
- Deploy Firestore rules and indexes

### ✅ Phase 2: Service Layer

- Create `src/services/firebase/activityLogService.ts`
- Create `src/utils/csvExport.ts`
- Test service methods with mock data

### ✅ Phase 3: Redux State Management

- Create `src/store/slices/activityLogSlice.ts`
- Create `src/store/thunks/activityLogThunks.ts`
- Create `src/store/selectors/activityLogSelectors.ts`
- Update `src/store/index.ts` to register activityLog reducer
- Add serializable check ignores for activity logs

### ✅ Phase 4: Component Development

- Create `src/components/ActivityLog/ActivityLogCard.tsx`
- Create `src/components/ActivityLog/ActivityLogFilterModal.tsx`
- Create `src/components/ActivityLog/ActivityLogDetailModal.tsx`
- Create `src/components/ActivityLog/MyRecentActivityWidget.tsx`
- Create `src/components/ActivityLog/index.ts`
- Update `src/components/index.ts`

### ✅ Phase 5: Screen Development

- Create `src/screens/ActivityLog/ActivityLogScreen.tsx`
- Create `src/screens/ActivityLog/MyActivityScreen.tsx`
- Create `src/screens/ActivityLog/index.ts`
- Update `src/screens/index.ts`

### ✅ Phase 6: Integration

- Create `src/navigation/DashboardStackNavigator.tsx`
- Update `src/navigation/BottomTabNavigator.tsx`
- Update `src/screens/DashboardScreen.tsx` with navigation buttons
- Add `clearActivityLogs()` call on logout
- Test navigation flow

### ✅ Phase 7: Cloud Functions

- Create Cloud Function triggers in `functions/src/index.ts`
- Implement `onItemCreated`, `onRequestCreated`, `onRequestUpdated` triggers
- Implement `onMaintenanceAdded`, `onMaintenanceUpdated` triggers
- Implement `logAuthEvent` callable function
- Deploy Cloud Functions
- Update `authService.ts` to call `logAuthEvent`

### ✅ Phase 8: Testing

- Write unit tests for activityLogService
- Write component tests for ActivityLogCard
- Write integration tests for full flow
- Test security rules with Firebase Emulator
- Perform manual testing (Admin view, User view, Export)
- Verify Firestore rules prevent client writes
- Test pagination and filtering

### ✅ Documentation

- Update README with Activity Logging feature
- Document Cloud Function triggers
- Document CSV export format
- Create user guide for Activity Log (Admin)
- Create user guide for My Activity (All Users)

---

## Dependencies

### NPM Packages

```bash
# Date picker for filters
npm install @react-native-community/datetimepicker

# File system and sharing for CSV export
npm install expo-file-system expo-sharing

# Device info for metadata (optional)
npm install react-native-device-info

# Constants for app version (optional)
npm install expo-constants
```

### Firebase SDK

- ✅ Already configured: `firebase/firestore`, `firebase/auth`, `firebase/functions`
- ✅ Already configured: `firebase-admin` (for Cloud Functions)

---

## Considerations

### ⚠️ Edge Cases

1. **Large Log Volumes**: Pagination is critical for performance. Consider archiving logs after 1 year.
2. **Search Performance**: Firestore doesn't support full-text search. For production, consider Algolia.
3. **Export Limits**: Max 1000 records per export to prevent memory issues.
4. **Timezone Handling**: All timestamps use server time (UTC). Display with user's locale.
5. **Deleted Users**: Log includes userName at time of action; survives user deletion.
6. **Failed Actions**: Only successful actions are logged (not failed attempts except login failures).

### 🔐 Security

1. **Immutability**: Enforced by Firestore rules (no client writes).
2. **Server Timestamps**: Cannot be manipulated by clients.
3. **Admin-Only Access**: Full logs visible only to Admin role.
4. **User Privacy**: Users see only their own logs (last 10 actions).
5. **IP Address**: Captured for security audit (consider GDPR compliance).

### ⚡ Performance

1. **Indexes**: Composite indexes for efficient queries.
2. **Pagination**: 20 records per page for optimal load time.
3. **Real-time vs One-time**: Activity Log uses one-time reads (not real-time subscriptions).
4. **Export**: Consider background job for large exports (if > 1000 records needed).

### 🚀 Future Enhancements

1. **Advanced Search**: Integrate Algolia for full-text search.
2. **Log Retention Policy**: Auto-archive logs after 1 year.
3. **Detailed Analytics**: Dashboard with charts and statistics.
4. **Audit Report Generation**: Scheduled PDF reports for compliance.
5. **Email Notifications**: Alert Admin on critical actions.
6. **Real-time Monitoring**: Live dashboard for Admin to monitor all actions.

---

## Success Criteria

### Definition of Done

✅ **Functional Requirements Met**:

- Admin can view, filter, and export activity logs
- All users can view their own recent 10 actions
- Logs are created automatically for all significant actions
- Logs are immutable (cannot be edited or deleted)

✅ **Security Requirements Met**:

- Only Cloud Functions can create logs
- Firestore rules enforce read-only access
- Admin-only access to full logs
- Users can only view own logs

✅ **Performance Requirements Met**:

- Pagination works smoothly (20 records per page)
- Filtering is responsive (< 2 seconds)
- Export completes successfully (< 5 seconds for 1000 records)

✅ **Testing Requirements Met**:

- All unit tests pass
- All component tests pass
- Integration tests pass
- Security rules tests pass
- Manual testing complete

✅ **Documentation Complete**:

- README updated
- User guides created
- API documentation complete

---

## Conclusion

This implementation plan provides a **complete roadmap** for adding Activity Logging and Audit Trail to the CIAMS application. The plan follows the existing architecture patterns, leverages reusable components, and ensures security through Firestore rules and Cloud Functions.

**Estimated Timeline**: 4-6 weeks (1 developer)

**Priority**: High (compliance and security requirement)

**Dependencies**: None (can be implemented in parallel with other features)

**Risks**: Minimal (leverages existing Firebase infrastructure)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-20  
**Next Review**: After Phase 3 completion