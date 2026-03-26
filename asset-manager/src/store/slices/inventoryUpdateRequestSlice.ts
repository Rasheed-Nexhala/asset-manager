import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InventoryUpdateRequest } from '../../types/inventoryUpdateRequest';

export interface InventoryUpdateRequestState {
  /** ISO date string - when Store Incharge's temporary access to update central store expires */
  myAccessGrantedUntil: string | null;
  /** ISO date string - when Store Incharge's temporary access to perform maintenance write-offs expires */
  myWriteOffAccessGrantedUntil: string | null;
  /** Pending requests (for Admin to approve/reject) */
  pendingRequests: InventoryUpdateRequest[];
  /** Active approved requests (accessExpiresAt > now) for Admin revoke toggle */
  activeApprovedRequests: InventoryUpdateRequest[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryUpdateRequestState = {
  myAccessGrantedUntil: null,
  myWriteOffAccessGrantedUntil: null,
  pendingRequests: [],
  activeApprovedRequests: [],
  loading: false,
  error: null,
};

const inventoryUpdateRequestSlice = createSlice({
  name: 'inventoryUpdateRequest',
  initialState,
  reducers: {
    setMyAccessGrantedUntil: (state, action: PayloadAction<string | null>) => {
      state.myAccessGrantedUntil = action.payload;
    },
    setMyWriteOffAccessGrantedUntil: (state, action: PayloadAction<string | null>) => {
      state.myWriteOffAccessGrantedUntil = action.payload;
    },
    setPendingRequests: (state, action: PayloadAction<InventoryUpdateRequest[]>) => {
      state.pendingRequests = action.payload;
    },
    setActiveApprovedRequests: (state, action: PayloadAction<InventoryUpdateRequest[]>) => {
      state.activeApprovedRequests = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    /** Clear access on logout */
    clearAccess: (state) => {
      state.myAccessGrantedUntil = null;
      state.myWriteOffAccessGrantedUntil = null;
      state.pendingRequests = [];
      state.activeApprovedRequests = [];
      state.error = null;
    },
  },
});

export const {
  setMyAccessGrantedUntil,
  setMyWriteOffAccessGrantedUntil,
  setPendingRequests,
  setActiveApprovedRequests,
  setLoading,
  setError,
  clearError,
  clearAccess,
} = inventoryUpdateRequestSlice.actions;

export default inventoryUpdateRequestSlice.reducer;
