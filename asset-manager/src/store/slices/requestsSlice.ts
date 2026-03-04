import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Request } from '../../types/request';
import { REQUESTS_PAGE_SIZE } from '../../services/firebase/requestService';

/** Action type strings for pagination thunks (avoids circular deps and works when tests mock requestThunks) */
const FETCH_REQUESTS_PAGINATED = 'requests/fetchRequestsPaginated';
const LOAD_MORE_REQUESTS = 'requests/loadMoreRequests';
const FETCH_MY_REQUESTS_PAGINATED = 'requests/fetchMyRequestsPaginated';
const LOAD_MORE_MY_REQUESTS = 'requests/loadMoreMyRequests';

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
  /** Pagination for queue (requests) */
  requestsTotalCount: number | null;
  requestsLastDoc: unknown;
  requestsHasMore: boolean;
  requestsLoadingMore: boolean;
  /** Pagination for my requests */
  myRequestsTotalCount: number | null;
  myRequestsLastDoc: unknown;
  myRequestsHasMore: boolean;
  myRequestsLoadingMore: boolean;
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
  requestsTotalCount: null,
  requestsLastDoc: null,
  requestsHasMore: false,
  requestsLoadingMore: false,
  myRequestsTotalCount: null,
  myRequestsLastDoc: null,
  myRequestsHasMore: false,
  myRequestsLoadingMore: false,
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
      // Clear queue pagination (subscription replaces paginated data)
      state.requestsTotalCount = null;
      state.requestsLastDoc = null;
      state.requestsHasMore = false;
    },

    setMyRequests: (state, action: PayloadAction<Request[]>) => {
      // Deduplicate by ID before setting
      const byId = new Map<string, Request>();
      action.payload.forEach((r) => {
        if (!byId.has(r.id)) byId.set(r.id, r);
      });
      state.myRequests = Array.from(byId.values());
      state.loading = false;
      // Clear my-requests pagination (subscription replaces paginated data)
      state.myRequestsTotalCount = null;
      state.myRequestsLastDoc = null;
      state.myRequestsHasMore = false;
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
      if (!updatedRequest?.id) return;

      // Update in requests array (for Store Incharge/Admin view)
      const requestIndex = state.requests.findIndex((r) => r.id === updatedRequest.id);
      if (requestIndex !== -1) {
        state.requests[requestIndex] = updatedRequest;
      } else if (updatedRequest.status !== 'draft') {
        // Only add if not already present (prevents duplicates from race conditions)
        const existsInRequests = state.requests.some((r) => r.id === updatedRequest.id);
        if (!existsInRequests) {
          state.requests.unshift(updatedRequest);
        }
      }

      // Update in myRequests array (for Site Manager's own requests)
      const myRequestIndex = state.myRequests.findIndex((r) => r.id === updatedRequest.id);
      if (myRequestIndex !== -1) {
        state.myRequests[myRequestIndex] = updatedRequest;
      } else {
        // If not found in myRequests, subscription will handle adding user-owned requests
      }

      // Update selectedRequest if it matches
      if (state.selectedRequest?.id === updatedRequest.id) {
        state.selectedRequest = updatedRequest;
      }
    },

    // Filters (resets queue pagination when Firestore filters change: status, siteId)
    setFilters: (state, action: PayloadAction<Partial<RequestsState['filters']>>) => {
      const prev = state.filters;
      state.filters = { ...state.filters, ...action.payload };
      const firestoreFilterChanged =
        ('status' in action.payload && action.payload.status !== prev.status) ||
        ('siteId' in action.payload && action.payload.siteId !== prev.siteId);
      if (firestoreFilterChanged) {
        state.requests = [];
        state.requestsTotalCount = null;
        state.requestsLastDoc = null;
        state.requestsHasMore = false;
      }
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
      state.requestsTotalCount = null;
      state.requestsLastDoc = null;
      state.requestsHasMore = false;
      state.myRequestsTotalCount = null;
      state.myRequestsLastDoc = null;
      state.myRequestsHasMore = false;
    },
  },
  extraReducers: (builder) => {
    // Queue pagination (use action type strings so slice works when tests mock requestThunks)
    builder
      .addCase(`${FETCH_REQUESTS_PAGINATED}/pending`, (state) => {
        state.loading = true;
      })
      .addCase(`${FETCH_REQUESTS_PAGINATED}/fulfilled`, (state, action) => {
        state.requests = action.payload.requests;
        state.requestsTotalCount = action.payload.totalCount;
        state.requestsLastDoc = action.payload.lastDoc;
        state.requestsHasMore = action.payload.requests.length >= REQUESTS_PAGE_SIZE;
        state.requestsLoadingMore = false;
        state.loading = false;
      })
      .addCase(`${FETCH_REQUESTS_PAGINATED}/rejected`, (state) => {
        state.loading = false;
      })
      .addCase(`${LOAD_MORE_REQUESTS}/pending`, (state) => {
        state.requestsLoadingMore = true;
      })
      .addCase(`${LOAD_MORE_REQUESTS}/fulfilled`, (state, action) => {
        state.requests = [...state.requests, ...action.payload.requests];
        state.requestsLastDoc = action.payload.lastDoc;
        state.requestsHasMore = action.payload.requests.length >= REQUESTS_PAGE_SIZE;
        state.requestsLoadingMore = false;
      })
      .addCase(`${LOAD_MORE_REQUESTS}/rejected`, (state) => {
        state.requestsLoadingMore = false;
      });

    // My requests pagination
    builder
      .addCase(`${FETCH_MY_REQUESTS_PAGINATED}/pending`, (state) => {
        state.loading = true;
      })
      .addCase(`${FETCH_MY_REQUESTS_PAGINATED}/fulfilled`, (state, action) => {
        state.myRequests = action.payload.requests;
        state.myRequestsTotalCount = action.payload.totalCount;
        state.myRequestsLastDoc = action.payload.lastDoc;
        state.myRequestsHasMore = action.payload.requests.length >= REQUESTS_PAGE_SIZE;
        state.myRequestsLoadingMore = false;
        state.loading = false;
      })
      .addCase(`${FETCH_MY_REQUESTS_PAGINATED}/rejected`, (state) => {
        state.loading = false;
      })
      .addCase(`${LOAD_MORE_MY_REQUESTS}/pending`, (state) => {
        state.myRequestsLoadingMore = true;
      })
      .addCase(`${LOAD_MORE_MY_REQUESTS}/fulfilled`, (state, action) => {
        state.myRequests = [...state.myRequests, ...action.payload.requests];
        state.myRequestsLastDoc = action.payload.lastDoc;
        state.myRequestsHasMore = action.payload.requests.length >= REQUESTS_PAGE_SIZE;
        state.myRequestsLoadingMore = false;
      })
      .addCase(`${LOAD_MORE_MY_REQUESTS}/rejected`, (state) => {
        state.myRequestsLoadingMore = false;
      });
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
