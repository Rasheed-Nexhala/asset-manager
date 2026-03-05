import { createAsyncThunk } from '@reduxjs/toolkit';
import * as purchaseOrderService from '../../services/firebase/purchaseOrderService';
import { PURCHASE_ORDERS_PAGE_SIZE } from '../../services/firebase/purchaseOrderService';
import type {
  CreatePurchaseOrderData,
  ReceivePOData,
  ApprovePOData,
  RejectPOData,
} from '../../types/purchaseOrder';
import {
  setLoading,
  setError,
  clearError,
  addOrUpdatePO,
} from '../slices/purchaseOrderSlice';
import {
  selectUserRoleType,
  selectUserId,
  selectUserDisplayName,
} from '../selectors/authSelectors';
import type { RootState } from '../index';

/**
 * Create a new purchase order
 */
export const createPO = createAsyncThunk(
  'purchaseOrders/createPO',
  async (
    {
      data,
      userId,
      userName,
      isDraft,
    }: {
      data: CreatePurchaseOrderData;
      userId: string;
      userName: string;
      isDraft?: boolean;
    },
    { dispatch, rejectWithValue, getState }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const userRoleType = selectUserRoleType(getState());
      const poId = await purchaseOrderService.createPO(
        data,
        userId,
        userName,
        isDraft ?? false,
        userRoleType ?? undefined
      );

      const createdPO = await purchaseOrderService.getPOById(poId);
      if (createdPO) {
        dispatch(addOrUpdatePO(createdPO));
      }

      dispatch(setLoading(false));
      return poId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create purchase order';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update an existing draft purchase order
 */
export const updatePO = createAsyncThunk(
  'purchaseOrders/updatePO',
  async (
    {
      poId,
      data,
      isDraft,
    }: {
      poId: string;
      data: CreatePurchaseOrderData;
      isDraft?: boolean;
    },
    { dispatch, rejectWithValue, getState }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const state = getState() as RootState;
      const userRoleType = selectUserRoleType(state);
      const userId = selectUserId(state);
      const userName = selectUserDisplayName(state);
      const updatedPO = await purchaseOrderService.updatePO(
        poId,
        data,
        isDraft ?? false,
        userRoleType ?? undefined,
        userId ?? undefined,
        userName ?? undefined
      );

      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }

      dispatch(setLoading(false));
      return updatedPO;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update purchase order';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Approve a PO (Admin only)
 */
export const approvePO = createAsyncThunk(
  'purchaseOrders/approvePO',
  async (
    {
      poId,
      adminId,
      adminName,
      data,
    }: {
      poId: string;
      adminId: string;
      adminName: string;
      data?: ApprovePOData;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await purchaseOrderService.approvePO(poId, adminId, adminName, data);

      const updatedPO = await purchaseOrderService.getPOById(poId);
      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }

      dispatch(setLoading(false));
      return updatedPO;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to approve purchase order';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Reject a PO (Admin only)
 */
export const rejectPO = createAsyncThunk(
  'purchaseOrders/rejectPO',
  async (
    {
      poId,
      adminId,
      adminName,
      data,
    }: {
      poId: string;
      adminId: string;
      adminName: string;
      data: RejectPOData;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await purchaseOrderService.rejectPO(poId, adminId, adminName, data);

      const updatedPO = await purchaseOrderService.getPOById(poId);
      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }

      dispatch(setLoading(false));
      return updatedPO;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reject purchase order';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Mark PO as ordered
 */
export const markPOOrdered = createAsyncThunk(
  'purchaseOrders/markPOOrdered',
  async ({ poId }: { poId: string }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await purchaseOrderService.markPOOrdered(poId);

      const updatedPO = await purchaseOrderService.getPOById(poId);
      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }

      dispatch(setLoading(false));
      return updatedPO;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to mark PO as ordered';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Receive a PO and update inventory
 */
export const receivePO = createAsyncThunk(
  'purchaseOrders/receivePO',
  async (
    {
      poId,
      receiveData,
      userId,
      userName,
    }: {
      poId: string;
      receiveData: ReceivePOData;
      userId: string;
      userName: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await purchaseOrderService.receivePO(poId, receiveData, userId, userName);

      const updatedPO = await purchaseOrderService.getPOById(poId);
      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }

      dispatch(setLoading(false));
      return updatedPO;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to receive purchase order';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch purchase orders with pagination (initial load).
 * Fetches count + first page in parallel.
 */
export const fetchPurchaseOrdersPaginated = createAsyncThunk(
  'purchaseOrders/fetchPurchaseOrdersPaginated',
  async (_, { getState, rejectWithValue }) => {
    const { filters } = (getState() as RootState).purchaseOrders;
    const statusFilter = filters.status !== 'all' ? filters.status : undefined;

    try {
      const [totalCount, listResult] = await Promise.all([
        purchaseOrderService.getPurchaseOrdersCount(statusFilter),
        purchaseOrderService.listPurchaseOrdersPaginated(
          statusFilter,
          PURCHASE_ORDERS_PAGE_SIZE
        ),
      ]);

      return {
        orders: listResult.orders,
        totalCount,
        lastDoc: listResult.lastDoc,
        pageSize: PURCHASE_ORDERS_PAGE_SIZE,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load purchase orders';
      return rejectWithValue(message);
    }
  }
);

/**
 * Load more purchase orders (next page).
 */
export const loadMorePurchaseOrders = createAsyncThunk(
  'purchaseOrders/loadMorePurchaseOrders',
  async (_, { getState, rejectWithValue }) => {
    const { filters, lastDoc } = (getState() as RootState).purchaseOrders;
    if (!lastDoc) {
      return { orders: [], lastDoc: null, pageSize: PURCHASE_ORDERS_PAGE_SIZE };
    }

    const statusFilter = filters.status !== 'all' ? filters.status : undefined;

    try {
      const result = await purchaseOrderService.listPurchaseOrdersPaginated(
        statusFilter,
        PURCHASE_ORDERS_PAGE_SIZE,
        lastDoc as import('firebase/firestore').DocumentSnapshot
      );

      return {
        orders: result.orders,
        lastDoc: result.lastDoc,
        pageSize: PURCHASE_ORDERS_PAGE_SIZE,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load more purchase orders';
      return rejectWithValue(message);
    }
  }
);
