# RTK Query Examples for React Native

This file contains practical, real-world examples of using RTK Query in React Native applications.

## Table of Contents

1. [Basic CRUD Operations](#basic-crud-operations)
2. [Authentication Flow](#authentication-flow)
3. [File Upload](#file-upload)
4. [Pagination](#pagination)
5. [Search and Filtering](#search-and-filtering)
6. [Optimistic Updates](#optimistic-updates)
7. [Related Data (Normalization)](#related-data-normalization)
8. [Custom Hooks](#custom-hooks)
9. [Integration with React Navigation](#integration-with-react-navigation)

---

## Basic CRUD Operations

### Complete Asset Management Example

```typescript
// src/store/api/assetsApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Asset {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  name: string;
  description: string;
  category: string;
  imageUrl?: string;
}

export const assetsApi = createApi({
  reducerPath: 'assetsApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://api.example.com' }),
  tagTypes: ['Asset'],
  endpoints: (builder) => ({
    // List all assets
    getAssets: builder.query<Asset[], void>({
      query: () => '/assets',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Asset' as const, id })),
              { type: 'Asset', id: 'LIST' },
            ]
          : [{ type: 'Asset', id: 'LIST' }],
    }),
    
    // Get single asset
    getAssetById: builder.query<Asset, string>({
      query: (id) => `/assets/${id}`,
      providesTags: (result, error, id) => [{ type: 'Asset', id }],
    }),
    
    // Create asset
    createAsset: builder.mutation<Asset, CreateAssetRequest>({
      query: (body) => ({
        url: '/assets',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
    }),
    
    // Update asset
    updateAsset: builder.mutation<Asset, { id: string; data: Partial<Asset> }>({
      query: ({ id, data }) => ({
        url: `/assets/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Asset', id },
        { type: 'Asset', id: 'LIST' },
      ],
    }),
    
    // Delete asset
    deleteAsset: builder.mutation<void, string>({
      query: (id) => ({
        url: `/assets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAssetsQuery,
  useGetAssetByIdQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} = assetsApi;
```

### Component Using CRUD Operations

```typescript
// src/screens/AssetListScreen.tsx
import React, { useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useGetAssetsQuery, useDeleteAssetMutation } from '../store/api/assetsApi';

export const AssetListScreen = ({ navigation }) => {
  const { data: assets, isLoading, isFetching, error, refetch } = useGetAssetsQuery();
  const [deleteAsset, { isLoading: isDeleting }] = useDeleteAssetMutation();

  const handleDelete = async (id: string, name: string) => {
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAsset(id).unwrap();
              Alert.alert('Success', 'Asset deleted successfully');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete asset');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading assets</Text>
        <TouchableOpacity onPress={refetch}>
          <Text style={{ color: '#007AFF', marginTop: 10 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={assets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        renderItem={({ item }) => (
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>{item.description}</Text>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('AssetDetail', { id: item.id })}
                style={{ marginRight: 16 }}
              >
                <Text style={{ color: '#007AFF' }}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('EditAsset', { id: item.id })}
                style={{ marginRight: 16 }}
              >
                <Text style={{ color: '#007AFF' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.name)}
                disabled={isDeleting}
              >
                <Text style={{ color: '#FF3B30' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>No assets found</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateAsset')}
              style={{ marginTop: 16 }}
            >
              <Text style={{ color: '#007AFF' }}>Create your first asset</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <TouchableOpacity
        onPress={() => navigation.navigate('CreateAsset')}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#007AFF',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 32 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Create/Edit Form

```typescript
// src/screens/CreateAssetScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useCreateAssetMutation } from '../store/api/assetsApi';

export const CreateAssetScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  
  const [createAsset, { isLoading }] = useCreateAssetMutation();

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !category.trim()) {
      Alert.alert('Validation Error', 'All fields are required');
      return;
    }

    try {
      await createAsset({
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
      }).unwrap();
      
      Alert.alert('Success', 'Asset created successfully');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to create asset. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Asset Name"
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}
      />
      
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        multiline
        numberOfLines={4}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          minHeight: 100,
        }}
      />
      
      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="Category"
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          marginBottom: 24,
        }}
      />
      
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading}
        style={{
          backgroundColor: isLoading ? '#ccc' : '#007AFF',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            Create Asset
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

---

## Authentication Flow

### Auth API Slice

```typescript
// src/store/api/authApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
  refreshToken: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.example.com',
    prepareHeaders: (headers, { getState }) => {
      // Get token from auth state
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    
    register: builder.mutation<AuthResponse, { email: string; password: string; name: string }>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    
    refreshToken: builder.mutation<{ token: string }, { refreshToken: string }>({
      query: ({ refreshToken }) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
      }),
    }),
    
    getProfile: builder.query<AuthResponse['user'], void>({
      query: () => '/auth/profile',
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useGetProfileQuery,
} = authApi;
```

### Auth Slice (Redux)

```typescript
// src/store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../api/authApi';

interface AuthState {
  user: { id: string; email: string; name: string } | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthState['user']; token: string; refreshToken: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    // Handle login success
    builder.addMatcher(
      authApi.endpoints.login.matchFulfilled,
      (state, { payload }) => {
        state.user = payload.user;
        state.token = payload.token;
        state.refreshToken = payload.refreshToken;
        state.isAuthenticated = true;
      }
    );
    
    // Handle register success
    builder.addMatcher(
      authApi.endpoints.register.matchFulfilled,
      (state, { payload }) => {
        state.user = payload.user;
        state.token = payload.token;
        state.refreshToken = payload.refreshToken;
        state.isAuthenticated = true;
      }
    );
  },
});

export const { setCredentials, logout: logoutAction } = authSlice.actions;
export default authSlice.reducer;
```

### Login Screen

```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useLoginMutation } from '../store/api/authApi';

export const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      await login({ email, password }).unwrap();
      // Navigation will be handled by auth state change
    } catch (err: any) {
      const message = err?.data?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Login Error', message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' }}>
        Welcome Back
      </Text>
      
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}
      />
      
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          padding: 12,
          borderRadius: 8,
          marginBottom: 24,
        }}
      />
      
      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading}
        style={{
          backgroundColor: isLoading ? '#ccc' : '#007AFF',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            Login
          </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={{ textAlign: 'center', color: '#007AFF' }}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## File Upload

### File Upload Endpoint

```typescript
// src/store/api/uploadApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
}

export const uploadApi = createApi({
  reducerPath: 'uploadApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://api.example.com' }),
  endpoints: (builder) => ({
    uploadImage: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/upload/image',
        method: 'POST',
        body: formData,
      }),
    }),
    
    uploadFile: builder.mutation<UploadResponse, { file: FormData; onProgress?: (progress: number) => void }>({
      queryFn: async ({ file, onProgress }, api, extraOptions, baseQuery) => {
        try {
          // Custom fetch with progress tracking
          const result = await fetch('https://api.example.com/upload/file', {
            method: 'POST',
            body: file,
            headers: {
              // Add auth if needed
            },
          });
          
          const data = await result.json();
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', data: error } };
        }
      },
    }),
  }),
});

export const { useUploadImageMutation, useUploadFileMutation } = uploadApi;
```

### Image Picker Component

```typescript
// src/components/ImagePicker.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Text, ActivityIndicator, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useUploadImageMutation } from '../store/api/uploadApi';

interface ImagePickerProps {
  onImageUploaded: (url: string) => void;
}

export const ImagePickerComponent: React.FC<ImagePickerProps> = ({ onImageUploaded }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadImage, { isLoading }] = useUploadImageMutation();

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    setImageUri(asset.uri || null);

    // Upload image
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      name: asset.fileName || 'upload.jpg',
    } as any);

    try {
      const response = await uploadImage(formData).unwrap();
      onImageUploaded(response.url);
      Alert.alert('Success', 'Image uploaded successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to upload image');
      setImageUri(null);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={pickImage}
        disabled={isLoading}
        style={{
          width: 200,
          height: 200,
          borderWidth: 2,
          borderColor: '#ddd',
          borderStyle: 'dashed',
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f9f9f9',
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="large" />
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
        ) : (
          <Text style={{ color: '#666' }}>Tap to select image</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

---

## Pagination

### Paginated API Endpoint

```typescript
// src/store/api/assetsApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const assetsApi = createApi({
  reducerPath: 'assetsApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://api.example.com' }),
  tagTypes: ['Asset'],
  endpoints: (builder) => ({
    getAssetsPaginated: builder.query<PaginatedResponse<Asset>, { page: number; pageSize: number }>({
      query: ({ page, pageSize }) => `/assets?page=${page}&pageSize=${pageSize}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Asset' as const, id })),
              { type: 'Asset', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Asset', id: 'PARTIAL-LIST' }],
      // Merge pages for infinite scroll
      serializeQueryArgs: ({ endpointName }) => {
        return endpointName;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          // Reset on first page
          return newItems;
        }
        // Append new items
        return {
          ...newItems,
          data: [...currentCache.data, ...newItems.data],
        };
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg !== previousArg;
      },
    }),
  }),
});

export const { useGetAssetsPaginatedQuery } = assetsApi;
```

### Infinite Scroll Component

```typescript
// src/screens/AssetListInfiniteScreen.tsx
import React, { useState } from 'react';
import { FlatList, View, Text, ActivityIndicator } from 'react-native';
import { useGetAssetsPaginatedQuery } from '../store/api/assetsApi';

export const AssetListInfiniteScreen = () => {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isFetching, error } = useGetAssetsPaginatedQuery({
    page,
    pageSize,
  });

  const loadMore = () => {
    if (data && page < data.totalPages && !isFetching) {
      setPage(page + 1);
    }
  };

  const renderFooter = () => {
    if (!isFetching) return null;
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading assets</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data?.data || []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
          <Text style={{ color: '#666' }}>{item.description}</Text>
        </View>
      )}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
};
```

---

## Search and Filtering

### Search Endpoint with Debouncing

```typescript
// src/store/api/searchApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://api.example.com' }),
  endpoints: (builder) => ({
    searchAssets: builder.query<Asset[], { query: string; category?: string }>({
      query: ({ query, category }) => {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (category) params.append('category', category);
        return `/assets/search?${params.toString()}`;
      },
      // Keep unused data cached for 60 seconds
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useSearchAssetsQuery } = searchApi;
```

### Search Screen with Debouncing

```typescript
// src/screens/SearchScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, ActivityIndicator } from 'react-native';
import { useSearchAssetsQuery } from '../store/api/searchApi';

export const SearchScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchText]);

  // Skip query if search is empty
  const { data, isLoading, isFetching } = useSearchAssetsQuery(
    { query: debouncedSearch },
    { skip: debouncedSearch.length < 2 } // Only search when 2+ characters
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' }}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search assets..."
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            padding: 12,
            borderRadius: 8,
          }}
        />
      </View>

      {isFetching && (
        <View style={{ padding: 16, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      )}

      {debouncedSearch.length >= 2 && !isFetching && (
        <FlatList
          data={data || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
              <Text style={{ color: '#666' }}>{item.description}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#666' }}>No results found</Text>
            </View>
          }
        />
      )}

      {debouncedSearch.length < 2 && (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <Text style={{ color: '#666' }}>Type at least 2 characters to search</Text>
        </View>
      )}
    </View>
  );
};
```

---

## Optimistic Updates

### Optimistic Update Example

```typescript
// src/store/api/assetsApi.ts
export const assetsApi = createApi({
  // ... base configuration
  endpoints: (builder) => ({
    updateAsset: builder.mutation<Asset, { id: string; data: Partial<Asset> }>({
      query: ({ id, data }) => ({
        url: `/assets/${id}`,
        method: 'PUT',
        body: data,
      }),
      // Optimistic update implementation
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
        // Optimistically update the single asset cache
        const patchResult = dispatch(
          assetsApi.util.updateQueryData('getAssetById', id, (draft) => {
            Object.assign(draft, data);
          })
        );

        // Also update the asset in the list cache
        const listPatchResult = dispatch(
          assetsApi.util.updateQueryData('getAssets', undefined, (draft) => {
            const asset = draft.find((a) => a.id === id);
            if (asset) {
              Object.assign(asset, data);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          // Undo optimistic update on error
          patchResult.undo();
          listPatchResult.undo();
        }
      },
    }),

    deleteAsset: builder.mutation<void, string>({
      query: (id) => ({
        url: `/assets/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistically remove from list
        const patchResult = dispatch(
          assetsApi.util.updateQueryData('getAssets', undefined, (draft) => {
            return draft.filter((asset) => asset.id !== id);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    toggleFavorite: builder.mutation<Asset, string>({
      query: (id) => ({
        url: `/assets/${id}/favorite`,
        method: 'POST',
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        // Optimistically toggle favorite status
        const patchResult = dispatch(
          assetsApi.util.updateQueryData('getAssets', undefined, (draft) => {
            const asset = draft.find((a) => a.id === id);
            if (asset) {
              asset.isFavorite = !asset.isFavorite;
            }
          })
        );

        try {
          const { data: updatedAsset } = await queryFulfilled;
          // Update with server response
          dispatch(
            assetsApi.util.updateQueryData('getAssets', undefined, (draft) => {
              const asset = draft.find((a) => a.id === id);
              if (asset) {
                Object.assign(asset, updatedAsset);
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});
```

---

## Related Data (Normalization)

### Handling Related Entities

```typescript
// src/store/api/assetsApi.ts
export interface Asset {
  id: string;
  name: string;
  categoryId: string;
  category?: Category; // Populated in some endpoints
}

export interface Category {
  id: string;
  name: string;
}

export const assetsApi = createApi({
  // ... base configuration
  tagTypes: ['Asset', 'Category'],
  endpoints: (builder) => ({
    getAssets: builder.query<Asset[], { includeCategoryDetails?: boolean }>({
      query: ({ includeCategoryDetails }) =>
        `/assets${includeCategoryDetails ? '?include=category' : ''}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Asset' as const, id })),
              { type: 'Asset', id: 'LIST' },
            ]
          : [{ type: 'Asset', id: 'LIST' }],
    }),

    getCategories: builder.query<Category[], void>({
      query: () => '/categories',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Category' as const, id })),
              { type: 'Category', id: 'LIST' },
            ]
          : [{ type: 'Category', id: 'LIST' }],
    }),

    // When creating an asset, also invalidate categories if it creates a new one
    createAsset: builder.mutation<Asset, CreateAssetRequest & { createCategory?: boolean }>({
      query: ({ createCategory, ...asset }) => ({
        url: '/assets',
        method: 'POST',
        body: asset,
      }),
      invalidatesTags: (result, error, { createCategory }) => [
        { type: 'Asset', id: 'LIST' },
        ...(createCategory ? [{ type: 'Category' as const, id: 'LIST' }] : []),
      ],
    }),
  }),
});
```

### Custom Hook for Combined Data

```typescript
// src/hooks/useAssetsWithCategories.ts
import { useMemo } from 'react';
import { useGetAssetsQuery, useGetCategoriesQuery } from '../store/api/assetsApi';

export const useAssetsWithCategories = () => {
  const { data: assets, ...assetsQuery } = useGetAssetsQuery({ includeCategoryDetails: false });
  const { data: categories, ...categoriesQuery } = useGetCategoriesQuery();

  // Combine the data
  const assetsWithCategories = useMemo(() => {
    if (!assets || !categories) return [];

    return assets.map((asset) => ({
      ...asset,
      category: categories.find((cat) => cat.id === asset.categoryId),
    }));
  }, [assets, categories]);

  return {
    data: assetsWithCategories,
    isLoading: assetsQuery.isLoading || categoriesQuery.isLoading,
    isError: assetsQuery.isError || categoriesQuery.isError,
    refetch: () => {
      assetsQuery.refetch();
      categoriesQuery.refetch();
    },
  };
};

// Usage in component:
export const AssetListScreen = () => {
  const { data, isLoading, isError, refetch } = useAssetsWithCategories();

  // Now each asset has full category details
  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <View>
          <Text>{item.name}</Text>
          <Text>Category: {item.category?.name}</Text>
        </View>
      )}
    />
  );
};
```

---

## Custom Hooks

### Custom Hook for Asset Operations

```typescript
// src/hooks/useAssetOperations.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import {
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} from '../store/api/assetsApi';

export const useAssetOperations = () => {
  const [createAsset, createState] = useCreateAssetMutation();
  const [updateAsset, updateState] = useUpdateAssetMutation();
  const [deleteAsset, deleteState] = useDeleteAssetMutation();

  const [isProcessing, setIsProcessing] = useState(false);

  const create = async (data: CreateAssetRequest) => {
    setIsProcessing(true);
    try {
      const result = await createAsset(data).unwrap();
      Alert.alert('Success', 'Asset created successfully');
      return result;
    } catch (error: any) {
      const message = error?.data?.message || 'Failed to create asset';
      Alert.alert('Error', message);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const update = async (id: string, data: Partial<Asset>) => {
    setIsProcessing(true);
    try {
      const result = await updateAsset({ id, data }).unwrap();
      Alert.alert('Success', 'Asset updated successfully');
      return result;
    } catch (error: any) {
      const message = error?.data?.message || 'Failed to update asset';
      Alert.alert('Error', message);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const remove = async (id: string, name: string) => {
    return new Promise<void>((resolve, reject) => {
      Alert.alert(
        'Delete Asset',
        `Are you sure you want to delete "${name}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => reject(new Error('Cancelled')),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setIsProcessing(true);
              try {
                await deleteAsset(id).unwrap();
                Alert.alert('Success', 'Asset deleted successfully');
                resolve();
              } catch (error: any) {
                const message = error?.data?.message || 'Failed to delete asset';
                Alert.alert('Error', message);
                reject(error);
              } finally {
                setIsProcessing(false);
              }
            },
          },
        ]
      );
    });
  };

  return {
    create,
    update,
    remove,
    isProcessing,
    isCreating: createState.isLoading,
    isUpdating: updateState.isLoading,
    isDeleting: deleteState.isLoading,
  };
};

// Usage in component:
export const AssetListScreen = () => {
  const { data } = useGetAssetsQuery();
  const { remove, isProcessing } = useAssetOperations();

  const handleDelete = async (id: string, name: string) => {
    try {
      await remove(id, name);
    } catch (err) {
      // Error already handled in hook
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <View>
          <Text>{item.name}</Text>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            disabled={isProcessing}
          >
            <Text>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
};
```

---

## Integration with React Navigation

### Preloading Data on Navigation

```typescript
// src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { assetsApi } from '../store/api/assetsApi';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const dispatch = useDispatch();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AssetList"
        component={AssetListScreen}
        options={{
          title: 'Assets',
        }}
      />
      <Stack.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={{
          title: 'Asset Details',
        }}
        listeners={({ route }) => ({
          // Preload data when focusing this screen
          focus: () => {
            const { id } = route.params as { id: string };
            dispatch(assetsApi.endpoints.getAssetById.initiate(id));
          },
        })}
      />
    </Stack.Navigator>
  );
};
```

### Using RTK Query with React Navigation

```typescript
// src/screens/AssetDetailScreen.tsx
import React from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useGetAssetByIdQuery } from '../store/api/assetsApi';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'AssetDetail'>;

export const AssetDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const { data: asset, isLoading, isError, refetch } = useGetAssetByIdQuery(id);

  // Update navigation title when data loads
  React.useEffect(() => {
    if (asset) {
      navigation.setOptions({ title: asset.name });
    }
  }, [asset, navigation]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError || !asset) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading asset</Text>
        <TouchableOpacity onPress={refetch}>
          <Text style={{ color: '#007AFF', marginTop: 10 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        {asset.name}
      </Text>
      <Text style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
        {asset.description}
      </Text>
      <View>
        <Text style={{ fontWeight: 'bold' }}>Category:</Text>
        <Text>{asset.category}</Text>
      </View>
    </ScrollView>
  );
};
```

---

These examples cover the most common RTK Query patterns in React Native. Each example is production-ready and follows best practices for type safety, error handling, and user experience.
