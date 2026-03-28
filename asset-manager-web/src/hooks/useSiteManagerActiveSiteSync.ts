import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUserId, selectIsSiteManager } from '../store/selectors/authSelectors';
import { selectAllSites, selectActiveManagedSiteId } from '../store/selectors/sitesSelectors';
import { setActiveManagedSiteId } from '../store/slices/sitesSlice';
import {
  loadActiveManagedSiteId,
  saveActiveManagedSiteId,
} from '../utils/activeManagedSiteStorage';

/**
 * Keeps Redux `activeManagedSiteId` valid for Site Managers and syncs with localStorage.
 */
export function useSiteManagerActiveSiteSync(): void {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const isSiteManager = useAppSelector(selectIsSiteManager);
  const sites = useAppSelector(selectAllSites);
  const activeManagedSiteId = useAppSelector(selectActiveManagedSiteId);

  const managedSites = useMemo(() => {
    if (!userId) return [];
    return sites
      .filter((s) => s.managerId === userId && s.status === 'active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [sites, userId]);

  useEffect(() => {
    if (!isSiteManager || !userId) {
      if (activeManagedSiteId !== null) {
        dispatch(setActiveManagedSiteId(null));
      }
      return;
    }

    const idSet = new Set(managedSites.map((s) => s.id));
    if (managedSites.length === 0) {
      if (activeManagedSiteId !== null) {
        dispatch(setActiveManagedSiteId(null));
      }
      return;
    }

    if (activeManagedSiteId && idSet.has(activeManagedSiteId)) {
      return;
    }

    const stored = loadActiveManagedSiteId(userId);
    if (stored && idSet.has(stored)) {
      dispatch(setActiveManagedSiteId(stored));
      return;
    }
    const first = managedSites[0].id;
    dispatch(setActiveManagedSiteId(first));
    saveActiveManagedSiteId(userId, first);
  }, [isSiteManager, userId, managedSites, activeManagedSiteId, dispatch]);
}
