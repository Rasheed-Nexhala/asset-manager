# Firebase Web SDK API Reference

Complete reference for Firebase Web SDK methods in React Native context.

## Authentication API

### createUserWithEmailAndPassword
```typescript
createUserWithEmailAndPassword(auth, email, password): Promise<UserCredential>
```
Creates a new user account with email and password.

**Error codes:**
- `auth/email-already-in-use`: Email is already registered
- `auth/invalid-email`: Email format is invalid
- `auth/weak-password`: Password too weak (< 6 characters)

### signInWithEmailAndPassword
```typescript
signInWithEmailAndPassword(auth, email, password): Promise<UserCredential>
```
Signs in existing user with email and password.

**Error codes:**
- `auth/user-not-found`: No user with this email
- `auth/wrong-password`: Incorrect password
- `auth/invalid-email`: Email format is invalid

### signOut
```typescript
signOut(auth): Promise<void>
```
Signs out the current user.

### onAuthStateChanged
```typescript
onAuthStateChanged(auth, callback): Unsubscribe
```
Listens for authentication state changes. Returns unsubscribe function.

**Callback receives:** `User | null`

### sendPasswordResetEmail
```typescript
sendPasswordResetEmail(auth, email): Promise<void>
```
Sends password reset email to user.

### updateProfile
```typescript
updateProfile(user, { displayName?, photoURL? }): Promise<void>
```
Updates user profile information.

### updatePassword
```typescript
updatePassword(user, newPassword): Promise<void>
```
Updates user password. Requires recent authentication.

### updateEmail
```typescript
updateEmail(user, newEmail): Promise<void>
```
Updates user email. Requires recent authentication.

### deleteUser
```typescript
deleteUser(user): Promise<void>
```
Deletes the user account. Requires recent authentication.

## Firestore API

### Collection Operations

#### collection
```typescript
collection(db, path): CollectionReference
```
Gets reference to a collection.

#### doc
```typescript
doc(db, path, id?): DocumentReference
```
Gets reference to a document. If ID is omitted, generates new ID.

### Read Operations

#### getDoc
```typescript
getDoc(docRef): Promise<DocumentSnapshot>
```
Fetches a single document.

**Check existence:**
```typescript
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
  const data = docSnap.data();
}
```

#### getDocs
```typescript
getDocs(query): Promise<QuerySnapshot>
```
Executes query and fetches all matching documents.

**Iterate results:**
```typescript
const snapshot = await getDocs(q);
snapshot.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

#### onSnapshot (Document)
```typescript
onSnapshot(docRef, callback, errorCallback?): Unsubscribe
```
Listens for real-time updates to a document.

#### onSnapshot (Query)
```typescript
onSnapshot(query, callback, errorCallback?): Unsubscribe
```
Listens for real-time updates to query results.

### Write Operations

#### addDoc
```typescript
addDoc(collectionRef, data): Promise<DocumentReference>
```
Adds new document with auto-generated ID.

#### setDoc
```typescript
setDoc(docRef, data, { merge?: boolean }): Promise<void>
```
Creates or overwrites document with specific ID.

**With merge:**
```typescript
await setDoc(docRef, { field: 'value' }, { merge: true });
```
Only updates specified fields, leaves others unchanged.

#### updateDoc
```typescript
updateDoc(docRef, data): Promise<void>
```
Updates specific fields. Document must exist.

**Update nested fields:**
```typescript
await updateDoc(docRef, {
  'address.city': 'New York',
  'tags.0': 'updated-tag'
});
```

#### deleteDoc
```typescript
deleteDoc(docRef): Promise<void>
```
Deletes a document.

#### deleteField
```typescript
import { deleteField } from 'firebase/firestore';

await updateDoc(docRef, {
  fieldToRemove: deleteField()
});
```
Removes a field from document.

### Query Operators

#### where
```typescript
where(field, operator, value)
```

**Operators:**
- `==`, `!=`: Equality
- `<`, `<=`, `>`, `>=`: Comparison
- `array-contains`: Array contains value
- `array-contains-any`: Array contains any of values
- `in`: Value in array (max 10 items)
- `not-in`: Value not in array (max 10 items)

**Compound queries:**
```typescript
query(
  collection(db, 'items'),
  where('category', '==', 'electronics'),
  where('price', '<', 1000)
);
```

**Limitations:**
- Can't combine `!=` and `not-in` with other operators
- Range filters must be on same field
- Need composite index for multi-field queries

#### orderBy
```typescript
orderBy(field, direction?)
```
Direction: `'asc'` (default) or `'desc'`

**Multiple ordering:**
```typescript
query(
  collection(db, 'items'),
  orderBy('category'),
  orderBy('price', 'desc')
);
```

#### limit / limitToLast
```typescript
limit(count)
limitToLast(count)
```
Limits number of results. `limitToLast` gets last N items (requires `orderBy`).

#### startAt / startAfter / endAt / endBefore
```typescript
startAt(value)
startAfter(value)
endAt(value)
endBefore(value)
```
Pagination cursors. Use with `orderBy`.

**Pagination example:**
```typescript
// First page
const firstPage = await getDocs(
  query(collection(db, 'items'), orderBy('name'), limit(10))
);

// Get last document
const lastDoc = firstPage.docs[firstPage.docs.length - 1];

// Next page
const nextPage = await getDocs(
  query(collection(db, 'items'), orderBy('name'), startAfter(lastDoc), limit(10))
);
```

### Transactions

```typescript
import { runTransaction } from 'firebase/firestore';

await runTransaction(db, async (transaction) => {
  const docRef = doc(db, 'collection', 'docId');
  const docSnap = await transaction.get(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Document does not exist');
  }
  
  const newValue = docSnap.data().value + 1;
  transaction.update(docRef, { value: newValue });
});
```

**Use cases:**
- Counter increments
- Conditional updates
- Multi-document atomic writes

### Batch Writes

```typescript
import { writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);

const ref1 = doc(db, 'collection', 'doc1');
batch.set(ref1, { data: 'value1' });

const ref2 = doc(db, 'collection', 'doc2');
batch.update(ref2, { field: 'updated' });

const ref3 = doc(db, 'collection', 'doc3');
batch.delete(ref3);

await batch.commit();
```

**Limits:**
- Max 500 operations per batch
- All-or-nothing: entire batch fails or succeeds

## Storage API

### ref
```typescript
ref(storage, path?): StorageReference
```
Creates reference to file or folder.

### uploadBytes
```typescript
uploadBytes(storageRef, blob, metadata?): Promise<UploadResult>
```
Uploads file from blob.

**Metadata example:**
```typescript
await uploadBytes(storageRef, blob, {
  contentType: 'image/jpeg',
  customMetadata: {
    uploadedBy: 'userId123'
  }
});
```

### uploadString
```typescript
uploadString(storageRef, string, format?, metadata?): Promise<UploadResult>
```
Uploads string data.

**Formats:**
- `'raw'`: Plain string
- `'base64'`: Base64-encoded
- `'base64url'`: Base64 URL-safe
- `'data_url'`: Data URL

```typescript
await uploadString(storageRef, base64String, 'base64');
```

### getDownloadURL
```typescript
getDownloadURL(storageRef): Promise<string>
```
Gets public download URL for file.

### deleteObject
```typescript
deleteObject(storageRef): Promise<void>
```
Deletes file.

### listAll
```typescript
listAll(storageRef): Promise<ListResult>
```
Lists all files and folders under reference.

```typescript
const result = await listAll(folderRef);
result.items.forEach(itemRef => {
  console.log('File:', itemRef.name);
});
result.prefixes.forEach(folderRef => {
  console.log('Folder:', folderRef.name);
});
```

### getMetadata
```typescript
getMetadata(storageRef): Promise<FullMetadata>
```
Gets file metadata (size, type, created date, etc.).

### updateMetadata
```typescript
updateMetadata(storageRef, metadata): Promise<FullMetadata>
```
Updates file metadata.

## Common Error Codes

### Authentication Errors
- `auth/email-already-in-use`
- `auth/invalid-email`
- `auth/operation-not-allowed`
- `auth/weak-password`
- `auth/user-disabled`
- `auth/user-not-found`
- `auth/wrong-password`
- `auth/too-many-requests`

### Firestore Errors
- `permission-denied`: Security rules rejected operation
- `unavailable`: Service temporarily unavailable
- `not-found`: Document doesn't exist
- `already-exists`: Document already exists (with specific ID)
- `resource-exhausted`: Quota exceeded
- `failed-precondition`: Operation requires specific conditions
- `aborted`: Transaction conflict
- `out-of-range`: Invalid operation parameter
- `unimplemented`: Operation not supported
- `internal`: Internal error
- `deadline-exceeded`: Operation timeout

### Storage Errors
- `storage/unauthorized`: User doesn't have permission
- `storage/canceled`: User canceled operation
- `storage/unknown`: Unknown error
- `storage/object-not-found`: File doesn't exist
- `storage/bucket-not-found`: Bucket doesn't exist
- `storage/project-not-found`: Project doesn't exist
- `storage/quota-exceeded`: Storage quota exceeded
- `storage/unauthenticated`: User not authenticated
- `storage/invalid-checksum`: File checksum mismatch
- `storage/retry-limit-exceeded`: Max retry time exceeded

## TypeScript Types

```typescript
import {
  User,
  UserCredential,
  AuthError
} from 'firebase/auth';

import {
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot,
  QueryDocumentSnapshot,
  CollectionReference,
  DocumentReference,
  Timestamp,
  FieldValue,
  serverTimestamp,
  deleteField,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';

import {
  StorageReference,
  UploadResult,
  FullMetadata,
  ListResult
} from 'firebase/storage';
```

## Field Values

### serverTimestamp
```typescript
import { serverTimestamp } from 'firebase/firestore';

await setDoc(docRef, {
  createdAt: serverTimestamp()
});
```
Uses server time (not client time).

### increment
```typescript
import { increment } from 'firebase/firestore';

await updateDoc(docRef, {
  views: increment(1),
  likes: increment(-1)
});
```
Atomically increments/decrements numeric field.

### arrayUnion / arrayRemove
```typescript
import { arrayUnion, arrayRemove } from 'firebase/firestore';

// Add items to array (no duplicates)
await updateDoc(docRef, {
  tags: arrayUnion('new-tag', 'another-tag')
});

// Remove items from array
await updateDoc(docRef, {
  tags: arrayRemove('old-tag')
});
```

## Timestamp Conversion

```typescript
import { Timestamp } from 'firebase/firestore';

// Firestore stores dates as Timestamp objects
const docSnap = await getDoc(docRef);
const timestamp: Timestamp = docSnap.data().createdAt;

// Convert to JavaScript Date
const date: Date = timestamp.toDate();

// Create Timestamp from Date
const timestamp = Timestamp.fromDate(new Date());

// Create Timestamp from milliseconds
const timestamp = Timestamp.fromMillis(Date.now());
```

## Performance Tips

1. **Use queries instead of fetching all documents**
2. **Limit query results** with `limit()`
3. **Index compound queries** in Firebase Console
4. **Unsubscribe from listeners** to prevent memory leaks
5. **Use batch writes** for multiple operations
6. **Cache download URLs** instead of calling `getDownloadURL()` repeatedly
7. **Use `where` filters before `orderBy`** for better performance
8. **Paginate large datasets** with `startAfter()` cursors
9. **Use transactions for atomic operations** on related documents
10. **Compress images** before uploading to Storage
