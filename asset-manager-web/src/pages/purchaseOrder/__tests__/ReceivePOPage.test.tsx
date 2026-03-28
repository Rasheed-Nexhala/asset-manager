/**
 * Receive POPage: success toast copy for partial vs full receipt (service-layer mocks).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceivePOPage } from '../ReceivePOPage';
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
import type { PurchaseOrder, PurchaseOrderItem } from '../../../types/purchaseOrder';
import { ToastProvider } from '../../../contexts/ToastContext';

const { mockGetPOById, mockReceivePO } = vi.hoisted(() => ({
  mockGetPOById: vi.fn(),
  mockReceivePO: vi.fn(),
}));

vi.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
  analytics: null,
}));

vi.mock('../../../services/firebase/purchaseOrderService', () => ({
  getPOById: (...args: unknown[]) => mockGetPOById(...args),
  receivePO: (...args: unknown[]) => mockReceivePO(...args),
}));

vi.mock('../../../services/firebase/inventoryService', () => ({
  getItemById: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../utils/poPdfUtils', () => ({
  printPurchaseOrder: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/firebase/storageService', () => ({
  deletePOSignedDocumentByUrl: vi.fn(),
  uploadPOInvoice: vi.fn().mockResolvedValue({ url: 'https://example.com/inv', fileName: 'inv.pdf' }),
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

const emptySites = {
  sites: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  validationLoading: false,
  lastValidationAt: null,
};

const emptyInventory = {
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
};

const baseRequestsState = {
  requests: [],
  myRequests: [],
  selectedRequest: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: { status: 'all', priority: 'all', siteId: 'all' },
  requestsTotalCount: 0,
  requestsLastDoc: null,
  requestsHasMore: false,
  requestsLoadingMore: false,
  myRequestsTotalCount: null,
  myRequestsLastDoc: null,
  myRequestsHasMore: false,
  myRequestsLoadingMore: false,
};

const basePurchaseOrdersState = {
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
  filters: { status: 'all' },
};

function item(
  overrides: Partial<PurchaseOrderItem> & Pick<PurchaseOrderItem, 'itemId' | 'itemName'>
): PurchaseOrderItem {
  return {
    itemSku: `${overrides.itemId}-SKU`,
    isExistingItem: true,
    quantity: 100,
    unitPrice: 10,
    amount: 1000,
    receivedQuantity: 0,
    unit: 'Pcs',
    ...overrides,
  };
}

function createApprovedPO(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  const items: PurchaseOrderItem[] = [
    item({ itemId: 'item-a', itemName: 'Item A' }),
    item({ itemId: 'item-b', itemName: 'Item B' }),
  ];
  return {
    id: 'po-1',
    poNumber: 'PO-2026-0001',
    vendorId: 'v1',
    vendorName: 'Vendor A',
    vendorContact: '123',
    items,
    subtotal: 2000,
    gstPercentage: 18,
    gstAmount: 360,
    totalAmount: 2360,
    justification: 'Test',
    expectedDeliveryDate: null,
    documents: [],
    status: 'approved',
    createdBy: 'u1',
    createdByName: 'Creator',
    createdAt: '2026-01-01T00:00:00.000Z',
    reviewedBy: 'admin',
    reviewedByName: 'Admin',
    reviewedAt: '2026-01-02T00:00:00.000Z',
    adminComments: null,
    rejectionReason: null,
    receivedAt: null,
    receivedBy: null,
    receivedByName: null,
    receivedNotes: null,
    updatedAt: '2026-01-03T00:00:00.000Z',
    ...overrides,
  };
}

function renderReceivePage() {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        user: {
          uid: 'u1',
          email: 'store@test.com',
          displayName: 'Store User',
        } as import('firebase/auth').User,
        userRole: { role: 'StoreIncharge', isActive: true, permissions: [] },
        isAuthenticated: true,
        isLoading: false,
        isRoleLoading: false,
        authInitialized: true,
        error: null,
      },
      sites: emptySites,
      inventory: emptyInventory,
      requests: baseRequestsState,
      purchaseOrders: basePurchaseOrdersState,
    } as Partial<RootState>,
  });

  return render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/purchase-orders/po-1/receive']}>
          <Routes>
            <Route path="/purchase-orders/:poId/receive" element={<ReceivePOPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </Provider>
  );
}

describe('ReceivePOPage — success toasts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReceivePO.mockResolvedValue({ grrNumber: 'PO-RCV-2026-0001' });
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

  it('shows partial receipt toast when updated PO is partially_received', async () => {
    const initial = createApprovedPO();
    const afterReceive = createApprovedPO({
      status: 'partially_received',
      items: [
        item({ itemId: 'item-a', itemName: 'Item A', receivedQuantity: 50 }),
        item({ itemId: 'item-b', itemName: 'Item B', receivedQuantity: 0 }),
      ],
    });

    let call = 0;
    mockGetPOById.mockImplementation(async () => {
      call += 1;
      return call === 1 ? initial : afterReceive;
    });

    const user = userEvent.setup();
    renderReceivePage();

    const confirmBtn = await screen.findByRole('button', {
      name: /CONFIRM.*UPDATE INVENTORY/i,
    });

    const qtyInputs = screen.getAllByDisplayValue('100');
    expect(qtyInputs.length).toBeGreaterThanOrEqual(2);
    await user.clear(qtyInputs[0]);
    await user.type(qtyInputs[0], '50');
    await user.clear(qtyInputs[1]);
    await user.type(qtyInputs[1], '0');

    await user.click(confirmBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toMatch(/Partial receipt saved/i);
    });
    expect(screen.getByRole('alert').textContent).toMatch(/PO-RCV-2026-0001/);
    expect(mockReceivePO).toHaveBeenCalled();
    expect(mockGetPOById).toHaveBeenCalledTimes(2);
  });

  it('shows full receipt toast when updated PO is received (no partial copy)', async () => {
    const initial = createApprovedPO();
    const afterReceive = createApprovedPO({
      status: 'received',
      items: [
        item({ itemId: 'item-a', itemName: 'Item A', receivedQuantity: 100 }),
        item({ itemId: 'item-b', itemName: 'Item B', receivedQuantity: 100 }),
      ],
    });

    let call = 0;
    mockGetPOById.mockImplementation(async () => {
      call += 1;
      return call === 1 ? initial : afterReceive;
    });

    const user = userEvent.setup();
    renderReceivePage();

    const confirmBtn = await screen.findByRole('button', {
      name: /CONFIRM.*UPDATE INVENTORY/i,
    });
    await user.click(confirmBtn);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toMatch(/Purchase order received/i);
    });
    expect(screen.getByRole('alert').textContent).not.toMatch(/Partial receipt saved/i);
  });
});
