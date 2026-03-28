import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Site } from '../../types/sites';

const selectSitesState = (state: RootState) => state.sites;

export const selectActiveManagedSiteId = (state: RootState) =>
  state.sites.activeManagedSiteId;

export const selectAllSites = createSelector(
  [selectSitesState],
  (sitesState) => sitesState.sites
);

export const selectSitesLoading = createSelector(
  [selectSitesState],
  (sitesState) => sitesState.isLoading
);

export const selectSitesError = createSelector(
  [selectSitesState],
  (sitesState) => sitesState.error
);

export const selectSearchQuery = createSelector(
  [selectSitesState],
  (sitesState) => sitesState.searchQuery
);

export const selectActiveSites = createSelector(
  [selectAllSites],
  (sites) => sites.filter((site) => site.status === 'active')
);

export const selectInactiveSites = createSelector(
  [selectAllSites],
  (sites) => sites.filter((site) => site.status === 'inactive')
);

export const selectSiteById = (siteId: string) =>
  createSelector(
    [selectAllSites],
    (sites) => sites.find((site) => site.id === siteId) || null
  );

export const selectFilteredSites = createSelector(
  [selectAllSites, selectSearchQuery],
  (sites, searchQuery) => {
    if (!searchQuery.trim()) {
      return sites;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return sites.filter(
      (site) =>
        (site.name ?? '').toLowerCase().includes(query) ||
        (site.address ?? '').toLowerCase().includes(query) ||
        (site.managerName && site.managerName.toLowerCase().includes(query)) ||
        (site.description && site.description.toLowerCase().includes(query))
    );
  }
);

export const selectFilteredActiveSites = createSelector(
  [selectFilteredSites],
  (sites) => sites.filter((site) => site.status === 'active')
);

export const selectFilteredInactiveSites = createSelector(
  [selectFilteredSites],
  (sites) => sites.filter((site) => site.status === 'inactive')
);

/**
 * Active sites managed by the user (Site Manager), sorted by name.
 */
export const selectManagedSitesForUser = (userId: string | null) =>
  createSelector([selectAllSites], (sites) => {
    if (!userId) return [];
    return sites
      .filter((s) => s.managerId === userId && s.status === 'active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });

/**
 * Effective working site for Site Manager UI: persisted active id if still managed, else first managed site.
 */
export const selectEffectiveManagedSiteIdForUser = (userId: string | null) =>
  createSelector(
    [selectManagedSitesForUser(userId), selectActiveManagedSiteId],
    (managed, activeId) => {
      const ids = new Set(managed.map((s) => s.id));
      if (activeId && ids.has(activeId)) return activeId;
      return managed[0]?.id ?? null;
    }
  );

/**
 * @deprecated Prefer selectEffectiveManagedSiteIdForUser — kept for existing call sites.
 * Returns the active managed site when set, otherwise the first managed site (name order).
 */
export const selectAssignedSiteIdForUser = (userId: string | null) =>
  selectEffectiveManagedSiteIdForUser(userId);
