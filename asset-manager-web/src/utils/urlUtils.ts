/**
 * Validates that a URL is safe to open via Linking.openURL.
 * Only allows https:, http:, and file: schemes to prevent XSS/URL injection
 * from user-uploaded content (e.g. javascript:, data:, vbscript:).
 *
 * @param url - The URL to validate (e.g. from Firestore)
 * @returns true if the URL uses an allowed scheme, false otherwise
 */
export function isSafeOpenableUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('file://')
  );
}
