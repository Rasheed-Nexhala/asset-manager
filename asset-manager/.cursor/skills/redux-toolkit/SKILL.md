---
name: redux-toolkit
description: Implements Redux state management using Redux Toolkit (configureStore, createSlice) and RTK Query for data fetching. Use when setting up Redux store, creating slices, managing async actions, or implementing API data fetching with caching.
---

# Redux Toolkit & RTK Query

## Core Principles

- **Always use Redux Toolkit** - never use legacy `createStore` from `redux` package
- **Use `configureStore`** instead of `createStore`
- **Use `createSlice`** for reducer logic instead of manual reducers
- **Use RTK Query** for data fetching and caching instead of manual async thunks
- **Single store** - only one store per application

## Store Setup

### Basic Store Configuration

Use `configureStore` from `@reduxjs/toolkit`:

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Store Provider Setup

```typescript
// App.tsx or index.ts
import { Provider } from 'react-redux';
import { store } from './store';

const App = () => {
  return (
    <Provider store={store}>
      {/* Your app components */}
    </Provider>
  );
};
```

### Typed Hooks

Create typed hooks for better TypeScript support:

```typescript
// store/hooks.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

## Creating Slices with createSlice

### Basic Slice Structure

```typescript
// store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
```

### Async Actions with createAsyncThunk

For complex async logic that doesn't fit RTK Query:

```typescript
// store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface LoginCredentials {
  email: string;
  password: string;
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // sync reducers
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});
```

## RTK Query Setup

### API Slice Base Setup

```typescript
// store/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

const baseQuery = fetchBaseQuery({
  baseUrl: 'https://api.example.com',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Post', 'Comment'], // For cache invalidation
  endpoints: () => ({}),
});
```

### Creating API Endpoints

```typescript
// store/api/usersApi.ts
import { apiSlice } from './apiSlice';

interface User {
  id: string;
  name: string;
  email: string;
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<User, Partial<User>>({
      query: (newUser) => ({
        url: '/users',
        method: 'POST',
        body: newUser,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'User', id }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
```

## Using RTK Query in Components

### Query Hook Usage

```typescript
// components/UserList.tsx
import { useGetUsersQuery } from '@/store/api/usersApi';

const UserList = () => {
  const { data, error, isLoading, refetch } = useGetUsersQuery();

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error loading users</Text>;

  return (
    <View>
      {data?.map((user) => (
        <Text key={user.id}>{user.name}</Text>
      ))}
    </View>
  );
};
```

### Mutation Hook Usage

```typescript
// components/CreateUser.tsx
import { useCreateUserMutation } from '@/store/api/usersApi';

const CreateUser = () => {
  const [createUser, { isLoading, error }] = useCreateUserMutation();

  const handleSubmit = async (userData: Partial<User>) => {
    try {
      await createUser(userData).unwrap();
      // Success - cache automatically invalidated
    } catch (err) {
      // Handle error
      console.error('Failed to create user:', err);
    }
  };

  return (
    <Button
      onPress={() => handleSubmit({ name: 'John', email: 'john@example.com' })}
      disabled={isLoading}
    >
      Create User
    </Button>
  );
};
```

### Query with Parameters

```typescript
// components/UserDetail.tsx
import { useGetUserByIdQuery } from '@/store/api/usersApi';

const UserDetail = ({ userId }: { userId: string }) => {
  const { data: user, isLoading, error } = useGetUserByIdQuery(userId, {
    skip: !userId, // Skip query if userId is not available
    pollingInterval: 5000, // Poll every 5 seconds
  });

  if (isLoading) return <Text>Loading...</Text>;
  if (error || !user) return <Text>User not found</Text>;

  return <Text>{user.name}</Text>;
};
```

## Cache Management

### Tag-Based Cache Invalidation

```typescript
// Automatically invalidate related queries
export const postsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPosts: builder.query<Post[], void>({
      query: () => '/posts',
      providesTags: ['Post'],
    }),
    createPost: builder.mutation<Post, Partial<Post>>({
      query: (newPost) => ({
        url: '/posts',
        method: 'POST',
        body: newPost,
      }),
      invalidatesTags: ['Post'], // Refetches getPosts
    }),
    updatePost: builder.mutation<Post, { id: string; data: Partial<Post> }>({
      query: ({ id, data }) => ({
        url: `/posts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Post', id }, // Invalidate specific post
        'Post', // Invalidate all posts list
      ],
    }),
  }),
});
```

### Manual Cache Updates

```typescript
// Optimistic updates
updatePost: builder.mutation<Post, { id: string; data: Partial<Post> }>({
  query: ({ id, data }) => ({
    url: `/posts/${id}`,
    method: 'PUT',
    body: data,
  }),
  async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
    // Optimistic update
    const patchResult = dispatch(
      postsApi.util.updateQueryData('getPostById', id, (draft) => {
        Object.assign(draft, data);
      })
    );

    try {
      await queryFulfilled;
    } catch {
      // Rollback on error
      patchResult.undo();
    }
  },
  invalidatesTags: [{ type: 'Post', id }],
}),
```

## Selectors

### Using Selectors with RTK Query

```typescript
// Selectors for RTK Query cache
import { usersApi } from './api/usersApi';

// Get cached data
const selectUsersResult = usersApi.endpoints.getUsers.select();

// In component
const UserList = () => {
  const { data, isLoading } = useAppSelector(selectUsersResult);
  // ...
};
```

### Custom Selectors

```typescript
// store/selectors/authSelectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

const selectAuthState = (state: RootState) => state.auth;

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
);

export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

// Usage in component
const MyComponent = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  // ...
};
```

## Folder Structure

```
src/
├── store/
│   ├── index.ts              # Store configuration
│   ├── hooks.ts              # Typed hooks
│   ├── api/
│   │   ├── apiSlice.ts       # Base API slice
│   │   ├── usersApi.ts       # Users endpoints
│   │   └── postsApi.ts       # Posts endpoints
│   ├── slices/
│   │   ├── authSlice.ts      # Auth slice
│   │   └── uiSlice.ts        # UI state slice
│   └── selectors/
│       ├── authSelectors.ts  # Auth selectors
│       └── userSelectors.ts # User selectors
```

## Best Practices

### 1. Prefer RTK Query for API Calls

- ✅ Use RTK Query for all API/data fetching
- ❌ Avoid manual `createAsyncThunk` for simple API calls
- ✅ Use `createAsyncThunk` only for complex async logic

### 2. Immutability

Redux Toolkit uses Immer internally, so you can write "mutating" logic:

```typescript
// ✅ Good - Immer handles immutability
reducers: {
  updateUser: (state, action) => {
    state.user.name = action.payload.name; // Looks like mutation, but safe
  },
}
```

### 3. Error Handling

```typescript
// RTK Query error handling
const { data, error, isLoading } = useGetUsersQuery();

if (error) {
  if ('status' in error) {
    // RTK Query error
    const errMsg = 'error' in error ? error.error : JSON.stringify(error.data);
    console.error('API error:', errMsg);
  } else {
    // Network error
    console.error('Network error:', error.message);
  }
}
```

### 4. TypeScript Types

Always define types for state, actions, and API responses:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
```

### 5. Middleware Order

RTK Query middleware must come after default middleware:

```typescript
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },
  }).concat(apiSlice.middleware),
```

## React Native Considerations

### Persistence (Optional)

```typescript
// store/index.ts
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist auth slice
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    // ...
  },
});

export const persistor = persistStore(store);
```

### Network Error Handling

```typescript
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result?.error?.status === 401) {
    // Try to refresh token
    const refreshResult = await baseQuery('/refresh', api, extraOptions);
    if (refreshResult?.data) {
      // Retry original query
      result = await baseQuery(args, api, extraOptions);
    }
  }
  
  return result;
};
```

## Quick Reference Checklist

When setting up Redux:

- [ ] Use `configureStore` from `@reduxjs/toolkit`
- [ ] Use `createSlice` for reducer logic
- [ ] Use RTK Query for API calls
- [ ] Create typed hooks (`useAppDispatch`, `useAppSelector`)
- [ ] Define TypeScript interfaces for all state
- [ ] Use tag-based cache invalidation
- [ ] Place store in `src/store/` directory
- [ ] Separate API slices by domain
- [ ] Use selectors for derived state
- [ ] Handle loading and error states in components
