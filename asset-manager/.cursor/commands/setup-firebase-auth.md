Learn from `.cursor/skills/firebase-react-native` how to implement Firebase Authentication using Firebase Web SDK in React Native/Expo applications.

## Implementation Steps

1. **Understand Authentication Requirements**
   - Identify required auth methods (email/password, social auth, etc.)
   - Plan authentication flow and user journey
   - Determine protected routes and screens
   - Plan auth state management approach

2. **Implement Authentication Methods**
   - Use Firebase Web SDK patterns from the skill (not @react-native-firebase)
   - Import from `firebase/auth` and use `auth` from `config/firebase`
   - Implement core auth operations:
     - `createUserWithEmailAndPassword()` for sign up
     - `signInWithEmailAndPassword()` for sign in
     - `signOut()` for sign out
     - `sendPasswordResetEmail()` for password reset
     - `onAuthStateChanged()` for auth state monitoring
   - Use proper TypeScript types (`User`, `UserCredential`)

3. **Create Auth Hook**
   - Implement `useAuth()` hook following skill pattern
   - Track `user` state and `loading` state
   - Use `onAuthStateChanged()` listener with proper cleanup
   - Return unsubscribe function from `useEffect`

4. **Error Handling & User Experience**
   - Wrap all auth operations in try-catch blocks
   - Handle specific auth error codes:
     - `auth/email-already-in-use`
     - `auth/wrong-password`
     - `auth/user-not-found`
     - `auth/invalid-email`
     - `auth/weak-password`
   - Display user-friendly error messages
   - Implement loading states during auth operations
   - Handle network errors gracefully

5. **Integration with App**
   - Integrate `useAuth()` hook in root component or context
   - Protect routes/screens based on auth state
   - Navigate appropriately after sign in/sign out
   - Persist auth state (handled automatically by Firebase)
   - Handle deep linking with auth tokens if needed

## Key Patterns from Skill

- **Auth State Listener**: Use `onAuthStateChanged()` with cleanup
- **Custom Hook Pattern**: `useAuth()` returns `{ user, loading }`
- **Error Handling**: Check `error.code` for specific auth errors
- **Type Safety**: Use `User` type from `firebase/auth`
- **Loading States**: Track loading during async auth operations

## Reference Files

- Main patterns: `.cursor/skills/firebase-react-native/SKILL.md`
- Complete API: `.cursor/skills/firebase-react-native/FIREBASE_API.md`
- Quick reference: `.cursor/skills/firebase-react-native/QUICK_REFERENCE.md`
- Usage examples: `config/FIREBASE_USAGE.md`