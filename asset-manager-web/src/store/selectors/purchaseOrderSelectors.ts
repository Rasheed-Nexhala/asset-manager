import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { selectUserId } from './authSelectors';

export const selectPurchaseOrderState = (state: RootState) =>
  state.purchaseOrders;

export const selectPurchaseOrders = (state: RootState) =>
  state.purchaseOrders.purchaseOrders;

export const selectSelectedPO = (state: RootState) =>
  state.purchaseOrders.selectedPO;

export const selectVendors = (state: RootState) =>
  state.purchaseOrders.vendors;

export const selectVendorsLoading = (state: RootState) =>
  state.purchaseOrders.vendorsLoading;

export const selectPurchaseOrderLoading = (state: RootState) =>
  state.purchaseOrders.loading;

export const selectPurchaseOrderLoadingMore = (state: RootState) =>
  state.purchaseOrders.loadingMore;

export const selectPurchaseOrderTotalCount = (state: RootState) =>
  state.purchaseOrders.totalCount;

export const selectPurchaseOrderHasMore = (state: RootState) =>
  state.purchaseOrders.hasMore;

export const selectPurchaseOrderError = (state: RootState) =>
  state.purchaseOrders.error;

export const selectPurchaseOrderFilters = (state: RootState) =>
  state.purchaseOrders.filters;

/**
 * Get filtered purchase orders
 */
export const selectFilteredPurchaseOrders = createSelector(
  [selectPurchaseOrders, selectPurchaseOrderFilters],
  (orders, filters) => {
    let filtered = orders;
    if (filters.status !== 'all') {
      filtered = filtered.filter((o) => o.status === filters.status);
    }
    return filtered;
  }
);

/** Pass-through for search query (used as second arg to selectors) */
const selectSearchQueryArg = (_state: RootState, searchQuery: string) => searchQuery;

/**
 * Filter purchase orders by search query (poNumber, vendorName, vendorContact, justification, item names/SKUs).
 * Use: useAppSelector((state) => selectFilteredPurchaseOrdersBySearchQuery(state, searchQuery))
 */
export const selectFilteredPurchaseOrdersBySearchQuery = createSelector(
  [selectFilteredPurchaseOrders, selectSearchQueryArg],
  (filteredOrders, searchQuery) => {
    const trimmedQuery = searchQuery?.trim() || '';
    if (!trimmedQuery) return filteredOrders;

    const lowerQuery = trimmedQuery.toLowerCase();
    return filteredOrders.filter((o) => {
      const matchesPoNumber = (o.poNumber ?? '').toLowerCase().includes(lowerQuery);
      const matchesVendorName = (o.vendorName ?? '').toLowerCase().includes(lowerQuery);
      const matchesVendorContact = (o.vendorContact ?? '').toLowerCase().includes(lowerQuery);
      const matchesJustification = (o.justification ?? '').toLowerCase().includes(lowerQuery);
      const matchesItem = Array.isArray(o.items)
        ? o.items.some(
            (item) =>
              (item.itemName ?? '').toLowerCase().includes(lowerQuery) ||
              (item.itemSku ?? '').toLowerCase().includes(lowerQuery)
          )
        : false;
      return (
        matchesPoNumber ||
        matchesVendorName ||
        matchesVendorContact ||
        matchesJustification ||
        matchesItem
      );
    });
  }
);

/**
 * Filter drafts by creator: each user sees only their own drafts (createdBy === userId).
 * Non-draft POs are visible to all. Admin drafts hidden from store incharge and vice versa.
 * Use: useAppSelector((state) => selectFilteredPurchaseOrdersForViewer(state, searchQuery))
 */
export const selectFilteredPurchaseOrdersForViewer = createSelector(
  [selectFilteredPurchaseOrdersBySearchQuery, selectUserId],
  (filteredOrders, userId) => {
    if (!userId) return filteredOrders;
    return filteredOrders.filter(
      (o) => o.status !== 'draft' || o.createdBy === userId
    );
  }
);

/**
 * Total count of POs visible to the current user (after status + viewer filters, before search).
 * Use for "Showing X of Y" so the total reflects what the user can actually see
 * (e.g. excludes other users' drafts when filtering by draft).
 */
export const selectVisiblePurchaseOrderCount = createSelector(
  [(state: RootState) => selectFilteredPurchaseOrdersForViewer(state, '')],
  (orders) => orders.length
);

/**
 * Get count of POs pending approval (Admin badge)
 */
export const selectPendingApprovalCount = createSelector(
  [selectPurchaseOrders],
  (orders) =>
    orders.filter((o) => o.status === 'pending_approval').length
);

/**
 * Get PO by ID
 */
export const selectPOById = (poId: string) =>
  createSelector([selectPurchaseOrders, selectSelectedPO], (orders, selected) => {
    if (selected?.id === poId) return selected;
    return orders.find((o) => o.id === poId) ?? null;
  });
