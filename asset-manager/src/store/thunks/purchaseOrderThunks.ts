import { createAsyncThunk } from '@reduxjs/toolkit';
import * as purchaseOrderService from '../../services/firebase/purchaseOrderService';
import { saveCsvAndShare, formatDateForCsv } from '../../utils/csvExport';
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
  removePO,
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

      const userRoleType = selectUserRoleType(getState() as RootState);
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
 * Delete a draft purchase order (permanently removes from Firestore)
 */
export const deletePO = createAsyncThunk(
  'purchaseOrders/deletePO',
  async (
    { poId, userId }: { poId: string; userId: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      await purchaseOrderService.deletePO(poId, userId);
      dispatch(removePO(poId));

      dispatch(setLoading(false));
      return poId;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete draft';
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

// Re-export pagination thunks (defined in separate file to avoid circular dependency with slice)
export {
  fetchPurchaseOrdersPaginated,
  loadMorePurchaseOrders,
} from './purchaseOrderPaginationThunks';

/**
 * Export purchase orders to CSV
 */
export const exportPurchaseOrdersThunk = createAsyncThunk(
  'purchaseOrders/export',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { filters } = state.purchaseOrders;
      
      const orders = await purchaseOrderService.exportPurchaseOrders(filters.status);
      
      const header = 'PO Number,Date,Vendor Name,Vendor Contact,PO Status,Justification,Total PO Amount,Item Name,SKU,Ordered Qty,Unit Price,GST %,Total Item Amount,Received Qty\n';
      
      const escapeCsvField = (value: string | number | null | undefined): string =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      const rows = orders.flatMap(po => {
        const poDate = formatDateForCsv(po.createdAt);
        const poBase = [
          po.poNumber,
          poDate,
          po.vendorName,
          po.vendorContact,
          po.status,
          po.justification,
          po.totalAmount
        ].map(escapeCsvField);

        if (!po.items || po.items.length === 0) {
          return [poBase.concat(Array(7).fill('""')).join(',')];
        }

        return po.items.map(item => {
          const itemBase = [
            item.itemName,
            item.itemSku,
            item.orderedQuantity ?? item.quantity,
            item.unitPrice,
            item.gstPercentage,
            item.amount,
            item.receivedQuantity ?? 0
          ].map(escapeCsvField);
          return [...poBase, ...itemBase].join(',');
        });
      }).join('\n');
      
      await saveCsvAndShare(header + rows, 'purchase-orders');
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export purchase orders';
      return rejectWithValue(errorMessage);
    }
  }
);
