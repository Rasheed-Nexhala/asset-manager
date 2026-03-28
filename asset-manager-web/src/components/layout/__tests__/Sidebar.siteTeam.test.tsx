/**
 * Site Manager: inventory sub-nav for Split stock / Team list (sidebar).
 */
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import type { User } from 'firebase/auth';
import type { UserRoleData } from '../../../types/roles';

function renderSidebar(role: UserRoleData['role']) {
  const user = { uid: 'sm-1', displayName: 'Site Manager', email: 'sm@test.com' } as User;
  const userRole: UserRoleData = {
    role,
    isActive: true,
    permissions: ['canManageInventory'],
  };
  return renderWithProviders(
    <MemoryRouter initialEntries={['/inventory']}>
      <Sidebar />
    </MemoryRouter>,
    {
      preloadedState: {
        auth: {
          user,
          userRole,
          isAuthenticated: true,
          isLoading: false,
          isRoleLoading: false,
          authInitialized: true,
          error: null,
        },
      },
    }
  );
}

describe('Sidebar site team (Site Manager)', () => {
  it('renders Split stock and Team list under Site team when role is SiteManager', () => {
    renderSidebar('SiteManager');

    const group = screen.getByRole('group', { name: /site team/i });
    expect(group).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /^split stock$/i })).toHaveAttribute(
      'href',
      '/inventory/divide-to-supervisors'
    );
    expect(screen.getByRole('link', { name: /^team list$/i })).toHaveAttribute(
      'href',
      '/inventory/site-supervisors'
    );
  });

  it('does not render the Site team group for Store Incharge', () => {
    renderSidebar('StoreIncharge');
    expect(screen.queryByRole('group', { name: /site team/i })).not.toBeInTheDocument();
  });
});
