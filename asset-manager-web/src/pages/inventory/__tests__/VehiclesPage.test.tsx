import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { VehiclesPage } from '../VehiclesPage';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';

const mockListVehicles = vi.fn().mockResolvedValue([
  {
    id: 'v1',
    vehicleNumber: 'KA-01',
    vehicleNumberNormalized: 'ka-01',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    createdByUserId: 'u1',
    createdByName: 'Test',
  },
  {
    id: 'v2',
    vehicleNumber: 'MH-99',
    vehicleNumberNormalized: 'mh-99',
    notes: 'Backup',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    createdByUserId: 'u1',
    createdByName: 'Test',
  },
]);

vi.mock('../../../services/firebase/vehicleService', () => ({
  listVehicles: (...a: unknown[]) => mockListVehicles(...a),
}));

vi.mock('../../../services/firebase/vehicleFuelAssignmentService', () => ({
  getTotalLitersAssignedToVehicle: vi.fn().mockResolvedValue(100),
}));

vi.mock('../../../config/firebase', () => ({ auth: {}, db: {} }));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  }),
}));

describe('VehiclesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders vehicle number after load', async () => {
    renderWithProviders(
      <MemoryRouter>
        <VehiclesPage />
      </MemoryRouter>,
      {
        preloadedState: {
          auth: {
            user: { uid: 'u1', displayName: 'SI', email: 'si@test.com' } as never,
            userRole: { role: 'StoreIncharge', userId: 'u1', email: 'si@test.com' } as never,
            isAuthenticated: true,
            isRoleLoading: false,
            authInitialized: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(await screen.findByText('KA-01')).toBeInTheDocument();
    expect(screen.getByText('MH-99')).toBeInTheDocument();
  });

  it('filters list by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <VehiclesPage />
      </MemoryRouter>,
      {
        preloadedState: {
          auth: {
            user: { uid: 'u1', displayName: 'SI', email: 'si@test.com' } as never,
            userRole: { role: 'StoreIncharge', userId: 'u1', email: 'si@test.com' } as never,
            isAuthenticated: true,
            isRoleLoading: false,
            authInitialized: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    await screen.findByText('KA-01');
    const search = screen.getByRole('searchbox', { name: /search vehicles/i });
    await user.type(search, 'mh-99');

    await waitFor(() => {
      expect(screen.queryByText('KA-01')).not.toBeInTheDocument();
    });
    expect(screen.getByText('MH-99')).toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 2 vehicles/i)).toBeInTheDocument();
  });
});
