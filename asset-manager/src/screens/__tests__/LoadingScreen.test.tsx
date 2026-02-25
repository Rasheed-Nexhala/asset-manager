import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LoadingScreen } from '../LoadingScreen';

jest.mock('../../components', () => ({
  ScreenLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('LoadingScreen', () => {
  it('renders default "Loading..." message', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('renders custom message when passed as prop', () => {
    render(<LoadingScreen message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeTruthy();
  });

  it('renders ActivityIndicator', () => {
    render(<LoadingScreen />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });
});
