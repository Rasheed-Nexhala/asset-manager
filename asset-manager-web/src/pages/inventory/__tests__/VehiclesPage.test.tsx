import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VehiclesPage } from '../VehiclesPage';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';

vi.mock('../../../services/firebase/vehicleService', () => ({
  listVehicles: vi.fn().mockResolvedValue([
    {
      id: 'v1',
      vehicleNumber: 'KA-01',
      vehicleNumberNormalized: 'ka-01',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      createdByUserId: 'u1',
      createdByName: 'Test',
    },
  ]),
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
  });
});
