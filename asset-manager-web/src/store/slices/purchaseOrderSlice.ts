import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { Vendor } from '../../types/vendor';
import { sanitizeForDisplay } from '../../utils/sanitizeUtils';

interface PurchaseOrderState {
  purchaseOrders: PurchaseOrder[];
  selectedPO: PurchaseOrder | null;
  vendors: Vendor[];
  vendorsLoading: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  totalCount: number | null;
  lastDoc: unknown;
  hasMore: boolean;
  filters: {
    status: string;
  };
}

const initialState: PurchaseOrderState = {
  purchaseOrders: [],
  selectedPO: null,
  vendors: [],
  vendorsLoading: false,
  loading: false,
  loadingMore: false,
  error: null,
  totalCount: null,
  lastDoc: null,
  hasMore: false,
  filters: {
    status: 'all',
  },
};

const purchaseOrderSlice = createSlice({
  name: 'purchaseOrders',
  initialState,
  reducers: {
    setPurchaseOrders: (state, action: PayloadAction<PurchaseOrder[]>) => {
      const byId = new Map<string, PurchaseOrder>();
      action.payload.forEach((po) => {
        if (!byId.has(po.id)) byId.set(po.id, po);
      });
      state.purchaseOrders = Array.from(byId.values());
      state.loading = false;
    },

    /** Real-time: replace list from Firestore snapshot (no pagination) */
    setPurchaseOrdersFromSubscription: (state, action: PayloadAction<PurchaseOrder[]>) => {
      const byId = new Map<string, PurchaseOrder>();
      action.payload.forEach((po) => {
        if (!byId.has(po.id)) byId.set(po.id, po);
      });
      state.purchaseOrders = Array.from(byId.values());
      state.totalCount = action.payload.length;
      state.lastDoc = null;
      state.hasMore = false;
      state.loading = false;
      state.error = null;
    },

    setSelectedPO: (state, action: PayloadAction<PurchaseOrder | null>) => {
      state.selectedPO = action.payload;
    },

    setVendors: (state, action: PayloadAction<Vendor[]>) => {
      const byId = new Map<string, Vendor>();
      action.payload.forEach((v) => {
        if (!byId.has(v.id)) byId.set(v.id, v);
      });
      state.vendors = Array.from(byId.values());
      state.vendorsLoading = false;
    },

    setVendorsLoading: (state, action: PayloadAction<boolean>) => {
      state.vendorsLoading = action.payload;
    },

    addOrUpdatePO: (state, action: PayloadAction<PurchaseOrder>) => {
      const po = action.payload;
      const idx = state.purchaseOrders.findIndex((p) => p.id === po.id);
      if (idx >= 0) {
        state.purchaseOrders[idx] = po;
      } else {
        state.purchaseOrders.unshift(po);
      }
      if (state.selectedPO?.id === po.id) {
        state.selectedPO = po;
      }
    },

    removePO: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.purchaseOrders = state.purchaseOrders.filter((p) => p.id !== id);
      if (state.selectedPO?.id === id) {
        state.selectedPO = null;
      }
    },

    setFilters: (state, action: PayloadAction<Partial<PurchaseOrderState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset pagination when filters change
      state.purchaseOrders = [];
      state.totalCount = null;
      state.lastDoc = null;
      state.hasMore = false;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    clearPurchaseOrders: (state) => {
      state.purchaseOrders = [];
      state.selectedPO = null;
      state.totalCount = null;
      state.lastDoc = null;
      state.hasMore = false;
      state.loading = false;
      state.loadingMore = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase('purchaseOrders/fetchPurchaseOrdersPaginated/pending', (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase('purchaseOrders/fetchPurchaseOrdersPaginated/fulfilled', (state, action) => {
        const payload = (action as PayloadAction<{
          orders: PurchaseOrder[];
          totalCount: number;
          lastDoc: unknown;
          pageSize: number;
        }>).payload;
        state.purchaseOrders = payload.orders;
        state.totalCount = payload.totalCount;
        state.lastDoc = payload.lastDoc;
        state.hasMore = payload.orders.length >= payload.pageSize;
        state.loading = false;
      })
      .addCase('purchaseOrders/fetchPurchaseOrdersPaginated/rejected', (state, action) => {
        state.loading = false;
        const payload = (action as PayloadAction<string | undefined>).payload;
        state.error = sanitizeForDisplay(payload) || 'Failed to load purchase orders';
      })
      .addCase('purchaseOrders/loadMorePurchaseOrders/pending', (state) => {
        state.loadingMore = true;
      })
      .addCase('purchaseOrders/loadMorePurchaseOrders/fulfilled', (state, action) => {
        const payload = (action as PayloadAction<{
          orders: PurchaseOrder[];
          lastDoc: unknown;
          pageSize: number;
        }>).payload;
        state.purchaseOrders = [...state.purchaseOrders, ...payload.orders];
        state.lastDoc = payload.lastDoc;
        state.hasMore = payload.orders.length >= payload.pageSize;
        state.loadingMore = false;
      })
      .addCase('purchaseOrders/loadMorePurchaseOrders/rejected', (state) => {
        state.loadingMore = false;
      });
  },
});

export const {
  setPurchaseOrders,
  setPurchaseOrdersFromSubscription,
  setSelectedPO,
  setVendors,
  setVendorsLoading,
  addOrUpdatePO,
  removePO,
  setFilters,
  setLoading,
  setError,
  clearError,
  clearPurchaseOrders,
} = purchaseOrderSlice.actions;

export default purchaseOrderSlice.reducer;
