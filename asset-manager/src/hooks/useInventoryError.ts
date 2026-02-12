import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectItemsError } from '../store/selectors/inventorySelectors';
import { clearError } from '../store/slices/inventorySlice';

/**
 * Hook for inventory error with automatic clearing.
 * - Returns the current error for display
 * - Auto-clears after `autoClearMs` (default 5 seconds)
 * - Clears on component unmount to prevent stale errors when navigating away
 */
export const useInventoryError = (autoClearMs = 5000) => {
  const error = useAppSelector(selectItemsError);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, autoClearMs);

      return () => clearTimeout(timer);
    }
  }, [error, dispatch, autoClearMs]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  return error;
};
