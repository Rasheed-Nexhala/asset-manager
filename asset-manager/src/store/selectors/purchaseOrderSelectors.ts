import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export const selectPurchaseOrderState = (state: RootState) =>
  state.purchaseOrders;

export const selectPurchaseOrders = (state: RootState) =>
  state.purchaseOrders.purchaseOrders;

export const selectSelectedPO = (state: RootState) =>
  state.purchaseOrders.selectedPO;

export const selectVendors = (state: RootState) =>
  state.purchaseOrders.vendors;

export const selectPurchaseOrderLoading = (state: RootState) =>
  state.purchaseOrders.loading;

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
