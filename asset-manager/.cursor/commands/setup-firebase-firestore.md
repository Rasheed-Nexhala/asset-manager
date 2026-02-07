Learn from `.cursor/skills/firebase-react-native` how to implement Firestore database operations using Firebase Web SDK in React Native/Expo applications.

## Implementation Steps

1. **Understand Data Model Requirements**
   - Analyze the data structure and relationships
   - Plan Firestore collections and document structure
   - Design security rules for the collection
   - Consider indexing requirements for queries

2. **Implement Firestore Operations**
   - Use Firebase Web SDK patterns from the skill (not @react-native-firebase)
   - Import from `firebase/firestore` and use `db` from `config/firebase`
   - Implement CRUD operations with proper TypeScript types:
     - `addDoc()` for creating documents
     - `getDoc()` / `getDocs()` for reading
     - `updateDoc()` for updating
     - `deleteDoc()` for deleting
   - Use `query()`, `where()`, `orderBy()`, `limit()` for queries
   - Implement real-time listeners with `onSnapshot()` and proper cleanup
   - Add pagination using `startAfter()` / `limit()` for large datasets

3. **Error Handling & Best Practices**
   - Wrap all Firestore operations in try-catch blocks
   - Handle specific error codes (`permission-denied`, `not-found`, etc.)
   - Use `serverTimestamp()` for timestamps (not `new Date()`)
   - Always return unsubscribe functions from `useEffect` for listeners
   - Implement loading states for async operations
   - Validate data before writing to Firestore

4. **React Integration**
   - Create custom hooks for reusable Firestore operations
   - Use `useState` and `useEffect` for real-time data
   - Implement proper TypeScript interfaces for document types
   - Handle loading and error states in components

## Key Patterns from Skill

- **Real-time Listener Pattern**: Always return unsubscribe function
- **Query Pattern**: Use `query()` with `where()`, `orderBy()`, `limit()`
- **Type Safety**: Define interfaces for Firestore documents
- **Error Handling**: Check `error.code` for specific Firebase errors
- **Pagination**: Use `startAfter()` with document snapshots

## Reference Files

- Main patterns: `.cursor/skills/firebase-react-native/SKILL.md`
- Complete API: `.cursor/skills/firebase-react-native/FIREBASE_API.md`
- Quick reference: `.cursor/skills/firebase-react-native/QUICK_REFERENCE.md`
- Usage examples: `config/FIREBASE_USAGE.md`