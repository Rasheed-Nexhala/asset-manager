import {
  validateEmail,
  validateLoginForm,
  validateSignupForm,
} from '../authValidation';

describe('authValidation', () => {
  describe('validateEmail', () => {
    it('returns true for valid email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co')).toBe(true);
    });

    it('returns false for empty or whitespace email', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });

    it('returns false for invalid email formats', () => {
      expect(validateEmail('missing-at.com')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
    });

    it('trims whitespace before validating', () => {
      expect(validateEmail('  user@example.com  ')).toBe(true);
    });
  });

  describe('validateLoginForm', () => {
    it('returns no errors for valid values', () => {
      const result = validateLoginForm({
        name: 'John',
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result).toEqual({});
    });

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
        email: 'invalid',
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

    it('returns password error when password is too short', () => {
      const result = validateLoginForm({
        name: '',
        email: 'user@example.com',
        password: '12345',
      });
      expect(result.password).toBe('Password must be at least 6 characters');
    });
  });

  describe('validateSignupForm', () => {
    it('returns no errors for valid values with matching passwords', () => {
      const result = validateSignupForm(
        {
          name: 'John Doe',
          email: 'user@example.com',
          password: 'password123',
        },
        'password123'
      );
      expect(result).toEqual({});
    });

    it('returns name error when name is empty', () => {
      const result = validateSignupForm(
        {
          name: '',
          email: 'user@example.com',
          password: 'password123',
        },
        'password123'
      );
      expect(result.name).toBe('Name is required');
    });

    it('returns confirmPassword error when confirmPassword is empty', () => {
      const result = validateSignupForm(
        {
          name: 'John',
          email: 'user@example.com',
          password: 'password123',
        },
        ''
      );
      expect(result.confirmPassword).toBe('Please confirm your password');
    });

    it('returns confirmPassword error when passwords do not match', () => {
      const result = validateSignupForm(
        {
          name: 'John',
          email: 'user@example.com',
          password: 'password123',
        },
        'different'
      );
      expect(result.confirmPassword).toBe('Passwords do not match');
    });

    it('inherits login form errors (email, password)', () => {
      const result = validateSignupForm(
        {
          name: 'John',
          email: '',
          password: '123',
        },
        '123'
      );
      expect(result.email).toBe('Email is required');
      expect(result.password).toBe('Password must be at least 6 characters');
    });
  });
});
