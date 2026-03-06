import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createRequest,
  approveRequest,
  rejectRequest,
  revokeAccess as revokeAccessService,
  restoreAccess as restoreAccessService,
  getMyActiveAccess,
  getPendingRequests,
  getActiveApprovedRequests,
  subscribeToMyActiveAccess as subscribeToMyActiveAccessService,
} from '../../services/firebase/inventoryUpdateRequestService';
import { logInventoryUpdateRequestToCloud } from '../../services/firebase/activityLogService';
import type { RootState } from '../index';
import type { AppDispatch } from '../index';
import {
  setMyAccessGrantedUntil,
  setPendingRequests,
  setActiveApprovedRequests,
  setLoading,
  setError,
} from '../slices/inventoryUpdateRequestSlice';

/**
 * Subscription manager - stores unsubscribe function for my active access
 */
let myActiveAccessUnsubscribe: (() => void) | null = null;

/**
 * Create an inventory update request.
 * Store Incharge only. Call service, then refresh pending requests or my access.
 */
export const createInventoryUpdateRequest = createAsyncThunk(
  'inventoryUpdateRequest/createRequest',
  async (reason: string, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { user, userRole } = state.auth;
      const userId = user?.uid;
      const userName = user?.displayName ?? user?.email ?? 'Unknown';
      const userRoleType = userRole?.role ?? 'StoreIncharge';

      if (!userId) {
        return rejectWithValue('User must be authenticated to create request');
      }

      dispatch(setLoading(true));
      dispatch(setError(null));

      const requestId = await createRequest(userId, userName, userRoleType, reason);

      logInventoryUpdateRequestToCloud({
        actionType: 'inventory_update_request_created',
        requestId,
        targetDisplay: `Request ${requestId.slice(0, 8)}`,
        requestedBy: userId,
        requestedByName: userName,
        requestedByRole: userRoleType,
        reason,
      }).catch(() => {});

      // Store Incharge creates; Admin fetches pending when viewing screen.
      dispatch(setLoading(false));
      return requestId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create request';
      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Approve an inventory update request.
 * Admin only.
 */
export const approveInventoryUpdateRequest = createAsyncThunk(
  'inventoryUpdateRequest/approveRequest',
  async (
    { requestId, expiresInHours }: { requestId: string; expiresInHours: number },
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const { user } = state.auth;
      const adminId = user?.uid;
      const adminName = user?.displayName ?? user?.email ?? 'Unknown';

      if (!adminId) {
        return rejectWithValue('User must be authenticated to approve request');
      }

      dispatch(setLoading(true));
      dispatch(setError(null));

      await approveRequest(requestId, adminId, adminName, expiresInHours);

      logInventoryUpdateRequestToCloud({
        actionType: 'inventory_update_request_approved',
        requestId,
        targetDisplay: `Request ${requestId.slice(0, 8)}`,
        approvedBy: adminId,
        approvedByName: adminName,
        expiresInHours,
      }).catch(() => {});

      // Refresh pending and active approved
      const [pending, active] = await Promise.all([
        getPendingRequests(),
        getActiveApprovedRequests(),
      ]);
      dispatch(setPendingRequests(pending));
      dispatch(setActiveApprovedRequests(active));
      dispatch(setLoading(false));
      return requestId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to approve request';
      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Reject an inventory update request.
 * Admin only.
 */
export const rejectInventoryUpdateRequest = createAsyncThunk(
  'inventoryUpdateRequest/rejectRequest',
  async (
    { requestId, rejectionReason }: { requestId: string; rejectionReason: string },
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const { user } = state.auth;
      const adminId = user?.uid;
      const adminName = user?.displayName ?? user?.email ?? 'Unknown';

      if (!adminId) {
        return rejectWithValue('User must be authenticated to reject request');
      }

      dispatch(setLoading(true));
      dispatch(setError(null));

      await rejectRequest(requestId, adminId, adminName, rejectionReason);

      logInventoryUpdateRequestToCloud({
        actionType: 'inventory_update_request_rejected',
        requestId,
        targetDisplay: `Request ${requestId.slice(0, 8)}`,
        approvedBy: adminId,
        approvedByName: adminName,
        rejectionReason,
      }).catch(() => {});

      // Refresh pending and active approved
      const [pending, active] = await Promise.all([
        getPendingRequests(),
        getActiveApprovedRequests(),
      ]);
      dispatch(setPendingRequests(pending));
      dispatch(setActiveApprovedRequests(active));
      dispatch(setLoading(false));
      return requestId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reject request';
      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch Store Incharge's active access (approved request where accessExpiresAt > now).
 * Dispatches setMyAccessGrantedUntil with the expiry ISO string or null.
 */
export const fetchMyActiveAccess = createAsyncThunk(
  'inventoryUpdateRequest/fetchMyActiveAccess',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.uid ?? null;
      if (!userId) {
        dispatch(setMyAccessGrantedUntil(null));
        return null;
      }

      dispatch(setLoading(true));
      dispatch(setError(null));

      const request = await getMyActiveAccess(userId);
      const expiresAt = request?.accessExpiresAt ?? null;
      dispatch(setMyAccessGrantedUntil(expiresAt));
      dispatch(setLoading(false));
      return expiresAt;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch active access';
      dispatch(setError(errorMessage));
      dispatch(setMyAccessGrantedUntil(null));
      dispatch(setLoading(false));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch pending inventory update requests.
 * Admin only.
 */
export const fetchPendingRequests = createAsyncThunk(
  'inventoryUpdateRequest/fetchPendingRequests',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      const [pending, active] = await Promise.all([
        getPendingRequests(),
        getActiveApprovedRequests(),
      ]);
      dispatch(setPendingRequests(pending));
      dispatch(setActiveApprovedRequests(active));
      dispatch(setLoading(false));
      return pending;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch pending requests';
      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Revoke Store Incharge's access. Admin only.
 */
export const revokeInventoryUpdateAccess = createAsyncThunk(
  'inventoryUpdateRequest/revokeAccess',
  async (requestId: string, { dispatch, rejectWithValue }) => {
    try {
      await revokeAccessService(requestId);

      logInventoryUpdateRequestToCloud({
        actionType: 'inventory_update_request_revoked',
        requestId,
        targetDisplay: `Request ${requestId.slice(0, 8)}`,
      }).catch(() => {});

      const active = await getActiveApprovedRequests();
      dispatch(setActiveApprovedRequests(active));
      return requestId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to revoke access';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Restore Store Incharge's access. Admin only.
 */
export const restoreInventoryUpdateAccess = createAsyncThunk(
  'inventoryUpdateRequest/restoreAccess',
  async (requestId: string, { dispatch, rejectWithValue }) => {
    try {
      await restoreAccessService(requestId);

      logInventoryUpdateRequestToCloud({
        actionType: 'inventory_update_request_restored',
        requestId,
        targetDisplay: `Request ${requestId.slice(0, 8)}`,
      }).catch(() => {});

      const active = await getActiveApprovedRequests();
      dispatch(setActiveApprovedRequests(active));
      return requestId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to restore access';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Subscribe to real-time updates of Store Incharge's active access.
 * Dispatches setMyAccessGrantedUntil when access changes.
 */
export const subscribeToMyActiveAccess = (userId: string) => {
  return (dispatch: AppDispatch) => {
    if (myActiveAccessUnsubscribe) {
      myActiveAccessUnsubscribe();
      myActiveAccessUnsubscribe = null;
    }

    if (!userId) {
      dispatch(setMyAccessGrantedUntil(null));
      return;
    }

    myActiveAccessUnsubscribe = subscribeToMyActiveAccessService(userId, (request) => {
        const expiresAt = request?.accessExpiresAt ?? null;
        dispatch(setMyAccessGrantedUntil(expiresAt));
      }
    );
  };
};

/**
 * Unsubscribe from my active access listener.
 * Call on logout (along with clearAccess).
 */
export const unsubscribeFromMyActiveAccess = () => {
  return (dispatch: AppDispatch) => {
    if (myActiveAccessUnsubscribe) {
      myActiveAccessUnsubscribe();
      myActiveAccessUnsubscribe = null;
    }
  };
};
