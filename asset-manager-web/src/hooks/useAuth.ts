/**
 * Custom React Hook for Firebase Authentication
 *
 * This hook provides easy access to authentication state and loading status
 * throughout your React application.
 *
 * Features:
 * - Tracks current authenticated user
 * - Provides loading state during initialization
 * - Auto-updates when auth state changes
 * - Proper cleanup to prevent memory leaks
 */

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthState } from '../services/firebase/authService';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
}

/**
 * React Hook to access authentication state
 *
 * @returns Object containing user and loading state
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
};

export default useAuth;
