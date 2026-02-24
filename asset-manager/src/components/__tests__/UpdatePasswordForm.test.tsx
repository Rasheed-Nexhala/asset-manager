import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UpdatePasswordForm } from '../UpdatePasswordForm';

const mockReauthenticateAndUpdatePassword = jest.fn();
const mockLogPasswordChanged = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../services/firebase/authService', () => ({
  reauthenticateAndUpdatePassword: (...args: unknown[]) =>
    mockReauthenticateAndUpdatePassword(...args),
  logPasswordChanged: (...args: unknown[]) => mockLogPasswordChanged(...args),
}));

describe('UpdatePasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all password fields and submit button', () => {
    render(<UpdatePasswordForm />);

    expect(screen.getByPlaceholderText('Enter your current password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your new password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Confirm your new password')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Update password/i })).toBeTruthy();
  });

  it('shows validation error when current password is empty', async () => {
    render(<UpdatePasswordForm />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your new password'), 'newpass123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your new password'), 'newpass123');
    fireEvent.press(screen.getByRole('button', { name: /Update password/i }));

    expect(screen.getByText('Current password is required')).toBeTruthy();
    expect(mockReauthenticateAndUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows validation error when new password is too short', async () => {
    render(<UpdatePasswordForm />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your current password'), 'oldpass');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your new password'), 'short');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your new password'), 'short');
    fireEvent.press(screen.getByRole('button', { name: /Update password/i }));

    expect(screen.getByText('Password must be at least 6 characters')).toBeTruthy();
    expect(mockReauthenticateAndUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows validation error when passwords do not match', async () => {
    render(<UpdatePasswordForm />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your current password'), 'oldpass');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your new password'), 'newpass123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your new password'), 'different');
    fireEvent.press(screen.getByRole('button', { name: /Update password/i }));

    expect(screen.getByText("Passwords don't match")).toBeTruthy();
    expect(mockReauthenticateAndUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows validation error when new password same as current', async () => {
    render(<UpdatePasswordForm />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your current password'), 'samepass');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your new password'), 'samepass');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your new password'), 'samepass');
    fireEvent.press(screen.getByRole('button', { name: /Update password/i }));

    expect(screen.getByText('New password must be different from current password')).toBeTruthy();
    expect(mockReauthenticateAndUpdatePassword).not.toHaveBeenCalled();
  });

  it('calls authService and onSuccess when validation passes', async () => {
    mockReauthenticateAndUpdatePassword.mockResolvedValue(undefined);
    mockLogPasswordChanged.mockResolvedValue(undefined);

    const onSuccess = jest.fn();
    render(<UpdatePasswordForm onSuccess={onSuccess} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your current password'), 'oldpass');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your new password'), 'newpass123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your new password'), 'newpass123');
    fireEvent.press(screen.getByRole('button', { name: /Update password/i }));

    await screen.findByText('Password updated successfully');

    expect(mockReauthenticateAndUpdatePassword).toHaveBeenCalledWith('oldpass', 'newpass123');
    expect(mockLogPasswordChanged).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('calls onError and shows error when auth fails', async () => {
    mockReauthenticateAndUpdatePassword.mockRejectedValue(new Error('Wrong password'));

    const onError = jest.fn();
    render(<UpdatePasswordForm onError={onError} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter your current password'), 'wrongpass');
    fireEvent.changeText(screen.getByPlaceholderText('Enter your new password'), 'newpass123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm your new password'), 'newpass123');
    fireEvent.press(screen.getByRole('button', { name: /Update password/i }));

    await screen.findByText('Wrong password');

    expect(onError).toHaveBeenCalledWith('Wrong password');
  });
});
