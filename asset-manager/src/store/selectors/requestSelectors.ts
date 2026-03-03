import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectRequestsState = (state: RootState) => state.requests;

export const selectAllRequests = (state: RootState) => state.requests.requests;

export const selectMyRequests = (state: RootState) => state.requests.myRequests;

export const selectSelectedRequest = (state: RootState) =>
  state.requests.selectedRequest;

export const selectRequestsLoading = (state: RootState) => state.requests.loading;

export const selectRequestsError = (state: RootState) => state.requests.error;

export const selectRequestsFilters = (state: RootState) => state.requests.filters;

// Helper to get timestamp in milliseconds for comparison
const getUpdatedAtMs = (request: { updatedAt?: { toMillis?: () => number } | null }): number => {
  const t = request.updatedAt;
  if (!t || typeof t.toMillis !== 'function') return 0;
  return t.toMillis();
};

// Memoized selectors
export const selectRequestById = (requestId: string) =>
  createSelector(
    [selectAllRequests, selectMyRequests],
    (requests, myRequests) => {
      const requestFromRequests = requests.find((r) => r.id === requestId);
      const requestFromMyRequests = myRequests.find((r) => r.id === requestId);
      
      // If both exist, return the one with more recent updatedAt timestamp
      if (requestFromRequests && requestFromMyRequests) {
        const requestsTimestamp = getUpdatedAtMs(requestFromRequests);
        const myRequestsTimestamp = getUpdatedAtMs(requestFromMyRequests);
        
        return myRequestsTimestamp >= requestsTimestamp 
          ? requestFromMyRequests 
          : requestFromRequests;
      }
      
      // Return whichever one exists
      return requestFromRequests ?? requestFromMyRequests ?? null;
    }
  );

/**
 * Group requests by priority for queue display
 */
export const selectRequestsByPriority = createSelector(
  [selectAllRequests, selectRequestsFilters],
  (requests, filters) => {
    // Apply filters
    let filtered = requests;

    if (filters.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    if (filters.siteId !== 'all') {
      filtered = filtered.filter((r) => r.siteId === filters.siteId);
    }

    // Deduplicate by id (prevents duplicate key errors in SectionList)
    const seen = new Set<string>();
    const deduped = filtered.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // Group by priority
    const grouped = {
      high: deduped.filter((r) => r.priority === 'high'),
      medium: deduped.filter((r) => r.priority === 'medium'),
      low: deduped.filter((r) => r.priority === 'low'),
    };

    return grouped;
  }
);

/**
 * Get filtered requests
 */
export const selectFilteredRequests = createSelector(
  [selectAllRequests, selectRequestsFilters],
  (requests, filters) => {
    let filtered = requests;

    if (filters.status !== 'all') {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter((r) => r.priority === filters.priority);
    }

    if (filters.siteId !== 'all') {
      filtered = filtered.filter((r) => r.siteId === filters.siteId);
    }

    return filtered;
  }
);

/** Pass-through for search query (used as second arg to selectors) */
const selectSearchQueryArg = (_state: RootState, searchQuery: string) => searchQuery;

/**
 * Filter requests by search query (request number, site, requester, purpose, item names/SKUs)
 * Use: useAppSelector((state) => selectFilteredRequestsBySearchQuery(state, searchQuery))
 */
export const selectFilteredRequestsBySearchQuery = createSelector(
  [selectFilteredRequests, selectSearchQueryArg],
  (filteredRequests, searchQuery) => {
    const trimmedQuery = searchQuery?.trim() || '';
    if (!trimmedQuery) return filteredRequests;

    const lowerQuery = trimmedQuery.toLowerCase();
    return filteredRequests.filter((r) => {
      const matchesRequestNumber = (r.requestNumber ?? '').toLowerCase().includes(lowerQuery);
      const matchesSiteName = (r.siteName ?? '').toLowerCase().includes(lowerQuery);
      const matchesRequestedBy = (r.requestedByName ?? '').toLowerCase().includes(lowerQuery);
      const matchesPurpose = (r.purpose ?? '').toLowerCase().includes(lowerQuery);
      const matchesItem = Array.isArray(r.items)
        ? r.items.some(
            (item) =>
              (item.itemName ?? '').toLowerCase().includes(lowerQuery) ||
              (item.itemSku ?? '').toLowerCase().includes(lowerQuery) ||
              (item.categoryName ?? '').toLowerCase().includes(lowerQuery)
          )
        : false;
      return matchesRequestNumber || matchesSiteName || matchesRequestedBy || matchesPurpose || matchesItem;
    });
  }
);

/**
 * Get comparable timestamp in ms for sorting (createdAt or updatedAt)
 */
const getRequestSortTimestamp = (
  r: { createdAt?: { toMillis?: () => number } | null; updatedAt?: { toMillis?: () => number } | null }
): number => {
  const t = r.updatedAt ?? r.createdAt;
  if (!t || typeof (t as { toMillis?: () => number }).toMillis !== 'function') return 0;
  return (t as { toMillis: () => number }).toMillis();
};

/**
 * Get filtered requests sorted by date (latest first) for Request Queue
 */
export const selectFilteredRequestsSortedByDate = createSelector(
  [selectFilteredRequests],
  (requests) => {
    const seen = new Set<string>();
    const deduped = requests.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    return [...deduped].sort(
      (a, b) => getRequestSortTimestamp(b) - getRequestSortTimestamp(a)
    );
  }
);

/**
 * Get filtered + searched requests sorted by date (latest first).
 * Use: useAppSelector((state) => selectFilteredAndSearchedRequestsSortedByDate(state, searchQuery))
 */
export const selectFilteredAndSearchedRequestsSortedByDate = createSelector(
  [selectFilteredRequestsBySearchQuery],
  (requests) => {
    const seen = new Set<string>();
    const deduped = requests.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    return [...deduped].sort(
      (a, b) => getRequestSortTimestamp(b) - getRequestSortTimestamp(a)
    );
  }
);

/**
 * Get pending requests count
 */
export const selectPendingRequestsCount = createSelector(
  [selectAllRequests],
  (requests) => requests.filter((r) => r.status === 'pending').length
);

/**
 * Get high priority pending requests count
 */
export const selectHighPriorityPendingCount = createSelector(
  [selectAllRequests],
  (requests) =>
    requests.filter(
      (r) => r.status === 'pending' && r.priority === 'high'
    ).length
);

/**
 * Get comparable timestamp in ms for sorting (Firestore Timestamp or fallback)
 */
const getCreatedAtMs = (r: { createdAt?: { toMillis?: () => number } | null }): number => {
  const t = r.createdAt;
  if (!t) return 0;
  return typeof (t as { toMillis?: () => number }).toMillis === 'function'
    ? (t as { toMillis: () => number }).toMillis()
    : 0;
};

/**
 * Filter my requests by status, sorted by createdAt descending (latest first)
 */
export const selectMyRequestsByStatus = (status: string) =>
  createSelector([selectMyRequests], (requests) => {
    const filtered = requests.filter((r) => status === 'all' || r.status === status);
    return [...filtered].sort(
      (a, b) => getCreatedAtMs(b) - getCreatedAtMs(a)
    );
  });

/** Pass-through for search in my requests selector */
const selectMySearchQueryArg = (_state: RootState, searchQuery: string) => searchQuery;

/**
 * Filter my requests by status and search query, sorted by createdAt descending.
 * Use: useAppSelector((state) => selectMyRequestsByStatusAndSearch(activeTab)(state, searchQuery))
 */
export const selectMyRequestsByStatusAndSearch = (status: string) =>
  createSelector(
    [selectMyRequests, selectMySearchQueryArg],
    (requests, searchQuery) => {
      let filtered = requests.filter((r) => status === 'all' || r.status === status);
      const trimmedQuery = searchQuery?.trim() || '';
      if (trimmedQuery) {
        const lowerQuery = trimmedQuery.toLowerCase();
        filtered = filtered.filter((r) => {
          const matchesRequestNumber = (r.requestNumber ?? '').toLowerCase().includes(lowerQuery);
          const matchesSiteName = (r.siteName ?? '').toLowerCase().includes(lowerQuery);
          const matchesPurpose = (r.purpose ?? '').toLowerCase().includes(lowerQuery);
          const matchesItem = Array.isArray(r.items)
            ? r.items.some(
                (item) =>
                  (item.itemName ?? '').toLowerCase().includes(lowerQuery) ||
                  (item.itemSku ?? '').toLowerCase().includes(lowerQuery) ||
                  (item.categoryName ?? '').toLowerCase().includes(lowerQuery)
              )
            : false;
          return matchesRequestNumber || matchesSiteName || matchesPurpose || matchesItem;
        });
      }
      return [...filtered].sort(
        (a, b) => getCreatedAtMs(b) - getCreatedAtMs(a)
      );
    }
  );
