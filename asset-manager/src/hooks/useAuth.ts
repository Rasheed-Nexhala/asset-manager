/**
 * Custom React Hook for Firebase Authentication
 * 
 * This hook provides easy access to authentication state and loading status
 * throughout your React Native application.
 * 
 * Features:
 * - Tracks current authenticated user
 * - Provides loading state during initialization
 * - Auto-updates when auth state changes
 * - Proper cleanup to prevent memory leaks
 * 
 * Usage:
 * ```typescript
 * const { user, loading } = useAuth();
 * 
 * if (loading) {
 *   return <LoadingScreen />;
 * }
 * 
 * if (user) {
 *   return <HomeScreen />;
 * } else {
 *   return <LoginScreen />;
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthState } from '../services/firebase/authService';

/**
 * Return type for useAuth hook
 */
export interface UseAuthReturn {
  /**
   * Current authenticated user or null if not signed in
   */
  user: User | null;

  /**
   * True while checking auth state on initial load
   * Set to false once the initial auth state is determined
   */
  loading: boolean;
}

/**
 * React Hook to access authentication state
 * 
 * This hook listens for authentication state changes and provides:
 * 1. Current user object (or null if not authenticated)
 * 2. Loading state (true during initial auth check)
 * 
 * The hook automatically:
 * - Sets up auth state listener on mount
 * - Cleans up listener on unmount (prevents memory leaks)
 * - Updates whenever user signs in/out
 * 
 * Real-world analogy:
 * Think of this like a security guard at a building entrance. The guard
 * always knows who's currently inside (user), and when someone first
 * arrives, there's a brief moment while checking their ID (loading).
 * 
 * @returns Object containing user and loading state
 * 
 * @example
 * ```typescript
 * // Basic usage in a component
 * const MyComponent = () => {
 *   const { user, loading } = useAuth();
 * 
 *   if (loading) {
 *     return <ActivityIndicator />;
 *   }
 * 
 *   return (
 *     <View>
 *       {user ? (
 *         <Text>Welcome, {user.email}!</Text>
 *       ) : (
 *         <Text>Please sign in</Text>
 *       )}
 *     </View>
 *   );
 * };
 * ```
 * 
 * @example
 * ```typescript
 * // Conditional navigation based on auth state
 * const RootNavigator = () => {
 *   const { user, loading } = useAuth();
 * 
 *   if (loading) {
 *     return <SplashScreen />;
 *   }
 * 
 *   return user ? <AppNavigator /> : <AuthNavigator />;
 * };
 * ```
 * 
 * @example
 * ```typescript
 * // Access user properties
 * const ProfileScreen = () => {
 *   const { user } = useAuth();
 * 
 *   if (!user) return null;
 * 
 *   return (
 *     <View>
 *       <Text>Email: {user.email}</Text>
 *       <Text>Display Name: {user.displayName}</Text>
 *       <Text>User ID: {user.uid}</Text>
 *       {user.photoURL && <Image source={{ uri: user.photoURL }} />}
 *     </View>
 *   );
 * };
 * ```
 */
export const useAuth = (): UseAuthReturn => {
  // State to track the current user (null means not authenticated)
  const [user, setUser] = useState<User | null>(null);

  // State to track if we're still checking the initial auth state
  // This is important for showing a loading screen on app startup
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Subscribe to auth state changes
     * 
     * This callback is called:
     * 1. Immediately with the current auth state (might be cached)
     * 2. Whenever user signs in
     * 3. Whenever user signs out
     * 4. When the auth token is refreshed
     * 
     * The subscription continues until we call the unsubscribe function.
     */
    const unsubscribe = subscribeToAuthState((currentUser) => {
      // Update user state
      setUser(currentUser);

      // Once we've received the initial auth state, we're no longer loading
      // This ensures loading is set to false on both first render and
      // subsequent auth state changes
      setLoading(false);
    });

    /**
     * Cleanup function
     * 
     * This is CRITICAL to prevent memory leaks!
     * 
     * When the component using this hook unmounts, we MUST unsubscribe
     * from the auth state listener. Otherwise, the listener will keep
     * running and trying to update state on an unmounted component.
     * 
     * React will call this cleanup function when:
     * - The component unmounts
     * - The dependency array changes (though we have an empty array here)
     * 
     * Real-world analogy:
     * It's like unsubscribing from a newspaper when you move out of your house.
     * If you don't unsubscribe, the newspaper keeps getting delivered to an
     * empty house (memory leak), and you might still get charged (performance impact).
     */
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  return { user, loading };
};

/**
 * Export for convenience
 */
export default useAuth;
