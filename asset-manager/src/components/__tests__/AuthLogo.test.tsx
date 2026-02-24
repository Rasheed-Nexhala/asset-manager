import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AuthLogo } from '../AuthLogo';

jest.mock('../../assets/images/IBF_logo.png', () => 1);

describe('AuthLogo', () => {
  it('renders without crashing', () => {
    render(<AuthLogo />);
    expect(screen.getByLabelText('IBF Engineering Services logo')).toBeTruthy();
  });

  it('uses custom accessibility label when provided', () => {
    render(<AuthLogo accessibilityLabel="Custom logo" />);
    expect(screen.getByLabelText('Custom logo')).toBeTruthy();
  });

  it('renders with custom width', () => {
    const { getByLabelText } = render(<AuthLogo width={150} />);
    expect(getByLabelText('IBF Engineering Services logo')).toBeTruthy();
  });
});
