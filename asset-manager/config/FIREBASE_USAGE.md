# Firebase Web SDK Usage Examples

## Import Firebase services

```typescript
import { auth, db, storage } from './config/firebase';
```

## Authentication Examples

### Sign Up with Email/Password

```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config/firebase';

const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created:', userCredential.user);
    return userCredential.user;
  } catch (error: any) {
    console.error('Sign up error:', error.message);
    throw error;
  }
};
```

### Sign In with Email/Password

```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config/firebase';

const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in:', userCredential.user);
    return userCredential.user;
  } catch (error: any) {
    console.error('Sign in error:', error.message);
    throw error;
  }
};
```

### Sign Out

```typescript
import { signOut } from 'firebase/auth';
import { auth } from './config/firebase';

const logout = async () => {
  try {
    await signOut(auth);
    console.log('Signed out successfully');
  } catch (error: any) {
    console.error('Sign out error:', error.message);
    throw error;
  }
};
```

### Listen to Auth State Changes

```typescript
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';

// In a React component or hook
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user.uid);
      setUser(user);
    } else {
      console.log('User is signed out');
      setUser(null);
    }
  });

  return () => unsubscribe();
}, []);
```

### Get Current User

```typescript
import { auth } from './config/firebase';

const currentUser = auth.currentUser;
if (currentUser) {
  console.log('Current user:', currentUser.email);
}
```

## Firestore Examples

### Add Document

```typescript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const addAsset = async (assetData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'assets'), {
      ...assetData,
      createdAt: new Date()
    });
    console.log('Document written with ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('Error adding document:', error.message);
    throw error;
  }
};
```

### Get Document

```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const getAsset = async (assetId: string) => {
  try {
    const docRef = doc(db, 'assets', assetId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('Document data:', docSnap.data());
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log('No such document!');
      return null;
    }
  } catch (error: any) {
    console.error('Error getting document:', error.message);
    throw error;
  }
};
```

### Query Documents

```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config/firebase';

const getAssetsBySite = async (siteId: string) => {
  try {
    const q = query(
      collection(db, 'assets'),
      where('siteId', '==', siteId)
    );
    
    const querySnapshot = await getDocs(q);
    const assets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('Found assets:', assets.length);
    return assets;
  } catch (error: any) {
    console.error('Error querying documents:', error.message);
    throw error;
  }
};
```

### Real-time Listener

```typescript
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './config/firebase';

// In a React component
useEffect(() => {
  const q = query(
    collection(db, 'assets'),
    where('status', '==', 'active')
  );
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const assets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('Real-time update:', assets);
    setAssets(assets);
  });

  return () => unsubscribe();
}, []);
```

### Update Document

```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const updateAsset = async (assetId: string, updates: any) => {
  try {
    const docRef = doc(db, 'assets', assetId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
    console.log('Document updated successfully');
  } catch (error: any) {
    console.error('Error updating document:', error.message);
    throw error;
  }
};
```

### Delete Document

```typescript
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const deleteAsset = async (assetId: string) => {
  try {
    await deleteDoc(doc(db, 'assets', assetId));
    console.log('Document deleted successfully');
  } catch (error: any) {
    console.error('Error deleting document:', error.message);
    throw error;
  }
};
```

## Storage Examples

### Upload File

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config/firebase';

const uploadImage = async (uri: string, fileName: string) => {
  try {
    // Convert URI to blob (for React Native)
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, `images/${fileName}`);
    const snapshot = await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('File uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading file:', error.message);
    throw error;
  }
};
```

### Get Download URL

```typescript
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from './config/firebase';

const getImageURL = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error: any) {
    console.error('Error getting download URL:', error.message);
    throw error;
  }
};
```

### Delete File

```typescript
import { ref, deleteObject } from 'firebase/storage';
import { storage } from './config/firebase';

const deleteImage = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log('File deleted successfully');
  } catch (error: any) {
    console.error('Error deleting file:', error.message);
    throw error;
  }
};
```

## Custom Hook Example: useAuth

```typescript
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './config/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};

// Usage in component:
// const { user, loading } = useAuth();
```

## Important Notes

1. **Error Handling**: Always wrap Firebase calls in try-catch blocks
2. **Unsubscribe**: Always return unsubscribe functions from useEffect for real-time listeners
3. **Types**: Use TypeScript types from Firebase SDK for better type safety
4. **Security**: Make sure to set up proper Firestore security rules in Firebase Console
5. **Offline**: Firebase Web SDK has automatic offline persistence for Firestore (enabled by default)

## Firebase Web SDK vs @react-native-firebase

| Feature | Web SDK | Native SDK |
|---------|---------|------------|
| Works in Expo Go | ✅ Yes | ❌ No |
| Performance | Good (JS layer) | Better (native) |
| API | `firebase/auth`, `firebase/firestore` | `@react-native-firebase/auth` |
| Setup | JS config object | Native plist/json files |
| Offline support | Good | Better |
