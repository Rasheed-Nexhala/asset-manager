/**
 * Hook to persist user's preference for viewing weight (Pcs vs Kg).
 * Uses React Context so the preference is shared across all components.
 *
 * Web adaptation: Replaces @react-native-async-storage/async-storage with localStorage.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'ciams_weight_view_preference';

export type WeightViewMode = 'pieces' | 'kg';

interface WeightViewPreferenceContextValue {
  viewMode: WeightViewMode;
  toggleViewMode: () => void;
  setViewMode: (mode: WeightViewMode) => void;
}

const WeightViewPreferenceContext = createContext<
  WeightViewPreferenceContextValue | undefined
>(undefined);

export function WeightViewPreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [viewMode, setViewModeState] = useState<WeightViewMode>('pieces');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'pieces' || stored === 'kg') {
        setViewModeState(stored);
      }
    } catch {
      // Ignore localStorage errors (e.g. private browsing)
    } finally {
      setLoaded(true);
    }
  }, []);

  const setViewMode = useCallback((mode: WeightViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore
    }
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewModeState((prev) => {
      const next = prev === 'pieces' ? 'kg' : 'pieces';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const value: WeightViewPreferenceContextValue = {
    viewMode: loaded ? viewMode : 'pieces',
    toggleViewMode,
    setViewMode,
  };

  return React.createElement(
    WeightViewPreferenceContext.Provider,
    { value },
    children
  );
}

export function useWeightViewPreference(): WeightViewPreferenceContextValue {
  const context = useContext(WeightViewPreferenceContext);
  if (context === undefined) {
    throw new Error(
      'useWeightViewPreference must be used within WeightViewPreferenceProvider'
    );
  }
  return context;
}
