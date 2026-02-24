import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DashboardGreeting } from './DashboardGreeting';

describe('DashboardGreeting', () => {
  it('renders correctly for Admin', () => {
    render(
      <DashboardGreeting
        displayName="John Doe"
        role="Admin"
      />
    );
    expect(screen.getByText(/Hello, John Doe/)).toBeTruthy();
  });

  it('renders correctly for Site Manager with site name', () => {
    render(
      <DashboardGreeting
        displayName="Jane Smith"
        role="Site Manager"
        siteName="Site Alpha"
      />
    );
    expect(screen.getByText(/Hello, Jane Smith/)).toBeTruthy();
    expect(screen.getByText('Site Alpha')).toBeTruthy();
  });

  it('renders correctly for Site Manager without site name', () => {
    render(
      <DashboardGreeting
        displayName="Jane Smith"
        role="Site Manager"
      />
    );
    expect(screen.getByText(/Hello, Jane Smith/)).toBeTruthy();
    // Subtitle should be formatted date (e.g. "Feb 22, 2025")
    const subtitle = screen.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/);
    expect(subtitle).toBeTruthy();
  });

  it('renders correctly for StoreIncharge', () => {
    render(
      <DashboardGreeting
        displayName="Bob Store"
        role="StoreIncharge"
      />
    );
    expect(screen.getByText(/Hello, Bob Store/)).toBeTruthy();
  });

  it('renders correctly for Unassigned role', () => {
    render(
      <DashboardGreeting
        displayName="New User"
        role="Unassigned"
      />
    );
    expect(screen.getByText(/Hello, New User/)).toBeTruthy();
  });
});
