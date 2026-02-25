/**
 * UpdatePasswordScreen tests
 * - Renders header and UpdatePasswordForm
 * - Back button calls goBack
 * - Form success triggers handleSuccess which eventually calls goBack
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UpdatePasswordScreen } from '../UpdatePasswordScreen';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock UpdatePasswordForm (direct import) to control onSuccess without auth
jest.mock('../../../components/UpdatePasswordForm', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    UpdatePasswordForm: ({
      onSuccess,
    }: {
      onSuccess?: () => void;
      onError?: (error: string) => void;
    }) => (
      <View testID="update-password-form">
        <TouchableOpacity
          testID="trigger-success"
          onPress={() => onSuccess?.()}
          accessibilityRole="button"
          accessibilityLabel="Trigger success"
        >
          <Text>Trigger Success</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

// Mock components barrel (ScreenLayout) to avoid loading Firebase-dependent modules
jest.mock('../../../components', () => {
  const React = require('react');
  const { View } = require('react-native');
  const { UpdatePasswordForm } = require('../../../components/UpdatePasswordForm');
  return {
    ScreenLayout: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    UpdatePasswordForm,
  };
});

describe('UpdatePasswordScreen', () => {
  let originalLog: typeof console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    // Suppress "Password updated successfully" console.log from handleSuccess
    originalLog = console.log;
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      if (args[0] === 'Password updated successfully') return;
      originalLog.apply(console, args);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders header and UpdatePasswordForm', () => {
    render(<UpdatePasswordScreen />);

    expect(screen.getByText('Update Password')).toBeTruthy();
    expect(screen.getByTestId('update-password-form')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go back to profile' })).toBeTruthy();
  });

  it('back button calls goBack', () => {
    render(<UpdatePasswordScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Go back to profile' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('form success triggers handleSuccess which eventually calls goBack', () => {
    jest.useFakeTimers();
    render(<UpdatePasswordScreen />);

    // Trigger form success via the mock's onSuccess callback
    const triggerSuccess = screen.getByTestId('trigger-success');
    fireEvent.press(triggerSuccess);

    expect(mockGoBack).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1500);

    expect(mockGoBack).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('uses navigation prop when passed for testing', () => {
    const mockNavProp = { goBack: jest.fn(), canGoBack: () => true };
    render(<UpdatePasswordScreen navigation={mockNavProp} />);

    fireEvent.press(screen.getByRole('button', { name: 'Go back to profile' }));

    expect(mockNavProp.goBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
