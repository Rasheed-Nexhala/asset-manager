# Firebase React Native Skill

This skill teaches the AI agent how to implement and work with Firebase Web SDK in React Native and Expo applications.

## What This Skill Covers

- **Firebase Web SDK Setup**: Configuration and initialization for React Native/Expo
- **Authentication**: Email/password auth, auth state management, sign in/out flows
- **Firestore Database**: CRUD operations, queries, real-time listeners, pagination
- **Cloud Storage**: File uploads, downloads, and deletion (React Native compatible)
- **React Patterns**: Custom hooks, error handling, loading states
- **Best Practices**: Security rules, offline support, TypeScript types

## When to Use This Skill

The AI agent will automatically use this skill when:
- Working with Firebase services in React Native
- User mentions Firebase, Firestore, Authentication, or Cloud Storage
- Building features that require backend services
- Setting up user authentication
- Implementing real-time data sync
- Handling file uploads/downloads

## File Structure

```
firebase-react-native/
├── SKILL.md              # Main skill instructions (essential patterns)
├── FIREBASE_API.md       # Complete API reference (detailed methods)
├── QUICK_REFERENCE.md    # Cheatsheet (fast lookup)
└── README.md            # This file
```

## Why Firebase Web SDK?

This skill focuses on Firebase **Web SDK** (not @react-native-firebase) because:

✅ **Expo Go Compatible**: Works without ejecting or prebuild
✅ **Simpler Setup**: JavaScript config only, no native files
✅ **Cross-Platform**: Same code for React Native, Expo, and web
✅ **Rapid Development**: Faster iteration and prototyping

### Trade-offs

| Feature | Web SDK | Native SDK |
|---------|---------|------------|
| Expo Go | ✅ Yes | ❌ No |
| Setup Time | ⚡ Fast | 🐌 Slow |
| Performance | 👍 Good | 🚀 Better |
| Push Notifications | ❌ Limited | ✅ Full |
| Offline Support | 👍 Good | 🚀 Better |

## Key Concepts Explained (For Junior Developers)

### What is Firebase?

Firebase is a **Backend-as-a-Service (BaaS)** platform from Google. Instead of building your own backend server, database, and authentication system, Firebase provides ready-to-use services:

**Real-world analogy**: Think of Firebase like a restaurant's kitchen. Instead of cooking everything yourself (building a backend), you order from the menu (use Firebase services) and get your meal ready-made.

### Firebase Services Used in This Skill

1. **Authentication** 🔐
   - Manages user accounts, login, and logout
   - Like a bouncer at a club: checks if users are allowed in
   
2. **Firestore Database** 📊
   - NoSQL database that stores your app's data
   - Like a smart filing cabinet that automatically syncs across all devices
   
3. **Cloud Storage** 🖼️
   - Stores files (images, videos, documents)
   - Like Google Drive for your app's files

### Key Technical Concepts

#### 1. Promises and Async/Await

Firebase operations are **asynchronous** - they take time to complete (network requests).

```typescript
// ❌ Wrong: This won't work
const user = signInWithEmailAndPassword(auth, email, password);
console.log(user); // Won't have data yet!

// ✅ Correct: Use await to wait for completion
const userCredential = await signInWithEmailAndPassword(auth, email, password);
console.log(userCredential.user); // Now we have the data
```

**Real-world analogy**: Ordering pizza online
- ❌ You can't eat it immediately after clicking "Order"
- ✅ You must `await` the delivery before you can eat

#### 2. Real-time Listeners

Listeners automatically update when data changes in Firebase.

```typescript
onSnapshot(query, (snapshot) => {
  // This function runs every time data changes!
  const items = snapshot.docs.map(doc => doc.data());
  setItems(items);
});
```

**Real-world analogy**: Live sports score app
- Without listeners: You must refresh to see new scores (manual polling)
- With listeners: Scores update automatically when goals are scored

#### 3. Unsubscribe Functions

Listeners keep running until you stop them. Always clean up!

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(query, callback);
  
  return () => unsubscribe(); // Cleanup when component unmounts
}, []);
```

**Real-world analogy**: Subscribing to a magazine
- Subscribe = Start receiving updates
- Unsubscribe = Stop receiving updates (prevent wasted resources)

#### 4. NoSQL vs SQL

Firestore is a **NoSQL** database - it stores data differently than traditional databases.

**SQL (Traditional)**:
```
Table: Users
| id | name  | email           |
|----|-------|-----------------|
| 1  | Alice | alice@email.com |
```

**NoSQL (Firestore)**:
```
Collection: users
Document: user-123
{
  id: "user-123",
  name: "Alice",
  email: "alice@email.com",
  posts: ["post-1", "post-2"]  // Can have arrays!
}
```

**Real-world analogy**:
- SQL = Spreadsheet with fixed columns
- NoSQL = Filing cabinet with flexible folders

#### 5. Collections and Documents

Firestore structure:
```
Collection (like a folder)
  └── Document (like a file with data)
       └── Sub-collection (nested folder)
            └── Document
```

Example:
```
users (collection)
  └── user-123 (document)
       ├── name: "Alice"
       ├── email: "alice@email.com"
       └── posts (sub-collection)
            └── post-1 (document)
                 ├── title: "My first post"
                 └── content: "Hello world!"
```

#### 6. Blob Conversion (File Uploads)

In React Native, images are stored as URIs (like file paths). Firebase needs blobs (binary data).

```typescript
// Step 1: Image picker gives you a URI
const uri = "file:///path/to/image.jpg";

// Step 2: Convert URI to blob (binary data)
const response = await fetch(uri);
const blob = await response.blob();

// Step 3: Upload blob to Firebase
await uploadBytes(storageRef, blob);
```

**Real-world analogy**: Sending a letter
1. You have a physical document (URI/file on device)
2. You put it in an envelope (convert to blob)
3. You mail it (upload to Firebase)

#### 7. Error Handling

Always wrap Firebase calls in try-catch blocks:

```typescript
try {
  await signInWithEmailAndPassword(auth, email, password);
  // Success!
} catch (error: any) {
  console.error('Login failed:', error.code, error.message);
  // error.code = 'auth/wrong-password'
  // error.message = 'The password is invalid'
}
```

**Why?**: Network requests can fail (no internet, wrong credentials, server issues).

**Real-world analogy**: Calling someone on the phone
- Success: They answer
- Catch error: Line busy, no signal, wrong number

## Common Pitfalls (Junior Developers)

### ❌ Mistake 1: Forgetting to await
```typescript
// ❌ Wrong
const user = signInWithEmailAndPassword(auth, email, password);
console.log(user); // Promise, not data!

// ✅ Correct
const userCredential = await signInWithEmailAndPassword(auth, email, password);
console.log(userCredential.user); // Actual user data
```

### ❌ Mistake 2: Not unsubscribing from listeners
```typescript
// ❌ Wrong: Memory leak!
useEffect(() => {
  onSnapshot(query, (snapshot) => {
    setData(snapshot.docs);
  });
}, []);

// ✅ Correct: Cleanup on unmount
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snapshot) => {
    setData(snapshot.docs);
  });
  return () => unsubscribe();
}, []);
```

### ❌ Mistake 3: Forgetting to check if document exists
```typescript
// ❌ Wrong: Will crash if document doesn't exist
const docSnap = await getDoc(docRef);
const data = docSnap.data(); // undefined if doesn't exist!

// ✅ Correct: Check first
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
  const data = docSnap.data();
} else {
  console.log('Document not found');
}
```

### ❌ Mistake 4: Using client timestamp instead of server
```typescript
// ❌ Wrong: Client time can be wrong (user changed device time)
await addDoc(collection(db, 'posts'), {
  createdAt: new Date() // Client time
});

// ✅ Correct: Use server timestamp
import { serverTimestamp } from 'firebase/firestore';
await addDoc(collection(db, 'posts'), {
  createdAt: serverTimestamp() // Server time (accurate)
});
```

### ❌ Mistake 5: Not handling loading states
```typescript
// ❌ Wrong: UI shows nothing while loading
const fetchData = async () => {
  const data = await getDocs(collection(db, 'items'));
  setItems(data.docs);
};

// ✅ Correct: Show loading indicator
const [loading, setLoading] = useState(true);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await getDocs(collection(db, 'items'));
    setItems(data.docs);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// In render:
if (loading) return <ActivityIndicator />;
```

## Visual Diagrams

### Firebase Authentication Flow

```
User enters credentials
        ↓
signInWithEmailAndPassword(auth, email, password)
        ↓
    Firebase verifies credentials
        ↓
   ┌────────────┴────────────┐
   ↓ Success                 ↓ Failure
Returns UserCredential   Throws error with code
   ↓                         ↓
Store user in state      Show error message
   ↓
User is authenticated
   ↓
onAuthStateChanged() fires with user object
```

### Firestore Real-time Flow

```
Component mounts
        ↓
onSnapshot(query, callback) subscribes
        ↓
Firebase sends initial data
        ↓
callback runs → setData(initial data)
        ↓
UI renders with data
        ↓
[Time passes... data changes in Firebase]
        ↓
Firebase pushes update automatically
        ↓
callback runs again → setData(new data)
        ↓
UI automatically re-renders
        ↓
Component unmounts
        ↓
unsubscribe() called (cleanup)
```

### File Upload Flow (React Native)

```
User picks image from gallery
        ↓
ImagePicker returns: { uri: "file:///..." }
        ↓
fetch(uri) → loads file into memory
        ↓
.blob() → converts to binary format
        ↓
ref(storage, "images/filename.jpg") → creates reference
        ↓
uploadBytes(ref, blob) → uploads to Firebase
        ↓
Upload complete
        ↓
getDownloadURL(ref) → gets public URL
        ↓
Store URL in Firestore (optional)
        ↓
Use URL in <Image> component
```

## Usage Tips

1. **Start with SKILL.md**: Essential patterns and common use cases
2. **Reference QUICK_REFERENCE.md**: When you need fast code snippets
3. **Deep-dive in FIREBASE_API.md**: When you need complete method documentation

## Contributing

To improve this skill:
1. Keep SKILL.md under 500 lines (currently ~470 lines)
2. Add new patterns to appropriate sections
3. Keep code examples concise
4. Include TypeScript types
5. Add explanations for complex concepts (remember: junior developers)

## Related Skills

- `react-native-navigation`: For protected routes based on auth state
- `react-native-forms`: For handling auth and data input forms
- `typescript-patterns`: For better type safety with Firebase

## License

This skill is part of the asset-manager project and follows the project's license.

---

**Last Updated**: February 7, 2026
**Skill Version**: 1.0.0
**Minimum Firebase Version**: 9.0.0+
