/**
 * useRequestsSubscriptions
 *
 * Firestore snapshot-based real-time updates for Request Queue and My Requests screens.
 *
 * Web adaptation: Replaces useFocusEffect (React Navigation) with useEffect.
 * On web with React Router, the component mounts when the route is active and unmounts
 * when navigating away, so useEffect provides equivalent subscribe/unsubscribe behavior.
 */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setRequests, setMyRequests } from '../store/slices/requestsSlice';
import { requestService } from '../services/firebase/requestService';
import { selectRequestsFilters } from '../store/selectors/requestSelectors';
import { selectUserId } from '../store/selectors/authSelectors';

/**
 * Subscribe to requests for Request Queue (Admin/StoreIncharge).
 */
export function useRequestQueueSubscription() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectRequestsFilters);

  useEffect(() => {
    const unsubscribe = requestService.subscribeToRequests(
      {
        status: filters.status,
        siteId: filters.siteId,
      },
      (requests) => {
        setTimeout(() => dispatch(setRequests(requests)), 0);
      }
    );
    return unsubscribe;
  }, [dispatch, filters.status, filters.siteId]);
}

/**
 * Subscribe to requests for My Requests (SiteManager).
 */
export function useMyRequestsSubscription() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);

  useEffect(() => {
    if (!userId) return () => {};

    const unsubscribe = requestService.subscribeToRequests(
      { userId },
      (requests) => {
        setTimeout(() => dispatch(setMyRequests(requests)), 0);
      }
    );
    return unsubscribe;
  }, [dispatch, userId]);
}
