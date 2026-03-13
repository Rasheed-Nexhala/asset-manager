import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { RequestTypeBadge } from '../RequestTypeBadge';

describe('RequestTypeBadge', () => {
  it('renders nothing when requestType is undefined', () => {
    const { queryByText } = render(<RequestTypeBadge />);
    expect(queryByText('Site Transfer')).toBeNull();
  });

  it('renders nothing when requestType is standard', () => {
    const { queryByText } = render(<RequestTypeBadge requestType="standard" />);
    expect(queryByText('Site Transfer')).toBeNull();
  });

  it('renders Site Transfer badge when requestType is site_transfer', () => {
    render(<RequestTypeBadge requestType="site_transfer" />);
    expect(screen.getByText('Site Transfer')).toBeTruthy();
  });
});
