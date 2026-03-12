/**
 * useRequestsSubscriptions
 *
 * Firestore snapshot-based real-time updates for Request Queue and My Requests screens.
 * Subscribes when the screen is focused and unsubscribes when it loses focus.
 * Replaces paginated fetch with live data so new/updated requests appear immediately.
 */
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setRequests, setMyRequests } from '../store/slices/requestsSlice';
import { requestService } from '../services/firebase/requestService';
import { selectRequestsFilters } from '../store/selectors/requestSelectors';
import { selectUserId } from '../store/selectors/authSelectors';

/**
 * Subscribe to requests for Request Queue (Admin/StoreIncharge).
 * Uses status and siteId filters from the store.
 */
export function useRequestQueueSubscription() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectRequestsFilters);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = requestService.subscribeToRequests(
        {
          status: filters.status,
          siteId: filters.siteId,
        },
        (requests) => {
          // Defer dispatch to avoid "Cannot update component while rendering another" when
          // Firestore snapshot fires synchronously (e.g. from cache in tests)
          setTimeout(() => dispatch(setRequests(requests)), 0);
        }
      );
      return unsubscribe;
    }, [dispatch, filters.status, filters.siteId])
  );
}

/**
 * Subscribe to requests for My Requests (SiteManager).
 * Filters by userId so the user sees only their own requests.
 */
export function useMyRequestsSubscription() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return () => {};

      const unsubscribe = requestService.subscribeToRequests(
        { userId },
        (requests) => {
          // Defer dispatch to avoid "Cannot update component while rendering another" when
          // Firestore snapshot fires synchronously (e.g. from cache in tests)
          setTimeout(() => dispatch(setMyRequests(requests)), 0);
        }
      );
      return unsubscribe;
    }, [dispatch, userId])
  );
}
