import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Site } from '../../types/sites';

const selectSitesState = (state: RootState) => state.sites;

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
 * Get the assigned site ID for a Site Manager (site where managerId matches userId).
 */
export const selectAssignedSiteIdForUser = (userId: string | null) =>
  createSelector(
    [selectAllSites],
    (sites) => {
      if (!userId) return null;
      const site = sites.find((s) => s.managerId === userId);
      return site?.id ?? null;
    }
  );
