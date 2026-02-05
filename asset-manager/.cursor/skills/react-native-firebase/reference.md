# React Native Firebase - API Reference

Complete API reference for all React Native Firebase modules.

## Authentication API

### Methods

#### `createUserWithEmailAndPassword(email, password)`
Creates a new user account with email and password.

**Returns:** `Promise<UserCredential>`

**Error Codes:**
- `auth/email-already-in-use`
- `auth/invalid-email`
- `auth/weak-password`

#### `signInWithEmailAndPassword(email, password)`
Signs in a user with email and password.

**Returns:** `Promise<UserCredential>`

**Error Codes:**
- `auth/user-not-found`
- `auth/wrong-password`
- `auth/invalid-email`

#### `signOut()`
Signs out the current user.

**Returns:** `Promise<void>`

#### `sendPasswordResetEmail(email)`
Sends a password reset email.

**Returns:** `Promise<void>`

#### `sendEmailVerification()`
Sends email verification to current user.

**Returns:** `Promise<void>`

#### `onAuthStateChanged(callback)`
Listens to authentication state changes.

**Returns:** `Unsubscribe` function

### User Object Methods

#### `user.updateProfile({ displayName?, photoURL? })`
Updates user profile information.

**Returns:** `Promise<void>`

#### `user.updateEmail(newEmail)`
Updates user email address.

**Returns:** `Promise<void>`

#### `user.updatePassword(newPassword)`
Updates user password.

**Returns:** `Promise<void>`

#### `user.sendEmailVerification()`
Sends email verification.

**Returns:** `Promise<void>`

#### `user.delete()`
Deletes the user account.

**Returns:** `Promise<void>`

#### `user.getIdToken(forceRefresh?)`
Gets the user's ID token.

**Returns:** `Promise<string>`

## Firestore API

### Collection Methods

#### `collection(path)`
Gets a reference to a collection.

**Returns:** `CollectionReference`

#### `collection(path).add(data)`
Adds a document to the collection with auto-generated ID.

**Returns:** `Promise<DocumentReference>`

#### `collection(path).doc(id)`
Gets a reference to a document.

**Returns:** `DocumentReference`

### Document Methods

#### `doc(path).set(data, options?)`
Creates or overwrites a document.

**Options:**
- `merge: boolean` - Merge with existing data

**Returns:** `Promise<void>`

#### `doc(path).get()`
Gets document data once.

**Returns:** `Promise<DocumentSnapshot>`

#### `doc(path).update(data)`
Updates document fields.

**Returns:** `Promise<void>`

#### `doc(path).delete()`
Deletes a document.

**Returns:** `Promise<void>`

#### `doc(path).onSnapshot(callback, errorCallback?)`
Listens to document changes in real-time.

**Returns:** `Unsubscribe` function

### Query Methods

#### `collection(path).where(field, operator, value)`
Filters documents by field value.

**Operators:**
- `<`, `<=`, `==`, `>=`, `>`
- `!=`, `array-contains`, `array-contains-any`, `in`, `not-in`

**Returns:** `Query`

#### `collection(path).orderBy(field, direction?)`
Orders documents by field.

**Direction:** `'asc'` | `'desc'`

**Returns:** `Query`

#### `collection(path).limit(count)`
Limits the number of documents.

**Returns:** `Query`

#### `collection(path).startAfter(snapshot)`
Starts results after a document snapshot.

**Returns:** `Query`

#### `collection(path).startAt(snapshot)`
Starts results at a document snapshot.

**Returns:** `Query`

### Batch Operations

#### `firestore().batch()`
Creates a batch write operation.

**Returns:** `WriteBatch`

**Methods:**
- `batch.set(ref, data)` - Set document
- `batch.update(ref, data)` - Update document
- `batch.delete(ref)` - Delete document
- `batch.commit()` - Commit batch

### Transactions

#### `firestore().runTransaction(updateFunction)`
Runs a transaction.

**UpdateFunction:** `(transaction: Transaction) => Promise<T>`

**Transaction Methods:**
- `transaction.get(ref)` - Get document
- `transaction.set(ref, data)` - Set document
- `transaction.update(ref, data)` - Update document
- `transaction.delete(ref)` - Delete document

### Field Values

#### `firestore.FieldValue.serverTimestamp()`
Server timestamp placeholder.

#### `firestore.FieldValue.increment(n)`
Increments a numeric field.

#### `firestore.FieldValue.arrayUnion(...elements)`
Adds elements to array field.

#### `firestore.FieldValue.arrayRemove(...elements)`
Removes elements from array field.

#### `firestore.FieldValue.delete()`
Deletes a field.

## Storage API

### Reference Methods

#### `storage().ref(path)`
Gets a reference to a file path.

**Returns:** `Reference`

#### `ref.putFile(localUri, metadata?)`
Uploads a file from local URI.

**Returns:** `UploadTask`

**Metadata:**
- `contentType: string`
- `customMetadata: object`

#### `ref.getDownloadURL()`
Gets download URL for file.

**Returns:** `Promise<string>`

#### `ref.delete()`
Deletes a file.

**Returns:** `Promise<void>`

#### `ref.getMetadata()`
Gets file metadata.

**Returns:** `Promise<FullMetadata>`

#### `ref.updateMetadata(metadata)`
Updates file metadata.

**Returns:** `Promise<FullMetadata>`

### Upload Task Events

#### `task.on('state_changed', next?, error?, complete?)`
Monitors upload progress.

**States:**
- `running` - Upload in progress
- `paused` - Upload paused
- `success` - Upload complete
- `error` - Upload failed

**TaskSnapshot Properties:**
- `bytesTransferred` - Bytes uploaded
- `totalBytes` - Total bytes
- `state` - Current state

## Cloud Functions API

#### `functions().httpsCallable(name)`
Gets a callable function reference.

**Returns:** `HttpsCallable`

#### `callable(data)`
Calls the cloud function with data.

**Returns:** `Promise<HttpsCallableResult>`

**Result Properties:**
- `data` - Function return value

## Messaging API

#### `messaging().getToken()`
Gets FCM registration token.

**Returns:** `Promise<string>`

#### `messaging().requestPermission()`
Requests notification permission (iOS).

**Returns:** `Promise<AuthorizationStatus>`

#### `messaging().onMessage(callback)`
Listens to foreground messages.

**Returns:** `Unsubscribe` function

#### `messaging().setBackgroundMessageHandler(handler)`
Sets background message handler.

**Handler:** `(message: RemoteMessage) => Promise<void>`

#### `messaging().onNotificationOpenedApp(callback)`
Listens to notification taps when app is in background.

**Returns:** `Unsubscribe` function

#### `messaging().getInitialNotification()`
Gets notification that opened app from quit state.

**Returns:** `Promise<RemoteMessage | null>`

## Analytics API

#### `analytics().logEvent(name, params?)`
Logs a custom event.

**Returns:** `Promise<void>`

#### `analytics().setUserId(userId)`
Sets user ID.

**Returns:** `Promise<void>`

#### `analytics().setUserProperty(name, value)`
Sets user property.

**Returns:** `Promise<void>`

#### `analytics().setAnalyticsCollectionEnabled(enabled)`
Enables/disables analytics collection.

**Returns:** `Promise<void>`

#### `analytics().resetAnalyticsData()`
Resets analytics data.

**Returns:** `Promise<void>`

## TypeScript Types

### User

```typescript
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  metadata: UserMetadata;
  updateProfile(profile: UpdateProfile): Promise<void>;
  updateEmail(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  sendEmailVerification(): Promise<void>;
  delete(): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}
```

### DocumentSnapshot

```typescript
interface DocumentSnapshot {
  id: string;
  exists: boolean;
  data(): any | undefined;
  get(fieldPath: string): any;
  metadata: SnapshotMetadata;
}
```

### QuerySnapshot

```typescript
interface QuerySnapshot {
  docs: DocumentSnapshot[];
  empty: boolean;
  size: number;
  metadata: SnapshotMetadata;
  docChanges(): DocumentChange[];
}
```

### RemoteMessage

```typescript
interface RemoteMessage {
  messageId?: string;
  notification?: Notification;
  data?: { [key: string]: string };
  sentTime?: number;
}
```

## Error Handling

### Common Error Structure

```typescript
interface FirebaseError {
  code: string;
  message: string;
  stack?: string;
}
```

### Error Code Patterns

**Authentication:**
- `auth/*` - Authentication errors

**Firestore:**
- `firestore/*` - Firestore errors
- `permission-denied` - Security rules violation
- `not-found` - Document/collection not found
- `unavailable` - Service unavailable

**Storage:**
- `storage/*` - Storage errors
- `unauthorized` - Unauthorized access
- `object-not-found` - File not found

**Functions:**
- `functions/*` - Cloud Functions errors
- `unavailable` - Function unavailable
- `deadline-exceeded` - Function timeout
