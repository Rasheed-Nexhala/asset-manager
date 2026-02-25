import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../useAuth';

jest.mock('firebase/auth', () => ({ User: function User() {} }));

const mockUnsubscribe = jest.fn();
let authCallback: ((user: unknown) => void) | null = null;

jest.mock('../../services/firebase/authService', () => ({
  subscribeToAuthState: jest.fn((callback: (user: unknown) => void) => {
    authCallback = callback;
    return mockUnsubscribe;
  }),
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authCallback = null;
  });

  it('starts with loading true and user null', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('sets loading false and user null when callback fires with null', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      authCallback?.(null);
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('sets user when callback fires with mock user', async () => {
    const mockUser = {
      uid: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      authCallback?.(mockUser);
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual(mockUser);
  });

  it('updates user when callback fires again (e.g. sign out)', async () => {
    const mockUser = { uid: 'user-123', email: 'test@example.com' };
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      authCallback?.(mockUser);
      await Promise.resolve();
    });
    expect(result.current.user).toEqual(mockUser);

    await act(async () => {
      authCallback?.(null);
      await Promise.resolve();
    });
    expect(result.current.user).toBeNull();
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
