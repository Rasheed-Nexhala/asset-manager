---
name: react-native-firebase
description: Complete guide for using React Native Firebase library including Firestore, Authentication, Cloud Functions, Storage (image/document upload), Cloud Messaging, Analytics, and more. Use when implementing Firebase features, setting up authentication, managing Firestore data, uploading files, or calling cloud functions in React Native apps.
---

# React Native Firebase

Complete implementation guide for `@react-native-firebase` packages covering all major Firebase services.

## Core Principles

- **Always initialize Firebase app** before using any Firebase service
- **Use TypeScript types** from `@react-native-firebase/app` for better type safety
- **Handle errors gracefully** - Firebase operations can fail (network, permissions, etc.)
- **Use offline persistence** for Firestore when appropriate
- **Follow React Native patterns** - use hooks, handle component lifecycle properly

## Installation & Setup

### Required Packages

```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/auth
npm install @react-native-firebase/firestore
npm install @react-native-firebase/storage
npm install @react-native-firebase/functions
npm install @react-native-firebase/messaging
npm install @react-native-firebase/analytics
```

### Platform Setup

**iOS:** Add `GoogleService-Info.plist` to `ios/`, run `pod install`

**Android:** Add `google-services.json` to `android/app/`, configure in `build.gradle`

**Expo:** Configure in `app.json` plugins section (see [examples.md](examples.md))

## Initialization

```typescript
import { firebase } from '@react-native-firebase/app';

// Auto-initialized if config files present
const app = firebase.app();
const isInitialized = firebase.apps.length > 0;
```

## Authentication

### Basic Auth Operations

```typescript
import auth from '@react-native-firebase/auth';

// Sign up
await auth().createUserWithEmailAndPassword(email, password);

// Sign in
await auth().signInWithEmailAndPassword(email, password);

// Sign out
await auth().signOut();

// Current user
const user = auth().currentUser;

// Auth state listener
const unsubscribe = auth().onAuthStateChanged((user) => {
  // Handle auth state change
});
```

### Auth Hook Pattern

```typescript
const useAuth = () => {
  const [user, setUser] = useState(auth().currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
};
```

### User Profile Updates

```typescript
await user.updateProfile({ displayName, photoURL });
await user.updateEmail(newEmail);
await user.updatePassword(newPassword);
await auth().sendPasswordResetEmail(email);
```

## Firestore

### CRUD Operations

```typescript
import firestore from '@react-native-firebase/firestore';

// Create
const docRef = await firestore().collection('users').add({ name: 'John' });

// Read
const doc = await firestore().collection('users').doc(id).get();
const data = doc.exists ? { id: doc.id, ...doc.data() } : null;

// Update
await firestore().collection('users').doc(id).update({ name: 'Jane' });

// Delete
await firestore().collection('users').doc(id).delete();
```

### Real-time Listeners

```typescript
// Document listener
const unsubscribe = firestore()
  .collection('users')
  .doc(userId)
  .onSnapshot((snapshot) => {
    if (snapshot.exists) {
      const data = { id: snapshot.id, ...snapshot.data() };
    }
  });

// Collection listener
const unsubscribe = firestore()
  .collection('posts')
  .where('published', '==', true)
  .orderBy('createdAt', 'desc')
  .onSnapshot((snapshot) => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });

// Always unsubscribe in useEffect cleanup
useEffect(() => () => unsubscribe(), []);
```

### Queries

```typescript
// Where clause
.where('age', '>=', 18)
.where('status', '==', 'active')

// Order by
.orderBy('createdAt', 'desc')

// Limit
.limit(10)

// Pagination
.startAfter(lastDoc)
```

### Batch & Transactions

```typescript
// Batch write
const batch = firestore().batch();
batch.set(ref1, data1);
batch.update(ref2, data2);
batch.delete(ref3);
await batch.commit();

// Transaction
await firestore().runTransaction(async (transaction) => {
  const doc = await transaction.get(ref);
  transaction.update(ref, { count: doc.data().count + 1 });
});
```

### Field Values

```typescript
firestore.FieldValue.serverTimestamp()
firestore.FieldValue.increment(n)
firestore.FieldValue.arrayUnion(...elements)
firestore.FieldValue.arrayRemove(...elements)
firestore.FieldValue.delete()
```

## Storage (File Upload)

### Image Upload

```typescript
import storage from '@react-native-firebase/storage';

const uploadImage = async (uri: string, path: string) => {
  const reference = storage().ref(path);
  const task = reference.putFile(uri);

  // Monitor progress
  task.on('state_changed', (snapshot) => {
    const progress = snapshot.bytesTransferred / snapshot.totalBytes * 100;
  });

  await task;
  const downloadURL = await reference.getDownloadURL();
  return downloadURL;
};
```

### Document Upload

```typescript
const uploadDocument = async (uri: string, fileName: string, path: string) => {
  const reference = storage().ref(`${path}/${fileName}`);
  await reference.putFile(uri);
  const downloadURL = await reference.getDownloadURL();
  
  // Store metadata in Firestore
  await firestore().collection('documents').add({
    fileName,
    downloadURL,
    uploadedAt: firestore.FieldValue.serverTimestamp(),
  });
  
  return downloadURL;
};
```

### File Operations

```typescript
// Delete file
await storage().ref(path).delete();

// Get download URL
const url = await storage().ref(path).getDownloadURL();

// Get metadata
const metadata = await storage().ref(path).getMetadata();
```

## Cloud Functions

### Call Cloud Function

```typescript
import functions from '@react-native-firebase/functions';

const callFunction = async (name: string, data: any) => {
  const functionRef = functions().httpsCallable(name);
  const result = await functionRef(data);
  return result.data;
};

// Usage
const result = await callFunction('sendNotification', { userId, message });
```

### With Timeout

```typescript
const callWithTimeout = async (name: string, data: any, timeoutMs = 30000) => {
  const functionRef = functions().httpsCallable(name);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  return await Promise.race([functionRef(data), timeoutPromise]);
};
```

## Cloud Messaging (Push Notifications)

### Setup

```typescript
import messaging from '@react-native-firebase/messaging';

// Request permission
if (Platform.OS === 'ios') {
  await messaging().requestPermission();
} else {
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

// Get FCM token
const token = await messaging().getToken();
```

### Message Handlers

```typescript
// Foreground messages
messaging().onMessage(async (remoteMessage) => {
  // Show notification or update UI
});

// Background messages (in index.js)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // Handle background message
});

// Notification opened app
messaging().onNotificationOpenedApp((remoteMessage) => {
  // Navigate to screen
});
```

## Analytics

```typescript
import analytics from '@react-native-firebase/analytics';

// Log event
await analytics().logEvent('purchase', { value: 99.99, currency: 'USD' });

// Set user properties
await analytics().setUserProperty('favorite_category', 'electronics');

// Set user ID
await analytics().setUserId(userId);
```

## Error Handling

### Common Error Codes

**Authentication:**
- `auth/email-already-in-use` - Email registered
- `auth/invalid-email` - Invalid email format
- `auth/weak-password` - Password too weak
- `auth/user-not-found` - User doesn't exist
- `auth/wrong-password` - Incorrect password

**Firestore:**
- `permission-denied` - Security rules violation
- `not-found` - Document/collection not found
- `unavailable` - Service unavailable

**Storage:**
- `unauthorized` - Unauthorized access
- `object-not-found` - File not found

**Functions:**
- `unavailable` - Function unavailable
- `deadline-exceeded` - Function timeout

### Error Handler Pattern

```typescript
const handleFirebaseError = (error: any) => {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Email is already registered';
    case 'permission-denied':
      return 'You do not have permission';
    // ... more cases
    default:
      return 'An error occurred';
  }
};
```

## Best Practices

1. **Always use try-catch** for async Firebase operations
2. **Unsubscribe listeners** in useEffect cleanup to prevent memory leaks
3. **Use TypeScript interfaces** for Firestore document structure
4. **Implement offline persistence** for Firestore when needed
5. **Cache download URLs** instead of fetching repeatedly
6. **Use batch operations** for multiple writes
7. **Implement retry logic** for network operations
8. **Validate data** before writing to Firestore
9. **Use security rules** in Firebase Console
10. **Monitor performance** using Firebase Performance Monitoring

## Quick Reference Patterns

### Custom Hooks

```typescript
// useDocument hook
const useDocument = (collection: string, docId: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!docId) return;
    const unsubscribe = firestore()
      .collection(collection)
      .doc(docId)
      .onSnapshot((snapshot) => {
        setData(snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null);
        setLoading(false);
      });
    return unsubscribe;
  }, [collection, docId]);
  
  return { data, loading };
};
```

### Service Layer Pattern

```typescript
// services/firebaseService.ts
class FirebaseService {
  async signUp(email: string, password: string) {
    return await auth().createUserWithEmailAndPassword(email, password);
  }
  
  async createDocument(collection: string, data: any) {
    return await firestore().collection(collection).add(data);
  }
  
  async uploadFile(uri: string, path: string) {
    const ref = storage().ref(path);
    await ref.putFile(uri);
    return await ref.getDownloadURL();
  }
}

export default new FirebaseService();
```

## Additional Resources

- For detailed API reference, see [reference.md](reference.md)
- For complete code examples, see [examples.md](examples.md)
- [Firebase Console](https://console.firebase.google.com/)
- [React Native Firebase Docs](https://rnfirebase.io/)
