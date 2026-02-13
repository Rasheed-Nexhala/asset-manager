import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Request } from '../../types/request';

interface RequestsState {
  requests: Request[];
  myRequests: Request[];
  selectedRequest: Request | null;
  loading: boolean;
  error: string | null;
  errorTimestamp: number | null;
  filters: {
    status: string;
    priority: string;
    siteId: string;
  };
}

const initialState: RequestsState = {
  requests: [],
  myRequests: [],
  selectedRequest: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: {
    status: 'all',
    priority: 'all',
    siteId: 'all',
  },
};

const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    // Request data
    setRequests: (state, action: PayloadAction<Request[]>) => {
      // Deduplicate by ID; exclude drafts (Store Incharge/Admin view only gets non-drafts)
      const byId = new Map<string, Request>();
      action.payload.forEach((r) => {
        if (r.status !== 'draft' && !byId.has(r.id)) byId.set(r.id, r);
      });
      state.requests = Array.from(byId.values());
      state.loading = false;
    },

    setMyRequests: (state, action: PayloadAction<Request[]>) => {
      // Deduplicate by ID before setting
      const byId = new Map<string, Request>();
      action.payload.forEach((r) => {
        if (!byId.has(r.id)) byId.set(r.id, r);
      });
      state.myRequests = Array.from(byId.values());
      state.loading = false;
    },

    setSelectedRequest: (state, action: PayloadAction<Request | null>) => {
      state.selectedRequest = action.payload;
    },

    addRequest: (state, action: PayloadAction<Request>) => {
      // Drafts: only in myRequests (site manager). Store Incharge/Admin never see drafts.
      // Non-drafts: add to both requests (queue) and myRequests.
      const isDraft = action.payload.status === 'draft';
      const existsInMyRequests = state.myRequests.some((r) => r.id === action.payload.id);
      
      if (!existsInMyRequests) {
        state.myRequests.unshift(action.payload);
      }
      if (!isDraft) {
        const existsInRequests = state.requests.some((r) => r.id === action.payload.id);
        if (!existsInRequests) {
          state.requests.unshift(action.payload);
        }
      }
    },

    updateRequestInState: (state, action: PayloadAction<Request>) => {
      const updatedRequest = action.payload;
      
      // Update in requests array (for Store Incharge/Admin view)
      const requestIndex = state.requests.findIndex((r) => r.id === updatedRequest.id);
      if (requestIndex !== -1) {
        state.requests[requestIndex] = updatedRequest;
      } else if (updatedRequest.status !== 'draft') {
        // If not found and not a draft, add it (e.g., draft was submitted)
        state.requests.unshift(updatedRequest);
      }

      // Update in myRequests array (for Site Manager's own requests)
      const myRequestIndex = state.myRequests.findIndex((r) => r.id === updatedRequest.id);
      if (myRequestIndex !== -1) {
        state.myRequests[myRequestIndex] = updatedRequest;
      } else {
        // If not found in myRequests, add it if it belongs to this user
        // Note: We can't check ownership here since we don't have user context,
        // but the subscription will handle adding user-owned requests properly
      }

      // Update selectedRequest if it matches
      if (state.selectedRequest?.id === updatedRequest.id) {
        state.selectedRequest = updatedRequest;
      }
    },

    // Filters
    setFilters: (state, action: PayloadAction<Partial<RequestsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters: (state) => {
      state.filters = initialState.filters;
    },

    // Loading & Error
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.errorTimestamp = Date.now();
      state.loading = false;
    },

    clearError: (state) => {
      state.error = null;
      state.errorTimestamp = null;
    },

    // Clear all
    clearRequests: (state) => {
      state.requests = [];
      state.myRequests = [];
      state.selectedRequest = null;
      state.loading = false;
      state.error = null;
      state.errorTimestamp = null;
    },
  },
});

export const {
  setRequests,
  setMyRequests,
  setSelectedRequest,
  addRequest,
  updateRequestInState,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
  clearRequests,
} = requestsSlice.actions;

export default requestsSlice.reducer;
