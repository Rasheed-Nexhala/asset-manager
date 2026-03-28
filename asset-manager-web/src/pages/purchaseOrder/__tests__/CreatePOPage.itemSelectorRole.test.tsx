/**
 * Create PO passes restrictToLowStock to ItemSelectorModal: Store Incharge (non–Super Admin)
 * restricts to low stock; Super Admin does not. ItemSelectorModal filtering is covered in
 * ItemSelectorModal.poRestrict.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePOPage } from '../CreatePOPage';
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
import type { UserRole } from '../../../types/roles';

const { itemSelectorSpy } = vi.hoisted(() => ({
  itemSelectorSpy: vi.fn(),
}));

vi.mock('../../../components/shared/ItemSelectorModal', () => ({
  ItemSelectorModal: (props: {
    isOpen: boolean;
    restrictToLowStock?: boolean;
    onClose: () => void;
    onSelect: (items: unknown[]) => void;
  }) => {
    itemSelectorSpy(props);
    return props.isOpen ? (
      <div data-testid="item-selector-mock-open" data-restrict={String(props.restrictToLowStock)} />
    ) : null;
  },
}));

vi.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
  analytics: null,
}));

vi.mock('../../../services/firebase/vendorService', () => ({
  subscribeToVendors: (cb: (v: unknown[]) => void) => {
    cb([]);
    return () => {};
  },
  createVendor: vi.fn(),
  deleteVendor: vi.fn(),
}));

vi.mock('../../../services/firebase/siteService', () => ({
  getSites: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../services/firebase/userRoleService', () => ({
  getAdminUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../services/firebase/inventoryService', () => ({
  getItemById: vi.fn().mockResolvedValue(null),
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

function authStateForRole(role: UserRole): Partial<RootState> {
  return {
    auth: {
      user: { uid: 'u1', email: 't@test.com' } as import('firebase/auth').User,
      userRole: { role, isActive: true, permissions: [] },
      isAuthenticated: true,
      isLoading: false,
      isRoleLoading: false,
      authInitialized: true,
      error: null,
    },
  };
}

function renderCreatePO(role: UserRole) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      ...authStateForRole(role),
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

  return render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/purchase-orders/new']}>
          <Routes>
            <Route path="/purchase-orders/new" element={<CreatePOPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </Provider>
  );
}

describe('CreatePOPage — ItemSelectorModal restrictToLowStock by role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('passes restrictToLowStock=false when user is SuperAdmin', async () => {
    const user = userEvent.setup();
    renderCreatePO('SuperAdmin');

    const addBtn = await screen.findByRole('button', { name: /^Add$/ });
    await user.click(addBtn);

    await waitFor(() => {
      expect(itemSelectorSpy).toHaveBeenCalled();
    });

    const last = itemSelectorSpy.mock.calls[itemSelectorSpy.mock.calls.length - 1][0];
    expect(last.isOpen).toBe(true);
    expect(last.restrictToLowStock).toBe(false);
  });

  it('passes restrictToLowStock=true when user is Store Incharge (not Super Admin)', async () => {
    const user = userEvent.setup();
    renderCreatePO('StoreIncharge');

    const addBtn = await screen.findByRole('button', { name: /^Add$/ });
    await user.click(addBtn);

    await waitFor(() => {
      expect(itemSelectorSpy).toHaveBeenCalled();
    });

    const last = itemSelectorSpy.mock.calls[itemSelectorSpy.mock.calls.length - 1][0];
    expect(last.isOpen).toBe(true);
    expect(last.restrictToLowStock).toBe(true);
  });
});
