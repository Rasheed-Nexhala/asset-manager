import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SiteCard } from '../SiteCard';

const mockSite = {
  id: 'site1',
  name: 'Construction Site Alpha',
  address: '123 Main Street',
  status: 'active' as const,
  managerName: 'John Manager',
  managerId: 'm1',
  description: 'Main project site',
  contactNumber: '+91 9876543210',
  createdAt: null,
  updatedAt: null,
} as import('../../../types/sites').Site;

describe('SiteCard', () => {
  it('renders site name and address', () => {
    render(<SiteCard site={mockSite} onPress={jest.fn()} />);

    expect(screen.getByText('Construction Site Alpha')).toBeTruthy();
    expect(screen.getByText('123 Main Street')).toBeTruthy();
  });

  it('renders manager name', () => {
    render(<SiteCard site={mockSite} onPress={jest.fn()} />);
    expect(screen.getByText('John Manager')).toBeTruthy();
  });

  it('shows Not Assigned when no manager', () => {
    const siteWithoutManager = { ...mockSite, managerName: null };
    render(<SiteCard site={siteWithoutManager} onPress={jest.fn()} />);
    expect(screen.getByText('Not Assigned')).toBeTruthy();
  });

  it('shows Active badge for active site', () => {
    render(<SiteCard site={mockSite} onPress={jest.fn()} />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('shows Inactive badge for inactive site', () => {
    const inactiveSite = { ...mockSite, status: 'inactive' as const };
    render(<SiteCard site={inactiveSite} onPress={jest.fn()} />);
    expect(screen.getByText('Inactive')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<SiteCard site={mockSite} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: /Site: Construction Site Alpha/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders description when provided', () => {
    render(<SiteCard site={mockSite} onPress={jest.fn()} />);
    expect(screen.getByText('Main project site')).toBeTruthy();
  });

  it('renders contact number when provided', () => {
    render(<SiteCard site={mockSite} onPress={jest.fn()} />);
    expect(screen.getByText('+91 9876543210')).toBeTruthy();
  });
});
