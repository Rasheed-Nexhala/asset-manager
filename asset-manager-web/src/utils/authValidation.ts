import type { AuthFormErrors, AuthFormValues } from '../types/auth';

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateLoginForm(values: AuthFormValues): AuthFormErrors {
  const errors: AuthFormErrors = {};
  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email';
  }
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  return errors;
}

export function validateSignupForm(
  values: AuthFormValues,
  confirmPassword: string
): AuthFormErrors {
  const errors = validateLoginForm(values);
  if (!values.name?.trim()) {
    errors.name = 'Name is required';
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}
