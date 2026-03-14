/**
 * Unit tests for auth validation utilities
 */
import { describe, it, expect } from 'vitest';
import { validateEmail, validateLoginForm, validateSignupForm } from '../authValidation';

describe('validateEmail', () => {
  it('returns true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co')).toBe(true);
    expect(validateEmail('a@b.co')).toBe(true);
  });

  it('returns false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
    expect(validateEmail('noatsign.com')).toBe(false);
    expect(validateEmail('spaces in@email.com')).toBe(false);
  });

  it('returns false for empty or whitespace', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('   ')).toBe(false);
    expect(validateEmail('\t')).toBe(false);
  });
});

describe('validateLoginForm', () => {
  it('returns email error when email is empty', () => {
    const result = validateLoginForm({
      name: '',
      email: '',
      password: 'password123',
    });
    expect(result.email).toBe('Email is required');
  });

  it('returns email error when email is invalid', () => {
    const result = validateLoginForm({
      name: '',
      email: 'notanemail',
      password: 'password123',
    });
    expect(result.email).toBe('Please enter a valid email');
  });

  it('returns password error when password is empty', () => {
    const result = validateLoginForm({
      name: '',
      email: 'user@example.com',
      password: '',
    });
    expect(result.password).toBe('Password is required');
  });

  it('returns password error when password is less than 6 characters', () => {
    const result = validateLoginForm({
      name: '',
      email: 'user@example.com',
      password: '12345',
    });
    expect(result.password).toBe('Password must be at least 6 characters');
  });

  it('returns empty errors for valid login form', () => {
    const result = validateLoginForm({
      name: '',
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result).toEqual({});
  });
});

describe('validateSignupForm', () => {
  it('extends login validation (empty email/password errors)', () => {
    const result = validateSignupForm(
      { name: 'John', email: '', password: '' },
      ''
    );
    expect(result.email).toBe('Email is required');
    expect(result.password).toBe('Password is required');
  });

  it('returns name error when name is empty', () => {
    const result = validateSignupForm(
      { name: '', email: 'user@example.com', password: 'password123' },
      'password123'
    );
    expect(result.name).toBe('Name is required');
  });

  it('returns name error when name is whitespace only', () => {
    const result = validateSignupForm(
      { name: '   ', email: 'user@example.com', password: 'password123' },
      'password123'
    );
    expect(result.name).toBe('Name is required');
  });

  it('returns confirmPassword error when confirmPassword is empty', () => {
    const result = validateSignupForm(
      { name: 'John', email: 'user@example.com', password: 'password123' },
      ''
    );
    expect(result.confirmPassword).toBe('Please confirm your password');
  });

  it('returns confirmPassword error when passwords do not match', () => {
    const result = validateSignupForm(
      { name: 'John', email: 'user@example.com', password: 'password123' },
      'differentpassword'
    );
    expect(result.confirmPassword).toBe('Passwords do not match');
  });

  it('returns empty errors for valid signup form', () => {
    const result = validateSignupForm(
      { name: 'John Doe', email: 'user@example.com', password: 'password123' },
      'password123'
    );
    expect(result).toEqual({});
  });
});
