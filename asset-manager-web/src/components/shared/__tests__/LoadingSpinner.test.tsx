import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with role="status" and aria-label="Loading"', () => {
    renderWithProviders(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toBeInTheDocument();
  });

  it('applies size classes for sm', () => {
    renderWithProviders(<LoadingSpinner size="sm" />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner.className).toContain('w-4');
    expect(spinner.className).toContain('h-4');
  });

  it('applies size classes for md', () => {
    renderWithProviders(<LoadingSpinner size="md" />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner.className).toContain('w-8');
    expect(spinner.className).toContain('h-8');
  });

  it('applies size classes for lg', () => {
    renderWithProviders(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner.className).toContain('w-12');
    expect(spinner.className).toContain('h-12');
  });
});
