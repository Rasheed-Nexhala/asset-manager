import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectItemsError } from '../store/selectors/inventorySelectors';
import { clearError } from '../store/slices/inventorySlice';

/**
 * Hook for inventory error with automatic clearing.
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

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  return error;
};
