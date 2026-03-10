import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setRequests, setMyRequests } from '../store/slices/requestsSlice';
import { setPurchaseOrders } from '../store/slices/purchaseOrderSlice';
import { setMaintenanceRecords } from '../store/slices/maintenanceSlice';
import { setItems, setCategories, setInventoryForLocation } from '../store/slices/inventorySlice';
import { setSites } from '../store/slices/sitesSlice';
import { requestService } from '../services/firebase/requestService';
import { subscribeToPurchaseOrders } from '../services/firebase/purchaseOrderService';
import { subscribeToMaintenance } from '../services/firebase/maintenanceService';
import { subscribeItems, subscribeInventoryByLocation, getInventoryByLocation } from '../services/firebase/inventoryService';
import { subscribeToSites } from '../services/firebase/siteService';
import { subscribeCategories } from '../services/firebase/categoryService';
import { getLocationId } from '../utils/locationUtils';
import { runNonCriticalTask } from '../utils/nonCriticalTask';
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
 * Returns isInitialLoad (true until first data received or timeout) and triggerRefresh.
 *
 * Auto-update: triggerRefresh tears down and re-establishes subscriptions, forcing
 * a fresh Firestore snapshot. Called on pull-to-refresh and when app returns to foreground.
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

    // Only show full loading on first run; refresh uses pull indicator only
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

    if (role === 'Admin') {
      // Admin: all requests, POs, maintenance, items, sites, categories
      const unsubRequests = requestService.subscribeToRequests(
        { status: 'all' },
        (requests) => {
          dispatch(setRequests(requests));
          markReceived();
        }
      );
      unsubscribes.push(unsubRequests);

      const unsubPOs = subscribeToPurchaseOrders((orders) => {
        dispatch(setPurchaseOrders(orders));
        markReceived();
      });
      unsubscribes.push(unsubPOs);

      const unsubMaintenance = subscribeToMaintenance((records) => {
        dispatch(setMaintenanceRecords(records));
        markReceived();
      });
      unsubscribes.push(unsubMaintenance);

      const unsubItems = subscribeItems((items) => {
        dispatch(setItems(items));
        markReceived();
      });
      unsubscribes.push(unsubItems);

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
    } else if (role === 'StoreIncharge') {
      // StoreIncharge: same as Admin minus subscribeToSites (or include for site names in requests)
      const unsubRequests = requestService.subscribeToRequests(
        { status: 'all' },
        (requests) => {
          dispatch(setRequests(requests));
          markReceived();
        }
      );
      unsubscribes.push(unsubRequests);

      const unsubPOs = subscribeToPurchaseOrders((orders) => {
        dispatch(setPurchaseOrders(orders));
        markReceived();
      });
      unsubscribes.push(unsubPOs);

      const unsubMaintenance = subscribeToMaintenance((records) => {
        dispatch(setMaintenanceRecords(records));
        markReceived();
      });
      unsubscribes.push(unsubMaintenance);

      const unsubItems = subscribeItems((items) => {
        dispatch(setItems(items));
        markReceived();
      });
      unsubscribes.push(unsubItems);

      // Include sites for site names in requests
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
      // SiteManager: requests filtered by assignedSiteId, sites, inventory for assigned site
      const unsubRequests = requestService.subscribeToRequests(
        { siteId: assignedSiteId ?? undefined, userId },
        (requests) => {
          dispatch(setRequests(requests));
          dispatch(setMyRequests(requests));
          markReceived();
        }
      );
      unsubscribes.push(unsubRequests);

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

        runNonCriticalTask(
          'dashboard_site_inventory_prefetch',
          () => getInventoryByLocation(locationId),
          {
            feature: 'inventory',
            tags: {
              screen: 'dashboard',
              role: 'SiteManager',
            },
          }
        )
          .then((inventory) => {
            if (!inventory) return;
            dispatch(setInventoryForLocation({ locationId, inventory }));
            markReceived();
          })
          .catch(() => {
            // runNonCriticalTask handles capture internally; this guard prevents unhandled rejections.
          });
      }
    }

    return () => {
      clearTimeout(timeout);
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [dispatch, userId, role, assignedSiteId, isVisible, refreshTrigger]);

  return { isInitialLoad, isRefreshing, triggerRefresh };
}
