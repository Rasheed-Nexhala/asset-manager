---
name: rtk-query
description: Implement data fetching and caching in React Native apps using RTK Query with Redux Toolkit. Use when working with APIs, REST endpoints, data fetching, caching, mutations, or when the user mentions RTK Query, Redux Toolkit, or API integration in React Native.
---

# RTK Query for React Native

RTK Query is Redux Toolkit's powerful data fetching and caching tool. This skill guides you through implementing efficient API integration in React Native applications.

## Core Concepts

RTK Query automates:
- Data fetching and caching
- Loading and error states
- Request deduplication
- Cache invalidation
- Optimistic updates

## Quick Start

### 1. Create an API Slice

**Location**: `src/services/api.ts` or `src/store/api/[featureName]Api.ts`

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://your-api.com/api',
    prepareHeaders: (headers, { getState }) => {
      // Add auth token if available
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Asset', 'Category'],
  endpoints: (builder) => ({}),
});
```

### 2. Define Endpoints

Add endpoints using `builder.query` for GET and `builder.mutation` for POST/PUT/DELETE:

```typescript
export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query (GET)
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    
    // Query with params
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    // Mutation (POST/PUT/DELETE)
    createUser: builder.mutation<User, Partial<User>>({
      query: (newUser) => ({
        url: '/users',
        method: 'POST',
        body: newUser,
      }),
      invalidatesTags: ['User'],
    }),
    
    // Update mutation
    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    
    // Delete mutation
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi;
```

### 3. Configure the Store

**Location**: `src/store/store.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    // other reducers...
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 4. Use in Components

```typescript
import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useGetUsersQuery } from '../services/userApi';

export const UserListScreen = () => {
  const { data: users, isLoading, isError, error, refetch } = useGetUsersQuery();

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  if (isError) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Text>{item.name}</Text>}
      onRefresh={refetch}
      refreshing={isLoading}
    />
  );
};
```

## Cache Invalidation Patterns

### Tag-Based Invalidation

Tags create relationships between queries and mutations:

```typescript
endpoints: (builder) => ({
  // Query provides tags
  getAssets: builder.query<Asset[], { categoryId?: string }>({
    query: ({ categoryId }) => 
      categoryId ? `/assets?category=${categoryId}` : '/assets',
    providesTags: (result) =>
      result
        ? [
            ...result.map(({ id }) => ({ type: 'Asset' as const, id })),
            { type: 'Asset', id: 'LIST' },
          ]
        : [{ type: 'Asset', id: 'LIST' }],
  }),
  
  // Mutation invalidates tags
  createAsset: builder.mutation<Asset, NewAsset>({
    query: (asset) => ({
      url: '/assets',
      method: 'POST',
      body: asset,
    }),
    // Invalidate the list, causing refetch
    invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
  }),
  
  updateAsset: builder.mutation<Asset, { id: string; data: Partial<Asset> }>({
    query: ({ id, data }) => ({
      url: `/assets/${id}`,
      method: 'PUT',
      body: data,
    }),
    // Invalidate specific item AND the list
    invalidatesTags: (result, error, { id }) => [
      { type: 'Asset', id },
      { type: 'Asset', id: 'LIST' },
    ],
  }),
});
```

### Manual Cache Updates (Optimistic Updates)

For instant UI feedback:

```typescript
updateAsset: builder.mutation<Asset, { id: string; data: Partial<Asset> }>({
  query: ({ id, data }) => ({
    url: `/assets/${id}`,
    method: 'PUT',
    body: data,
  }),
  async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
    // Optimistically update the cache
    const patchResult = dispatch(
      api.util.updateQueryData('getAssetById', id, (draft) => {
        Object.assign(draft, data);
      })
    );
    
    try {
      await queryFulfilled;
    } catch {
      // Undo the optimistic update on error
      patchResult.undo();
    }
  },
}),
```

## Handling Loading States

RTK Query provides granular loading states:

```typescript
const {
  data,
  isLoading,      // First fetch in progress
  isFetching,     // Any fetch in progress (including refetch)
  isSuccess,      // Query succeeded
  isError,        // Query failed
  error,          // Error object
  refetch,        // Manual refetch function
} = useGetAssetsQuery();

// Common pattern for React Native
if (isLoading) {
  return <LoadingSpinner />;
}

if (isError) {
  return <ErrorView error={error} onRetry={refetch} />;
}

return <ContentView data={data} onRefresh={refetch} refreshing={isFetching} />;
```

## Conditional Fetching

Skip queries until conditions are met:

```typescript
const UserProfile = ({ userId }: { userId?: string }) => {
  const { data } = useGetUserByIdQuery(userId!, {
    skip: !userId, // Don't fetch until userId exists
  });
  
  return data ? <Profile user={data} /> : <Text>Select a user</Text>;
};
```

## Polling for Real-Time Data

Automatically refetch at intervals:

```typescript
const { data } = useGetAssetsQuery(undefined, {
  pollingInterval: 30000, // Refetch every 30 seconds
});

// Or conditionally poll
const [shouldPoll, setShouldPoll] = useState(false);

const { data } = useGetAssetsQuery(undefined, {
  pollingInterval: shouldPoll ? 5000 : 0,
});
```

## Query Transformations

Transform API responses before caching:

```typescript
getAssets: builder.query<Asset[], void>({
  query: () => '/assets',
  transformResponse: (response: { data: RawAsset[] }) => {
    // Transform API format to app format
    return response.data.map(asset => ({
      id: asset.asset_id,
      name: asset.asset_name,
      createdAt: new Date(asset.created_at),
    }));
  },
}),
```

## Error Handling Patterns

### Global Error Handling

```typescript
const baseQuery = fetchBaseQuery({
  baseUrl: 'https://your-api.com/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error?.status === 401) {
    // Handle token refresh
    const refreshResult = await baseQuery('/auth/refresh', api, extraOptions);
    
    if (refreshResult.data) {
      // Store new token and retry
      api.dispatch(setToken(refreshResult.data.token));
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Logout user
      api.dispatch(logout());
    }
  }
  
  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  // ...
});
```

### Component-Level Error Handling

```typescript
const [createAsset, { isLoading, error }] = useCreateAssetMutation();

const handleSubmit = async (data: NewAsset) => {
  try {
    await createAsset(data).unwrap();
    navigation.goBack();
  } catch (err) {
    if ('status' in err) {
      // Handle API errors
      Alert.alert('Error', `Failed to create asset: ${err.status}`);
    } else {
      // Handle network errors
      Alert.alert('Error', 'Network error. Please try again.');
    }
  }
};
```

## Code Organization

### Feature-Based Structure

```
src/
├── store/
│   ├── store.ts                 # Store configuration
│   └── api/
│       ├── baseApi.ts           # Base API slice
│       ├── assetsApi.ts         # Assets endpoints
│       ├── usersApi.ts          # Users endpoints
│       └── categoriesApi.ts     # Categories endpoints
└── features/
    └── assets/
        ├── components/
        ├── screens/
        └── hooks/
            └── useAssetOperations.ts  # Custom hooks wrapping RTK Query
```

### Splitting APIs

Split large APIs into feature-specific files:

```typescript
// baseApi.ts
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),
  tagTypes: ['User', 'Asset', 'Category'],
  endpoints: () => ({}),
});

// assetsApi.ts
import { baseApi } from './baseApi';

export const assetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAssets: builder.query<Asset[], void>({
      query: () => '/assets',
      providesTags: ['Asset'],
    }),
  }),
});

export const { useGetAssetsQuery } = assetsApi;
```

## React Native Specific Considerations

### Network State Handling

```typescript
import NetInfo from '@react-native-community/netinfo';

// Skip queries when offline
const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOnline(state.isConnected ?? false);
  });
  return unsubscribe;
}, []);

const { data } = useGetAssetsQuery(undefined, {
  skip: !isOnline,
});
```

### Offline-First with RTK Query

While RTK Query doesn't have built-in offline support, combine with Redux Persist:

```typescript
import { persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistConfig = {
  key: 'api',
  storage: AsyncStorage,
  whitelist: [], // Don't persist by default
};

export const store = configureStore({
  reducer: {
    [api.reducerPath]: persistReducer(persistConfig, api.reducer),
  },
});
```

## Common Patterns Checklist

When implementing RTK Query endpoints:

- [ ] Use `providesTags` on queries for automatic invalidation
- [ ] Use `invalidatesTags` on mutations to trigger refetches
- [ ] Add loading and error state handling in components
- [ ] Include auth headers in `prepareHeaders`
- [ ] Transform responses if API format differs from app format
- [ ] Use TypeScript types for requests and responses
- [ ] Skip queries conditionally with `skip` option
- [ ] Handle errors at both global and component level
- [ ] Use optimistic updates for better UX on mutations

## Additional Resources

For detailed examples and common use cases, see [examples.md](examples.md).

## Quick Reference

| Hook Return | Description |
|-------------|-------------|
| `data` | The actual response data |
| `isLoading` | True on first fetch only |
| `isFetching` | True on any fetch (including background) |
| `isSuccess` | True when query succeeded |
| `isError` | True when query failed |
| `error` | Error object if query failed |
| `refetch` | Function to manually refetch |

| Mutation Hook Return | Description |
|---------------------|-------------|
| `[trigger, result]` | Function to call mutation + result object |
| `result.isLoading` | True while mutation in progress |
| `result.isSuccess` | True when mutation succeeded |
| `result.isError` | True when mutation failed |
| `result.data` | Response data from mutation |
| `result.reset` | Reset mutation state |
