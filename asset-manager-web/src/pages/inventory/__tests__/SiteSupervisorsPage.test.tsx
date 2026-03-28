/**
 * Site team list: loaders, toast validation, confirmation flow (no browser dialogs).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { SiteSupervisorsPage } from '../SiteSupervisorsPage';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import { ToastProvider } from '../../../contexts/ToastContext';
import { siteSupervisorService } from '../../../services/firebase/siteSupervisorService';
import { createSiteManagerPreloadedState, SITE_MANAGER_TEST_IDS } from '../../../test/fixtures/siteManagerStore';
import type { SiteSupervisor } from '../../../types/siteSupervisor';

vi.mock('../../../config/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('../../../services/firebase/siteSupervisorService', () => ({
  siteSupervisorService: {
    subscribeSiteSupervisors: vi.fn(),
    addSiteSupervisor: vi.fn(() => Promise.resolve('new-id')),
    updateSiteSupervisor: vi.fn(() => Promise.resolve()),
    deleteSiteSupervisor: vi.fn(() => Promise.resolve()),
  },
}));

const mockConfirm = vi.fn();

vi.mock('../../../hooks', () => ({
  useConfirm: () => ({
    confirm: mockConfirm,
    confirmationModal: null,
  }),
}));

function renderPage(preloaded: ReturnType<typeof createSiteManagerPreloadedState>) {
  return renderWithProviders(
    <ToastProvider>
      <MemoryRouter>
        <SiteSupervisorsPage />
      </MemoryRouter>
    </ToastProvider>,
    { preloadedState: preloaded }
  );
}

describe('SiteSupervisorsPage', () => {
  beforeEach(() => {
    vi.mocked(siteSupervisorService.subscribeSiteSupervisors).mockImplementation((_site, cb) => {
      cb([]);
      return vi.fn();
    });
    mockConfirm.mockReset();
  });

  it('shows no working site when the user has no effective site', () => {
    const state = createSiteManagerPreloadedState();
    state.sites = {
      ...state.sites!,
      sites: [],
      activeManagedSiteId: null,
    };
    renderPage(state);
    expect(screen.getByText(/no working site/i)).toBeInTheDocument();
  });

  it('shows empty state after subscription resolves', async () => {
    vi.mocked(siteSupervisorService.subscribeSiteSupervisors).mockImplementation((_site, cb) => {
      queueMicrotask(() => cb([]));
      return vi.fn();
    });
    renderPage(createSiteManagerPreloadedState());

    await waitFor(() => {
      expect(screen.getByText(/no supervisors yet/i)).toBeInTheDocument();
    });
  });

  it('shows toast when saving without a name', async () => {
    const user = userEvent.setup();
    renderPage(createSiteManagerPreloadedState());

    await waitFor(() => screen.findByRole('button', { name: /add supervisor/i }));

    await user.click(screen.getByRole('button', { name: /add supervisor/i }));

    await user.click(screen.getByRole('button', { name: /save supervisor/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a supervisor name/i)).toBeInTheDocument();
    });
  });

  it('calls delete after confirmation', async () => {
    const user = userEvent.setup();
    const row: SiteSupervisor = {
      id: 'sup-1',
      siteId: SITE_MANAGER_TEST_IDS.siteId,
      name: 'Foreman',
      createdByManagerId: SITE_MANAGER_TEST_IDS.userId,
      createdAt: null,
      updatedAt: null,
    };

    vi.mocked(siteSupervisorService.subscribeSiteSupervisors).mockImplementation((_site, cb) => {
      cb([row]);
      return vi.fn();
    });
    mockConfirm.mockResolvedValue(true);

    renderPage(createSiteManagerPreloadedState());

    await waitFor(() => screen.findByText('Foreman'));

    await user.click(screen.getByRole('button', { name: /remove foreman/i }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Remove supervisor?',
        })
      );
    });

    await waitFor(() => {
      expect(siteSupervisorService.deleteSiteSupervisor).toHaveBeenCalledWith(
        SITE_MANAGER_TEST_IDS.siteId,
        'sup-1'
      );
    });
  });
});
