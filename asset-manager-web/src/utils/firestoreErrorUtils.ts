/**
 * Maps Firebase/Firestore errors to user-friendly messages.
 * Used when surfacing errors from Firestore operations (e.g. adjustQuantity).
 */

/** Extract error code from various Firebase error shapes */
function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as Record<string, unknown>;
  return (err.code as string) ?? (err.error as { code?: string })?.code;
}

/** Extract error message from various Firebase error shapes */
function getErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as Record<string, unknown>;
  if (typeof err.message === 'string') return err.message;
  const inner = err.error as { message?: string } | undefined;
  return inner?.message;
}

/**
 * Maps Firestore/Firebase errors to user-friendly messages.
 * Helps users understand permission, auth, and data issues.
 *
 * @param error - Caught error from Firestore or Firebase SDK
 * @param fallback - Message when error cannot be mapped
 * @returns User-friendly error message
 */
export function mapFirestoreErrorToUserMessage(
  error: unknown,
  fallback = 'Failed to update inventory. Please try again.'
): string {
  const code = getErrorCode(error);
  const message = (getErrorMessage(error) ?? '').toLowerCase();

  if (import.meta.env.DEV && error) {
    // eslint-disable-next-line no-console
    console.warn('[Firestore Error]', {
      code,
      message: getErrorMessage(error),
      error,
    });
  }

  switch (code) {
    case 'permission-denied':
      return "You don't have permission to update inventory. Ensure your account is active and you have the correct role (Admin or Store Incharge with approval). Contact your Admin.";
    case 'unauthenticated':
      return 'Session expired. Please sign in again.';
    case 'not-found':
      return 'Item or inventory record not found. Please refresh and try again.';
    case 'failed-precondition':
      return 'Operation failed. The data may have changed. Please refresh and try again.';
    case 'resource-exhausted':
    case 'deadline-exceeded':
      return 'Request timed out. Please check your connection and try again.';
    case 'unavailable':
      return 'Service temporarily unavailable. Please try again in a moment.';
    default:
      break;
  }

  // Firestore errors sometimes put code in message
  if (message.includes('permission-denied') || message.includes('permission denied')) {
    return "You don't have permission to update inventory. Ensure your account is active and you have the correct role. Contact your Admin.";
  }
  if (message.includes('unauthenticated') || message.includes('requires-recent-login')) {
    return 'Session expired. Please sign in again.';
  }

  // Use original message if it's user-friendly, otherwise fallback
  const original = getErrorMessage(error);
  if (original && original.length > 0 && original.length < 200) {
    return original;
  }

  return fallback;
}
