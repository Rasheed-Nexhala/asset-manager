import type { DocumentSnapshot } from 'firebase/firestore';
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  requestService,
  listRequestsPaginated,
  getRequestsCount,
  REQUESTS_PAGE_SIZE,
} from '../../services/firebase/requestService';
import type { RequestListFilters } from '../../services/firebase/requestService';
import type { RootState } from '../index';
import type {
  CreateRequestData,
  EditRequestData,
  RejectRequestData,
  TransferRequestData,
  ReturnItemsData,
} from '../../types/request';
import {
  setLoading,
  setError,
  clearError,
  addRequest,
  updateRequestInState,
  removeRequest,
} from '../slices/requestsSlice';

/**
 * Create a new request
 */
export const createRequest = createAsyncThunk(
  'requests/createRequest',
  async (
    {
      requestData,
      userId,
      userName,
      isDraft,
    }: {
      requestData: CreateRequestData;
      userId: string;
      userName: string;
      isDraft?: boolean;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const requestId = await requestService.createRequest(
        requestData,
        userId,
        userName,
        isDraft
      );

      // Fetch the created request
      const createdRequest = await requestService.getRequestById(requestId);
      if (createdRequest) {
        dispatch(addRequest(createdRequest));
      }

      dispatch(setLoading(false));
      return requestId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Edit an existing request
 */
export const editRequest = createAsyncThunk(
  'requests/editRequest',
  async (
    {
      requestId,
      updates,
      editedBy,
      editedByName,
    }: {
      requestId: string;
      updates: EditRequestData;
      editedBy: string;
      editedByName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await requestService.editRequest(requestId, updates, editedBy, editedByName);

      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }

      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to edit request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Submit a draft request (convert to pending)
 */
export const submitDraftRequest = createAsyncThunk(
  'requests/submitDraftRequest',
  async (
    {
      requestId,
      userId,
    }: {
      requestId: string;
      userId: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await requestService.submitDraftRequest(requestId, userId);

      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }

      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to submit request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Approve a request
 */
export const approveRequest = createAsyncThunk(
  'requests/approveRequest',
  async (
    {
      requestId,
      processedBy,
      processedByName,
      storeNotes,
      updatedItems,
    }: {
      requestId: string;
      processedBy: string;
      processedByName: string;
      storeNotes?: string;
      updatedItems?: Array<{ itemId: string; quantityApproved: number }>;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await requestService.approveRequest(
        requestId,
        processedBy,
        processedByName,
        storeNotes,
        updatedItems
      );

      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }

      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to approve request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Reject a request
 */
export const rejectRequest = createAsyncThunk(
  'requests/rejectRequest',
  async (
    {
      requestId,
      rejectionData,
      processedBy,
      processedByName,
    }: {
      requestId: string;
      rejectionData: RejectRequestData;
      processedBy: string;
      processedByName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await requestService.rejectRequest(
        requestId,
        rejectionData,
        processedBy,
        processedByName
      );

      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }

      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reject request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Transfer request items
 */
export const transferRequest = createAsyncThunk(
  'requests/transferRequest',
  async (
    {
      requestId,
      transferData,
      transferredBy,
      transferredByName,
    }: {
      requestId: string;
      transferData: TransferRequestData;
      transferredBy: string;
      transferredByName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await requestService.transferRequest(
        requestId,
        transferData,
        transferredBy,
        transferredByName
      );

      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }

      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to transfer request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Return items
 */
export const returnItems = createAsyncThunk(
  'requests/returnItems',
  async (
    {
      requestId,
      returnData,
      userId,
      userName,
    }: {
      requestId: string;
      returnData: ReturnItemsData;
      userId: string;
      userName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await requestService.returnItems(requestId, returnData, userId, userName);

      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }

      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to return items';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Delete a draft request (permanently removes from Firestore)
 */
export const deleteRequest = createAsyncThunk(
  'requests/deleteRequest',
  async (
    { requestId, userId }: { requestId: string; userId: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await requestService.deleteRequest(requestId, userId);
      dispatch(removeRequest(requestId));

      dispatch(setLoading(false));
      return requestId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete draft';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Cancel a request
 */
export const cancelRequest = createAsyncThunk(
  'requests/cancelRequest',
  async (
    { requestId }: { requestId: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await requestService.cancelRequest(requestId);

      // Fetch updated request
      const updatedRequest = await requestService.getRequestById(requestId);
      if (updatedRequest) {
        dispatch(updateRequestInState(updatedRequest));
      }

      dispatch(setLoading(false));
      return updatedRequest;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to cancel request';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch requests with pagination (queue: first page + total count).
 * Runs getRequestsCount and listRequestsPaginated in parallel.
 */
export const fetchRequestsPaginated = createAsyncThunk(
  'requests/fetchRequestsPaginated',
  async (_arg, { getState }) => {
    const { filters } = (getState() as RootState).requests;
    const listFilters: RequestListFilters = {
      status: filters.status,
      siteId: filters.siteId,
    };
    const [totalCount, listResult] = await Promise.all([
      getRequestsCount(listFilters),
      listRequestsPaginated(listFilters, REQUESTS_PAGE_SIZE),
    ]);
    return {
      requests: listResult.requests,
      totalCount,
      lastDoc: listResult.lastDoc,
    };
  }
);

/**
 * Load more requests (queue: next page).
 */
export const loadMoreRequests = createAsyncThunk(
  'requests/loadMoreRequests',
  async (_arg, { getState }) => {
    const { filters, requestsLastDoc } = (getState() as RootState).requests;
    const lastDoc = requestsLastDoc as DocumentSnapshot | null | undefined;
    if (!lastDoc) return { requests: [], lastDoc: null };
    const listFilters: RequestListFilters = {
      status: filters.status,
      siteId: filters.siteId,
    };
    const { requests, lastDoc: newLastDoc } = await listRequestsPaginated(
      listFilters,
      REQUESTS_PAGE_SIZE,
      lastDoc
    );
    return { requests, lastDoc: newLastDoc };
  }
);

/**
 * Fetch my requests with pagination (first page + total count).
 *
 * Optimization: For new users with 0 requests, we fetch the list first. If it
 * returns fewer than PAGE_SIZE results, we know the total count without running
 * the expensive getRequestsCount query. This avoids slow loading for empty lists.
 */
export const fetchMyRequestsPaginated = createAsyncThunk(
  'requests/fetchMyRequestsPaginated',
  async (userId: string) => {
    const listFilters: RequestListFilters = { userId };
    // Fetch list first - for 0 requests this returns quickly
    const listResult = await listRequestsPaginated(
      listFilters,
      REQUESTS_PAGE_SIZE
    );
    // If we got fewer than a full page, total = list length (skip count query)
    const needsCount =
      listResult.requests.length >= REQUESTS_PAGE_SIZE;
    const totalCount = needsCount
      ? await getRequestsCount(listFilters)
      : listResult.requests.length;
    return {
      requests: listResult.requests,
      totalCount,
      lastDoc: listResult.lastDoc,
    };
  }
);

/**
 * Load more my requests (next page).
 */
export const loadMoreMyRequests = createAsyncThunk(
  'requests/loadMoreMyRequests',
  async (userId: string, { getState }) => {
    const state = (getState() as RootState).requests;
    const lastDoc = state.myRequestsLastDoc as DocumentSnapshot | null | undefined;
    if (!lastDoc) return { requests: [], lastDoc: null };
    const listFilters: RequestListFilters = { userId };
    const { requests, lastDoc: newLastDoc } = await listRequestsPaginated(
      listFilters,
      REQUESTS_PAGE_SIZE,
      lastDoc
    );
    return { requests, lastDoc: newLastDoc };
  }
);
