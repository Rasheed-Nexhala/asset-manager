---
name: firebase-react-native
description: Implement Firebase Web SDK in React Native and Expo applications for Authentication, Firestore database, and Cloud Storage. Use when working with Firebase services, user authentication, database queries, file uploads, or when the user mentions Firebase, Firestore, Auth, or Cloud Storage in React Native context.
---

# Firebase Web SDK in React Native

This skill guides implementation of Firebase Web SDK (not @react-native-firebase) in React Native/Expo apps.

## Why Firebase Web SDK?

| Feature | Web SDK | Native SDK (@react-native-firebase) |
|---------|---------|-------------------------------------|
| Expo Go Compatible | ✅ Yes | ❌ No (requires prebuild) |
| Setup Complexity | Low (JS config) | High (native files) |
| Cross-platform Code | ✅ Identical | Platform-specific config |
| Performance | Good | Better (native APIs) |

**Use Web SDK when**: Working with Expo Go, rapid prototyping, or web compatibility matters.

## Setup Checklist

```
- [ ] Install dependencies: firebase
- [ ] Create config/firebase.ts with Firebase config
- [ ] Extract credentials from google-services.json or GoogleService-Info.plist
- [ ] Initialize Firebase services (auth, db, storage)
- [ ] Import and use services throughout the app
```

## Core Configuration Pattern

**File: config/firebase.ts**

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
```

**Import pattern throughout app:**
```typescript
import { auth, db, storage } from './config/firebase';
```

## Authentication Patterns

### Sign Up
```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config/firebase';

const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Sign up error:', error.message);
    throw error;
  }
};
```

### Sign In
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config/firebase';

const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
  await signOut(auth);
};
```

### Auth State Listener (React Hook Pattern)
```typescript
import { useEffect, useState } from 'react';
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

    return unsubscribe; // Cleanup on unmount
  }, []);

  return { user, loading };
};
```

**Critical**: Always return the unsubscribe function from `useEffect` to prevent memory leaks.

## Firestore Database Patterns

### Add Document
```typescript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const addDocument = async (collectionName: string, data: any) => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date()
  });
  return docRef.id;
};
```

### Get Document by ID
```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const getDocument = async (collectionName: string, docId: string) => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};
```

### Query Documents
```typescript
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './config/firebase';

const queryDocuments = async () => {
  const q = query(
    collection(db, 'collectionName'),
    where('field', '==', 'value'),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

### Real-time Listener
```typescript
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './config/firebase';

// In a React component
useEffect(() => {
  const q = query(
    collection(db, 'collectionName'),
    where('status', '==', 'active')
  );
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setItems(items);
  });

  return () => unsubscribe(); // Critical: cleanup
}, []);
```

### Update Document
```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const updateDocument = async (collectionName: string, docId: string, updates: any) => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date()
  });
};
```

### Delete Document
```typescript
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from './config/firebase';

const deleteDocument = async (collectionName: string, docId: string) => {
  await deleteDoc(doc(db, collectionName, docId));
};
```

## Cloud Storage Patterns

### Upload File (React Native)
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config/firebase';

const uploadFile = async (uri: string, fileName: string, folder: string = 'uploads') => {
  // Convert React Native URI to blob
  const response = await fetch(uri);
  const blob = await response.blob();
  
  // Upload to Firebase Storage
  const storageRef = ref(storage, `${folder}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, blob);
  
  // Get download URL
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};
```

**Explanation**: React Native image URIs (from camera/gallery) need conversion to blob before upload:
1. `fetch(uri)` loads the local file
2. `.blob()` converts to blob format Firebase accepts
3. `uploadBytes()` uploads the blob
4. `getDownloadURL()` returns public URL for accessing the file

### Get Download URL
```typescript
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from './config/firebase';

const getFileURL = async (path: string) => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};
```

### Delete File
```typescript
import { ref, deleteObject } from 'firebase/storage';
import { storage } from './config/firebase';

const deleteFile = async (path: string) => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};
```

## Query Operators Reference

```typescript
// Comparison operators
where('field', '==', value)
where('field', '!=', value)
where('field', '<', value)
where('field', '<=', value)
where('field', '>', value)
where('field', '>=', value)

// Array operators
where('field', 'array-contains', value)
where('field', 'array-contains-any', [val1, val2])
where('field', 'in', [val1, val2, val3])
where('field', 'not-in', [val1, val2])

// Ordering and limiting
orderBy('field', 'asc')  // or 'desc'
limit(10)
limitToLast(10)
```

## Common Patterns & Best Practices

### Error Handling Pattern
```typescript
try {
  // Firebase operation
} catch (error: any) {
  console.error('Firebase error:', error.code, error.message);
  
  if (error.code === 'auth/wrong-password') {
    // Handle wrong password
  } else if (error.code === 'permission-denied') {
    // Handle permission error
  }
  
  throw error;
}
```

### Loading States Pattern
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await getDocument('collection', 'docId');
    // Use data
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Listener Cleanup Pattern
Always unsubscribe from real-time listeners to prevent memory leaks, unexpected re-renders, and stale data updates after component unmount.

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(/* ... */);
  return () => unsubscribe(); // Cleanup
}, [dependencies]);
```

## TypeScript Types

```typescript
import { User } from 'firebase/auth';

const [user, setUser] = useState<User | null>(null);

interface Asset {
  id: string;
  name: string;
  createdAt: Date;
}

const assets: Asset[] = querySnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
} as Asset));
```

## Security Considerations

1. **Never commit API keys** to public repositories (use .env files)
2. **Set up Firestore Security Rules** in Firebase Console
3. **Set up Storage Rules** for file access control
4. **Validate data** before writing to Firestore
5. **Use auth.currentUser** to verify authentication before sensitive operations

## Troubleshooting

### "Firebase app named '[DEFAULT]' already exists"
- Ensure `initializeApp()` is called only once
- Check for duplicate imports of firebase.ts

### "Permission denied" errors
- Verify Firestore/Storage security rules
- Ensure user is authenticated (`auth.currentUser` exists)

### Image upload fails
- Verify URI is valid (starts with file:// or content://)
- Check Storage rules allow writes
- Ensure blob conversion is working

### Real-time listeners not updating
- Verify unsubscribe is returned from useEffect
- Check dependency array in useEffect
- Ensure query is correctly formatted
