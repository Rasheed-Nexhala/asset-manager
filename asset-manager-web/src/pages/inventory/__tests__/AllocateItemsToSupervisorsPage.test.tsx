/**
 * Split stock: filters transferred requests, validation toasts, success state and explicit Done navigation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { AllocateItemsToSupervisorsPage } from '../AllocateItemsToSupervisorsPage';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import { ToastProvider } from '../../../contexts/ToastContext';
import { siteSupervisorService } from '../../../services/firebase/siteSupervisorService';
import { requestService } from '../../../services/firebase/requestService';
import { createSiteManagerPreloadedState, SITE_MANAGER_TEST_IDS } from '../../../test/fixtures/siteManagerStore';
import type { RootState } from '../../../store';
import type { Request, RequestItem } from '../../../types/request';
import type { SiteSupervisor } from '../../../types/siteSupervisor';

vi.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
}));

const createSupervisorAllocation = vi.fn(() => Promise.resolve());

vi.mock('../../../services/firebase/siteSupervisorService', () => ({
  siteSupervisorService: {
    subscribeSiteSupervisors: vi.fn(),
    createSupervisorAllocation: (...args: unknown[]) => createSupervisorAllocation(...args),
  },
}));

vi.mock('../../../services/firebase/requestService', () => ({
  requestService: {
    subscribeToRequests: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

function mkItem(overrides: Partial<RequestItem> = {}): RequestItem {
  return {
    itemId: 'item-1',
    itemName: 'Ladder',
    itemSku: 'SKU-1',
    itemType: 'non_consumable',
    categoryId: 'cat',
    categoryName: 'Tools',
    quantityRequested: 5,
    quantityApproved: 5,
    quantityReturned: 0,
    supervisorOutstandingQty: 0,
    status: 'transferred',
    ...overrides,
  };
}

function mkTransferredRequest(): Request {
  return {
    id: 'req-1',
    requestNumber: 'REQ-2026-0001',
    siteId: SITE_MANAGER_TEST_IDS.siteId,
    siteName: 'Test Site',
    requestedBy: 'other-user',
    requestedByName: 'Requester',
    status: 'transferred',
    priority: 'medium',
    purpose: 'Work',
    items: [mkItem()],
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function mkTransferredRequest2(): Request {
  return {
    ...mkTransferredRequest(),
    id: 'req-2',
    requestNumber: 'REQ-2026-0002',
  };
}

function renderAt(search: string, preloadedState: Partial<RootState> = createSiteManagerPreloadedState()) {
  return renderWithProviders(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/inventory/divide-to-supervisors${search}`]}>
        <Routes>
          <Route path="/inventory/divide-to-supervisors" element={<AllocateItemsToSupervisorsPage />} />
          <Route path="/inventory" element={<div>Inventory home</div>} />
          <Route path="/requests/queue" element={<div>Queue</div>} />
          <Route path="/requests/my-requests" element={<div>My requests</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
    { preloadedState }
  );
}

function preloadedStoreInchargeCanViewQueue(): Partial<RootState> {
  const base = createSiteManagerPreloadedState();
  return {
    ...base,
    auth: {
      ...base.auth!,
      userRole: {
        role: 'StoreIncharge',
        isActive: true,
        permissions: ['canManageInventory'],
      },
    },
  };
}

async function completeAllocationFlow(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => screen.findByText('REQ-2026-0001'));
  await user.click(screen.getByText('REQ-2026-0001'));
  await user.click(screen.getByText('Ladder'));
  await user.click(screen.getByText('Lead One'));
  await user.click(screen.getByRole('button', { name: /save allocation/i }));
}

describe('AllocateItemsToSupervisorsPage', () => {
  const supervisor: SiteSupervisor = {
    id: 'sup-1',
    siteId: SITE_MANAGER_TEST_IDS.siteId,
    name: 'Lead One',
    createdByManagerId: SITE_MANAGER_TEST_IDS.userId,
    createdAt: null,
    updatedAt: null,
  };

  beforeEach(() => {
    createSupervisorAllocation.mockClear();
    mockNavigate.mockClear();
    vi.mocked(requestService.subscribeToRequests).mockImplementation((_filters, cb) => {
      cb([mkTransferredRequest()]);
      return vi.fn();
    });
    vi.mocked(siteSupervisorService.subscribeSiteSupervisors).mockImplementation((_site, cb) => {
      cb([supervisor]);
      return vi.fn();
    });
  });

  it('shows no working site when there is no effective site id', () => {
    const state = createSiteManagerPreloadedState();
    state.sites = { ...state.sites!, sites: [], activeManagedSiteId: null };
    renderWithProviders(
      <ToastProvider>
        <MemoryRouter>
          <AllocateItemsToSupervisorsPage />
        </MemoryRouter>
      </ToastProvider>,
      { preloadedState: state }
    );
    expect(screen.getByText(/no working site/i)).toBeInTheDocument();
  });

  it('shows validation toast when required selections are missing', async () => {
    const user = userEvent.setup();
    renderAt('');

    await waitFor(() => screen.findByRole('button', { name: /save allocation/i }));

    await user.click(screen.getByRole('button', { name: /save allocation/i }));

    await waitFor(() => {
      expect(screen.getByText(/choose request, item, supervisor/i)).toBeInTheDocument();
    });
  });

  it('stays on page and shows success summary after save; does not auto-navigate', async () => {
    const user = userEvent.setup();
    renderAt('');

    await waitFor(() => screen.findByText('REQ-2026-0001'));
    await user.click(screen.getByText('REQ-2026-0001'));
    await user.click(screen.getByText('Ladder'));
    await user.click(screen.getByText('Lead One'));

    await user.click(screen.getByRole('button', { name: /save allocation/i }));

    await waitFor(() => {
      expect(createSupervisorAllocation).toHaveBeenCalledWith(
        SITE_MANAGER_TEST_IDS.siteId,
        expect.objectContaining({
          requestId: 'req-1',
          itemId: 'item-1',
          supervisorId: 'sup-1',
          quantity: 1,
        }),
        'Lead One',
        { userId: SITE_MANAGER_TEST_IDS.userId, userName: 'Site Manager' }
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    const successRegion = screen.getByRole('status', { name: /allocation saved/i });
    expect(successRegion).toHaveTextContent('REQ-2026-0001');
    expect(successRegion).toHaveTextContent('Ladder');
    expect(successRegion).toHaveTextContent('Lead One');
  });

  it('navigates to inventory when Back to inventory is pressed', async () => {
    const user = userEvent.setup();
    renderAt('');

    await waitFor(() => screen.findByRole('button', { name: /back to inventory/i }));
    await user.click(screen.getByRole('button', { name: /back to inventory/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('navigates to my-requests when Back to requests is pressed', async () => {
    const user = userEvent.setup();
    renderAt('');

    await waitFor(() => screen.findByRole('button', { name: /back to requests/i }));
    await user.click(screen.getByRole('button', { name: /back to requests/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/requests/my-requests');
  });

  it('subscribes to requests with site and user filters', async () => {
    renderAt('');
    await waitFor(() => {
      expect(requestService.subscribeToRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: SITE_MANAGER_TEST_IDS.userId,
          siteId: SITE_MANAGER_TEST_IDS.siteId,
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  it('dismisses the success banner when Dismiss is pressed', async () => {
    const user = userEvent.setup();
    renderAt('');

    await completeAllocationFlow(user);

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /allocation saved/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /dismiss success message/i }));

    expect(screen.queryByRole('status', { name: /allocation saved/i })).not.toBeInTheDocument();
  });

  it('clears the success banner when selecting a different request', async () => {
    const user = userEvent.setup();
    vi.mocked(requestService.subscribeToRequests).mockImplementation((_filters, cb) => {
      cb([mkTransferredRequest(), mkTransferredRequest2()]);
      return vi.fn();
    });

    renderAt('');

    await completeAllocationFlow(user);

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /allocation saved/i })).toBeInTheDocument();
    });

    await user.click(screen.getByText('REQ-2026-0002'));

    expect(screen.queryByRole('status', { name: /allocation saved/i })).not.toBeInTheDocument();
  });

  it('clears the success banner when selecting a different line item', async () => {
    const user = userEvent.setup();
    const twoLineRequest: Request = {
      ...mkTransferredRequest(),
      items: [
        mkItem({ itemId: 'item-a', itemName: 'Ladder' }),
        mkItem({
          itemId: 'item-b',
          itemName: 'Cable',
          quantityApproved: 4,
          quantityRequested: 4,
        }),
      ],
    };
    vi.mocked(requestService.subscribeToRequests).mockImplementation((_filters, cb) => {
      cb([twoLineRequest]);
      return vi.fn();
    });

    renderAt('');

    await waitFor(() => screen.findByText('REQ-2026-0001'));
    await user.click(screen.getByText('REQ-2026-0001'));
    await user.click(screen.getByText('Ladder'));
    await user.click(screen.getByText('Lead One'));
    await user.click(screen.getByRole('button', { name: /save allocation/i }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /allocation saved/i })).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cable'));

    expect(screen.queryByRole('status', { name: /allocation saved/i })).not.toBeInTheDocument();
  });

  it('shows error toast when allocation fails', async () => {
    const user = userEvent.setup();
    createSupervisorAllocation.mockRejectedValueOnce(new Error('Firestore transaction failed'));

    renderAt('');

    await completeAllocationFlow(user);

    await waitFor(() => {
      expect(screen.getByText(/Firestore transaction failed/i)).toBeInTheDocument();
    });
  });

  it('saves allocation for a consumable line', async () => {
    const user = userEvent.setup();
    const consumableRequest: Request = {
      ...mkTransferredRequest(),
      items: [mkItem({ itemType: 'consumable', itemName: 'Cement bags' })],
    };
    vi.mocked(requestService.subscribeToRequests).mockImplementation((_filters, cb) => {
      cb([consumableRequest]);
      return vi.fn();
    });

    renderAt('');

    await waitFor(() => screen.findByText('REQ-2026-0001'));
    await user.click(screen.getByText('REQ-2026-0001'));
    await user.click(screen.getByText('Cement bags'));
    await user.click(screen.getByText('Lead One'));
    await user.click(screen.getByRole('button', { name: /save allocation/i }));

    await waitFor(() => {
      expect(createSupervisorAllocation).toHaveBeenCalledWith(
        SITE_MANAGER_TEST_IDS.siteId,
        expect.objectContaining({
          itemId: 'item-1',
        }),
        'Lead One',
        expect.any(Object)
      );
    });
    expect(screen.getByRole('status', { name: /allocation saved/i })).toHaveTextContent('Cement bags');
  });

  it('navigates to request queue when user can view queue and Back to requests is pressed', async () => {
    const user = userEvent.setup();
    renderAt('', preloadedStoreInchargeCanViewQueue());

    await waitFor(() => screen.findByRole('button', { name: /back to requests/i }));
    await user.click(screen.getByRole('button', { name: /back to requests/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/requests/queue');
  });

  describe('request list filtering', () => {
    beforeEach(() => {
      vi.mocked(requestService.subscribeToRequests).mockImplementation((_filters, cb) => {
        cb([
          mkTransferredRequest(),
          {
            ...mkTransferredRequest(),
            id: 'pending-only',
            requestNumber: 'REQ-PENDING',
            status: 'pending',
          },
        ]);
        return vi.fn();
      });
    });

    it('does not list requests that are not transferred or partially_returned', async () => {
      renderAt('');
      await waitFor(() => {
        expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
      });
      expect(screen.queryByText('REQ-PENDING')).not.toBeInTheDocument();
    });
  });
});
