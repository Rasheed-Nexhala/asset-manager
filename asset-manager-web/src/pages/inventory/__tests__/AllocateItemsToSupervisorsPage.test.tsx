/**
 * Split stock: filters transferred requests, validation toasts, post-save navigation with actor.
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

function renderAt(search: string) {
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
    { preloadedState: createSiteManagerPreloadedState() }
  );
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

  it('navigates to inventory after save when returnTo is not requests', async () => {
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

    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('navigates to my-requests after save when returnTo=requests and user cannot view queue', async () => {
    const user = userEvent.setup();
    renderAt('?returnTo=requests');

    await waitFor(() => screen.findByText('REQ-2026-0001'));
    await user.click(screen.getByText('REQ-2026-0001'));
    await user.click(screen.getByText('Ladder'));
    await user.click(screen.getByText('Lead One'));

    await user.click(screen.getByRole('button', { name: /save allocation/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/requests/my-requests');
    });
  });
});
