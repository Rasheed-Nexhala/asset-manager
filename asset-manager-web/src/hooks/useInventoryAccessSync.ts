import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setMyAccessGrantedUntil } from '../store/slices/inventoryUpdateRequestSlice';
import { selectUserId, selectUserRoleType } from '../store/selectors/authSelectors';
import { subscribeToMyActiveAccess } from '../services/firebase/inventoryUpdateRequestService';

/**
 * Subscribes to the Store Incharge's active inventory update access.
 */
export const useInventoryAccessSync = (): void => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const role = useAppSelector(selectUserRoleType);

  useEffect(() => {
    if (!userId || role !== 'StoreIncharge') {
      dispatch(setMyAccessGrantedUntil(null));
      return;
    }

    const unsubscribe = subscribeToMyActiveAccess(userId, (request) => {
      dispatch(setMyAccessGrantedUntil(request?.accessExpiresAt ?? null));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, userId, role]);
};

export default useInventoryAccessSync;
