import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  User,
  UserCredential,
  AuthError,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../config/firebase';
import { getUserRole } from './userRoleService';

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

/**
 * Log authentication event via Cloud Function (login/logout)
 * Uses try-catch to not block auth flow on logging failure
 */
async function logAuthEventToCloud(
  actionType: 'user_login' | 'user_logout',
  userName: string,
  userRole: string
): Promise<void> {
  try {
    const logAuthEventFn = httpsCallable<
      { actionType: string; userName: string; userRole: string; details?: string; deviceInfo?: string; appVersion?: string },
      { success: boolean }
    >(functions, 'logAuthEvent');
    await logAuthEventFn({
      actionType,
      userName,
      userRole,
      details: '',
      deviceInfo: 'React Native',
      appVersion: '1.0.0',
    });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? '';
    const message = (error as { message?: string })?.message ?? String(error);
    // Not-found/unavailable = Cloud Function not deployed or unreachable; avoid noisy ERROR
    if (code === 'functions/not-found' || code === 'functions/unavailable' || message.includes('not-found')) {
      if (__DEV__) {
        console.info(
          'Activity log (logAuthEvent) unavailable. Deploy Cloud Functions to enable auth event logging.'
        );
      }
      return;
    }
    // Unauthenticated = token not ready or expired when request was sent; avoid noisy ERROR
    if (code === 'unauthenticated' || message.includes('unauthenticated')) {
      if (__DEV__) {
        console.info('Activity log (logAuthEvent): request was unauthenticated; event not logged.');
      }
      return;
    }
    console.error('Failed to log auth event:', error);
    // Don't throw - logging failure should not block auth
  }
}

/**
 * Log failed login attempt via Cloud Function (unauthenticated call)
 * Uses try-catch to not block auth flow on logging failure
 */
async function logLoginFailedToCloud(
  email: string,
  details: string
): Promise<void> {
  try {
    const logAuthEventFn = httpsCallable<
      { actionType: string; email: string; details?: string; deviceInfo?: string; appVersion?: string },
      { success: boolean }
    >(functions, 'logAuthEvent');
    await logAuthEventFn({
      actionType: 'login_failed',
      email,
      details,
      deviceInfo: 'React Native',
      appVersion: '1.0.0',
    });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? '';
    const message = (error as { message?: string })?.message ?? String(error);
    if (code === 'functions/not-found' || code === 'functions/unavailable' || message.includes('not-found')) {
      if (__DEV__) {
        console.info(
          'Activity log (logAuthEvent) unavailable. Deploy Cloud Functions to enable auth event logging.'
        );
      }
      return;
    }
    if (__DEV__) {
      console.info('Failed to log login_failed event:', error);
    }
    // Don't throw - logging failure should not block auth
  }
}

/**
 * Log password change via Cloud Function
 * Called after successful password update - uses try-catch to not block flow
 */
export async function logPasswordChanged(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userRole = await getUserRole(user.uid);
    const logPasswordChangedFn = httpsCallable<
      { userRole?: string; deviceInfo?: string; appVersion?: string },
      { success: boolean }
    >(functions, 'logPasswordChanged');
    await logPasswordChangedFn({
      userRole: userRole?.role ?? 'Unassigned',
      deviceInfo: 'React Native',
      appVersion: '1.0.0',
    });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? '';
    const message = (error as { message?: string })?.message ?? String(error);
    if (code === 'functions/not-found' || code === 'functions/unavailable' || message.includes('not-found')) {
      if (__DEV__) {
        console.info(
          'Activity log (logPasswordChanged) unavailable. Deploy Cloud Functions to enable logging.'
        );
      }
      return;
    }
    if (__DEV__) {
      console.info('Failed to log password_changed event:', error);
    }
  }
}

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

    // Ensure the new user's ID token is ready before calling the Cloud Function.
    // Without this, the callable can be sent with a stale/missing token and return "unauthenticated".
    await userCredential.user.getIdToken(true);

    // Log login event (non-blocking)
    const userRole = await getUserRole(userCredential.user.uid);
    await logAuthEventToCloud(
      'user_login',
      userCredential.user.displayName ?? userCredential.user.email ?? email,
      userRole?.role ?? 'Unassigned'
    );

    return userCredential;
  } catch (error) {
    const authError = error as AuthError;
    console.error('Sign in error:', authError.code, authError.message);
    // Log failed login attempt (non-blocking, user is not authenticated)
    logLoginFailedToCloud(email, authError.message ?? authError.code ?? 'Unknown error').catch(() => {});
    throw handleAuthError(authError);
  }
};

export const logout = async (): Promise<void> => {
  try {
    // Log logout event BEFORE signOut (user must be authenticated for Cloud Function)
    const user = auth.currentUser;
    if (user) {
      // Ensure we have a fresh token so the callable request is authenticated
      await user.getIdToken(true);
      const userRole = await getUserRole(user.uid);
      await logAuthEventToCloud(
        'user_logout',
        user.displayName ?? user.email ?? 'User',
        userRole?.role ?? 'Unassigned'
      );
    }

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

export const requiresRecentLogin = (error: any): boolean => {
  return error?.code === 'auth/requires-recent-login';
};

export const updateUserPassword = async (newPassword: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    await updatePassword(user, newPassword);
  } catch (error) {
    const authError = error as AuthError;
    console.error('Password update error:', authError.code, authError.message);
    throw handleAuthError(authError);
  }
};

export const reauthenticateAndUpdatePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user is currently signed in or user email is missing');
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    await reauthenticateWithCredential(user, credential);

    await updatePassword(user, newPassword);
  } catch (error) {
    const authError = error as AuthError;
    console.error(
      'Re-authentication and password update error:',
      authError.code,
      authError.message
    );
    if (
      authError.code === 'auth/wrong-password' ||
      authError.code === 'auth/invalid-credential'
    ) {
      const reauthError = new Error('Current password is incorrect.');
      (reauthError as any).code = authError.code;
      throw reauthError;
    }
    throw handleAuthError(authError);
  }
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
      'Please verify your current password to continue.',
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
  updateUserPassword,
  reauthenticateAndUpdatePassword,
  requiresRecentLogin,
  subscribeToAuthState,
  getCurrentUser,
  isAuthenticated,
};
