import { sanitizeForDisplay } from '../sanitizeUtils';

describe('sanitizeForDisplay', () => {
  it('returns empty string for null', () => {
    expect(sanitizeForDisplay(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(sanitizeForDisplay(undefined)).toBe('');
  });

  it('escapes ampersand', () => {
    expect(sanitizeForDisplay('foo & bar')).toBe('foo &amp; bar');
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

  it('escapes all HTML entities in one string', () => {
    expect(sanitizeForDisplay('<img src="x" onerror="alert(1)">')).toBe(
      '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'
    );
  });

  it('passes through safe text unchanged', () => {
    expect(sanitizeForDisplay('Hello world')).toBe('Hello world');
    expect(sanitizeForDisplay('Error: Invalid credentials')).toBe('Error: Invalid credentials');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeForDisplay(123 as unknown as string)).toBe('');
    expect(sanitizeForDisplay({} as unknown as string)).toBe('');
  });
});
