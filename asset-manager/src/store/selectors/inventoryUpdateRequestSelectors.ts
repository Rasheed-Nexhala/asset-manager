import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

const selectInventoryUpdateRequestState = (state: RootState) =>
  state.inventoryUpdateRequest;

export const selectMyAccessGrantedUntil = createSelector(
  [selectInventoryUpdateRequestState],
  (s) => s.myAccessGrantedUntil
);

export const selectMyWriteOffAccessGrantedUntil = createSelector(
  [selectInventoryUpdateRequestState],
  (s) => s.myWriteOffAccessGrantedUntil
);

export const selectPendingRequests = createSelector(
  [selectInventoryUpdateRequestState],
  (s) => s.pendingRequests
);

export const selectActiveApprovedRequests = createSelector(
  [selectInventoryUpdateRequestState],
  (s) => s.activeApprovedRequests
);

export const selectInventoryUpdateRequestLoading = createSelector(
  [selectInventoryUpdateRequestState],
  (s) => s.loading
);

export const selectInventoryUpdateRequestError = createSelector(
  [selectInventoryUpdateRequestState],
  (s) => s.error
);

/**
 * Store Incharge can adjust central store inventory when myAccessGrantedUntil exists and > now.
 * Admin always has access (handled in adjustQuantity thunk).
 */
export const selectCanStoreInchargeAdjustInventory = createSelector(
  [selectMyAccessGrantedUntil],
  (myAccessGrantedUntil) => {
    if (!myAccessGrantedUntil) return false;
    return new Date(myAccessGrantedUntil) > new Date();
  }
);

/**
 * Store Incharge can write off maintenance items when myWriteOffAccessGrantedUntil exists and > now.
 * Admin always allowed (handled in writeOffItemThunk).
 */
export const selectCanStoreInchargeMaintenanceWriteOff = createSelector(
  [selectMyWriteOffAccessGrantedUntil],
  (until) => {
    if (!until) return false;
    return new Date(until) > new Date();
  }
);
