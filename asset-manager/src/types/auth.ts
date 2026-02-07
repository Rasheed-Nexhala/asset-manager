import { User } from 'firebase/auth';
import type { UserRoleData } from './roles';

export type AuthMode = 'login' | 'signup';

export interface AuthFormValues {
  name: string;
  email: string;
  password: string;
}

export interface AuthFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface AuthState {
  user: User | null;
  userRole: UserRoleData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRoleLoading: boolean;
  error: string | null;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}
