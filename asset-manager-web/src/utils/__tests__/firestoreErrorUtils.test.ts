import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapFirestoreErrorToUserMessage } from '../firestoreErrorUtils';

describe('firestoreErrorUtils', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('maps permission-denied to a clear message', () => {
    const msg = mapFirestoreErrorToUserMessage({ code: 'permission-denied' });
    expect(msg).toContain('permission');
    expect(msg).toContain('Admin');
  });

  it('maps unauthenticated to session message', () => {
    expect(mapFirestoreErrorToUserMessage({ code: 'unauthenticated' })).toContain('Session expired');
  });

  it('maps message fallbacks when code is in message string', () => {
    expect(
      mapFirestoreErrorToUserMessage({ message: 'permission-denied in request' })
    ).toContain('permission');
    expect(
      mapFirestoreErrorToUserMessage({ message: 'FirebaseError: unauthenticated' })
    ).toContain('Session expired');
  });

  it('uses short original message when present', () => {
    expect(mapFirestoreErrorToUserMessage({ message: 'Custom short error' })).toBe('Custom short error');
  });

  it('uses fallback for unknown errors', () => {
    const fb = 'Fallback';
    expect(mapFirestoreErrorToUserMessage({}, fb)).toBe(fb);
  });

  it('logs in __DEV__ when error is truthy', () => {
    const err = { code: 'unknown', message: 'x' };
    mapFirestoreErrorToUserMessage(err);
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toBe('[Firestore Error]');
  });
});
