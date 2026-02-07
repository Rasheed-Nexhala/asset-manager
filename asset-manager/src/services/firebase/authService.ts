import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User,
  UserCredential,
  AuthError,
} from 'firebase/auth';
import { auth } from '../../../config/firebase';

export interface ProfileUpdateData {
  displayName?: string;
  photoURL?: string;
}

export type AuthStateCallback = (user: User | null) => void;

export const signUp = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential;
  } catch (error) {
    const authError = error as AuthError;
    console.error('Sign up error:', authError.code, authError.message);
    throw handleAuthError(authError);
  }
};

export const signIn = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential;
  } catch (error) {
    const authError = error as AuthError;
    console.error('Sign in error:', authError.code, authError.message);
    throw handleAuthError(authError);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    const authError = error as AuthError;
    console.error('Sign out error:', authError.code, authError.message);
    throw handleAuthError(authError);
  }
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const authError = error as AuthError;
    console.error('Password reset error:', authError.code, authError.message);
    throw handleAuthError(authError);
  }
};

export const updateUserProfile = async (
  profileData: ProfileUpdateData
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    await updateProfile(user, profileData);
  } catch (error) {
    const authError = error as AuthError;
    console.error('Profile update error:', authError.code, authError.message);
    throw handleAuthError(authError);
  }
};

export const subscribeToAuthState = (
  callback: AuthStateCallback
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

const handleAuthError = (error: AuthError): Error => {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use':
      'This email is already registered. Please sign in or use a different email.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password':
      'Password is too weak. Please use at least 6 characters.',
    'auth/user-not-found':
      'No account found with this email. Please check your email or sign up.',
    'auth/wrong-password':
      'Incorrect password. Please try again or reset your password.',
    'auth/invalid-credential':
      'Invalid email or password. Please check your credentials and try again.',
    'auth/user-disabled':
      'This account has been disabled. Please contact support.',
    'auth/too-many-requests':
      'Too many failed attempts. Please try again later or reset your password.',
    'auth/requires-recent-login':
      'For security, please sign in again to complete this action.',
    'auth/network-request-failed':
      'Network error. Please check your internet connection and try again.',
    'auth/operation-not-allowed':
      'This authentication method is not enabled. Please contact support.',
  };

  const message =
    errorMessages[error.code] ||
    `Authentication error: ${error.message}. Please try again.`;

  const customError = new Error(message);
  (customError as any).code = error.code;
  return customError;
};

export default {
  signUp,
  signIn,
  logout,
  sendPasswordReset,
  updateUserProfile,
  subscribeToAuthState,
  getCurrentUser,
  isAuthenticated,
};
