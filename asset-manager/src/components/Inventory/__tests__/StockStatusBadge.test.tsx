import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StockStatusBadge } from '../StockStatusBadge';

describe('StockStatusBadge', () => {
  it('renders Adequate for adequate status', () => {
    render(<StockStatusBadge status="adequate" />);
    expect(screen.getByText('Adequate')).toBeTruthy();
  });

  it('renders Low Stock for low_stock status', () => {
    render(<StockStatusBadge status="low_stock" />);
    expect(screen.getByText('Low Stock')).toBeTruthy();
  });

  it('renders Discontinued for discontinued status', () => {
    render(<StockStatusBadge status="discontinued" />);
    expect(screen.getByText('Discontinued')).toBeTruthy();
  });
});
