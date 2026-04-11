/**
 * Request detail: supervisor splits list, loaders, return modal, actor passed to service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { SupervisorAllocationsSection } from '../SupervisorAllocationsSection';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import { ToastProvider } from '../../../contexts/ToastContext';
import { siteSupervisorService } from '../../../services/firebase/siteSupervisorService';
import { createSiteManagerPreloadedState, SITE_MANAGER_TEST_IDS } from '../../../test/fixtures/siteManagerStore';
import type { SupervisorItemAllocation } from '../../../types/siteSupervisor';
import type { RequestItem } from '../../../types/request';

vi.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
}));

const recordReturnFromSupervisor = vi.fn(() => Promise.resolve());

vi.mock('../../../services/firebase/siteSupervisorService', () => ({
  siteSupervisorService: {
    subscribeRequestAllocations: vi.fn(),
    recordReturnFromSupervisor: (...args: unknown[]) => recordReturnFromSupervisor(...args),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

function renderSection(
  preloaded = createSiteManagerPreloadedState(),
  props: { siteId?: string; requestId?: string; requestItems?: RequestItem[] } = {}
) {
  const siteId = props.siteId ?? SITE_MANAGER_TEST_IDS.siteId;
  const requestId = props.requestId ?? 'req-1';
  return renderWithProviders(
    <ToastProvider>
      <MemoryRouter>
        <SupervisorAllocationsSection
          siteId={siteId}
          requestId={requestId}
          requestItems={props.requestItems}
        />
      </MemoryRouter>
    </ToastProvider>,
    { preloadedState: preloaded }
  );
}

describe('SupervisorAllocationsSection', () => {
  beforeEach(() => {
    recordReturnFromSupervisor.mockClear();
    mockNavigate.mockClear();
  });

  it('shows loading state until allocations load', () => {
    vi.mocked(siteSupervisorService.subscribeRequestAllocations).mockImplementation(() => {
      return vi.fn();
    });
    renderSection();
    expect(screen.getByLabelText(/loading supervisor splits/i)).toBeInTheDocument();
  });

  it('shows empty state with navigation to team and split stock', async () => {
    vi.mocked(siteSupervisorService.subscribeRequestAllocations).mockImplementation((_site, _req, cb) => {
      cb([]);
      return vi.fn();
    });
    const user = userEvent.setup();
    renderSection();

    await waitFor(() => {
      expect(screen.getByText(/no splits on this request/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /team list/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/inventory/site-supervisors');
  });

  it('records return with actor and closes modal', async () => {
    const user = userEvent.setup();
    const row: SupervisorItemAllocation = {
      id: 'alloc-1',
      siteId: SITE_MANAGER_TEST_IDS.siteId,
      supervisorId: 'sup-1',
      supervisorName: 'Lead',
      requestId: 'req-1',
      requestNumber: 'REQ-1',
      itemId: 'item-1',
      itemName: 'Hammer',
      itemType: 'non_consumable',
      quantityAllocated: 4,
      quantityReturnedToManager: 1,
      createdAt: null,
      updatedAt: null,
    };

    vi.mocked(siteSupervisorService.subscribeRequestAllocations).mockImplementation((_site, _req, cb) => {
      cb([row]);
      return vi.fn();
    });

    renderSection();

    await waitFor(() => screen.findByText('Hammer'));

    await user.click(screen.getByRole('button', { name: /record return from supervisor/i }));

    await waitFor(() => screen.findByRole('heading', { name: /return from supervisor/i }));

    await user.click(screen.getByRole('button', { name: /confirm return from supervisor/i }));

    await waitFor(() => {
      expect(recordReturnFromSupervisor).toHaveBeenCalledWith(
        SITE_MANAGER_TEST_IDS.siteId,
        'alloc-1',
        1,
        { userId: SITE_MANAGER_TEST_IDS.userId, userName: 'Site Manager' }
      );
    });
  });

  it('shows toast when return quantity is invalid', async () => {
    const user = userEvent.setup();
    const row: SupervisorItemAllocation = {
      id: 'alloc-1',
      siteId: SITE_MANAGER_TEST_IDS.siteId,
      supervisorId: 'sup-1',
      supervisorName: 'Lead',
      requestId: 'req-1',
      requestNumber: 'REQ-1',
      itemId: 'item-1',
      itemName: 'Hammer',
      itemType: 'non_consumable',
      quantityAllocated: 4,
      quantityReturnedToManager: 1,
      createdAt: null,
      updatedAt: null,
    };

    vi.mocked(siteSupervisorService.subscribeRequestAllocations).mockImplementation((_site, _req, cb) => {
      cb([row]);
      return vi.fn();
    });

    renderSection();

    await waitFor(() => screen.findByText('Hammer'));

    await user.click(screen.getByRole('button', { name: /record return from supervisor/i }));

    const input = await screen.findByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '0');

    await user.click(screen.getByRole('button', { name: /confirm return from supervisor/i }));

    await waitFor(() => {
      expect(screen.getByText(/whole number of at least 1/i)).toBeInTheDocument();
    });
    expect(recordReturnFromSupervisor).not.toHaveBeenCalled();
  });

  it('does not offer return from supervisor for consumable lines', async () => {
    const row: SupervisorItemAllocation = {
      id: 'alloc-c',
      siteId: SITE_MANAGER_TEST_IDS.siteId,
      supervisorId: 'sup-1',
      supervisorName: 'Lead',
      requestId: 'req-1',
      requestNumber: 'REQ-1',
      itemId: 'item-c',
      itemName: 'Gloves',
      itemType: 'consumable',
      quantityAllocated: 10,
      quantityReturnedToManager: 0,
      createdAt: null,
      updatedAt: null,
    };

    vi.mocked(siteSupervisorService.subscribeRequestAllocations).mockImplementation((_site, _req, cb) => {
      cb([row]);
      return vi.fn();
    });

    renderSection();

    await waitFor(() => screen.findByText('Gloves'));
    expect(screen.queryByRole('button', { name: /record return from supervisor/i })).not.toBeInTheDocument();
    expect(screen.getByText(/not returned from supervisors/i)).toBeInTheDocument();
  });
});
