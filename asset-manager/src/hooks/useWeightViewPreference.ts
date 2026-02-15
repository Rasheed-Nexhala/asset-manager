/**
 * Hook to persist user's preference for viewing weight (Pcs vs Kg).
 * Uses React Context so the preference is shared across all components -
 * when one screen toggles, all WeightDisplay components update.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ciams_weight_view_preference';

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
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'pieces' || stored === 'kg') {
        setViewModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setViewMode = useCallback((mode: WeightViewMode) => {
    setViewModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewModeState((prev) => {
      const next = prev === 'pieces' ? 'kg' : 'pieces';
      AsyncStorage.setItem(STORAGE_KEY, next);
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
