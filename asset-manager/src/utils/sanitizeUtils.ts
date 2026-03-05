/**
 * XSS defense-in-depth utilities for user-facing strings from external sources.
 *
 * React Native Text escapes by default, but sanitizing provides defense-in-depth
 * for future WebView use or web export. Use when displaying strings from:
 * - Firebase error messages
 * - API responses
 * - Thunk rejectWithValue payloads
 * - Any catch block error messages
 *
 * @example
 * // In a Redux slice rejected handler:
 * state.error = sanitizeForDisplay(action.payload as string) || 'An unexpected error occurred';
 *
 * @example
 * // When displaying user-generated content:
 * <Text>{sanitizeForDisplay(externalString)}</Text>
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

/**
 * Escapes HTML entities in a string to prevent XSS when displayed.
 * Returns empty string for null or undefined.
 *
 * @param text - Raw string from external source (API, Firebase, catch block)
 * @returns Sanitized string safe for display, or '' if input is null/undefined
 */
export function sanitizeForDisplay(text: string | null | undefined): string {
  if (text == null) return '';
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}
