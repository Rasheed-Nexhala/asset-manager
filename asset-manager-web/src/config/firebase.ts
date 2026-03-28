import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { browserLocalPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

/**
 * Firebase Web SDK Configuration
 *
 * This config uses the Firebase Web SDK for the CIAMS web app.
 * Auth persistence: browserLocalPersistence — session persists in browser storage.
 *
 * Override via Vite env: `VITE_FIREBASE_*` (see `.env.example`).
 * Use `npm run dev:demo` to load `.env.demo` (demo Firebase project).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyCSd424s9bpQQSK0FFcBP7VQ6wRYVZ8GeE',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ??
    'asset-management-system-622c2.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'asset-management-system-622c2',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
    'asset-management-system-622c2.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '145560718311',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ??
    '1:145560718311:web:cc34b1747f5bffe5bb0b42',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-RY22WQBVXZ',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});
export const db = getFirestore(app);
export const storage = getStorage(app);

const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION?.trim();
export const functions = functionsRegion
  ? getFunctions(app, functionsRegion)
  : getFunctions(app);

/** Google Analytics (web only); null when unsupported or no measurementId */
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  void isSupported().then((ok) => {
    if (ok) {
      analytics = getAnalytics(app);
    }
  });
}

export default app;
