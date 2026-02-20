# Real-Time Activity Logs Implementation

## Overview

The Activity Logging system now uses **Firestore snapshot listeners** for real-time updates. This means activity logs update **immediately** as new events occur in the system, without requiring manual refresh.

## Architecture

### 1. Service Layer - Snapshot Subscriptions

**File**: `src/services/firebase/activityLogService.ts`

Added two new real-time subscription functions:

```typescript
// Subscribe to activity logs with filters (Admin view)
export function subscribeToActivityLogs(
  filters: ActivityLogFiltersStore | undefined,
  pageSize: number,
  onUpdate: (logs: ActivityLog[]) => void,
  onError: (error: Error) => void
): Unsubscribe

// Subscribe to user's own recent activity
export function subscribeToMyRecentActivity(
  userId: string,
  onUpdate: (logs: ActivityLog[]) => void,
  onError: (error: Error) => void
): Unsubscribe
```

**Key Features**:
- Uses `onSnapshot()` instead of `getDocs()` for real-time listening
- Supports all filters (date range, user, action category, action type)
- Returns `Unsubscribe` function for cleanup
- Error handling with callbacks
- Same query structure as one-time fetch functions

### 2. Redux State Management

#### Slice Updates (`src/store/slices/activityLogSlice.ts`)

Added two new reducers for handling snapshot updates:

```typescript
updateLogsFromSnapshot: (state, action: PayloadAction<ActivityLog[]>) => {
  state.logs = action.payload;
  state.loading = false;
  state.error = null;
  state.hasMore = action.payload.length >= PAGE_SIZE;
},

updateMyActivityFromSnapshot: (state, action: PayloadAction<ActivityLog[]>) => {
  state.myRecentActivity = action.payload;
  state.myActivityLoading = false;
  state.error = null;
}
```

#### Thunk Updates (`src/store/thunks/activityLogThunks.ts`)

Added subscription management functions:

1. **`subscribeToActivityLogsRealtime()`**
   - Sets up real-time listener for full activity logs (Admin view)
   - Automatically unsubscribes from previous listener
   - Dispatches `updateLogsFromSnapshot` when data changes

2. **`subscribeToMyRecentActivityRealtime(userId)`**
   - Sets up real-time listener for user's own activity
   - Automatically unsubscribes from previous listener
   - Dispatches `updateMyActivityFromSnapshot` when data changes

3. **`unsubscribeFromActivityLogs()`**
   - Cleans up activity logs subscription

4. **`unsubscribeFromMyRecentActivity()`**
   - Cleans up recent activity subscription

**Subscription Management**:
```typescript
// Module-level variables store unsubscribe functions
let activityLogsUnsubscribe: (() => void) | null = null;
let myActivityUnsubscribe: (() => void) | null = null;
```

### 3. Component Integration

#### ActivityLogScreen (Admin View)

**File**: `src/screens/ActivityLog/ActivityLogScreen.tsx`

```typescript
useEffect(() => {
  // Subscribe on mount and when filters change
  dispatch(subscribeToActivityLogsRealtime());

  // Cleanup: unsubscribe on unmount
  return () => {
    dispatch(unsubscribeFromActivityLogs());
  };
}, [dispatch, filters]);
```

**Changes**:
- ❌ Removed: `fetchActivityLogs()` on mount
- ✅ Added: `subscribeToActivityLogsRealtime()` subscription
- ✅ Added: Cleanup with `unsubscribeFromActivityLogs()` on unmount
- ✅ Auto-resubscribes when filters change

#### MyActivityScreen (User View)

**File**: `src/screens/ActivityLog/MyActivityScreen.tsx`

```typescript
useEffect(() => {
  if (userId) {
    dispatch(subscribeToMyRecentActivityRealtime(userId));
  }

  return () => {
    dispatch(unsubscribeFromMyRecentActivity());
  };
}, [dispatch, userId]);
```

**Changes**:
- ❌ Removed: `fetchMyRecentActivity()` one-time fetch
- ✅ Added: `subscribeToMyRecentActivityRealtime()` subscription
- ✅ Added: Cleanup with `unsubscribeFromMyRecentActivity()` on unmount

#### MyRecentActivityWidget (Dashboard Widget)

**File**: `src/components/ActivityLog/MyRecentActivityWidget.tsx`

```typescript
useEffect(() => {
  if (userId) {
    dispatch(subscribeToMyRecentActivityRealtime(userId));
  }

  return () => {
    dispatch(unsubscribeFromMyRecentActivity());
  };
}, [dispatch, userId]);
```

**Changes**:
- ❌ Removed: `fetchMyRecentActivity()` one-time fetch
- ✅ Added: Real-time subscription for dashboard widget
- ✅ Widget updates immediately as user performs actions

## Real-Time Update Flow

### When a New Activity Log is Created:

```
1. User performs action (e.g., login, create item, approve request)
   ↓
2. Cloud Function creates activity log in Firestore
   ↓
3. Firestore triggers snapshot listeners (onSnapshot)
   ↓
4. Service layer receives updated data
   ↓
5. onUpdate callback dispatches Redux action
   ↓
6. Redux state updates with new logs
   ↓
7. React components re-render automatically
   ↓
8. UI shows new log immediately (no refresh needed)
```

### Timeline:
- **Cloud Function execution**: ~100-500ms
- **Firestore write + snapshot trigger**: ~50-200ms
- **Redux update + React re-render**: ~16-50ms
- **Total perceived latency**: ~200-750ms (near-instant)

## Benefits

### 1. **Real-Time Audit Trail**
- Admins see new activities immediately without refreshing
- Users see their own actions appear instantly
- Dashboard widget stays up-to-date automatically

### 2. **Better User Experience**
- No manual refresh required
- Loading states only on initial mount
- Smooth, modern feel

### 3. **Efficient Resource Usage**
- Only subscribes when screen/widget is mounted
- Automatic cleanup prevents memory leaks
- Firestore optimizes snapshot delivery (sends only changes)

### 4. **Accurate Filtering**
- Real-time updates respect active filters
- Changing filters automatically resubscribes with new query
- No stale data

## Memory & Performance Considerations

### Automatic Cleanup
All subscriptions are **automatically cleaned up** when:
- Component unmounts
- User navigates away
- Filters change (old subscription closed, new one created)
- User logs out (`clearActivityLogs()` action)

### Subscription Management
```typescript
// Before creating new subscription, always cleanup old one
if (activityLogsUnsubscribe) {
  activityLogsUnsubscribe();
  activityLogsUnsubscribe = null;
}
```

### Firestore Efficiency
- Firestore sends only **changed documents**, not entire result set
- Snapshot listeners use persistent connections (WebSocket-like)
- Minimal bandwidth usage after initial query

## Testing Real-Time Updates

### To Test Immediately:

1. **Deploy Cloud Functions** (if not already done):
   ```bash
   cd /Applications/React/Nexhala/asset-manager/asset-manager
   firebase deploy --only functions
   ```

2. **Open Activity Log Screen** (Admin):
   - Navigate to Dashboard → "Activity Log" button
   - Keep screen open

3. **Perform Action in Another Device/Session**:
   - Login on another device
   - Create an item
   - Approve a request
   - Any system action

4. **Observe Real-Time Update**:
   - New log appears **immediately** without refresh
   - No need to pull-to-refresh
   - Loading spinner only shows on initial mount

### To Test on Dashboard Widget:

1. Open Dashboard (any user)
2. Keep widget visible
3. Perform an action (create item, submit request, etc.)
4. Widget updates **immediately** with your new action

## Migration Notes

### Old Approach (One-Time Fetch)
```typescript
// ❌ Old: Manual fetch required refresh
useEffect(() => {
  dispatch(fetchActivityLogs());
}, [dispatch]);

// User had to pull-to-refresh to see new logs
```

### New Approach (Real-Time Subscription)
```typescript
// ✅ New: Real-time updates automatically
useEffect(() => {
  dispatch(subscribeToActivityLogsRealtime());
  return () => dispatch(unsubscribeFromActivityLogs());
}, [dispatch, filters]);

// New logs appear automatically (no refresh needed)
```

## Backward Compatibility

The old fetch functions (`fetchActivityLogs`, `fetchMyRecentActivity`) are **still available** for:
- CSV export (fetches all records once)
- Pagination "Load More" (fetches next page)
- Search functionality (client-side filtering)

Real-time subscriptions are **only used for initial view and live updates**.

## Future Enhancements

### Potential Improvements:

1. **Real-Time Pagination**:
   - Current: Real-time only for first page (20 logs)
   - Future: Subscribe to paginated results (complex query)

2. **Optimistic Updates**:
   - Show user's own actions immediately (before Cloud Function)
   - Confirm/replace with server version when snapshot arrives

3. **Offline Support**:
   - Firestore offline cache enables local-first approach
   - Snapshots work offline and sync when online

4. **Push Notifications**:
   - Integrate with FCM for background updates
   - Notify admins of critical actions even when app is closed

## Troubleshooting

### Logs Not Updating in Real-Time?

1. **Check Cloud Functions are deployed**:
   ```bash
   firebase functions:list
   ```

2. **Check Firestore Rules** (should allow read):
   ```
   // Admin: read all logs
   allow read: if request.auth.token.role == 'Admin';
   
   // User: read own logs
   allow read: if request.auth.uid == resource.data.userId;
   ```

3. **Check Network Connection**:
   - Firestore snapshots require active connection
   - Offline mode caches data but doesn't receive new updates

4. **Check Console for Errors**:
   - `onError` callback logs errors to console
   - Look for "activity logs snapshot" errors

### Memory Leaks?

Ensure `unsubscribe` is called in cleanup:
```typescript
useEffect(() => {
  dispatch(subscribeToActivityLogsRealtime());
  
  // IMPORTANT: Return cleanup function
  return () => {
    dispatch(unsubscribeFromActivityLogs());
  };
}, [dispatch]);
```

## Summary

✅ **Real-time updates implemented**  
✅ **Automatic cleanup on unmount**  
✅ **Filter changes trigger resubscribe**  
✅ **Memory-efficient with proper unsubscribe**  
✅ **Works for Admin logs, User activity, and Dashboard widget**  
✅ **No breaking changes (backward compatible)**  

Activity logs now provide a **live audit trail** with near-instant updates across all screens and components.
