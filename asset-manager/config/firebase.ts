import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Firebase Web SDK Configuration
 *
 * This config uses the Firebase Web SDK (not @react-native-firebase).
 * Works in Expo Go, web builds, and native builds.
 *
 * Auth persistence:
 * - React Native (iOS/Android): AsyncStorage — user stays logged in until sign out
 * - Web: browserLocalPersistence — session persists in browser storage
 *
 * Values are extracted from google-services.json and GoogleService-Info.plist.
 * For production, consider using environment variables for sensitive data.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCSd424s9bpQQSK0FFcBP7VQ6wRYVZ8GeE",
  authDomain: "asset-management-system-622c2.firebaseapp.com",
  projectId: "asset-management-system-622c2",
  storageBucket: "asset-management-system-622c2.firebasestorage.app",
  messagingSenderId: "145560718311",
  appId: "1:145560718311:web:cc34b1747f5bffe5bb0b42",
  measurementId: "G-RY22WQBVXZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with platform-appropriate persistence
// React Native: AsyncStorage so auth survives app restarts until user signs out
// Web: browser localStorage
const authPersistence =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? getReactNativePersistence(AsyncStorage)
    : browserLocalPersistence;

export const auth = initializeAuth(app, {
  persistence: authPersistence,
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// if (__DEV__) {
//   const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

//   connectAuthEmulator(auth, `http://${host}:9099`);
//   connectFirestoreEmulator(db, host, 8080);
//   connectStorageEmulator(storage, host, 9199);
//   connectFunctionsEmulator(functions, host, 5001);
// }

// Export the app instance if needed
export default app;
