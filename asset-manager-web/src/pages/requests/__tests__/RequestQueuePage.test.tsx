/**
 * Request queue action column: Process vs View by role and terminal statuses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestQueuePage } from '../RequestQueuePage';
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
import type { Request } from '../../../types/request';

vi.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  functions: {},
  analytics: null,
}));

vi.mock('../../../hooks/useRequestsSubscriptions', () => ({
  useRequestQueueSubscription: vi.fn(),
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

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    requestNumber: 'REQ-2025-0001',
    siteId: 'site-1',
    siteName: 'Site A',
    requestedBy: 'u1',
    requestedByName: 'Tester',
    status: 'pending',
    priority: 'medium',
    purpose: 'Work',
    items: [],
    processedBy: null,
    processedByName: null,
    processedAt: null,
    storeNotes: null,
    rejectionReason: null,
    rejectionComments: null,
    transferredAt: null,
    transferredBy: null,
    transferredByName: null,
    receivedBy: null,
    receivedByName: null,
    returnHistory: [],
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
    ...overrides,
  };
}

const baseRequestsState = {
  requests: [] as Request[],
  myRequests: [],
  selectedRequest: null,
  loading: false,
  error: null,
  errorTimestamp: null,
  filters: { status: 'all', priority: 'all', siteId: 'all' },
  requestsTotalCount: 1,
  requestsLastDoc: null,
  requestsHasMore: false,
  requestsLoadingMore: false,
  myRequestsTotalCount: null,
  myRequestsLastDoc: null,
  myRequestsHasMore: false,
  myRequestsLoadingMore: false,
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

function renderQueueWithRole(role: 'Admin' | 'StoreIncharge' | 'SuperAdmin', requests: Request[]) {
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
      requests: {
        ...baseRequestsState,
        requests,
      },
      sites: {
        sites: [],
        isLoading: false,
        error: null,
        searchQuery: '',
        validationLoading: false,
        lastValidationAt: null,
      },
      inventory: emptyInventory,
    } as Partial<RootState>,
  });

  const router = createMemoryRouter(
    [
      { path: '/requests/queue', element: <RequestQueuePage /> },
      { path: '/requests/:requestId/process', element: <div>Process stub</div> },
    ],
    { initialEntries: ['/requests/queue'] }
  );

  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );

  return { ...view, router };
}

describe('RequestQueuePage — action column', () => {
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

  it('shows View (not Process) for Admin on actionable pending request', () => {
    renderQueueWithRole('Admin', [createMockRequest({ status: 'pending' })]);
    expect(screen.getByRole('button', { name: 'View' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Process' })).toBeNull();
  });

  it('shows Process for StoreIncharge on pending request', () => {
    renderQueueWithRole('StoreIncharge', [createMockRequest({ status: 'pending' })]);
    expect(screen.getByRole('button', { name: 'Process' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View' })).toBeNull();
  });

  it('shows Process for SuperAdmin on pending request', () => {
    renderQueueWithRole('SuperAdmin', [createMockRequest({ status: 'pending' })]);
    expect(screen.getByRole('button', { name: 'Process' })).toBeTruthy();
  });

  it('shows View for StoreIncharge when status is rejected (terminal)', () => {
    renderQueueWithRole('StoreIncharge', [createMockRequest({ status: 'rejected' })]);
    expect(screen.getByRole('button', { name: 'View' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Process' })).toBeNull();
  });

  it('shows View for SuperAdmin when status is transferred (terminal)', () => {
    renderQueueWithRole('SuperAdmin', [createMockRequest({ status: 'transferred' })]);
    expect(screen.getByRole('button', { name: 'View' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Process' })).toBeNull();
  });

  it('navigates to process route when View is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderQueueWithRole('Admin', [
      createMockRequest({ id: 'req-99', status: 'pending' }),
    ]);
    await user.click(screen.getByRole('button', { name: 'View' }));
    expect(router.state.location.pathname).toBe('/requests/req-99/process');
  });
});
