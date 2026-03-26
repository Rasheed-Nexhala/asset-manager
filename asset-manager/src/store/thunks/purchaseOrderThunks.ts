import { createAsyncThunk } from '@reduxjs/toolkit';
import * as purchaseOrderService from '../../services/firebase/purchaseOrderService';
import { deletePOSignedDocumentByUrl } from '../../services/firebase/storageService';
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
 * Record that admin downloaded PO for signing (sets "Approved By" name)
 */
export const recordPODownloadForSigning = createAsyncThunk(
  'purchaseOrders/recordPODownloadForSigning',
  async (
    { poId, adminId, adminName }: { poId: string; adminId: string; adminName: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await purchaseOrderService.recordPODownloadForSigning(poId, adminId, adminName);
      const updatedPO = await purchaseOrderService.getPOById(poId);
      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }
      return updatedPO;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to record download';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Upload signed PO document and update PO
 */
export const uploadSignedPO = createAsyncThunk(
  'purchaseOrders/uploadSignedPO',
  async (
    {
      poId,
      signedPdfUrl,
      adminId: payloadAdminId,
      adminName: payloadAdminName,
    }: {
      poId: string;
      signedPdfUrl: string;
      adminId?: string;
      adminName?: string;
    },
    { dispatch, rejectWithValue, getState }
  ) => {
    const adminId = payloadAdminId ?? selectUserId(getState() as RootState);
    const adminName = payloadAdminName ?? selectUserDisplayName(getState() as RootState);

    if (!adminId || !adminName) {
      return rejectWithValue('Admin credentials required to upload signed document');
    }

    try {
      const updatedPO = await purchaseOrderService.setSignedPdfUrl(
        poId,
        adminId,
        signedPdfUrl
      );
      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }
      return updatedPO;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload signed document';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Remove signed PO document (delete from Storage and clear from PO).
 * Allows user to remove the uploaded document and upload a different one.
 */
export const removeSignedPO = createAsyncThunk(
  'purchaseOrders/removeSignedPO',
  async (
    { poId, signedPdfUrl }: { poId: string; signedPdfUrl: string },
    { dispatch, rejectWithValue, getState }
  ) => {
    const adminId = selectUserId(getState() as RootState);
    if (!adminId) {
      return rejectWithValue('Admin credentials required to remove signed document');
    }

    try {
      await deletePOSignedDocumentByUrl(signedPdfUrl);
      const updatedPO = await purchaseOrderService.clearSignedPdfUrl(poId, adminId);
      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }
      return updatedPO;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to remove signed document';
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

      const { grrNumber } = await purchaseOrderService.receivePO(
        poId,
        receiveData,
        userId,
        userName
      );

      const updatedPO = await purchaseOrderService.getPOById(poId);
      if (updatedPO) {
        dispatch(addOrUpdatePO(updatedPO));
      }

      dispatch(setLoading(false));
      return { updatedPO: updatedPO ?? null, grrNumber };
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
      
      const header = 'PO Number,Date,Vendor Name,Vendor Contact,Vendor Email,Vendor Address,Vendor GSTIN,Location,Job No,PO Status,Justification,Total PO Amount,Expected Delivery,Created By,Approved By,Rejection Reason,Admin Comments,Received At,Received By,Received Notes,GRR Numbers,Item Name,SKU,Ordered Qty,Unit,Unit Price,GST %,Total Item Amount,Received Qty,Item Remarks\n';
      
      const escapeCsvField = (value: string | number | null | undefined): string =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      const rows = orders.flatMap(po => {
        const poDate = formatDateForCsv(po.createdAt);
        const expectedDelivery = formatDateForCsv(po.expectedDeliveryDate);
        const receivedAt = formatDateForCsv(po.receivedAt);
        const grrNumbers = (po.grrReceipts ?? [])
          .map((r) => r.grrNumber)
          .join('; ');

        const poBase = [
          po.poNumber,
          poDate,
          po.vendorName,
          po.vendorContact,
          po.vendorEmail,
          po.vendorAddress,
          po.vendorGstin,
          po.location,
          po.jobNo,
          po.status,
          po.justification,
          po.totalAmount,
          expectedDelivery,
          po.createdByName,
          po.reviewedByName,
          po.rejectionReason,
          po.adminComments,
          receivedAt,
          po.receivedByName,
          po.receivedNotes,
          grrNumbers,
        ].map(escapeCsvField);

        if (!po.items || po.items.length === 0) {
          return [poBase.concat(Array(9).fill('""')).join(',')];
        }

        return po.items.map(item => {
          const itemBase = [
            item.itemName,
            item.itemSku,
            item.orderedQuantity ?? item.quantity,
            item.orderedUnit ?? item.unit,
            item.unitPrice,
            item.gstPercentage,
            item.amount,
            item.receivedQuantity ?? 0,
            item.remarks
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
