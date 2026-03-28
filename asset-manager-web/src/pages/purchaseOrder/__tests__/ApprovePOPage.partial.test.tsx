/**
 * Partially received PO: "Continue receiving" links to Receive route.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import { ApprovePOPage } from '../ApprovePOPage';
import { ToastProvider } from '../../../contexts/ToastContext';
import authReducer from '../../../store/slices/authSlice';
import sitesReducer from '../../../store/slices/sitesSlice';
import inventoryReducer from '../../../store/slices/inventorySlice';
import requestsReducer from '../../../store/slices/requestsSlice';
import steelMasterReducer from '../../../store/slices/steelMasterSlice';
import maintenanceReducer from '../../../store/slices/maintenanceSlice';
import activityLogReducer from '../../../store/slices/activityLogSlice';
import purchaseOrderReducer from '../../../store/slices/purchaseOrderSlice';
import inventoryUpdateRequestReducer from '../../../store/slices/inventoryUpdateRequestSlice';
import type { RootState } from '../../../store';
import type { PurchaseOrder } from '../../../types/purchaseOrder';
import { getPOById } from '../../../services/firebase/purchaseOrderService';

vi.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
  analytics: null,
}));

vi.mock('../../../services/firebase/purchaseOrderService', () => ({
  getPOById: vi.fn(),
}));

const rootReducer = {
  auth: authReducer,
  sites: sitesReducer,
  inventory: inventoryReducer,
  requests: requestsReducer,
  steelMaster: steelMasterReducer,
  maintenance: maintenanceReducer,
  activityLog: activityLogReducer,
  purchaseOrders: purchaseOrderReducer,
  inventoryUpdateRequest: inventoryUpdateRequestReducer,
};

const minimalPartialPO: PurchaseOrder = {
  id: 'po-test',
  poNumber: 'PO-TEST-1',
  vendorId: 'v1',
  vendorName: 'Vendor',
  vendorContact: '000',
  items: [],
  subtotal: 0,
  gstPercentage: 18,
  gstAmount: 0,
  totalAmount: 0,
  justification: '',
  expectedDeliveryDate: null,
  documents: [],
  status: 'partially_received',
  createdBy: 'u1',
  createdByName: 'Creator',
  createdAt: '2025-01-01T00:00:00.000Z',
  reviewedBy: null,
  reviewedByName: null,
  reviewedAt: null,
  adminComments: null,
  rejectionReason: null,
  receivedAt: null,
  receivedBy: null,
  receivedByName: null,
  receivedNotes: null,
  updatedAt: '2025-01-01T00:00:00.000Z',
  grrReceipts: [
    {
      grrNumber: 'PO-RCV-2026-0001',
      receivedAt: '2026-03-28T10:00:00.000Z',
      receivedBy: 'u2',
      receivedByName: 'Receiver',
    },
  ],
};

function renderApprovePage(role: 'Admin' | 'StoreIncharge') {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        user: { uid: 'u1', email: 't@test.com' },
        userRole: { role, isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
      sites: {
        sites: [],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
      inventory: {
        items: [],
        categories: [],
        inventoryByLocation: {},
        lowStockItemIds: [],
        loading: false,
        error: null,
        errorTimestamp: null,
        filters: null,
        totalCount: null,
        lastDoc: null,
        hasMore: false,
        loadingMore: false,
      },
    } as Partial<RootState>,
  });

  const router = createMemoryRouter(
    [{ path: '/purchase-orders/:poId/approve', element: <ApprovePOPage /> }],
    { initialEntries: ['/purchase-orders/po-test/approve'] }
  );

  return render(
    <Provider store={store}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </Provider>
  );
}

describe('ApprovePOPage — partially_received', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPOById).mockResolvedValue(minimalPartialPO);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('min-width: 768px'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it.each(['Admin', 'StoreIncharge'] as const)(
    'shows Continue receiving link to receive route (%s)',
    async (role) => {
      renderApprovePage(role);
      const link = await screen.findByRole('link', { name: /Continue receiving/i });
      expect(link.getAttribute('href')).toContain('/purchase-orders/po-test/receive');
    }
  );
});
