# Authentication Flow with Role Loading

## Updated Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ User Action: Login / Signup                                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │ Firebase Authentication    │
                │ (signIn / signUp)          │
                └────────────┬───────────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │ useAuthStateSync           │
                │ - Detects auth change      │
                │ - Dispatches setUser()     │
                │ - Sets isRoleLoading=true  │
                └────────────┬───────────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │ App.tsx renders:           │
                │ isAuthenticated = true     │
                │ isRoleLoading = true       │
                │                            │
                │ → Shows LoadingScreen      │
                └────────────┬───────────────┘
                             │
                   ┌─────────┴─────────┐
                   │                   │
                   ▼                   ▼
      ┌──────────────────────┐    ┌──────────────────────┐
      │ useUserRoleSync      │    │ LoadingScreen        │
      │ - Fetches role from  │    │ "Loading your        │
      │   Firestore          │    │  profile..."         │
      │ - getUserRole()      │    │                      │
      └──────────┬───────────┘    └──────────────────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │ setUserRole()        │
      │ - Sets userRole      │
      │ - Sets isRoleLoading │
      │   = false            │
      └──────────┬───────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │ App.tsx re-renders:  │
      │ isAuthenticated=true │
      │ isRoleLoading=false  │
      │                      │
      │ → Shows              │
      │   SignedInScreen     │
      └──────────────────────┘
```

## Key Changes

### 1. New State Property: `isRoleLoading`

Added to `AuthState`:
```typescript
interface AuthState {
  user: User | null;
  userRole: UserRoleData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRoleLoading: boolean;  // ← NEW
  error: string | null;
}
```

### 2. New Reducer: `setRoleLoading`

```typescript
setRoleLoading: (state, action: PayloadAction<boolean>) => {
  state.isRoleLoading = action.payload;
}
```

### 3. Updated `setUser` Reducer

When user logs in, automatically set `isRoleLoading = true`:
```typescript
setUser: (state, action: PayloadAction<User | null>) => {
  state.user = action.payload;
  state.isAuthenticated = action.payload !== null;
  state.error = null;
  if (action.payload === null) {
    state.userRole = null;
    state.isRoleLoading = false;
  } else {
    state.isRoleLoading = true;  // ← Start loading role
  }
}
```

### 4. Updated `useUserRoleSync` Hook

Now explicitly manages loading state:
```typescript
export const useUserRoleSync = (userId: string | null): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!userId) {
      dispatch(setUserRole(null));
      dispatch(setRoleLoading(false));
      return;
    }

    const fetchUserRole = async () => {
      dispatch(setRoleLoading(true));  // ← Start loading
      try {
        const userRole = await getUserRole(userId);
        dispatch(setUserRole(userRole));  // ← Sets isRoleLoading=false
      } catch (error) {
        console.error('Error fetching user role:', error);
        dispatch(setUserRole({
          role: 'SiteManager',
          isActive: true,
          permissions: [],
        }));
      }
    };

    fetchUserRole();
  }, [userId, dispatch]);
};
```

### 5. New Selectors

```typescript
export const selectRoleLoading = createSelector(
  [selectAuthState],
  (auth) => auth.isRoleLoading
);

export const selectIsRoleLoaded = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated ? auth.userRole !== null : true
);
```

### 6. New LoadingScreen Component

Simple, reusable loading screen:
```typescript
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text className="text-[15px] text-[#64748B] mt-4">{message}</Text>
      </View>
    </SafeAreaView>
  );
};
```

### 7. Updated App.tsx Logic

Conditional rendering based on loading state:
```typescript
function AppContent() {
  useAuthStateSync();
  const userId = useAppSelector(selectUserId);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRoleLoading = useAppSelector(selectRoleLoading);
  
  useUserRoleSync(userId);

  // Wait for role data before showing SignedInScreen
  if (isAuthenticated && isRoleLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  return (
    <>
      <StatusBar style="dark" />
      {isAuthenticated ? <SignedInScreen /> : <AuthFlowScreen />}
    </>
  );
}
```

## User Experience Flow

1. **User logs in**
   - Sees login screen with loading indicator on button
   - Firebase authenticates user

2. **Brief transition**
   - LoadingScreen appears: "Loading your profile..."
   - Firestore fetches user role data
   - Duration: typically 100-500ms

3. **SignedInScreen appears**
   - Only shown AFTER role data is loaded
   - Displays complete user information including:
     - Name
     - Email
     - User ID
     - **Role** (Admin/StoreIncharge/SiteManager)
     - **Status** (Active/Inactive)
     - **Permissions** (list of granted permissions)

## Why This Matters

**Before:**
- SignedInScreen would render immediately
- Role data would be `null` initially
- UI would show incomplete information
- Components checking roles/permissions would see `null` values

**After:**
- SignedInScreen only renders when role data is available
- Complete user profile is always shown
- No flash of missing data
- Components can safely assume role data exists when screen is visible

## Edge Cases Handled

1. **Network error during role fetch:**
   - Default role assigned (`SiteManager`)
   - User can still access the app
   - Error logged to console

2. **User logs out:**
   - `isRoleLoading` reset to `false`
   - `userRole` cleared to `null`

3. **First-time user (new signup):**
   - Role document created during signup
   - Same loading flow applies
   - Smooth transition to SignedInScreen

## Performance

- **Fast networks:** LoadingScreen appears for ~100-200ms (barely noticeable)
- **Slow networks:** LoadingScreen provides clear feedback
- **Cached data:** Future improvements could use Firestore cache for instant loading

This ensures **data consistency** and prevents showing the SignedInScreen until all critical user data is available.
