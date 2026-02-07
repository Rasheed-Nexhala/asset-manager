/**
 * Auth screen mode: either login or signup.
 * Used to toggle form fields and submit behavior.
 */
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
}
