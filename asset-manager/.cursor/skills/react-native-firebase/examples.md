# React Native Firebase - Complete Examples

Real-world examples for common Firebase use cases in React Native applications.

## Authentication Examples

### Complete Auth Hook

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  error: Error | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(
      (user) => {
        setAuthState({
          user,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setAuthState({
          user: null,
          loading: false,
          error,
        });
      }
    );

    return unsubscribe;
  }, []);

  return authState;
};
```

### Sign Up Screen

```typescript
// screens/SignUpScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Success', 'Account created successfully');
    } catch (error: any) {
      let errorMessage = 'An error occurred';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button
        title={loading ? 'Creating...' : 'Sign Up'}
        onPress={handleSignUp}
        disabled={loading}
      />
      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
    </View>
  );
};
```

### Profile Update Component

```typescript
// components/ProfileUpdate.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const ProfileUpdate = () => {
  const user = auth().currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');

  useEffect(() => {
    // Load existing profile data
    if (user) {
      firestore()
        .collection('users')
        .doc(user.uid)
        .get()
        .then((doc) => {
          if (doc.exists) {
            setBio(doc.data()?.bio || '');
          }
        });
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;

    try {
      // Update auth profile
      await user.updateProfile({ displayName });

      // Update Firestore profile
      await firestore().collection('users').doc(user.uid).set(
        {
          displayName,
          bio,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, height: 100 }}
      />
      <Button title="Update Profile" onPress={handleUpdate} />
    </View>
  );
};
```

## Firestore Examples

### Chat Messages Component

```typescript
// components/ChatMessages.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList, TextInput, Button } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: any;
}

const ChatMessages = ({ chatId }: { chatId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot((snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(msgs);
      });

    return unsubscribe;
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const user = auth().currentUser;
    if (!user) return;

    try {
      await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add({
          text: newMessage,
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      setNewMessage('');
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.userName}</Text>
            <Text>{item.text}</Text>
          </View>
        )}
      />
      <View style={{ flexDirection: 'row', padding: 10 }}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          style={{ flex: 1, borderWidth: 1, padding: 10 }}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
};
```

### Paginated List

```typescript
// hooks/usePaginatedCollection.ts
import { useState, useEffect, useCallback } from 'react';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

interface UsePaginatedCollectionOptions {
  collection: string;
  pageSize?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  where?: Array<{ field: string; operator: any; value: any }>;
}

export const usePaginatedCollection = (options: UsePaginatedCollectionOptions) => {
  const { collection, pageSize = 10, orderBy, where } = options;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<FirebaseFirestoreTypes.DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      let query: any = firestore().collection(collection);

      // Apply where clauses
      if (where) {
        where.forEach((w) => {
          query = query.where(w.field, w.operator, w.value);
        });
      }

      // Apply order by
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
      }

      // Apply pagination
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      query = query.limit(pageSize);

      const snapshot = await query.get();

      if (snapshot.empty) {
        setHasMore(false);
      } else {
        const newData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setData((prev) => [...prev, ...newData]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === pageSize);
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoading(false);
    }
  }, [collection, pageSize, orderBy, where, lastDoc, loading, hasMore]);

  useEffect(() => {
    setData([]);
    setLastDoc(null);
    setHasMore(true);
    loadMore();
  }, [collection, JSON.stringify(where), JSON.stringify(orderBy)]);

  return { data, loading, loadMore, hasMore };
};
```

### Search Functionality

```typescript
// hooks/useSearch.ts
import { useState, useEffect, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';

export const useSearch = (collection: string, searchField: string, searchTerm: string) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        // Note: Firestore doesn't support full-text search natively
        // This is a simple prefix search example
        // For production, consider using Algolia or Elasticsearch
        const snapshot = await firestore()
          .collection(collection)
          .where(searchField, '>=', searchTerm)
          .where(searchField, '<=', searchTerm + '\uf8ff')
          .limit(20)
          .get();

        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setResults(docs);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(search, 300);
    return () => clearTimeout(debounceTimer);
  }, [collection, searchField, searchTerm]);

  return { results, loading };
};
```

## Storage Examples

### Image Picker and Upload

```typescript
// components/ImageUpload.tsx
import React, { useState } from 'react';
import { View, Image, Button, ActivityIndicator, Alert } from 'react-native';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

const ImageUpload = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      (response: ImagePickerResponse) => {
        if (response.assets && response.assets[0]) {
          setImageUri(response.assets[0].uri || null);
        }
      }
    );
  };

  const uploadImage = async () => {
    if (!imageUri) return;

    const user = auth().currentUser;
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setUploading(true);
    try {
      const filename = `profile_${user.uid}_${Date.now()}.jpg`;
      const reference = storage().ref(`users/${user.uid}/profile/${filename}`);

      const task = reference.putFile(imageUri);

      // Monitor progress
      task.on('state_changed', (taskSnapshot) => {
        const progress = (taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) * 100;
        console.log(`Upload progress: ${progress}%`);
      });

      await task;
      const url = await reference.getDownloadURL();
      setDownloadURL(url);
      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={{ width: 200, height: 200 }} />
      )}
      <Button title="Pick Image" onPress={pickImage} />
      {imageUri && (
        <Button
          title={uploading ? 'Uploading...' : 'Upload'}
          onPress={uploadImage}
          disabled={uploading}
        />
      )}
      {uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
      {downloadURL && (
        <View style={{ marginTop: 10 }}>
          <Text>Download URL: {downloadURL}</Text>
        </View>
      )}
    </View>
  );
};
```

### Document Upload with Progress

```typescript
// components/DocumentUpload.tsx
import React, { useState } from 'react';
import { View, Text, Button, ProgressViewIOS, ProgressBarAndroid, Platform } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const DocumentUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      if (result[0]) {
        await uploadDocument(result[0]);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled document picker');
      } else {
        console.error('Document picker error:', error);
      }
    }
  };

  const uploadDocument = async (file: any) => {
    const user = auth().currentUser;
    if (!user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const filename = file.name || `document_${Date.now()}`;
      const reference = storage().ref(`documents/${user.uid}/${filename}`);

      const task = reference.putFile(file.uri);

      task.on('state_changed', (taskSnapshot) => {
        const progress = taskSnapshot.bytesTransferred / taskSnapshot.totalBytes;
        setUploadProgress(progress);
      });

      await task;
      const downloadURL = await reference.getDownloadURL();

      // Save metadata to Firestore
      await firestore().collection('documents').add({
        fileName: filename,
        downloadURL,
        size: file.size,
        type: file.type,
        uploadedBy: user.uid,
        uploadedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Document uploaded successfully');
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="Pick Document" onPress={pickDocument} disabled={uploading} />
      
      {uploading && (
        <View style={{ marginTop: 20 }}>
          {Platform.OS === 'ios' ? (
            <ProgressViewIOS progress={uploadProgress} />
          ) : (
            <ProgressBarAndroid progress={uploadProgress} />
          )}
          <Text style={{ marginTop: 10, textAlign: 'center' }}>
            {Math.round(uploadProgress * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
};
```

## Cloud Functions Examples

### Calling Cloud Function with Error Handling

```typescript
// services/cloudFunctions.ts
import functions from '@react-native-firebase/functions';

export const sendNotification = async (userId: string, title: string, body: string) => {
  try {
    const sendNotificationFunction = functions().httpsCallable('sendNotification');
    const result = await sendNotificationFunction({
      userId,
      title,
      body,
    });
    return result.data;
  } catch (error: any) {
    if (error.code === 'functions/unavailable') {
      throw new Error('Service temporarily unavailable. Please try again later.');
    } else if (error.code === 'functions/deadline-exceeded') {
      throw new Error('Request timed out. Please try again.');
    } else {
      throw new Error('Failed to send notification');
    }
  }
};

export const generateReport = async (reportType: string, dateRange: { start: Date; end: Date }) => {
  try {
    const generateReportFunction = functions().httpsCallable('generateReport');
    const result = await generateReportFunction({
      reportType,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
    });
    return result.data;
  } catch (error: any) {
    console.error('Generate report error:', error);
    throw error;
  }
};
```

## Complete App Example

### Firebase Service Layer

```typescript
// services/firebaseService.ts
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import functions from '@react-native-firebase/functions';

class FirebaseService {
  // Auth methods
  async signUp(email: string, password: string) {
    return await auth().createUserWithEmailAndPassword(email, password);
  }

  async signIn(email: string, password: string) {
    return await auth().signInWithEmailAndPassword(email, password);
  }

  async signOut() {
    return await auth().signOut();
  }

  getCurrentUser() {
    return auth().currentUser;
  }

  // Firestore methods
  async createDocument(collection: string, data: any) {
    return await firestore().collection(collection).add(data);
  }

  async getDocument(collection: string, docId: string) {
    const doc = await firestore().collection(collection).doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async updateDocument(collection: string, docId: string, data: any) {
    return await firestore().collection(collection).doc(docId).update(data);
  }

  async deleteDocument(collection: string, docId: string) {
    return await firestore().collection(collection).doc(docId).delete();
  }

  // Storage methods
  async uploadFile(localUri: string, remotePath: string) {
    const reference = storage().ref(remotePath);
    await reference.putFile(localUri);
    return await reference.getDownloadURL();
  }

  async deleteFile(path: string) {
    return await storage().ref(path).delete();
  }

  // Functions methods
  async callFunction(name: string, data: any) {
    const functionRef = functions().httpsCallable(name);
    const result = await functionRef(data);
    return result.data;
  }
}

export default new FirebaseService();
```
