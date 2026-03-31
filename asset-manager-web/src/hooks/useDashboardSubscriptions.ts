import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setSites } from '../store/slices/sitesSlice';
import { setCategories, setInventoryForLocation } from '../store/slices/inventorySlice';
import { subscribeToSites } from '../services/firebase/siteService';
import { subscribeCategories } from '../services/firebase/categoryService';
import {
  subscribeInventoryByLocation,
} from '../services/firebase/inventoryService';
import { getLocationId } from '../utils/locationUtils';
import type { UserRole } from '../types/roles';

interface UseDashboardSubscriptionsParams {
  userId: string | null;
  role: UserRole | null;
  assignedSiteId: string | null;
  isVisible: boolean;
}

export interface UseDashboardSubscriptionsResult {
  isInitialLoad: boolean;
  isRefreshing: boolean;
  triggerRefresh: () => void;
}

/**
 * Subscribes to Firestore data based on user role when Dashboard is visible.
 */
export function useDashboardSubscriptions({
  userId,
  role,
  assignedSiteId,
  isVisible,
}: UseDashboardSubscriptionsParams): UseDashboardSubscriptionsResult {
  const dispatch = useAppDispatch();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isFirstRun = useRef(true);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((t) => t + 1);
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  useEffect(() => {
    if (!userId || !role || !isVisible) {
      return;
    }

    if (isFirstRun.current) {
      setIsInitialLoad(true);
      isFirstRun.current = false;
    }
    const timeout = setTimeout(() => setIsInitialLoad(false), 3000);

    const unsubscribes: Array<() => void> = [];
    let receivedCount = 0;
    const markReceived = () => {
      receivedCount += 1;
      if (receivedCount >= 1) setIsInitialLoad(false);
    };

    if (
      role === 'Admin' ||
      role === 'SuperAdmin' ||
      role === 'StoreIncharge'
    ) {
      const unsubSites = subscribeToSites((sites) => {
        dispatch(setSites(sites));
        markReceived();
      });
      unsubscribes.push(unsubSites);

      const unsubCategories = subscribeCategories((categories) => {
        dispatch(setCategories(categories));
        markReceived();
      });
      unsubscribes.push(unsubCategories);
    } else if (role === 'SiteManager') {
      const unsubSites = subscribeToSites((sites) => {
        dispatch(setSites(sites));
        markReceived();
      });
      unsubscribes.push(unsubSites);

      if (assignedSiteId) {
        const locationId = getLocationId('site', assignedSiteId);
        const unsubInventory = subscribeInventoryByLocation(
          locationId,
          (inventory) => {
            dispatch(setInventoryForLocation({ locationId, inventory }));
            markReceived();
          }
        );
        unsubscribes.push(unsubInventory);
      }
    }

    return () => {
      clearTimeout(timeout);
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [dispatch, userId, role, assignedSiteId, isVisible, refreshTrigger]);

  return { isInitialLoad, isRefreshing, triggerRefresh };
}
