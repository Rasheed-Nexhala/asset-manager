import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  WeightViewPreferenceProvider,
  useWeightViewPreference,
} from '../useWeightViewPreference';

const STORAGE_KEY = 'ciams_weight_view_preference';

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(WeightViewPreferenceProvider, null, children);

describe('useWeightViewPreference', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when used outside Provider', () => {
    expect(() => renderHook(() => useWeightViewPreference())).toThrow(
      'useWeightViewPreference must be used within WeightViewPreferenceProvider'
    );
  });

  it('returns viewMode, toggleViewMode, setViewMode when inside Provider', () => {
    const { result } = renderHook(() => useWeightViewPreference(), { wrapper });
    expect(result.current).toHaveProperty('viewMode');
    expect(result.current).toHaveProperty('toggleViewMode');
    expect(result.current).toHaveProperty('setViewMode');
    expect(typeof result.current.toggleViewMode).toBe('function');
    expect(typeof result.current.setViewMode).toBe('function');
  });

  it('toggleViewMode switches pieces <-> kg', async () => {
    const { result } = renderHook(() => useWeightViewPreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.viewMode).toBe('pieces');
    });

    act(() => {
      result.current.toggleViewMode();
    });
    expect(result.current.viewMode).toBe('kg');

    act(() => {
      result.current.toggleViewMode();
    });
    expect(result.current.viewMode).toBe('pieces');
  });

  it('setViewMode updates mode', async () => {
    const { result } = renderHook(() => useWeightViewPreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.viewMode).toBe('pieces');
    });

    act(() => {
      result.current.setViewMode('kg');
    });
    expect(result.current.viewMode).toBe('kg');

    act(() => {
      result.current.setViewMode('pieces');
    });
    expect(result.current.viewMode).toBe('pieces');
  });

  it('reads from localStorage on mount (if stored value is kg, viewMode is kg)', async () => {
    localStorageMock.setItem(STORAGE_KEY, 'kg');
    const { result } = renderHook(() => useWeightViewPreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.viewMode).toBe('kg');
    });
  });
});
