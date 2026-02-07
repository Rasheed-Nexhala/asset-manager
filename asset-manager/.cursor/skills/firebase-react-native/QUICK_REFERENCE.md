# Firebase Quick Reference

Fast lookup for common Firebase patterns in React Native.

## Installation

```bash
npm install firebase
```

## Setup (One-time)

```typescript
// config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

## Authentication Cheatsheet

```typescript
import { auth } from './config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Sign up
await createUserWithEmailAndPassword(auth, email, password);

// Sign in
await signInWithEmailAndPassword(auth, email, password);

// Sign out
await signOut(auth);

// Listen to auth changes
const unsubscribe = onAuthStateChanged(auth, (user) => {
  if (user) console.log('Signed in:', user.uid);
  else console.log('Signed out');
});
```

## Firestore Cheatsheet

```typescript
import { db } from './config/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';

// Add document (auto ID)
await addDoc(collection(db, 'items'), { name: 'Item 1' });

// Add document (specific ID)
await setDoc(doc(db, 'items', 'item-123'), { name: 'Item 1' });

// Get document
const docSnap = await getDoc(doc(db, 'items', 'item-123'));
if (docSnap.exists()) console.log(docSnap.data());

// Query documents
const q = query(
  collection(db, 'items'),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc'),
  limit(10)
);
const snapshot = await getDocs(q);
const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// Real-time listener
const unsubscribe = onSnapshot(q, (snapshot) => {
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log('Updated:', items);
});

// Update document
await updateDoc(doc(db, 'items', 'item-123'), { status: 'archived' });

// Delete document
await deleteDoc(doc(db, 'items', 'item-123'));
```

## Storage Cheatsheet

```typescript
import { storage } from './config/firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

// Upload file (React Native)
const response = await fetch(imageUri);
const blob = await response.blob();
const storageRef = ref(storage, `images/${fileName}`);
await uploadBytes(storageRef, blob);
const downloadURL = await getDownloadURL(storageRef);

// Get download URL
const url = await getDownloadURL(ref(storage, 'images/photo.jpg'));

// Delete file
await deleteObject(ref(storage, 'images/photo.jpg'));
```

## React Hook Patterns

### useAuth Hook
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
```

### useFirestore Hook (Real-time)
```typescript
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './config/firebase';

export const useCollection = (collectionName: string, filters?: any) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = collection(db, collectionName);
    if (filters) {
      q = query(q, where(filters.field, filters.operator, filters.value));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionName]);

  return { data, loading, error };
};
```

## Common Query Patterns

```typescript
// Simple equality
where('status', '==', 'active')

// Comparison
where('price', '>', 100)
where('age', '>=', 18)

// Array contains
where('tags', 'array-contains', 'featured')

// Multiple conditions (AND)
query(
  collection(db, 'items'),
  where('category', '==', 'electronics'),
  where('price', '<', 1000)
)

// OR queries (use 'in')
where('status', 'in', ['active', 'pending'])

// Order by multiple fields
query(
  collection(db, 'items'),
  orderBy('category'),
  orderBy('price', 'desc')
)

// Pagination
const firstPage = await getDocs(
  query(collection(db, 'items'), orderBy('name'), limit(10))
);
const lastDoc = firstPage.docs[firstPage.docs.length - 1];
const nextPage = await getDocs(
  query(collection(db, 'items'), orderBy('name'), startAfter(lastDoc), limit(10))
);
```

## Error Handling Pattern

```typescript
try {
  await firebaseOperation();
} catch (error: any) {
  console.error('Error:', error.code, error.message);
  
  switch (error.code) {
    case 'auth/wrong-password':
      alert('Incorrect password');
      break;
    case 'auth/user-not-found':
      alert('User not found');
      break;
    case 'permission-denied':
      alert('Access denied');
      break;
    default:
      alert('An error occurred');
  }
}
```

## Security Rules (Firestore)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated users only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // User can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read, authenticated write
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Authenticated users can read/write their own files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read, authenticated write
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Timestamp Helpers

```typescript
import { serverTimestamp, Timestamp } from 'firebase/firestore';

// Add server timestamp
await addDoc(collection(db, 'items'), {
  name: 'Item',
  createdAt: serverTimestamp() // Server time, not client
});

// Convert Firestore Timestamp to Date
const docSnap = await getDoc(docRef);
const timestamp: Timestamp = docSnap.data().createdAt;
const date: Date = timestamp.toDate();

// Convert Date to Firestore Timestamp
const timestamp = Timestamp.fromDate(new Date());
```

## Field Value Helpers

```typescript
import { increment, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';

// Increment counter
await updateDoc(docRef, {
  views: increment(1),
  downloads: increment(-1)
});

// Add to array (no duplicates)
await updateDoc(docRef, {
  tags: arrayUnion('new-tag', 'another-tag')
});

// Remove from array
await updateDoc(docRef, {
  tags: arrayRemove('old-tag')
});

// Delete field
await updateDoc(docRef, {
  obsoleteField: deleteField()
});
```

## Batch Operations

```typescript
import { writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);

batch.set(doc(db, 'items', 'item-1'), { name: 'Item 1' });
batch.update(doc(db, 'items', 'item-2'), { status: 'updated' });
batch.delete(doc(db, 'items', 'item-3'));

await batch.commit(); // All-or-nothing
```

## Transaction Example

```typescript
import { runTransaction } from 'firebase/firestore';

await runTransaction(db, async (transaction) => {
  const docRef = doc(db, 'counters', 'counter-1');
  const docSnap = await transaction.get(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Counter does not exist');
  }
  
  const newCount = docSnap.data().count + 1;
  transaction.update(docRef, { count: newCount });
});
```

## Component Examples

### Login Component
```typescript
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './config/firebase';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigate to home screen
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // UI components
  );
};
```

### Data List Component
```typescript
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './config/firebase';

export const ItemList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'items'),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <Text>Loading...</Text>;

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => <Text>{item.name}</Text>}
      keyExtractor={item => item.id}
    />
  );
};
```

### Image Upload Component
```typescript
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config/firebase';
import * as ImagePicker from 'expo-image-picker';

export const ImageUpload = () => {
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const fileName = `${Date.now()}.jpg`;
        const storageRef = ref(storage, `images/${fileName}`);
        await uploadBytes(storageRef, blob);
        
        const downloadURL = await getDownloadURL(storageRef);
        console.log('Uploaded:', downloadURL);
      } catch (error) {
        console.error('Upload error:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    // UI with pickAndUpload button
  );
};
```
