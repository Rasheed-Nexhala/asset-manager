import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManagedSiteSwitcher } from '../ManagedSiteSwitcher';
import type { Site } from '../../../types/sites';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';

const base = (id: string, name: string): Site => ({
  id,
  name,
  address: '100 Road',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

describe('ManagedSiteSwitcher', () => {
  it('returns null when there are no managed sites', () => {
    const { container } = renderWithProviders(
      <ManagedSiteSwitcher
        managedSites={[]}
        activeSiteId={null}
        onSiteChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows a badge only when there is one site (no switch control)', () => {
    renderWithProviders(
      <ManagedSiteSwitcher
        managedSites={[base('s1', 'North Yard')]}
        activeSiteId="s1"
        onSiteChange={vi.fn()}
      />
    );

    expect(screen.getByText('North Yard')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Working site North Yard/i })
    ).not.toBeInTheDocument();
  });

  it('treats first site as selected when activeSiteId is null (Redux catching up)', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ManagedSiteSwitcher
        managedSites={[base('s1', 'Alpha'), base('s2', 'Beta')]}
        activeSiteId={null}
        onSiteChange={vi.fn()}
      />
    );

    const toggle = screen.getByRole('button', {
      name: /Working site Alpha\. Open to switch site\./i,
    });
    await user.click(toggle);

    expect(screen.getByRole('option', { name: /Alpha/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows switcher for two sites and calls onSiteChange when picking another', async () => {
    const user = userEvent.setup();
    const onSiteChange = vi.fn();

    renderWithProviders(
      <ManagedSiteSwitcher
        managedSites={[base('s1', 'Alpha'), base('s2', 'Beta')]}
        activeSiteId="s1"
        onSiteChange={onSiteChange}
      />
    );

    const toggle = screen.getByRole('button', {
      name: /Working site Alpha\. Open to switch site\./i,
    });
    await user.click(toggle);

    await user.click(screen.getByRole('button', { name: /Beta.*100 Road/i }));

    expect(onSiteChange).toHaveBeenCalledWith('s2');
  });
});
