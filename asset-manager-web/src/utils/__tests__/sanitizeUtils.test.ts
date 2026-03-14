/**
 * Unit tests for sanitize utilities
 */
import { describe, it, expect } from 'vitest';
import { sanitizeForDisplay } from '../sanitizeUtils';

describe('sanitizeForDisplay', () => {
  it('returns empty string for null', () => {
    expect(sanitizeForDisplay(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(sanitizeForDisplay(undefined)).toBe('');
  });

  it('escapes ampersand', () => {
    expect(sanitizeForDisplay('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(sanitizeForDisplay('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than', () => {
    expect(sanitizeForDisplay('>')).toBe('&gt;');
  });

  it('escapes double quote', () => {
    expect(sanitizeForDisplay('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quote', () => {
    expect(sanitizeForDisplay("it's")).toBe('it&#x27;s');
  });

  it('returns normal string unchanged when no special chars', () => {
    const input = 'Hello world 123';
    expect(sanitizeForDisplay(input)).toBe(input);
  });

  it('escapes multiple special characters', () => {
    expect(sanitizeForDisplay('<a href="x">')).toBe(
      '&lt;a href=&quot;x&quot;&gt;'
    );
  });
});
