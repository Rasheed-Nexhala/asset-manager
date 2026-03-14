/**
 * Purchase order pagination thunks - separate file to avoid circular dependency
 * with purchaseOrderSlice (which uses extraReducers for these actions).
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import * as purchaseOrderService from '../../services/firebase/purchaseOrderService';
import { PURCHASE_ORDERS_PAGE_SIZE } from '../../services/firebase/purchaseOrderService';
import type { RootState } from '../index';

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
